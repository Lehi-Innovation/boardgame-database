# Catalog development

The catalog code lives alongside the legacy YAML/SQLite application. The root npm workspace uses `apps/catalog`, `packages/contracts`, `packages/domain`, `packages/database`, and `packages/server`. The legacy `web/` application remains independent. Nothing imports or modifies the production YAML catalog automatically.

## Install and run

Use Node 24 (`.nvmrc`) and install the exact dependency tree:

```sh
npm ci
npm run dev
```

The application runs at <http://127.0.0.1:3100>. Its [contribution workspace](http://127.0.0.1:3100/contribute) provides sign-in, quick name/note submissions, optional plain-text details, a maintainer inbox, and structured catalog preparation/review. The public catalog/release API remains unimplemented. The legacy UI retains its existing commands under `web/`.

## Local Supabase

Install a working Docker-compatible runtime, then run:

```sh
npm run db:start
npm run db:migrate
npm run setup:local
npm run test:supabase
```

The CLI-created configuration targets PostgreSQL 17. Only `public` is exposed through the Data API, with automatic grants disabled. `editorial`, `catalog`, and `operations` are internal schemas. Synthetic fixtures are test data, not local catalog seeds. There is no linked hosted project or deployment configuration.

`setup:local` creates a restricted local database login inheriting only `catalog_editor` and writes its credentials to the ignored, mode-600 `apps/catalog/.env.local`. It preserves existing configuration, prints no keys/passwords, and creates no user accounts. See the checked-in `.env.example` for variable names. Never put an administrative database URL or a Supabase secret key in the application's environment. Source workspaces import TypeScript files explicitly so both `tsx` and Next.js/Turbopack resolve the same code.

For private development, create an email/password account in the local Studio Auth user interface, then sign in at `/contribute`. Grant the owner's Auth UUID membership with the local-only setup command; arbitrary user metadata never grants a role:

```sh
npm run setup:local -- grant USER_UUID 'Owner of the catalog'
npm run setup:local -- revoke USER_UUID 'Membership removed'
```

Membership changes take effect on the next command even with an existing JWT. No initial account is guessed or automatically granted membership. Hosted credential provisioning and public signup/recovery flows remain later work.

Use `npm run db:stop` when finished. New migrations start with `npx supabase migration new <name>`. Keep SQL migrations authoritative; Drizzle declarations map queries and must not independently generate another migration history. Inspect the installed CLI's help before changing its commands or configuration.

