# -*- coding: utf-8 -*-
"""
Gavin AI - Nigerian Legal Data Scraper
=======================================
Downloads and saves Nigerian legal texts from publicly accessible sources
for ingestion into Supabase pgvector via ingestion.py.

Usage:
    python scraper.py --source all        # Download everything
    python scraper.py --source constitution
    python scraper.py --source acts
    python scraper.py --source cases
"""

import os
import re
import time
import argparse
import requests
from pathlib import Path
from urllib.parse import urljoin, urlparse

# Try to import optional dependencies
try:
    from bs4 import BeautifulSoup
    BS4_AVAILABLE = True
except ImportError:
    BS4_AVAILABLE = False
    print("WARNING: beautifulsoup4 not installed. HTML scraping will be skipped.")

# ─── Configuration ────────────────────────────────────────────────────────────

DOCS_DIR = Path(__file__).parent.parent / "docs" / "legal_sources"
DOCS_DIR.mkdir(parents=True, exist_ok=True)

# Session with browser-like headers to avoid basic bot blocks
SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": "Mozilla/5.0 (compatible; GavinAI-Research-Bot/1.0; Academic Use Only)",
    "Accept": "text/html,application/pdf,application/xhtml+xml",
})

# Rate limit: be respectful to public legal databases
REQUEST_DELAY = 2  # seconds between requests

# ─── Direct Download Sources (verified public domain / open access) ───────────

