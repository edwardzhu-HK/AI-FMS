# AI-FMS V1.7 动作扩展开发计划

本文档用于约束 Deep Squat 之后的动作扩展。目标不是一次性把 7 个动作都做成
自动评分，而是把当前已经跑通的 Deep Squat pipeline 扩展成可复用的平台能力，
并用一个新动作先完成端到端验证。

## 一、总体原则

1. 先扩平台结构，再扩单个动作。
2. 每次只新增一个 movement-specific pose pipeline，避免多个动作同时变复杂。
3. 任何 AI 建议都必须保留 reviewer 最终裁决，不替代人工评分。
4. 对视频视角不合适、pose 质量不足、动作规则不确定的 segment，输出
   `insufficient_evidence`，不强行给分。
5. Export schema 优先保持向后兼容；如需 schema version bump，先单独确认。

## 二、推荐动作顺序

### 第一扩展动作：Active Straight Leg Raise

选择理由：

- 现有样本数量和标注线索相对充足。
- 动作主要依赖 side-view leg angle、hip/ankle/knee landmarks，和当前
  MediaPipe pose data 兼容度较高。
- 适合做“第二个 pose-based movement”的证明：它和 Deep Squat 不同，但仍能
  复用 pose extraction、segment、reviewer、export package 这条链路。

首轮候选样本：

- `1 rep score 1 for right.mp4`
- `2 reps score 3.mp4`
- `2 reps score 3 (2).mp4`
- `4 reps score 2.mp4`
- `5 reps score 3.mp4`

这些样本先用于开发和 QA，不直接声称形成正式训练集。

### 第二扩展动作：Shoulder Mobility

选择理由：

- 与 swimming、shoulder mobility、sports health technology 的申请叙事关系强。
- 但它对手腕、肩、躯干遮挡更敏感，pose feature 规则需要更谨慎。

### 后续动作

1. Hurdle Step：适合 left/right comparison 和 single-leg stability。
2. In-Line Lunge：视角、稳定性、左右侧判断更复杂，放在后面更稳。
3. Trunk Stability Push-Up / Rotary Stability：先保留 annotation workflow，
   不急于做 pose-based suggestion。

## 三、开发先后顺序

### Step 0：冻结当前 Deep Squat baseline

目标：确保扩展前的 Deep Squat 不被破坏。

动作：

- 保留现有 Deep Squat demo preset、pose overlay、timing QA、features、
  pose-based suggestion、dataset package export。
- 每次扩展后跑 `npm run check`。
- 浏览器回归至少覆盖：Load Demo、Start Analysis、Preview Suggested Timing、
  保存 Reviewer A/B、导出 Package。

是否涉及结构变化：否。

### Step 1：建立 movement adapter 边界

目标：把 Deep Squat 专属逻辑包在统一接口后面，为第二个动作接入留入口。

建议接口概念：

```js
{
  actionType,
  canAnalyzePose(context),
  buildTimingReport(context),
  buildFeatureReport(context),
  buildSuggestionReport(context),
  getFeatureCardTitle(language),
}
```

预期改动：

- 新增 `src/lib/movement-adapters.js` 或 `src/lib/movements/*`。
- Deep Squat 现有 `deep-squat-*` 文件先不重写，只被 adapter 调用。
- `App.jsx` 从“如果 selectedAction 是 deep_squat”逐步变成“查找当前动作的
  adapter”。

是否涉及结构变化：是，属于代码框架结构变化，但不改变数据 schema。实施前需要
确认一次。

2026-05-30 更新：这一层已经升级为 `movement capability registry + adapter`。
registry 负责回答每个 action 当前处于哪种能力状态：

- `implemented`：有 pose timing、pose features 和 pose-based AI suggestion。
- `features_only`：有 reviewer-readable pose evidence，但暂不开放 AI scoring。
- `annotation_only`：只做人工 segment review、RAW SCORE、adjudication 和 export。

同时新增 per-segment `evidence gate`：只有 pose quality、timing、features 和
suggestion 都达到最低条件时，UI 和导出才把该 segment 标为可展示 pose-based AI
suggestion。否则保守显示为 missing pose、timing needs review、insufficient
features、features-only 或 annotation-only。

### Step 2：准备 ASLR pose assets

目标：为 Active Straight Leg Raise 生成并验证真实 pose JSON。

动作：

- 从首轮候选样本中选择 2-3 个最清晰样本。
- 使用现有 MediaPipe extraction script 生成 `*.pose.json`。
- 用现有 `pose-landmarks` schema validator 检查：
  - frames total
  - frames with pose
  - missing frame ratio
  - average visibility
- 不合格样本只进入 annotation workflow，不进入 pose suggestion。

是否涉及结构变化：否。

### Step 3：ASLR timing 先做最小可用

目标：先能定位每次 leg raise 的动作窗口，而不是马上追求精细评分。

首轮 timing evidence：

- raised ankle/foot 的 vertical trajectory。
- hip-to-ankle angle 或 leg elevation proxy。
- low/high point 的稳定性。
- segment coverage ratio。

