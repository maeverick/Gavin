from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from typing import Optional
from pathlib import Path
import os, tempfile, shutil

load_dotenv()

app = FastAPI(title="Gavin AI Service API", description="AI Service for Nigerian Law Study Companion")

class HistoryMessage(BaseModel):
    role: str
    content: str

class UserProfile(BaseModel):
    full_name: Optional[str] = None
    university: Optional[str] = None
    academic_level: Optional[str] = None
    target_exam: Optional[str] = None
    study_hours_per_day: Optional[int] = None
    preferred_study_time: Optional[str] = None
    subjects: Optional[list[str]] = []

class ActivePlanContext(BaseModel):
    exam_type: Optional[str] = None
    exam_date: Optional[str] = None
    subjects: Optional[list[str]] = []

class ChatRequest(BaseModel):
    message: str
    history: list[HistoryMessage] = []
    summary: Optional[str] = None
    profile: Optional[UserProfile] = None
    active_plan: Optional[ActivePlanContext] = None

from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage
from rag import init_rag_pipeline, get_fast_llm
from ingestion import load_document, index_document
from datetime import date as dt
import json, re, asyncio

def extract_json(text: str):
    """Strip markdown code fences and parse JSON from AI response."""
    text = text.strip()
    # Remove ```json ... ``` or ``` ... ``` wrappers
    text = re.sub(r'^```(?:json)?\s*', '', text)
    text = re.sub(r'\s*```$', '', text)
    return json.loads(text.strip())

# Initialize RAG components on startup
db, llm = init_rag_pipeline()
fast_llm = get_fast_llm()  # Lighter model for quiz/flashcard/planner

CONVERSATIONAL_WORDS = {
    'hi', 'hello', 'hey', 'thanks', 'thank you', 'ok', 'okay', 'yes', 'no',
    'sure', 'got it', 'i see', 'alright', 'good', 'great', 'perfect',
    'understood', 'noted', 'cool', 'nice', 'wow',
}
CONVERSATIONAL_PHRASES = [
    'explain more', 'elaborate', 'what do you mean', 'can you clarify',
    'give me an example', 'tell me more', 'go on', 'continue',
    'say that again', 'what about', 'how about', 'and what about',
    'can you simplify', 'in simpler terms', 'break it down',
]

# Signals that the question requires Nigerian-specific legal knowledge from the database
NIGERIA_SIGNALS = [
    'nigeria', 'nigerian', 'lagos', 'abuja', 'enugu', 'kano', 'ibadan',
    'section ', ' act ', ' act,', 'constitution', 'statute', 'decree',
    'under nigerian', 'in nigeria', 'nwlr', 'fnr', ' sc ', ' ca ',
    'supreme court', 'court of appeal', 'high court', 'federal court',
    'criminal code', 'penal code', 'evidence act', 'cama', 'acja',
    'land use act', 'matrimonial causes', 'investments and securities',
    'rules of professional conduct', 'legal practitioners act',
    'nba', 'nigerian bar', 'law school', 'nigerian law',
]

CLEO_SIGNALS = [
    'critically examine', 'critically analyse', 'critically analyze',
    'critically discuss', 'critically assess', 'critically evaluate',
    'evaluate the extent', 'discuss the extent', 'to what extent',
    'assess the validity', 'examine the development', 'trace the development',
    'how adequate', 'how satisfactory', 'reform', 'should the law',
]
FILAC_SIGNALS = [
    'advise all parties', 'advise each party', 'advise the parties',
    'rights and liabilities of all', 'rights and obligations of all',
    'discuss the positions of all', 'what are the legal positions of',
]
IRAAC_SIGNALS = [
    'advise ', 'legal advice', 'legal position of', 'liability of',
    'rights of ', 'what is the legal effect', 'what offence', 'what crime',
    'can he sue', 'can she sue', 'can they sue', 'is he liable', 'is she liable',
    'is there a valid', 'has a contract', 'has an agreement', 'what remedy',
    'what remedies', 'legal consequences', 'legal implications',
    'what action', 'entitled to', 'breach of', 'negligence of',
]

