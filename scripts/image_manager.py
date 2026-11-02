#!/usr/bin/env python3
"""Image management tool for the board game database.

Usage:
    python3 scripts/image_manager.py                  # overall progress
    python3 scripts/image_manager.py publishers        # games grouped by publisher
    python3 scripts/image_manager.py publisher NAME    # games for one publisher
    python3 scripts/image_manager.py missing           # list games missing images
    python3 scripts/image_manager.py check             # validate image files
"""

import os
import sys

import yaml

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)
from scripts.image_assets import find_image, image_basename
GAMES_DIR = os.path.join(ROOT, "games")
IMAGES_DIR = os.path.join(ROOT, "images")
PUBLISHERS_FILE = os.path.join(ROOT, "publishers.yaml")
SOURCES_FILE = os.path.join(IMAGES_DIR, "sources.yaml")


def load_games():
    """Load all game YAML files."""
    games = []
    for fname in sorted(os.listdir(GAMES_DIR)):
        if not fname.endswith(".yaml"):
            continue
        with open(os.path.join(GAMES_DIR, fname)) as f:
            game = yaml.safe_load(f)
        if game:
            games.append(game)
    return games


def load_publishers():
    """Load publisher directory."""
    if not os.path.exists(PUBLISHERS_FILE):
        return {}
    with open(PUBLISHERS_FILE) as f:
        return yaml.safe_load(f) or {}


def get_existing_images():
    """Get set of image filenames in images/ folder."""
    images = set()
    for fname in os.listdir(IMAGES_DIR):
        if fname.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
            images.add(fname)
    return images


def expected_filename(game):
    return image_basename(game)


def cmd_progress(games, existing_images):
    """Show overall image progress."""
    have = 0
    missing = 0
    for g in games:
        if find_image(g, existing_images):
            have += 1
        else:
            missing += 1

    total = len(games)
    pct = have / total * 100 if total else 0
    print(f"Image Progress: {have}/{total} ({pct:.1f}%)")
    print(f"  Have:    {have}")
    print(f"  Missing: {missing}")

    # Publisher coverage summary
    pub_stats = {}
    for g in games:
        for pub in g.get("publisher", []):
            if pub not in pub_stats:
                pub_stats[pub] = {"have": 0, "missing": 0}
            if find_image(g, existing_images):
                pub_stats[pub]["have"] += 1
            else:
                pub_stats[pub]["missing"] += 1

    # Sort by most missing images
    ranked = sorted(pub_stats.items(), key=lambda x: x[1]["missing"], reverse=True)

    print(f"\nTop publishers by missing images:")
    print(f"  {'Publisher':<35} {'Have':>5} {'Miss':>5} {'Total':>5}")
    print(f"  {'-'*35} {'-'*5} {'-'*5} {'-'*5}")
    for pub, stats in ranked[:20]:
        total = stats["have"] + stats["missing"]
        print(f"  {pub:<35} {stats['have']:>5} {stats['missing']:>5} {total:>5}")


def cmd_publishers(games, existing_images, publishers):
    """Show games grouped by publisher with image status."""
    # Group games by publisher
    by_pub = {}
    for g in games:
        for pub in g.get("publisher", []):
            by_pub.setdefault(pub, []).append(g)

    # Sort publishers by game count (descending)
    for pub, pub_games in sorted(by_pub.items(), key=lambda x: len(x[1]), reverse=True):
        have = sum(1 for g in pub_games if find_image(g, existing_images))
        total = len(pub_games)

        # Get publisher info
        pub_info = publishers.get(pub, {})
        status = pub_info.get("status", "unknown")
        press_url = pub_info.get("press_url")
        parent = pub_info.get("parent")

        status_icon = {
            "not_contacted": " ",
            "contacted": "~",
            "approved": "+",
            "declined": "x",
            "unknown": "?",
        }.get(status, "?")

        parent_note = f" (via {parent})" if parent else ""
        url_note = f"  {press_url}" if press_url else ""

        print(f"\n[{status_icon}] {pub}{parent_note} — {have}/{total} images")
        if url_note:
            print(f"    Press: {press_url}")

        for g in sorted(pub_games, key=lambda x: x.get("name", "")):
            img = find_image(g, existing_images)
            icon = "x" if img else " "
            print(f"    [{icon}] {g['name']} ({g.get('year', '?')})")


