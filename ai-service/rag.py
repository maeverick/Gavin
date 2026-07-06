import os
import langchain
for _attr in ('verbose', 'debug', 'llm_cache'):
    if not hasattr(langchain, _attr):
        setattr(langchain, _attr, False)
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_community.vectorstores import SupabaseVectorStore
from langchain_core.documents import Document
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()


def get_embeddings():
    # Uses GOOGLE_API_KEY — dedicated to embeddings/indexing
    return GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")


def get_llm():
    # Primary model — gemini-2.5-flash for chat (high quality, main quota)
    llm_key = os.getenv("GOOGLE_API_KEY_LLM") or os.getenv("GOOGLE_API_KEY")
    return ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.3, google_api_key=llm_key)


def get_fast_llm():
    # Uses same model as main LLM for now (free tier shares quota per project).
    # When billing is enabled, swap to gemini-2.0-flash-lite for separate quota bucket.
    llm_key = os.getenv("GOOGLE_API_KEY_LLM") or os.getenv("GOOGLE_API_KEY")
    model = os.getenv("FAST_LLM_MODEL", "gemini-2.5-flash")
    return ChatGoogleGenerativeAI(model=model, temperature=0.3, google_api_key=llm_key)


class GavinVectorStore:
    """
    Thin wrapper that uses SupabaseVectorStore for writes and calls the
    match_documents RPC directly for reads (supabase-py 2.x compatible).
    """

    def __init__(self, client, embeddings):
        self._client = client
        self._embeddings = embeddings
        self._store = SupabaseVectorStore(
            client=client,
            embedding=embeddings,
            table_name="documents",
            query_name="match_documents",
        )

    def add_documents(self, documents):
        return self._store.add_documents(documents)

    def similarity_search(self, query: str, k: int = 4):
        vector = self._embeddings.embed_query(query)
        response = self._client.rpc(
            "match_documents",
            {"query_embedding": vector, "match_count": k, "filter": {}},
        ).execute()

        docs = []
        for row in (response.data or []):
            docs.append(Document(
                page_content=row.get("content", ""),
                metadata=row.get("metadata") or {},
            ))
        return docs

    def as_retriever(self, search_kwargs=None):
        k = (search_kwargs or {}).get("k", 4)

        class _Retriever:
            def __init__(self, store, k):
                self._store = store
                self._k = k

            def invoke(self, query):
                return self._store.similarity_search(query, k=self._k)

            # LangChain compatibility alias
            def get_relevant_documents(self, query):
                return self.invoke(query)

        return _Retriever(self, k)


def get_vector_db():
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY")

    if not supabase_url or not supabase_key or supabase_key == "your_supabase_service_role_key_here":
        print("WARNING: SUPABASE_URL or SUPABASE_SERVICE_KEY not set in .env")
        return None

    client = create_client(supabase_url, supabase_key)
    embeddings = get_embeddings()
    return GavinVectorStore(client, embeddings)


def init_rag_pipeline():
    print("Initializing RAG Pipeline with Supabase pgvector and Gemini...")
    try:
        db = get_vector_db()
        llm = get_llm()
        return db, llm
    except Exception as e:
        print(f"Error initializing RAG pipeline: {e}")
        return None, None
