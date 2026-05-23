# Pose Landmarks JSON Schema

Date: 2026-05-22

本文档描述 P2 阶段 Deep Squat pose extraction 的第一版 JSON 输出结构。

当前目标不是直接自动评分，而是先把每个视频帧的 pose evidence 保存下来，
让后续的 overlay、pose quality summary、pose-assisted segmentation 和
Deep Squat feature extraction 都有同一个 source of truth。

## 生成方式

默认脚本：

```bash
python3 scripts/extract-pose-landmarks.py \
  --video "Eval_Videos/01-Deep Squat/Sample-1.mp4" \
  --model "models/pose_landmarker_lite.task" \
  --output "Eval_Videos/01-Deep Squat/pose/Sample-1.pose.json" \
  --video-id sample-1 \
  --start-second 1 \
  --end-second 45 \
  --target-fps 10 \
  --delegate CPU
```

模型文件可通过以下脚本下载：

```bash
python3 scripts/download-pose-landmarker-model.py \
  --variant lite \
  --output models/pose_landmarker_lite.task
```

本脚本基于 Google MediaPipe Pose Landmarker 的 Python VIDEO mode：用
OpenCV 读取视频帧，将帧转成 `mediapipe.Image`，再调用
`detect_for_video(image, timestamp_ms)`。

本机已验证组合：

- `mediapipe==0.10.21`
- `pose_landmarker_lite.task`
- `delegate=CPU`
- `Sample-1.mp4`, `1s` 到 `45s`, `target_fps=10`

已生成输出：

- `Eval_Videos/01-Deep Squat/pose/Sample-1.pose.json`
- 441 sampled frames
- 441/441 frames with pose
- `missingFramesRatio = 0.0`
- `avgVisibility ≈ 0.9031`

注意：在当前 Mac 上，MediaPipe 即使用 CPU delegate，底层 graph 仍会创建
macOS GL/Metal context；在 Codex 沙盒内会报 `kGpuService` /
`NSOpenGLPixelFormat` 相关错误。真实提取需要在外部环境运行。

## Workbench 使用方式

当前 React workbench 已经可以手动加载本 schema 的 JSON：

1. 在 `Upload Video` 里选择对应视频。
2. 在 `Pose JSON (optional)` 里选择生成出的 `*.pose.json`。
3. 打开 `Show skeleton` 后，播放器 overlay 会按当前播放秒数选择最近的 sampled
   frame，并用 normalized image coordinates 画出 MediaPipe landmarks。

如果没有加载 pose JSON，播放器仍会显示显式标注的 demo skeleton；这个 fallback
只用于交互占位，不能作为真实模型输出或申请材料证据。

加载 Deep Squat pose JSON 后，Segment Metadata 面板会基于同一份 landmarks
生成 selected-segment timing QA：

- 用 shoulder/hip/ankle 的 normalized depth ratio 形成动作轨迹。
- 识别每次下蹲的 lowest point。
- 给当前 repetition 建议 start/end。
- 标记 `missing_start`、`missing_return`、`too_short` 等切片问题。
- reviewer 可以先填入建议时间，再保存为人工校正后的 segment metadata。

Segment Timing QA report 会把所有 repetition 汇总成批量视图，显示当前切片、
建议切片、coverage、blocking issue 和 detected cycle count，方便 reviewer
先扫出最需要修正的片段。

Deep Squat Features card 会继续复用同一份 pose/timing evidence，为选中
segment 展示第一版 movement-quality features：

- `depth`: peak depth ratio 与 hip-vs-knee vertical gap。
- `torsoControl`: side-view trunk lean degrees。
- `kneeAlignment`: front-view knee-vs-ankle lateral offset。

这些 feature 目前用于解释和 reviewer inspection，还不是最终自动评分。

Pose-based AI suggestion 会把 feature ratings 映射成 reviewer-readable
建议分和解释：

- `good` -> subscore 3。
- `watch` -> subscore 2。
- `limited` -> subscore 1。
- `not_applicable` 不扣分，但会降低 confidence，并在 reasons 中说明该视角不适合
  评价对应维度。

