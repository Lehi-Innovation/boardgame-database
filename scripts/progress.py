#!/usr/bin/env python3
"""Show canonical edition-aware catalog coverage and the research queue."""
import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
from scripts.catalog import build_catalog


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("count", nargs="?", type=int, default=20)
    parser.add_argument("--json", action="store_true")
    for status in ("failed", "skipped", "ambiguous", "duplicate"):
        parser.add_argument("--" + status, action="store_true")
    args = parser.parse_args()
    report = build_catalog()
    if args.json:
        print(json.dumps(report, ensure_ascii=False))
        return
    print(f"Master list: {report['total']} entries ({report['csv_rows']} CSV rows)")
    print(f"Game entries: {report['game_files']} files")
    print(f"Progress: {report['researched']}/{report['total']} ({report['researched']/report['total']*100 if report['total'] else 0:.1f}%)")
    print(f"Remaining: {report['pending']}")
    print(f"Excluded: {report['excluded']} ({report['excluded_counts']})")
    print(f"Game files without catalog matches: {len(report['unmatched_game_ids'])}")
    status = next((s for s in ("failed", "skipped", "ambiguous", "duplicate") if getattr(args, s)), None)
    if status:
        entries = [g for g in report["games"] if g["status"] == ("skip" if status == "skipped" else status)]
    else:
        entries = [g for g in report["games"] if g["state"] == "pending"][:max(0, args.count)]
    for game in entries:
        print(f"  {game['name']} ({game['year'] or '?'}) [{game['match_reason']}] {game['notes']}")


if __name__ == "__main__":
    main()