On Windows/WSL, Docker Desktop must be running with integration enabled for the working distribution (`pine` on this workstation). Enable it under **Settings → Resources → WSL Integration**, apply, and confirm `docker version` reports both client and server. See [Docker's WSL setup guide](https://docs.docker.com/desktop/features/wsl/).

The catalog uses its own ports so it can coexist with the inventory application's local Supabase stack:

| Service | Local address |
| --- | --- |
| API / Auth | `http://127.0.0.1:55321` |
| PostgreSQL | `127.0.0.1:55322` |
| Studio | `http://127.0.0.1:55323` |
| Local mail viewer | `http://127.0.0.1:55324` |

Shadow database, analytics, and pooler ports are reserved at 55320, 55327, and 55329. Analytics and pooling remain disabled. Run commands from this project root; do not stop or reset another project's containers to free its ports.

`npm run test:supabase` reads credentials directly from this project's CLI status without printing or saving them. It only accepts loopback addresses matching the configured ports, requires PostgreSQL 17 and current migrations, checks Auth sign-in/server verification/refresh/sign-out, and sends anonymous and signed-in HTTP requests that must fail against every internal schema. It creates one temporary Auth account with a generated password, sends no email, and removes the account in cleanup. It never imports or changes catalog data. The test requires running services and is separate from `npm run check`, which can run against plain PostgreSQL.

Sign-out invalidates the server session and refresh token; an issued access JWT can remain valid until expiry. Application commands now check the current server session and server-controlled membership. The service smoke check remains distinct from the application tests. See [Supabase sign-out semantics](https://supabase.com/docs/reference/javascript/auth-signout) and the [editorial API guide](editorial-api.md).

## Verification

```sh
npm run check
npm run build
npm run test:supabase
npm run test:editorial
# Install the pinned Playwright browser once, then exercise the forms:
npx playwright install chromium
npm run test:browser
```

`check` runs TypeScript checks, contract/domain tests, generated-artifact comparison, and database integration tests. Native database tests require PostgreSQL server tools (`initdb`, `pg_ctl`, and `pg_config`). The runner starts a temporary cluster on loopback, applies every migration to an empty database, runs the tests, and stops/removes its cluster. It never resets the working database. Set `PG_BIN` if the server binaries are not beside those reported by `pg_config`.

Alternatively, point `CATALOG_TEST_ADMIN_URL` at a **local** Supabase or PostgreSQL administrative connection. The runner creates a uniquely named `catalog_test_*` database and drops only that database after the checks. Non-loopback URLs are rejected. The administrative role needs permission to create databases and test roles and to `SET ROLE` to `anon`, `authenticated`, and each catalog capability role; these credentials never belong in the frontend. A preflight checks this without altering role memberships.

Supabase's default `postgres` login is not a superuser. On PostgreSQL 16+, creating a role can grant administrative rights without the ability to assume that role. For this project's local Docker stack, use its test administrator and default local-only password:

```sh
CATALOG_TEST_ADMIN_URL=postgresql://supabase_admin:postgres@127.0.0.1:55322/postgres npm run test:db -- --advisors
```

This credential is for disposable local database tests only. Application connections must use the restricted roles described below. See [PostgreSQL role membership](https://www.postgresql.org/docs/17/role-membership.html).

CI provisions PostgreSQL 17 and uses this disposable database path. A separate job starts this project's Supabase stack, runs the Auth/Data API smoke check, and runs disposable-database tests with advisors. On this workstation, both native PostgreSQL 14.24 and local Supabase PostgreSQL 17.6 have passed verification. Record the actual version in validation reports; plain PostgreSQL tests do not replace Supabase Auth/Data API checks. GitHub execution remains unverified until the uncommitted workflow is pushed.

To run the installed Supabase database advisors against the same temporary test database:

```sh
npm run test:db -- --advisors
```

The database tests exercise numeric identities through JSON/PostgreSQL/SQLite, reference types and ownership, exact submitted payloads, immutable revisions, external-ID uniqueness, release completeness, frozen snapshots, and direct database-role restrictions. M2 adds ownership, current sessions/membership, evidence sufficiency, terminal/version rules, dependency conflicts, concurrent idempotency and multi-target rollback. Disposable plain databases contain a minimal Auth-session fixture; this does not replace real Supabase verification. SQLite is in-memory test coverage here; a complete exporter arrives in M4.

`test:editorial` starts a temporary Next.js server using a generated database login with only the editor capability. It creates temporary local Auth accounts and synthetic editorial records, sends real HTTP permission/approval requests, and removes its records, accounts and role afterward. Cleanup targets generated IDs only; it bypasses immutable triggers only inside its administrative cleanup transaction. It never resets the stack or touches YAML. `test:browser` includes those checks and drives minimal game/correction/problem intake, optional rough text, lost-response retry deduplication, inbox triage, and the structured maintainer game/correction approval workflow in Playwright. Use `PLAYWRIGHT_CHANNEL=chrome npm run test:browser` with an existing Chrome installation. Screenshots go to `/tmp/catalog-review.png`, `/tmp/catalog-contribution-mobile.png`, and `/tmp/catalog-quick-contribution-mobile.png`. These tests must not run concurrently with another Next.js dev/build process in this workspace.

Regenerate the checked-in OpenAPI 3.1 schema artifact after intentional contract changes:

```sh
npm run contracts:generate
npm run contracts:check
```

The artifact includes the implemented editorial paths and command schemas. Public release paths remain absent. Use the Zod/domain validators as well as generated JSON Schema: reference and cross-field rules do not all translate to JSON Schema.

## Storage boundaries

`catalog_reader` can read ready release documents and metadata only. `catalog_editor` can access editorial storage, while `catalog_publisher` reads accepted revision data and builds release storage. These are non-login capability roles. The local application login inherits only the editor role; server commands verify Auth subjects, live sessions, current maintainer membership, and ownership. Browser roles have no access to the internal schemas. RLS does not substitute for per-user checks in a pooled server connection.

`insertApprovedRevision` remains an internal persistence helper. `EditorialService.review` wraps it with authorization, full candidate validation, stale-base/dependency locking, evidence preservation, idempotency and atomic approved-head updates. No HTTP route exposes the helper directly.

Publication tables establish M1's storage separation. The M4 publisher still needs a serializer, complete public history and lookup projections, sanitized release documents, artifacts/checksums, durable jobs, and activation commands. A stored `ready` fixture is not a production publication or a demonstrated export pipeline.

## References checked for M1

- [Supabase local development](https://supabase.com/docs/guides/local-development/cli/getting-started)
- [Supabase API security](https://supabase.com/docs/guides/api/securing-your-api)
- [Supabase explicit Data API grants change](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically)
- [Zod JSON Schema generation](https://zod.dev/json-schema)
- [Drizzle schema declarations](https://orm.drizzle.team/docs/sql-schema-declaration)

The local CLI configuration comes from the pinned CLI's `init` output. CLI help and the Supabase changelog were checked before implementation.
