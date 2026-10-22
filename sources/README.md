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

Use the actual game slug, consulted URL, and an honest description of what it supports. Record factual uncertainty and estimates where useful. The timestamp in this example is illustrative; do not invent exact retrieval times. The current pipeline records a date with a midnight placeholder.

The existing log contains a malformed historical section and currently fails parsing. Its evidence should be preserved during repair; see [the status page](../docs/status.md) and [research workflow](../docs/research.md#record-provenance).

Validate the entire log after a change. Use a single writer for the shared log when research is performed concurrently. Keep nomination lists, game metadata, and image provenance in their own locations.
