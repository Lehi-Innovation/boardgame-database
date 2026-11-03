#!/usr/bin/env python3
"""Local suggestion/correction inbox with versioned, append-only review history.

Submissions never edit game records. Accepted means ready for sourced curation;
published means a reviewer has separately made and checked the catalog change.
"""
import argparse
import json
import sqlite3
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent.parent
TRANSITIONS = {
    "pending": {"accepted", "rejected"},
    "accepted": {"published", "rejected", "pending"},
    "rejected": {"pending"},
    "published": {"pending"},
}


def timestamp():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def connect(root):
    directory = Path(root) / ".local"
    directory.mkdir(exist_ok=True)
    connection = sqlite3.connect(directory / "contributions.sqlite", timeout=10)
    connection.row_factory = sqlite3.Row
    connection.executescript("""
        CREATE TABLE IF NOT EXISTS submissions (
            id TEXT PRIMARY KEY, payload TEXT NOT NULL, status TEXT NOT NULL,
            version INTEGER NOT NULL, created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS review_events (
            submission_id TEXT NOT NULL REFERENCES submissions(id),
            version INTEGER NOT NULL, status TEXT NOT NULL, actor TEXT NOT NULL,
            note TEXT NOT NULL, timestamp TEXT NOT NULL,
            PRIMARY KEY (submission_id, version)
        );
    """)
    return connection


def validate_submission(payload, root):
    allowed = {"kind", "game_id", "name", "message", "sources"}
    if not isinstance(payload, dict) or set(payload) - allowed:
        raise ValueError("Unexpected submission fields")
    if payload.get("kind") not in {"suggestion", "correction"}:
        raise ValueError("Choose suggestion or correction")
    for field, maximum in (("name", 200), ("message", 5000)):
        if not isinstance(payload.get(field), str) or not 1 <= len(payload[field].strip()) <= maximum:
            raise ValueError(f"{field} must contain 1–{maximum} characters")
    slug = payload.get("game_id")
    if slug is not None:
        if not isinstance(slug, str) or Path(slug).name != slug or "\\" in slug or not (Path(root) / "games" / f"{slug}.yaml").is_file():
            raise ValueError("Unknown game ID")
    if payload["kind"] == "correction" and not slug:
        raise ValueError("A correction needs a current game ID")
    sources = payload.get("sources", [])
    if not isinstance(sources, list) or len(sources) > 10:
        raise ValueError("Supply at most ten source links")
    for source in sources:
        if not isinstance(source, str) or len(source) > 2000 or any(c.isspace() for c in source):
            raise ValueError("Invalid source link")
        parsed = urlsplit(source)
        if parsed.scheme not in {"http", "https"} or not parsed.hostname:
            raise ValueError("Sources must be absolute HTTP(S) links")
    return {**payload, "name": payload["name"].strip(), "message": payload["message"].strip(), "sources": sources}


def read_submission(connection, identifier):
    row = connection.execute("SELECT * FROM submissions WHERE id=?", (identifier,)).fetchone()
    if row is None:
        raise ValueError("Submission not found")
    result = dict(row)
    result["payload"] = json.loads(result["payload"])
    result["history"] = [dict(event) for event in connection.execute(
        "SELECT version,status,actor,note,timestamp FROM review_events WHERE submission_id=? ORDER BY version", (identifier,))]
    return result


def submit(payload, root=ROOT):
    payload = validate_submission(payload, root)
    identifier, now = str(uuid.uuid4()), timestamp()
    connection = connect(root)
    try:
        with connection:
            connection.execute("INSERT INTO submissions VALUES (?,?,?,1,?)", (identifier, json.dumps(payload, ensure_ascii=False), "pending", now))
            connection.execute("INSERT INTO review_events VALUES (?,1,'pending','submitter',?,?)", (identifier, "Submitted for review; supplied links have not been verified.", now))
        return read_submission(connection, identifier)
    finally:
        connection.close()


def review(identifier, decision, actor, note, version, root=ROOT):
    if not actor.strip() or not note.strip() or len(actor) > 200 or len(note) > 5000:
        raise ValueError("Review needs an actor and a concise explanation")
    connection = connect(root)
    try:
        with connection:
            connection.execute("BEGIN IMMEDIATE")
            current = read_submission(connection, identifier)
            if current["version"] != version:
                raise ValueError("Review conflict: reload the submission and use its current version")
            if decision not in TRANSITIONS[current["status"]]:
                raise ValueError(f"Cannot move {current['status']} to {decision}")
            connection.execute("UPDATE submissions SET status=?,version=version+1 WHERE id=?", (decision, identifier))
            connection.execute("INSERT INTO review_events VALUES (?,?,?,?,?,?)", (identifier, version + 1, decision, actor.strip(), note.strip(), timestamp()))
        return read_submission(connection, identifier)
    finally:
        connection.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT)
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("submit", help="Read a submission JSON object on stdin")
    listing = commands.add_parser("list")
    listing.add_argument("--status", choices=TRANSITIONS)
    show = commands.add_parser("show")
    show.add_argument("id")
    change = commands.add_parser("review")
    change.add_argument("id")
    change.add_argument("--decision", required=True, choices=TRANSITIONS)
    change.add_argument("--actor", required=True)
    change.add_argument("--note", required=True)
    change.add_argument("--version", required=True, type=int)
    args = parser.parse_args()
    try:
        if args.command == "submit":
            result = submit(json.load(sys.stdin), args.root)
        elif args.command == "review":
            result = review(args.id, args.decision, args.actor, args.note, args.version, args.root)
        else:
            connection = connect(args.root)
            try:
                if args.command == "show":
                    result = read_submission(connection, args.id)
                else:
                    identifiers = connection.execute("SELECT id FROM submissions" + (" WHERE status=?" if args.status else "") + " ORDER BY created_at", (args.status,) if args.status else ())
                    result = [read_submission(connection, row["id"]) for row in identifiers]
            finally:
                connection.close()
        print(json.dumps(result, indent=2, ensure_ascii=False))
    except (ValueError, json.JSONDecodeError) as error:
        print(json.dumps({"error": str(error)}), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
