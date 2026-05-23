# AI-FMS V1.5 Demo Walkthrough Script

日期：2026-05-22

用途：这是一份 2-3 分钟 demo video 的录屏脚本草稿。行文以中文说明为主，正式录制时可以使用英文旁白。目标受众是招生官、学校老师、项目评审者和不熟悉代码的人。

## Demo 目标

这段 demo 要让观众快速理解三件事：

1. AI-FMS 不是一个声称自动诊断或替代教练的系统，而是一个 human-in-the-loop 的 FMS 视频标注与数据集平台。
2. 当前版本已经能跑通一个 Deep Squat flagship workflow：视频上传、切片、真实 pose overlay、pose-based features、AI suggestion、人工评分、仲裁和导出。
3. 平台结构保留了未来扩展到 7 个 FMS movements 的空间。

## 录制前准备

建议准备以下素材：

- Deep Squat 示例视频：`Eval_Videos/01-Deep Squat/Sample-1.mp4`
- 对应 pose JSON：`Eval_Videos/01-Deep Squat/pose/Sample-1.pose.json`
- 浏览器打开本地 workbench：`http://127.0.0.1:5173/`
- UI 中打开 `Show skeleton`，并确认不是 demo skeleton，而是已上传真实 pose JSON 后的 overlay。
- Segment list 中至少选择一个 front-view segment 和一个 side-view segment。
- Reviewer A/B 可以提前填入示例评分，便于展示 adjudication。

## 推荐画面顺序

### 0:00-0:20 开场：问题和动机

画面：项目首页或 workbench 全景。

英文旁白建议：

> AI-FMS is a human-in-the-loop platform for Functional Movement Screen video annotation. I built it to explore how computer vision can support more consistent, traceable movement screening without replacing trained professionals.

中文理解：

AI-FMS 的定位不是“AI 自动打分”，而是帮助 reviewer 更稳定地切片、观察、评分、仲裁，并把过程转成可追溯的数据。

### 0:20-0:40 背景：为什么和 Ronnie 有关系

画面：Action selector 选择 Deep Squat，左侧输入区可见。

英文旁白建议：

> The project grew out of my long-term swimming experience and my interest in Human Movement Science. In training, small differences in movement quality can matter, but reviewing movement videos manually is slow and hard to standardize.

中文理解：

长期游泳训练带来了对动作质量、疲劳和恢复的真实观察；Human Movement Science 和 FMS 提供了观察框架；AI-FMS 是把观察转成系统与数据的实践。

### 0:40-1:05 上传视频和 duration-aware range

画面：上传 `Sample-1.mp4`，展示 Start/End 根据视频长度或用户范围进行分析。

英文旁白建议：

> The reviewer starts by uploading a movement video. The workbench keeps the full workflow segment-centered: each repetition can be reviewed, corrected, scored, and exported as a dataset record.

演示动作：

1. 在 `Deep Squat Demo` 中选择 `Sample-1 mixed views` 并点击 `Load Demo`，或手动选择 Deep Squat 并上传视频。
2. 检查 Start/End。
3. 确认 Expected Reps 为 `7`。
4. 点击 `Start Analysis`。

### 1:05-1:35 展示 segment timing QA

画面：Segment list 与 Segment Timing QA report，选择一个 segment，展示 suggested timing 和 current timing 的对比。

英文旁白建议：

> The system uses pose trajectories to suggest where each squat repetition starts and ends. The human reviewer still stays in control, but the tool highlights clips that may miss the full motion.

演示动作：

1. 点击一个 segment。
2. 展示当前切片起止时间。
3. 展示 suggested timing。
4. 如有需要，点击单段的 `Apply Suggested Timing`，或在 Segment Timing QA
   report 中点击 `Apply All Suggested Timing` 批量修正。

重点说明：

- 这是对“切片不完整”的直接改进。
- 系统不是强制替代人工，而是把可疑切片暴露给 reviewer。

