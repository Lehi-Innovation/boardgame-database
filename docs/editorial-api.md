# Editorial commands (M2)

The Next.js application serves `/api/editorial/v1`. Every endpoint requires a Supabase access token in `Authorization: Bearer <token>` and returns `Cache-Control: private, no-store`. Cookies do not authenticate these endpoints. Browser origins must match `CATALOG_APP_ORIGIN`; no cross-origin mutation access is provided. Credentials and email addresses are not returned in editorial results.

The server verifies the exact token with Supabase `getUser`, checks its subject, expiry and session ID, then checks the live session through a private view of `auth.sessions`. Every database command repeats the live-session check. Maintainer membership comes from `editorial.maintainers`, never JWT metadata. The application login can read membership but cannot grant or revoke it. See [Supabase session revocation](https://supabase.com/docs/guides/auth/sessions#how-to-ensure-an-access-token-jwt-cannot-be-used-after-a-user-signs-out) and [getUser](https://supabase.com/docs/reference/javascript/auth-getuser).

Successful responses wrap the result in `{ "data": ... }`. Errors contain `error.code`, `error.message`, `error.request_id`, and optional `error.fields`. Mutations accept JSON, with a 256,000-byte limit. Each account can attempt 60 mutations per minute; excess requests return `429` and `Retry-After: 60`. Unknown command properties are rejected. Query parameters are currently unsupported. The [generated OpenAPI artifact](contracts/openapi.json) describes paths, authentication, and command bodies; response payload details are below.

| Method and suffix | Body / result | Permission |
| --- | --- | --- |
| GET `session` | `{ user_id, maintainer }` | Active account |
| GET `records` | Approved editorial `{ entity_id, revision_id, payload }[]` for contribution lookup | Active account |
| GET `proposals` | Up to 100 newest `{ id, state, version, title, created_at }` entries | Own submissions; maintainers see all |
| GET `proposals/{id}` | Draft, immutable versions, validations, decisions, comments and events; `own` identifies ownership | Owner or maintainer |
| POST `proposals/save` | `SaveProposalCommand`; returns the saved draft | Owner only; version 0 creates |
| POST `proposals/submit` | `SubmitProposalCommand`; returns version, submitted hash, validation ID and findings | Owner only |
| POST `proposals/withdraw` | `WithdrawProposalCommand`; returns withdrawn state | Owner only |
| POST `proposals/validate` | `ValidateProposalCommand`; returns `id`, submitted hash, errors, warnings, before/after changes, and approved `context` | Current maintainer |
| POST `proposals/review` | `ReviewProposalCommand`; returns proposal/version, state, decision ID and nullable approval ID | Current maintainer |
| POST `comments` | `CommentCommand`; returns comment ID | Owner or maintainer |
| GET `reports` | Up to 100 newest reports including optional entity/source context | Own reports; maintainers see all |
| POST `reports` | `ReportCommand`; returns report ID (legacy structured reports) | Active account |
| POST `contributions` | `SendContributionCommand`; returns `{ id }` | Active account |
| GET `contributions` | Up to 100 `{ id, content, state, created_at }` entries, received first then newest | Own contributions; maintainers see all |
| POST `contributions/triage` | `TriageContributionCommand`; returns `{ id, state }` | Current maintainer |

`records` is a private contribution lookup of approved revisions, not a published catalog API. Nothing here creates releases or activates publication. The small pilot reads the complete approved graph; pagination/search and public serializers are later milestones.

## Quick contribution intake

`POST contributions` takes `{ contribution_id, content }`. Content has `kind`
(`game`, `correction`, or `problem`), `name`, `body`, and an optional `details`
array of `{ category, text }`. A game needs only `name`; corrections and problems
need only `body`. Other fields default to empty strings/arrays. Each text value is
limited to 10,000 characters and details to 20 entries; whitespace-only required
text is rejected. Original string contents, including whitespace, are preserved.
Category values are `notes`, `links`, `edition`, `play`, `credits`, and `other`.
These fields accept ordinary text without source, URL, or catalog-fact validation.

The server supplies authorship. Repeating the same normalized command with the
same ID as the same author is idempotent, including concurrent retries. A changed
payload or another author's reuse of the ID returns `409`. The browser retains
its retry ID if a response is lost, and preserves unsent text on failure.

Intake creates no identities, sources, proposals, approvals, or published records.
`editorial.contributions` stores immutable input plus `received`/`archived` triage
status, last triage actor and time. The application can update only those triage
columns; only a currently authorized maintainer can invoke the triage endpoint.
Contributors see their own status; the maintainer sees the inbox. Archiving is a
way to set aside handled or unhelpful input, not a catalog approval or rejection.

The maintainer editor can copy a name and notes into a new proposal for manual
preparation. It does not infer facts, fabricate citations, automatically archive
input, or create a persistent proposal-to-intake link. Automatic parsing,
enrichment, inbox pagination, and a detailed triage history remain future work.
Existing `reports` and proposal commands remain compatible.

## Version and review rules

Saving increments the draft version. Submitting freezes the exact content and hash, appends targets and a validation record, and changes the state to submitted. Editing a submitted version records its withdrawal and starts a new draft; old submissions and decisions remain immutable. Changes requested require saving and submitting a new version. Approved, rejected and withdrawn proposals are terminal.

A reviewer runs validation and sends its `validation_id`, the exact `submitted_hash`, expected proposal version, decision, reason, and an actor-scoped UUID idempotency key. Retrying the same review returns the recorded result. Reusing that key with different content returns `409`; retries still require a current session and membership. Approval records self-review explicitly. AI/import origins receive a human-review warning; no automated approval path exists.

Factual changes require citations at the changed path or an enclosing path. Removing an established fact requires evidence or an explicit uncertainty note. New unknown optional fields need no invented assertions. Unchanged citations carry forward into later revisions; citations addressing changed content do not silently carry over. Sources are immutable. Classification decisions use the attributed proposal rationale and review reason. Duplicate names/aliases produce warnings, while structural graph and evidence failures block submission/approval. Automated evidence checks establish citation coverage; the maintainer must decide whether a source actually supports a claim.

For this small pilot, graph-changing operations use one transaction advisory lock. Approval also locks stable entity rows in UUID order and compares the complete approved-head map with the reviewed validation. This conservative approach catches incoming merge dependencies and external-ID conflicts; even an unrelated approval requires revalidation. A changed target base requires a revised proposal. Approval writes all target revisions, references, evidence, identifier claims, heads, decision, state and idempotency result in one transaction. An injected late-write failure is tested to leave none of those partial writes committed.

## Local application scope

`/contribute` supports password sign-in and one-step name/note submissions for games, corrections, and problems, with optional categories of plain-text information. Maintainers have an inbox and a collapsed structured editor for sourced base-game/edition additions and edition play-detail corrections. Existing proposal owners can still revise their drafts. Comments and transactional maintainer review remain available. Other domain shapes are supported through the typed commands. Account creation uses local Supabase Studio during private development. Public registration, email delivery, account recovery, publication and deployment are not implemented here.

The server-only `editorial.session_status` view deliberately uses its migration owner's access and exposes only session ID, user ID and expiry. It is outside the Data API and granted only to `catalog_editor`. It does not expose Auth users, refresh-token secrets, or general Auth-table access. Other new editorial tables use RLS plus explicit capability grants. Actual user ownership is enforced by commands; a pooled SQL connection does not inherit a browser user's JWT context.

The local configuration does not enable Auth inactivity/time-box or single-session policies. If enabling those later, extend and verify session-policy checks rather than assuming session-row existence alone enforces policies that Supabase may clean up asynchronously.
