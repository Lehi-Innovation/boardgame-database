#!/usr/bin/env python3
"""
BGG full catalog scraper — incremental, 10,000 IDs per run

Sweeps BGG IDs 1–MAX_ID in batches of 100, writing boardgames and expansions
to master_list.csv. Each run processes 10,000 IDs and stops; run it again
whenever you like to continue from where it left off.

State is kept in scraper_state.json:
    last_id — highest BGG ID processed so far

Usage:
    python scripts/scrape_bgg.py          # process next 10,000 IDs
    python scripts/scrape_bgg.py --status # show progress without running

Requirements:
    pip install requests
"""

import csv
import json
import os
import sys
import time
import xml.etree.ElementTree as ET
from pathlib import Path

import requests

# ── Config ────────────────────────────────────────────────────────────────────

API_URL   = "https://boardgamegeek.com/xmlapi2/thing"
OUTPUT    = Path("master_list.csv")
STATE     = Path("scraper_state.json")

# Bearer token — register at https://boardgamegeek.com/using_the_xml_api
# Set via environment variable: export BGG_TOKEN="your_token_here"
BGG_TOKEN = os.environ.get("BGG_TOKEN", "")

BATCH     = 100        # IDs per API request
MAX_ID    = 420_000    # Highest known BGG ID
RUN_LIMIT = 10_000     # IDs to sweep per invocation
DELAY     = 0.6        # Seconds between requests (~1.6 req/s)
MAX_RETRY = 5

FIELDS = ["bgg_id", "name", "year", "type"]

# ── State ─────────────────────────────────────────────────────────────────────

def load_state() -> dict:
    if STATE.exists():
        return json.loads(STATE.read_text())
    return {"last_id": 0}


def save_state(s: dict) -> None:
    STATE.write_text(json.dumps(s, indent=2))

# ── API ───────────────────────────────────────────────────────────────────────

def fetch_batch(ids: list[int]) -> str:
    params  = {"id": ",".join(map(str, ids)), "type": "boardgame,boardgameexpansion"}
    headers = {"Authorization": f"Bearer {BGG_TOKEN}"} if BGG_TOKEN else {}
    for attempt in range(MAX_RETRY):
        try:
            r = requests.get(API_URL, params=params, headers=headers, timeout=30)
            if r.status_code == 202:
                time.sleep(3)
                continue
            r.raise_for_status()
            return r.text
        except requests.RequestException as e:
            wait = 2 ** attempt
            print(f"  Attempt {attempt + 1}/{MAX_RETRY} failed: {e} — retrying in {wait}s")
            time.sleep(wait)
    print(f"  Skipping IDs {ids[0]}–{ids[-1]} after {MAX_RETRY} failed attempts")
    return "<items/>"


def parse_batch(xml_text: str) -> list[dict]:
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return []
    rows = []
    for item in root.findall("item"):
        name_el = item.find("name[@type='primary']")
        year_el = item.find("yearpublished")
        rows.append({
            "bgg_id": item.get("id"),
            "name":   name_el.get("value") if name_el is not None else "",
            "year":   year_el.get("value") if year_el is not None else "",
            "type":   item.get("type"),
        })
    return rows

# ── Status ────────────────────────────────────────────────────────────────────

def print_status(last_id: int) -> None:
    pct       = last_id / MAX_ID * 100
    runs_left = (MAX_ID - last_id) / RUN_LIMIT
    print(f"Progress : {last_id:>7,} / {MAX_ID:,} IDs swept  ({pct:.1f}%)")
    print(f"Remaining: ~{runs_left:.0f} runs to complete at {RUN_LIMIT:,} IDs/run")

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    s = load_state()

    if not BGG_TOKEN:
        print("Error: BGG_TOKEN environment variable not set.")
        print("Register at https://boardgamegeek.com/using_the_xml_api to get a token.")
        print("Then run: export BGG_TOKEN=\"your_token_here\"")
        sys.exit(1)

    if "--status" in sys.argv:
        print_status(s["last_id"])
        return

    if s["last_id"] >= MAX_ID:
        print("Sweep complete — all IDs through MAX_ID have been processed.")
        print("Increase MAX_ID in the script if new BGG games have been added.")
        return

    start_id  = s["last_id"] + 1
    end_id    = min(start_id + RUN_LIMIT - 1, MAX_ID)
    n_batches = (end_id - start_id) // BATCH + 1

    print(f"Sweeping IDs {start_id:,}–{end_id:,}  ({n_batches} batches, ~{n_batches * DELAY / 60:.1f} min)\n")

    games_found = 0
    first_write = not OUTPUT.exists()

    with OUTPUT.open("w" if first_write else "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDS)
        if first_write:
            writer.writeheader()

        for batch_start in range(start_id, end_id + 1, BATCH):
            ids = list(range(batch_start, min(batch_start + BATCH, end_id + 1)))

            xml_text = fetch_batch(ids)
            rows     = parse_batch(xml_text)

            writer.writerows(rows)
            f.flush()

            s["last_id"] = ids[-1]
            save_state(s)

            games_found += len(rows)
            print(f"  {ids[0]:>6,}–{ids[-1]:>6,}  [{ids[-1] / MAX_ID * 100:5.1f}%]  +{len(rows):>3} games")

            time.sleep(DELAY)

    print(f"\nDone. +{games_found:,} games found this run.")
    print_status(s["last_id"])


if __name__ == "__main__":
    main()
