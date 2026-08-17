# AI-FMS Phase I Demo Walkthrough Script

状态：CURRENT - narration and screen-recording ready

更新日期：2026-08-17

文件名为兼容早期链接而保留；本脚本已替换 2026-05 的 Deep Squat-only V1.5 版本。

## Demo 目标

主版控制在 2 分 45 秒至 3 分钟，回答四个问题：

1. AI-FMS 为什么需要存在？
2. 七动作系统实际能做什么？
3. Phase I 如何评估人工评分与锁定 AI？
4. 系统如何恢复 0-3 分没有保存的定量动作信息？

不要把视频录成逐个按钮教学，也不要按论文目录逐段朗读。

## 录制前准备

- 使用一个已经确认展示权利的横屏动作视频；未确认前只录内部 review 版。
- Workbench 载入 `Deep Squat full-width demo`，停在动作最低位并显示真实 pose overlay。
- 打开一个不含真实 reviewer 历史数据的 Study Mode dry-run。
- 准备四张 movement-specific research figures。
- 浏览器只保留需要的标签页，不显示本地绝对路径、文件名、账号、通知或私密评论。
- Reviewer ID 使用 `Reviewer_A`、`Reviewer_B` 或 `Test Reviewer`。
- 不在正式 Round A/B 画面中展示 AI、pose evidence 或历史评分。

## 三分钟主版

### 0:00-0:20 | 问题与动机

**画面**：AI-FMS Workbench 完整界面，视频暂停在清楚的动作帧。

**English narration**：

> Functional Movement Screen gives reviewers a structured zero-to-three score,
> but video review still has practical limits. A movement can pass quickly,
> remote review is slower, and the final score preserves little of the evidence
> behind the decision. I built AI-FMS to help human reviewers replay each
> repetition, inspect quantitative movement evidence, and keep the full review
> process traceable.

### 0:20-0:42 | 七动作产品范围

**画面**：展开 action selector，依次扫过七个动作；不要逐项运行。

**English narration**：

> The workbench supports all seven FMS movements. Each action has an end-to-end
> annotation workflow and a movement-specific, pose-based first-pass suggestion.
> The AI can explain its evidence and abstain when video quality or protocol
> information is insufficient.

### 0:42-1:12 | 真实视频、rep 与 pose evidence

**画面**：播放一小段 Deep Squat，暂停在最低位；切换 Show skeleton；点击前后两个 rep；
展示 segment timing 和循环播放。

**English narration**：

> A reviewer can isolate complete repetitions, loop a difficult movement, and
> correct the timing instead of searching through the full video again. The
> MediaPipe overlay is aligned to the video time, so the system can preserve
> angles, normalized distances, trajectories, and movement events that are hard
> to record consistently by eye.

### 1:12-1:38 | AI 证据与人工最终判断

**画面**：停留在 feature panel、AI suggestion、protocol condition 和 reviewer form。

**English narration**：

> The AI suggestion is evidence for the reviewer, not a final diagnosis. It shows
> which criteria support the proposed score, which measurements are uncertain,
> and whether a required protocol condition is missing. The human reviewer keeps
> the final decision and can record confidence, camera view, side, clearing
> information, and notes.

### 1:38-1:58 | Study Mode 与盲评边界

**画面**：切换到 Study Mode dry-run，显示匿名队列、动作视频和 RAW SCORE 控件。

**English narration**：

> To evaluate the system without leaking AI information, we built a separate
> Study Mode. In both blinded rounds, reviewers could not see AI scores, pose
> parameters, source file names, previous answers, or the other reviewer's
> decisions. Reviews were stored as append-only events and exported with
> checksums.

### 1:58-2:22 | Phase I 评估数字

**画面**：简洁结果卡或论文中的 Phase I evidence table，不要快速滚动整篇报告。

**English narration**：

> Phase I reconstructed a canonical pool of 110 repetitions from 28 source
> videos. We selected 32 repetitions across four movements for two blinded review
> rounds. In Round B, the reviewers agreed on scoreability for all 32 items and
> assigned the same score to all 26 items that both considered scorable. The
> locked AI exactly matched human consensus on 16 of 25 comparable items and was
> within one point on 23. This is an internal benchmark, not held-out clinical
> validation.

### 2:22-2:43 | 科研用途与四种发现

**画面**：依次显示四张研究图，每张约 4-5 秒。

**English narration**：

> The quantitative evidence also revealed what the ordinal score does not show.
> Deep Squat formed a strategy continuum; ASLR preserved side and repeatability
> differences; Hurdle Step showed several pathways to the same score; and Rotary
> Stability required a full-cycle view of coordination and event sequence.

### 2:43-3:00 | 个人学习与边界

**画面**：回到 Workbench，最后显示项目名称和三个链接位置。

**English narration**：

> AI-FMS grew from my swimming experience and my interest in Human Movement
> Science. It taught me that responsible sports technology needs more than a
> model: it needs human oversight, traceable evidence, clear protocol rules, and
> honest limits. The current system is a research prototype, not a medical
> diagnostic tool or a replacement for trained professionals.

## 60 秒短版

### 0:00-0:12

问题、动机和完整 Workbench。

> I built AI-FMS to make FMS video review easier to replay, quantify, and trace
> while keeping the human reviewer in control.

### 0:12-0:30

真实视频、pose overlay、segments、feature panel。

> The seven-movement workflow combines repetition timing, MediaPipe pose
> evidence, interpretable AI suggestions, human scoring, and structured export.

### 0:30-0:45

Study Mode 和核心数字。

> A separate blind-review study used 32 repetitions across four movements. The
> two reviewers exactly agreed on all 26 jointly scorable Round B items.

### 0:45-1:00

四张研究图和结尾。

> The system also revealed different strategies hidden within the same score.
> It is an internal research prototype, but it connected my experience in
> swimming with Human Movement Science and responsible AI.

## 录制验收清单

- [ ] 时长不超过 3:05，开头 10 秒内出现真实系统和动作视频。
- [ ] Workbench 使用真实视频与真实 pose，不使用黑色占位或 demo skeleton。
- [ ] 七动作产品范围与四动作研究范围表达清楚。
- [ ] Study Mode 画面不含 AI、pose、历史分数、文件名或另一 reviewer 答案。
- [ ] 只使用通过 frame-level rights/consent 检查的视频画面。
- [ ] 不出现本地路径、通知、私人账号、raw comments 或 score-bearing 文件名。
- [ ] 旁白没有 medical diagnosis、injury prediction、expert replacement 或 accuracy
      overclaim。
- [ ] 屏幕录制为 1080p 或更高，鼠标移动稳定，文字在正常播放下可读。
- [ ] 英文字幕逐句校对，术语统一使用 reviewer、FMS RAW SCORE、pose evidence、
      internal benchmark 和 human-in-the-loop。
- [ ] Ronnie 对第一人称贡献、学习和旁白事实做最终确认。

## 输出文件建议

- 主版：`ai-fms-phase-i-demo-3min.mp4`
- 字幕：`ai-fms-phase-i-demo-3min.en.srt`
- 60 秒版：`ai-fms-phase-i-demo-60s.mp4`
- 封面：使用完整 Workbench 真实视频截图，不另做装饰性封面。
