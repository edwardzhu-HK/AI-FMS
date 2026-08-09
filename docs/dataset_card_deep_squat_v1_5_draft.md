# AI-FMS Deep Squat Dataset Card Draft

> 历史文件：本草案记录 2026-05-22 的单视频 V1.5 状态，不再作为当前数据说明。
> Canonical 文件为 `docs/research/ai_fms_phase_i_dataset_card_2026-08-09.md`。

Date: 2026-05-22

## 1. 数据集定位

本数据集是 AI-FMS 项目的第一版 Deep Squat flagship dataset draft，用于支持
human-in-the-loop FMS video annotation、movement-quality evidence review 和
未来 movement-quality model training。

它不是医疗诊断数据集，也不是自动替代 certified FMS professionals 的评分系统。
当前重点是建立可追溯、可解释、可复核的运动筛查标注流程。

## 2. 当前范围

当前已完成的可演示范围：

- Movement: Deep Squat
- Source video: `Eval_Videos/01-Deep Squat/Sample-1.mp4`
- Expected repetitions: 7
- Camera views: 前 3 个 front view，后 4 个 side view
- Pose source: MediaPipe Pose Landmarker exported JSON
- Annotation workflow:
  - duration-aware upload range
  - segment list
  - selected-segment metadata correction
  - reviewer A/B scoring
  - adjudication
  - JSON/CSV export

## 3. 输出格式

### JSON Export

JSON export 使用 `ai_fms_dataset_v1_5_draft` schema。

每条 segment record 包含：

- video / segment identifiers
- action type
- repetition index
- camera view
- original suggested timing
- current reviewer-adjusted timing
- reviewer A/B scores
- AI/rules baseline score
- final adjudicated label
- pose timing QA
- pose feature snapshot
- pose-based explainable suggestion

### CSV Export

CSV export 是给 reviewer inspection、spreadsheet review 和 application package
准备的轻量表格版本。

CSV 不嵌入 raw landmarks，只展开每条 segment 的关键字段：

- segment timing
- reviewer/final scores
- pose timing status
- suggested pose timing
- pose feature ratings
- pose suggestion score/confidence/reasons

## 4. Pose Evidence

当前 pose evidence 来自 `ai_fms_pose_landmarks_v1` JSON。

为了避免导出包过大，dataset export 不嵌入完整 per-frame landmarks，而是保留：

- pose summary
- timing QA summary
- feature summary
- suggestion summary
- per-segment poseTiming
- per-segment poseFeatures
- per-segment poseSuggestion

当前 implemented pose action type:

- `deep_squat`

V2+ planned action types:

- `deep_squat`
- `hurdle_step`
- `in_line_lunge`
- `shoulder_mobility`
- `active_straight_leg_raise`
- `trunk_stability_push_up`
- `rotary_stability`

## 5. Deep Squat Feature Evidence

当前 first-pass features：

- Depth
  - peak depth ratio
  - hip-vs-knee vertical gap
- Torso Control
  - side-view trunk lean degrees
- Knee Alignment
  - front-view knee-vs-ankle lateral offset

这些 feature 是 reviewer-readable evidence，不是最终医学结论。

## 6. Explainable AI Suggestion

Pose-based suggestion 当前使用透明规则：

- `good` -> subscore 3
- `watch` -> subscore 2
- `limited` -> subscore 1
- `not_applicable` 不扣分，但降低 confidence

当前 `Sample-1.mp4` 的方向性验证结果：

- 前 6 个 repetition 建议 total score 为 3。
- 第 7 个 side-view repetition 因 `forward lean watch`，torso control 建议 2，
  total score 建议 2。
- 这与人工 notes 中“最后一个 2 分”的方向一致。

## 7. 已知限制

- 当前只有 Deep Squat 有真实 pose pipeline。
- 其他 6 个 movement 已在产品框架中预留，但尚未导入 sample video 和 movement-specific
  pose features。
- 当前 pose JSON 需要手动加载，尚未由 backend analysis job 自动关联。
- Feature thresholds 是 first-pass interpretable rules，需要更多样本校准。
- 当前不做 clinical diagnosis、不预测 injury risk、不自动判断 pain。

## 8. 申请叙事价值

这个 dataset draft 展示了 Ronnie 项目中比较关键的能力链条：

- 从长期游泳训练经验出发，关注 movement quality 和 injury-prevention-aware
  training。
- 学习 FMS movement screening，并把观察过程转成结构化标注 workflow。
- 使用 AI pose estimation 提取可解释运动证据，而不是只给黑盒分数。
- 保留 human reviewer workflow，让 AI suggestion 可以被比较、修正和审计。
- 为未来 Human Movement Science / Kinesiology / Sports Health Technology 方向
  准备可扩展的数据基础。

## 9. 下一步

短期：

- 导入 `front.mp4`、`side.mp4` 或其他已准备的 remaining movement samples。
- 生成更多 pose JSON。
- 扩展 CSV export 和 summary dashboard。
- 准备 demo walkthrough script。

中期：

- 为 Active Straight Leg Raise、Shoulder Mobility、Hurdle Step、In-Line Lunge
  定义 movement-specific features。
- 对比 AI suggestion、reviewer labels 和 final adjudication。
- 形成 application-ready technical report 和 project page。
