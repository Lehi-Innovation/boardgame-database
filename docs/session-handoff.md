# Session handoff and continuation prompt — September 19, 2026

## Instructions for the next session

When the user supplies this file or its path as the prompt, **resume from the next unfinished task below**. The owner selected continuation toward M2 and approved the game/edition policy. M2's local implementation and verification are now complete; do not restart Auth or contribution implementation. Begin useful work without asking the owner to choose between implementation, review, or loading context again. Follow any newer user instructions that change this direction.

The authorized objective is **M2: contributions and review**, as specified in [architecture.md](architecture.md). Application sign-in, current server-session/membership checks, proposal/review commands, forms, and direct HTTP/browser tests are implemented. The remaining M2 item is remote GitHub Actions verification after the accumulated local work is committed and pushed. Inspect and prepare the existing change set for that step; preserve unrelated artifacts and secrets. No commit or push was made in this session. Before proceeding into M3 real pilot selection, obtain the first consuming application and its priority lookup/filter needs; do not select or import real records speculatively.

Start by doing the following:

1. Read the active repository instructions, inspect `git status`, and preserve the uncommitted work described below. Check the implementation before assuming the handoff is still current.
2. Read the [development guide](development.md), [editorial API guide](editorial-api.md), [approved identity rules](decisions/001-catalog-identity.md), and the architecture's contribution workflow, approval transaction, permissions, and M2 acceptance criteria. Use the Supabase skill for Supabase work when available, and verify relevant current documentation before implementation.
3. Check that Docker and this project's local Supabase services are available. They passed verification on September 19, 2026, but running processes can change between sessions. Start this project's stack if needed, using the configured `5532x` ports. Preserve the other project's stack on `5432x`.
4. Follow the updated queue below. Reuse the existing contracts, domain validators, and SQL migration workflow. Use synthetic data for development and permission tests. The checked-in test scripts remove their synthetic data; never reset the working database as a test shortcut.
5. Run the checks appropriate to the changes, update this handoff with the actual results and next unfinished task, and report what was implemented and what remains.

Carry these decisions and boundaries forward:

- The game/edition rule is approved. Do not ask for that confirmation again. See the identity decision for the exact rule and examples.
- The original Docker/WSL blocker is resolved. Investigate any new runtime failure using current evidence; do not repeat the old setup request by default.
- Existing YAML remains authoritative. Keep M2 focused on contributions and review; bulk import, publication, production cutover, and deployment belong to later milestones.
- Browser roles have no internal table access. Verify authenticated identity, current session, current maintainer membership, and per-command ownership on the server. Generic updates must not approve or publish.
- Preserve unrelated local artifacts and existing uncommitted changes. No commit or push has been made. Remote CI remains unverified; this does not prevent local M2 implementation.
- Ask only for missing information that materially affects the current work. The first consuming app, distribution terms, hosting, and other later decisions below need not block application Auth and review implementation.

The latest owner-requested change is the simplified contribution intake described below. Preserve it: contributors submit a name or note immediately; structured evidence work belongs to maintainer preparation. The sections below provide the factual project state, prior verification, constraints, and remaining work for this prompt.

## Where the project stands

M1's contract/storage foundation and M2's local contribution/review workflow are implemented alongside the legacy project. The existing YAML records remain authoritative for detailed game data; `games.db` remains a derived read cache. No real records were imported, approved, or published. Synthetic approvals used for verification were removed afterward. Migration cutover and publication remain unimplemented.

Start with the [development guide](development.md), the [M1 identity rules](decisions/001-catalog-identity.md), and the [architecture specification](architecture.md). The [existing-project review](project-review.md) preserves the pre-migration baseline. The [legacy documentation index](legacy/README.md) contains the previous guides and backlog, which describe the original implementation and may be stale.

## Requirements confirmed by the owner

- The catalog should be reusable across other boardgame applications.
- Boardgame users should submit corrections and new games through simple web forms.
- Contributions need a quality-control/approval gate, similar to an open-source project's review process.
- The first consumers are a few of the owner's applications; traffic is not yet known.
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
- Added [docs/demo.md](demo.md), with a 15–20 minute walkthrough and suggested
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

## Prior documentation work

1. Reviewed the code and full game dataset, rebuilt SQLite at a temporary location, and reproduced several integration/data-quality failures. Findings are saved in [project-review.md](project-review.md).
2. Created [architecture.md](architecture.md), including the domain model, review gate, permissions, release workflow, API/export contract, pilot migration, and implementation milestones.
3. Created the root [README](../README.md) to distinguish current implementation from proposed architecture.
4. Moved eight old documents into `docs/legacy/`, preserving their contents and former relative directory structure. The move includes the former root `CLAUDE.md`, logs, session notes, TODO, and the archive/image/source-list/web READMEs.
5. Added a legacy index and updated current links. Checked moved-file contents against the originals, local documentation links, whitespace, and the architecture's JSON example.

