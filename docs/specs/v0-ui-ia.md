# V1 UI IA and Flow: Calibration Workbench

## 1. IA Overview

采用单工作台结构，避免多页面状态丢失。

- `Route`: `/calibration`
- （可选）结果页：`/calibration/result/:ingestBatchId`

## 2. Main Workbench Layout (`/calibration`)

左中右三栏:

1. 左栏 `Input & Job`

- 动作选择（7 动作）
- 视频上传
- 分析区间输入（Start/End）
- `Expected Reps`（可选）
- `Notes`（可选，机位/评分提示）
- 任务状态与启动按钮
- Ingest Readiness / Consistency Snapshot

2. 中栏 `Playback & Segments`

- 视频播放器
- Loop segment 开关
- Show keypoints 开关
- 当前片段信息（序号、机位、起止时间）
- 上一个/下一个片段
- 片段列表点击切换

3. 右栏 `Scoring Panel`

- AI 建议分（总分 + 细分项展示）
- Reviewer A（总分 + 评论）
- Reviewer B（总分 + 评论）
- 裁决预览（pending/valid/invalid）

## 3. Primary User Flow

1. 选择动作并上传视频。
2. 填 Start/End（可选填 expected reps 和 notes）。
3. 启动分析，任务完成后得到片段列表。
4. 逐片段播放并保存 Reviewer A/B 评分。
5. 全部片段完成后执行 ingest。
6. 查看一致率与批次结果。

## 4. Interaction Rules

- Start/End 仅定义分析区间，不强制等于首尾 segment 边界。
- segment 切分按“动作周期 + 前后缓冲”，允许相邻 segment 轻微重叠。
- 机位识别以片段为单位，可同视频内 front/side 混合。
- 人工只打总分（1/2/3）+ comments。
- Reviewer 默认 ID:
  - A: `Coach_in_video`
  - B: `Coach_Ronnie`

## 5. API Mapping

- `POST /api/v0/videos`
- `GET /api/v0/analysis-jobs/{analysis_job_id}`
- `GET /api/v0/videos/{video_id}/segments`
- `PUT /api/v0/segments/{segment_id}/reviews/{reviewer_role}`
- `GET /api/v0/videos/{video_id}/readiness`
- `GET /api/v0/videos/{video_id}/consistency`
- `POST /api/v0/videos/{video_id}/ingest`
