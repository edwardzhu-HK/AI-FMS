# Round A 九条 AI 差异定向复核

## 结论

九条复核没有支持“直接调整几个阈值就能把 AI 分数调准”。它们主要揭示了三种更有
价值的问题：协议字段没有进入规则、pose/timing 选错了动作证据，以及人工评分依赖
完整动作轨迹而当前 AI 多数只看一个关键帧。

本轮没有使用 Round A 分数重新拟合或移动任何阈值。原始基线继续保留为 9/16 完全
同分、14/16 相差不超过 1 分；补入已审计的 Deep Squat protocol metadata 后，单独
报告 post-audit sensitivity：11/17 完全同分、15/17 相差不超过 1 分，MAE 从
0.5625 降至 0.4706。该变化是数据完整性修正，不是模型训练或独立准确率提升。

## 方法

1. 从既有 Round A follow-up queue 锁定 9 条 actionable reps。
2. 复用冻结的 blindability manifest 和源视频，每条均匀抽取 5 帧高清画面。
3. 逐条对照两位 blind reviewer 的 score、confidence、camera view、side 和 comment。
4. 对照 camera-audited pose features、ratings、AI suggestion 和 FMS staged-attempt
   规则。
5. 只有双 reviewer 协议描述与画面一致时，才补入非分数 metadata；baseline 不改写。

可复现命令：

```bash
npm run study:ai-evidence:audit-previews
npm run study:ai-evidence:round-a
```

## 逐条结果

| Rep                | 动作       |     Human / AI | 主要原因                                                                                | 处理                                           |
| ------------------ | ---------- | -------------: | --------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `rep_489b80ba8943` | Deep Squat |        2 / N/A | 两位 reviewer 和画面均确认脚跟垫板                                                      | 补 `heels_elevated_board`；现有规则输出 2      |
| `rep_ce280c79a07d` | Deep Squat |          2 / 3 | 画面为垫板阶段，但 protocol metadata 未进入规则                                         | 补字段后现有 staged rule 将 3 cap 为 2         |
| `rep_c80a95e3ac44` | Deep Squat | 3 / N/A，raw 2 | 画面确认脚跟着地；AI depth proxy 认为第一阶段只到 2                                     | 保留为真实差异；AI 请求第二阶段动作            |
| `rep_6830e0689f85` | ASLR       |          3 / 1 | Reviewer 认定活动侧为 right，feature row 为 left；画面高度也与 proxy 冲突               | 先排查 active-side 与 peak selection，不调阈值 |
| `rep_8333424d5d28` | ASLR       |          3 / 1 | 杆放错侧，两位 reviewer 均 low confidence；stationary-leg proxy 疑似受遮挡/左右追踪影响 | 作为 pose/protocol QA 案例，不作为阈值锚点     |
| `rep_02b493a8dd09` | Hurdle     |          2 / 3 | 人工看到躯干不稳和杆不平行；现有 proxy 不测杆方向且机位为 mixed                         | 增加全周期 trunk 与 dowel evidence             |
| `rep_39e05034d0ad` | Hurdle     |          2 / 3 | 人工扣分发生在恢复阶段的脚踝内移                                                        | 增加 recovery trajectory，而非只看 peak frame  |
| `rep_d13daa76b8a8` | Hurdle     |          2 / 3 | 人工看到膝和踝动态向内，peak-frame offset 未触发阈值                                    | 增加全周期 frontal knee/ankle path             |
| `rep_806af9055fd6` | Hurdle     |          3 / 2 | 侧面机位难判断 frontal alignment；0.0363 仅比 watch 阈值高 0.0013                       | 降低该证据置信度或转人工复核，不用单例移动阈值 |

## Deep Squat 数据通路修正

分析层原本把 `attemptCondition` 放在 `segment.metadata`，而现有 Deep Squat board
detector 读取 `segment.attemptCondition`。这意味着即使数据补齐，规则仍可能看不到。
现在同一字段同时进入规则实际读取的顶层和兼容 metadata，并有自动测试覆盖。

敏感性结果：

| 指标                     |     冻结基线 | Protocol-audited sensitivity |
| ------------------------ | -----------: | ---------------------------: |
| 可比较                   |           16 |                           17 |
| 完全同分                 |  9/16，56.3% |                 11/17，64.7% |
| 相差不超过 1 分          | 14/16，87.5% |                 15/17，88.2% |
| MAE                      |       0.5625 |                       0.4706 |
| Linear weighted kappa    |      -0.0588 |                       0.1807 |
| Quadratic weighted kappa |      -0.1556 |                       0.0286 |

`rep_c80a95e3ac44` 已从模糊的 `protocol_metadata_required` 收紧为
`staged_followup_attempt_required`：系统知道它是 floor attempt，但 AI raw score 2
意味着按 staged workflow 还需要一次 heels-elevated attempt。这个状态比把它硬判 2
或硬调成 3 更诚实。

## 下一步

1. Round B 前不修改 ASLR/Hurdle 阈值，保持两轮 evidence 可比。
2. 下一轮工程优先级是 ASLR active-side/peak debugging，以及 Hurdle cycle-level
   trajectory features；这两项先在独立视频上验证。
3. Study/annotation export 应持续保存 `attemptCondition`，并在 Deep Squat 缺失时
   fail closed。
4. 最终报告把“协议字段修正”和“模型能力提升”分开，避免把前者包装成准确率进步。

## 证据

- 审计决策：`research/pilot-v1/round-a-targeted-ai-audit.json`
- 私有预览：`research/pilot-v1/generated/round-a-ai-audit-previews/`
- 分析输出：`research/pilot-v1/generated/round-a-ai-evidence/`
- 输出含 baseline comparison、targeted audit CSV、protocol sensitivity CSV、JSON 和
  SHA-256。
