# Pilot proposal importer

Use this guide to inspect and prepare reviewed-catalog proposals from legacy
YAML. The separate [twenty-game review packet](../imports/boardgame-marketplace/cover-review/README.md)
uses this importer for sourced identity drafts. Preparation does not change the
working [legacy name feed](name-snapshot.md) or approve catalog records.

M3 preparation starts with the twenty development seed titles from
`boardgame-marketplace`, pinned at `82bca51`. The
[identity map](../imports/boardgame-marketplace/manifest.json) reserves proposed
game and proposal UUIDs and pins each legacy file's exact SHA-256. The
[candidate review sheet](../imports/boardgame-marketplace/README.md) calls out
edition questions. These are candidate links, not approved identities, verified
facts, marketplace database IDs, or a completed pilot.

## Inspect without writing to the catalog

```sh
npm run import:legacy -- plan --output /tmp/catalog-pilot-report.json
npm run import:legacy -- plan --only viticulture-essential-edition
npm run import:legacy -- --help
```

`plan` reads local YAML and the manifest; it makes no HTTP or database requests.
An output file must not already exist. The report lists identity clues, unverified
basic facts, unmapped credit/category terms, omitted field names, preparation
blockers, and any prepared proposal plus domain/evidence findings. Numeric YAML
scalars remain strings, including `007` and identifiers beyond JavaScript's exact
integer range. Filename slugs are authoritative for the mapping; YAML `id` is
only a clue. The parser rejects duplicate keys, aliases, custom tags, multiple
documents, invalid UTF-8, and files over 1 MB. Source paths must stay in `games/`.

Legacy facts are never copied automatically into a proposal. Personal ratings,
play history, descriptions, images, editorial assessments, and preferred player
counts are omitted from report values and generated content. The report retains
unmapped publisher/designer/category strings for later classification. Legacy
relations stay as clues until explicitly represented with resolved UUIDs.

The seed snapshot keeps existing external identifiers as strings. No source
URLs are fetched, including BoardGameGeek. The marketplace checkout and database
are not used by the importer. An unchanged manifest and source files produce the
same plan; regenerating the map's UUIDs would discard that continuity.

## Prepare one candidate

1. Resolve design identity using the [approved policy](decisions/001-catalog-identity.md).
   Preserve its proposed UUID or explicitly map it to a reviewed existing game.
   Record the reasoning in `identity.rationale`, then set `identity.status` to
   `prepared`. This records preparation, **not catalog approval**. Different
   filenames can deliberately map to one game; matching titles never do so
   automatically.
2. Leave `edition_id` null until the edition is established. If selecting a
   default edition, allocate/preserve its UUID and use it both in this map and
   the game's `default_edition_id`. Include the edition target or use an approved
   edition from the same game. Prepare other referenced records, such as
   publishers, in the same proposal or use already approved IDs.
3. Fill `prepared` with `content` conforming to `ProposalContent` and the baseline
   below. Use allowed sources and field-linked citations for assertions. Preserve
   unknowns; do not infer an edition year from a legacy year, treat a single
   playtime value as bounds, or fill gaps in exact supported player counts.
4. For a new proposal, use `expected_version: 0` and
   `expected_content_hash: null`. Keep the assigned `proposal_id`. Review the
   report's prepared content, source locators, graph findings, and uncertainty
   notes before sending it.

```json
{
  "expected_version": 0,
  "expected_content_hash": null,
  "content": {
    "title": "Prepared name and edition",
    "rationale": "Explain the identity and sourced changes here.",
    "origin": "import",
    "targets": [],
    "sources": []
  }
}
```

This illustrates the wrapper only: replace the empty `targets` with at least one
valid target. See [shared schemas](../packages/contracts/src/index.ts) and the
synthetic [import tests](../tests/import-legacy.test.ts) for complete examples.
For reproducible preparation, include source metadata for every citation;
previously approved sources must retain exactly their immutable metadata.