def detect_question_type(message: str) -> str:
    """Deterministically detect which legal framework to use."""
    msg = message.strip().lower()
    if any(s in msg for s in CLEO_SIGNALS):
        return 'cleo'
    if any(s in msg for s in FILAC_SIGNALS):
        return 'filac'
    if any(s in msg for s in IRAAC_SIGNALS):
        return 'iraac'
    return 'factual'

FRAMEWORK_INSTRUCTIONS = {
    'iraac': "\n\n[FRAMEWORK: Use IRAAC — Issue, Rule, Authority, Application, Conclusion]",
    'cleo':  "\n\n[FRAMEWORK: Use CLEO — Claim, Law, Evaluation, Outcome]",
    'filac': "\n\n[FRAMEWORK: Use FILAC for each issue — Facts, Issue, Law, Application, Conclusion — then overall conclusion]",
    'factual': "",
}

def get_rag_k(message: str, question_type: str) -> int:
    """
    Returns how many RAG chunks to fetch.
    0  = skip RAG (conversational or general question the model knows)
    3  = standard factual lookup (Nigeria-specific but not a full problem question)
    6  = complex problem question needing broad legal authority
    """
    msg = message.strip().lower()
    words = msg.split()

    # Conversational: acknowledgements and follow-up elaborations
    if len(words) <= 3 and any(w in CONVERSATIONAL_WORDS for w in words):
        return 0
    if any(phrase in msg for phrase in CONVERSATIONAL_PHRASES):
        return 0

    # Complex problem questions always need more context
    if question_type == 'filac':
        return 6
    if question_type in ('iraac', 'cleo'):
        return 5

    # Factual questions: only hit the database if the question is Nigeria-specific
    if any(signal in msg for signal in NIGERIA_SIGNALS):
        return 3

    # General legal concept — model knows from training, no RAG needed
    return 0

SYSTEM_TEMPLATE = """You are Gavin, an AI study assistant for Nigerian law students. You are helpful, encouraging, and expert in Nigerian law.

RULES:
- Use ONLY the verified Nigerian legal content provided in the context below
- Never fabricate case names, citations, or legal principles
- Cite sources clearly: "Section X of [Statute]..." or "In [Case Name] [Year]..."
- If context is insufficient, say: "I don't have enough verified information on that, but based on what I do have..."
- Never say "As an AI..." — say "Based on Nigerian law..."
- Use Nigerian names in examples (Emeka, Adaeze, Bola)
- Be concise but complete. Avoid unnecessary padding.

RESPONSE FORMAT — automatically select the best framework based on the question type:

A) FACTUAL QUESTIONS ("What is...?", "Define...", "Explain..."):
   1. Direct answer (1-2 sentences)
   2. Explanation with citations (cases + statutes)
   3. Example if helpful

B) PROBLEM/SCENARIO QUESTIONS ("Advise X", "Discuss the liability of", fact patterns with named parties):
   Use IRAAC — the most thorough framework for Nigerian Bar exam answers:

   **ISSUE**
   Identify every legal issue raised by the facts. Number them if more than one.

   **RULE**
   State the applicable legal principles, elements, and tests.

   **AUTHORITY**
   List all relevant cases and statutes explicitly:
   - Cases: "[Case Name [Year] Citation] held that..."
   - Statutes: "Section X of [Act Name] provides that..."

   **APPLICATION**
   Apply the rules and authorities to the specific facts.
   Use the parties' names throughout. Analyse each element of each issue.

   **CONCLUSION**
   State the legal outcome for each issue identified. Be definitive.

C) CRITICAL/ESSAY QUESTIONS ("Critically examine...", "Discuss the extent to which...", "Evaluate..."):
   Use CLEO:

   **CLAIM**
   State your central argument or position clearly.

   **LAW**
   Explain the relevant law, its development, and any tensions or gaps.
   Cite cases and statutes throughout.

   **EVALUATION**
   Critically assess the law — does it achieve its purpose? What are its weaknesses?
   Reference academic opinion, reform proposals, or comparative law where relevant.

   **OUTCOME**
   Conclude — restate your claim in light of your analysis.

D) COMPLEX MULTI-ISSUE PROBLEMS ("Advise all parties", multiple defendants/claims):
   Use FILAC for each distinct issue:

   **FACTS** — Briefly restate only the facts relevant to this issue.
   **ISSUE** — The specific legal question for this issue.
   **LAW** — Applicable rules and authorities.
   **APPLICATION** — Apply to the facts.
   **CONCLUSION** — Outcome for this issue.

   Repeat FILAC for each issue, then give an overall conclusion.

SELECTION GUIDE:
- Simple problem question → IRAAC
- Critical/essay question → CLEO
- Multi-party/multi-issue problem → FILAC
- Factual/definitional question → Direct format (A)

{context}"""

