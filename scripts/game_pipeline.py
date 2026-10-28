"""Game research pipeline — fetch, cache, and clean source text.

Fetches HTML from provided URLs, classifies by source type, caches in SQLite,
and returns clean text per source. The calling agent (Sonnet) handles all
structured data extraction directly.

CLI usage:
  python3 scripts/game_pipeline.py "Azul" --urls https://... https://...
  python3 scripts/game_pipeline.py "Azul"   # uses cached data only

Can also be imported as a module:
  from scripts.game_pipeline import process_game
  result = process_game("Azul", urls=["https://..."])
"""

import argparse
import json
import re
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

# Allow running as a script: ensure project root is on sys.path
_root = str(Path(__file__).resolve().parent.parent)
if _root not in sys.path:
    sys.path.insert(0, _root)

import requests
import yaml

from scripts.html_preprocessor import html_to_main_text, truncate_text
from scripts.research_log import append_entries

# ── Constants ──────────────────────────────────────────────────────────────────

MAX_URLS_PER_GAME = 3
FETCH_TIMEOUT = 15
USER_AGENT = (
    "Mozilla/5.0 (compatible; BoardGameResearcher/1.0; "
    "+https://github.com/example/boardgame-database)"
)

DB_PATH = Path(__file__).parent.parent / "pipeline_cache.db"

# ── URL classification ─────────────────────────────────────────────────────────

PUBLISHER_PATTERNS = [
    r"zmangames\.com",
    r"plaidhatgames\.com",
    r"stonemaiergames\.com",
    r"fantasyflightgames\.com",
    r"alderac\.com",
    r"pandasaurusgames\.com",
    r"capstone-games\.com",
    r"boardgamestables\.com",
    r"nextmovegames\.com",
    r"cogitogames\.com",
    r"looneylabs\.com",
    r"spacecowboys\.fr",
    r"iello\.fr",
    r"aportagames\.com",
    r"ravensburger\.com",
    r"hasbro\.com",
    r"asmodee\.",
    r"daysofwonder\.com",
]

STORE_PATTERNS = [
    r"amazon\.",
    r"miniaturemarket\.com",
    r"coolstuffinc\.com",
    r"cardhaus\.com",
    r"boardgamesdirect\.",
    r"funagain\.com",
    r"gamewright\.com",
    r"cardboardrepublic\.com",
]

REVIEW_PATTERNS = [
    r"dicetower\.",
    r"shutupandsitdown\.com",
    r"boardgamequest\.com",
    r"geek-pride\.",
    r"meeplelikeus\.co",
    r"reviewcorner\.",
    r"wikipedia\.org",
    r"reddit\.com",
]


def classify_url(url: str) -> str:
    """Classify a URL into: publisher | store | review | other."""
    url_lower = url.lower()
    for pattern in PUBLISHER_PATTERNS:
        if re.search(pattern, url_lower):
            return "publisher"
    for pattern in STORE_PATTERNS:
        if re.search(pattern, url_lower):
            return "store"
    for pattern in REVIEW_PATTERNS:
        if re.search(pattern, url_lower):
            return "review"
    return "other"


# ── SQLite cache ───────────────────────────────────────────────────────────────

def get_db() -> sqlite3.Connection:
    """Open (and initialise if needed) the SQLite cache database."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS games (
            id   INTEGER PRIMARY KEY,
            name TEXT UNIQUE NOT NULL
        );
        CREATE TABLE IF NOT EXISTS game_sources (
            game_id     INTEGER NOT NULL,
            url         TEXT    NOT NULL,
            source_type TEXT    NOT NULL,
            html        TEXT,
            PRIMARY KEY (game_id, url),
            FOREIGN KEY (game_id) REFERENCES games(id)
        );
    """)
    conn.commit()
    return conn


def get_or_create_game(conn: sqlite3.Connection, name: str) -> int:
    """Return the game row id, creating it if absent."""
    row = conn.execute("SELECT id FROM games WHERE name = ?", (name,)).fetchone()
    if row:
        return row["id"]
    cur = conn.execute("INSERT INTO games (name) VALUES (?)", (name,))
    conn.commit()
    return cur.lastrowid


def store_source(conn: sqlite3.Connection, game_id: int, url: str,
                 source_type: str, html: str) -> None:
    conn.execute(
        """INSERT OR REPLACE INTO game_sources (game_id, url, source_type, html)
           VALUES (?, ?, ?, ?)""",
        (game_id, url, source_type, html),
    )
    conn.commit()


def get_sources(conn: sqlite3.Connection, game_id: int) -> list[sqlite3.Row]:
    return conn.execute(
        "SELECT url, source_type, html FROM game_sources WHERE game_id = ?",
        (game_id,),
    ).fetchall()


# ── Phase 1: fetch HTML ────────────────────────────────────────────────────────

