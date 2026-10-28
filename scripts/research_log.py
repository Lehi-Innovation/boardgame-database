"""Validated, serialized, and coordinated writes to the research evidence log."""

import argparse
import errno
import json
import os
import re
import tempfile
import time
import sys
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from urllib.parse import urlsplit

import yaml

from scripts.yaml_utils import load_yaml

LOG_PATH = Path(__file__).resolve().parent.parent / "sources" / "research-log.yaml"
SLUG_PATTERN = re.compile(r"[^\W_]+(?:-[^\W_]+)*\Z")
TIMESTAMP_PATTERN = re.compile(
    r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})\Z"
)


def validate_entry(entry):
    """Require canonical fields, while retaining any additional evidence fields."""
    if not isinstance(entry, dict):
        raise ValueError("entry must be a mapping")
    for field in ("timestamp", "game_id", "url", "description"):
        if not isinstance(entry.get(field), str) or not entry[field].strip():
            raise ValueError(f"{field} must be a nonempty string")
    if not SLUG_PATTERN.fullmatch(entry["game_id"]) or entry["game_id"] != entry["game_id"].lower():
        raise ValueError("game_id must be a lowercase hyphenated slug")
    stamp = entry["timestamp"]
    if not TIMESTAMP_PATTERN.fullmatch(stamp):
        raise ValueError("timestamp must be an ISO timestamp with a timezone")
    datetime.fromisoformat(stamp.replace("Z", "+00:00"))
    url = entry["url"]
    parts = urlsplit(url)
    if parts.scheme not in ("https", "http") or not parts.hostname or any(c.isspace() for c in url):
        raise ValueError("url must be an absolute HTTP(S) URL without whitespace")


def read_log(text):
    """Validate the entire document before allowing any update."""
    document = load_yaml(text)
    if not isinstance(document, dict) or set(document) != {"entries"}:
        raise ValueError("research log must contain only a top-level entries list")
    if not isinstance(document["entries"], list):
        raise ValueError("entries must be a list (use entries: [] for an empty log)")
    for index, entry in enumerate(document["entries"], 1):
        try:
            validate_entry(entry)
        except ValueError as exc:
            raise ValueError(f"entry {index}: {exc}") from exc
    return document["entries"]


@contextmanager
def log_lock(path, timeout=30):
    """Lock a stable sidecar, since atomic replacement changes the log's inode.

    The sidecar must remain in place after release so waiting writers all lock
    the same file. Supports POSIX (including WSL) and native Windows Python.
    """
    lock_path = path.with_name(path.name + ".lock")
    with lock_path.open("a+b") as handle:
        if os.name == "nt":
            import msvcrt
            if lock_path.stat().st_size == 0:
                handle.write(b"\0")
                handle.flush()

            def acquire():
                handle.seek(0)
                msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)

            def release():
                handle.seek(0)
                msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, 1)
        else:
            import fcntl

            def acquire():
                fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)

            def release():
                fcntl.flock(handle.fileno(), fcntl.LOCK_UN)

        deadline = time.monotonic() + timeout
        while True:
            try:
                acquire()
                break
            except OSError as exc:
                if exc.errno not in (errno.EACCES, errno.EAGAIN, errno.EDEADLK):
                    raise
                if time.monotonic() >= deadline:
                    raise TimeoutError(f"Timed out waiting for research-log lock: {lock_path}") from exc
                time.sleep(0.05)
        try:
            yield
        finally:
            release()


def append_entries(entries, path=LOG_PATH):
    """Atomically append a batch, preserving existing bytes and comments.

    Participating writers serialize their read/validate/replace transactions.
    Manual editors must still coordinate with the research-log coordinator.
    """
    entries = list(entries)
    if not entries:
        return 0
    for entry in entries:
        validate_entry(entry)
    path = Path(path)
    with log_lock(path):
        original = path.read_bytes().decode("utf-8") if path.exists() else "entries: []\n"
        previous = read_log(original)
        addition = yaml.safe_dump(entries, allow_unicode=True, sort_keys=False)
        if previous:
            # Match the existing block list, including valid indentless YAML.
            node = yaml.compose(original)
            sequence = node.value[0][1]
            if sequence.flow_style:
                raise ValueError("Nonempty entries must use block-list YAML before appending")
            indent = " " * sequence.start_mark.column
            addition = "".join(indent + line + "\n" for line in addition.splitlines())
            candidate = original + ("" if original.endswith("\n") else "\n") + addition
        else:
            # An empty flow list cannot accept block-list appends. Preserve its
            # comments and serialize the complete (previously empty) document.
            comments = "\n".join(line for line in original.splitlines() if line.lstrip().startswith("#"))
            addition = "".join("  " + line + "\n" for line in addition.splitlines())
            candidate = (comments + "\n" if comments else "") + "entries:\n" + addition
        if read_log(candidate) != previous + entries:
            raise ValueError("Serialized research log did not preserve all entries")
        temp_path = None
        try:
            with tempfile.NamedTemporaryFile(
                mode="w", encoding="utf-8", dir=path.parent,
                prefix="." + path.name + ".", suffix=".tmp", delete=False, newline="",
            ) as handle:
                temp_path = Path(handle.name)
                handle.write(candidate)
                handle.flush()
                os.fsync(handle.fileno())
            if path.exists():
                os.chmod(temp_path, path.stat().st_mode & 0o777)
            os.replace(temp_path, path)
        finally:
            if temp_path is not None and temp_path.exists():
                temp_path.unlink()
    return len(entries)


def main(argv=None):
    parser = argparse.ArgumentParser(description="Validate and append consulted research evidence")
    parser.add_argument("--from-json", required=True, type=Path, help="JSON list of canonical log entries")
    args = parser.parse_args(argv)
    try:
        entries = json.loads(args.from_json.read_text(encoding="utf-8"))
        if not isinstance(entries, list):
            raise ValueError("Input JSON must be a list of canonical entries")
        count = append_entries(entries, path=LOG_PATH)
    except (OSError, ValueError, yaml.YAMLError) as exc:
        print(f"Research log unchanged: {exc}", file=sys.stderr)
        return 1
    print(f"Appended {count} validated research entries")
    return 0


if __name__ == "__main__":
    sys.exit(main())
