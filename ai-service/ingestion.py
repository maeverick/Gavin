import os
import time
from pathlib import Path
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from rag import get_vector_db

BATCH_SIZE = 40
BATCH_DELAY = 65  # seconds between batches (free tier: 100 embed requests/min)

def load_document(file_path):
    print(f"Loading document: {file_path}")
    ext = Path(file_path).suffix.lower()
    if ext == '.pdf':
        loader = PyPDFLoader(file_path)
    elif ext == '.txt':
        loader = TextLoader(file_path, encoding='utf-8')
    else:
        raise ValueError(f"Unsupported file type: {file_path}")
    return loader.load()

def chunk_documents(documents):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len,
        is_separator_regex=False,
    )
    chunks = splitter.split_documents(documents)
    for chunk in chunks:
        chunk.page_content = chunk.page_content.replace(chr(0), '')
    print(f"Split into {len(chunks)} chunks.")
    return chunks

def index_document(file_path, start_chunk=0):
    """Index a document. Use start_chunk to resume from a specific chunk index."""
    try:
        documents = load_document(file_path)
        all_chunks = chunk_documents(documents)
        db = get_vector_db()

        if db is None:
            print("Vector DB not available - check SUPABASE_SERVICE_KEY in .env")
            return 0

        chunks = all_chunks[start_chunk:]
        total = len(chunks)
        if total == 0:
            print(f"All {len(all_chunks)} chunks already indexed for {file_path}")
            return 0

        if start_chunk > 0:
            print(f"Resuming from chunk {start_chunk}: indexing {total} remaining chunks")

        batches = [chunks[i:i + BATCH_SIZE] for i in range(0, total, BATCH_SIZE)]
        print(f"Indexing {total} chunks in {len(batches)} batch(es)...")

        indexed = 0
        for i, batch in enumerate(batches):
            retries = 0
            max_retries = 8
            while retries < max_retries:
                try:
                    db.add_documents(batch)
                    indexed += len(batch)
                    print(f"  Batch {i+1}/{len(batches)} done ({indexed}/{total} chunks)")
                    break
                except Exception as e:
                    err_str = str(e)
                    if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                        wait = BATCH_DELAY * (retries + 1)
                        print(f"  Rate limit - waiting {wait}s...")
                        time.sleep(wait)
                        retries += 1
                    elif "getaddrinfo failed" in err_str or "Server disconnected" in err_str or "Connection" in err_str:
                        wait = 30 * (retries + 1)
                        print(f"  Network issue ({err_str[:60]}...) - retrying in {wait}s...")
                        time.sleep(wait)
                        retries += 1
                    else:
                        print(f"  Unrecoverable error: {err_str[:200]}")
                        raise

            if retries >= max_retries:
                print(f"  Batch {i+1} failed after {max_retries} retries — stopping")
                break

            if i < len(batches) - 1:
                print(f"  Waiting {BATCH_DELAY}s before next batch...")
                time.sleep(BATCH_DELAY)

        print(f"Successfully indexed {indexed}/{total} chunks.")
        return indexed
    except Exception as e:
        print(f"Error indexing document: {e}")
        return 0
