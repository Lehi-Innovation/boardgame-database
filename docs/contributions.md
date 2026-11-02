# Suggestions and corrections

The local browser accepts missing-game suggestions at `/contribute` and corrections
from a game's “Suggest a correction” link. Contributors can supply source links and
describe factual mistakes or their own experience. A submission never changes YAML,
owner ratings, the CSV, or research provenance.

This is a local curation pilot. The server binds to `127.0.0.1`, rejects cross-origin
writes, and has no public accounts or reviewer web endpoints. These controls do not
constitute a public contribution service. Hosting, authenticated contributor and
reviewer roles, rate limits, retention, and backup operations remain deployment work.

## Review

The ignored `.local/contributions.sqlite` stores submissions and append-only review
events with UTC timestamps, actor labels, explanations, and versions. Preserve this
file: unlike `games.db`, it is original work and cannot be rebuilt from game records.
Actor labels identify the local operator's stated role; they are not authenticated
identity claims.

From the repository root:

```bash
python scripts/contributions.py list --status pending
python scripts/contributions.py show RECEIPT_ID
python scripts/contributions.py review RECEIPT_ID --decision accepted \
  --version 1 --actor "Owner" --note "Checked the publisher rules; ready to curate."
```

Use the current version from `show`. Concurrent or stale decisions fail without
overwriting another review. The available states mean:

| State | Meaning |
| --- | --- |
| `pending` | Awaiting review; supplied links are unverified |
| `accepted` | Accepted for sourced curation; catalog change still pending |
| `rejected` | Declined with a recorded explanation |
| `published` | Operator reports the separately applied and checked catalog edit |

After accepting a correction, follow [research.md](research.md), consult the evidence,
make the targeted YAML/CSV edit, append consulted-source provenance, run the audit,
and rebuild the query cache. Then record publication, citing the affected record and
commit or other precise change reference:

```bash
python scripts/contributions.py review RECEIPT_ID --decision published \
  --version 2 --actor "Owner" --note "Corrected games/SLUG.yaml; checked sources, audit, and cache. Commit: COMMIT."
```

The inbox does not verify that publication claim or apply records automatically.
Rejected and published reports can return to `pending` with a reason; accepted
reports can return to `pending` or be rejected. The complete earlier history remains.
Reopening a review does not reverse a catalog edit; make and verify that reversal
separately. Different tastes should be recorded as feedback, not overwritten as
factual errors.

For a local backup, stop the app and other review commands, then copy
`.local/contributions.sqlite` to your normal backup destination. The public model and
automated backup destination have not been selected.
