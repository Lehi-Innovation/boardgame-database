# Session handoff and continuation prompt — September 20, 2026

> Archived session record. Its continuation instructions and working-tree
> details are superseded. Start with [project status](../../status.md) and the
> [documentation map](../../README.md).

## Current priority: stock cover images

The owner confirmed that most applications need stock cover art, while some may
opt out. Proceed with the [cover-image specification](../../cover-images.md). It
supersedes the earlier optional-image launch scope and the instruction to return
immediately to consumer feature work. Keep the existing name integrations usable.

The owner also requested the [single-character placeholder](../../cover-images.md#missing-image-placeholder):
use the game's first letter or number on a muted, high-contrast tile for absent
or failed covers. Render it locally in the reserved image slot. This is a
documented requirement for both consumers; implementation remains pending.

Implemented in the working tree: `asset` catalog entities using the existing
review/revision/reference storage; optional edition cover selection; shared
cover DTO and standalone JSON Schema; local bounded image processing; cited
two-target proposal preparation; ready-release-only exports with byte/hash checks;
usage/redistribution/withdrawal filtering; immutable optional image bundles; and
the twenty-game coverage gate. The additional migration extends the existing
entity-type constraint without granting new access. Historical record hashes and
the names-only feed are preserved.

The owner subsequently authorized preparation of the twenty-game review package.
That research is now in
[`imports/boardgame-marketplace/cover-review/`](../../../imports/boardgame-marketplace/cover-review/README.md):
twenty sourced identity drafts, eighteen proposed representative editions, and
twenty downloaded/inspected official artwork candidates. The separate prepared
manifest preserves all original game/proposal IDs and source hashes. Preserve its
new edition IDs too. Gloomhaven and The Castles of Burgundy still have no selected
edition. Nineteen artwork files pass technical limits; Gloomhaven's newer box,
the low-resolution German-titled Burgundy image, and Season 2's combined black/yellow
image are held. All usage decisions remain unresolved, with no asset records or
cover proposals fabricated. Publisher-specific requests are drafted locally and
**unsent**; sending them is not authorized by the research task.

All twenty identity drafts pass the existing offline importer with zero graph or
evidence errors and twenty expected human-review warnings. The original manifest
remains unchanged, so its existing audit still reports twenty unresolved edition
mappings. Original downloaded bytes, source captures, and an offline contact sheet
are in ignored `.local/cover-research/2026-09-20/`; repository metadata records their
hashes and URLs. The research pass also reran all 44 unit tests successfully and
verified byte hashes, image decoding, local document links and `git diff --check`.
See the packet's validation summary for verification results.

Next unfinished delivery: review/adopt the proposed identities, resolve the two
unknown editions, replace the three held images, and establish actual usage scope.
Then prepare cited cover proposals for human review, publish and host approved
assets, and add cover display using explicit consumer identity crosswalks.
`npm run audit:covers` reports 4 legacy files, 0 complete legacy provenance entries,
and 20 unresolved edition mappings. No real covers were approved or published.
The R2 service, public serializers, CDN withdrawal enforcement and application
display are still absent. Follow the exact acceptance steps in the specification;
do not count placeholders or unverified files as launch coverage.

Verification from the preceding cover implementation session:

- TypeScript checks, generated OpenAPI/name/cover schema checks and all **44 unit
  tests** passed. The name snapshot's byte/identity regression tests still pass.
- All **31 database/workflow tests** passed on fresh native PostgreSQL **14.24**
  and disposable local Supabase PostgreSQL **17.6** databases. Supabase advisors
  reported no warning/error issues on the disposable database. Test databases
  were removed by the runner.
- The production Next.js build passed. No new public routes were added.
- Applied the sole pending migration, `20260921041801_cover_assets.sql`, to this
  project's local Supabase database after checking its migration history. No
  game/image records were imported or approved. Other local stacks were preserved.
- `git diff --check` passed. Existing unrelated changes remain in the worktree.
  No deployment, publication, remote CI run, or consumer cover-display verification
  is implied by these checks.

## Instructions for the next session

When the user supplies this file or its path as the prompt, **resume from the next
unfinished task below**. The preceding owner request was to connect this project to
**boardgame-exchange**, the Django application. That local connection is implemented
and adopted: read the [Exchange consumer brief](../../consumers/boardgame-exchange.md) and
its sibling `docs/SESSION_HANDOFF.md`. Its collection flow now searches the same
4,011 catalog names and aliases while typing, with repeatable source-keyed imports.
The existing six sample games, two editions, 28 copies and 28 receipts were preserved.
All 104 backend cases, six new catalog browser groups and nine collection regression groups passed. **The catalog
connection is complete; prioritize the cover capability above.** Its existing
roadmap next calls for deliberate listing publication/editing and browse; this turn
did not implement that slice. The earlier Rails marketplace integration remains
complete, including the approved Codenames link to local ID 13. Do not repeat that
mapping approval, restart M1/M2/M3, expand the reviewed pilot or deploy automatically.
Preserve reserved pilot UUIDs and existing uncommitted work. Follow newer owner direction.

The authorized objective, **M2: contributions and review** in [architecture.md](../../architecture.md), is complete. Application sign-in, current server-session/membership checks, proposal/review commands, forms, and direct HTTP/browser tests are implemented. The accumulated implementation is committed and pushed on `codex/catalog-m2`; current remote `main` was integrated while preserving its newer legacy work. Both GitHub Actions jobs passed, as recorded below. The first-consumer clarification is answered: prioritize name lookup and basic details for `boardgame-marketplace`. Its existing seed titles provide candidate coverage; real facts and game/edition mappings still require evidence and human review.

The owner also requires **Django support and a framework-neutral JSON export**.
The shared artifact/schema, string source IDs, Ruby/Python compatibility fixtures,
and minimal Django import example are implemented and verified. Keep Rails/Django local primary
keys and ORM formats in their adapters. Rails remains the first full application
integration; `boardgame-exchange` is now the selected and integrated Django application.

Start by doing the following:

1. Read the active repository instructions, inspect `git status` and the current branch, and preserve the local artifacts described below. Check the implementation before assuming the handoff is still current.
2. Read the [Exchange consumer brief](../../consumers/boardgame-exchange.md), the sibling Exchange handoff, [name snapshot guide](../../name-snapshot.md), [development guide](../../development.md), and [approved identity rules](../../decisions/001-catalog-identity.md). Consult the editorial/importer guides when changing those workflows. Use the Supabase skill for Supabase work when relevant and verify current documentation before implementation.
3. The name exporter is offline and runtime search is in the Rails/Django consumers; a running Supabase stack is not required for every task. If editorial/database verification is needed, check Docker and this project's services, using configured `5532x` ports. Preserve the other project's stack on `5432x`.
4. Follow the updated queue below. Reuse the existing contracts, domain validators, and SQL migration workflow. Use synthetic data for development and permission tests. The checked-in test scripts remove their synthetic data; never reset the working database as a test shortcut.
5. Run the checks appropriate to the changes, update this handoff with the actual results and next unfinished task, and report what was implemented and what remains.

Carry these decisions and boundaries forward:

- The game/edition rule is approved. Do not ask for that confirmation again. See the identity decision for the exact rule and examples.
- The original Docker/WSL blocker is resolved. Investigate any new runtime failure using current evidence; do not repeat the old setup request by default.
- Existing YAML remains authoritative. The MVP may derive a clearly identified legacy name feed from it for local marketplace search. This does not approve editorial revisions or classify legacy filenames as canonical game/edition identities. Bulk migration, publication, production cutover, and deployment remain later work.
- Browser roles have no internal table access. Verify authenticated identity, current session, current maintainer membership, and per-command ownership on the server. Generic updates must not approve or publish.
- Preserve unrelated local artifacts and existing uncommitted changes. Work is on `codex/catalog-m2`; do not merge it into `main` or deploy without owner direction. Use the current verification section below rather than the earlier sessions' historical commit/CI status.
- Ask only for missing information that materially affects the current work. Do not ask for the first consumer again. The working field scope is recorded in the consumer brief; distribution terms, hosting, and other later decisions need not block local importer preparation.

The latest owner request prioritizes cover images. Preserve the earlier
simplified contribution intake: contributors submit a name or note immediately;
structured evidence work belongs to maintainer preparation. Search integration
does not require expanding contribution forms.

## Where the project stands

M1's contract/storage foundation, M2's local contribution/review workflow, and M3's importer preparation are implemented alongside the legacy project. The existing YAML records remain authoritative for detailed game data; `games.db` remains a derived read cache. The importer was tested with synthetic data; a separate twenty-game cover-review manifest now contains real sourced identity drafts validated offline. No real records were imported, approved, or published. Synthetic approvals used for verification were removed afterward. Migration cutover and publication remain unimplemented.

The name snapshot and Rails search integration are **implemented and locally
verified**. The existing development database is now migrated and synced with 4,011 local
games. All 20 previous games and their metadata/associations were preserved. The
local Rails MVP stopping point has been reached. The subsequent Django connection
is also implemented; see the latest section below.

The dated sections below preserve earlier session results. Their statements about uncommitted work and unverified remote CI describe those sessions; September 20's integration and verification section records the current state. The September 18 project review remains a baseline at `b8b2d7f`, not an audit of the newer legacy records incorporated from remote `main`.

Start with the [development guide](../../development.md), the [M1 identity rules](../../decisions/001-catalog-identity.md), and the [architecture specification](../../architecture.md). The [existing-project review](project-review.md) preserves the pre-migration baseline. The [legacy documentation index](../../legacy/README.md) contains the previous guides and backlog, which describe the original implementation and may be stale.

## Requirements confirmed by the owner

- The catalog should be reusable across other boardgame applications.
- Stock front-cover images are essential for most consumers and are now a priority;
  applications can opt out. Image-enabled launch acceptance requires complete
  eligible coverage of the selected launch set (September 20 follow-up).
- The name export must be framework-neutral and support both Rails and Django;
  consumer-specific models and primary keys must not shape the shared JSON.
- Boardgame users should submit corrections and new games through simple web forms.
- Contributions need a quality-control/approval gate, similar to an open-source project's review process.
- The first consumers are a few of the owner's applications; traffic is not yet known.
- The first selected consumer is **boardgame-marketplace**, primarily needing names and a few basic details (September 20). Name lookup, year, publisher, player counts, and play time are the working scope derived from its existing code; advanced filters are not an owner requirement.
- The immediate MVP is **suggestions updating while typing, for local marketplace development first** (September 20 follow-up). Name/alias coverage and selectable local identities take priority. Optional details, the full reviewed pilot, and publication can follow after marketplace work resumes.
- The second selected consumer is **boardgame-exchange**, the Django application; its local name/alias search and physical collection integration are now complete (September 20).
- Data changes are expected to be infrequent enough for caching to be useful.
- Start with a small amount of data and prove the approach before expanding.
- Write the architecture specification before implementing, and collect old documentation under `docs/`.

## Proposed design recorded in the spec

The owner authorized M1 implementation and continuation toward M2, starting with the policy and environment checks. The following remain the architecture's overall direction; the M1 subset and M2 preparation described below exist, and detailed defaults have not all received separate approval:

- TypeScript/Next.js, Supabase PostgreSQL and Auth, Zod contracts, typed database access, and a durable publication worker.
- One authoritative editorial database after an explicit migration cutover.
- Stable game/edition identities, sources supporting facts, and attributed assessments separate from personal application data.
- Separate submitted proposals, approved immutable revisions, and published releases.
- A cached REST API and complete SQLite/JSON releases, with consumers able to pin a release.
- Approximately 50 reviewed game-level entries plus the necessary editions, identities, taxonomy, and evidence.
- The owner as initial maintainer; explicit human review of AI-generated submissions.

The architectural spec contains the exact workflow, conflict checks, cache policies, and publication recovery rules. Its throughput/latency figures are proposed test targets; no capacity benchmark has been performed.

## M1 implementation

- A root npm workspace with pinned packages and a committed-ready lockfile; the legacy `web/` package remains separate.
- Strict shared record and command schemas in `packages/contracts`: stable UUIDs, aliases, editions, expansions, unknown facts, sources/evidence, assessments, merge tombstones, proposal versions, and a consistent summary contract.
- Graph validation and reference extraction in `packages/domain`: typed/resolved references, edition ownership, play contexts, external-ID uniqueness, compatibility direction, and merge cycles. Canonical content hashes preserve string identity and array order.
- A CLI-created migration under `supabase/migrations`: editorial identities, submissions, approvals, revisions, evidence and mappings, plus separate release membership and frozen read documents. Foreign keys bind revisions to the right entity; immutable targets must match their submission; ready releases cannot be edited. Browser roles receive no internal access, and reader/editor/publisher capabilities are separate.
- Drizzle query mappings and an internal transactional revision writer in `packages/database`. These do not implement authenticated approval commands; M2 must add session/ownership checks, evidence sufficiency, dependency locks, stale-base checks, and idempotency.
- A Next.js application shell in `apps/catalog` on port 3100. This was initially a shell; M2 adds the editorial endpoints and forms described below.
- Fifteen synthetic entity fixtures, 17 contract/domain tests, and 14 PostgreSQL integration tests. Numeric identity is checked across JSON, PostgreSQL, and in-memory SQLite; a complete SQLite exporter remains M4.
- A generated OpenAPI 3.1 schema artifact with no HTTP paths, checked for drift, and a CI workflow configured to run checks against PostgreSQL 17.

Verification: `npm run check` and `npm run build` passed. The 31 tests ran successfully against the native PostgreSQL 14.24 installation, and `npm run test:db -- --advisors` returned no advisor issues at warning/error level. The fresh-database runner removes its temporary cluster after use. CI is configured but has not run remotely.

The original M1 verification used native PostgreSQL because Docker's WSL integration was unavailable. That environment gap was resolved during the M2 preparation below.

The owner confirmed the game/edition boundary September 19, 2026: translations/reprints/modest updates are editions of the same game; substantial independently playable redesigns get separate game IDs linked to the original. Ambiguous cases require a documented maintainer decision. Concrete synthetic examples are in the approved identity decision. No actual identities have been classified or imported under this policy yet.

## M2 preparation — September 19, 2026

- The owner enabled Docker Desktop integration for WSL distribution `pine`. The catalog's configured local stack started successfully, and `npm run db:migrate` confirmed the foundation migration is applied.
- Another project's Supabase stack uses the default ports. The catalog now uses API 55321, PostgreSQL 55322, Studio 55323, and local mail 55324. The other project's containers were preserved. The catalog stack is left running for development; `npm run db:stop` from this repository stops it without resetting its data.
- Added `npm run test:supabase` with pinned Supabase SDK 2.116.0. It verifies PostgreSQL 17 and migration history, browser database-role isolation, real Auth sign-in/server verification/refresh/sign-out, invalid-token rejection, and direct anonymous/authenticated HTTP denial for internal schemas. Its temporary Auth account was removed; it changes no catalog records.
- All 14 database integration tests passed on the local Supabase PostgreSQL 17.6 server using a disposable database, and advisors reported no issues at warning/error level. The native PostgreSQL 14.24 path, all 17 contract/domain tests, contract drift checks, type checks, and production build also passed.
- The Supabase `postgres` login could create roles but could not assume the catalog roles. The test runner now detects this before running permission tests; use the local `supabase_admin` test connection documented in the development guide. No existing role memberships were widened. The expected preflight-failure path also cleaned up its disposable database.
- CI now includes the local Supabase/Auth checks and disposable-database tests alongside the existing PostgreSQL 17 job. GitHub reported no workflow runs; remote CI remains unverified because the work is still uncommitted and unpushed.

The policy and local environment prerequisites were complete at the end of preparation. The application features that were still missing then are implemented in the following section.

## M2 implementation — September 19, 2026

- Added the CLI-created `20260919230051_contributions_and_review.sql` migration, applied to this project's local stack. It adds private maintainer membership, validation/decision records, proposal events, comments, reports, actor-scoped idempotency results, and a durable mutation limiter. Every new table uses RLS; browser roles retain no internal access.
- Added a private, owner-authorized `session_status` view limited to session ID, user ID and expiry. The application can read it and current membership but cannot grant membership, query Auth users/secrets, or access publication storage. No broad Auth table grants or new definer functions were introduced.
- Added `packages/server` and Node route handlers under `/api/editorial/v1`. They verify the exact JWT with Supabase `getUser`, its subject/expiry/session ID, live server session, current membership, and ownership. They accept Bearer authentication only, reject cross-origin browser calls, cap bodies at 256,000 bytes, rate-limit mutations to 60/account/minute, and return private uncached responses. Cookie values and editable JWT metadata cannot authorize commands.
- Implemented versioned drafts, immutable submission snapshots, attributed withdrawal/revision events, evidence coverage and explicit uncertainty checks, duplicate-name warnings, comments/reports, changes requested, rejection, and terminal approval. Approval is tied to the exact submitted hash and reviewed validation ID; self-review is recorded. Existing citations carry forward only for unchanged content.
- Implemented atomic multi-target approval with a conservative pilot-wide advisory lock and deterministic entity row locks, full approved-head dependency snapshots, stale-base conflicts, immutable sources, identifier claims, revision/reference/evidence writes, and idempotent review retries. A later approval invalidates earlier dependency context and requires fresh validation. The full graph/context is available to the reviewer. This favors correctness for a small pilot over high concurrent write throughput.
- Built `/contribute`: password sign-in/sign-out, sourced base-game-plus-edition additions, edition player/time/age corrections, optional-source problem reports, draft editing/submission/status, comments, and maintainer review with before/after values, evidence and decision reasons. Exact and open-ended player support and separate play contexts are preserved. Ambiguous identities/expansions use reports; richer domain shapes are accepted through the typed commands. Public signup/recovery and outgoing mail are not implemented.
- Added `setup:local`, which created `catalog_app_local` with only the editor capability and a mode-600 ignored `apps/catalog/.env.local`. The file contains local runtime credentials and must never be staged. No permanent Auth account or initial maintainer was guessed/created. The local Studio can create an account; `npm run setup:local -- grant USER_UUID 'Owner of the catalog'` grants membership to an existing local user. The corresponding `revoke` command takes effect without token refresh.
- Expanded the contract artifact to version `0.2.0` with editorial HTTP paths and commands. `ReviewProposalCommand` now requires `validation_id`; this is an intentional pre-release contract change. Public release paths remain unimplemented. TypeScript source imports now resolve consistently in `tsx` and Next.js/Turbopack.
- Added `test:editorial` with real Next.js HTTP requests and real Supabase Auth, plus pinned Playwright `test:browser`. The browser test adds and approves a synthetic game and edition, submits a player-count correction, requests changes, revises/resubmits it, approves it, checks a narrow mobile viewport, and signs out. Synthetic records/accounts/roles are removed using exact generated IDs. The development stack and the other project's containers are preserved.

Verification results are recorded in the final verification block below. Remote CI has been expanded to run the browser workflow but remains unverified because no commit or push was made. The local application is configured; test servers were stopped after verification.

### Final M2 verification

- `npm run check` passed: type checking, **20 contract/domain tests**, generated OpenAPI drift checking, and **27 database/workflow tests** against a fresh native PostgreSQL **14.24** cluster. The cluster was removed afterward. Unit tests use Node's `--test-isolation=none` so restricted child-process environments cannot misleadingly report only file-level successes.
- The same **27 database/workflow tests** passed on a disposable local Supabase PostgreSQL **17.6** database. Advisors reported no issues at warning/error level, and the disposable database was removed.
- `npm run test:supabase` passed against the running local services and both applied migrations. Its temporary account was removed.
- `npm run test:editorial` passed real HTTP authorization/session tests. The final `PLAYWRIGHT_CHANNEL=chrome npm run test:browser` also passed the complete form/review workflow, mobile overflow check and sign-out, then repeated the real Auth revocation checks. All synthetic proposals, approvals, records, accounts and temporary test logins were removed. Local screenshots are optional diagnostics at `/tmp/catalog-review.png` and `/tmp/catalog-contribution-mobile.png`.
- `npm run build` passed with the configured local environment. The build includes the home page, contribution workspace, and dynamic editorial route handler.
- Documentation links and whitespace checks passed. `apps/catalog/.env.local` is ignored and has mode 600.
- **Still unverified:** remote GitHub Actions, hosted deployment, real editorial review, public read API/publication/export behavior, and a consuming application's adoption. None is implied by these local checks.

## Manual demo preparation — September 19, 2026

After M2 verification, the owner asked for help demoing the project and suggested
tests. The local Next.js development server was started at
<http://127.0.0.1:3100/contribute> and left running for that demo.

- Two separate local demo accounts were created: a contributor and a maintainer.
  Their generated credentials and UUIDs are in the ignored, mode-600
  `.local/demo-accounts.json`. These accounts are intentionally retained for the
  owner's manual demo; do not confuse them with temporary automated-test accounts.
  No email was sent. Their sign-ins and server permissions were checked, and the
  verification sessions were signed out afterward.
- Added [docs/demo.md](../../demo.md), with a 15–20 minute walkthrough and suggested
  validation, conflict, ownership, evidence-review, and usability checks.
- Added fictional source documents at `/demo/harbor-rules.txt` and
  `/demo/harbor-solo-addendum.txt`. Both routes and the contribution page returned
  HTTP 200. The rules support 2–4 players; the addendum extends the same edition to
  one player. They are explicitly labeled fictional demonstration material.
- No catalog records were preloaded. The owner will create Demo Harbor through
  the form. Preserve any manual demo proposals or approvals that appear later;
  the automated test scripts remove only their own generated records.

The earlier zero-record/account cleanup report describes the automated M2 test
run. The retained manual demo accounts above are a subsequent, intentional change.
No commit or push was made.

## Simplified contribution UX — September 19, 2026

The owner demoed the forms and explicitly asked to remove the structured-data
burden from contributors. This supersedes the original contributor-form scope
in the earlier M2 implementation and demo notes.

- **Add a game** requires only a name. **Suggest a correction** and **Report a
  problem** each require only a general note. All send immediately, with a receipt
  and persisted contribution status; no separate draft/submit step.
- **+ Add more information** offers optional plain-text categories for notes,
  links/sources, edition/version, players/time/age, credits, or other information.
  No source metadata, record selection, URL format, or numeric format is required.
  Input is preserved verbatim; whitespace-only essential input is rejected.
- Each form keeps its unsent text while switching modes during the visit. Failed
  sends retain text, and retry IDs prevent duplicates even if a committed
  response is lost. Unsaved forms are not persisted across page reloads.
- Added private `editorial.contributions` storage using CLI-created migration
  `20260920005727_quick_contributions.sql` (UTC timestamp), applied locally without
  resetting data. Raw input is immutable to the app; archive/reopen columns are
  the only mutable fields. Browser roles still have no internal access.
- Added contribution send/list and maintainer-only triage endpoints, with live
  session checks, ownership, current membership, payload limits and rate limits.
  Contract version is now `0.3.0`; existing proposal/report endpoints remain.
- Maintainers have a contribution inbox, Archive/Reopen actions, and a collapsed
  **Prepare a catalog change** editor that can copy a raw name and notes for
  manual preparation. Existing draft owners can still revise their proposals.
  Evidence validation and transactional catalog approval remain unchanged.
- Raw intake does not create catalog records. Automated parsing/enrichment is
  not implemented; text is available for later backend processing and current
  maintainer review. A prepared proposal is not persistently linked to intake,
  and intake is archived manually after handling. Inbox pagination and full
  triage event history remain future work.
- Updated `docs/demo.md` with a short contributor demo, optional maintainer
  approval demo, and checks for minimal input, messy text, retry, privacy, and
  mobile use. Updated architecture, API, development and handoff documentation.

Verification: TypeScript, **21 contract/domain tests**, generated contract drift,
**28 database/workflow tests** on both disposable PostgreSQL **14.24** and **17.6**
databases, database advisors (no warning/error issues), real Supabase Auth/Data
API smoke tests, Chrome browser/HTTP tests, and production build all passed.
The browser checks cover name-only games, one-note correction/report, rough
optional text, form-switch retention, a committed response lost in transit and
retry without duplication, archive/reopen, maintainer preparation, the existing
approval/correction/changes-requested workflow, mobile overflow, and sign-out.
Synthetic data/accounts were removed; manual demo accounts and user records were
preserved. Mobile screenshots are in `/tmp/catalog-quick-contribution-mobile.png`
and `/tmp/catalog-contribution-mobile.png`; review is `/tmp/catalog-review.png`.

The dev server is restarted at <http://127.0.0.1:3100/contribute> for the owner to
continue demoing. Supabase remains running. No commit, push, or deployment was
made. Remote CI remains the next unfinished verification step as described above.

## M2 commit and CI verification — September 20, 2026

- Reviewed and committed the accumulated catalog implementation, tests, workflow,
  lockfile, and documentation moves as `134f1b2` on `codex/catalog-m2`.
- The old `jonnyallred/boardgame-database` remote redirects to
  `Lehi-Innovation/boardgame-database`. Fetched its newer `main` (`c557ab1`) and
  integrated it in `0b2eb8f`. Preserved all upstream legacy records, image tooling,
  web changes, and marketplace drafts. All eight relocated legacy documents match
  current remote contents exactly. The sole merge conflict was `.gitignore`;
  both projects' rules were retained.
- Excluded local environment/demo credentials, `pipeline_cache.db`, and generated
  files. Added an ignore rule for Next.js-managed `next-env.d.ts`, as instructed
  by the installed Next.js documentation. Both credential files retain mode 600.
  The Python bytecode ignore rule arrived from remote `main`.
- Re-ran `npm run check`: **21 contract/domain tests** and **28 database/workflow
  tests** passed on disposable native PostgreSQL **14.24**, with type checking
  and OpenAPI drift verification. The same 28 database tests passed on disposable
  Supabase PostgreSQL **17.6**; advisors reported no issues.
- Real Supabase Auth/Data API checks, the Chrome browser/HTTP workflow, and the
  production build passed. Cleanup verification found zero temporary test accounts,
  temporary application roles, or disposable databases. The two manual demo
  accounts and three owner-created raw contributions remain.
- **Remote CI passed:** [GitHub Actions run 35498636151](https://github.com/Lehi-Innovation/boardgame-database/actions/runs/35498636151)
  at `0b2eb8f` completed successfully in both jobs. `verify` passed clean dependency
  installation, type checking, 21 contract/domain tests, contract drift, 28 database
  tests on PostgreSQL **17.11**, and the production build. `supabase` passed local
  startup/migrations, Auth/Data API tests, Chromium browser/HTTP tests, and 28
  database tests on PostgreSQL **17.6** with clean advisors and cleanup.
- The local demo was restarted and returned HTTP 200 at
  <http://127.0.0.1:3100/contribute>. Both projects' Supabase stacks remain running.
- No hosted deployment, publication, main-branch merge, or pilot import was made.
  The subsequent first-consumer decision is recorded below.

## First consumer confirmed — September 20, 2026

The owner selected `boardgame-marketplace`, saying it mostly needs names and a
few basic details. Read its existing local code at `82bca51` to ground the
[consumer brief](../../consumers/boardgame-marketplace.md): prioritize name lookup,
stable identity, year, publisher, player counts, and play time. Exact fields
beyond names are an implementation interpretation, not separate owner approvals.
The marketplace's twenty seed titles provide initial pilot candidates. Its
application, seed/import commands, and database were not run or changed.

The brief records the mapping and acceptance work needed for later integration,
including preservation of marketplace IDs, explicit game/edition identity,
release-scoped publisher names, and exact player/time semantics. No real pilot
records, importer, public release API, or marketplace adapter were added.

## M3 importer preparation — September 20, 2026

- Added `npm run import:legacy -- plan|save|submit`, documented in the
  [pilot importer guide](../../pilot-import.md). Planning is offline. Save/submit call
  existing authenticated editorial HTTP commands on a loopback app; no new
  database permissions, migrations, approval path, or publication behavior.
- Added a [pinned identity map](../../../imports/boardgame-marketplace/manifest.json)
  and [review sheet](../../../imports/boardgame-marketplace/README.md) for all twenty
  consumer seed titles. The legacy checkout is `f7fb5a9`; the consumer remains
  `82bca51`. Each existing YAML filename has its exact byte hash and reserved
  proposed game/proposal UUIDs. Editions remain unknown and every real mapping
  is pending; do not regenerate these UUIDs during subsequent preparation.
- The pinned YAML 2.9.1 parser preserves lexical numeric IDs, rejects ambiguous
  or unsupported YAML, and reports unverified facts and unmapped terms. It never
  promotes legacy values into assertions, copies personal values into reports,
  or fetches source URLs. Existing external IDs are string clues only.
- Explicitly prepared proposals carry source provenance in their hashed
  rationale and retain `origin: import`. Exact repeats and lost responses are
  reconciled through existing proposal details; changed input needs a reviewed
  version/hash baseline before saving another version. Manual edits conflict.
  Terminal proposals require an explicitly prepared successor preserving entity
  IDs and approved base revisions; server submission still rejects stale bases.
- Added eight importer unit tests, one database workflow test, and real HTTP
  importer coverage. `npm run check` passed **29 unit tests** and **29 database
  tests** on disposable PostgreSQL **14.24**, plus types and contract drift.
  The same 29 database tests passed on disposable Supabase PostgreSQL **17.6**;
  advisors found no issues. Real Supabase Auth/Data API and editorial HTTP tests
  passed, including lost-response importer recovery and ownership checks.
  The production build, local documentation links, and whitespace checks also
  passed. Synthetic test data/accounts/roles and disposable databases were removed.
- The offline plan reproduces all twenty candidates; the optional report is
  `/tmp/catalog-pilot-plan.json`. Both existing Supabase stacks remain running.
  The previous demo server was already stopped; test servers stop on cleanup.
  Use `npm run dev` when another manual demo is needed.
- No real pilot import, catalog approval, marketplace write, hosted deployment,
  commit, push, or remote CI run was performed for these changes. The prior M2
  CI result does not verify this new local work. Research, preparation, human
  approval, the larger pilot, publication, and consumer adoption remain open.

## Marketplace search MVP reprioritization — September 20, 2026

The owner asked to prioritize a minimal viable product so marketplace work can
resume, specifically live-updating search suggestions, and confirmed local
development first. The [MVP plan](marketplace-search-mvp.md) replaces the prior
research-first immediate queue while retaining the long-term architecture.

- Read the marketplace at `82bca51` and its already available `origin/main`
  (`7f31f91`, eleven commits ahead) without changing its checkout. Core search
  already has a Rails endpoint, local PostgreSQL trigram search, a 200 ms
  debounced Stimulus controller, and keyboard selection. It requires local
  numeric `Game.id` for detail/collection/listing/want/bid associations.
- Plan to export a narrow, versioned name/alias snapshot from current YAML,
  then synchronize through stable source-to-local ID links and reuse Rails
  search. A separate running catalog service, new public API, publication
  worker, or fifty-game review is not required. The legacy feed remains distinct
  from approved catalog releases and does not use reserved UUIDs as approved IDs.
- The owner subsequently specified Django support. The same UTF-8 JSON artifact
  must work in Ruby and Python with a standalone schema and shared fixtures.
  Include a minimal Django management-command import example and repeat-import
  verification; full integration of a second Django app is not the current task.
- Read-only data scan: **4,013 files with nonempty lexical names**, **1,384 valid
  alias strings**, and **19 malformed alias entries** across 19 files. There
  are six numeric-only names and four duplicate normalized title groups. Report
  malformed aliases; preserve names and separate source identities. These are
  structural observations, not verification of the real-world facts.
- Additional integration work: preserve existing Rails IDs through repeat sync,
  handle nullable metadata/placeholders, add alias matching, prevent late
  requests from replacing current results, wire `/games` autocomplete, and
  replace full-list want/bid selectors with the shared picker. The MVP path
  must not depend on BGG. Broader marketplace business logic remains there.
- Stop the catalog MVP when search/selection → collection/listing and want/bid
  flows work, repeat sync is safe, and a failed sync leaves search available.
  Resume marketplace feature work then. Research/approval, full releases, and
  the sourced-correction demonstration follow later.
- This planning pass changed documentation only and inspected local code/data.
  No marketplace files/database, application behavior, running services, or
  catalog records changed. Documentation links/whitespace were checked. The
  previous implementation tests are not a verification of this unbuilt MVP.

## Name export and marketplace implementation — September 20, 2026

- Added `npm run export:names`, the standalone
  [JSON Schema](../../contracts/name-snapshot.schema.json), deterministic atomic bundles,
  provenance/omission reports, and the [name snapshot guide](../../name-snapshot.md).
  No YAML, `games.db`, editorial records, or reserved pilot UUIDs changed.
- The real bundle is
  `.local/name-snapshots/sha256-39db86a40621b7176d9a63c6f8104a2a2cd7d5067bf3afee7e9422b950f7cd9e/`.
  It has **4,011 records**, **1,294 deduplicated aliases**, **19 malformed alias
  omissions**, and **two deferred Citadels rows**, from 4,013 files. Checksum:
  `e74a57664596f684ada382bb3a552df91139b37badf68ef2d7a0e74fa3b250d0`.
  `007` remains a string; the one Unicode filename uses a reversible percent-encoded
  source key. Case/punctuation normalization identifies five collision groups;
  four use distinct legacy-year labels, while Citadels is unresolved.
- Added shared synthetic fixtures, Ruby/Python readers, and an illustrative Django
  management command. Both languages verify identical artifact bytes/values and
  reject checksum, schema-major, numeric-ID, count, and duplicate-ID failures.
  Django **5.2.17** checks explicit mapping, repeat IDs, collection references,
  retained publisher/missing rows, and full rollback after a mid-import failure.
  The added CI compatibility job is configured but has not run remotely.
- `npm run check` passed: types, **35 unit tests**, both schema drift checks, and
  **29 database tests** on disposable native PostgreSQL **14.24**. The offline
  exporter reproduced its immutable bundle on repeat. No Supabase changes were
  needed; previous Auth/browser verification was not rerun for this offline work.
- Prepared the Rails change in `/tmp/catalog-marketplace-mvp`, preserving the
  original checkout while testing. Incorporated its already available newer
  upstream `7f31f91` in that isolated branch. Applied the tested patch to
  `/home/jonny/projects/boardgame-marketplace` on new branch
  `codex/catalog-search-mvp`, leaving `main` at `82bca51`. No commit, push, or merge
  into main was made. The patch is also in `.local/marketplace-search-mvp.patch`.
- Rails now has a unique source-to-local-ID link, explicit reconciliation commands,
  transactional repeat sync, alias ranking, one-character prefix lookup, ten-result
  and 200-character limits, and optional disambiguation labels. Its shared picker
  uses ARIA combobox/listbox semantics, 200 ms debounce, cancellation and generation
  checks, safe text rendering, and the catalog contribution link on no match.
  Browse opens game details; collection/want/bid flows preserve numeric local IDs.
  Missing metadata works. The shared picker no longer calls BGG.
- Fixed issues revealed by selection testing: collection selection was seeing its
  own result as an already-owned game; full-page listing submission received a
  modal-only Turbo response; Rails 7 tests used an ineffective reloading setting.
  Filter requests also cancel stale responses and escape dynamic filter labels.
- Rails **249 regression tests / 989 assertions** passed. **Five Chrome system
  tests / 29 assertions** passed, covering reordered responses, clear/Escape,
  no-match contribution, keyboard selection, safe names, mobile collection →
  listing and want/bid selection. The importer verifies rollback, repeat IDs,
  preserved metadata, and missing-row retention. Tests used disposable databases
  on port **55439**, not the working marketplace database.
- A rolled-back real-data benchmark imported **4,011** records in **21.19 s**;
  repeat sync took **3.57 s**, preserving every ID. Search-service p95 was **43.53 ms**
  (160 queries), and in-process HTTP p95 was **63.22 ms** (80 requests). `Wing`,
  the Catan alias, `7`, `007`, Dune labels, Unicode, and a typo were exercised.
  This is a local warm-database measurement, not a production capacity claim.
- Read-only inspection found **20 existing development games**. The proposed
  explicit crosswalk and review are `.local/marketplace-name-mapping.proposed.json`
  and `.local/marketplace-name-mapping-review.json`. Nineteen candidates agree on
  title, exact slug/filename, and year. **Codenames (local ID 13)** has marketplace
  year **2015** but legacy YAML year **2016**. The owner has been asked whether to
  link the names-only feed to ID 13 while preserving all local metadata, or defer
  it for review. Do not treat elapsed time as an answer. No development migration
  or data sync has been performed while that decision is pending.
- Ruby 3.3 is installed at `/home/jonny/.rbenv/versions/3.3.0/bin`; its three new
  validator gems were installed from already downloaded archives. For this
  session's Python compatibility environment use
  `PYTHONPATH=/tmp/catalog-name-python-deps`; normal setup is in the name guide.
  Screenshots are under `/tmp/catalog-marketplace-mvp/tmp/screenshots/`.
  The disposable PostgreSQL cluster was stopped and removed after verification;
  temporary Rails/Chrome processes exited. Working databases/services were untouched.

## Marketplace development adoption — September 20, 2026

- The owner explicitly approved linking `legacy_yaml:codenames` to existing
  **Game ID 13**, preserving its existing **2015** year and all other metadata.
  This is a names-only legacy source link, not approval of the YAML's 2016 year
  or of a canonical game/edition mapping. The accepted 20-game crosswalk is
  `.local/marketplace-name-mapping.json`; the review file records the decision.
- Saved a private, mode-600 custom-format database backup under
  `.local/marketplace-backups/before-name-sync-9o45g9e0/development.dump` and
  verified its archive index. It contains local application data: keep it ignored
  and do not publish it. Applied only the tested `20260920120000` source-link
  migration to native local `boardgame_marketplace_development`.
- The first sync explicitly linked **20 existing games** and created **3,991**
  missing name records, for **4,011 games and 4,011 source links**. Every field of
  the original 20 game rows remained identical. SHA-256 fingerprints of all rows
  in the other **17 application tables** remained identical, including existing
  collections, listings, wants, bids, and related data.
- A second committed sync created no duplicates, changed no link rows, and kept
  every local ID and application association. Development sync timings were
  **31.50 s** initially and **5.27 s** on repeat. The detailed verification is
  `.local/marketplace-name-sync-verification.json`; the applied reconciliation
  plan is `.local/marketplace-name-plan.json`.
- A temporary corrupted snapshot was rejected for checksum mismatch before any
  write. All game and source-link rows were unchanged afterward, and search
  continued returning the previously synced records.
- Live mobile-browser verification exposed uncached BGG-hosted cover URLs in
  the older seed records. Those requests were blocked during the check. The
  shared image helper now uses placeholders for uncached BGG covers while keeping
  their stored URLs unchanged; locally cached covers still render. Added an
  integration regression test. **250 Rails tests / 995 assertions passed** in a
  uniquely named disposable database, which was removed afterward.
- The subsequent read-only live check passed `Wing` → Wingspan (ID 1), the Catan
  alias → Catan (ID 17), `7` → 7 Wonders (ID 10), string `007`, and Codenames
  (ID 13/year 2015). Mobile touch and keyboard selection opened the correct game
  pages; clearing removed suggestions; mobile pages did not overflow. The final
  run attempted **no catalog-server or BGG requests** and had no browser errors.
  Results and a screenshot are `.local/marketplace-live-verification.json` and
  `.local/marketplace-007-mobile.png`.
- Rails development remains running on <http://127.0.0.1:3000/games>. It uses the
  native local marketplace database, not either Supabase stack. Neither Supabase
  project was changed. No permanent verification account, collection item,
  listing, want, or bid was added to the working development database.
- No commit, push, main-branch merge, editorial approval, publication, or hosted
  deployment was performed. The local search MVP is complete; return to the
  owner's marketplace feature work.

## Prior documentation work

1. Reviewed the code and full game dataset, rebuilt SQLite at a temporary location, and reproduced several integration/data-quality failures. Findings are saved in [project-review.md](project-review.md).
2. Created [architecture.md](../../architecture.md), including the domain model, review gate, permissions, release workflow, API/export contract, pilot migration, and implementation milestones.
3. Created the root [README](../../../README.md) to distinguish current implementation from proposed architecture.
4. Moved eight old documents into `docs/legacy/`, preserving their contents and former relative directory structure. The move includes the former root `CLAUDE.md`, logs, session notes, TODO, and the archive/image/source-list/web READMEs.
5. Added a legacy index and updated current links. Checked moved-file contents against the originals, local documentation links, whitespace, and the architecture's JSON example.

The game records, discovery CSV, schema, scripts, web application, image files, and `.claude/` automation definitions were not migrated or rewritten. The existing `.claude/` research workflow still writes legacy YAML; it does not implement the proposed approval gate.

## Completed foundation and current queue

Implementation and verification of **M2: contributions and review** are complete within the form scope documented above:

1. **Done:** application Auth, live-session verification, server-controlled current membership, ownership, and restricted local credentials.
2. **Done:** proposal transitions, evidence checks, validation context, review decisions, atomic multi-target approval, conflicts, and idempotency.
3. **Done:** contribution/review forms, direct-request permission tests, and the browser correction/review scenario with synthetic data.
4. **Done:** committed and pushed the reviewed change set, integrated newer remote work, and passed both GitHub Actions jobs. See September 20's verification section for the run and exact test results.

**M3 preparation done:** repeatable proposal importer, pinned twenty-candidate
identity map, review sheet, and synthetic verification. See the dated section above.

**Local search MVP complete:** framework-neutral export, Ruby/Python/Django
compatibility, source-keyed Rails import, live search, and selection are implemented,
tested, and adopted by the existing marketplace development database. The owner
approved the Codenames names-only link to local ID 13, retaining its 2015 metadata.
No repeated confirmation is needed. The marketplace runs at
<http://127.0.0.1:3000/games> on `codex/catalog-search-mvp`, based on `7f31f91`;
its `main` remains at `82bca51`. The catalog remains on `codex/catalog-m2`.

**Django connection complete:** `boardgame-exchange` now imports the same snapshot,
serves local name/alias search, and preserves its games, editions, copies and receipts.
See the [consumer brief](../../consumers/boardgame-exchange.md) and the September 20 record below.

**Next work:** return to `boardgame-exchange` feature development, following its
current handoff and P3.4/P3.6 listing publication/editing and browse roadmap. This
connection did not implement listings. Do not automatically restart editorial research,
merge into main, commit/push, or deploy. The reviewed pilot, publication worker,
complete exports and sourced-correction demonstration remain later milestones.
All twenty proposed canonical identities remain pending and reserved.

## Django Exchange connection — September 20, 2026

- Selected the existing Django application without modifying its React prototype.
  Added an additive `catalog.0002_legacy_name_snapshot` migration, local-only import
  command, pinned standalone schema/validator, opaque source links and provenance.
- Imported the unchanged dataset `sha256:39db86a40621b7176d9a63c6f8104a2a2cd7d5067bf3afee7e9422b950f7cd9e`:
  4,011 catalog games plus six retained samples. No reconciliation conflicts.
  Existing accounts, sample games, editions, 28 copies and 28 receipts match the
  pre-import backup. No canonical approval, edition inference or metadata invention.
- Live title/alias word-prefix search ranks exact names first and retains local
  numeric IDs. Unicode, `007`, `7 Wonders`, Catan aliases, separate Dune identities,
  no-match reports, keyboard selection and no-JavaScript forms are covered.
- Transactional imports serialize concurrent syncs, roll back failures, preserve
  richer mapped metadata and keep missing rows. A repeat real import creates no games
  and preserves the full source-ID/local-ID mapping and selected physical copy.
- All 104 backend PostgreSQL tests passed with Ruff/format, Django configuration,
  migration drift and static collection checks. Six new browser groups passed on
  both the temporary test checkout and the installed app's existing database; no
  external requests or page errors. Catalog browser fixtures are cleaned up.
- The existing collection browser suite also passed all nine groups against the
  final code in the disposable checkout. Only its fictional-sample count assertion
  needed adaptation for real catalog matches.
- Implementation and docs remain uncommitted in both repositories. The catalog
  branch remains `codex/catalog-m2`; Exchange retains its preexisting uncommitted
  work on local `main`. Nothing was committed, pushed, merged or deployed.

## Decisions still open

| Decision | Why it matters |
| --- | --- |
| Assessment rubrics | Fixture rubrics are synthetic, not approved editorial standards; the game/edition boundary is confirmed |
| Dataset distribution terms and contributor terms | Determines how a public release can be distributed and credited |
| Public read access | Public, identical approved data is the proposed default; the owner specified initial consumers, not a public launch |
| Hosting provider, domain, and budget | The spec selects a Node web application plus worker but does not provision a host |
| Release retention and exceptional withdrawal policy | Needed before broader external adoption |

Public API access, exact cache TTLs, load-test targets, and initial self-review rules remain documented defaults that can be revised. Local development containers were started; no hosted infrastructure, subscription, outbound notification, or public publication was created.

## Existing implementation notes

- Run `python3 scripts/progress.py 0` from the project root for the legacy queue statistics; these measure matched catalog entries, not verified designs.
- The old UI runs from `web/` with `npm start`; the root `server.sh` starts its development mode. Setup details are in the [archived web guide](../../legacy/web/README.md), but its counts and feature description are historical.
- The current builder replaces `games.db` and can commit partial results on insertion errors. Use a temporary destination for diagnostics rather than rebuilding the working cache just to inspect it.
- PyYAML is required by legacy scripts but absent from their requirements file. This remains unfixed. The new root npm lockfile is now included; the legacy `web/package-lock.json` remains ignored.
- Preserve the project's existing restriction on researching BoardGameGeek. Existing external IDs can be retained without fetching from that source. Publisher, rulebook, and other allowed sources should support pilot facts.
- The archived `CLAUDE.md` is historical documentation, not an active root-level instruction file. Current project direction is documented here and in the architecture spec.

## Working-tree handoff

The M1/M2 implementation and documentation moves are committed and pushed on `codex/catalog-m2`, including integration of remote `main` at `c557ab1`. No merge to remote `main` was made. The canonical repository is `Lehi-Innovation/boardgame-database`; `origin` still uses the working redirect from `jonnyallred/boardgame-database`. `apps/catalog/.env.local` and `.local/demo-accounts.json` are ignored and contain retained local credentials; do not stage or print them.

The checkout started at `f7fb5a9` with the first-consumer brief and its
architecture/handoff updates already uncommitted. Those edits were preserved
and extended. The new importer, pinned map/review sheet, tests, YAML dependency,
lockfile, and documentation are also local changes, not yet committed or pushed.
The later marketplace search reprioritization adds documentation only, including
`docs/marketplace-search-mvp.md`, and changes the next task. The later implementation is recorded above; the marketplace now has its own
local `codex/catalog-search-mvp` branch with tested, uncommitted changes.

Two untracked local artifacts were already present before the work:

- `pipeline_cache.db` — approximately 230 MB of cached research data.
- `scripts/__pycache__/html_preprocessor.cpython-310.pyc`.

They are unrelated to the catalog changes and were not committed. The cache remains untracked; bytecode is now ignored by the preserved upstream rules. Temporary audit files and verification logs under `/tmp` are optional diagnostics and are not required to resume work.

Future sessions should update this handoff when milestones are implemented, decisions change, or a review finding is fixed. Update the continuation instructions and immediate deliverable as well as the factual status so supplying this file remains sufficient to resume the next unfinished task. Record actual verification results and unresolved blockers; do not describe planned work as implemented. Keep the dated review as a baseline and link subsequent fixes rather than silently rewriting historical measurements.