def cmd_publisher(games, existing_images, publishers, name):
    """Show details for a single publisher."""
    pub_info = publishers.get(name, {})
    pub_games = [g for g in games if name in g.get("publisher", [])]

    if not pub_games:
        print(f"No games found for publisher: {name}")
        # Suggest close matches
        all_pubs = set()
        for g in games:
            for p in g.get("publisher", []):
                all_pubs.add(p)
        matches = [p for p in all_pubs if name.lower() in p.lower()]
        if matches:
            print(f"Did you mean: {', '.join(matches)}")
        return

    have = sum(1 for g in pub_games if find_image(g, existing_images))

    print(f"Publisher: {name}")
    print(f"Images: {have}/{len(pub_games)}")

    if pub_info:
        if pub_info.get("press_url"):
            print(f"Press URL: {pub_info['press_url']}")
        if pub_info.get("contact"):
            print(f"Contact: {pub_info['contact']}")
        if pub_info.get("parent"):
            print(f"Parent: {pub_info['parent']}")
        if pub_info.get("notes"):
            print(f"Notes: {pub_info['notes'].strip()}")
        print(f"Status: {pub_info.get('status', 'unknown')}")

    print(f"\nGames:")
    for g in sorted(pub_games, key=lambda x: x.get("name", "")):
        img = find_image(g, existing_images)
        icon = "x" if img else " "
        expected = expected_filename(g)
        print(f"  [{icon}] {expected}")


def cmd_missing(games, existing_images):
    """List all games missing images, sorted by name."""
    missing = []
    for g in games:
        if not find_image(g, existing_images):
            missing.append(g)

    print(f"Games missing images: {len(missing)}\n")
    for g in sorted(missing, key=lambda x: x.get("name", "")):
        pubs = ", ".join(g.get("publisher", ["unknown"]))
        print(f"  {g['name']} ({g.get('year', '?')}) — {pubs}")


def cmd_check(games, existing_images):
    """Validate image files against game database."""
    issues = []

    # Check for images that don't match any game
    matched_files = {img for img in existing_images if any(find_image(g, [img]) for g in games)}

    for img in sorted(existing_images):
        if img not in matched_files:
            issues.append(f"  Unmatched image: {img}")

    # Check for duplicate images (same game, different extensions)
    seen = {}
    for g in games:
        matches = sorted(img for img in existing_images if find_image(g, [img]))
        if len(matches) > 1:
            issues.append(f"  Duplicate images for {g['name']}: {', '.join(matches)}")

    if issues:
        print(f"Found {len(issues)} issue(s):\n")
        for issue in issues:
            print(issue)
    else:
        print("All image filenames match current game records.")
    with open(SOURCES_FILE) as handle:
        sources = yaml.safe_load(handle) or {}
    tracked = {entry.get("file") for entry in sources.values() if isinstance(entry, dict)}
    for img in sorted(existing_images - tracked):
        print(f"Missing provenance inventory: {img}")
    unverified = sum(not entry.get("source_url") or not entry.get("license") for entry in sources.values())
    print(f"Image origin/permission evidence incomplete: {unverified} entries. Filename checks do not verify identity or reuse rights.")


def main():
    games = load_games()
    existing_images = get_existing_images()
    publishers = load_publishers()

    if len(sys.argv) < 2:
        cmd_progress(games, existing_images)
        return

    cmd = sys.argv[1]

    if cmd == "publishers":
        cmd_publishers(games, existing_images, publishers)
    elif cmd == "publisher":
        if len(sys.argv) < 3:
            print("Usage: image_manager.py publisher NAME")
            sys.exit(1)
        name = " ".join(sys.argv[2:])
        cmd_publisher(games, existing_images, publishers, name)
    elif cmd == "missing":
        cmd_missing(games, existing_images)
    elif cmd == "check":
        cmd_check(games, existing_images)
    else:
        print(f"Unknown command: {cmd}")
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main()