### 1:35-1:55 展示真实 pose overlay

画面：上传 pose JSON 后打开 `Show skeleton`，播放 segment。

英文旁白建议：

> For the Deep Squat flagship pipeline, I use MediaPipe Pose Landmarker to extract real landmarks. The overlay is aligned to playback time, so reviewers can inspect the movement evidence behind each segment.

演示动作：

1. 使用 `Deep Squat Demo` preset 自动加载 pose JSON，或手动上传 pose JSON。
2. 打开 `Show skeleton`。
3. 播放 front-view 或 side-view segment。

重点说明：

- 如果没有 pose JSON，UI 会明确显示 demo skeleton，不把 fake keypoints 当作真实输出。
- 当前 demo 只对 Deep Squat 做了真实 pose pipeline，其他动作先保留 annotation workflow。

### 1:55-2:20 展示 features 和 AI suggestion

画面：Deep Squat Feature Snapshot 和 AI Suggestion panel。

英文旁白建议：

> The AI suggestion is explainable. Instead of returning only a score, it shows pose-based evidence such as depth, torso control, knee alignment, confidence, and reviewer-readable reasons.

演示动作：

1. 选择一个 front segment，展示 depth 和 knee alignment。
2. 选择一个 side segment，展示 torso control。
3. 在 AI panel 中展示 suggested score、confidence 和 reasons。
4. 展示 `Pose vs final` 对比。

重点说明：

- AI suggestion 是辅助证据，不是最终标签。
- pain flag 只能由人工 reviewer 输入。
- 当前 Deep Squat 的 rules-based suggestion 是 V1.5 可解释样板，不声称达到临床级准确性。

### 2:20-2:45 展示 Reviewer A/B、adjudication 和 export

画面：Reviewer A/B 表单、Consistency Snapshot、Export JSON/CSV。

英文旁白建议：

> Two reviewers can score independently. The system records disagreements, compares AI suggestions with final labels, and exports JSON or CSV records for future dataset building and evaluation.

演示动作：

1. 保存 Reviewer A。
2. 保存 Reviewer B。
3. 展示 AI/final comparison。
4. 点击 `Export JSON` 或 `Export CSV`。

重点说明：

- JSON 更适合技术复现和 schema traceability。
- CSV 更适合老师、reviewer 或 spreadsheet 检查。
- 导出中包含 pose evidence summary，但不直接嵌入完整 landmark 文件。

### 2:45-3:00 结尾：边界和未来扩展

画面：Action selector 展示 7 个 FMS 动作，或 README/dataset card。

英文旁白建议：

> The current prototype focuses on Deep Squat as a flagship AI pipeline, while the platform already supports all seven FMS movements at the annotation level. Next, I plan to expand selected movements, improve evaluation metrics, and build a small, well-documented movement-quality dataset.

中文收束：

AI-FMS 最重要的申请价值是：它把运动员经验、FMS 学习、Human Movement Science 兴趣和 interpretable AI 连接成一个可展示、可评估、可继续扩展的项目。

## 录制检查清单

- 首页或 README 不出现 medical diagnosis、injury prediction、coach replacement 等过度表述。
- 画面中真实 pose overlay 和 demo skeleton 的状态清楚。
- 至少展示一次 segment timing correction。
- 至少展示一次 feature evidence 和 explainable AI suggestion。
- 至少展示一次 Reviewer A/B 或 final label。
- 至少展示一次 JSON/CSV export。
- 结尾明确 limitations 和 7-movement expansion plan。

## 可剪成短版的 60 秒版本

如果需要 portfolio 短视频，可以压缩为：

1. 10 秒：项目定位和 Ronnie 背景。
2. 15 秒：上传 Deep Squat 视频，系统生成 segments。
3. 15 秒：真实 pose overlay、timing QA、feature snapshot。
4. 10 秒：AI suggestion 与 Reviewer A/B。
5. 10 秒：导出 dataset record，并说明 future expansion to 7 FMS movements。
