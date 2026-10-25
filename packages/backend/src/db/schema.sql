create extension if not exists pg_trgm;

create table if not exists secop_sources (
  id text primary key,
  dataset_id text not null,
  name text not null,
  last_success_at timestamptz,
  last_attempt_at timestamptz,
  last_error text
);

create table if not exists secop_processes (
  id text primary key,
  source text not null,
  external_process_id text not null,
  process_reference text,
  portfolio_id text,
  entity_name text not null,
  entity_nit text,
  title text not null,
  subject text,
  phase text,
  source_status text,
  source_opening_status text,
  publication_date timestamptz,
  last_source_publication_date timestamptz,
  closing_date timestamptz,
  closing_date_confidence text not null default 'absent',
  estimated_value numeric,
  currency text not null default 'COP',
  modality text,
  department text,
  municipality text,
  main_category_code text,
  contract_type text,
  source_url text,
  computed_status text not null,
  computed_status_confidence text not null,
  fingerprint text not null,
  payload jsonb not null,
  synced_at timestamptz not null default now(),
  search_text tsvector generated always as (
    to_tsvector('spanish', coalesce(title, '') || ' ' || coalesce(subject, '') || ' ' || coalesce(entity_name, '') || ' ' || coalesce(external_process_id, ''))
  ) stored,
  unique (source, external_process_id)
);

create table if not exists secop_process_versions (
  id bigserial primary key,
  process_id text not null references secop_processes(id),
  fingerprint text not null,
  payload jsonb not null,
  detected_at timestamptz not null default now()
);

create table if not exists secop_process_changes (
  id bigserial primary key,
  process_id text not null references secop_processes(id),
  field text not null,
  previous_value text,
  current_value text,
  change_type text not null,
  source_date timestamptz,
  detected_at timestamptz not null default now(),
  evidence jsonb
);

create table if not exists secop_documents (
  id text primary key,
  process_id text not null,
  source text not null,
  official_id text,
  name text,
  url text,
  size_bytes bigint,
  extension text,
  uploaded_at timestamptz,
  payload jsonb not null
);

create table if not exists secop_sync_runs (
  id bigserial primary key,
  source text not null,
  kind text not null,
  status text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  fetched integer default 0,
  inserted integer default 0,
  updated integer default 0,
  discarded integer default 0,
  errors integer default 0
);

create table if not exists secop_sync_cursors (
  source text primary key,
  cursor_value text,
  window_start timestamptz,
  window_end timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists secop_sync_errors (
  id bigserial primary key,
  run_id bigint references secop_sync_runs(id),
  message text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create table if not exists secop_source_metadata (
  source text primary key,
  last_modified text,
  notes text
);

create index if not exists secop_processes_source_ext on secop_processes (source, external_process_id);
create index if not exists secop_processes_entity on secop_processes using gin (entity_name gin_trgm_ops);
create index if not exists secop_processes_title on secop_processes using gin (title gin_trgm_ops);
create index if not exists secop_processes_search on secop_processes using gin (search_text);
create index if not exists secop_processes_dates on secop_processes (publication_date, closing_date);
create index if not exists secop_processes_value on secop_processes (estimated_value);
create index if not exists secop_processes_geo on secop_processes (department, municipality);
create index if not exists secop_processes_modality on secop_processes (modality, computed_status);
