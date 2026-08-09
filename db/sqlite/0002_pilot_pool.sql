pragma foreign_keys = on;

insert or ignore into study_review_schema_migrations (version, applied_at)
values ('0002_pilot_pool', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

create table if not exists pilot_pool_snapshots (
  snapshot_id text primary key,
  pilot_id text not null,
  source_snapshot_date text not null,
  pool_fingerprint text not null,
  feature_matrix_fingerprint text not null,
  feature_contract_version text not null,
  canonical_sha256 text not null,
  blindability_sha256 text not null,
  feature_matrix_sha256 text not null,
  formal_manifest_sha256 text not null,
  agreement_sha256 text not null,
  feature_contract_sha256 text not null,
  source_paths_json text not null,
  repetition_count integer not null,
  source_video_count integer not null,
  blindable_count integer not null,
  feature_ready_count integer not null,
  blind_and_ready_count integer not null,
  formal_count integer not null,
  gold_consensus_count integer not null,
  imported_at text not null
);

create table if not exists pilot_repetitions (
  snapshot_id text not null references pilot_pool_snapshots(snapshot_id) on delete cascade,
  repetition_id text not null,
  ingest_id text not null,
  video_id text not null,
  action_type text not null,
  repetition_index integer not null,
  start_second real not null,
  end_second real not null,
  camera_view text not null,
  side text not null,
  blindability_status text not null,
  blindability_reasons_json text not null,
  feature_readiness text not null check (feature_readiness in ('ready', 'limited')),
  feature_reasons_json text not null,
  formal_selected integer not null check (formal_selected in (0, 1)),
  round_a_consensus_scored integer not null check (round_a_consensus_scored in (0, 1)),
  historical_consensus_score integer check (historical_consensus_score is null or historical_consensus_score between 0 and 3),
  historical_label_use text not null,
  research_tier text not null,
  recommended_use text not null,
  canonical_json text not null,
  blindability_json text not null,
  primary key (snapshot_id, repetition_id)
);

create table if not exists pilot_quantitative_features (
  snapshot_id text not null,
  repetition_id text not null,
  feature_contract_version text not null,
  pose_sha256 text,
  pose_model_json text not null,
  feature_source_second real,
  features_json text not null,
  qualifiers_json text not null,
  ratings_json text not null,
  quality_json text not null,
  raw_feature_row_json text not null,
  primary key (snapshot_id, repetition_id),
  foreign key (snapshot_id, repetition_id)
    references pilot_repetitions(snapshot_id, repetition_id) on delete cascade
);

create index if not exists idx_pilot_repetitions_tier
  on pilot_repetitions (snapshot_id, research_tier, action_type);

create index if not exists idx_pilot_repetitions_quality
  on pilot_repetitions (snapshot_id, feature_readiness, blindability_status);

create index if not exists idx_pilot_repetitions_video
  on pilot_repetitions (snapshot_id, video_id, action_type);
