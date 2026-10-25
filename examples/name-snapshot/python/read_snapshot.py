"""Framework-neutral reader; requires jsonschema, but no catalog SDK or Node."""
import hashlib
import json
from pathlib import Path
import re
import sys
from urllib.parse import quote

from jsonschema import Draft202012Validator


def read_snapshot(path, checksum_path, schema_path):
    raw = Path(path).read_bytes()
    if len(raw) > 32_000_000:
        raise ValueError("Snapshot exceeds 32 MB")
    checksum = hashlib.sha256(raw).hexdigest()
    expected = Path(checksum_path).read_text(encoding="utf-8")
    if not re.fullmatch(r"[0-9a-f]{64}  snapshot\.json\n", expected) or expected[:64] != checksum:
        raise ValueError("Snapshot checksum mismatch")
    snapshot = json.loads(raw.decode("utf-8"))
    if not isinstance(snapshot, dict) or not re.fullmatch(r"1\.[0-9]+", str(snapshot.get("schema_version", ""))):
        raise ValueError("Unsupported snapshot schema major version")
    schema = json.loads(Path(schema_path).read_text(encoding="utf-8"))
    Draft202012Validator(schema).validate(snapshot)
    records = snapshot["records"]
    ids = [record["source_id"] for record in records]
    if len(set(ids)) != len(ids):
        raise ValueError("Duplicate source IDs")
    counts = snapshot["counts"]
    if (counts["records"] != len(records)
            or counts["aliases"] != sum(len(r["aliases"]) for r in records)
            or counts["source_files"] != len(records) + counts["deferred_records"]):
        raise ValueError("Snapshot counts do not match records")
    for record in records:
        if record["source_id"] != "legacy_yaml:" + quote(record["source_file"][6:-5], safe=""):
            raise ValueError("Source ID/file mismatch")
        if len(set(record["aliases"])) != len(record["aliases"]):
            raise ValueError("Duplicate aliases")
    return snapshot, checksum


if __name__ == "__main__":
    snapshot, checksum = read_snapshot(*sys.argv[1:])
    print(json.dumps({"checksum": checksum, "snapshot": snapshot}, ensure_ascii=False))
