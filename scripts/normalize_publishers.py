#!/usr/bin/env python3
"""Normalize publisher names across games/*.yaml.

Collapses casing/whitespace/suffix variants and obvious same-company aliases to
a single canonical string so per-publisher batching and image_manager.py counts
are reliable. Also drops the bogus "Unknown" publisher (leaving the game with no
publisher rather than a fake one).

Only the `publisher:` list lines are rewritten; all other content (comments,
field order, other fields) is left byte-for-byte intact.

Usage:
    python3 scripts/normalize_publishers.py --dry-run
    python3 scripts/normalize_publishers.py
"""

import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GAMES_DIR = os.path.join(ROOT, "games")

# Map of variant -> canonical name. Canonical of None means "drop this entry".
ALIASES = {
    # Bogus / non-publisher
    "Unknown": None,
    "unknown": None,
    # Casing / whitespace / suffix variants
    "Kosmos": "KOSMOS",
    "Iello": "IELLO",
    "Haba": "HABA",
    "Huch!": "HUCH!",
    "Abacusspiele": "ABACUSSPIELE",
    "alea": "Alea",
    "Eggertspiele": "eggertspiele",
    "nestorgames": "Nestorgames",
    "Lego": "LEGO",
    "LEGO Group": "LEGO",
    "Milton Bradley Company": "Milton Bradley",
    "Game Designers Workshop": "Game Designers' Workshop",
    "Zoch": "Zoch Verlag",
    "Spiele-Schmidt": "Schmidt Spiele",
    "Blue Orange": "Blue Orange Games",
    "Devir Games": "Devir",
    "All Play": "Allplay",
    "Goldsieber": "Goldsieber Spiele",
    "Gold Sieber Spiele": "Goldsieber Spiele",
    "Tactic": "Tactic Games",
    "Board & Dice": "Board&Dice",
    "FX Schmid": "F.X. Schmid",
    "The Op Games": "The Op",
    "Goliath": "Goliath Games",
    "Rebel": "Rebel Studio",
    "MB Spiele": "MB Games",
    "Winning Moves Games": "Winning Moves",
    "Big Potato": "Big Potato Games",
    "Foxmind": "FoxMind",
    "FoxMind Games": "FoxMind",
    "Yaquinto Games": "Yaquinto",
    "Self-published": "self-published",
    "Noris": "Noris Spiele",
    "Ice Makes": "ICE Makes",
    "Cardinal Games": "Cardinal",
    "Off The Page Games": "Off the Page Games",
    "Game Works": "GameWorks",
    "Spears Games": "Spear's Games",
    "Thundergryph Games": "ThunderGryph Games",
    "Skybound Entertainment": "Skybound Games",
    "Steffen-Spiele": "Steffen Spiele",
    "Sentosphere": "SentoSphere",
    "Philmar": "PhilMar Ltd.",
    "Ginger Fox": "Ginger Fox Games",
    "Blam!": "BLAM!",
    "Lock N Load Publishing": "Lock 'n Load Publishing",
    "Altar": "Altar Games",
    "Office Dog": "Office Dog Games",
    "Blackrock Editions": "Blackrock Games",
    "Valen Brost Game Co.": "Valen Brost Game Company",
    "spielstein": "Spielstein",
    "What Do You Meme": "What Do You Meme LLC",
    # Amigo family
    "AMIGO": "Amigo",
    "Amigo Spiele": "Amigo",
    "AMIGO Spiele": "Amigo",
    # SPI family -> "SPI"
    "Simulations Publications Inc.": "SPI",
    "Simulations Publications": "SPI",
    "Simulations Publications Inc": "SPI",
    "SPI (Simulations Publications, Inc.)": "SPI",
    "SPI (Simulations Publications Inc.)": "SPI",
    "Simulations Publications Inc (SPI)": "SPI",
    "Simulations Publications Inc. (SPI)": "SPI",
    # Catan rights holder -> US studio
    "Catan GmbH": "Catan Studio",
}


def canonical(name):
    """Return canonical name, or None if the entry should be dropped."""
    return ALIASES.get(name, name)


def strip_item(line):
    """Extract the value from a `  - value` list line, or None if not one."""
    stripped = line.strip()
    if not stripped.startswith("- "):
        return None
    val = stripped[2:].strip()
    if (val.startswith('"') and val.endswith('"')) or (
        val.startswith("'") and val.endswith("'")
    ):
        val = val[1:-1]
    return val


def needs_quotes(val):
    return val[:1] in "!&*?|>%@`\"'" or ": " in val or val.strip() != val


def process_file(path):
    with open(path) as f:
        lines = f.readlines()

    out = []
    i = 0
    changed = False
    n = len(lines)
    while i < n:
        line = lines[i]
        if line.rstrip("\n").strip() == "publisher:":
            indent = line[: len(line) - len(line.lstrip())]
            item_indent = indent + "  "
            out.append(line)
            i += 1
            # Collect the block list items
            originals = []
            while i < n and strip_item(lines[i]) is not None:
                originals.append(strip_item(lines[i]))
                i += 1
            # Canonicalize, drop Nones, dedupe preserving order
            seen = set()
            result = []
            for val in originals:
                c = canonical(val)
                if c is None:
                    changed = True
                    continue
                if c != val:
                    changed = True
                if c not in seen:
                    seen.add(c)
                    result.append(c)
                else:
                    changed = True
            for val in result:
                if needs_quotes(val):
                    out.append(f'{item_indent}- "{val}"\n')
                else:
                    out.append(f"{item_indent}- {val}\n")
            continue
        out.append(line)
        i += 1

    if changed:
        return "".join(out)
    return None


def main():
    dry = "--dry-run" in sys.argv
    changed_files = 0
    for fname in sorted(os.listdir(GAMES_DIR)):
        if not fname.endswith(".yaml"):
            continue
        path = os.path.join(GAMES_DIR, fname)
        new_content = process_file(path)
        if new_content is not None:
            changed_files += 1
            if dry:
                print(f"would update: {fname}")
            else:
                with open(path, "w") as f:
                    f.write(new_content)
    verb = "Would update" if dry else "Updated"
    print(f"\n{verb} {changed_files} file(s).")


if __name__ == "__main__":
    main()
