#!/usr/bin/env python3
"""
Wikidata board game scraper

Queries Wikidata's public SPARQL endpoint for board games. No authentication
required. Each run fetches one page of 10,000 results and appends to
master_list.csv. Run again to get the next page.

State tracked in wikidata_state.json:
    offset  — number of rows already fetched
    done    — true once a page comes back with fewer than PAGE_SIZE results

Usage:
    python scripts/scrape_wikidata.py           # fetch next 10,000 games
    python scripts/scrape_wikidata.py --status  # show progress without fetching

Requirements:
    pip install requests
"""

import argparse
import csv
import os
import tempfile
import json
import sys
from pathlib import Path

import requests

# ── Config ────────────────────────────────────────────────────────────────────

ENDPOINT  = "https://query.wikidata.org/sparql"
ROOT = Path(__file__).resolve().parent.parent
OUTPUT    = ROOT / "master_list.csv"
STATE     = ROOT / "wikidata_state.json"
PAGE_SIZE = 10_000
FIELDS = ["bgg_id", "name", "year", "type", "status", "notes", "yaml_id"]

# Wikidata Q131436 = board game
# P577  = publication date
# P2339 = BoardGameGeek ID
QUERY = """\
SELECT DISTINCT ?game ?gameLabel ?date ?bggId WHERE {{
  ?game wdt:P31 wd:Q131436 .
  OPTIONAL {{ ?game wdt:P577 ?date }}
  OPTIONAL {{ ?game wdt:P2339 ?bggId }}
  SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en" . }}
}}
ORDER BY ?game ?date ?bggId
LIMIT {limit}
OFFSET {offset}
"""

HEADERS = {
    # Wikidata asks that automated tools identify themselves
    "User-Agent": "BoardGameDatabase/1.0 (personal collection project)",
    "Accept": "application/sparql-results+json",
}

# ── State ─────────────────────────────────────────────────────────────────────

def load_state() -> dict:
    if STATE.exists():
        return json.loads(STATE.read_text())
    return {"offset": 0, "done": False}


def save_state(s: dict) -> None:
    atomic_write(STATE, json.dumps(s, indent=2) + "\n")

# ── Fetch & parse ─────────────────────────────────────────────────────────────

def fetch_page(offset: int):
    query = QUERY.format(limit=PAGE_SIZE, offset=offset)
    r = requests.get(
        ENDPOINT,
        params={"query": query, "format": "json"},
        headers=HEADERS,
        timeout=90,
    )
    r.raise_for_status()

    rows = []
    seen = set()  # Preserve different publication years for same-title editions.

    bindings = r.json()["results"]["bindings"]
    for b in bindings:
        name   = b.get("gameLabel", {}).get("value", "")
        bgg_id = b.get("bggId",     {}).get("value", "")
        date   = b.get("date",      {}).get("value", "")

        # Skip entries where Wikidata has no English label (shows as Q-number)
        if not name or (name.startswith("Q") and name[1:].isdigit()):
            continue

        # Extract year from ISO date string ("2019-01-01T00:00:00Z" → "2019")
        year = date[:4] if date else ""

        key = (name, bgg_id, year)
        if key in seen:
            continue
        seen.add(key)

        rows.append({
            "bgg_id": bgg_id,
            "name":   name,
            "year":   year,
            "type":   "boardgame",
        })

    return rows, len(bindings)

# ── Status ────────────────────────────────────────────────────────────────────

def print_status(s: dict) -> None:
    if s["done"]:
        print(f"Complete. {s['offset']:,} total rows fetched — all pages done.")
    else:
        print(f"Progress: {s['offset']:,} rows fetched so far.")
        print(f"Next run will fetch rows {s['offset']:,}–{s['offset'] + PAGE_SIZE:,}.")

# ── Main ──────────────────────────────────────────────────────────────────────

def atomic_write(path, content):
    fd, temporary = tempfile.mkstemp(prefix="." + path.name, dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="") as handle:
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def merge_rows(existing, incoming):
    """Preserve editorial columns and make page replay idempotent."""
    result = list(existing)
    ids = {r["bgg_id"] for r in existing if r["bgg_id"]}
    def key(r):
        return (r["name"].strip().casefold(), r.get("year", ""), r.get("type", "boardgame"))
    identities = {key(r) for r in existing}
    for row in incoming:
        if (row["bgg_id"] and row["bgg_id"] in ids) or key(row) in identities:
            continue
        result.append({field: row.get(field, "") for field in FIELDS})
        identities.add(key(row))
        if row["bgg_id"]:
            ids.add(row["bgg_id"])
    return result


def import_page(state, rows, raw_count, output=OUTPUT, state_path=STATE):
    import io
    existing = []
    if output.exists():
        with output.open(encoding="utf-8", newline="") as handle:
            reader = csv.DictReader(handle)
            if reader.fieldnames != FIELDS:
                raise ValueError(f"Refusing to change catalog schema: {reader.fieldnames}")
            existing = list(reader)
            if any(None in row or any(v is None for v in row.values()) for row in existing):
                raise ValueError("Malformed existing catalog row")
    merged = merge_rows(existing, rows)
    buffer = io.StringIO(newline="")
    writer = csv.DictWriter(buffer, fieldnames=FIELDS)
    writer.writeheader()
    writer.writerows(merged)
    # Commit CSV first: a failed state write safely replays this page next run.
    atomic_write(output, buffer.getvalue())
    updated = dict(state, offset=state["offset"] + raw_count, done=raw_count < PAGE_SIZE)
    atomic_write(state_path, json.dumps(updated, indent=2) + "\n")
    return len(merged) - len(existing), updated


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--status", action="store_true")
    parser.add_argument("--restart", action="store_true", help="Replay from offset zero; existing catalog rows are retained")
    args = parser.parse_args()
    state = {"offset": 0, "done": False} if args.restart else load_state()
    if args.status:
        print_status(state)
        return
    if state["done"]:
        print("All pages marked fetched. Use --restart to safely replay old pagination.")
        return
    rows, raw_count = fetch_page(state["offset"])
    added, updated = import_page(state, rows, raw_count)
    print(f"Fetched {raw_count} raw bindings; added {added} catalog rows. Offset {updated['offset']}; done={updated['done']}")


if __name__ == "__main__":
    main()
