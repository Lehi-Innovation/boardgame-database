# Project status

This is the short status page. The repository was reviewed and locally checked
on **October 24, 2026**. Live editorial data and sibling-application integration
states below retain their earlier verification dates; this review did not query
a running Supabase stack or the sibling applications.

| Area | Current state | Read when needed |
| --- | --- | --- |
| Legacy catalog | `games/*.yaml` is authoritative for detailed records. `games.db` is a derived SQLite read cache for the Express query endpoints. The local cache was safely rebuilt and matched all 4,013 parsed YAML IDs on September 26. | [Legacy app and cache](legacy-app.md) |
| Reviewed catalog | Shared contracts, PostgreSQL migrations, local Auth, contribution forms, and human review commands are implemented. The proposal importer prepares candidates. The last local review reported no real pilot approvals; the public release API/worker remains unbuilt in this repo. | [Architecture](architecture.md), [development](development.md), [editorial API](editorial-api.md), [pilot import](pilot-import.md) |
| Name feed | The offline legacy-name export has a versioned JSON contract. Rails `boardgame-marketplace` and Django `boardgame-exchange` have local adapters in sibling repositories. Their September 20 integrations were verified locally; refresh is explicit, and this repo does not host their search runtime. | [Name snapshot](name-snapshot.md), [consumer notes](consumers/README.md) |
| Cover feed | Contracts, staging, proposal preparation, and frozen-release export exist. The twenty-game review packet contains proposed identities and artwork research. The last local review reported no real cover approvals; publication, hosting, and consumer display through the new feed are not implemented. | [Cover specification](cover-images.md), [review packet](../imports/boardgame-marketplace/cover-review/README.md) |

## October 24 checkpoint

Local verification passed TypeScript checks, generated-contract comparisons,
44 unit tests, 31 database/workflow tests, eight legacy HTTP/security tests,
nine legacy cache tests, and the production Next.js build. Database tests used
disposable native PostgreSQL **14.24**. Docker was unavailable in this WSL
distribution, so this review did not rerun Supabase Auth/Data API, browser, or
PostgreSQL 17/advisor checks. Earlier results are historical evidence only.
The Ruby/Python compatibility suite was not rerun: Ruby and the Django example's
dependencies were unavailable in this environment.

The prepared twenty-game manifest was checked again offline: no preparation
blockers or graph/evidence errors. This does not approve factual claims or
resolve the two unknown editions. The original pending manifest remains intact.

A fresh structural audit matched the [October 1 findings](../audits/2026-10-01/README.md):
all 4,013 YAML files parse and the SQLite cache matches their source digest,
but 146 relationships cannot resolve, six IDs parse as numbers, and the research
log cannot be parsed as one YAML document. Numeric-ID detail lookups fail in the
legacy application; `007` is also stored as `7` in its derived cache. These remain
open fixes. The separate 200-game source-review sample has only eight recorded
reviews and no consolidated ledger; it is incomplete.

The next work is to repair string identity and the research log, then complete
sourced pilot metadata and human review before building release publication.

The [decision index](decisions/README.md) distinguishes approved identity
policy from questions that remain open for later releases.
The [archive](archive/README.md) retains dated reviews, completed plans, and
session notes as evidence of past work; those files are not operating guides.
