#!/usr/bin/env python3
"""Read-only schema, identity, catalog-mapping, and provenance checks.

Use --games FILE... to check selected records, --only log for provenance only,
or no arguments for the full audit. JSON output is suitable for follow-up tools.
No inferred name/edition matches or catalog edits are made here.
"""

import argparse
import csv
import json
import sys
from collections import Counter
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.research_log import SLUG_PATTERN, read_log
from scripts.yaml_utils import load_yaml

CSV_FIELDS = ["bgg_id", "name", "year", "type", "status", "notes", "yaml_id"]
EXCLUSIONS = {"skip", "failed", "ambiguous", "duplicate"}


def issue(path, field, code, message, severity="error"):
    return dict(path=str(path), field=field, code=code, message=message, severity=severity)


def validate_game(game, path, schema):
    """Check current schema rules without requiring optional legacy fields."""
    path = Path(path)
    issues = []

    def add(field, code, message):
        issues.append(issue(path, field, code, message))

    if not isinstance(game, dict):
        return [issue(path, "", "record_type", "Game record must be a mapping")]
    slug = game.get("id")
    if not isinstance(slug, str) or slug != path.stem:
        add("id", "record_id", f"Expected string ID {path.stem!r}; got {slug!r}")
    elif not SLUG_PATTERN.fullmatch(slug) or slug != slug.lower():
        add("id", "record_id", "ID must use lowercase letters, numbers, and single hyphens")
    if not isinstance(game.get("name"), str) or not game["name"].strip():
        add("name", "record_name", "Name must be a nonempty string")
    for field, definition in schema.items():
        values = definition.get("values") if isinstance(definition, dict) else None
        if isinstance(values, dict) and all(type(key) is int for key in values):
            value = game.get(field)
            if value is not None and (type(value) is not int or value not in values):
                add(field, "rating", f"Expected null or one of {list(values)}; got {value!r}")

    arrays = {}
    for field, default in schema["template"].items():
        if isinstance(default, list):
            value = game.get(field, [])
            if not isinstance(value, list):
                add(field, "list_type", "Expected a list")
                value = []
            arrays[field] = value
            if field not in ("possible_counts", "true_counts", "upgrades"):
                if any(not isinstance(item, str) or not item.strip() for item in value):
                    add(field, "list_value", "List values must be nonempty strings")

    allowed_categories = {value for group in schema["categories"].values() for value in group}
    for value in arrays["categories"]:
        if isinstance(value, str) and value not in allowed_categories:
            add("categories", "category", f"Unknown schema category: {value!r}")
    evokes = arrays["evokes"]
    if len(evokes) != 5 or len({str(value) for value in evokes}) != 5:
        add("evokes", "evokes_count", "Expected five distinct evokes values")
    for value in evokes:
        if isinstance(value, str) and value not in schema["evokes"]["values"]:
            add("evokes", "evoke", f"Unknown schema evokes value: {value!r}")
    allowed_counts = schema["player_counts"]["possible_values"]
    for field in ("possible_counts", "true_counts"):
        for value in arrays[field]:
            if type(value) not in (int, str) or value not in allowed_counts:
                add(field, "player_count", f"Unsupported player count: {value!r}")
    for value in arrays["true_counts"]:
        if value not in arrays["possible_counts"]:
            add("true_counts", "recommended_count", f"Recommended count {value!r} is not supported by possible_counts")
    for field in ("year", "playtime_minutes", "min_playtime", "max_playtime", "min_age"):
        value = game.get(field)
        if value is not None and (type(value) is not int or (field != "year" and value < 0)):
            add(field, "number", "Expected null or an integer (nonnegative for time/age)")
    low, high = game.get("min_playtime"), game.get("max_playtime")
    if type(low) is int and type(high) is int and low > high:
        add("min_playtime", "playtime_range", "Minimum playtime exceeds maximum playtime")
    if "description" in game and not isinstance(game["description"], str):
        add("description", "description_type", "Description must be a string")
    return issues


def validate_mappings(path, slugs):
    """Check explicit CSV references; name/edition reconciliation is separate."""
    issues = []
    with Path(path).open(encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames != CSV_FIELDS:
            issues.append(issue(path, "header", "csv_header", f"Expected columns {CSV_FIELDS}; got {reader.fieldnames}"))
        for line, row in enumerate(reader, 2):
            if None in row or any(value is None for value in row.values()):
                issues.append(issue(path, f"row {line}", "csv_row", "Row has missing or extra columns"))
                continue
            name = (row.get("name") or "").strip()
            if not name:
                issues.append(issue(path, f"row {line}", "csv_name", "Catalog name is empty"))
            status = row.get("status", "").strip()
            if status and status not in EXCLUSIONS:
                issues.append(issue(path, f"row {line}.status", "csv_status", f"Unsupported status: {status!r}"))
            slug = row.get("yaml_id", "").strip()
            if slug and slug not in slugs:
                issues.append(issue(path, f"row {line}.yaml_id", "csv_mapping", f"No game file for explicit mapping {slug!r}"))
    return issues


def audit(root=ROOT, games=None, only=None):
    root = Path(root)
    issues = []
    checked = Counter()
    slugs = {path.stem for path in (root / "games").glob("*.yaml")}
    if only != "log":
        schema = load_yaml((root / "schema.yaml").read_text(encoding="utf-8"))
        paths = sorted((root / "games").glob("*.yaml")) if games is None else [Path(p) for p in games]
        for path in paths:
            checked["games"] += 1
            try:
                game = load_yaml(path.read_text(encoding="utf-8"))
                issues.extend(validate_game(game, path, schema))
            except (OSError, ValueError, yaml.YAMLError) as exc:
                issues.append(issue(path, "", "game_yaml", str(exc)))
        if games is None:
            issues.extend(validate_mappings(root / "master_list.csv", slugs))
            checked["catalogs"] = 1
    if games is None:
        path = root / "sources" / "research-log.yaml"
        try:
            entries = read_log(path.read_text(encoding="utf-8"))
            checked["log_entries"] = len(entries)
            # Retain historical slugs. Missing references need review, not guesses.
            for slug in sorted({entry["game_id"] for entry in entries} - slugs):
                issues.append(issue(path, "game_id", "historical_log_id", f"No current game file for historical slug {slug!r}", "warning"))
        except (OSError, ValueError, yaml.YAMLError) as exc:
            issues.append(issue(path, "", "research_log", str(exc)))
    errors = sum(item["severity"] == "error" for item in issues)
    return dict(checked=dict(checked), errors=errors, warnings=len(issues) - errors, issues=issues)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT, help="Repository root (for fixture audits)")
    scope = parser.add_mutually_exclusive_group()
    scope.add_argument("--games", nargs="+", type=Path, metavar="FILE", help="Check only these YAML records")
    scope.add_argument("--only", choices=["log"], help="Check only research-log structure and historical references")
    parser.add_argument("--json", action="store_true", help="Print the complete machine-readable report")
    args = parser.parse_args(argv)
    try:
        report = audit(args.root, games=args.games, only=args.only)
    except (OSError, ValueError, yaml.YAMLError) as exc:
        report = dict(checked={}, errors=1, warnings=0, issues=[issue(args.root, "", "audit_input", str(exc))])
    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        for item in report["issues"]:
            print(f"{item['severity'].upper()} {item['path']} [{item['field'] or item['code']}]: {item['message']}")
        print(f"Checked {report['checked']}; {report['errors']} errors, {report['warnings']} warnings")
    return 1 if report["errors"] else 0


if __name__ == "__main__":
    sys.exit(main())
