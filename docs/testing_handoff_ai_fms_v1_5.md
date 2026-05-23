# AI-FMS V1.5 测试交接

日期：2026-05-23

用途：这份文档给 Ronnie / Edward 回来后快速测试当前 V1.5 Deep Squat flagship demo。AI-FMS 当前应被理解为 human-in-the-loop movement screening annotation platform，不是医疗诊断或全自动 FMS 评分工具。

## 测试地址

本地 dev server：

```bash
http://localhost:5173/
```

当前 Codex in-app browser 对 `http://127.0.0.1:5173/` 可能会报 `ERR_BLOCKED_BY_CLIENT`，但 `http://localhost:5173/` 可用。

如果页面打不开，在项目根目录重新启动：

```bash
npm run dev
```

## 当前状态

- `npm run check` 已通过：ESLint、Prettier、55 个 Node tests、Vite build 均成功。
- dev server 已启动在 `http://localhost:5173/`。
- 浏览器 smoke 已通过：
  - `Sample-1 mixed views`: `1-45s`, `7` reps, `Sample-1.pose.json · 441/441 frames`。
  - `Front only`: `0-18s`, `3` reps, `front.pose.json · 179/179 frames`。
  - `Side only`: `0-26s`, `4` reps, `side.pose.json · 261/261 frames`。
  - `ASLR score-3 sample`: `0-23.8s`, `2` reps,
    `2-reps-score-3.pose.json · 237/237 frames`。
  - `Shoulder score-2 sample`: `0-22.1s`, `2` reps,
    `2-reps-score-2.pose.json · 220/220 frames`。
  - `Hurdle score-3 sample`: `17-55.6s`, `7` reps,
    `7-reps-score-3.pose.json · 556/592 frames`。
- `Sample-1 mixed views` 跑 `Start Analysis` 后，单一 `Segments` 列表显示 `7 clips · Timing QA: 7/7 OK · 7 cycles`。

## 推荐测试路径

### 0. 语言切换

Header 右侧有 `Language` / `语言` 切换按钮：

- `EN`：英文调试界面。
- `中文`：中文调试界面。
- 7 个 FMS movement 名称保持英文，不翻译成中文。

### 1. Demo Preset 加载

打开页面后，在左侧 `Deep Squat Demo` 下拉框中依次测试：

| Preset                    | Start/End      | Expected Reps | Pose 状态                                   |
| ------------------------- | -------------- | ------------- | ------------------------------------------- |
| `Sample-1 mixed views`    | `1` 到 `45`    | `7`           | `Sample-1.pose.json · 441/441 frames`       |
| `Front only`              | `0` 到 `18`    | `3`           | `front.pose.json · 179/179 frames`          |
| `Side only`               | `0` 到 `26`    | `4`           | `side.pose.json · 261/261 frames`           |
| `ASLR score-3 sample`     | `0` 到 `23.8`  | `2`           | `2-reps-score-3.pose.json · 237/237 frames` |
| `Shoulder score-2 sample` | `0` 到 `22.1`  | `2`           | `2-reps-score-2.pose.json · 220/220 frames` |
| `Hurdle score-3 sample`   | `17` 到 `55.6` | `7`           | `7-reps-score-3.pose.json · 556/592 frames` |

每次选择 preset 后点击 `Load Demo`。

需要确认：

- 页面显示 `Video: ...`，能看出当前加载的视频文件名。
- 页面显示 `Pose: xxx.pose.json · ... frames`，能看出当前加载的 pose JSON。
- `Start (s)` / `End (s)` 没有被视频完整 duration 覆盖。
- `Expected Reps` 和 `Notes` 自动填入。

### 2. Sample-1 主流程

推荐主测试用 `Sample-1 mixed views`：

1. 点击 `Load Demo`。
2. 点击 `Start Analysis`。
3. 等待 `Job: succeeded (100%)`。
4. 确认单一 `Segments` 列表显示 `7 clips`，并在同一列表中显示 `Timing QA: 7/7 OK · 7 cycles`。
5. 确认每一行同时包含当前 segment timing、建议 timing、coverage、timing 状态和 review 状态。
6. 在播放区按钮行点击 `Preview suggested timing` / `预览建议 timing`。
7. 确认播放区临时跳到建议 timing，并显示 preview 状态；Segment Metadata 仍保留原始 start/end，说明还没有保存覆盖。
8. 点击 `Apply All Suggested Timing`。
9. 选择 `#5 side` segment。
10. 查看 Deep Squat Features 和 AI Suggestion。
11. 查看 Export Evidence。

预期：

- 真实 MediaPipe pose overlay 对齐视频播放，不再是错位 demo skeleton。
- `#5 side` 能显示 side-view hip/knee/ankle angle evidence。
- AI Suggestion 是辅助建议，final label 仍由 reviewer/adjudication 决定。
- Export Evidence 中 Pose、Timing QA、Features、AI suggestions 都有覆盖状态。

### 3. Front / Side 快速流程

`Front only` 和 `Side only` 主要用来验证 preset、pose overlay、切片和 timing QA 是否稳定：

1. 选择 preset。
2. 点击 `Load Demo`。
3. 点击 `Start Analysis`。
4. 确认 segment 数量分别为 3 或 4。
5. 确认 `Segments` 列表中能显示 pose-derived suggested timing。

## 已知边界

- 当前没有真实后端持久化，仍以 mock API / local stub workflow 为主。
- Deep Squat 是目前唯一有真实 pose features 和 explainable suggestion 的动作。
- 其他 6 个 FMS movements 已有 annotation workflow 和 sample inventory，但还没有同等深度 pose feature pipeline。
- 截图资产有一张 overview 可能略早于 preset selector UI，但不影响功能测试。
- MediaPipe extraction 在这台 Mac 上需要沙盒外运行，因为会创建 macOS GL/Metal context。
