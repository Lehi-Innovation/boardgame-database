#!/usr/bin/env python3
"""Read-only, reproducible structural audit of the legacy game catalog.

This checks internal consistency. It does not claim that unsourced game facts are
correct; review flagged records against publisher rules or another primary source.
"""

import argparse
import csv
import hashlib
import json
import re
import sqlite3
import sys
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parent.parent
GAME_DIR = ROOT / "games"


class DuplicateKeyLoader(yaml.SafeLoader):
    def construct_mapping(self, node, deep=False):
        self.flatten_mapping(node)
        seen = set()
        for key_node, _ in node.value:
            key = self.construct_object(key_node, deep=deep)
            if key in seen:
                raise yaml.constructor.ConstructorError(
                    None, None, f"duplicate mapping key {key!r}", key_node.start_mark
                )
            seen.add(key)
        return super().construct_mapping(node, deep=deep)


def normalized_name(value):
    text = unicodedata.normalize("NFKD", str(value)).casefold()
    text = "".join(char for char in text if not unicodedata.combining(char))
    return re.sub(r"[^a-z0-9]+", "", text)


def audit():
    findings = []
    records = []

    def flag(code, file, detail, severity="review"):
        findings.append({"code": code, "severity": severity, "file": file, "detail": detail})

    for path in sorted(GAME_DIR.glob("*.yaml")):
        try:
            record = yaml.load(path.read_bytes(), Loader=DuplicateKeyLoader)
            if not isinstance(record, dict):
                flag("invalid_document", path.name, "Expected a mapping", "error")
                continue
            records.append((path, record))
        except (OSError, yaml.YAMLError) as error:
            flag("parse_error", path.name, str(error), "error")

    by_id = defaultdict(list)
    by_name = defaultdict(list)
    for path, game in records:
        by_id[str(game.get("id"))].append(path.name)
        by_name[normalized_name(game.get("name"))].append(path.name)
    for game_id, files in by_id.items():
        if len(files) > 1:
            for file in files:
                flag("duplicate_id", file, {"id": game_id, "files": files}, "error")

    schema = yaml.safe_load((ROOT / "schema.yaml").read_bytes())
    categories = set(sum(schema["categories"].values(), []))
    evokes = set(schema["evokes"]["values"])
    field_presence = Counter()
    field_empty = Counter()
    relationship_fields = ("base_game", "expansions", "compatible_with")
    list_fields = ("alternate_names", "designer", "publisher", "artist", "categories", "evokes", "possible_counts", "true_counts", "expansions", "compatible_with")

    for path, game in records:
        file = path.name
        game_id = str(game.get("id"))
        for key, value in game.items():
            field_presence[key] += 1
            if value is None or value == "" or value == []:
                field_empty[key] += 1
        if path.stem != game_id or not isinstance(game.get("id"), str):
            flag("id_filename_mismatch", file, {"id": game.get("id"), "filename_id": path.stem}, "error")
        if not isinstance(game.get("name"), str) or not game["name"].strip():
            flag("missing_name", file, None, "error")
        for field in ("length", "rules_complexity", "strategic_depth", "feel", "value", "affinity", "hotness"):
            value = game.get(field)
            if value is not None and (type(value) is not int or not 0 <= value <= 4):
                flag("invalid_rating", file, {"field": field, "value": value}, "error")
        for field in ("playtime_minutes", "min_playtime", "max_playtime", "min_age"):
            value = game.get(field)
            if value is not None and (type(value) is not int or value <= 0):
                flag("invalid_positive_number", file, {"field": field, "value": value}, "error")
        year = game.get("year")
        if year is not None and (type(year) is not int or year > 2027):
            flag("invalid_year", file, year, "error")
        if year == 0:
            flag("year_zero_placeholder", file, year)
        lo, typical, hi = (game.get(field) for field in ("min_playtime", "playtime_minutes", "max_playtime"))
        if all(type(value) is int for value in (lo, typical, hi)) and not lo <= typical <= hi:
            flag("playtime_outside_bounds", file, {"min": lo, "typical": typical, "max": hi}, "error")
        for field in list_fields:
            values = game.get(field)
            if values is not None and not isinstance(values, list):
                flag("invalid_list", file, {"field": field, "value": values}, "error")
            if isinstance(values, list) and len(values) != len(set(map(str, values))):
                flag("duplicate_list_item", file, {"field": field, "values": values}, "error")
        possible = game.get("possible_counts") or []
        preferred = game.get("true_counts") or []
        if isinstance(possible, list) and isinstance(preferred, list):
            if not set(map(str, preferred)).issubset(set(map(str, possible))):
                flag("preferred_player_count_not_supported", file, {"possible": possible, "preferred": preferred}, "error")
            for field, values in (("possible_counts", possible), ("true_counts", preferred)):
                if not values:
                    flag("missing_player_counts", file, field, "review")
                for value in values:
                    if value != "12+" and (type(value) is not int or value < 1):
                        flag("invalid_player_count", file, {"field": field, "value": value}, "error")
                    elif type(value) is int and value > 12:
                        flag("player_count_exceeds_schema", file, {"field": field, "value": value})
        values = game.get("evokes") or []
        if isinstance(values, list) and len(values) != 5:
            flag("evokes_count", file, len(values))
        for field, vocabulary in (("categories", categories), ("evokes", evokes)):
            for value in game.get(field) or []:
                if value not in vocabulary:
                    flag("out_of_vocabulary", file, {"field": field, "value": value})
        for field in relationship_fields:
            value = game.get(field)
            refs = value if isinstance(value, list) else [value] if value else []
            for ref in refs:
                if str(ref) not in by_id:
                    flag("dangling_relation", file, {"field": field, "target": ref}, "error")
                if str(ref) == game_id:
                    flag("self_relation", file, {"field": field, "target": ref}, "error")
        if not game.get("designer"):
            flag("missing_designer", file, None)
        if not game.get("publisher"):
            flag("missing_publisher", file, None)
        if year is None:
            flag("missing_year", file, None)

    for files in by_name.values():
        if len(files) > 1:
            for file in files:
                flag("same_normalized_title", file, files)

    master = list(csv.DictReader((ROOT / "master_list.csv").open(newline="", encoding="utf-8")))
    master_links = defaultdict(list)
    for line, row in enumerate(master, 2):
        if row["yaml_id"]:
            master_links[row["yaml_id"]].append((line, row))
            if row["yaml_id"] not in by_id:
                flag("master_link_missing_game", "master_list.csv", {"line": line, "yaml_id": row["yaml_id"], "title": row["name"]})
    for game_id, links in master_links.items():
        for line, row in links:
            if game_id not in by_id:
                continue
            game = next(record for path, record in records if str(record.get("id")) == game_id)
            if row["year"] and game.get("year") is not None and row["year"] != str(game["year"]):
                flag("master_year_conflict", "master_list.csv", {"line": line, "yaml_id": game_id, "master_year": row["year"], "game_year": game["year"], "master_title": row["name"]})
            if row["bgg_id"] and normalized_name(row["name"]) != normalized_name(game.get("name")):
                flag("master_title_conflict", "master_list.csv", {"line": line, "yaml_id": game_id, "bgg_id": row["bgg_id"], "master_title": row["name"], "game_title": game.get("name")})
    for game_id, links in master_links.items():
        bgg_ids = sorted({row["bgg_id"] for _, row in links if row["bgg_id"]})
        if len(bgg_ids) > 1:
            flag("multiple_bgg_ids_for_game", "master_list.csv", {"yaml_id": game_id, "bgg_ids": bgg_ids, "lines": [line for line, _ in links]})

    try:
        with sqlite3.connect(f"file:{ROOT / 'games.db'}?mode=ro", uri=True) as connection:
            cache_count = connection.execute("SELECT count(*) FROM games").fetchone()[0]
            metadata = connection.execute("SELECT source_file_count, digest_format_version, source_digest FROM build_metadata WHERE id=1").fetchone()
        if cache_count != len(records):
            flag("cache_count_mismatch", "games.db", {"cache": cache_count, "yaml": len(records)}, "error")
        digest = hashlib.sha256()
        paths = sorted(GAME_DIR.glob("*.yaml"), key=lambda path: path.name.encode("utf-8"))
        for path in paths:
            digest.update(path.name.encode("utf-8"))
            digest.update(b"\0")
            digest.update(hashlib.sha256(path.read_bytes()).digest())
        if metadata != (len(paths), 1, digest.hexdigest()):
            flag("cache_stale", "games.db", {"metadata": metadata, "yaml_file_count": len(paths), "yaml_digest": digest.hexdigest()}, "error")
    except sqlite3.Error as error:
        flag("cache_unreadable", "games.db", str(error), "error")

    try:
        yaml.safe_load((ROOT / "sources/research-log.yaml").read_bytes())
    except yaml.YAMLError as error:
        flag("research_log_parse_error", "sources/research-log.yaml", str(error), "error")

    return {
        "scope": {"game_files": len(list(GAME_DIR.glob("*.yaml"))), "parsed_games": len(records), "master_rows": len(master)},
        "field_presence": dict(sorted(field_presence.items())),
        "field_null_or_empty": dict(sorted(field_empty.items())),
        "counts": dict(sorted(Counter(finding["code"] for finding in findings).items())),
        "findings": findings,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, help="Write detailed JSON to this path")
    args = parser.parse_args()
    report = audit()
    if args.output:
        args.output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({"scope": report["scope"], "counts": report["counts"]}, indent=2))


if __name__ == "__main__":
    main()
