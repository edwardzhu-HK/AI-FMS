# AI-FMS V1.5 Demo Dry-Run Checklist

日期：2026-05-22

用途：这份 checklist 用来稳定复现 Deep Squat flagship demo，并补充验证
V1.7 Active Straight Leg Raise demo path。它面向开发自测、Ronnie 录屏前检查、
项目页截图准备和后续用户测试。

## Demo 入口

本地地址：

```bash
http://localhost:5173/
```

推荐先使用内置 demo preload：

1. 在 `Demo Preset` 中选择 `Sample-1 mixed views`，点击 `Load Demo`。
2. 确认 Action 为 `Deep Squat`。
3. 确认 Start/End 为 `1` 到 `45`。
4. 确认 Expected Reps 为 `7`。
5. 确认页面显示
   `Pose: Sample-1.pose.json · 441/441 frames · visibility 0.903`。
6. 确认 playback toggle 显示 `Show skeleton`，不是 `Demo skeleton`。

## Demo Preset 快速验证

当前内置 demo presets：

| Preset                    | Action                      | Start/End      | Expected Reps | Pose status                                 |
| ------------------------- | --------------------------- | -------------- | ------------- | ------------------------------------------- |
| `Sample-1 mixed views`    | `Deep Squat`                | `1` 到 `45`    | `7`           | `Sample-1.pose.json · 441/441 frames`       |
| `Front only`              | `Deep Squat`                | `0` 到 `18`    | `3`           | `front.pose.json · 179/179 frames`          |
| `Side only`               | `Deep Squat`                | `0` 到 `26`    | `4`           | `side.pose.json · 261/261 frames`           |
| `ASLR score-3 sample`     | `Active Straight Leg Raise` | `0` 到 `23.8`  | `2`           | `2-reps-score-3.pose.json · 237/237 frames` |
| `Shoulder score-2 sample` | `Shoulder Mobility`         | `0` 到 `22.1`  | `2`           | `2-reps-score-2.pose.json · 220/220 frames` |
| `Hurdle score-3 sample`   | `Hurdle Step`               | `17` 到 `55.6` | `7`           | `7-reps-score-3.pose.json · 556/592 frames` |

2026-05-22 浏览器验证结果：三个 preset 都可以加载匹配视频和 pose JSON，并正确保留 preset 分析范围，没有被视频完整 duration 覆盖。

2026-05-23 浏览器验证结果：`ASLR score-3 sample` 可以加载匹配视频和
pose JSON，`Start Analysis` 后显示 `2 clips`、`Timing QA: 2/2 OK`、
`Features 2/2`、`AI suggestions 2/2`，右侧 `Pose-based AI Suggestion`
显示 ASLR 的 `Hip Flexion`、`Pelvic Stability`、`Leg Symmetry` 三项 subscore。

2026-05-23 补充：`Shoulder score-2 sample` 用于 feature evidence 测试，右侧会显示
`Pose Evidence Only`，不显示 pose-based AI suggestion。预期是 `2 clips`、
`Timing QA: 2/2 OK`、`Features 2/2`，并显示 `Shoulder Mobility Features`。

## 必测流程

### 1. Start Analysis

操作：

1. 点击 `Start Analysis`。
2. 等待 Job 显示 `succeeded (100%)`。

预期：

- Segment list 显示 `7 clips`。
- Segment Timing QA 显示 `7/7 OK · 7 cycles`。
- Playback 区能显示真实 MediaPipe pose overlay。
- 没有 error banner。

### 2. Apply All Suggested Timing

操作：

1. 在 Segment Timing QA card 中点击 `Apply All Suggested Timing`。
2. 等待 segment list 刷新。

预期：

- 7 个 segment 的时间边界变为 pose-derived cycle boundaries。
- Export Evidence 显示 `Timing edits 7/7`。
- Avg shift 当前 demo 大约为 `3.9s`。
- Segment Timing QA 仍为 `7/7 OK`。

### 3. Side-View Feature Evidence

操作：

1. 选择 `#5 side` segment。
2. 查看 Deep Squat Features card。

预期：

- Depth 显示 `hip below knee`。
- Torso 显示 `controlled trunk`。
- Knee 显示 `best from front view`，因为 side view 不适合评价 knee alignment。
- Hip angle 显示 `deep hip flexion`。
- Knee angle 显示 `deep knee flexion`。
- Ankle proxy 显示 ankle mobility proxy evidence。

### 4. AI Suggestion

操作：

1. 查看右侧 AI Suggestion panel。

预期：

- AI panel 显示 pose-based suggestion。
- 显示 confidence、total score 和 reviewer-readable reasons。
- 仍然保留 final label pending 状态，AI suggestion 不直接替代人工 reviewer。

### 5. Export Evidence

操作：

1. 查看左侧 Export Evidence card。

预期：

- Records: `7`
- Pose: `Ready`
- Pose frames: `441/441`
- Visibility: `0.903`
- Timing QA: `7/7`
- Timing edits: `7/7`
- Features: `7/7`
- AI suggestions: `7/7`
- Movement Labels 中 Deep Squat 为 `7`，其他动作 slot 保留为 `0`。

## 已生成截图

这些截图是当前 demo dry-run 生成的申请/项目页素材：

![AI-FMS demo overview](assets/ai-fms-demo-overview.jpg)

![AI-FMS side-view angle features](assets/ai-fms-demo-side-angle-features.jpg)

![AI-FMS export evidence dashboard](assets/ai-fms-demo-export-evidence.jpg)

## 当前截图说明

- `ai-fms-demo-overview.jpg`：展示 workbench 总览、真实 pose overlay、AI suggestion panel。
- `ai-fms-demo-side-angle-features.jpg`：展示 Export Evidence、Movement Labels 和 side-view angle evidence。
- `ai-fms-demo-export-evidence.jpg`：展示 pose evidence、timing edits、features、AI suggestions 和 movement label summary。

## 已知边界

- Deep Squat 仍是 flagship demo；ASLR 目前是第一条 V1.7 movement expansion
  demo path，feature snapshot UI 尚未完全泛化。
- Shoulder Mobility 已有第一版 feature-only demo path，但还没有 pose-based AI
  suggestion。
- 其他 4 个 FMS movements 已有 annotation workflow 和 sample inventory，但还没有同等深度 pose features。
- Angle evidence 是 reviewer-readable evidence，不是 clinical conclusion。
- Pain flag 仍必须来自人工 reviewer。
- AI suggestion 是辅助建议，不是最终标签。

## 通过标准

一次 demo dry-run 通过，需要满足：

- 内置 demo assets 可以加载。
- `Start Analysis` 成功。
- `Apply All Suggested Timing` 成功。
- Segment Timing QA、Deep Squat Features、AI Suggestion、Export Evidence 都正常显示。
- 没有 error banner。
- `npm run check` 全绿。
