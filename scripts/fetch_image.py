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
import struct
import sys
import urllib.request

import yaml

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
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
CONTENT_TYPE_EXT = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}


def load_game(slug):
    path = os.path.join(GAMES_DIR, f"{slug}.yaml")
    if not os.path.isfile(path):
        sys.exit(f"error: no game file games/{slug}.yaml")
    with open(path) as f:
        return yaml.safe_load(f)


def image_size(data):
    """Return (width, height) for PNG/JPEG/GIF/WEBP bytes, or None."""
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        w, h = struct.unpack(">II", data[16:24])
        return w, h
    if data[:6] in (b"GIF87a", b"GIF89a"):
        w, h = struct.unpack("<HH", data[6:10])
        return w, h
    if data[:2] == b"\xff\xd8":  # JPEG
        i = 2
        while i < len(data):
            if data[i] != 0xFF:
                i += 1
                continue
            marker = data[i + 1]
            if marker in (0xD8, 0xD9) or 0xD0 <= marker <= 0xD7:
                i += 2
                continue
            seg_len = struct.unpack(">H", data[i + 2 : i + 4])[0]
            if 0xC0 <= marker <= 0xCF and marker not in (0xC4, 0xC8, 0xCC):
                h, w = struct.unpack(">HH", data[i + 5 : i + 9])
                return w, h
            i += 2 + seg_len
        return None
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        fmt = data[12:16]
        if fmt == b"VP8 ":
            w = struct.unpack("<H", data[26:28])[0] & 0x3FFF
            h = struct.unpack("<H", data[28:30])[0] & 0x3FFF
            return w, h
        if fmt == b"VP8L":
            b = data[21:25]
            bits = b[0] | (b[1] << 8) | (b[2] << 16) | (b[3] << 24)
            return (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1
        if fmt == b"VP8X":
            w = 1 + (data[24] | (data[25] << 8) | (data[26] << 16))
            h = 1 + (data[27] | (data[28] << 8) | (data[29] << 16))
            return w, h
    return None


def download(url):
    req = urllib.request.Request(url, headers={"User-Agent": "boardgame-db-image-fetch/1.0"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read(), resp.headers.get("Content-Type", "").split(";")[0].strip()


def ext_for(content_type, url):
    if content_type in CONTENT_TYPE_EXT:
        return CONTENT_TYPE_EXT[content_type]
    for ext in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
        if url.lower().split("?")[0].endswith(ext):
            return ".jpg" if ext == ".jpeg" else ext
    return None


def slug_in_sources(slug):
    if not os.path.isfile(SOURCES_FILE):
        return False
    with open(SOURCES_FILE) as f:
        for line in f:
            if line.startswith(f"{slug}:"):
                return True
    return False


def append_provenance(slug, entry):
    block = [f"\n{slug}:"]
    for k in ("file", "source_url", "publisher", "license", "date", "resolution", "notes"):
        v = entry.get(k)
        if v is None:
            block.append(f"  {k}: null")
        else:
            block.append(f'  {k}: "{v}"')
    with open(SOURCES_FILE, "a") as f:
        f.write("\n".join(block) + "\n")


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
    base = f"{name} ({year})"

    if not args.force and slug_in_sources(args.slug):
        sys.exit(f"error: {args.slug} already in sources.yaml (use --force)")

    print(f"downloading {args.url} ...")
    data, content_type = download(args.url)
    ext = ext_for(content_type, args.url)
    if ext is None:
        sys.exit(f"error: could not determine image type (content-type={content_type!r})")

    size = image_size(data)
    if size is None:
        print("warning: could not read image dimensions; saving anyway", file=sys.stderr)
        res = None
    else:
        w, h = size
        res = f"{w}x{h}"
        if w < MIN_DIM or h < MIN_DIM:
            sys.exit(f"error: image {w}x{h} is below the {MIN_DIM}x{MIN_DIM} minimum")

    out_path = os.path.join(IMAGES_DIR, f"{base}{ext}")
    if os.path.exists(out_path) and not args.force:
        sys.exit(f"error: {out_path} exists (use --force)")
    with open(out_path, "wb") as f:
        f.write(data)

    pub = args.publisher
    if pub is None:
        pubs = game.get("publisher") or []
        pub = pubs[0] if pubs else None

    append_provenance(args.slug, {
        "file": f"{base}{ext}",
        "source_url": args.source_page or args.url,
        "publisher": pub,
        "license": args.license,
        "date": datetime.date.today().isoformat(),
        "resolution": res,
        "notes": args.notes,
    })
    print(f"saved {out_path} ({res or 'size unknown'}) and recorded provenance")


if __name__ == "__main__":
    main()
