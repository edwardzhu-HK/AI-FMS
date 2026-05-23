# V1 API Contract: FMS Calibration (7 Actions Baseline)

## 1. Conventions

- Base path: `/api/v0`
- Content type: `application/json` (`POST /videos` 支持 `multipart/form-data`)
- Time format: `ISO 8601` UTC
- Auth: `Bearer Token`（当前 stub/mock 可不校验，字段预留）
- Error format:

```json
{
  "error": {
    "code": "INVALID_ARGUMENT",
    "message": "start_second must be >= 0",
    "details": {}
  }
}
```

## 2. Core Enums

```text
action_type:
  deep_squat
  hurdle_step
  in_line_lunge
  shoulder_mobility
  active_straight_leg_raise
  trunk_stability_push_up
  rotary_stability
camera_view: front | side | unknown
job_status: queued | processing | succeeded | failed
reviewer_role: reviewer_a | reviewer_b
label_status: valid | invalid
label_source: human_consensus | ai_human_match | none
segment_review_status: pending | partial | completed
```

## 3. APIs

### 3.1 获取动作列表

- `GET /actions`

Response `200`:

```json
{
  "items": [
    {
      "id": "deep_squat",
      "display_name": "Deep Squat",
      "enabled": true,
      "phase": "v1"
    }
  ]
}
```

### 3.2 上传视频并创建分析任务

- `POST /videos`
- `multipart/form-data`:
  - `file`: 视频文件
  - `action_type`: 7 动作之一
  - `start_second`: number
  - `end_second`: number
  - `expected_reps`（可选）: integer
  - `notes`（可选）: string

Response `201`:

```json
{
  "video_id": "vid_01JXYZ",
  "analysis_job_id": "job_01JXYZ",
  "status": "queued"
}
```

Validation:

- `start_second >= 0`
- `end_second > start_second`
- 默认按“单人单动作”假设处理

### 3.3 查询分析任务状态

- `GET /analysis-jobs/{analysis_job_id}`

Response `200`:

```json
{
  "analysis_job_id": "job_01JXYZ",
  "video_id": "vid_01JXYZ",
  "status": "processing",
  "progress": 62,
  "message": "segmenting video",
  "error": null
}
```

### 3.4 获取片段列表（含 AI 初评）

- `GET /videos/{video_id}/segments`

Response `200`:

```json
{
  "video_id": "vid_01JXYZ",
  "action_type": "deep_squat",
  "items": [
    {
      "segment_id": "seg_001",
      "video_id": "vid_01JXYZ",
      "action_type": "deep_squat",
      "repetition_index": 1,
      "start_second": 3.2,
      "end_second": 5.9,
      "camera_view": "front",
      "segment_review_status": "partial",
      "ai_score": {
        "total_score": 3,
        "subscores": {
          "depth": 3,
          "knee_alignment": 3,
          "torso_control": 3
        },
        "model_version": "calib-v1.1.0"
      }
    }
  ]
}
```

### 3.5 提交/更新人工评分（片段级）

- `PUT /segments/{segment_id}/reviews/{reviewer_role}`
- `reviewer_role`: `reviewer_a` 或 `reviewer_b`

Request:

```json
{
  "reviewer_id": "Coach_in_video",
  "total_score": 3,
  "comment": "stable movement"
}
```

说明:

- UI 仅要求人工录入 `total_score` 与 `comment`。
- `subscores` 字段为兼容保留（可选，不传时由服务端/前端兼容处理）。

Response `200`:

```json
{
  "segment_id": "seg_001",
  "reviewer_role": "reviewer_a",
  "saved": true,
  "segment_review_status": "partial"
}
```

### 3.6 校验视频是否可入库

- `GET /videos/{video_id}/readiness`

Response `200`:

```json
{
  "video_id": "vid_01JXYZ",
  "all_segments_count": 6,
  "completed_segments_count": 6,
  "ready_for_ingest": true,
  "blocking_reasons": []
}
```

### 3.7 查询一致率快照

- `GET /videos/{video_id}/consistency`

Response `200`:

```json
{
  "video_id": "vid_01JXYZ",
  "generated_at": "2026-02-15T14:03:10Z",
  "metrics": {
    "segments_total": 6,
    "valid_count": 6,
    "invalid_count": 0,
    "pending_count": 0,
    "ai_matches_final_count": 5,
    "ai_differs_from_final_count": 1,
    "reviewer_consensus_count": 5,
    "reviewer_disagreement_count": 1,
    "ai_matches_final_rate": 0.8333
  }
}
```

### 3.8 执行入库（片段级）

- `POST /videos/{video_id}/ingest`

Request:

```json
{
  "requested_by": "coach_zhang"
}
```

Response `201`:

```json
{
  "ingest_batch_id": "ing_01JXYZ",
  "video_id": "vid_01JXYZ",
  "segments_total": 6,
  "segments_valid": 5,
  "segments_invalid": 1,
  "status": "succeeded"
}
```

Rules:

- 仅当所有片段双人评分完成时允许入库。
- 入库时按裁决规则生成 `valid/invalid`。

## 4. Adjudication Rules

1. 若 `reviewer_a.total_score == reviewer_b.total_score`，采用人工一致分。
2. 若 A/B 不一致，但 `ai_score.total_score` 等于其中一位人工分，采用该分。
3. 若三者总分全不一致，标记为 `invalid`，不入训练集。
4. 三份原始评分都必须保留用于审计与后续校准。

## 5. Security Baseline

- `reviewer_id` 必须可追溯到认证训练师身份（当前可先白名单）
- 所有写操作记录请求人、时间戳、模型版本
