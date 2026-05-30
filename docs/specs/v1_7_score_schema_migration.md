# V1.7 Score Schema Migration

本文档记录 2026-05-30 开始的 score schema 升级。核心原因是早期原型把
Deep Squat 的三个观察维度固化成了通用字段：

```json
{
  "subscores": {
    "depth": 3,
    "kneeAlignment": 3,
    "torsoControl": 3
  }
}
```

这个结构可以支撑 Deep Squat，但不适合长期扩展到 7 个 FMS movements。不同动作的
rubric criteria 不一定都是 3 个，也不应该都叫 depth / knee alignment / torso
control。

## 新主结构

新的长期主结构是 `criteriaScores`：

```json
{
  "totalScore": 2,
  "criteriaScores": [
    {
      "criterionKey": "aslr_hip_flexion",
      "genericKey": "depth",
      "label": "Hip Flexion",
      "score": 3
    },
    {
      "criterionKey": "aslr_pelvic_stability",
      "genericKey": "kneeAlignment",
      "label": "Pelvic Stability",
      "score": 2
    }
  ]
}
```

`genericKey` 是迁移期的兼容桥，用来把旧 UI / CSV / 测试里仍然存在的
`depth`、`kneeAlignment`、`torsoControl` 映射到真实 movement-specific criteria。
后续如果某个动作需要 2 个或 4 个 criteria，可以在 `criteriaScores` 中自然表达，而不必
强行塞进三个旧字段。

## 当前迁移策略

- JSON / CSV / dataset package export 同时写入 `criteriaScores` 和 legacy
  `subscores`。
- AI suggestion helper、mock AI score、reviewer save、adjudication final label 都会
  尽量带上 `criteriaScores`。
- `subscores` 继续保留，作为 UI、旧 API 和旧测试路径的兼容层。
- Reviewer UI 应保持接近 FMS scoresheet 的人工评分方式：reviewer 对该 rep 给出一个
  整体 RAW SCORE，并记录 comment/reason、side、clearing、pain 等元数据。
  不计划把人工评分表升级成强制 per-criterion scoring。
- 当前 reviewer score 中的 `criteriaScores` 只是迁移期兼容快照：系统会把 reviewer 的
  total score 临时写入当前动作的所有 criteria，便于导出结构统一和 adjudication 兼容。
  它不代表人类 reviewer 真的逐项打了细分分。
- 真正的 criteria-level scoring/rationale 主要用于 AI suggestion 和 pose-based
  explanation，用来帮助 reviewer 理解模型为什么给出某个建议分。

## Rep-level RAW SCORE 与左右 / clearing / pain

2026-05-30 的结构补充明确了一点：当前 workbench 的评分对象是一个视频中的某一次
rep/segment，而不是一个人的 FMS FINAL SCORE。

因此每条 record 都写入：

```json
{
  "scoreScope": "rep_raw_score",
  "scoreAggregation": "none",
  "side": "left",
  "sideSource": "reviewer_or_metadata",
  "painFlag": false,
  "clearingTest": "not_applicable",
  "clearingFindings": [
    {
      "key": "shoulder_clearing",
      "label": "Shoulder Clearing",
      "resultType": "positive_negative_pain",
      "result": "negative",
      "affectsRawScore": true
    }
  ],
  "repPolicy": {
    "scoringUnit": "rep",
    "sidePolicy": "left_right",
    "clearingPolicy": "none",
    "painPolicy": "human_observed_or_reported"
  }
}
```

这里的 `side / clearingTest / painFlag` 是该 rep 的实际标注值；`repPolicy` 是该
action 按 FMS scoresheet 应该如何解释这些字段。

- `Deep Squat` 和 `Trunk Stability Push-Up` 当前是 `not_lateralized`，默认
  `side = none`。
- `Hurdle Step`、`In-Line Lunge`、`Shoulder Mobility`、`Active Straight Leg
Raise`、`Rotary Stability` 是 `left_right`，默认 `side = unknown`，后续可由
  AI pose evidence 给出 `aiSideSuggestion`，再由 reviewer 确认。
- `Shoulder Mobility`、`Trunk Stability Push-Up`、`Rotary Stability` 有
  pain clearing；`In-Line Lunge` 还预留了 ankle mobility clearing
  的 R/Y/G 结构位。当前 UI 的 `clearingTest` 仍是 pass/fail/unknown 的兼容字段。
- `clearingFindings` 是新的细粒度结构：
  - `Shoulder Mobility`: `shoulder_clearing`，结果为 negative/positive/unknown。
  - `Trunk Stability Push-Up`: `extension_clearing`。
  - `Rotary Stability`: `flexion_clearing`。
  - `In-Line Lunge`: `ankle_clearing_pain` 和
    `ankle_clearing_mobility`；前者影响 raw score，后者记录 R/Y/G mobility
    evidence，不直接影响当前 raw score。
- `clearingTest` 继续作为 legacy summary 字段保留：如果 pain clearing 为 positive，
  summary 为 `fail`；negative 为 `pass`；没有 clearing 的动作保持
  `not_applicable`。
- `painFlag` 当前不由 AI 自动判定；AI 可以提供可疑证据，但最终应来自 human
  observed/reported input。

当前导出不计算 person-level FINAL SCORE，也不把左右侧最低分自动汇总为人的动作最终分。
这一步应作为后续 person/session-level aggregation workflow 单独实现。

## 下一步

1. 保持 Reviewer A/B 表单为 scoresheet-like RAW SCORE + comment/reason，不做强制
   per-criterion human scoring。
2. 让 adjudication 继续以 human RAW SCORE 为主，同时在 AI 与 human total score 不一致时
   展示 AI criteria-level rationale，帮助 reviewer 复核。
3. 将 CSV 的 criteria score columns 明确标注为 AI/explanation evidence 或兼容快照，
   避免误读为人类 reviewer 的逐项评分。
4. 当真实后端接入时，把 `criteriaScores` 作为 API 和数据库的一等字段。
5. 后续如果进入真实后端，把 `clearingFindings` 作为 rep-level metadata 的一等字段，
   并继续保留 `clearingTest` 作为兼容摘要。
