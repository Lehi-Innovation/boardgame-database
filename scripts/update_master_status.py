#!/usr/bin/env python3
"""Update master_list.csv rows with status, notes, and yaml_id.

Single update:
    python3 scripts/update_master_status.py "1776" --yaml-id 1776-the-game-of-the-american-revolutionary-war
    python3 scripts/update_master_status.py "Andada" --status failed --notes "No sources found"

Batch from JSON:
    python3 scripts/update_master_status.py --from-results results.json

Backfill yaml_id by matching YAML names against master list:
    python3 scripts/update_master_status.py --backfill
    python3 scripts/update_master_status.py --backfill --dry-run
"""

import argparse
import csv
import io
import tempfile
import json
import os
import sys


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)
MASTER_CSV = os.path.join(ROOT, "master_list.csv")
GAMES_DIR = os.path.join(ROOT, "games")
FIELDNAMES = ["bgg_id", "name", "year", "type", "status", "notes", "yaml_id"]


def read_csv():
    """Read master_list.csv and return list of dicts."""
    rows = []
    with open(MASTER_CSV) as f:
        for row in csv.DictReader(f):
            # Ensure new columns exist
            for col in ("status", "notes", "yaml_id"):
                row.setdefault(col, "")
                if row[col] is None:
                    row[col] = ""
            rows.append(row)
    return rows


def write_csv(rows):
    """Write rows back to master_list.csv."""
    buffer = io.StringIO(newline="")
    writer = csv.DictWriter(buffer, fieldnames=FIELDNAMES)
    writer.writeheader()
    writer.writerows(rows)
    fd, temporary = tempfile.mkstemp(prefix=".master-list-", suffix=".csv", dir=os.path.dirname(MASTER_CSV))
    try:
        with os.fdopen(fd, "w", newline="", encoding="utf-8") as handle:
            handle.write(buffer.getvalue())
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, MASTER_CSV)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def update_row(rows, name, status=None, notes=None, yaml_id=None, year=None, bgg_id=None):
    """Update exactly one edition; never silently choose the first same-name row."""
    target = name.casefold().strip()
    matches = [row for row in rows if row["name"].casefold().strip() == target
               and (year is None or row.get("year", "") == str(year))
               and (bgg_id is None or row.get("bgg_id", "") == str(bgg_id))]
    if not matches:
        return False
    if len(matches) > 1:
        raise ValueError(f"Multiple catalog rows named {name!r}; supply year/bgg_id to select one edition")
    if status is not None and status not in {"", "skip", "failed", "ambiguous", "duplicate"}:
        raise ValueError(f"Unsupported status: {status}")
    row = matches[0]
    for field, value in (("status", status), ("notes", notes), ("yaml_id", yaml_id)):
        if value is not None:
            row[field] = value
    return True


def backfill(dry_run=False):
    """Persist unique edition-aware matches; never infer from subtitle prefixes."""
    from scripts.catalog import IdentityIndex, load_games
    rows = read_csv()
    index = IdentityIndex(load_games())
    updated = 0
    for row in rows:
        if row.get("yaml_id", "").strip():
            continue
        matched, reason = index.resolve(row)
        if matched:
            print(f"  {'Would set' if dry_run else 'Set'}: {row['name']} ({row['year']}) → {matched}")
            if not dry_run:
                row["yaml_id"] = matched
            updated += 1
    if not dry_run and updated:
        write_csv(rows)
    return updated


def main():
    parser = argparse.ArgumentParser(description="Update master_list.csv status fields")
    parser.add_argument("name", nargs="?", help="Game name to update")
    parser.add_argument("--year", help="Select the represented publication year")
    parser.add_argument("--bgg-id", help="Select the discovery-source identifier")
    parser.add_argument("--status", help="Set status (skip, failed, ambiguous, duplicate)")
    parser.add_argument("--notes", help="Set notes")
    parser.add_argument("--yaml-id", help="Set yaml_id (slug of the YAML file)")
    parser.add_argument("--from-results", help="Batch update from JSON results file")
    parser.add_argument("--backfill", action="store_true", help="Auto-populate yaml_id from YAML names")
    parser.add_argument("--dry-run", action="store_true", help="Show what would change without writing")
    args = parser.parse_args()

    if args.backfill:
        count = backfill(dry_run=args.dry_run)
        label = "Would update" if args.dry_run else "Updated"
        print(f"{label} {count} entries")
        return

    if args.from_results:
        with open(args.from_results) as f:
            results = json.load(f)
        rows = read_csv()
        updated = 0
        not_found = []
        for entry in results:
            name = entry.get("name", "")
            status = entry.get("status")
            # "done" status means clear the status field (it's a normal completed entry)
            if status == "done":
                status = ""
            notes = entry.get("notes")
            yaml_id = entry.get("yaml_id")
            if update_row(rows, name, status=status, notes=notes, yaml_id=yaml_id, year=entry.get("year"), bgg_id=entry.get("bgg_id")):
                updated += 1
            else:
                not_found.append(name)
        if not args.dry_run:
            write_csv(rows)
        print(f"Updated {updated}/{len(results)} entries")
        if not_found:
            print(f"Not found in master list: {', '.join(not_found)}")
        return

    if not args.name:
        parser.print_help()
        sys.exit(1)

    rows = read_csv()
    if update_row(rows, args.name, status=args.status, notes=args.notes, yaml_id=args.yaml_id, year=args.year, bgg_id=args.bgg_id):
        if not args.dry_run:
            write_csv(rows)
            print(f"Updated '{args.name}'")
        else:
            print(f"Would update '{args.name}'")
    else:
        print(f"'{args.name}' not found in master_list.csv", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    try:
        main()
    except ValueError as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
