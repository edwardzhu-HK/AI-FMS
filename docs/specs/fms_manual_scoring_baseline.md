# FMS Manual Scoring Baseline

日期：2026-05-30

来源说明：Ronnie 已参考用户提供的 **FMS Level 1 Manual V2.9, Nov 2021**。
该手册属于受版权保护的课程材料，本项目不复制或再分发手册原文。本文只沉淀
AI-FMS 自身实现和 reviewer workflow 所需的评分边界与数据结构原则。

## 1. 系统边界

AI-FMS 可以把 FMS manual 作为 scoring rubric reference，但产品定位仍然是
AI-assisted、human-in-the-loop 的 FMS video annotation / movement-quality
dataset 平台，不替代 certified FMS professional，也不作为医疗诊断工具。

AI 输出应被描述为：

- pose-based evidence；
- AI-assisted score suggestion；
- timing / visibility confidence；
- reviewer-facing explanation。

human reviewer 仍负责确认 pain、clearing tests、setup ambiguity，以及最终分数
判断。

## 2. 分数类型

AI-FMS 需要区分四层概念：

- **Attempt score**：某一次 attempt / repetition 在特定 setup condition 下的分数。
- **Raw score**：动作侧别或 rep 级别的原始分数记录。
- **Final score**：应用 side、pain、clearing-test、staged-attempt 等规则后的
  movement-level 分数。
- **Total score**：完整 screen 中多个 movement final scores 的总和。

当前项目里的 segment-level label 不应被直接当作 official FMS final score。只有在
movement-level final score rule 通过之后，它才可以进入 final score 层。

## 3. 全局规则

- 分数值为 `0`、`1`、`2`、`3`。
- 测试中出现 pain，或 clearing test 为 positive / fail，相关 movement final score
  应为 `0`。
- 对 bilateral movements，需要保留左右两侧 raw scores；movement final score 取较低
  一侧。
- 必要时可以记录最多三次 attempt。
- 在 official setup / staged condition 下，最佳有效 attempt 决定 movement final
  score。
- Camera-view limitation 必须显式标注。如果视频缺少某项 criterion 需要的视角，AI
  应标记 evidence incomplete，而不是强行输出高置信 final score。

## 4. Deep Squat Final Score Rule

Deep Squat 是 staged scoring process：

1. 先评估 heels on the floor 的 attempts。
2. 如果任意 floor attempt 满足 score-3 criteria，Deep Squat final score 为 `3`。
3. 如果没有 floor attempt 达到 `3`，再评估 FMS board / heel-elevated attempts。
4. Heel-elevated attempts 不能产生 `3`，最高只能用于区分 `2` 与 `1`。
5. 如果 heel-elevated attempt 满足 score-2 criteria，Deep Squat final score 为
   `2`。
6. 如果 heel-elevated 后仍不满足 score-2 criteria，Deep Squat final score 为 `1`。
7. 测试中 pain 或相关 clearing fail 会覆盖以上规则，使 final score 为 `0`。

因此，一个视频如果显示 floor attempts 未达 `3`，随后 heel-elevated attempts 表现良好，
它不应继续停留在 pending。只要没有 pain，且 heel-elevated attempt 满足 score-2
criteria，movement-level Deep Squat final score 应为 `2`。

## 5. Deep Squat Evidence Model

Deep Squat 每个 attempt 应记录：

- `attemptCondition`：`floor` 或 `heels_elevated_board`。
- `attemptIndex` / `repetitionIndex`：test 内顺序。
- `segmentId`：关联的视频 segment。
- `cameraViewEvidence`：front、side 或 both。
- `attemptScoreSuggestion`：`0`、`1`、`2`、`3`，或 evidence insufficient 时为
  `null`。
- `painFlag`：只由 human reviewer 确认。
- `criteriaEvidence`：
  - torso relative to tibia；
  - femur / depth relative to horizontal；
  - knees relative to feet；
  - dowel relative to feet；
  - heel elevation condition。

movement-level Deep Squat final score 应由这些 attempt records 推导，而不是由某个
孤立 segment 直接决定。

## 6. Front / Side View Handling

FMS manual 的人工观察通常需要 front 和 side 信息。AI-FMS 应遵循同样原则：

- Front view 更适合观察 knees tracking relative to feet、symmetry、dowel lateral
  drift，以及明显的 foot / heel setup。
- Side view 更适合观察 depth、torso-tibia relationship、hip/knee/ankle flexion，
  以及 dowel-over-feet relationship。
- 单一 front-view video 可以提供 partial evidence，但不应被当作完整、高置信 Deep
  Squat scoring。
- 单一 side-view video 可以支持 depth / torso evidence，但 front-view knee tracking
  仍然受限。

## 7. 当前实现影响

已从 Ronnie 导入的第一波稳定内容：

- `src/lib/fms-final-score.js`：Deep Squat movement-level final score preview。
- `tests/fms-final-score.test.js`：保护 floor attempt、heel-elevated/FMS board、
  pain-zero、human consensus 优先等规则。

当前实现刻意保持低风险：final-score preview 已进入源码和测试，但尚未接入主 UI 或
dataset export。下一步如果验证通过，可以再加入 Deep Squat final score panel，并在
export 中同时保留 attempt-level records 和 movement-level final score record。

## 8. 后续实现建议

1. 增加 movement-level `finalScore`，并继续与 segment-level AI/reviewer labels 分开。
2. 增加 Deep Squat attempt grouping：floor attempts vs heel-elevated board attempts。
3. 将 `attemptCondition` 纳入 segment metadata UI。
4. 增加 Deep Squat final score panel，解释 `3`、`2`、`1`、`0` 的来源。
5. 保持 segment-level pose suggestions 作为 evidence，而不是 official final score。
6. Export 同时包含 attempt-level records 和 movement-level final score records。