The game records, discovery CSV, schema, scripts, web application, image files, and `.claude/` automation definitions were not migrated or rewritten. The existing `.claude/` research workflow still writes legacy YAML; it does not implement the proposed approval gate.

## M2 implementation queue

The local implementation of **M2: contributions and review** is complete within the form scope documented above:

1. **Done:** application Auth, live-session verification, server-controlled current membership, ownership, and restricted local credentials.
2. **Done:** proposal transitions, evidence checks, validation context, review decisions, atomic multi-target approval, conflicts, and idempotency.
3. **Done:** contribution/review forms, direct-request permission tests, and the browser correction/review scenario with synthetic data.
4. **Outstanding:** run the expanded GitHub Actions workflow once these local changes are committed and pushed. Inspect the complete existing change set and exclude unrelated artifacts and local credentials when preparing it. Do not describe local checks as a remote CI run.

Select the first consuming app and its actual lookup/filter needs before choosing the pilot records. The initial end-to-end demonstration is a sourced player-count correction submitted through a form, approved by the owner, published in a release, and adopted by that app while an older pinned release remains unchanged.

These next steps do not require bulk migration. Import, a publication worker, complete public serializers/exports, and deployment follow later milestones.

## Decisions still open

| Decision | Why it matters |
| --- | --- |
| First consuming application and priority queries | Determines pilot coverage and the integration demonstration |
| Assessment rubrics | Fixture rubrics are synthetic, not approved editorial standards; the game/edition boundary is confirmed |
| Dataset distribution terms and contributor terms | Determines how a public release can be distributed and credited |
| Public read access | Public, identical approved data is the proposed default; the owner specified initial consumers, not a public launch |
| Hosting provider, domain, and budget | The spec selects a Node web application plus worker but does not provision a host |
| Release retention and exceptional withdrawal policy | Needed before broader external adoption |

Public API access, exact cache TTLs, load-test targets, and initial self-review rules remain documented defaults that can be revised. Local development containers were started; no hosted infrastructure, subscription, outbound notification, or public publication was created.

## Existing implementation notes

- Run `python3 scripts/progress.py 0` from the project root for the legacy queue statistics; these measure matched catalog entries, not verified designs.
- The old UI runs from `web/` with `npm start`; the root `server.sh` starts its development mode. Setup details are in the [archived web guide](legacy/web/README.md), but its counts and feature description are historical.
- The current builder replaces `games.db` and can commit partial results on insertion errors. Use a temporary destination for diagnostics rather than rebuilding the working cache just to inspect it.
- PyYAML is required by legacy scripts but absent from their requirements file. This remains unfixed. The new root npm lockfile is now included; the legacy `web/package-lock.json` remains ignored.
- Preserve the project's existing restriction on researching BoardGameGeek. Existing external IDs can be retained without fetching from that source. Publisher, rulebook, and other allowed sources should support pilot facts.
- The archived `CLAUDE.md` is historical documentation, not an active root-level instruction file. Current project direction is documented here and in the architecture spec.

## Working-tree handoff

No commit was created. The working tree contains the M1 workspace, migrations, tests, CI, lockfile, documentation, M2 preparation/implementation, and simplified contribution intake described above. Earlier documentation relocations are also still uncommitted: old paths are marked deleted, and their unchanged contents live under `docs/legacy/`. Keep this work distinct from unrelated local artifacts when staging. `apps/catalog/.env.local` is ignored and contains generated local credentials; do not stage or print it.

Two untracked local artifacts were already present before the work:

- `pipeline_cache.db` — approximately 230 MB of cached research data.
- `scripts/__pycache__/html_preprocessor.cpython-310.pyc`.

They are unrelated to the documentation and M1 changes and should not be swept into a commit. Their ignore policy was not changed. Temporary audit files under `/tmp` are optional diagnostics and are not required to resume work.

Future sessions should update this handoff when milestones are implemented, decisions change, or a review finding is fixed. Update the continuation instructions and immediate deliverable as well as the factual status so supplying this file remains sufficient to resume the next unfinished task. Record actual verification results and unresolved blockers; do not describe planned work as implemented. Keep the dated review as a baseline and link subsequent fixes rather than silently rewriting historical measurements.
