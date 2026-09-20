-- Unstructured intake is private and separate from validated catalog proposals.
-- Keep the original content immutable to the application, even during triage.
create table editorial.contributions (
  id uuid primary key,
  author_id uuid not null,
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  state text not null default 'received' check (state in ('received', 'archived')),
  created_at timestamptz not null default now(),
  triaged_by uuid,
  triaged_at timestamptz
);
create index contributions_author_idx on editorial.contributions(author_id, created_at desc);
create index contributions_inbox_idx on editorial.contributions(state, created_at desc);
alter table editorial.contributions enable row level security;
revoke all on editorial.contributions from public, anon, authenticated, service_role;
-- This capability is held only by the server, which verifies live sessions,
-- ownership on reads and retries, and current maintainer membership on triage.
create policy editorial_commands on editorial.contributions to catalog_editor using (true) with check (true);
grant select, insert on editorial.contributions to catalog_editor;
grant update (state, triaged_by, triaged_at) on editorial.contributions to catalog_editor;
