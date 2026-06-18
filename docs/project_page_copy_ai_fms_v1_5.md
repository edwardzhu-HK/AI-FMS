# AI-FMS V1.5 Project Page Copy

日期：2026-05-22

用途：这份文档是 project page / portfolio page 的可直接改写版本。中文用于内部理解和申请叙事梳理，英文段落可以直接用于网页、GitHub README 摘要、简历项目描述或 demo video 旁白。

## 页面定位

AI-FMS 应该被呈现为一个 application-facing research prototype：

- 核心不是“AI 自动诊断”，而是 human-in-the-loop movement screening annotation。
- 核心产物不是单次分数，而是 traceable segment-level training data。
- 核心技术亮点是把 video workflow、pose evidence、reviewer scoring、AI suggestion 和 export 串成闭环。
- 当前 flagship demo 是 Deep Squat，平台结构保留 all 7 FMS movements 的扩展空间。

## Hero

英文标题：

AI-FMS

英文副标题：

A human-in-the-loop computer vision platform for Functional Movement Screen video annotation.

英文短描述：

AI-FMS helps reviewers segment FMS videos, inspect pose-based movement evidence, compare AI suggestions with human labels, adjudicate disagreements, and export traceable datasets for future movement-quality models.

中文理解：

这是一个面向 FMS 视频标注和动作质量数据集生产的平台。它把 AI 放在辅助位置，让人类 reviewer 保持最终判断权。

## Problem

英文正文：

Functional Movement Screen videos can be useful for learning and reviewing movement quality, but manual review is hard to standardize. Different reviewers may choose different segment boundaries, store comments in inconsistent formats, or lose the evidence behind a score. For future AI models, the first challenge is not replacing human judgment. It is creating high-quality, traceable labels.

中文要点：

- 视频动作切片如果不一致，后续评分和训练数据都会受影响。
- 人工 reviewer 的判断需要保留证据，不应该只留下一个分数。
- 未来如果要训练更好的 movement-quality model，必须先把数据闭环做好。

## What I Built

英文正文：

I built a React/Vite workbench that supports all 7 FMS movement categories at the workflow level. Reviewers can upload a video, choose an analysis range, generate repetition-level segments, loop each segment, adjust boundaries, score with two human reviewers, compare an AI-assisted suggestion, adjudicate the final label, and export JSON/CSV dataset records.

For the Deep Squat flagship pipeline, I added MediaPipe Pose Landmarker extraction, aligned keypoint overlay, pose-assisted segment timing QA, movement feature snapshots, and an explainable score suggestion based on pose-derived evidence.

中文要点：

- V1 层：7 个 FMS 动作的 annotation workflow。
- V1.5 层：Deep Squat 的真实 pose pipeline 和可解释 AI suggestion。
- Export 层：把 reviewer label、AI suggestion、pose summary、timing QA、feature evidence 一起导出。

## Demo Highlights

### 1. Workbench Overview

截图：

`docs/assets/ai-fms-demo-overview.jpg`

英文说明：

The main workbench combines video playback, segment navigation, reviewer scoring, AI suggestion, and export readiness in one review surface.

### 2. Real Pose Overlay

英文说明：

When a matching MediaPipe pose JSON file is loaded, AI-FMS renders real keypoints aligned to the current video time. If no pose file is loaded, demo skeletons are clearly labeled and are not presented as model output.

### 3. Segment Timing QA

英文说明：

The Deep Squat timing module detects repeated squat cycles and suggests segment boundaries. Reviewers can compare current and suggested ranges, then batch-apply pose-assisted timing before scoring.

### 4. Feature Snapshot

截图：

`docs/assets/ai-fms-demo-side-angle-features.jpg`

英文说明：

The selected segment shows reviewer-readable evidence such as depth, torso control, knee alignment, hip angle, knee angle, and ankle mobility proxy. These features support interpretation instead of replacing expert review.

### 5. Export Evidence

截图：

`docs/assets/ai-fms-demo-export-evidence.jpg`

英文说明：

The dashboard summarizes label completion, timing QA coverage, feature coverage, AI suggestion coverage, and pose-evidence export readiness before the dataset record is saved.

## Technical Architecture

英文版：

