#!/usr/bin/env python3
"""Preview reviewed structural/tag repairs; --apply writes targeted text edits.

This is the 2026-11-01 maintenance migration, not factual game research. Owner
ratings, play history, descriptions, exact player counts, and comments survive.
JSON output records each field's before/after value for review.
"""

import argparse
import json

import yaml

from scripts.validate_catalog import ROOT, validate_game
from scripts.yaml_utils import load_yaml


CATEGORY_ALIASES = {
    "Push Your Luck": "Press Your Luck", "Race": "Racing",
    "Solo/Solitaire": "Solo", "Diplomacy": "Negotiation",
    "Adventure (Fantasy)": "Adventure", "Dragons in theme (Fantasy)": "Fantasy",
}
# These describe feelings or repeat the record's existing experience description,
# rather than a mechanic/style/theme. Their original wording remains in git.
MISPLACED_CATEGORIES = {"Lucky", "Unique", "Discovery", "Strategy", "Competitive"}
EVOKE_ALIASES = {
    "Bluffing": "Persuasion", "Deception": "Persuasion", "Rival": "Rivalry",
    "Partnership": "Connection", "Chaos": "Unique", "Surprise": "Unique",
}
# Provisional experience estimates based on the existing record descriptions.
# Explicit per-game choices avoid replacing one invalid tag with a duplicate.
EVOKE_REPAIRS = {
    "bendomino": {"Puzzle Solving": "Complete"},
    "framework": {"Puzzle Solving": "Masterful"},
    "get-on-board-new-york-and-london": {"Puzzle Solving": "Progress"},
    "horseless-carriage": {"Puzzle Solving": "Complete"},
    "dawn-of-the-dead": {"Survival": "Powerful"},
    "last-battle-twilight-2000": {"Survival": "Dread"},
    "last-frontier-the-vesuvius-incident": {"Survival": "Progress"},
    "lost-patrol": {"Survival": "Discovery"},
    "dungeons-and-dragons-the-fantasy-adventure-board-game": {"Adventure": "Wonder"},
    "heroica-fortaan": {"Adventure": "Progress"},
    "king-arthurs-knights": {"Adventure": "Lucky"},
    "sea-hawks": {"Adventure": "Wonder"},
    "star-trek-the-adventure-game": {"Adventure": "Wonder"},
    "wide-world": {"Adventure": "Progress"},
    "post-and-pair": {"Bluffing": "Clever"},
    "transylvania": {"Horror": "Mystery"},
}


def repair_text(text, slug):
    """Change only reviewed YAML tokens/lines, preserving unrelated bytes."""
    original = load_yaml(text)
    root = yaml.compose(text)
    nodes = {key.value: value for key, value in root.value}
    edits = []

    def replace(node, value):
        edits.append((node.start_mark.index, node.end_mark.index,
                      json.dumps(value, ensure_ascii=False)))

    if not isinstance(original.get("id"), str):
        replace(nodes["id"], slug)
    if "publisher" in nodes and original.get("publisher") is None:
        # Empty YAML null nodes have zero width, immediately after the colon.
        node = nodes["publisher"]
        edits.append((node.start_mark.index, node.end_mark.index, " []"))
    if isinstance(original.get("alternate_names"), list):
        for node, value in zip(nodes["alternate_names"].value, original["alternate_names"]):
            if isinstance(value, dict):
                # An unquoted colon converted this literal title into a mapping.
                raw = text[node.start_mark.index:node.end_mark.index]
                title = raw.rstrip()
                edits.append((node.start_mark.index, node.start_mark.index + len(title),
                              json.dumps(title, ensure_ascii=False)))
    for node in nodes.get("categories", yaml.SequenceNode("seq", [])).value:
        if node.value in MISPLACED_CATEGORIES:
            start = text.rfind("\n", 0, node.start_mark.index) + 1
            end = text.find("\n", node.end_mark.index)
            edits.append((start, len(text) if end < 0 else end + 1, ""))
        elif node.value in CATEGORY_ALIASES:
            replace(node, CATEGORY_ALIASES[node.value])
    seen = set()
    for node in nodes["evokes"].value:
        value = EVOKE_REPAIRS.get(slug, {}).get(node.value, EVOKE_ALIASES.get(node.value, node.value))
        if value in seen and slug in {"jurassic-snack", "tickle-bee"}:
            value = {"jurassic-snack": "Rivalry", "tickle-bee": "Complete"}[slug]
        if value != node.value:
            replace(node, value)
        seen.add(value)
    for start, end, replacement in sorted(edits, reverse=True):
        text = text[:start] + replacement + text[end:]
    changed = load_yaml(text)
    for field in ("affinity", "hotness", "plays_tracked", "possible_counts", "true_counts", "description"):
        if original.get(field) != changed.get(field):
            raise ValueError(f"Protected field changed: {slug}.{field}")
    changes = {key: {"before": original.get(key), "after": changed.get(key)}
               for key in original if original.get(key) != changed.get(key)}
    return text, changes


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    schema = load_yaml((ROOT / "schema.yaml").read_text())
    plans = []
    for path in sorted((ROOT / "games").glob("*.yaml")):
        original = path.read_text()
        updated, changes = repair_text(original, path.stem)
        issues = validate_game(load_yaml(updated), path, schema)
        if issues:
            raise ValueError(f"Unresolved issues for {path}: {issues}")
        if updated != original:
            plans.append((path, updated, changes))
    # Validate the whole plan before writing any record.
    if args.apply:
        for path, updated, changes in plans:
            path.write_text(updated)
    print(json.dumps({"applied": args.apply, "records": len(plans),
                      "changes": {path.stem: changes for path, _, changes in plans}},
                     indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