prompt = ChatPromptTemplate.from_messages([
    ("system", SYSTEM_TEMPLATE),
    MessagesPlaceholder(variable_name="history"),
    ("human", "{question}"),
])

def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

MAX_HISTORY = 6  # Keep last 6 messages (3 turns)

@app.post("/api/v1/chat/generate")
async def generate_chat_response(request: ChatRequest):
    if not db or not llm:
        async def offline_stream():
            yield "Gavin AI is running in offline mode because the GOOGLE_API_KEY is missing from the .env file. I cannot query the legal database right now."
        return StreamingResponse(offline_stream(), media_type="text/plain")

    try:
        # Convert history to LangChain message objects (frontend already trims to last 6)
        history_messages = []
        for msg in request.history:
            if msg.role == "user":
                history_messages.append(HumanMessage(content=msg.content))
            elif msg.role == "assistant":
                history_messages.append(AIMessage(content=msg.content))

        # Detect question type first so get_rag_k can use it
        question_type = detect_question_type(request.message)
        k = get_rag_k(request.message, question_type)

        if k == 0:
            context = ""
            docs = []
        else:
            retriever = db.as_retriever(search_kwargs={"k": k})
            docs = await asyncio.to_thread(retriever.invoke, request.message)
            context = format_docs(docs)

        # Build profile context string if profile is provided
        profile_context = ""
        if request.profile:
            p = request.profile
            parts = []
            if p.full_name:
                parts.append(f"Student name: {p.full_name} (address them by first name)")
            if p.academic_level:
                parts.append(f"Academic level: {p.academic_level} (pitch explanations accordingly)")
            if p.target_exam and p.target_exam != "None":
                parts.append(f"Target exam: {p.target_exam} (connect answers to this exam where relevant)")
            if p.subjects:
                parts.append(f"Studying: {', '.join(p.subjects)}")
            if p.university:
                parts.append(f"Institution: {p.university}")
            if parts:
                profile_context = "\n\nSTUDENT PROFILE:\n" + "\n".join(f"- {pt}" for pt in parts)

        # Inject active plan context
        if request.active_plan:
            ap = request.active_plan
            plan_parts = []
            if ap.exam_type:
                plan_parts.append(f"Current exam: {ap.exam_type}")
            if ap.exam_date:
                plan_parts.append(f"Exam date: {ap.exam_date}")
            if ap.subjects:
                plan_parts.append(f"Current courses: {', '.join(ap.subjects)}")
                plan_parts.append("IMPORTANT: Only answer questions relevant to these courses. Frame all explanations in the context of what the student is currently studying.")
            if plan_parts:
                profile_context += "\n\nACTIVE STUDY PLAN:\n" + "\n".join(f"- {pt}" for pt in plan_parts)

        # Prepend summary of older turns if available
        summary_context = ""
        if request.summary:
            summary_context = f"\n\nEARLIER CONVERSATION SUMMARY:\n{request.summary}"

        # Append framework instruction based on already-detected question type
        framework_hint = FRAMEWORK_INSTRUCTIONS[question_type]
        augmented_question = request.message + framework_hint

        formatted_prompt = prompt.format_messages(
            context=context + summary_context + profile_context,
            history=history_messages,
            question=augmented_question,
        )

        async def token_stream():
            async for chunk in llm.astream(formatted_prompt):
                if chunk.content:
                    yield chunk.content

        return StreamingResponse(token_stream(), media_type="text/plain")

    except Exception as e:
        print(f"Error during RAG generation: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate AI response.")