建议结果会显示 total score、subscores、confidence、reasons，以及当前
pose suggestion 与 final adjudicated label 是否一致。

## Dataset Export Evidence

JSON dataset export 不会嵌入完整 `*.pose.json` 原始帧数据。加载 pose JSON
后，导出包会增加 `poseEvidence` 顶层对象，并在每条 segment record 上补充：

- `poseTiming`: 当前切片、建议切片、lowest point、timing issues、coverage。
- `poseFeatures`: depth / torso control / knee alignment ratings 与 metrics。
- `poseSuggestion`: total score、subscores、confidence、reasons、model version。

`poseEvidence` 还会记录 `implementedPoseActionTypes` 与 `plannedActionTypes`。
当前 `implementedPoseActionTypes = ["deep_squat"]`，但 schema 明确保留 V2+
扩展到全部 7 个 FMS movements 的空间。

CSV export 会展开同一批 evidence，便于 reviewer 在 spreadsheet 中扫描 segment
timing、feature ratings、pose suggestion 和 final label。

## 顶层结构

```json
{
  "schemaVersion": "ai_fms_pose_landmarks_v1",
  "generatedAt": "2026-05-22T00:00:00+00:00",
  "sourceVideo": {},
  "poseModel": {},
  "sampling": {},
  "quality": {},
  "frames": []
}
```

## sourceVideo

- `videoId`: 项目内部稳定视频 ID。
- `actionType`: 当前 FMS movement，例如 `deep_squat`。
- `path`: 本机视频绝对路径。
- `fileName`: 视频文件名。
- `width` / `height`: 原视频尺寸。
- `fps`: 原视频 FPS。
- `frameCount`: 原视频帧数。
- `durationSecond`: 视频长度。
- `processedStartSecond` / `processedEndSecond`: 本次处理范围。

## poseModel

- `name`: 固定为 `mediapipe_pose_landmarker`。
- `modelAssetPath`: `.task` 模型文件路径。
- `modelVariant`: 例如 `pose_landmarker_lite`。
- `runningMode`: 当前为 `VIDEO`。
- `delegate`: 默认 `CPU`。在 macOS 上显式使用 CPU，避免 GPU/Metal 初始化问题。
- `mediapipeVersion`: 本机 mediapipe package 版本。
- `opencvVersion`: 本机 OpenCV package 版本。

## sampling

- `targetFps`: 目标采样 FPS。默认 10，用于控制输出体积和处理时间。
- `frameStep`: 根据原视频 FPS 推导出的抽帧间隔。
- `startFrame` / `endFrame`: 实际处理的原视频帧范围。

## quality

- `processedFrames`: 实际送入模型的帧数。
- `framesWithPose`: 检测到至少一个 pose 的帧数。
- `missingFrames`: 未检测到 pose 的帧数。
- `missingFramesRatio`: `missingFrames / processedFrames`。
- `poseFramesRatio`: `framesWithPose / processedFrames`。
- `avgVisibility`: 检测到 pose 的帧内 landmark visibility 平均值。
- `avgPresence`: 检测到 pose 的帧内 landmark presence 平均值。
- `lowVisibilityFrames`: 低于阈值的帧数。
- `minAvgVisibilityThreshold`: 低可见度阈值。

## frames

每个 frame record 保留：

- `frameIndex`: 原视频帧号。
- `timestampMs`: 传入 MediaPipe 的视频时间戳。
- `second`: 原视频秒数。
- `poses`: 当前帧检测到的 pose 列表。
- `quality`: 当前帧的平均 visibility / presence。

每个 pose 保留：

- `poseIndex`
- `landmarks`: normalized image coordinates。
- `worldLandmarks`: 3D world coordinates。

每个 landmark 保留：

- `index`
- `name`
- `x`
- `y`
- `z`
- `visibility`
- `presence`

## 限制

- 当前只处理 single-person pose，`num_poses` 默认 1。
- 目前只生成 pose evidence，不做医学诊断、不做 pain detection。
- JSON 可能较大，所以默认用 10 FPS 采样；如需更精细的 rep phase analysis，
  可以提高 `--target-fps`。
