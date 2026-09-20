-- M1 storage foundation. SQL migrations are authoritative; Drizzle is a query mapping.
create schema editorial;
create schema catalog;
create schema operations;

do $$ begin
  if not exists (select from pg_roles where rolname = 'catalog_reader') then create role catalog_reader nologin; end if;
  if not exists (select from pg_roles where rolname = 'catalog_editor') then create role catalog_editor nologin; end if;
  if not exists (select from pg_roles where rolname = 'catalog_publisher') then create role catalog_publisher nologin; end if;
end $$;

revoke all on schema editorial, catalog, operations from public;
alter default privileges in schema editorial, catalog, operations revoke execute on functions from public;

create table editorial.entities (
  id uuid primary key,
  entity_type text not null check (entity_type in ('game','edition','person','organization','taxonomy','family','assessment')),
  created_at timestamptz not null default now(),
  unique (id, entity_type)
);

-- Actor UUIDs are server-supplied Auth subjects. Auth/session integration belongs to M2.
create table editorial.proposals (
  id uuid primary key,
  author_id uuid not null,
  state text not null default 'draft' check (state in ('draft','submitted','changes_requested','approved','rejected','withdrawn')),
  version integer not null default 1 check (version > 0),
  submitted_version integer,
  draft jsonb not null check (jsonb_typeof(draft) = 'object'),
  created_at timestamptz not null default now(),
  check (state not in ('submitted','approved','rejected','changes_requested') or submitted_version is not null),
  check (submitted_version is null or submitted_version <= version)
);
create index proposals_author_idx on editorial.proposals(author_id);
create index proposals_queue_idx on editorial.proposals(state, created_at);

create table editorial.proposal_versions (
  proposal_id uuid not null references editorial.proposals(id),
  version integer not null check (version > 0),
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  submitted_at timestamptz not null default now(),
  primary key (proposal_id, version),
  unique (proposal_id, version, content_hash)
);
alter table editorial.proposals add foreign key (id, submitted_version)
  references editorial.proposal_versions(proposal_id, version) deferrable initially deferred;

create table editorial.approvals (
  id uuid primary key,
  proposal_id uuid not null,
  proposal_version integer not null,
  submitted_hash text not null,
  reviewer_id uuid not null,
  reason text not null check (length(btrim(reason)) > 0),
  validator_version text not null,
  created_at timestamptz not null default now(),
  foreign key (proposal_id, proposal_version, submitted_hash)
    references editorial.proposal_versions(proposal_id, version, content_hash),
  unique (proposal_id, proposal_version)
);

create table editorial.revisions (
  id uuid primary key,
  entity_id uuid not null,
  entity_type text not null,
  schema_version integer not null check (schema_version = 1),
  payload jsonb not null,
  payload_hash text not null check (payload_hash ~ '^[a-f0-9]{64}$'),
  approval_id uuid not null references editorial.approvals(id),
  created_at timestamptz not null default now(),
  foreign key (entity_id, entity_type) references editorial.entities(id, entity_type),
  unique (entity_id, id),
  unique (entity_id, id, entity_type),
  unique (approval_id, entity_id),
  check ((jsonb_typeof(payload) = 'object' and payload->>'id' = entity_id::text
    and payload->>'entity_type' = entity_type and payload->>'schema_version' = schema_version::text
    and payload->>'state' in ('active','merged')) is true)
);

create table editorial.proposal_targets (
  proposal_id uuid not null,
  proposal_version integer not null,
  entity_id uuid not null references editorial.entities(id),
  base_revision_id uuid,
  payload jsonb not null,
  primary key (proposal_id, proposal_version, entity_id),
  foreign key (proposal_id, proposal_version) references editorial.proposal_versions(proposal_id, version),
  foreign key (entity_id, base_revision_id) references editorial.revisions(entity_id, id),
  check ((jsonb_typeof(payload) = 'object' and payload->>'id' = entity_id::text) is true)
);
create index proposal_targets_entity_idx on editorial.proposal_targets(entity_id, base_revision_id);

create function editorial.check_proposal_target() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (
    select 1 from editorial.proposal_versions v,
      jsonb_array_elements(v.content->'targets') target
    where v.proposal_id = new.proposal_id and v.version = new.proposal_version
      and target->>'entity_id' = new.entity_id::text and target->'payload' = new.payload
      and (target->>'base_revision_id')::uuid is not distinct from new.base_revision_id
  ) then raise exception 'Target does not match submitted content' using errcode = '23514'; end if;
  return new;
end $$;
create trigger proposal_target_content before insert on editorial.proposal_targets
for each row execute function editorial.check_proposal_target();