class TitleRequest(BaseModel):
    user_message: str
    ai_response: str

@app.post("/api/v1/chat/title")
async def generate_chat_title(request: TitleRequest):
    if not fast_llm:
        raise HTTPException(status_code=503, detail="AI service not available.")
    title_prompt = f"""Generate a very short title (4-6 words max) for this conversation.
Describe the main legal topic discussed. Use plain English, no jargon.
If it is just a greeting or small talk with no legal topic, return exactly: New conversation
Return ONLY the title — no quotes, no punctuation at the end.

User: {request.user_message[:200]}
AI: {request.ai_response[:400]}

Title:"""
    try:
        response = fast_llm.invoke([HumanMessage(content=title_prompt)])
        title = response.content.strip().strip('"').strip("'").rstrip('.')
        return {"title": title[:80]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate title: {str(e)}")


class SummarizeHistoryRequest(BaseModel):
    messages: list[HistoryMessage]

@app.post("/api/v1/chat/summarize-history")
async def summarize_history(request: SummarizeHistoryRequest):
    if not fast_llm:
        raise HTTPException(status_code=503, detail="AI service not available.")
    history_text = "\n".join(
        f"{msg.role.upper()}: {msg.content[:400]}"
        for msg in request.messages
    )
    prompt_text = f"""Summarize this conversation between a Nigerian law student and Gavin AI in 2-3 sentences.
Capture: the main legal topics discussed, any specific Nigerian cases or statutes mentioned, and where the conversation left off.
Write in third person. Be concise.

Conversation:
{history_text[:4000]}

Summary:"""
    try:
        response = fast_llm.invoke([HumanMessage(content=prompt_text)])
        return {"summary": response.content.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to summarize: {str(e)}")


QUIZ_PROMPT = """You are Gavin AI, a Nigerian bar exam preparation assistant.
Generate exactly {count} questions on: {topic}

Mix question types as follows:
- 60% standard MCQ (4 options A/B/C/D)
- 25% case-based MCQ (include a Nigerian scenario before the question)
- 15% statute interpretation MCQ (include the statute text before the question)

Rules:
- All questions must test Nigerian law specifically (cite real Nigerian cases and statutes)
- Difficulty: {difficulty} (if "mixed": 40% easy, 40% medium, 20% hard; otherwise all questions at that level)
- Distractors (wrong options) must be plausible — represent common misconceptions
- Explanations must be 2-4 sentences with legal reasoning and citations
- Use real Nigerian case names in format: Case Name [Year] Report
- Use real statute sections in format: Section X, Act Name

Return ONLY valid JSON — no extra text before or after:
{{
  "title": "Short descriptive quiz title",
  "subject": "{subject}",
  "questions": [
    {{
      "id": "q1",
      "question_type": "mcq",
      "subject": "Subject name",
      "topic": "Specific topic",
      "difficulty": "easy",
      "question": "Full question text...",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "correct_answer": "A",
      "explanation": "Detailed explanation citing Nigerian law...",
      "case_references": ["Case Name [Year] NWLR 123"],
      "statute_references": ["Section 36, Constitution of Nigeria, 1999"],
      "learning_objective": "What this question tests"
    }},
    {{
      "id": "q2",
      "question_type": "case_based_mcq",
      "subject": "Subject name",
      "topic": "Specific topic",
      "difficulty": "medium",
      "scenario": "Emeka, a Lagos trader, entered into a contract with Adaeze to supply 500 bags of rice. Emeka failed to deliver on the agreed date...",
      "question": "What is Adaeze's most appropriate legal remedy?",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "correct_answer": "B",
      "explanation": "Explanation with Nigerian legal reasoning...",
      "case_references": [],
      "statute_references": [],
      "learning_objective": "Apply breach of contract remedies"
    }},
    {{
      "id": "q3",
      "question_type": "statute_mcq",
      "subject": "Subject name",
      "topic": "Specific topic",
      "difficulty": "hard",
      "statute_text": "Section 36(1) of the Constitution of Nigeria, 1999 provides: 'In the determination of his civil rights and obligations, including any question or determination by or against any government or authority, a person shall be entitled to a fair hearing...'",
      "question": "Based on this provision, which of the following best describes the right enshrined?",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "correct_answer": "C",
      "explanation": "Explanation citing the statute and relevant cases...",
      "case_references": [],
      "statute_references": ["Section 36(1), Constitution of Nigeria, 1999"],
      "learning_objective": "Interpret constitutional provisions on fair hearing"
    }}
  ]
}}"""

class QuizRequest(BaseModel):
    topic: str
    count: int = 10
    subject: str = ""
    quiz_type: str = "topic"   # topic | subject | mixed
    difficulty: str = "mixed"  # easy | medium | hard | mixed
    source_text: Optional[str] = None

@app.post("/api/v1/quizzes/generate")
async def generate_quiz(request: QuizRequest):
    if not fast_llm:
        raise HTTPException(status_code=503, detail="AI service not available.")

    count = max(3, min(request.count, 30))
    topic = request.topic
    if request.source_text:
        topic = f"{request.topic}\n\nSource material:\n{request.source_text[:6000]}"

    try:
        response = fast_llm.invoke([HumanMessage(content=QUIZ_PROMPT.format(
            count=count,
            topic=topic,
            subject=request.subject or request.topic,
            difficulty=request.difficulty,
        ))])
        quiz = extract_json(response.content)
        return quiz
    except (json.JSONDecodeError, ValueError):
        raise HTTPException(status_code=500, detail="AI returned malformed JSON. Try again.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate quiz: {str(e)}")

FLASHCARD_PROMPT = """You are Gavin AI, a Nigerian law study companion.
Generate exactly {count} high-quality flashcards based on the following input.

Each flashcard should:
- Have a clear, focused question on the front
- Have an accurate, concise answer on the back (1–3 sentences)
- Be grounded in Nigerian law
- Cite specific sections, cases, or statutes where relevant

Return ONLY valid JSON in this exact format — no extra text:
{{
  "title": "A short descriptive deck title",
  "description": "One sentence describing what this deck covers",
  "cards": [
    {{"front": "Question text", "back": "Answer text"}}
  ]
}}

Input:
{input}"""

class FlashcardRequest(BaseModel):
    topic: str
    count: int = 10
    source_text: Optional[str] = None

@app.post("/api/v1/flashcards/generate")
async def generate_flashcards(request: FlashcardRequest):
    if not fast_llm:
        raise HTTPException(status_code=503, detail="AI service not available — check GOOGLE_API_KEY in .env.")

    count = max(3, min(request.count, 25))
    if request.source_text:
        input_text = f"Topic: {request.topic}\n\nSource document:\n{request.source_text[:8000]}"
    else:
        input_text = f"Topic: {request.topic}"

    try:
        response = fast_llm.invoke([HumanMessage(content=FLASHCARD_PROMPT.format(count=count, input=input_text))])

        deck = extract_json(response.content)
        return deck
    except (json.JSONDecodeError, ValueError):
        raise HTTPException(status_code=500, detail="AI returned malformed JSON. Try again.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate flashcards: {str(e)}")

SUMMARISE_PROMPT = """You are Gavin AI, a Nigerian law study companion.
Analyse the following legal document and produce a structured study summary.

Return ONLY valid JSON with this exact structure — no extra text before or after:
{{
  "title": "A short descriptive title for this document",
  "overview": "A clear 2-3 paragraph overview of the document's main subject",
  "keyPoints": ["key point 1", "key point 2", "key point 3"],
  "cases": ["Case Name (Year)", "..."],
  "statutes": ["Act Name, Section X — brief description", "..."],
  "definitions": [{{"term": "Legal term", "definition": "Plain-English explanation"}}]
}}

If a section has no relevant content (e.g. no cases cited), return an empty array for that field.

Document text:
{text}"""

SECTION_SUMMARY_PROMPT = """Summarize the following section of a legal document in 4-6 sentences.
Focus on key legal provisions, principles, cases, or definitions mentioned.

{text}

Summary:"""

TOPIC_NOTE_PROMPT = """You are Gavin AI, a Nigerian law study companion.
Generate a comprehensive study note about the following legal topic under Nigerian law.

Subject: {subject}
Topic: {topic}

Return ONLY valid JSON with this exact structure — no extra text before or after:
{{
  "title": "A short descriptive title for this topic",
  "overview": "A clear 2-3 paragraph overview of this topic under Nigerian law",
  "keyPoints": ["key point 1", "key point 2", "key point 3"],
  "cases": ["Case Name (Year) — brief relevance", "..."],
  "statutes": ["Act Name, Section X — brief description", "..."],
  "definitions": [{{"term": "Legal term", "definition": "Plain-English explanation"}}]
}}

Focus on Nigerian law, cite Nigerian cases and statutes where applicable.
If a section has no relevant content, return an empty array for that field."""

class TopicNoteRequest(BaseModel):
    subject: str
    topic: str

@app.post("/api/v1/notes/generate-from-topic")
async def generate_topic_note(request: TopicNoteRequest):
    if not fast_llm:
        raise HTTPException(status_code=503, detail="AI service not available.")
    try:
        note_prompt = TOPIC_NOTE_PROMPT.format(subject=request.subject, topic=request.topic)
        response = fast_llm.invoke([HumanMessage(content=note_prompt)])
        note = extract_json(response.content)
        note["filename"] = f"{request.subject} — {request.topic}"
        return note
    except (json.JSONDecodeError, ValueError):
        raise HTTPException(status_code=500, detail="AI returned malformed JSON. Try again.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate note: {str(e)}")

@app.post("/api/v1/notes/summarize")
async def summarize_document(file: UploadFile = File(...)):
    if not llm:
        raise HTTPException(status_code=503, detail="AI service not available — check GOOGLE_API_KEY in .env.")

    suffix = Path(file.filename).suffix.lower()
    if suffix not in ['.pdf', '.txt']:
        raise HTTPException(status_code=400, detail="Only PDF and TXT files are supported.")

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp_path = tmp.name
        shutil.copyfileobj(file.file, tmp)

    try:
        docs = load_document(tmp_path)
        full_text = "\n\n".join(d.page_content for d in docs)

        DIRECT_LIMIT = 12000
        SECTION_SIZE = 4000

        if len(full_text) <= DIRECT_LIMIT:
            response = await asyncio.to_thread(llm.invoke, [HumanMessage(content=SUMMARISE_PROMPT.format(text=full_text))])
        else:
            # Map: summarize each section in parallel
            sections = [full_text[i:i + SECTION_SIZE] for i in range(0, len(full_text), SECTION_SIZE)]

            async def summarize_section(text):
                r = await asyncio.to_thread(fast_llm.invoke, [HumanMessage(content=SECTION_SUMMARY_PROMPT.format(text=text))])
                return r.content.strip()

            section_summaries = await asyncio.gather(*[summarize_section(s) for s in sections])
            combined = "\n\n".join(f"[Section {i + 1}]\n{s}" for i, s in enumerate(section_summaries))

            # Reduce: produce final structured JSON summary from section summaries
            response = await asyncio.to_thread(llm.invoke, [HumanMessage(content=SUMMARISE_PROMPT.format(text=combined))])

        summary = extract_json(response.content)
        summary["filename"] = file.filename
        return summary
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned malformed JSON. Try again.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to summarise document: {str(e)}")
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

@app.post("/api/v1/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    suffix = Path(file.filename).suffix.lower()
    if suffix not in ['.pdf', '.txt']:
        raise HTTPException(status_code=400, detail="Only PDF and TXT files are supported.")

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp_path = tmp.name
        shutil.copyfileobj(file.file, tmp)

    try:
        chunk_count = await asyncio.to_thread(index_document, tmp_path)
        return {"status": "success", "filename": file.filename, "chunks": chunk_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to index document: {str(e)}")
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

PLANNER_JSON_SCHEMA = """
Return ONLY valid JSON — no extra text before or after:
{{
  "total_weeks": {weeks_remaining},
  "exam_type": "{exam_type}",
  "mode": "{mode}",
  "focus_order": ["most urgent subject", "second"],
  "weeks": [
    {{
      "week": 1,
      "theme": "Foundations",
      "focus_subjects": ["SubjectA", "SubjectB"],
      "days": [
        {{
          "day": "Monday",
          "tasks": [
            {{
              "subject": "Criminal Law and Procedure",
              "topic": "Elements of Criminal Liability — Actus Reus and Mens Rea",
              "activity": "reading",
              "hours": 2,
              "goal": "Distinguish actus reus from mens rea under the Nigerian Criminal Code",
              "resources": ["Criminal Code Act, Section 24", "R v. Tolson principles"]
            }}
          ]
        }}
      ]
    }}
  ]
}}"""

COLD_START_PROMPT = """You are a study plan generator for Nigerian law students who are COMPLETE BEGINNERS.

Student Profile:
- Academic Level: {academic_level}
- Exam Type: {exam_type}
- Exam Date: {exam_date} ({weeks_remaining} weeks away)
- Daily Study Time: {hours_per_day} hours
- Subjects: {subject_list}
{schedule_constraint}

IMPORTANT: This student has little or no prior legal knowledge. Do NOT assume familiarity with any concept.

Create a {weeks_remaining}-week curriculum-driven study plan that:
1. Follows the standard Nigerian Law School curriculum sequence (simple → complex)
2. Topic progression: Week 1-2 introductions → Week 3-5 core concepts → Week 6-9 applications → Week 10+ integration
3. Distributes study time EVENLY across all subjects for the first 4 weeks
4. Quizzes students AFTER teaching material — quiz activity only on Fridays covering that week's content
5. Uses only reading and review activities Mon-Thu; quiz on Friday; light review or rest on Saturday; no Sunday tasks
6. Maximum 3 tasks per day respecting the daily hour limit
7. All topics must be specific to Nigerian law (cite statutes and cases at beginner level)
8. Weeks 1-2: foundational definitions only. No advanced applications.

Nigerian Law School subjects to draw from: Constitutional Law, Criminal Law and Procedure,
Civil Procedure, Law of Contract, Law of Torts, Equity and Trusts, Company Law and Partnership,
Land Law, Professional Ethics, Evidence
""" + PLANNER_JSON_SCHEMA

ADAPTIVE_PLANNER_PROMPT = """You are a study plan generator for Nigerian law students preparing for {exam_type}.

Student Profile:
- Exam Date: {exam_date} ({weeks_remaining} weeks away)
- Daily Study Time: {hours_per_day} hours
- Subjects: {subject_list}
- Self-Assessed Performance:
{performance_text}
{schedule_constraint}

Create a {weeks_remaining}-week performance-driven study plan that:
1. Allocates 60% of study time to subjects scored below 60%, 40% to subjects scored 60%+
2. Each week has a theme and 2-3 focus subjects
3. Includes reading, quiz, essay, review, and simulation activity types across the week
4. Maximum 3 tasks per day, respecting the daily hour limit
5. Saturday is lighter (review or simulation only). No Sunday tasks.
6. Final 2 weeks: prioritise simulation and essay practice
7. Topics must be specific to Nigerian law (cite sections, Nigerian cases, statutes)
8. Essay practice twice per week from week 3 onwards

Nigerian Law School subjects: Constitutional Law, Criminal Law and Procedure, Civil Procedure,
Law of Contract, Law of Torts, Equity and Trusts, Company Law and Partnership, Land Law,
Professional Ethics, Evidence
""" + PLANNER_JSON_SCHEMA


class PlannerRequest(BaseModel):
    exam_type: str
    exam_date: str
    study_hours_per_day: int
    subjects: list[str]
    mode: str = "diagnostic"  # "cold_start" or "diagnostic"
    academic_level: Optional[str] = None
    available_days: Optional[list[str]] = None
    diagnostic_results: dict = {}

class LibrarySearchRequest(BaseModel):
    query: str
    k: int = 6

@app.post("/api/v1/library/search")
async def search_library(request: LibrarySearchRequest):
    if not db:
        raise HTTPException(status_code=503, detail="Vector store not available.")
    try:
        k = max(1, min(request.k, 10))
        docs = await asyncio.to_thread(lambda: db.similarity_search(request.query, k=k))
        return {
            "query": request.query,
            "results": [
                {
                    "content": doc.page_content,
                    "source": doc.metadata.get("source", "Nigerian Law Library"),
                }
                for doc in docs
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@app.post("/api/v1/planner/generate")
async def generate_study_plan(request: PlannerRequest):
    if not llm:
        raise HTTPException(status_code=503, detail="AI service not available — check GOOGLE_API_KEY in .env.")

    try:
        exam_date_obj = dt.fromisoformat(request.exam_date)
        weeks_remaining = max(2, (exam_date_obj - dt.today()).days // 7)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid exam_date format. Use YYYY-MM-DD.")

    subject_list = ", ".join(request.subjects)

    if request.available_days:
        days_str = ", ".join(request.available_days)
        schedule_constraint = (
            f"- Available Study Days: {days_str} ONLY. "
            f"Every other day of the week MUST have an empty tasks array (rest day). "
            f"Ignore any default day rules — only use the days listed above."
        )
    else:
        schedule_constraint = ""

    if request.mode == "cold_start":
        plan_prompt = COLD_START_PROMPT.format(
            academic_level=request.academic_level or "Nigerian Law School",
            exam_type=request.exam_type,
            exam_date=request.exam_date,
            weeks_remaining=weeks_remaining,
            hours_per_day=request.study_hours_per_day,
            subject_list=subject_list,
            schedule_constraint=schedule_constraint,
            mode="cold_start",
        )
    else:
        performance_text = "\n".join(
            f"  - {subj}: {score}% ({'needs focus' if score < 60 else 'maintain'})"
            for subj, score in sorted(request.diagnostic_results.items(), key=lambda x: x[1])
        ) or "  - No performance data provided"
        plan_prompt = ADAPTIVE_PLANNER_PROMPT.format(
            exam_type=request.exam_type,
            exam_date=request.exam_date,
            weeks_remaining=weeks_remaining,
            hours_per_day=request.study_hours_per_day,
            subject_list=subject_list,
            performance_text=performance_text,
            schedule_constraint=schedule_constraint,
            mode="diagnostic",
        )

    try:
        response = fast_llm.invoke([HumanMessage(content=plan_prompt)])
        plan = extract_json(response.content)
        return plan
    except (json.JSONDecodeError, ValueError):
        raise HTTPException(status_code=500, detail="AI returned malformed JSON. Try again.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate study plan: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
