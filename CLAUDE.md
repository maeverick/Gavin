# Gavel — Project Memory for Claude Code

This file is the persistent memory for Claude Code sessions. Read it at the start of every session to understand where we are and what to do next. Update it whenever significant work is completed.

---

## What Is This Project?

**Gavel** is a Nigerian law study app for bar exam candidates. It has:
- A React + Vite frontend (port 5173)
- An Express backend / proxy (port 3000)
- A FastAPI AI service (port 8000) — `ai-service/`
- Supabase as the database and vector store (pgvector)
- Google Gemini for embeddings (`gemini-embedding-001`) and LLM chat (`gemini-2.5-flash`)

The AI answers questions by retrieving relevant chunks from a RAG knowledge base stored in Supabase, then generating a response with Gemini.

---

## Tech Stack Quick Reference

| Layer | Technology |
|---|---|
| Frontend | React, Vite, port 5173 |
| Backend | Express (Node), port 3000 |
| AI service | FastAPI (Python), port 8000 |
| Database | Supabase (Postgres + pgvector) |
| Embeddings | `gemini-embedding-001` via `GOOGLE_API_KEY` |
| LLM | `gemini-2.5-flash` via `GOOGLE_API_KEY_LLM` |
| Vector table | `documents` — columns: id, content, metadata (jsonb), embedding |
| Supabase project | `ttfbazxqjufnwbsmtdls` |

---

## RAG Knowledge Base — Current State (as of 2026-05-23)

**Total chunks in Supabase: ~8,700+**

### Statutes — ALL COMPLETE (do not re-index, will create duplicates)

| Document | Chunks | Status |
|---|---|---|
| evidence_act_2011.pdf | 239 | Complete |
| land_use_act_1978.pdf | 164 | Complete |
| nigeria_constitution_1999.pdf | 988 | Complete |
| acja_2015.pdf | 955 | Complete |
| cama_2020.pdf | 2096 | Complete |
| criminal_code_act.pdf | 680 | Complete |
| penal_code_northern_states.pdf | 133 | Complete |
| rules_professional_conduct_2007.pdf | 152 | Complete |
| nba_rules_professional_conduct.pdf | 268 | Complete |
| investments_securities_act_2007.pdf | 982 | Complete |
| matrimonial_causes_act.pdf | 895 | Complete |
| federal_high_court_civil_procedure_rules_2019.pdf | 0 | SCANNED PDF — 0 chunks extracted, needs text version |

### Case Law — ALL FILES INDEXED (as of 2026-05-24)

All 103 `.txt` files in `docs/legal_sources/case_law/` are indexed. Writing is now COMPLETE — all subjects have been brought to target coverage.

**Final coverage by subject:**
| Subject | Files |
|---|---|
| Contract Law | 16 |
| Criminal Law | 14 |
| Tort Law | 13 |
| Constitutional Law | 12 |
| Professional Ethics | 9 |
| Equity & Trusts | 8 |
| Evidence Law | 8 |
| Company Law | 9 |
| Land Law | 8 |
| Civil Procedure | 6 |
| **Total** | **103** |

---

## Case Law Writing — COMPLETE (2026-05-24)

All planned case summaries have been written and indexed across two sessions.

### Case Summary File Format

Every file lives in `docs/legal_sources/case_law/` and follows this exact structure:

```
Subject: [Subject Area] — [Specific Topic]
Source: [Case Name + citation + court]

CASE NAME: [Full citation]

FACTS:
[3–5 sentences. Who sued whom, what happened, what the dispute was about.]

ISSUE:
[The single legal question the court had to decide.]

HELD:
[What the court decided and why — 3–5 sentences.]

KEY PRINCIPLES:

[TOPIC HEADING]:
1. PRINCIPLE NAME: Explanation
2. PRINCIPLE NAME: Explanation
(continue as needed, use sub-points where helpful)

APPLICATION IN NIGERIA:
[How this case is applied in Nigerian courts, what types of disputes it governs, any Nigerian equivalent or parallel case.]

CITATION: [short citation]
```

After writing each file, add it to `CASE_JOBS` in `ai-service/run_indexing.py` and run the indexer.

### Coverage Status & Writing Queue

Priority order = thinnest subject first.

#### 1. PROFESSIONAL ETHICS — needs ~8 cases (currently: 1 file, topic summary only)

