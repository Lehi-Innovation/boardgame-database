"""Shared image naming/provenance operations. Uploads call this writer via stdin."""
import argparse
import fcntl
import json
import os
import re
import sys
import tempfile
from functools import lru_cache
from pathlib import Path

import yaml

from scripts.yaml_utils import load_yaml

ROOT = Path(__file__).resolve().parent.parent
EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def image_basename(game):
    if not game.get("name") or game.get("year") is None:
        return None
    return re.sub(r"[/\\\x00-\x1f\x7f]", "_", f"{game['name']} ({game['year']})")


def legacy_basename(game):
    base = image_basename(game)
    return re.sub(r"[^a-zA-Z0-9\s().-]", "_", base) if base else None


@lru_cache(maxsize=1)
def _image_provenance(path, version):
    return load_yaml(Path(path).read_text()) or {}


def find_image(game, files, sources_path=ROOT / "images" / "sources.yaml"):
    if game.get('id') and sources_path.exists():
        stat = sources_path.stat()
        sources = _image_provenance(str(sources_path), (stat.st_ino, stat.st_size, stat.st_mtime_ns))
        recorded = sources.get(game['id'], {}).get('file')
        if recorded and Path(recorded).name == recorded and Path(recorded).suffix.lower() in EXTENSIONS and recorded in files:
            return recorded
    images = {Path(f).stem.lower(): f for f in sorted(files)
              if Path(f).suffix.lower() in EXTENSIONS}
    for base in (image_basename(game), legacy_basename(game)):
        if base and base.lower() in images:
            return images[base.lower()]
    return None


def record_provenance(slug, entry, root=ROOT, replace=False):
    if not re.fullmatch(r"[^/\\]+", slug) or not (root / "games" / f"{slug}.yaml").is_file():
        raise ValueError("Unknown game ID")
    filename = entry.get("file", "")
    if Path(filename).name != filename or Path(filename).suffix.lower() not in EXTENSIONS:
        raise ValueError("Invalid image filename")
    path = root / "images" / "sources.yaml"
    lock = path.with_suffix(path.suffix + ".lock")
    with lock.open("a") as handle:
        fcntl.flock(handle, fcntl.LOCK_EX)
        original = path.read_text() if path.exists() else ""
        sources = load_yaml(original) or {}
        previous = sources.get(slug)
        if previous and not replace:
            raise ValueError(f"Provenance already exists for {slug}; replacement must be explicit")
        if previous:
            entry = dict(entry, history=[*previous.get("history", []),
                                       {k: v for k, v in previous.items() if k != "history"}])
        sources[slug] = entry
        serialized = yaml.safe_dump(sources, allow_unicode=True, sort_keys=False)
        load_yaml(serialized)
        fd, temporary = tempfile.mkstemp(prefix=".sources-", suffix=".tmp", dir=path.parent)
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as output:
                output.write(serialized)
                output.flush()
                os.fsync(output.fileno())
            os.replace(temporary, path)
        finally:
            if os.path.exists(temporary):
                os.unlink(temporary)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--record", required=True, help="Game slug; read provenance JSON on stdin")
    parser.add_argument("--replace", action="store_true")
    args = parser.parse_args()
    record_provenance(args.record, json.load(sys.stdin), replace=args.replace)


if __name__ == "__main__":
    main()
