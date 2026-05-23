# AI-FMS V1.5 Technical Report Outline

日期：2026-05-22

用途：这是一份 technical report 的中文大纲。它可以作为后续英文 technical report、项目页、申请材料附件或面试讲解提纲的基础。

## 建议标题

中文标题：

**AI-FMS：面向 Functional Movement Screen 视频标注的人机协同计算机视觉平台**

英文标题：

**AI-FMS: A Human-in-the-Loop Computer Vision Platform for Functional Movement Screen Video Annotation**

## 摘要

报告摘要建议控制在 150-250 英文词。核心信息：

- Functional Movement Screen 视频人工 review 存在切片不一致、评分过程难追溯、数据难复用的问题。
- AI-FMS 将 FMS 视频 review 建模为 human-in-the-loop annotation workflow。
- V1.5 以 Deep Squat 为 flagship pipeline，加入 MediaPipe Pose Landmarker、pose-assisted segmentation、movement feature extraction、explainable AI suggestion 和 JSON/CSV export。
- 系统不做 medical diagnosis，不替代 certified professionals，而是帮助产生更一致、更可追溯的 movement-quality dataset。

## 1. Motivation and Background

建议回答：

- Ronnie 为什么从游泳训练进入 movement quality 和 FMS 问题。
- FMS 为什么适合作为动作观察框架。
- 为什么单纯做“自动评分 app”风险太高，而 annotation platform 更真实、更可完成。
- AI 在这个场景里的合理角色：辅助观察、提示可疑片段、生成解释性证据、提高数据可追溯性。

可用申请叙事句：

> Long-term swimming training made movement quality visible to me. AI-FMS is my attempt to turn that observation into a structured review workflow and a traceable dataset foundation.

## 2. Problem Definition

推荐研究问题：

> Can pose-based AI assistance improve the consistency, efficiency, and traceability of Functional Movement Screen video annotation?

中文解释：

基于姿态估计的 AI 辅助，能否提高 FMS 视频标注的一致性、效率和可追溯性？

不建议使用的问题：

> Can AI score FMS automatically?

原因：这个问题过大，容易引发 clinical accuracy、injury-risk prediction 和 coach replacement 的过度承诺。

## 3. Scope and Non-Goals

### In Scope

- 7 个 FMS movement patterns 的 annotation workflow。
- Deep Squat 的真实 pose pipeline。
- Segment-level reviewer scoring。
- Reviewer A/B 和 AI suggestion 的 comparison。
- Adjudication 和 dataset export。
- Dataset card、technical report、demo video 和 project page。

### Out of Scope

- 医疗诊断。
- 伤病风险预测。
- 自动 pain detection。
- 替代 certified FMS professionals。
- 实时 live scoring。
- 一次性完成 7 个动作的同等深度 AI scoring。

## 4. System Architecture

建议图示：

```text
React/Vite Workbench
  video upload, playback, segment editor, reviewer forms, AI panel, dashboard

API and Dataset Layer
  mock API, local API stub, segment records, review records, exports

Pose Pipeline
  MediaPipe Pose Landmarker, per-frame landmarks, quality summary

Deep Squat Feature Layer
  timing QA, depth evidence, torso control, knee alignment, suggestion reasons

Evaluation Package
  agreement metrics, dataset card, technical report, demo script
```

报告中需要说明：当前 backend persistence 仍是后续工作，V1.5 主要证明端到端 workflow 和 evidence payload。

## 5. Data Model

核心数据单位是 segment-level record，而不是整段视频。

每个 record 至少应该追踪：

- `video_id`
- `action_type`
- `rep_index`
- `side`
- `camera_view`
- `start_ms` / `end_ms`
- `suggested_start_ms` / `suggested_end_ms`
- `reviewer_a` / `reviewer_b`
- `ai_suggestion`
- `final_label`
- `pain_flag`
- `clearing_test`
- `rubric_version`
- `validity_status`
- `pose_evidence` summary

解释重点：

- Segment-level schema 更适合训练 future movement-quality models。
- `pain_flag` 来自人工输入，不来自 AI inference。
- Pose evidence 用 summary 和 reference 表达，不在 dataset export 中直接嵌入完整 raw landmarks。

## 6. Pose Pipeline

当前推荐技术：

- MediaPipe Pose Landmarker
- VIDEO mode
- 目标采样：10 FPS
- 输出格式：`ai_fms_pose_landmarks_v1`
- 当前已验证 Deep Squat sample：441 sampled frames，missing-frame ratio `0.0`，average visibility 约 `0.9031`

需要记录的 pose quality fields：

- processed frame count
- frames with pose
- missing-frame ratio
- average visibility
- model name and version
- video time range

技术边界：

- 在这台 Mac 上，MediaPipe extraction 需要在 Codex sandbox 外运行，因为 graph 会创建 macOS GL/Metal context，即使 inference delegate 使用 CPU。
- 当前仅 Deep Squat 做了真实 pose pipeline，其他动作先保留 annotation workflow。