DIRECT_DOWNLOADS = {
    "constitution": {
        "label": "Constitution of Nigeria 1999 (as amended 2011)",
        "sources": [
            {
                "url": "https://www.constituteproject.org/constitution/Nigeria_2011.pdf",
                "filename": "nigeria_constitution_1999.pdf",
                "type": "pdf"
            },
            {
                "url": "https://www.wipo.int/edocs/lexdocs/laws/en/ng/ng014en.pdf",
                "filename": "nigeria_constitution_1999.pdf",
                "type": "pdf"
            },
            {
                "url": "https://nigeriarights.gov.ng/files/constitution.pdf",
                "filename": "nigeria_constitution_1999.pdf",
                "type": "pdf"
            }
        ]
    },
    "evidence_act": {
        "label": "Evidence Act 2011",
        "sources": [
            {
                "url": "https://placng.org/lawsofnigeria/laws/E14.pdf",
                "filename": "evidence_act_2011.pdf",
                "type": "pdf"
            },
            {
                "url": "https://archive.gazettes.africa/archive/ng/2011/ng-government-gazette-dated-2011-06-21-no-80.pdf",
                "filename": "evidence_act_2011.pdf",
                "type": "pdf"
            },
            {
                "url": "https://faolex.fao.org/docs/pdf/nig164561.pdf",
                "filename": "evidence_act_2011.pdf",
                "type": "pdf"
            }
        ]
    },
    "land_use_act": {
        "label": "Land Use Act 1978",
        "sources": [
            {
                "url": "https://faolex.fao.org/docs/pdf/nig67625.pdf",
                "filename": "land_use_act_1978.pdf",
                "type": "pdf"
            },
            {
                "url": "https://www.ekitistate.gov.ng/wp-content/uploads/saber/Land-Use-Act-1978-LawGlobal-Hub.pdf",
                "filename": "land_use_act_1978.pdf",
                "type": "pdf"
            }
        ]
    },
    "acjoa": {
        "label": "Administration of Criminal Justice Act 2015",
        "sources": [
            {
                "url": "https://www.policinglaw.info/assets/downloads/2015_Administration_of_Criminal_Justice_Act.pdf",
                "filename": "administration_of_criminal_justice_act_2015.pdf",
                "type": "pdf"
            },
            {
                "url": "https://fida.org.ng/wp-content/uploads/2020/11/THE-ADMINISTRATION-OF-CRIMINAL-JUSTICE-ACT-ACJA-2015.pdf",
                "filename": "administration_of_criminal_justice_act_2015.pdf",
                "type": "pdf"
            },
            {
                "url": "https://policehumanrightsresources.org/content/uploads/2017/09/Administration-of-Criminal-Justice-Act-2015-2.compressed.pdf",
                "filename": "administration_of_criminal_justice_act_2015.pdf",
                "type": "pdf"
            }
        ]
    },
    "cama": {
        "label": "Companies and Allied Matters Act 2020",
        "sources": [
            {
                "url": "https://www.placng.org/lawsofnigeria/laws/C20.pdf",
                "filename": "cama_2020.pdf",
                "type": "pdf"
            },
            {
                "url": "https://oblp.org/wp-content/uploads/2021/01/CAMA-2020-Companies-and-Allied-Matters-Act-2020.pdf",
                "filename": "cama_2020.pdf",
                "type": "pdf"
            },
            {
                "url": "https://www.cac.gov.ng/wp-content/uploads/2020/12/CAMA-NOTE-BOOK-FULL-VERSION.pdf",
                "filename": "cama_2020.pdf",
                "type": "pdf"
            }
        ]
    },
    "criminal_code": {
        "label": "Criminal Code Act (Cap C38 LFN 2004)",
        "sources": [
            {
                "url": "https://www.placng.org/lawsofnigeria/laws/C38.pdf",
                "filename": "criminal_code_act.pdf",
                "type": "pdf"
            },
            {
                "url": "https://faolex.fao.org/docs/pdf/nig127485.pdf",
                "filename": "criminal_code_act.pdf",
                "type": "pdf"
            }
        ]
    },
    "penal_code": {
        "label": "Penal Code (Northern States) Federal Provisions Act",
        "sources": [
            {
                "url": "https://www.placng.org/lawsofnigeria/laws/P3.pdf",
                "filename": "penal_code_northern_states.pdf",
                "type": "pdf"
            }
        ]
    },
    "matrimonial_causes": {
        "label": "Matrimonial Causes Act (Cap M7 LFN 2004)",
        "sources": [
            {
                "url": "https://www.placng.org/lawsofnigeria/laws/M7.pdf",
                "filename": "matrimonial_causes_act.pdf",
                "type": "pdf"
            },
            {
                "url": "https://faolex.fao.org/docs/pdf/nig127492.pdf",
                "filename": "matrimonial_causes_act.pdf",
                "type": "pdf"
            }
        ]
    },
    "investments_securities": {
        "label": "Investments and Securities Act 2007",
        "sources": [
            {
                "url": "https://www.placng.org/lawsofnigeria/laws/I24.pdf",
                "filename": "investments_securities_act_2007.pdf",
                "type": "pdf"
            },
            {
                "url": "https://sec.gov.ng/wp-content/uploads/2020/02/Investments-and-Securities-Act-2007.pdf",
                "filename": "investments_securities_act_2007.pdf",
                "type": "pdf"
            }
        ]
    },
    "nba_rules": {
        "label": "Rules of Professional Conduct for Legal Practitioners 2007",
        "sources": [
            {
                "url": "https://www.placng.org/lawsofnigeria/laws/L11.pdf",
                "filename": "nba_rules_professional_conduct.pdf",
                "type": "pdf"
            },
            {
                "url": "https://nigerianlawguru.com/wp-content/uploads/2021/06/Rules-of-Professional-Conduct-for-Legal-Practitioners-2007.pdf",
                "filename": "nba_rules_professional_conduct.pdf",
                "type": "pdf"
            }
        ]
    },
    "civil_procedure_fhc": {
        "label": "Federal High Court (Civil Procedure) Rules 2019",
        "sources": [
            {
                "url": "https://www.placng.org/lawsofnigeria/laws/F12.pdf",
                "filename": "federal_high_court_civil_procedure_rules.pdf",
                "type": "pdf"
            },
            {
                "url": "https://nigerialawguru.com/wp-content/uploads/2021/06/Federal-High-Court-Civil-Procedure-Rules-2019.pdf",
                "filename": "federal_high_court_civil_procedure_rules.pdf",
                "type": "pdf"
            }
        ]
    },
}

# ─── Case Law Sources (HTML scraping from open-access databases) ─────────────

CASE_LAW_SOURCES = [
    {
        "name": "CommonLII Nigeria",
        "base_url": "http://www.commonlii.org/ng/cases/",
        "type": "directory_listing",
        "subpaths": [
            "NGSC/",    # Supreme Court of Nigeria
            "NGCA/",    # Court of Appeal Nigeria
        ]
    },
    {
        "name": "NigeriaLII",
        "base_url": "https://nigerialii.org/judgment/court/",
        "type": "numeric_listing",
        "subpaths": [
            "1",    # Supreme Court
            "2",    # Court of Appeal
            "3",    # Federal High Court
        ]
    }
]

# ─── Helpers ──────────────────────────────────────────────────────────────────

def safe_filename(name: str) -> str:
    """Convert a string to a safe filename."""
    return re.sub(r'[^a-zA-Z0-9_\-.]', '_', name)[:120]


