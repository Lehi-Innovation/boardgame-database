# Catalog consistency and identity

The 2026-11-01 migration resolved the earlier 349 structural findings without claiming
a factual review of all games. The changes are inspectable in
`python -m scripts.reconcile_records` (preview) and `--apply` (validated application).
Running it after migration makes no further changes.

## Record changes

- Six numeric IDs are now quoted filename slugs, including `007`.
- Thirty-two null publisher fields are empty lists; no publisher was invented.
- Nineteen alternate-title lists now quote titles containing colons, preserving the
  original words rather than exposing accidental YAML mappings to consumers.
- Fifteen records normalize category synonyms or remove misplaced tags. `Lucky`,
  `Unique`, and `Discovery` belong to feelings; `Competitive` and `Strategy` repeated
  existing descriptions/ratings. Clear synonyms include `Race` → `Racing`,
  `Push Your Luck` → `Press Your Luck`, and `Solo/Solitaire` → `Solo`.
- Thirty-six evokes lists normalize misplaced mechanics/themes to experience
  estimates and repair two repeated values. These are provisional editorial
  estimates from existing descriptions, not new claims of community consensus or
  fresh publisher research. Per-game choices live in the migration script.

The schema now includes useful existing distinctions: memory, trivia, voting,
exploration, stock holding, solo, traditional, educational, creative, simulation,
and missing themes. This is a vocabulary extension; the proposed replacement of the
`feel` scale has not been adopted. All presentation labels derive from the schema. Later source-based corrections are separate from this structural migration, including traditional Das Bohnenspiel, Codenames counts/year, and distinct Adel Verpflichtet/Hoity Toity editions.

The previous player-count enumeration incorrectly rejected known counts over twelve.
Positive integer counts now remain exact, alongside the legacy open-ended `12+`
label. No game counts were reduced, rounded, or replaced with that label.

Owner affinity/hotness, play history, descriptions, unrelated text, and comments
were preserved by the migration. Game ratings are still provisional unless their
own evidence establishes otherwise. Schema validity does not certify factual quality.

## Catalog identity

`scripts/catalog.py` is the shared resolver used by Python progress, mapping backfill,
and the derived SQLite catalog snapshot consumed by the web tracker.

1. A current explicit CSV `yaml_id` mapping is authoritative. A missing explicit
   target fails resolution rather than falling back silently.
2. Excluded rows without mappings stay excluded, with their reasons visible.
3. Otherwise exact primary/alternate names, with a filename-slug fallback, identify
   candidates. Known CSV publication years must match the represented record year.
4. Multiple candidates or conflicting years remain pending. No subtitle-prefix
   guessing or last-record-wins matching is used.

Only identical identity/status/mapping rows collapse. Different years, source IDs,
types, exclusions, or mappings stay separate. All source CSV row numbers and notes
remain available in the snapshot. Empty `pending` is not a comprehensive-coverage
claim; excluded entries and detailed files without catalog matches are counted
separately. Source nominations enrich browsing and do not determine quality.

The JSON report includes candidate records and explicit publication-year warnings. Ten reviewed mapping corrections, with original targets and reasons, are retained in [../sources/catalog-identity-decisions.yaml](../sources/catalog-identity-decisions.yaml). Nine entries returned to pending; Dune’s 2019 row now links its 2019 edition.

Inspect `python scripts/progress.py --json` before resolving conflicts. Use explicit
edition evidence, not the goal of making counts increase, to choose corrections.
Keep both distinct editions. Backfill previews use these same conservative rules.

## Historical research IDs

[../sources/game-aliases.yaml](../sources/game-aliases.yaml) records nineteen deliberate
links from historical IDs to current records, each with an explanation grounded in
the stored evidence and represented edition. Historical log bytes remain intact.
The previously missing original 878 Vikings record was independently researched and
added using its historical slug; it is not an alias to the second edition.

Aliases do not establish that every logged source supports every field in its target
record. The audit validates targets and explanations and reports unresolved historical
IDs; it never rewrites evidence IDs automatically.
