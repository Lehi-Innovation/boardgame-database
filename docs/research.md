# Research and curation workflow

Read [the product brief](product-brief.md) for audience and discovery goals, and [../schema.yaml](../schema.yaml) for current fields and permitted values. The current vocabulary remains in use while possible genre changes are explored.

## Choose and identify the game

A requested game can be added whether or not it appears in a source list. `master_list.csv` is the catalog universe; `games/` holds researched details. Use `python scripts/progress.py` to inspect catalog coverage, but balance nominations with gaps in familiar, children's, traditional, party, demanding, and niche games.

Check existing IDs, primary names, alternate names, and editions before creating a record. Confirm whether the request means a base game, expansion, reimplementation, or particular edition. Reuse the existing record when it is the same game; do not collapse distinct editions merely because a title matches.

Traditional games do not need manufactured packaging or a single publisher to qualify. Museum, cultural, education and research sources can establish identity and rules. Keep uncertain origin dates and universal minimum ages unknown, and explain meaningful rule variants. Historical `failed` notes are earlier research outcomes, not permanent scope decisions; reopen them when suitable evidence is found.

Use a lowercase hyphenated slug matching `games/{slug}.yaml`. Use the publication year of the represented edition. Shared families describe related games; `compatible_with` describes actual combinability, not merely a shared theme.

## Gather evidence

Prefer publisher product pages and rules for factual specifications. Reviews, retailers, and reference sources can supplement missing facts and help estimate playing experience. Research beyond broad popularity signals when selecting coverage.

The owner permits research-based estimates of game characteristics. Distinguish those estimates from confirmed facts in YAML comments or research notes; do not invent credits, claim consensus from one review, or present unavailable evidence as verified. Unknown facts can remain null or empty.

BoardGameGeek use remains unresolved for the intended integration. Follow [the source-policy assessment](product-brief.md#boardgamegeek-source-policy); continue using other suitable sources while permissions are evaluated. This is not a permanent owner preference against BGG. Reading its policy documents is permitted.

The existing pipeline can fetch up to three URLs per invocation and return clean source text:

```bash
python scripts/game_pipeline.py "Game Name" --urls "https://publisher.example/game" "https://review.example/game"
```

Replace those illustrative URLs with actual sources. The pipeline truncates each source to 3,000 characters and may return previously cached sources. Read the underlying source or obtain additional evidence when relevant content is absent; a fixed tool-call budget must not replace adequate research.

## Write or correct the record

Use `schema.yaml`'s game template, including alternate names, minimum age, description, and play-tracking fields. Read a current record for formatting rather than copying a frozen template from an agent prompt.

- Use 2-space indentation, explicit `null`, lists for multiple values, and a block scalar for the description.
- Use exact category/evokes vocabulary. The current convention is five distinct evokes values; the proposed genre redesign has not been implemented.
- Keep ratings within 0–4 and use the schema's meanings. In particular, `feel` currently encodes social mode as well as intensity; it is not a generic competition score.
- Leave `affinity` and `hotness` null on new records. Preserve existing owner ratings and play history when correcting records.
- Separate supported player counts from estimated/recommended counts.
- Write a concise, original description that explains the experience and practical demands in understandable language.
- Preserve existing data and comments when making a targeted correction. Different tastes need not mean a record is factually wrong.

For newly created records, initialize `plays_tracked` using the schema. Some older records omit it; missing history is not permission to invent plays.

## Update catalog status and the query store

Preserve the CSV columns `bgg_id`, `name`, `year`, `type`, `status`, `notes`, and `yaml_id`. Add genuinely new catalog games with at least a name and known edition information; do not invent BGG IDs. Use `yaml_id` to link an existing catalog row to a differently named game file.

Use `scripts/update_master_status.py` for status/mapping updates. When titles repeat, select the intended edition with `--year` and/or `--bgg-id`; ambiguous updates fail instead of choosing the first row. Supported exclusions are `skip`, `failed`, `ambiguous`, and `duplicate`; document the reason in `notes`. Inspect `--backfill --dry-run` before accepting inferred mappings. A completed game has a record/mapping, not a permanent `done` status value.

For authorized batches, the researcher can process up to 50 assigned games sequentially. Report each input as created, existing, failed, ambiguous, duplicate, or not attempted, including actual YAML slugs and reasons. A coordinator can merge results through `--from-results results.json`; the script translates `status: done` to an empty status. Do not let multiple workers overwrite the CSV or shared provenance log. Stop a batch early if evidence quality or context capacity becomes insufficient.

After catalog changes, rebuild with `python scripts/build_db.py` and inspect its output. The server detects the rebuilt query database automatically.

## Record provenance

See [../sources/README.md](../sources/README.md) for the canonical log-entry format and distinctions between nominations, research, and images.

The historical format errors are repaired. All new entries must go through the validated writer, either using the pipeline's optional `--log SLUG` flag or merging a JSON list of canonical entries:

```bash
python -m scripts.research_log --from-json /path/to/consulted-sources.json
python scripts/validate_catalog.py --only log
```

Inspect what the pipeline actually logged: it records only the sources it returned, which may include cached text. Its timestamp is the UTC logging time, not a verified page-retrieval time. Older midnight timestamps remain day-level placeholders. Log independently consulted evidence separately, describe what it supports, and inspect for duplicates. The helper preserves repeated evidence rather than deciding whether two research events are equivalent.

The shared writer uses safe YAML serialization, whole-document validation, a stable sidecar lock, and atomic replacement. It refuses malformed existing logs and duplicate mapping keys; failures leave the log unchanged. The pipeline still prints its source JSON when logging fails, but exits unsuccessfully so the failure is visible. Avoid manual read/overwrite operations that bypass the lock. If multiple research workers are authorized, collect provenance separately and let one coordinator merge and validate the shared log. Historical slugs without current game files are warnings requiring identity review, not instructions to guess a replacement.

## Verify and report

Read back the saved record and parse it. Verify filename/ID, valid categories and evokes, rating ranges, player-count consistency, and that the description agrees with the evidence. Use [the development checks](development.md#checks) as a starting point.

Run `python scripts/validate_catalog.py --games games/SLUG.yaml` for structural and vocabulary checks on a changed record. This does not establish factual accuracy or permission to reuse a source. Run the full audit when reviewing catalog-wide consistency; its structural checks now pass, with remaining identity/factual-quality work listed in [status.md](status.md).

Report the created or updated game, actual source coverage, and material uncertainty or incomplete work. Do not call a game fully verified solely because the file exists.

For images, follow [../images/README.md](../images/README.md). Publisher outreach is a separate action requiring the owner's instruction; a contact directory is not an instruction to send messages.
