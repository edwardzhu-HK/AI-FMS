# V1 Data Schema Draft: FMS Calibration

## 1. Design Principles

- 片段优先：训练样本最小粒度是 `segment`。
- 原始评分不可丢失：必须保留 AI、人工 A、人工 B 三份独立记录。
- 最终标签可回放：每条标签都能反查裁决来源与当时评分快照。
- 可扩展：当前已覆盖 7 动作，Schema 继续支持动作扩展。

## 2. Entity Overview

- `videos`: 上传视频与分析区间
- `analysis_jobs`: 视频切分与初评任务
- `segments`: 切分后动作片段
- `score_ai`: 片段 AI 评分
- `score_reviewer`: 片段人工评分（A/B）
- `label_results`: 裁决后的最终标签状态
- `ingest_batches`: 入库批次
- `dataset_entries`: 入库样本记录（训练集入口）
- `calibration_jobs`: 校准训练任务
- `model_versions`: 模型版本与指标
- `reviewers`: 审核员资质信息

## 3. PostgreSQL Schema (Draft SQL)

```sql
create table reviewers (
  reviewer_id text primary key,
  display_name text not null,
  certification_id text not null,
  certification_valid boolean not null default true,
  created_at timestamptz not null default now()
);

create table videos (
  video_id text primary key,
  action_type text not null,
  uploaded_by text not null,
  source_uri text not null,
  start_second numeric(8,3) not null,
  end_second numeric(8,3) not null,
  status text not null default 'uploaded',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_second >= 0),
  check (end_second > start_second)
);

create table analysis_jobs (
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

create table segments (
  segment_id text primary key,
  video_id text not null references videos(video_id),
  repetition_index int not null,
  start_second numeric(8,3) not null,
  end_second numeric(8,3) not null,
  camera_view text not null default 'unknown',
  segment_uri text,
  review_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_second >= 0),
  check (end_second > start_second),
  unique (video_id, repetition_index)
);

create table score_ai (
  score_ai_id text primary key,
  segment_id text not null unique references segments(segment_id),
  total_score smallint not null,
  subscores jsonb not null,
  model_version text not null,
  created_at timestamptz not null default now()
);

create table score_reviewer (
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

create table label_results (
  label_result_id text primary key,
  segment_id text not null unique references segments(segment_id),
  label_status text not null,
  label_source text not null,
  final_total_score smallint,
  final_subscores jsonb,
  adjudicated_at timestamptz not null default now(),
  adjudication_version text not null default 'v0'
);

create table ingest_batches (
  ingest_batch_id text primary key,
  video_id text not null references videos(video_id),
  action_type text not null,
  requested_by text not null,
  segments_total int not null,
  segments_valid int not null,
  segments_invalid int not null,
  created_at timestamptz not null default now()
);

create table dataset_entries (
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

create table calibration_jobs (
  calibration_job_id text primary key,
  status text not null,
  requested_by text not null,
  ingest_batch_ids jsonb not null,
  training_sample_count int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table model_versions (
  model_version text primary key,
  calibration_job_id text references calibration_jobs(calibration_job_id),
  parent_model_version text,
  metrics jsonb not null,
  parameters jsonb not null,
  created_at timestamptz not null default now()
);
```

## 4. Required Indexes

```sql
create index idx_segments_video_id on segments(video_id);
create index idx_score_reviewer_segment on score_reviewer(segment_id);
create index idx_dataset_entries_segment on dataset_entries(segment_id);
create index idx_label_results_status on label_results(label_status);
create index idx_analysis_jobs_video_id on analysis_jobs(video_id);
```

## 5. Score Payload Shape (JSONB)

`subscores` 建议统一结构:

```json
{
  "depth": 2,
  "knee_alignment": 2,
  "torso_control": 1
}
```

说明:

- 当前评分存储结构统一为 `{depth,knee_alignment,torso_control}`，便于跨动作复用。
- 每动作展示层可映射为动作特定标签，但底层 key 保持稳定。

## 6. Adjudication SQL Strategy (Pseudo)

1. 读取片段对应 `score_ai`、`reviewer_a`、`reviewer_b`。
2. 按 ADR 0003 判定 `label_status` 与 `label_source`。
3. 写入或更新 `label_results`。
4. 只有 `label_status='valid'` 的片段参与训练样本统计。

## 7. Data Quality Constraints

- 入库前确保每个片段同时存在 `reviewer_a` 与 `reviewer_b`。
- `score_ai` 对每个片段只能有一条当前有效记录（V1 基线）。
- 三方全不一致样本必须写 `label_status='invalid'` 且不进入训练标签集。
- 所有写操作必须保留 `created_at/updated_at`。

## 8. Migration Plan (V1 -> V2)

- V2 引入动作配置表 `action_definitions`，维护每动作评分项结构与阈值。
- V2 增加无效样本仲裁表 `review_arbitration`。
- V2 支持多模型并行打分（`score_ai` 拆分版本化记录）。
