-- FMS Calibration V0
-- Segment-centric schema for Deep Squat calibration.

create table if not exists reviewers (
  reviewer_id text primary key,
  display_name text not null,
  certification_id text not null,
  certification_valid boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists videos (
  video_id text primary key,
  action_type text not null,
  uploaded_by text not null,
  source_uri text not null,
  start_second numeric(8, 3) not null,
  end_second numeric(8, 3) not null,
  status text not null default 'uploaded',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_second >= 0),
  check (end_second > start_second)
);

create table if not exists analysis_jobs (
  analysis_job_id text primary key,
  video_id text not null references videos(video_id),
  status text not null,
  progress int not null default 0,
  message text,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (progress >= 0 and progress <= 100)
);

create table if not exists segments (
  segment_id text primary key,
  video_id text not null references videos(video_id),
  repetition_index int not null,
  start_second numeric(8, 3) not null,
  end_second numeric(8, 3) not null,
  camera_view text not null default 'unknown',
  segment_uri text,
  review_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_second >= 0),
  check (end_second > start_second),
  unique (video_id, repetition_index)
);

create table if not exists score_ai (
  score_ai_id text primary key,
  segment_id text not null unique references segments(segment_id),
  total_score smallint not null,
  subscores jsonb not null,
  model_version text not null,
  created_at timestamptz not null default now()
);

create table if not exists score_reviewer (
  score_reviewer_id text primary key,
  segment_id text not null references segments(segment_id),
  reviewer_role text not null,
  reviewer_id text not null references reviewers(reviewer_id),
  total_score smallint not null,
  subscores jsonb not null,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (segment_id, reviewer_role)
);

create table if not exists label_results (
  label_result_id text primary key,
  segment_id text not null unique references segments(segment_id),
  label_status text not null,
  label_source text not null,
  final_total_score smallint,
  final_subscores jsonb,
  adjudicated_at timestamptz not null default now(),
  adjudication_version text not null default 'v0'
);

create table if not exists ingest_batches (
  ingest_batch_id text primary key,
  video_id text not null references videos(video_id),
  action_type text not null,
  requested_by text not null,
  segments_total int not null,
  segments_valid int not null,
  segments_invalid int not null,
  created_at timestamptz not null default now()
);

create table if not exists dataset_entries (
  dataset_entry_id text primary key,
  ingest_batch_id text not null references ingest_batches(ingest_batch_id),
  segment_id text not null references segments(segment_id),
  label_status text not null,
  label_source text not null,
  ai_score_snapshot jsonb not null,
  reviewer_a_snapshot jsonb not null,
  reviewer_b_snapshot jsonb not null,
  final_label_snapshot jsonb,
  created_at timestamptz not null default now(),
  unique (ingest_batch_id, segment_id)
);

create table if not exists calibration_jobs (
  calibration_job_id text primary key,
  status text not null,
  requested_by text not null,
  ingest_batch_ids jsonb not null,
  training_sample_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists model_versions (
  model_version text primary key,
  calibration_job_id text references calibration_jobs(calibration_job_id),
  parent_model_version text,
  metrics jsonb not null,
  parameters jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_segments_video_id on segments(video_id);
create index if not exists idx_score_reviewer_segment on score_reviewer(segment_id);
create index if not exists idx_dataset_entries_segment on dataset_entries(segment_id);
create index if not exists idx_label_results_status on label_results(label_status);
create index if not exists idx_analysis_jobs_video_id on analysis_jobs(video_id);
