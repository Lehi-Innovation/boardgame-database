-- Server-only authorization data. The application can read membership, never grant it.
create table editorial.maintainers (
  user_id uuid primary key,
  active boolean not null default true,
  changed_at timestamptz not null default now(),
  reason text not null check (length(btrim(reason)) > 0)
);
alter table editorial.maintainers enable row level security;
create policy read_membership on editorial.maintainers for select to catalog_editor using (true);
grant select on editorial.maintainers to catalog_editor;

-- Deliberately owner-authorized, private view of three non-secret session fields.
-- This avoids granting the app access to auth.users or session refresh-token secrets,
-- and avoids changing policies on Supabase-managed tables. Never expose via Data API.
create view editorial.session_status with (security_barrier = true) as
  select id, user_id, not_after from auth.sessions;
revoke all on editorial.session_status from public, anon, authenticated, service_role;
grant select on editorial.session_status to catalog_editor;

create table editorial.validations (
  id uuid primary key,
  proposal_id uuid not null,
  proposal_version integer not null,
  submitted_hash text not null,
  validator_version text not null,
  heads jsonb not null,
  result jsonb not null,
  actor_id uuid not null,
  created_at timestamptz not null default now(),
  foreign key (proposal_id, proposal_version, submitted_hash)
    references editorial.proposal_versions(proposal_id, version, content_hash)
);
create index validations_proposal_idx on editorial.validations(proposal_id, proposal_version, created_at);
create table editorial.decisions (
  id uuid primary key,
  proposal_id uuid not null,
  proposal_version integer not null,
  submitted_hash text not null,
  validation_id uuid not null references editorial.validations(id),
  actor_id uuid not null,
  decision text not null check (decision in ('approve','reject','request_changes')),
  reason text not null,
  self_review boolean not null,
  created_at timestamptz not null default now(),
  foreign key (proposal_id, proposal_version, submitted_hash)
    references editorial.proposal_versions(proposal_id, version, content_hash)
);
create index decisions_proposal_idx on editorial.decisions(proposal_id, proposal_version);
create index decisions_validation_idx on editorial.decisions(validation_id);
create table editorial.command_results (
  actor_id uuid not null,
  command text not null,
  idempotency_key uuid not null,
  request_hash text not null,
  result jsonb not null,
  primary key (actor_id, command, idempotency_key)
);
create table editorial.proposal_events (
  id uuid primary key,
  proposal_id uuid not null references editorial.proposals(id),
  version integer not null,
  actor_id uuid not null,
  event text not null,
  created_at timestamptz not null default now()
);
create index proposal_events_proposal_idx on editorial.proposal_events(proposal_id, created_at);
create table editorial.comments (
  id uuid primary key,
  proposal_id uuid not null references editorial.proposals(id),
  author_id uuid not null,
  body text not null check (length(body) between 1 and 10000),
  created_at timestamptz not null default now()
);
create index comments_proposal_idx on editorial.comments(proposal_id, created_at);
create table editorial.reports (
  id uuid primary key,
  author_id uuid not null,
  entity_id uuid references editorial.entities(id),
  body text not null check (length(body) between 1 and 10000),
  sources jsonb not null,
  created_at timestamptz not null default now()
);
create index reports_author_idx on editorial.reports(author_id, created_at);
create index reports_entity_idx on editorial.reports(entity_id);
create table editorial.rate_limits (
  actor_id uuid primary key,
  window_start timestamptz not null,
  count integer not null check (count > 0)
);

do $$ declare table_name text; begin
  foreach table_name in array array['validations','decisions','command_results','proposal_events','comments','reports','rate_limits'] loop
    execute format('alter table editorial.%I enable row level security', table_name);
    execute format('create policy editorial_commands on editorial.%I to catalog_editor using (true) with check (true)', table_name);
    execute format('grant select, insert on editorial.%I to catalog_editor', table_name);
    if table_name <> 'rate_limits' then
      execute format('create trigger immutable before update or delete on editorial.%I for each row execute function editorial.reject_mutation()', table_name);
    end if;
  end loop;
end $$;
grant update on editorial.rate_limits to catalog_editor;
-- Row-lock privilege only; the existing immutable trigger still rejects actual entity updates.
grant update (id) on editorial.entities to catalog_editor;
grant delete on editorial.identifier_claims to catalog_editor;
