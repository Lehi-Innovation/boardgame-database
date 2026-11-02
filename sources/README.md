# Sources and provenance

Three kinds of evidence serve different purposes:

- [lists/](lists/README.md) records nominations: why a game became a research candidate.
- [research-log.yaml](research-log.yaml) records pages consulted while researching individual games.
- [../images/sources.yaml](../images/sources.yaml) records image origins and permission information separately.

The canonical discovery catalog and status mappings live in [../master_list.csv](../master_list.csv); nomination lists enrich that catalog.

A nomination is not verification of all facts about a game. A research URL is not evidence of image reuse rights. Active game metadata lives in [../games/](../games/).

## Research-log format

The intended structure is a top-level `entries` list:

```yaml
entries:
  - timestamp: "2026-10-21T12:00:00Z"
    game_id: example-game
    url: "https://publisher.example/game"
    description: "Publisher rules: confirmed supported player counts."
```

Use the actual game slug, consulted URL, and an honest description of what it supports. Record factual uncertainty and estimates where useful. The timestamp in this example is illustrative; do not invent exact retrieval times. New pipeline entries use the actual UTC logging time and explain that returned text may be cached. That time is not proof of a fresh page retrieval. Older midnight timestamps, including the converted Calico date-only entries, remain day-level placeholders.

The historical Calico and Campaign Manager sections have been normalized into the canonical list. Original URLs, notes, dates, and source order were preserved. Historical game slugs are retained unchanged. The initial nineteen reviewed historical links and three retired duplicate-record IDs are recorded separately in [game-aliases.yaml](game-aliases.yaml), with edition-specific explanations; see [the status page](../docs/status.md).

Use the shared writer for both pipeline logging and separately consulted evidence. Collect canonical entries in a JSON list, then run from the repository root:

```bash
python -m scripts.research_log --from-json /path/to/consulted-sources.json
python scripts/validate_catalog.py --only log
```

The writer validates existing and proposed entries, rejects duplicate YAML keys, serializes values safely, and replaces the file atomically under a shared lock. A malformed log or failed replacement leaves the original intact. Existing block-list content and comments are preserved; exact repeated entries are retained rather than silently deduplicated. Nonempty flow-style lists must be converted to the canonical block-list format before appending.

The ignored `research-log.yaml.lock` sidecar stays in place so participating writers lock the same file. Do not remove it during research. These locks coordinate the helper's writers; manual editors must still coordinate with the shared-log coordinator. If multiple research workers are authorized, keep one coordinator responsible for merging their evidence and checking duplicates.

Keep nomination lists, game metadata, and image provenance in their own locations. See [the research workflow](../docs/research.md#record-provenance) for reporting limitations.