def download_pdf(url: str, dest_path: Path) -> bool:
    """Downloads a PDF file from a URL."""
    if dest_path.exists():
        print(f"  ✓ Already downloaded: {dest_path.name}")
        return True
    
    print(f"  ↓ Downloading PDF: {url}")
    try:
        resp = SESSION.get(url, timeout=30, stream=True)
        resp.raise_for_status()
        
        # Validate it's actually a PDF
        content_type = resp.headers.get("content-type", "")
        if "pdf" not in content_type and not url.endswith(".pdf"):
            print(f"  ✗ Unexpected content type: {content_type}")
            return False

        with open(dest_path, "wb") as f:
            for chunk in resp.iter_content(chunk_size=8192):
                f.write(chunk)

        print(f"  ✓ Saved: {dest_path.name} ({dest_path.stat().st_size // 1024}KB)")
        return True
    except Exception as e:
        if dest_path.exists():
            dest_path.unlink()
        print(f"  ✗ Failed to download PDF: {e}")
        return False


def scrape_html_to_text(url: str, dest_path: Path) -> bool:
    """Fetches an HTML page and extracts its readable text content."""
    if dest_path.exists():
        print(f"  ✓ Already downloaded: {dest_path.name}")
        return True
    
    if not BS4_AVAILABLE:
        print(f"  ✗ Skipping HTML scrape (beautifulsoup4 not installed): {url}")
        return False
    
    print(f"  ↓ Scraping HTML: {url}")
    try:
        resp = SESSION.get(url, timeout=30)
        resp.raise_for_status()
        
        soup = BeautifulSoup(resp.text, "html.parser")
        
        # Remove navigation, scripts, and styling elements
        for tag in soup(["script", "style", "nav", "header", "footer", "form", "button"]):
            tag.decompose()
        
        # Get main content text
        text = soup.get_text(separator="\n", strip=True)
        
        # Clean up excessive whitespace
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        text = "\n".join(lines)
        
        with open(dest_path, "w", encoding="utf-8") as f:
            f.write(f"Source: {url}\n\n")
            f.write(text)
        
        print(f"  ✓ Saved: {dest_path.name} ({len(text)} chars)")
        return True
    except Exception as e:
        print(f"  ✗ Failed to scrape HTML: {e}")
        return False


def scrape_case_law_index(source_config: dict, subpath: str, court_dir: Path, max_cases: int = 50) -> int:
    """Scrapes a listing of case law based on the source type."""
    if not BS4_AVAILABLE:
        print("  ✗ Skipping case law scrape (beautifulsoup4 not installed).")
        return 0

    base_url = source_config["base_url"]
    source_type = source_config.get("type", "directory_listing")
    index_url = urljoin(base_url, subpath)
    
    print(f"\n  Scanning index: {index_url} ({source_config['name']})")
    
    try:
        resp = SESSION.get(index_url, timeout=20)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        
        if source_type == "directory_listing":
            # CommonLII style: year links like 2023/
            year_links = [
                a["href"] for a in soup.find_all("a", href=True)
                if re.match(r"\d{4}/?$", a["href"])
            ]
            
            downloaded = 0
            for year_href in sorted(year_links, reverse=True)[:3]:  # Last 3 years
                year_url = urljoin(index_url, year_href)
                downloaded += _scrape_year_cases(year_url, court_dir, max_cases - downloaded)
                if downloaded >= max_cases:
                    break
                time.sleep(REQUEST_DELAY)
            return downloaded

        elif source_type == "numeric_listing":
            # NigeriaLII style: search for links to individual judgments
            # These are typically in a table or list
            case_links = []
            for a in soup.find_all("a", href=True):
                href = a["href"]
                # Match judgment URLs like /judgment/12345
                if "/judgment/" in href and not href.endswith("/recent") and not "/court/" in href:
                    case_links.append(urljoin(base_url, href))
            
            # Remove duplicates
            case_links = list(dict.fromkeys(case_links))
            
            count = 0
            for case_url in case_links[:max_cases]:
                case_id = urlparse(case_url).path.split("/")[-1]
                dest_path = court_dir / f"judgment_{case_id}.txt"
                
                if scrape_html_to_text(case_url, dest_path):
                    count += 1
                
                time.sleep(REQUEST_DELAY)
            return count
            
        return 0
    except Exception as e:
        print(f"  ✗ Failed to scan index: {e}")
        return 0


def _scrape_year_cases(year_url: str, dest_dir: Path, limit: int) -> int:
    """Scrapes individual case pages within a year listing."""
    if not BS4_AVAILABLE:
        return 0
    
    print(f"    Scanning year: {year_url}")
    try:
        resp = SESSION.get(year_url, timeout=20)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        
        case_links = [
            urljoin(year_url, a["href"]) for a in soup.find_all("a", href=True)
            if a["href"].endswith(".html") and not a["href"].startswith("http")
        ]
        
        count = 0
        for case_url in case_links[:limit]:
            case_name = safe_filename(urlparse(case_url).path.split("/")[-1].replace(".html", ""))
            dest_path = dest_dir / f"{case_name}.txt"
            
            if scrape_html_to_text(case_url, dest_path):
                count += 1
            
            time.sleep(REQUEST_DELAY)
        
        return count
    except Exception as e:
        print(f"    ✗ Failed to scrape year: {e}")
        return 0

