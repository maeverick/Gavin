# Nigerian Legal Sources - Data Collection Guide

This directory contains Nigerian legal materials downloaded and prepared for the Gavin AI RAG pipeline.

## Directory Structure

```
docs/
└── legal_sources/
    ├── statutes/           # Acts and Legislation (PDFs and TXT)
    │   ├── nigeria_constitution_1999.pdf
    │   ├── evidence_act_2011.txt
    │   ├── land_use_act_1978.txt
    │   ├── cama_2020.pdf
    │   └── administration_of_criminal_justice_act_2015.pdf
    └── case_law/          # Court Decisions (TXT)
        ├── NGSC/           # Supreme Court of Nigeria
        └── NGCA/           # Court of Appeal
```

## How to Populate This Directory

### Option 1: Use the Automated Scraper (Recommended)
From the `ai-service/` directory, run:
```bash
# Download all available sources
python scraper.py --source all

# Download and immediately index into Supabase
python scraper.py --source all --ingest

# Download only a specific source
python scraper.py --source constitution
python scraper.py --source cases --max-cases 50
```

### Option 2: Manual Downloads
Download any of these documents and place them in the appropriate subdirectory:

| Document | Source |
|---|---|
| Constitution of Nigeria 1999 | https://www.icnl.org/wp-content/uploads/Nigeria_Constitution.pdf |
| Administration of Criminal Justice Act 2015 | UNODC (link in scraper.py) |
| NigeriaLII Case Law | https://nigerialii.org/ |
| CommonLII Nigerian Cases | http://www.commonlii.org/ng/cases/ |
| AfricanLII Nigerian Cases | https://africanlii.org/ng/judgment |
| NWLR (Nigerian Weekly Law Reports) | Commercial/Subscription - Manual Add Only |

### Note on NWLR
**NWLR** is a commercial, subscription-based service and cannot be automatically scraped. If you have access to NWLR reports in PDF or text format, you can manually place them in `docs/legal_sources/nwlr/` and run `python ai-service/ingestion.py` to index them.

### Option 3: Index Your Own Documents
Place any PDF or TXT file here and run the ingestion script:
```bash
python ingestion.py
```

## Supported File Types
- `.pdf` — Legal document PDFs (Acts, Judgments)
- `.txt` — Plain text files (scraped web content, transcripts)

## Notes
- Always verify legal information with official Nigerian government publications.
- The scraper respects `robots.txt` and rate limits to be a good internet citizen.
- This data is used exclusively for educational purposes.
