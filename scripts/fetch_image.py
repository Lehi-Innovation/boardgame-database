#!/usr/bin/env python3
"""Fetch a box-art image for a game, validate it, and record provenance.

Handles the bookkeeping that the manual workflow keeps getting wrong: it saves
the file under the exact `Game Name (Year).<ext>` form image_manager.py expects
and appends a provenance entry to images/sources.yaml.

Usage:
    python3 scripts/fetch_image.py SLUG --url URL --license LICENSE \\
        [--publisher NAME] [--source-page URL] [--notes TEXT] [--force]

Examples:
    python3 scripts/fetch_image.py ark-nova \\
        --url https://example.com/ark-nova-box.jpg \\
        --license publisher-press-kit --publisher "Capstone Games"

License values (see images/README.md):
    publisher-press-kit   official press/media kit
    publisher-permission  emailed/written permission from the publisher
    cc-by | cc-by-sa | cc0 | public-domain   Creative Commons / public domain
    fair-use              documented fair use (see images/FAIR_USE.md)
"""

import argparse
import datetime
import os
import io
import hashlib
import sys
import urllib.request

import yaml
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)
from scripts.image_assets import image_basename, record_provenance
GAMES_DIR = os.path.join(ROOT, "games")
IMAGES_DIR = os.path.join(ROOT, "images")
SOURCES_FILE = os.path.join(IMAGES_DIR, "sources.yaml")

MIN_DIM = 500
KNOWN_LICENSES = {
    "publisher-press-kit",
    "publisher-permission",
    "cc-by",
    "cc-by-sa",
    "cc0",
    "public-domain",
    "fair-use",
}
IMAGE_FORMATS = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp"}


def load_game(slug):
    path = os.path.join(GAMES_DIR, f"{slug}.yaml")
    if not os.path.isfile(path):
        sys.exit(f"error: no game file games/{slug}.yaml")
    with open(path) as f:
        return yaml.safe_load(f)


def decode_image(data):
    """Fully decode supported bytes; do not trust URL suffixes or HTTP headers."""
    with Image.open(io.BytesIO(data), formats=list(IMAGE_FORMATS)) as image:
        extension = IMAGE_FORMATS[image.format]
        image.load()
        return extension, image.size


def download(url):
    req = urllib.request.Request(url, headers={"User-Agent": "boardgame-db-image-fetch/1.0"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read(), resp.headers.get("Content-Type", "").split(";")[0].strip()

def slug_in_sources(slug):
    if not os.path.isfile(SOURCES_FILE):
        return False
    with open(SOURCES_FILE) as f:
        for line in f:
            if line.startswith(f"{slug}:"):
                return True
    return False



def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--url", required=True, help="direct image URL")
    ap.add_argument("--license", required=True)
    ap.add_argument("--publisher", default=None)
    ap.add_argument("--source-page", default=None, help="page the image came from (provenance)")
    ap.add_argument("--notes", default=None)
    ap.add_argument("--force", action="store_true", help="overwrite existing image/provenance")
    args = ap.parse_args()

    if args.license not in KNOWN_LICENSES:
        print(f"warning: unrecognized license {args.license!r} "
              f"(known: {', '.join(sorted(KNOWN_LICENSES))})", file=sys.stderr)

    game = load_game(args.slug)
    name, year = game.get("name", ""), game.get("year", "")
    base = image_basename(game)
    if base is None:
        sys.exit("error: game needs a known title and publication year")

    if not args.force and slug_in_sources(args.slug):
        sys.exit(f"error: {args.slug} already in sources.yaml (use --force)")

    print(f"downloading {args.url} ...")
    data, _content_type = download(args.url)
    try:
        ext, (w, h) = decode_image(data)
    except (OSError, ValueError) as error:
        sys.exit(f"error: not a decodable JPEG, PNG or WebP image: {error}")
    res = f"{w}x{h}"
    if w < MIN_DIM or h < MIN_DIM:
        sys.exit(f"error: image {w}x{h} is below the {MIN_DIM}x{MIN_DIM} minimum")

    out_path = os.path.join(IMAGES_DIR, f"{base}{ext}")
    if os.path.exists(out_path) and not args.force:
        sys.exit(f"error: {out_path} exists (use --force)")
    previous = None
    if os.path.exists(out_path):
        with open(out_path, "rb") as f:
            previous = f.read()
    with open(out_path, "wb") as f:
        f.write(data)

    pub = args.publisher
    if pub is None:
        pubs = game.get("publisher") or []
        pub = pubs[0] if pubs else None

    try:
        record_provenance(args.slug, {
            "file": f"{base}{ext}",
            "source_url": args.source_page or args.url,
            "image_url": args.url,
            "sha256": hashlib.sha256(data).hexdigest(),
            "review_status": "source_recorded_identity_unverified",
            "publisher": pub,
            "license": args.license,
            "date": datetime.date.today().isoformat(),
            "resolution": res,
            "notes": args.notes,
        }, replace=args.force)
    except Exception:
        if previous is None:
            os.unlink(out_path)
        else:
            with open(out_path, "wb") as f:
                f.write(previous)
        raise
    print(f"saved {out_path} ({res or 'size unknown'}) and recorded provenance")


if __name__ == "__main__":
    main()
