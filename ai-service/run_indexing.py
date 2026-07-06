"""
Resume/new indexing script — run from the ai-service/ directory:
    py -3.13 run_indexing.py

Verified indexed (Supabase, 2026-05-23):
  Statutes — all complete:
  - evidence_act_2011.pdf              : complete (239 chunks)
  - land_use_act_1978.pdf              : complete (164 chunks)
  - nigeria_constitution_1999.pdf      : complete (988 chunks)
  - acja_2015.pdf                      : complete (955 chunks)
  - cama_2020.pdf                      : complete (2096 chunks)
  - criminal_code_act.pdf              : complete (680 chunks)
  - penal_code_northern_states.pdf     : complete (133 chunks)
  - rules_professional_conduct_2007.pdf: complete (152 chunks)
  - nba_rules_professional_conduct.pdf : complete (268 chunks)
  - investments_securities_act_2007.pdf: complete (982 chunks)
  - matrimonial_causes_act.pdf         : complete (895 chunks)

  Case law — all 39 original files complete.

  Pending:
  - federal_high_court_civil_procedure_rules_2019.pdf : 0 chunks (scanned PDF, needs text)
  - 19 new case law files below
"""
import time
from pathlib import Path
from dotenv import load_dotenv
load_dotenv()

from ingestion import load_document, chunk_documents, BATCH_SIZE, BATCH_DELAY
from rag import get_vector_db

CASE_LAW_DIR = Path(__file__).parent.parent / "docs" / "legal_sources" / "case_law"
STATUTES = Path(__file__).parent.parent / "docs" / "legal_sources" / "statutes"

# Files that exist on disk but have never been indexed (0 chunks in Supabase).
# Run this script to index them. Once done, move them to the verified list above.
CASE_JOBS = [
    # Replacement files for removed hallucinated entries
    ("vicarious_liability_principles.txt",         "Vicarious Liability Principles"),
    ("lua_revocation_compensation_principles.txt", "LUA Revocation & Compensation Principles"),
    ("family_land_principles.txt",                 "Family Land & Partition Principles"),
    ("self_defence_principles.txt",                "Self-Defence Principles"),
]

# New statute PDFs to index from scratch (skip=0).
# Statutes already fully indexed are listed in the header comment above.
NEW_JOBS = [
    # ("filename.pdf", 0, "Label"),  # example entry
]


def index_chunks(chunks, label):
    db = get_vector_db()
    total = len(chunks)
    if total == 0:
        print(f"  [{label}] Nothing to index.")
        return 0
    batches = [chunks[i:i + BATCH_SIZE] for i in range(0, total, BATCH_SIZE)]
    print(f"[{label}] {total} chunks in {len(batches)} batches")
    indexed = 0
    for i, batch in enumerate(batches):
        retries = 0
        while retries < 5:
            try:
                db.add_documents(batch)
                indexed += len(batch)
                print(f"  [{label}] Batch {i+1}/{len(batches)} done ({indexed}/{total})")
                break
            except Exception as e:
                err = str(e)
                err_lower = err.lower()
                if "429" in err or "RESOURCE_EXHAUSTED" in err:
                    wait = BATCH_DELAY * (retries + 1)
                    print(f"  Rate limit — waiting {wait}s...")
                    time.sleep(wait)
                    retries += 1
                elif any(p in err_lower for p in [
                    "getaddrinfo", "connection", "server disconnected",
                    "ssl", "eof", "timeout", "winerror", "aborted",
                    "reset", "disconnected", "network", "socket"
                ]):
                    wait = 30 * (retries + 1)
                    print(f"  Network error — retrying in {wait}s...")
                    time.sleep(wait)
                    retries += 1
                else:
                    print(f"  Unrecoverable error: {err[:200]}")
                    return indexed
        if retries >= 5:
            print(f"  [{label}] Batch {i+1} failed after 5 retries — stopping.")
            break
        if i < len(batches) - 1:
            time.sleep(BATCH_DELAY)
    return indexed


for filename, label in CASE_JOBS:
    path = CASE_LAW_DIR / filename
    if not path.exists():
        print(f"\n[{label}] SKIPPED — file not found: {path}")
        continue
    print(f"\n=== {label} ===")
    docs = load_document(str(path))
    chunks = chunk_documents(docs)
    print(f"  {len(chunks)} chunks")
    result = index_chunks(chunks, label)
    print(f"  {label} done: {result} chunks added")
    if result >= len(chunks):
        print(f"  [COMPLETE] {label} fully indexed")
    else:
        print(f"  [PARTIAL] {label} stopped at {result}/{len(chunks)}")

for filename, skip, label in NEW_JOBS:
    path = STATUTES / filename
    if not path.exists():
        print(f"\n[{label}] SKIPPED — file not found: {path}")
        continue
    print(f"\n=== {label} ===")
    print(f"  Loading: {path}")
    docs = load_document(str(path))
    all_chunks = chunk_documents(docs)
    to_index = all_chunks[skip:]
    print(f"  Total chunks: {len(all_chunks)} — indexing {len(to_index)} (skipping first {skip})")
    result = index_chunks(to_index, label)
    total_indexed = skip + result
    print(f"  {label} done: {result} new chunks added ({total_indexed}/{len(all_chunks)} total)")
    if total_indexed >= len(all_chunks):
        print(f"  [COMPLETE] {label} fully indexed")
    else:
        print(f"  [PARTIAL] {label} stopped at chunk {total_indexed}/{len(all_chunks)}")

print("\n=== ALL DONE ===")
