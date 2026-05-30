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
- Reviewer UI 当前仍是 total-only；它会把 total score 临时写入当前动作的所有
  criteria。后续可以升级成 per-criterion reviewer scoring。

## 下一步

1. 给 Reviewer A/B 表单增加 per-action criteria scoring 模式。
2. 让 adjudication 不只比较 total score，也能比较 criteria-level disagreement。
3. 将 CSV 的 criteria score columns 作为主要审核字段，而不是只看 legacy subscores。
4. 当真实后端接入时，把 `criteriaScores` 作为 API 和数据库的一等字段。
