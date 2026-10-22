# Nomination source lists

Each YAML file represents an award, reviewer list, article, or other source that nominates games for the catalog.

```yaml
source: "Human-readable source name"
url: "https://example.com/list"
fetched: 2026-10-22
games:
  - id: azul
    name: Azul
    year: 2017
```

Use actual URLs and collection dates. Filenames should be lowercase hyphenated source names. Each game needs an ID, display name, and edition year when known. Check primary/alternate names and editions before choosing a new ID.

[../../master_list.csv](../../master_list.csv) is the canonical catalog universe. Source lists enrich it with nomination counts and evidence; adding a list alone does not put its games into the research queue. Review missing games and add corresponding CSV rows while preserving existing status and `yaml_id` columns.

From the repository root:

```bash
python3 scripts/progress.py 0
python3 scripts/progress.py 20
```

The queue prioritizes nominations but supports games with no nominations. Nomination count is not a quality ranking. Python and web matching differ; see [known issues](../../docs/status.md).

For facts about a game, record consulted evidence in [the research log](../README.md) and researched metadata in the game file.