- Frontend: React and Vite.
- Pose extraction: MediaPipe Pose Landmarker, exported as time-indexed JSON landmarks.
- Feature extraction: JavaScript modules for Deep Squat timing, depth, trunk control, knee alignment, and side-view angle evidence.
- Human review: Reviewer A/B scoring, comments, pain flag, clearing test, and rubric version.
- Adjudication: human consensus first, AI-human agreement as secondary evidence, invalid state for unresolved mismatch.
- Export: JSON and CSV records designed for traceability and future dataset construction.
- Validation: Node test suite, manifest validation scripts, sample inventory, and dry-run checklist.

中文解释：

技术上它不是单点模型 demo，而是一个小型数据平台。视频、pose、人工评分、AI 建议和导出结构都被连在一起，这更符合申请材料里“把运动科学兴趣转化为系统工程实践”的叙事。

## Current Evaluation Evidence

英文正文：

The current V1.5 demo has a reproducible Deep Squat dry run. It loads `Sample-1.mp4` and `Sample-1.pose.json`, applies pose-assisted timing to 7 repetitions, shows feature evidence for selected segments, generates an explainable AI suggestion, and exports traceable dataset records. The project also includes automated tests for adjudication, segmentation, pose parsing, timing QA, feature extraction, AI suggestion, export quality, and sample manifest validation.

中文要点：

- Deep Squat demo 已经可以稳定复现。
- 目前不是只展示 UI，而是有真实 pose JSON、timing QA、feature snapshot、export evidence。
- 自动测试覆盖核心逻辑，避免只是一次性的展示页。

## Limitations

英文正文：

AI-FMS is an educational and research prototype. It is not a medical diagnostic tool, does not predict injury risk, and does not replace trained professionals. Pain and medical interpretation require human expertise. Deep Squat remains the flagship demo. Active Straight Leg Raise, Hurdle Step, In-Line Lunge, Shoulder Mobility, and Trunk Stability Push-Up have first-pass pose-based reviewer-support suggestions, while Rotary Stability is limited to feature evidence and side suggestion. All non-Deep-Squat movement logic still needs more curated samples and human calibration before stronger scoring claims.

中文要点：

- 不宣称医疗诊断。
- 不宣称伤病预测。
- 不宣称替代 certified FMS professionals。
- Deep Squat 是当前 flagship，其他动作已有不同层级的 first-pass evidence，但仍需校准。
- 样本量和视频多样性仍然有限。

## Application Narrative

英文正文：

My long-term swimming experience made me curious about how movement quality, fatigue, and technique can be observed more consistently. While learning Functional Movement Screen concepts, I saw an opportunity to connect Human Movement Science with computer vision. AI-FMS became a way to explore how pose estimation can support structured review while preserving human judgment, traceability, and ethical boundaries.

中文理解：

这段可以作为 Ronnie 申请材料中的项目叙事核心：从长期游泳训练出发，进入 Human Movement Science / Kinesiology 的兴趣，再用 AI-FMS 展示他能把运动观察、数据结构、AI 工具和伦理边界结合起来。

## Future Work

英文 bullet：

- Promote selected sample videos into canonical manifests for the remaining FMS movements.
- Expand pose-derived features to Active Straight Leg Raise, Shoulder Mobility, Hurdle Step, and In-Line Lunge.
- Build a small consent-aware dataset with a dataset card and clear limitations.
- Record a 2-3 minute demo video showing the Deep Squat flagship workflow.
- Explore lightweight supervised models only after label quality and sample diversity improve.

## Resume Bullets

英文可选版本：

- Built AI-FMS, a human-in-the-loop computer vision workbench for Functional Movement Screen video annotation, reviewer scoring, adjudication, and traceable dataset export.
- Implemented a Deep Squat flagship pipeline with MediaPipe pose extraction, aligned keypoint overlay, pose-assisted segmentation, movement-feature snapshots, and explainable AI score suggestions.
- Designed the system around ethical AI boundaries: pose evidence supports reviewer decisions but does not claim medical diagnosis, injury-risk prediction, or replacement of trained professionals.

## 2-3 Minute Demo Opening

英文旁白：

AI-FMS is a human-in-the-loop computer vision platform for reviewing Functional Movement Screen videos. Instead of trying to replace trained reviewers, it helps them create more consistent, evidence-backed labels. In this demo, I will show the Deep Squat pipeline: loading a video and pose file, applying pose-assisted segment timing, inspecting movement features, comparing an AI suggestion with reviewer labels, and exporting a traceable dataset record.

## Suggested Page Ending

英文结尾：

AI-FMS is a small prototype, but it represents the kind of work I want to keep pursuing: combining human movement science, responsible AI, and practical tools that make sports and health data more interpretable.