Must write:
- [ ] `nba_v_kehinde.txt` — NBA v Kehinde & Anor — striking off, professional misconduct
- [ ] `okafor_v_nweke_2007.txt` — Okafor v Nweke [2007] — legal practitioner, signing processes in firm name
- [ ] `gani_fawehinmi_v_nba_1989.txt` — Fawehinmi v NBA [1989] — right to practice, contempt, access to court
- [ ] `agbaje_v_pharmacists_board.txt` — contempt/discipline of professionals (ethics analogy)
- [ ] `fidelity_bank_v_military_governor.txt` — legal practitioner as amicus/conflict cases (legal privilege)
- [ ] `solicitor_client_privilege.txt` — principles of legal professional privilege under Nigerian law
- [ ] `contempt_of_court_principles.txt` — key contempt of court cases and principles
- [ ] `legal_practitioners_act_principles.txt` — Legal Practitioners Act — admission, discipline, disbarment

#### 2. EQUITY & TRUSTS — needs ~8 cases (currently: 2 files)

Must write:
- [ ] `milroy_v_lord_1862.txt` — Milroy v Lord [1862] — constitution of trusts, equity will not perfect an imperfect gift
- [ ] `paul_v_constance_1977.txt` — Paul v Constance [1977] — informal declaration of trust
- [ ] `re_rose_1952.txt` — Re Rose [1952] — constitution of trust, transfer of shares
- [ ] `westdeutsche_v_islington_1996.txt` — Westdeutsche Landesbank v Islington [1996] — resulting & constructive trusts
- [ ] `specific_performance_principles.txt` — specific performance and injunctions under Nigerian equity
- [ ] `banner_homes_v_luff_2000.txt` — Banner Homes v Luff [2000] — constructive trust, common intention
- [ ] `re_denley_1969.txt` — Re Denley [1969] — purpose trusts, beneficiary principle
- [ ] `ap_ltd_v_rtc_1998.txt` — Apapa v Registered Trustees — Nigerian trust/equity case

#### 3. EVIDENCE LAW — needs ~6 cases (currently: 3 files)

Must write:
- [ ] `ibrahim_v_r_1914.txt` — Ibrahim v R [1914] — confessions, voluntariness rule
- [ ] `r_v_bass_1953.txt` — R v Bass [1953] — admissibility of confessions obtained by oppression
- [ ] `subramaniam_v_pp_1956.txt` — Subramaniam v Public Prosecutor [1956] — hearsay rule
- [ ] `agagu_v_fayemi_2011.txt` — Agagu v Fayemi [2011] — documentary evidence, election petitions
- [ ] `chukwu_v_state_1996.txt` — Chukwu v State — confessions, retracted confessions in Nigerian criminal law
- [ ] `bello_v_ag_oyo_1986.txt` — Bello v AG Oyo State — dying declarations, admissibility

#### 4. CIVIL PROCEDURE — needs ~5 cases (currently: 2 files)

Must write:
- [ ] `tukur_v_govt_of_gongola_state_1989.txt` — Tukur v Govt of Gongola State [1989] — jurisdiction, subject matter
- [ ] `adesokan_v_adegorioye_1996.txt` — interlocutory injunctions, balance of convenience (Kotoye principles)
- [ ] `kotoye_v_cbn_1989.txt` — Kotoye v CBN [1989] — principles for granting interlocutory injunctions
- [ ] `american_cyanamid_v_ethicon_1975.txt` — American Cyanamid v Ethicon [1975] — interlocutory injunctions (applied in Nigeria)
- [ ] `limitation_of_actions_principles.txt` — statutes of limitation, time bars in Nigerian civil proceedings

#### 5. LAND LAW — needs ~4 cases (currently: 4 files)

Must write:
- [ ] `idundun_v_okumagba_1976.txt` — Idundun v Okumagba [1976] — five ways to prove title to land
- [ ] `oyibo_v_kwara_state_1991.txt` — right of occupancy, revocation, compensation under LUA
- [ ] `registered_trustees_v_dawodu.txt` — family land, partition, declaration of title
- [ ] `ogunola_v_eiyekole_1990.txt` — Ogunola v Eiyekole [1990] — customary tenancy, forfeiture

#### 6. COMPANY LAW — needs ~4 cases (currently: 5 files)

