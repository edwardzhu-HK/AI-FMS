# Camera-Audited Feature Matrix 敏感性分析

## 研究问题

历史 `cameraView` 有 45 / 110 条需要校正。机位校正后，既有 quantitative
features、feature readiness 和 label-free movement profiles 是否仍然稳定？

本分析不覆盖 Round A 已冻结的原始 feature matrix。它保留原 fingerprint 作为审核
lineage，另行生成一份使用 `auditedCameraView` 的 sensitivity matrix。

## 结果

| 指标                         | 结果                         |
| ---------------------------- | ---------------------------- |
| Canonical reps               | 110                          |
| Camera view changes          | 45                           |
| Numeric feature changes      | 4，全部为 Hurdle Step        |
| Rating changes               | 17：Deep Squat 13、Hurdle 4  |
| Feature readiness changes    | 0                            |
| Ready / limited              | 66 / 44，保持不变            |
| Label-free profile changes   | 0                            |
| Round A score strata changes | 0                            |
| Source-effect flag changes   | 0                            |
| Stability-status changes     | 0                            |
| Hurdle outlier-rank changes  | 8，仅名次调整，无 group 变化 |

校正后的 matrix fingerprint 为
`b78662fe61119326459453bc94315deca8b866db64159cd4e435cf2030aeae83`。
原始冻结 matrix fingerprint 仍为
`1c8953cede2dd19af6510d5acb2004948a87c9971207c46e5f8d1dc88d152097`。

## 主要解释

1. 既有 profile 主要结论对 camera metadata 校正是稳定的。66 条 feature-ready、四动作
   分组、7 个 Round A score strata、来源效应和 leave-one-video-out 状态均未改变。
2. Deep Squat 的连续数值没有变化，但 13 条 rep 的 view-aware ratings 被纠正。侧面
   片段现在使用 hip/knee/ankle angle 与 torso evidence，不再误用 front-only knee
   alignment。
3. Hurdle Step 有 4 条 rep 的 `stanceAnkleDrift` 和 `stanceKneeAngleDegrees` 被移除，
   因为其审计机位为 side 或 mixed，这两个 front-only 指标不应作为可靠证据。
4. ASLR 和 Rotary Stability 的数值及 ratings 不受机位字段影响，但 metadata 已修正，
   可供后续分层和报告使用。

## Case Study 影响

- Deep Squat 首要 pair 的两条 rep 均为审计后的 `side`，数值参数保持不变；两条的
  torso、hip 和 knee angle 现在都得到侧面 evidence rating，主结论增强。
- Hurdle Step outlier `rep_40850b8084c3` 的 `stanceAnkleDrift` 现为不适用。此前 AI
  与 reviewer 对支撑腿稳定性的冲突，现可解释为错误机位触发 front-only feature，
  不再保留为动作层面的 AI-human discrepancy。
- Hurdle Step pair 仍为 mixed 对 front，继续作为 view-confounded 方法学案例，不能
  作为 movement-only 主证据。

## 可复现证据

- 命令：`npm run data:pilot:features:camera-audited`
- 脚本：`scripts/build-camera-audited-feature-matrix.js`
- 输出：`research/pilot-v1/generated/camera-audited-features/`
- 文件：audited matrix JSON/CSV、sensitivity JSON/报告和 `SHA256SUMS`

## 使用边界

这是一项 metadata sensitivity analysis，不是新的正式人工实验。Round A manifest
继续引用原始冻结 matrix；新的 AI evidence、机位分层和申请 case table 应使用审计
matrix。所有数值仍是 pose-derived proxy，不是医疗诊断或临床量角器测量。