create table editorial.approved_heads (
  entity_id uuid primary key references editorial.entities(id),
  revision_id uuid not null,
  foreign key (entity_id, revision_id) references editorial.revisions(entity_id, id)
);

create table editorial.revision_references (
  revision_id uuid not null references editorial.revisions(id),
  field_path text not null check (field_path like '/%'),
  target_id uuid not null,
  target_type text not null,
  relation text not null,
  primary key (revision_id, field_path),
  foreign key (target_id, target_type) references editorial.entities(id, entity_type)
);
create index revision_references_target_idx on editorial.revision_references(target_id, target_type);

create table editorial.sources (
  id uuid primary key,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  check ((jsonb_typeof(payload) = 'object' and payload->>'id' = id::text) is true)
);
create table editorial.revision_evidence (
  revision_id uuid not null references editorial.revisions(id),
  field_path text not null check (field_path like '/%'),
  source_id uuid not null references editorial.sources(id),
  note text,
  primary key (revision_id, field_path, source_id)
);
create index revision_evidence_source_idx on editorial.revision_evidence(source_id);

create table editorial.identifier_claims (
  namespace text not null check (namespace ~ '^[a-z][a-z0-9._-]{0,63}$'),
  value text not null check (length(value) between 1 and 300),
  entity_id uuid not null references editorial.entities(id),
  primary key (namespace, value)
);
create index identifier_claims_entity_idx on editorial.identifier_claims(entity_id);
create table editorial.import_mappings (
  source text not null check (source = 'legacy_yaml'),
  legacy_id text not null check (length(legacy_id) between 1 and 300),
  entity_id uuid not null references editorial.entities(id),
  source_hash text not null check (source_hash ~ '^[a-f0-9]{64}$'),
  primary key (source, legacy_id)
);
create index import_mappings_entity_idx on editorial.import_mappings(entity_id);

create table catalog.releases (
  id text primary key check (id ~ '^r[0-9]{6,}$'),
  state text not null default 'building' check (state in ('building','ready','failed')),
  schema_version integer not null check (schema_version = 1),
  contract_version text not null,
  manifest jsonb,
  created_at timestamptz not null default now(),
  ready_at timestamptz,
  unique (id, state),
  check (state <> 'ready' or (ready_at is not null and manifest is not null and jsonb_typeof(manifest) = 'object'))
);
create table catalog.release_members (
  release_id text not null references catalog.releases(id),
  entity_id uuid not null,
  revision_id uuid not null,
  entity_type text not null,
  primary key (release_id, entity_id),
  foreign key (entity_id, revision_id, entity_type) references editorial.revisions(entity_id, id, entity_type)
);
create index release_members_revision_idx on catalog.release_members(entity_id, revision_id, entity_type);
-- Public documents must snapshot public data; they cannot contain live editorial joins.
-- Search projections, artifact manifests, and a production serializer arrive in M4.
create table catalog.documents (
  release_id text not null,
  entity_id uuid not null,
  document jsonb not null,
  primary key (release_id, entity_id),
  foreign key (release_id, entity_id) references catalog.release_members(release_id, entity_id),
  check ((jsonb_typeof(document) = 'object' and document->>'id' = entity_id::text) is true)
);
create table catalog.current_release (
  singleton boolean primary key default true check (singleton),
  release_id text not null,
  release_state text not null default 'ready' check (release_state = 'ready'),
  generation bigint not null default 1 check (generation > 0),
  activated_at timestamptz not null default now(),
  foreign key (release_id, release_state) references catalog.releases(id, state)
);
create index current_release_target_idx on catalog.current_release(release_id, release_state);

create function editorial.reject_mutation() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception '% is immutable; append a new version', tg_table_name using errcode = '23514';
end $$;

do $$ declare table_name text; begin
  foreach table_name in array array['entities','proposal_versions','proposal_targets','approvals','revisions','revision_references','sources','revision_evidence'] loop
    execute format('create trigger immutable before update or delete on editorial.%I for each row execute function editorial.reject_mutation()', table_name);
  end loop;
end $$;

-- A revision must be exactly a target of its approved submission.
create function editorial.check_revision_approval() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (
    select 1 from editorial.approvals a join editorial.proposal_targets t
      on (t.proposal_id, t.proposal_version) = (a.proposal_id, a.proposal_version)
    where a.id = new.approval_id and t.entity_id = new.entity_id and t.payload = new.payload
  ) then raise exception 'Revision does not match its approved target' using errcode = '23514'; end if;
  return new;
end $$;
create trigger revision_approval before insert on editorial.revisions
for each row execute function editorial.check_revision_approval();