Must write:
- [ ] `gilford_motor_v_horne_1933.txt` — Gilford Motor Co v Horne [1933] — lifting the veil (fraud)
- [ ] `regal_hastings_v_gulliver_1967.txt` — Regal (Hastings) v Gulliver [1967] — directors' fiduciary duty, corporate opportunity
- [ ] `re_smith_and_fawcett_1942.txt` — Re Smith and Fawcett [1942] — directors' duties, bona fide
- [ ] `adams_v_cape_industries_1990.txt` — Adams v Cape Industries [1990] — corporate veil, group companies

#### 7. CRIMINAL LAW — needs ~4 cases (currently: 10 files)

Must write:
- [ ] `r_v_brown_1994.txt` — R v Brown [1994] — consent as defence to assault/battery
- [ ] `aoko_v_fagbemi_1961.txt` — Aoko v Fagbemi [1961] — provocation under the Criminal Code
- [ ] `r_v_mcnaghten_1843.txt` — M'Naghten's Case [1843] — insanity defence (M'Naghten rules)
- [ ] `state_v_oji_1986.txt` — self-defence under Nigerian criminal law

#### 8. TORT LAW — needs ~4 cases (currently: 9 cases)

Must write:
- [ ] `limpus_v_london_general_omnibus_1862.txt` — vicarious liability, course of employment
- [ ] `century_v_mbanugo.txt` — Nigerian vicarious liability case
- [ ] `occupiers_liability_principles.txt` — Occupiers' Liability Act principles (invitees, licensees, trespassers)
- [ ] `defamation_principles.txt` — Defamation in Nigeria — libel, slander, defences

#### 9. CONTRACT LAW — needs ~3 cases (currently: 13 cases)

Must write:
- [ ] `adams_v_lindsell_1818.txt` — Adams v Lindsell [1818] — postal rule
- [ ] `bell_v_lever_brothers_1932.txt` — Bell v Lever Brothers [1932] — mistake at common law
- [ ] `pao_on_v_lau_yiu_long_1980.txt` — Pao On v Lau Yiu Long [1980] — duress and economic pressure

#### 10. CONSTITUTIONAL LAW — needs ~3 cases (currently: 8 files)

Must write:
- [ ] `attorney_general_bendel_v_ag_federation_1982.txt` — separation of powers, executive/legislative powers
- [ ] `peter_obi_v_inec_2008.txt` — Peter Obi v INEC [2008] — tenure calculation, constitutional interpretation
- [ ] `senate_president_v_nzeribe_1992.txt` — immunity clause, Section 308 CFRN

---

## Indexing Instructions

After writing new case files:

1. Add each file to `CASE_JOBS` in `ai-service/run_indexing.py`
2. Run: `cd ai-service && py -3.13 run_indexing.py`
3. Check for `[COMPLETE]` on each case
4. If rate-limited: wait until after midnight UTC and retry (free tier = 1,500 embeddings/day)
5. Update this file: mark cases as done

**NEVER add already-indexed statutes to NEW_JOBS** — it creates duplicates.

---

## Key Files

| File | Purpose |
|---|---|
| `ai-service/run_indexing.py` | Add new files here, then run to index |
| `ai-service/ingestion.py` | BATCH_SIZE=40, BATCH_DELAY=65s |
| `ai-service/rag.py` | Embeddings + vector store config |
| `docs/legal_sources/case_law/` | All case law `.txt` files live here |
| `docs/legal_sources/statutes/` | All statute PDFs live here |

---

## Recent Commit History (as of 2026-05-23)

- `38e4f76` — Reorder sidebar by frequency of use
- `c85159b` — Deterministic legal framework detection (IRAC, IRAAC, CLEO, FILAC) — no longer LLM guessing
- `3535548` — Add all legal frameworks
- `e9b2676` — Add IRAC response format for scenario/problem questions
- `4cd2314` — Show chat history inside sidebar on mobile

---

## Notes / Decisions

- The FHC Civil Procedure Rules 2019 PDF is a scanned image — PyPDF extracts 0 chunks. Need a text-based version to index it. Skip for now.
- Some older case files (Adesanya, Ogbodu, Savannah Bank, Oguntolu, Marwa, Inakoju, AG Federation v Abia) were scraped from the web and may contain nav/header noise. They are indexed and functional but lower quality than the curated summaries.
- Two API keys in `.env` point to the same key for now — when moving to paid tier, split into separate keys for embedding vs LLM quota.
- `CASE_JOBS` in `run_indexing.py` should only ever contain files with 0 chunks in Supabase. Running against already-indexed files creates duplicates.
