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

## 7. Active Straight Leg Raise Manual Rule

Active Straight Leg Raise 的一个完整 rep 必须包含：

1. 仰卧起始位，双腿伸直并保持稳定；
2. 一侧腿主动抬起到该 attempt 的最大幅度；
3. 抬起腿回到起始位。

AI-FMS 的 ASLR timing 不应把讲解过程中的脚踝小幅摆动、教练调整、或尚未回到起始位的局部波动拆成多个
rep。只有覆盖“起始位 -> 最大抬腿 -> 回到起始位”的完整片段，才可以作为一个 scoreable
segment。

ASLR 是 bilateral movement，raw score 应分别保留 left / right side，movement-level final
score 取较低侧。Pose proxy 可以用于 hip flexion / active leg raise zone、stationary leg
control、pelvic stability、knee extension 和 side evidence；但如果视频视角或 setup 不能支持某项
criterion，应标记 evidence incomplete，而不是强行输出高置信 final score。

## 8. Hurdle Step Manual Rule

Hurdle Step 的一个完整 rep 必须包含：

1. 起始位稳定站好；
2. moving leg 前伸 / 跨过 hurdle；
3. heel 触地；
4. moving leg 回到起始位。

评分边界按 FMS Level 1 Manual V2.9, Nov 2021 的 Hurdle Step rubric 处理：

- `3`：下肢对齐、躯干/腰椎控制、dowel 与 hurdle 的相对姿态都满足高质量动作要求。
- `2`：没有达到 `3` 的动作质量，但仍能完成完整 movement pattern，常见 evidence 包括
  hips / knees / ankles alignment 丢失、lumbar compensation 或 dowel / hurdle 不再平行。
- `1`：不能清过 hurdle / cord，或出现 loss of balance。视频里能观察到 foot 与 hurdle
  kit / cord path 发生 contact 时，应按 score-1 规则处理，而不是降级为普通 score-2
  compensation。
- `0`：测试中出现 pain。

AI-FMS 的 Hurdle Step pose suggestion 必须优先遵循以上 manual rule。Pose proxy 可以用于
clearance、stance control、pelvis/trunk control 和 step-leg alignment evidence；但一旦
reviewer/AI 视觉证据确认 hurdle contact 或 loss of balance，应直接输出 score `1`
evidence，并在 reasons 中说明这是 FMS manual score-1 rule，不得把它解释成 `2` 分。

对于 bilateral Hurdle Step，raw score 应分别保留左右侧，movement-level final score 取较低侧。

## 9. Rotary Stability Manual Rule

Rotary Stability 的一个完整 rep 必须包含：

1. 四足支撑起始位，双手、双膝/下肢稳定贴地；
2. 手、膝和脚离地，并完成 elbow-knee touch；
3. 对应的手臂和腿完全伸展；
4. 再次完成 elbow-knee touch；
5. 回到四足支撑起始位。

AI-FMS 的 Rotary Stability timing 不应把单个 best reach frame、教练示范、setup 调整、或后面的静态讲解图片当成
scoreable segment。只有覆盖“起始位 -> touch -> full extension -> touch -> 回到四足支撑位”的完整片段，
才可以作为一个 Rotary Stability rep。

评分边界必须遵循 FMS manual：

- `3`：能完成同侧 arm/leg pattern，并保持 spine / board alignment 和稳定控制。
- `2`：不能完成同侧 pattern，但能完成对侧 diagonal pattern，并保持可接受控制。
- `1`：不能完成 diagonal pattern。
- `0`：测试中出现 pain，或 flexion clearing test 为 positive / fail。

Frozen AI v1.0 中 Rotary Stability 仍是 feature-only / pose-evidence-only。Workbench
v1.1 另有明确标注为 experimental 的 cycle-based first-pass，可依据两次触踝、肘膝
伸展、离地时序和回位证据提出保守 AI RAW SCORE 或 abstain。它不进入 blind Study
Mode；raw score 建议、board alignment 和 clearing / pain 结果仍必须由 human
reviewer 按 FMS manual 确认。

## 10. 当前实现影响

已从 Ronnie 导入的第一波稳定内容：

- `src/lib/fms-final-score.js`：Deep Squat movement-level final score preview。
- `tests/fms-final-score.test.js`：保护 floor attempt、heel-elevated/FMS board、
  pain-zero、human consensus 优先等规则。

当前实现刻意保持低风险：final-score preview 已进入源码和测试，但尚未接入主 UI 或
dataset export。下一步如果验证通过，可以再加入 Deep Squat final score panel，并在
export 中同时保留 attempt-level records 和 movement-level final score record。

## 11. 后续实现建议

1. 增加 movement-level `finalScore`，并继续与 segment-level AI/reviewer labels 分开。
2. 增加 Deep Squat attempt grouping：floor attempts vs heel-elevated board attempts。
3. 将 `attemptCondition` 纳入 segment metadata UI。
4. 增加 Deep Squat final score panel，解释 `3`、`2`、`1`、`0` 的来源。
5. 保持 segment-level pose suggestions 作为 evidence，而不是 official final score。
6. Export 同时包含 attempt-level records 和 movement-level final score records。