# ─── Main Runners ─────────────────────────────────────────────────────────────

def download_statutes(sources_filter: list = None):
    """Downloads all configured statutes and Acts."""
    print("\n" + "="*60)
    print("📜 DOWNLOADING NIGERIAN STATUTES & ACTS")
    print("="*60)
    
    statutes_dir = DOCS_DIR / "statutes"
    statutes_dir.mkdir(parents=True, exist_ok=True)
    
    success_count = 0
    for key, config in DIRECT_DOWNLOADS.items():
        if sources_filter and key not in sources_filter:
            continue
        
        print(f"\n[{config['label']}]")
        
        for source in config["sources"]:
            dest = statutes_dir / source["filename"]
            time.sleep(REQUEST_DELAY)
            
            if source["type"] == "pdf":
                if download_pdf(source["url"], dest):
                    success_count += 1
                    break  # Stop at first successful source per document
            elif source["type"] == "html":
                if scrape_html_to_text(source["url"], dest):
                    success_count += 1
                    break
    
    print(f"\n✅ Downloaded {success_count} statute(s) to: {statutes_dir}")
    return success_count


def download_case_law(max_per_court: int = 30):
    """Scrapes case law from open-access legal databases."""
    print("\n" + "="*60)
    print("⚖️  DOWNLOADING NIGERIAN CASE LAW")
    print("="*60)
    
    cases_dir = DOCS_DIR / "case_law"
    cases_dir.mkdir(parents=True, exist_ok=True)
    
    total = 0
    for source in CASE_LAW_SOURCES:
        print(f"\n[Source: {source['name']}]")
        
        for subpath in source.get("subpaths", []):
            court_name = safe_filename(subpath.strip("/"))
            court_dir = cases_dir / court_name
            court_dir.mkdir(parents=True, exist_ok=True)
            
            if source["type"] == "directory_listing" or source["type"] == "numeric_listing":
                n = scrape_case_law_index(
                    source,
                    subpath,
                    court_dir,
                    max_cases=max_per_court
                )
                total += n
    
    print(f"\n✅ Downloaded {total} case(s) to: {cases_dir}")
    return total


def run_ingestion_after_download():
    """Runs the ingestion pipeline on all downloaded files."""
    print("\n" + "="*60)
    print("🔄 RUNNING INGESTION PIPELINE")
    print("="*60)
    
    from ingestion import index_document
    
    all_files = list(DOCS_DIR.rglob("*.pdf")) + list(DOCS_DIR.rglob("*.txt"))
    print(f"\nFound {len(all_files)} document(s) to index...")
    
    success = 0
    for file_path in all_files:
        print(f"\n  Indexing: {file_path.name}")
        chunks_added = index_document(str(file_path))
        if chunks_added > 0:
            success += 1
    
    print(f"\n✅ Successfully indexed {success}/{len(all_files)} document(s).")


# ─── Entry Point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Gavin AI - Nigerian Legal Data Scraper"
    )
    parser.add_argument(
        "--source",
        choices=["all", "statutes", "cases", "constitution", "evidence_act", "land_use_act", "acjoa", "cama",
                 "criminal_code", "penal_code", "matrimonial_causes", "investments_securities", "nba_rules", "civil_procedure_fhc"],
        default="all",
        help="Which data source to download"
    )
    parser.add_argument(
        "--ingest",
        action="store_true",
        help="Automatically run the ingestion pipeline after downloading"
    )
    parser.add_argument(
        "--max-cases",
        type=int,
        default=30,
        help="Maximum number of cases to download per court (default: 30)"
    )
    
    args = parser.parse_args()
    
    print("\n🇳🇬 Gavin AI - Nigerian Legal Data Scraper")
    print(f"   Output directory: {DOCS_DIR}\n")
    
    if args.source == "all":
        download_statutes()
        download_case_law(max_per_court=args.max_cases)
    elif args.source == "statutes":
        download_statutes()
    elif args.source == "cases":
        download_case_law(max_per_court=args.max_cases)
    else:
        # Specific statute key
        download_statutes(sources_filter=[args.source])
    
    if args.ingest:
        run_ingestion_after_download()
    else:
        print("\n💡 Tip: Run with --ingest to automatically index downloaded files into Supabase.")
        print(f"   Or manually run: python ingestion.py")