def fetch_html(url: str) -> str | None:
    """Fetch a URL and return its HTML body, or None on failure."""
    try:
        resp = requests.get(
            url,
            timeout=FETCH_TIMEOUT,
            headers={"User-Agent": USER_AGENT},
            allow_redirects=True,
        )
        resp.raise_for_status()
        return resp.text
    except requests.RequestException as e:
        print(f"[pipeline] Fetch failed for {url}: {e}", file=sys.stderr)
        return None


def phase1_fetch(game_name: str, urls: list[str]) -> int:
    """Fetch HTML for each URL and store in cache. Returns game_id."""
    conn = get_db()
    game_id = get_or_create_game(conn, game_name)

    for url in urls[:MAX_URLS_PER_GAME]:
        source_type = classify_url(url)
        print(f"[pipeline] Fetching {source_type}: {url}", file=sys.stderr)
        html = fetch_html(url)
        if html:
            store_source(conn, game_id, url, source_type, html)
        else:
            print(f"[pipeline] Skipping {url} (fetch failed)", file=sys.stderr)

    conn.close()
    return game_id


# ── Clean text extraction ──────────────────────────────────────────────────────

def extract_clean_text(game_name: str) -> dict:
    """Convert cached HTML sources to clean text and return structured output.

    Returns:
        dict with "game_name" and "sources" list, each source having
        "url", "source_type", and "text" fields.
    """
    conn = get_db()
    row = conn.execute("SELECT id FROM games WHERE name = ?", (game_name,)).fetchone()
    if not row:
        print(f"[pipeline] No cached data for '{game_name}'", file=sys.stderr)
        conn.close()
        return {"game_name": game_name, "sources": []}

    game_id = row["id"]
    sources = get_sources(conn, game_id)
    conn.close()

    result_sources = []
    for source in sources:
        url = source["url"]
        source_type = source["source_type"]
        html = source["html"]
        if not html:
            continue

        print(f"[pipeline] Cleaning text from {source_type}: {url}", file=sys.stderr)
        clean_text = truncate_text(html_to_main_text(html, url=url))
        if not clean_text.strip():
            print(f"[pipeline] No text extracted from {url}", file=sys.stderr)
            continue

        result_sources.append({
            "url": url,
            "source_type": source_type,
            "text": clean_text,
        })

    return {"game_name": game_name, "sources": result_sources}


# ── Research log ──────────────────────────────────────────────────────────

LOG_PATH = Path(__file__).parent.parent / "sources" / "research-log.yaml"

SOURCE_TYPE_DESCRIPTIONS = {
    "publisher": "Publisher product page",
    "store": "Retailer product listing",
    "review": "Review or reference article",
    "other": "Game information page",
}


def append_research_log(game_slug: str, sources: list[dict]) -> None:
    """Record sources returned by the pipeline, including cached source text."""
    timestamp = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")

    entries = []
    for source in sources:
        desc = SOURCE_TYPE_DESCRIPTIONS.get(source["source_type"], "Game information page")
        domain = urlparse(source["url"]).netloc.replace("www.", "")
        entries.append({
            "timestamp": timestamp,
            "game_id": game_slug,
            "url": source["url"],
            "description": f"{desc} — {domain} (pipeline text; may be cached)",
        })

    count = append_entries(entries, path=LOG_PATH)
    print(f"[pipeline] Appended {count} validated entries to research-log.yaml", file=sys.stderr)


# ── Public API ─────────────────────────────────────────────────────────────────

def process_game(game_name: str, urls: list[str]) -> dict:
    """Full pipeline: fetch URLs → clean text → return structured output.

    Args:
        game_name: Display name of the game (used as cache key).
        urls: List of URLs to fetch (max MAX_URLS_PER_GAME used).

    Returns:
        dict with "game_name" and "sources" list containing clean text per source.
    """
    phase1_fetch(game_name, urls)
    return extract_clean_text(game_name)


# ── CLI ────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Game research pipeline: fetch URLs → clean text → JSON output"
    )
    parser.add_argument("game_name", help="Name of the game to research")
    parser.add_argument(
        "--urls",
        nargs="*",
        metavar="URL",
        help="URLs to fetch (up to 3). If omitted, only cached data is used.",
    )
    parser.add_argument(
        "--log",
        metavar="SLUG",
        help="Game slug for research-log.yaml (auto-appends entries after processing)",
    )
    args = parser.parse_args()

    if not args.urls:
        print(
            "[pipeline] No --urls provided. Supply URLs discovered via WebSearch:\n"
            f'  python3 scripts/game_pipeline.py "{args.game_name}" '
            "--urls https://... https://... https://...",
            file=sys.stderr,
        )
        # Still attempt text extraction from any previously cached data
        result = extract_clean_text(args.game_name)
    else:
        result = process_game(args.game_name, args.urls)

    log_failed = False
    if args.log and result["sources"]:
        try:
            append_research_log(args.log, result["sources"])
        except (OSError, ValueError, yaml.YAMLError) as exc:
            print(f"[pipeline] Research log unchanged: {exc}", file=sys.stderr)
            log_failed = True

    print(json.dumps(result, indent=2, ensure_ascii=False))
    if log_failed:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
