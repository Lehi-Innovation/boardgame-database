# Project organization

This is the maintained repository map. Update it when file locations or canonical documents change.

## Directory map

```text
/
├── README.md                   Project entry point and quick start
├── AGENTS.md                   Shared coding-assistant guidance
├── CLAUDE.md                   Claude-specific entry point
├── TODO.md                     Pointer to the maintained work queue
├── schema.yaml                 Current vocabulary and record templates
├── master_list.csv             Canonical discovery catalog and research status
├── wikidata_state.json         Existing discovery import state
├── publishers.yaml             Publisher asset/contact directory
├── server.sh                   Development launcher
├── docs/
│   ├── README.md               Documentation index and draft-suite context
│   ├── product-brief.md        Confirmed owner direction and hypotheses
│   ├── organization.md         This map and maintenance conventions
│   ├── development.md          Setup, architecture, commands, verification
│   ├── catalog-maintenance.md  Identity rules and reviewed repair decisions
│   ├── discovery-review.md     Representative source and mobile checks
│   ├── contributions.md        Local suggestion/review procedure
│   ├── research.md             Curation and provenance workflow
│   ├── status.md               Dated baseline, known issues, proposed work
│   └── 00-*.md … 06-*.md       Earlier marketplace/architecture drafts
├── games/                      Authoritative detailed game YAML records
├── sources/
│   ├── README.md               Evidence conventions
│   ├── lists/                  Award/reviewer nomination enrichment
│   ├── catalog-identity-decisions.yaml  Reviewed CSV mapping corrections
│   ├── game-aliases.yaml       Deliberate historical evidence-ID links
│   └── research-log.yaml       Consulted research evidence
├── images/
│   ├── README.md               Asset workflow
│   ├── ACQUISITION_PLAN.md     Dated acquisition strategy and decisions
│   ├── FAIR_USE.md             Existing project image-use policy
│   ├── sources.yaml           Image provenance
│   ├── identity-review.yaml    Dated visual findings for existing assets
│   └── ...                    Box art
├── scripts/                    Research, catalog, database, and asset tools
├── tests/                      Focused Python regression tests using temporary data
├── .github/workflows/          Automated tooling and provenance checks
├── web/
│   ├── README.md               UI/API reference
│   ├── package*.json          Dependency manifest and lockfile
│   ├── server.js              Express application
│   ├── lib/db.js              SQLite query reader
│   ├── lib/yaml-handler.js    YAML reader/cache and snapshot adapter
│   └── public/                Four HTML pages and shared CSS/JS
├── .claude/                    Tool-specific skills, agent, and settings
├── .local/                    Ignored original suggestion/review SQLite store
└── archive/                    Inactive records, notes, and experiments
```

The locally generated `games.db` and `pipeline_cache.db` live at the root and are ignored.

## Sources of truth

| Information | Canonical location |
| --- | --- |
| Current audience, owner preferences, confirmed direction | [product-brief.md](product-brief.md) |
| Vocabulary and templates | [../schema.yaml](../schema.yaml) |
| Catalog universe, research status, record mappings | [../master_list.csv](../master_list.csv) |
| Detailed game metadata | [../games/](../games/) |
| Nomination provenance | [../sources/lists/](../sources/lists/) |
| Consulted research evidence | [../sources/research-log.yaml](../sources/research-log.yaml) |
| Historical evidence-ID mappings | [../sources/game-aliases.yaml](../sources/game-aliases.yaml) |
| Image origins and permission evidence | [../images/sources.yaml](../images/sources.yaml) |
| Procedures | [development.md](development.md), [research.md](research.md) |
| Known issues and proposed priorities | [status.md](status.md) |

The web “Master List” reads a derived catalog snapshot built from the CSV with `scripts/catalog.py`, the same resolver used by Python progress. Source-list nominations enrich it; they do not override researched records. SQLite is a derived read cache, not an additional editable authority.

The schema is descriptive YAML. `scripts/validate_catalog.py` enforces selected structural rules and reads its vocabulary; it is not a complete generated schema contract. `scripts/yaml_utils.py` supplies duplicate-key detection and `scripts/research_log.py` owns coordinated evidence writes. Genre proposals do not silently change current definitions. The earlier marketplace suite is preserved as drafts, not an adopted expansion of the current product scope.

## Placement and maintenance

- Keep the root for entry points, shared catalog/definitions, and configuration.
- Put maintained guides in `docs/`; keep directory-specific formats beside their data.
- Use `games/{slug}.yaml` with a matching string `id`. Preserve data paths unless all consumers are migrated together.
- Put reusable tools in `scripts/` and document them in the development guide.
- Link to canonical definitions rather than copying rating/category tables into prompts.
- Keep dated measurements and open work in status. Record confirmed product decisions in the brief.
- On a move, update maintained links and consumers. On retirement, update the archive index.
- Check remote history before assuming that a local prototype, empty file, or old count reflects the current project.

## Generated files

Ignore `node_modules/`, `.venv/`, Python bytecode, local environment files, logs, temporary output, `.local/`, `games.db`, `pipeline_cache.db`, and SQLite sidecars. Commit dependency manifests and the Node lockfile.

The active CSV and existing Wikidata state are tracked. Inspect importer compatibility and preserve status/mapping columns before updating them. Caches can be rebuilt; they are not provenance records. `.local/contributions.sqlite` is original user work with review history and needs backups; it is not a cache. Preserve existing local caches unless a specific task needs to replace them.

## Archive conventions

Dated duplicate-record retirements live in `archive/YYYY-MM-DD/duplicate-records/`,
with original paths, retained IDs and hashes in that date’s README. Evidence aliases
and CSV mappings point to the retained active record; unrelated same-title games
remain separate.

Use [the archive index](../archive/README.md). Group retired material by retirement date or named migration, list original paths, explain why it is inactive, and state restoration requirements. Preserve historical content unchanged. Disposable bytecode does not require archival copies.

Old TODOs and agent memories are reference material, not current policy. Retired scripts need path, dependency, and source-permission review before reuse.
