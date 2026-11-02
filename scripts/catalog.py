#!/usr/bin/env python3
"""Canonical, edition-aware catalog identity and coverage for CLI and SQLite/UI.

Explicit mappings win. Otherwise only unique exact names/alternate names (or
filename slugs) with compatible publication years match. Exclusions remain
visible; nomination counts are enrichment, never evidence of record identity.
"""

import csv
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
CSV_FIELDS = ["bgg_id", "name", "year", "type", "status", "notes", "yaml_id"]
EXCLUSIONS = {"skip", "failed", "ambiguous", "duplicate"}


def slugify(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def name_key(name):
    return " ".join(name.casefold().split())


def load_games(root=ROOT):
    games = {}
    for path in sorted((Path(root) / "games").glob("*.yaml")):
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            raise ValueError(f"Not a game mapping: {path}")
        games[path.stem] = data
    return games


class IdentityIndex:
    def __init__(self, games):
        self.games = games
        self.names = defaultdict(set)
        for slug, game in games.items():
            for name in [game["name"], *(game.get("alternate_names") or [])]:
                if isinstance(name, str):
                    self.names[name_key(name)].add(slug)

    def candidates(self, row):
        candidates = set(self.names.get(name_key(row["name"]), set()))
        slug = slugify(row["name"])
        if not candidates and slug in self.games:
            candidates.add(slug)
        return candidates

    def resolve(self, row):
        explicit = row.get("yaml_id", "").strip()
        if explicit:
            return (explicit, "explicit") if explicit in self.games else (None, "missing_mapping")
        if row.get("status", "").strip() in EXCLUSIONS:
            return None, "excluded"
        candidates = self.candidates(row)
        year = str(row.get("year") or "").strip()
        if year and year != "?":
            matching_year = {s for s in candidates if str(self.games[s].get("year")) == year}
            if candidates and not matching_year:
                return None, "year_conflict"
            candidates = matching_year
        if len(candidates) == 1:
            return next(iter(candidates)), "exact"
        return None, "ambiguous_identity" if candidates else "unmatched"


def build_catalog(root=ROOT, games=None):
    root = Path(root)
    games = load_games(root) if games is None else games
    index = IdentityIndex(games)
    with (root / "master_list.csv").open(encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames != CSV_FIELDS:
            raise ValueError(f"Expected catalog columns {CSV_FIELDS}")
        rows = list(reader)
    # Collapse only identical identity/status/mapping rows; retain every source
    # row number and note. Names from different years/IDs/types stay separate.
    grouped = {}
    for line, row in enumerate(rows, 2):
        if None in row or any(value is None for value in row.values()):
            raise ValueError(f"Malformed CSV row {line}")
        row = {key: value.strip() for key, value in row.items()}
        key = tuple(name_key(row[k]) if k == "name" else row[k]
                    for k in ("bgg_id", "name", "year", "type", "status", "yaml_id"))
        if key not in grouped:
            grouped[key] = dict(row, source_rows=[], all_notes=[])
        grouped[key]["source_rows"].append(line)
        if row["notes"] and row["notes"] not in grouped[key]["all_notes"]:
            grouped[key]["all_notes"].append(row["notes"])
    enrichment = defaultdict(set)
    for path in sorted((root / "sources" / "lists").glob("*.yaml")):
        data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        for game in data.get("games", []):
            if game.get("name"):
                enrichment[name_key(game["name"])].add(data.get("source", path.name))
    entries = []
    for position, row in enumerate(grouped.values(), 1):
        matched, reason = index.resolve(row)
        researched = matched is not None
        state = "researched" if researched else ("excluded" if row["status"] in EXCLUSIONS else "pending")
        sources = sorted(enrichment[name_key(row["name"])])
        warning = None
        if matched and row["year"] and str(games[matched].get("year")) != row["year"]:
            warning = "Explicit mapping has a different publication year; review the represented edition"
        candidates = [dict(id=s, name=games[s]["name"], year=games[s].get("year"), edition=games[s].get("edition"))
                      for s in sorted(index.candidates(row))] if not researched else []
        entries.append(dict(row, id=f"catalog-{position}", game_id=matched,
                            year=int(row["year"]) if row["year"].lstrip("-").isdigit() else None,
                            notes="; ".join(row["all_notes"]), sources=sources,
                            source_count=len(sources), researched=researched,
                            state=state, match_reason=reason, mapping_warning=warning,
                            match_candidates=candidates))
    entries.sort(key=lambda g: (-g["source_count"], name_key(g["name"]), g["year"] or 0))
    state_counts = Counter(entry["state"] for entry in entries)
    matched_ids = {entry["game_id"] for entry in entries if entry["game_id"]}
    return dict(total=len(entries), csv_rows=len(rows), game_files=len(games),
                researched=state_counts["researched"], pending=state_counts["pending"],
                excluded=state_counts["excluded"],
                excluded_counts=dict(Counter(g["status"] for g in entries if g["state"] == "excluded")),
                explicit_year_conflicts=sum(g["mapping_warning"] is not None for g in entries),
                unmatched_game_ids=sorted(set(games) - matched_ids), games=entries)


if __name__ == "__main__":
    print(json.dumps(build_catalog(), ensure_ascii=False))
