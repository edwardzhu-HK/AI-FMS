# AI-FMS Phase I Project Page Copy

状态：CURRENT - ready for page implementation

更新日期：2026-08-17

文件名为兼容早期链接而保留；内容已从 2026-05 的 Deep Squat V1.5 页面升级为当前
Phase I canonical project-page copy。

## 页面目标

这不是产品营销页，而是一页可以快速回答以下问题的 research portfolio page：

1. 为什么需要 AI 辅助人工 FMS 视频审核？
2. Ronnie 与团队实际开发了什么？
3. 系统如何覆盖七个动作，并保持人工最终判断？
4. Phase I 用什么数据和方法进行了评估？
5. 除了评分一致性，项目产生了什么 movement-science 发现？
6. 当前证据的边界在哪里？

## Hero

### Title

**AI-FMS**

### Subtitle

**An explainable, human-in-the-loop system for Functional Movement Screen video
review.**

### Supporting Copy

AI-FMS helps reviewers replay and segment movement videos, inspect quantitative
pose evidence, record traceable scores, and compare human judgment with
interpretable AI suggestions across all seven FMS movements.

### Status Line

Phase I research prototype · 7-movement product workflow · 4-movement formative
evaluation · manuscript in preparation

### Primary Links

- `View the system`: link to the deployed or locally recorded demo.
- `Read the Phase I report`: link to the approved public PDF.
- `View the code`: replace with Ronnie's GitHub URL after repository transfer.

不要在 rights、部署和 GitHub 迁移完成前显示无效按钮或 placeholder URL。

## The Problem

### English Copy

Human FMS review is structured, but video-based review still creates practical
friction. A movement can pass before the reviewer has time to inspect it;
remote and asynchronous review makes repetition finding slower; and visual
judgment is often qualitative even when joint angles, distances, trajectories,
or side-to-side control matter. A final 0-3 score also preserves very little of
the evidence behind the decision.

AI-FMS was designed to support the reviewer at both levels: make the review
workflow easier and more traceable, then preserve quantitative movement
evidence that the ordinal score cannot fully express.

### Visual

Use the complete Workbench screenshot, not a decorative hero image:

`docs/assets/publication/ai-fms-workbench-overview-real-video.png`

## What We Built

### English Copy

AI-FMS is a segment-centered review and research platform. Reviewers can load a
video, define a duration-aware analysis range, inspect automatically proposed
repetitions, loop and correct each segment, record FMS scores and protocol
conditions, review pose-derived evidence, and export traceable research data.

The platform supports all seven FMS movements. Each movement has an end-to-end
annotation path and a first-pass, pose-based reviewer-support suggestion. The
rules are movement-specific, explainable, and allowed to abstain when pose or
protocol evidence is insufficient.

### Core Capabilities

| Area            | Implemented capability                                                          |
| --------------- | ------------------------------------------------------------------------------- |
| Video review    | Duration-aware range, rep segmentation, loop playback, timing correction        |
| Human review    | RAW SCORE, confidence, camera view, side, protocol/clearing fields, notes       |
| Pose evidence   | Time-aligned MediaPipe overlay, normalized distances, angles, trajectories      |
| AI support      | Movement-specific first-pass suggestion, explanation, quality gates, abstention |
| Study workflow  | Anonymous Round A/B queue, append-only events, signed JSON/SHA-256 export       |
| Data governance | Stable IDs, lineage, SQLite ingest, dataset export, release manifests           |

## Human-in-the-Loop Workflow

Use a compact five-step sequence:

1. **Review the video**: isolate complete repetitions and replay difficult moments.
2. **Inspect quantitative evidence**: view pose overlay, timing, angles, distances,
   and movement-specific events.
3. **Record human judgment**: preserve score, confidence, protocol condition,
   camera view, side, QA flags, and notes.
4. **Compare after review**: analyze locked AI suggestions against human consensus
   without exposing AI to blinded reviewers.
5. **Export traceable evidence**: retain stable IDs, lineage, checksums, and explicit
   exclusion or abstention reasons.

### Supporting Visuals

- Study Mode: `docs/assets/publication/ai-fms-study-mode-blind-review-real-video.png`
- Quantitative feature detail:
  `docs/assets/publication/ai-fms-workbench-quantitative-evidence.png`

The real-video frames are internal-review assets until frame-level rights are
confirmed. Replace them with project-owned, consented footage if needed.