输出状态：

- `ok`
- `needs_adjustment`
- `insufficient_pose`
- `unsupported_view`

是否涉及数据结构变化：可能不需要。现有 `poseTiming` 已经能保存
`status`、`currentStartSecond`、`suggestedStartSecond`、`metrics`、`issues`。
如果 ASLR 需要新增 `movementPhase` 或 `sideDetected` 字段，需要先确认。

### Step 4：ASLR features 做 reviewer-readable evidence

目标：先解释“为什么系统认为这段动作质量较好/需关注”，而不是追求官方级别自动评分。

首轮 feature candidates：

- Hip flexion / leg raise angle：抬腿幅度 proxy。
- Pelvic stability：骨盆或躯干代偿 proxy。
- Knee extension / leg line：膝部弯曲或腿线 proxy。
- Side confidence：当前 segment 是否能明确判断 left/right/bilateral。

输出要求：

- 每个 feature 都要有 label、status、metric。
- 对不适合的视角输出 `not_applicable`。
- UI 文案必须说明这是 pose-based evidence，不是 certified FMS judgment。

是否涉及数据结构变化：原则上不需要。现有 `poseFeatures.ratings` 和
`poseFeatures.metrics` 是开放对象，可以承载 ASLR feature keys。

### Step 5：ASLR suggestion 接入 AI 建议卡

目标：让 AI 建议卡支持多个动作，但保持“基于 Pose 的 AI 建议”这个统一心智模型。

预期改动：

- 把 `DeepSquatFeatureSnapshot` 泛化为 movement-aware feature snapshot，或新增
  `MovementFeatureSnapshot` 后让 Deep Squat 也走同一层。
- Suggestion model version 从 `pose-features-v0.1` 扩展为带动作名的版本，例如
  `pose-features-v0.2-aslr`。
- AI 建议卡继续显示 total score、criteriaScores、legacy-compatible subscores、
  confidence、reasons、Pose vs final。

是否涉及结构变化：是，属于 UI/component 抽象变化。实施前需要确认一次。

### Step 6：Export package 兼容多动作 pose evidence

目标：导出包能明确说明哪些动作已经有 pose evidence，哪些只是 annotation-only。

优先策略：

- 不改 `ai_fms_dataset_v1_5_draft` 主 schema。
- 更新 `implementedPoseActionTypes`，新增 `active_straight_leg_raise`。
- `records[].poseFeatures` 和 `records[].poseSuggestion` 继续使用开放结构。
- `records[].movementCapability` 和 `records[].poseEvidenceGate` 用于解释当前
  action/segment 的 AI 能力状态，避免把 feature-only 或 annotation-only 误读为
  已经完成 AI scoring。
- 在 README / dataset card 中写清楚 ASLR 是第二个 experimental pose pipeline。

是否涉及数据结构变化：默认不需要。若要升级为 `ai_fms_dataset_v1_7_draft`，
需要单独确认。

### Step 7：测试与验收

自动测试：

- adapter registry test。
- Deep Squat adapter regression test。
- ASLR timing test。
- ASLR feature test。
- ASLR suggestion test。
- dataset export multi-action evidence test。

浏览器验收：

1. Deep Squat 旧路径仍可完整跑通。
2. ASLR 样本可加载、切段、显示 skeleton。
3. ASLR 至少一个 segment 能生成 feature snapshot。
4. AI 建议卡能显示 ASLR 的 pose-based suggestion 或清楚说明 evidence 不足。
5. 导出 package 包含 ASLR pose evidence 元数据。

## 四、必须先告知用户的变更

以下情况出现时，先停下来说明，不直接改：

1. 需要改变 dataset schema version。
2. 需要改变 segment record 的核心字段名或字段含义。
3. 需要把 Deep Squat 专属组件替换成通用组件并影响现有 UI。
4. 需要新增大型依赖或改变 pose extraction 工具链。
5. 需要改变 7 个动作的 scoring rubric 表达方式。
6. 需要把 demo preset 结构从 Deep Squat 专属改成全动作通用。

以下情况可直接推进：

1. 新增 ASLR 专属 lib 文件和测试。
2. 新增 adapter registry，但保持 Deep Squat 行为不变。
3. 新增 ASLR pose JSON、manifest、demo candidate 文档。
4. 在导出包中增加向后兼容的 optional metadata。
5. 更新中文说明文档和 backlog。

## 五、第一轮开发目标

第一轮不追求“ASLR 全自动准确评分”，只追求一个可信的最小闭环：

> Active Straight Leg Raise 可以使用真实 pose JSON，生成动作窗口建议、
> reviewer-readable feature evidence、保守的 pose-based AI suggestion，并进入
> dataset package export。

验收口径：

- 至少 1 个 ASLR 样本端到端可演示。
- Deep Squat 不回退。
- Export package 能区分 Deep Squat 与 ASLR 的 pose evidence。
- UI 不声称医学诊断或 certified scoring。