## 7. Pose-Assisted Segmentation

要解释的算法思路：

- 从 shoulder、hip、ankle 的 normalized y trajectory 中提取 depth proxy。
- 找到 squat lowest point。
- 从 movement cycle 中估计每个 repetition 的 start/end。
- 把 suggested timing 与当前/manual timing 对比。
- 标记 likely incomplete clip。

评估指标建议：

- suggested start/end 与人工调整 start/end 的差异。
- segment coverage ratio。
- missed return 或 incomplete clip 的比例。
- 每个 reviewer 修正切片所需时间。

## 8. Deep Squat Feature Extraction

当前 feature evidence：

- Depth：peak squat depth ratio 和 hip-vs-knee vertical relation。
- Torso control：side-view trunk lean at lowest point。
- Knee alignment：front-view knee-vs-ankle lateral offset。
- Side-view angles：hip angle、knee angle、MediaPipe ankle angle when foot
  landmarks are present，以及 shank-lean ankle mobility proxy。

未来 feature：

- bilateral symmetry
- repetition-to-repetition consistency

报告里要强调：

- 这些 feature 是 reviewer-readable evidence，不是 medical conclusion。
- front-view 和 side-view 的 feature 可用性不同，必须记录 camera view。

## 9. Explainable AI Suggestion

当前 suggestion 设计：

- 基于 Deep Squat feature ratings 生成 subscores。
- 输出 suggested score、confidence 和 reviewer-readable reasons。
- 与 final label 进行 comparison。

建议说明：

- V1.5 的 AI suggestion 是 rules-based / feature-based 的 explainable prototype。
- 目标不是证明模型比人准，而是让 AI 的证据链可检查。
- 后续如果数据量足够，可以训练 lightweight supervised model，但必须先有高质量 labeled dataset。

## 10. Human Reviewer Workflow

报告应说明：

- Reviewer A 和 Reviewer B 独立评分。
- AI suggestion 不直接成为 final label。
- Adjudication 记录 disagreement 和 final source。
- Manual timing adjustment 保留 suggested vs adjusted audit trail。
- Reviewer comments 保留 qualitative evidence。

这部分是项目成熟度的关键，因为它把 AI 放进真实标注流程，而不是做一个孤立模型。

## 11. Export and Dataset Card

当前 export：

- JSON export：保留 nested schema、pose evidence、AI suggestion、reviewer labels 和 V2+ action slots。
- CSV export：便于 reviewer、老师或 spreadsheet inspection。
- Dataset card draft：说明数据范围、review process、known limitations 和 ethical boundaries。

报告可附录：

- JSON schema sample。
- CSV columns sample。
- Dataset card excerpt。

## 12. Evaluation Plan

建议 evaluation metrics：

- Reviewer A/B agreement。
- AI-final agreement。
- Pending/valid/invalid label counts。
- Segment timing correction summary。
- Pose missing-frame ratio。
- Average visibility/confidence。
- Per-movement sample-quality notes。
- Time-to-review per segment。

第一版不需要大规模统计，但要把 metric definitions 说清楚。

## 13. Limitations and Ethics

必须写清楚：

- AI-FMS 是 educational and research prototype。
- 不做 medical diagnosis。
- 不预测 injury risk。
- 不自动识别 pain。
- 不替代 certified professionals。
- 数据需要 consent、匿名化和安全存储。
- 小样本 demo 不能支持 clinical accuracy claims。

这部分不削弱项目，反而体现 Ronnie 对 AI 边界和真实专业场景的理解。

## 14. V2+ Expansion Plan

### 7-Movement Platform

平台层面保留 7 个 FMS movements：

1. Deep Squat
2. Hurdle Step
3. In-Line Lunge
4. Shoulder Mobility
5. Active Straight Leg Raise
6. Trunk Stability Push-Up
7. Rotary Stability

### 推荐扩展顺序

1. Active Straight Leg Raise：侧面角度和腿部活动度较容易量化。
2. Shoulder Mobility：与游泳和肩部功能叙事高度相关。
3. Hurdle Step：适合展示单腿稳定性和左右侧比较。
4. In-Line Lunge：动作价值高，但对视频视角和稳定性要求更高。

## 15. Conclusion

结论建议强调：

- AI-FMS 展示了 Ronnie 如何把运动经验转化为技术问题。
- 项目有真实系统设计、数据结构、AI evidence、human-in-the-loop workflow 和 evaluation plan。
- 这是一个可继续扩展的 sports health technology 项目，而不是一次性的 demo page。

## 附录建议

- Appendix A：UI screenshots。
- Appendix B：Pose landmark schema。
- Appendix C：Dataset export schema。
- Appendix D：Dataset card。
- Appendix E：Demo script。
- Appendix F：Future work and limitation statement。