## Product Scope and Research Scope

### English Copy

The product scope and the research scope are intentionally different. The
platform implements the main review workflow for all seven FMS movements. Phase
I selected Deep Squat, Active Straight Leg Raise, Hurdle Step, and Rotary
Stability for a more structured data and reviewer study. The other three
movements remain implemented product capabilities, not unbuilt placeholders.

## Phase I Evaluation

| Evidence layer                           |                              Current result |
| ---------------------------------------- | ------------------------------------------: |
| Canonical research pool                  |          28 source videos / 110 repetitions |
| Feature-ready evidence                   |                              66 repetitions |
| Formal blind sample                      |            32 repetitions / 4 movements x 8 |
| Round B status agreement                 |                                       32/32 |
| Round B jointly scorable exact agreement |                                       26/26 |
| Locked AI vs Round B human consensus     |               16/25 exact; 23/25 within one |
| Final AI score coverage                  |                        28/32; 4 abstentions |
| Engineering quality gate                 | 340 tests; lint/format; 3 production builds |

### Interpretation

The reviewer result is a small, controlled internal study, not population-level
reliability. The AI result is a post-audit internal benchmark, not held-out
accuracy or clinical validation.

## What the Score Does Not Show

After completing the system and its primary evaluation, Phase I used the
quantitative evidence for four movement-specific exploratory analyses:

1. **Deep Squat: a strategy continuum**
   Fifteen side-view repetitions showed that depth and hip/knee flexion form a
   continuum, while ankle, trunk, and alignment strategies vary more independently.
2. **ASLR: side and repeatability**
   Four good-evidence repetitions from one source showed similar active-leg height
   but larger changes in stationary-leg and pelvic-control proxies.
3. **Hurdle Step: multiple paths to the same score**
   Five independently reviewed score-two repetitions from five videos followed
   four different review pathways.
4. **Rotary Stability: full-cycle coordination**
   Eight blind-reviewed repetitions showed why touch, extension, return, and event
   sequence must be interpreted across a full movement cycle.

These findings generate testable mobility, stability, coordination, and
repeatability hypotheses. They do not diagnose impairments or establish causes.

## Technical Architecture

- Frontend: React 19 and Vite.
- Pose extraction: MediaPipe Pose Landmarker with time-indexed JSON landmarks.
- Movement logic: seven action adapters for timing, features, evidence gates,
  explainable suggestions, and abstention.
- Human review: Workbench plus AI-isolated Study Mode.
- Research data: canonical JSON, feature matrix, signed review exports, SQLite,
  SHA-256 checksums, and deterministic analysis scripts.
- Quality: 340 automated tests, lint/format checks, and three production builds.

## My Role and Learning

The following first-person copy requires Ronnie's final factual approval:

> My long-term swimming experience led me to ask how movement quality could be
> reviewed more consistently. I learned the FMS protocol, helped define the
> research questions, completed blinded movement reviews, and worked through an
> AI-assisted development process to turn that question into a functioning
> system. The hardest lesson was that responsible sports technology is not just
> about producing a score. It requires traceable data, clear protocol conditions,
> human oversight, and honest boundaries when the evidence is incomplete.

Contribution disclosure must separately state the roles of Ronnie, the Other
Reviewer, adult contributors, and Codex. Codex is not an author.

## Limitations

- Educational and research prototype; not a medical diagnostic tool.
- Does not predict injury risk or automatically determine pain.
- Does not replace certified FMS professionals.
- Repetitions are nested within source videos and are not independent participants.
- The formal study is small and covers four selected movements.
- The locked AI benchmark is internal and post-audit, not held-out validation.
- Rights, consent, and target-journal ethics requirements remain publication gates.

## Publication and Repository Status

- Manuscript: complete 24-page Chinese internal draft; not submitted or peer reviewed.
- Journal route: NHSJS expedited review after written eligibility clarification.
- Preprint: Zenodo only after written NHSJS permission.
- Repository: currently under `edwardzhu-HK/AI-FMS`; planned transfer to Ronnie's
  personal GitHub account after username confirmation and pre-transfer audit.

## Suggested Ending

> AI-FMS began as a practical question from sport and became a system, a dataset,
> and a small research study. It represents the kind of work I want to continue:
> combining Human Movement Science, responsible AI, and tools that make movement
> evidence easier to review and understand.
