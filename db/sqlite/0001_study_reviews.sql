pragma foreign_keys = on;

create table if not exists study_review_schema_migrations (
  version text primary key,
  applied_at text not null
);

insert or ignore into study_review_schema_migrations (version, applied_at)
values ('0001_study_reviews', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

create table if not exists study_review_exports (
  export_id text primary key,
  source_sha256 text not null unique,
  source_path text not null,
  schema_version text not null,
  pilot_id text not null,
  study_round text not null,
  reviewer_id text not null,
  exported_at text not null,
  imported_at text not null,
  source_snapshot_date text,
  source_pool_fingerprint text,
  source_feature_matrix_fingerprint text,
  expected_repetition_ids_json text not null,
  event_count integer not null,
  resolved_count integer not null,
  scored_count integer not null,
  unscorable_count integer not null,
  deferred_count integer not null,
  analysis_excluded_count integer not null,
  complete integer not null check (complete in (0, 1)),
  payload_json text not null
);

create table if not exists study_review_events (
  event_id text primary key,
  event_sha256 text not null,
  schema_version text not null,
  pilot_id text not null,
  study_round text not null,
  reviewer_id text not null,
  repetition_id text not null,
  ingest_id text not null,
  action_type text not null,
  status text not null check (status in ('scored', 'deferred', 'unscorable')),
  score integer check (score is null or score between 0 and 3),
  confidence text check (confidence is null or confidence in ('low', 'medium', 'high')),
  unscorable_reason text,
  score_zero_reason text,
  camera_view text not null,
  side text not null,
  comment text not null,
  quality_flags_json text not null,
  blind_review_json text not null,
  eligible_for_blind_analysis integer not null check (eligible_for_blind_analysis in (0, 1)),
  rubric_version text not null,
  review_started_at text not null,
  review_duration_ms integer not null,
  supersedes_event_id text,
  created_at text not null,
  raw_event_json text not null
);

create table if not exists study_review_export_events (
  export_id text not null references study_review_exports(export_id) on delete cascade,
  event_id text not null references study_review_events(event_id),
  event_ordinal integer not null,
  primary key (export_id, event_id),
  unique (export_id, event_ordinal)
);

create index if not exists idx_study_review_events_context
  on study_review_events (pilot_id, study_round, reviewer_id, repetition_id, created_at);

create index if not exists idx_study_review_events_status
  on study_review_events (status, action_type);