create function catalog.guard_release_child() returns trigger
language plpgsql set search_path = '' as $$
declare parent_state text;
begin
  if tg_op <> 'INSERT' then
    select state into parent_state from catalog.releases where id = old.release_id for update;
    if parent_state <> 'building' then raise exception 'Release is frozen' using errcode = '23514'; end if;
  end if;
  if tg_op <> 'DELETE' then
    select state into parent_state from catalog.releases where id = new.release_id for update;
    if parent_state <> 'building' then raise exception 'Release is frozen' using errcode = '23514'; end if;
    return new;
  end if;
  return old;
end $$;
create trigger freeze_members before insert or update or delete on catalog.release_members
for each row execute function catalog.guard_release_child();
create trigger freeze_documents before insert or update or delete on catalog.documents
for each row execute function catalog.guard_release_child();

create function catalog.guard_release() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op <> 'INSERT' and old.state = 'ready' then
    raise exception 'Ready releases are immutable' using errcode = '23514';
  end if;
  if tg_op = 'INSERT' and new.state <> 'building' then
    raise exception 'Releases must start as building' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' and new.state = 'ready' then
    if exists (
      select 1 from catalog.release_members m
      left join catalog.documents d on (d.release_id, d.entity_id) = (m.release_id, m.entity_id)
      where m.release_id = new.id and d.entity_id is null
    ) then raise exception 'Release is missing public documents' using errcode = '23514'; end if;
    if exists (
      select 1 from catalog.release_members m
      join editorial.revision_references r on r.revision_id = m.revision_id
      left join catalog.release_members target on target.release_id = m.release_id and target.entity_id = r.target_id
      where m.release_id = new.id and target.entity_id is null
    ) then raise exception 'Release contains unresolved references' using errcode = '23514'; end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
create trigger release_guard before insert or update or delete on catalog.releases
for each row execute function catalog.guard_release();

create function catalog.advance_generation() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then new.generation := 1; else new.generation := old.generation + 1; end if;
  new.activated_at := clock_timestamp();
  return new;
end $$;
create trigger release_generation before insert or update on catalog.current_release
for each row execute function catalog.advance_generation();

-- No browser or Supabase Data API role can access internal tables or functions.
do $$ declare role_name text; begin
  foreach role_name in array array['anon','authenticated','service_role'] loop
    if exists (select from pg_roles where rolname = role_name) then
      execute format('revoke all on schema editorial, catalog, operations from %I', role_name);
      execute format('revoke all on all tables in schema editorial, catalog, operations from %I', role_name);
      execute format('revoke all on all functions in schema editorial, catalog, operations from %I', role_name);
      execute format('alter default privileges in schema editorial, catalog, operations revoke all on tables from %I', role_name);
      execute format('alter default privileges in schema editorial, catalog, operations revoke execute on functions from %I', role_name);
    end if;
  end loop;
end $$;
revoke all on all functions in schema editorial, catalog, operations from public;

grant usage on schema editorial to catalog_editor, catalog_publisher;
grant usage on schema catalog to catalog_reader, catalog_publisher;
grant select, insert on all tables in schema editorial to catalog_editor;
grant update on editorial.proposals, editorial.approved_heads, editorial.identifier_claims, editorial.import_mappings to catalog_editor;
grant select on editorial.entities, editorial.revisions, editorial.approved_heads,
  editorial.revision_references, editorial.sources, editorial.revision_evidence,
  editorial.identifier_claims, editorial.import_mappings to catalog_publisher;
grant select, insert, update, delete on catalog.releases, catalog.release_members, catalog.documents to catalog_publisher;
grant select, insert, update on catalog.current_release to catalog_publisher;
grant select on all tables in schema catalog to catalog_reader;

-- Server roles use commands for per-user authorization; RLS also restricts schema capabilities.
do $$ declare table_name text; begin
  for table_name in select tablename from pg_tables where schemaname = 'editorial' loop
    execute format('alter table editorial.%I enable row level security', table_name);
    execute format('create policy editorial_commands on editorial.%I to catalog_editor using (true) with check (true)', table_name);
    execute format('create policy publisher_source on editorial.%I for select to catalog_publisher using (true)', table_name);
  end loop;
  for table_name in select tablename from pg_tables where schemaname = 'catalog' loop
    execute format('alter table catalog.%I enable row level security', table_name);
    execute format('create policy publisher_commands on catalog.%I to catalog_publisher using (true) with check (true)', table_name);
  end loop;
end $$;
create policy ready_releases on catalog.releases for select to catalog_reader using (state = 'ready');
create policy ready_members on catalog.release_members for select to catalog_reader using (
  exists (select from catalog.releases r where r.id = release_id and r.state = 'ready')
);
create policy ready_documents on catalog.documents for select to catalog_reader using (
  exists (select from catalog.releases r where r.id = release_id and r.state = 'ready')
);
create policy current_pointer on catalog.current_release for select to catalog_reader using (true);