The importer appends filename, source hash, dataset, proposed identities, and
identity rationale to the proposal rationale. This provenance participates in
the content hash and human review; it does not satisfy factual evidence checks.
It forces `origin: import`, retaining the existing human-review warning.

## Save or submit through the existing API

Start the local app and sign in. Supply the signed-in user's access token as
`CATALOG_IMPORT_TOKEN` in the process environment, never as a command argument or
checked-in file. The importer neither creates users nor reads demo credentials.

```sh
npm run import:legacy -- save --only wingspan
npm run import:legacy -- submit --only wingspan
```

Both commands require a prepared mapping, matching source bytes, and explicit
content. `save` can stage a draft with missing evidence or unresolved graph
findings for further preparation. `submit` saves if needed, then uses the normal
submission checks. It refuses local evidence/graph errors; the server repeats
validation against current approved revisions, immutable sources, live sessions,
and ownership. Saving a draft never changes approved records. There are no
approval or publication commands in this importer.

Each command handles one selected entry. Independent proposals with dependencies
must wait for those dependencies to be approved, or combine the dependent targets
in one proposal. Batch transactionality, remote imports, and background import
jobs are outside this preparation tool. Use `--origin` for another loopback app
port. Redirects are rejected; credentials cannot be sent to a hosted URL. The
existing body and mutation-rate limits apply. After `429`, wait a minute and
rerun. The token must still represent an active session.

## Repeats, source changes, and manual edits

- An exact repeated plan checks the existing proposal by its saved UUID and
  content hash. It creates no extra proposal/version. A committed save or submit
  whose response was lost is recovered by reading the proposal. Concurrent
  identical attempts converge through the existing version checks.
- Changed source bytes block import until a preparer reviews and updates
  `source_hash`. For an open proposal, get its current private detail through
  `GET /api/editorial/v1/proposals/{id}`. Put its `version` and canonical
  `contentHash(detail.draft)` into `prepared.expected_version` and
  `prepared.expected_content_hash`. The successful import report also provides
  that version/hash baseline. Never derive this hash with plain JSON stringify;
  use the domain `contentHash` helper.
- A changed plan can save a new version only when both baseline values match.
  A manual edit or concurrent update causes a conflict. Submitted versions are
  withdrawn by the existing save command, with immutable history retained.
- A changes-requested version is not automatically resubmitted unchanged. Make
  the requested changes and prepare the new baseline before resubmitting.
- Approved, rejected, and withdrawn proposals cannot be overwritten. Preserve
  the prior manifest in version control, assign an explicit successor proposal
  UUID, explain the prior proposal in its rationale, keep the same entity
  mapping, and supply current `base_revision_id` values. Stale bases fail server
  submission; the importer never silently rebases or changes an approved head.

For an offline update plan, `--context FILE` accepts a JSON array of approved
`CatalogRecord` payloads. The save/submit commands always fetch current records
from the local authenticated API. Offline findings are advisory; server
validation is authoritative.

## Remaining M3 work

The original manifest retains twenty pending mappings. The separate cover-review
manifest now contains twenty sourced game drafts and eighteen proposed editions,
validated offline but not saved, submitted or approved. Review the packet, resolve
Gloomhaven and The Castles of Burgundy's editions, and obtain explicit owner review.
Preserve the packet's proposed edition IDs when adopting its choices. Extend
coverage toward roughly fifty designs with numeric titles, localized aliases,
multiple editions, ordinary/standalone expansions, a reviewed duplicate merge,
and unknown/disputed facts. Preserve source history and unmapped terms while
doing so. Public releases, canonical cover adapters, and authority cutover remain
later work; the existing legacy-name adapters are already implemented.

Verification uses synthetic records only: unit checks, disposable database
workflow tests, and real authenticated HTTP checks cover repeat runs, lost
responses, ownership, version conflicts, stale bases, and the human approval
boundary. The parser follows the [YAML library's documented failsafe schema and
parse controls](https://eemeli.org/yaml/).
