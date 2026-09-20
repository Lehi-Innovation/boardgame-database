# Source Lists

Each YAML file in this directory represents one source (article, award list, publisher catalog, etc.) from which board game names were collected.

## File Format

```yaml
source: "Human-readable source name"
url: "https://..."
fetched: 2026-02-16
games:
  - id: azul
    name: Azul
    year: 2017
  - id: wingspan
    name: Wingspan
    year: 2019
```

## Fields

- **source**: Short name shown in progress output
- **url**: Where the list came from
- **fetched**: Date the list was scraped/added
- **games[]**: Each entry needs `id` (slug), `name`, and `year`

## Naming Convention

Filename should be a slug of the source: `spiel-des-jahres.yaml`, `ars-technica-best-2025.yaml`, etc.

## Adding a New List

1. Create a new YAML file in this directory
2. Run `python3 scripts/progress.py` to see updated stats
3. Duplicates across files are handled automatically (union by `id`)
