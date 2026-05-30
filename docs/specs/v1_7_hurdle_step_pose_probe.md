# V1.7 Hurdle Step Pose Probe

本文档记录 Hurdle Step 第一轮 pose extraction 试跑结果。目标不是马上实现
pose-based AI suggestion，而是判断 Hurdle Step 是否适合作为 ASLR 和 Shoulder
Mobility 之后的第三个 movement expansion，并提前观察它对 invalid period /
active-period workflow 的要求。

## 结论

Hurdle Step 可以进入下一步 timing / feature probe，但它比 ASLR 更依赖侧别、
跨栏脚、支撑腿稳定性和摄像机角度。首轮不建议直接做自动评分，建议先做
feature-only evidence，再由 reviewer 判断是否能映射到 FMS subscore。

当前更适合作为主开发样本的是 `7 reps score 3.mp4`：pose coverage 较好，缺帧约
6%，动作段相对集中。`2 reps score 3.mp4` 的平均 visibility 很高，但缺帧接近 20%，
active-period 被切成多个片段，更适合验证片段选择和无效时间处理。

## 样本选择

| 样本                 | 评分线索 | 选择原因                                      |
| -------------------- | -------- | --------------------------------------------- |
| `7 reps score 3.mp4` | score 3  | pose coverage 较好，适合作为首个主 probe。    |
| `2 reps score 3.mp4` | score 3  | 时长较短，但缺帧偏高，适合 active-period QA。 |

## 生成命令

生成的 pose JSON 是本地大文件，按 `.gitignore` 不提交到 Git。可以用以下脚本复现：

```bash
npm run pose:extract:hurdle:score3-2reps
npm run pose:extract:hurdle:score3-7reps
```

如果本机 MediaPipe 在沙盒内无法创建图形上下文，需要在 Codex 中允许提升权限运行
现有 `.venv/bin/python scripts/extract-pose-landmarks.py` 命令。

## 输出位置

```text
Eval_Videos/Sample videos/2-Hurdle step/pose/2-reps-score-3.pose.json
Eval_Videos/Sample videos/2-Hurdle step/pose/7-reps-score-3.pose.json
```

## Pose Quality Summary

| Pose JSON                  |  Frames | Missing ratio | Avg visibility | 备注                                       |
| -------------------------- | ------: | ------------: | -------------: | ------------------------------------------ |
| `2-reps-score-3.pose.json` | 370/462 |         0.199 |          0.962 | visibility 高，但缺帧偏高，需谨慎。        |
| `7-reps-score-3.pose.json` | 556/592 |         0.061 |          0.933 | 当前更适合作为 Hurdle Step 主 probe 样本。 |

## Active Period 观察

| Pose JSON                  | 建议范围     | Motion fragments | 观察                                         |
| -------------------------- | ------------ | ---------------: | -------------------------------------------- |
| `2-reps-score-3.pose.json` | 4.2s - 40.2s |                6 | 动作/等待/准备被切成多段，适合验证片段按钮。 |
| `7-reps-score-3.pose.json` | 4.7s - 55.6s |                2 | 大段动作相对集中，但仍有明显开头准备时间。   |

这进一步验证 Ronnie 提出的真实场景：普通视频中不能默认全程都是有效动作。当前 UI 已经
支持显示多个 detected periods，并允许 reviewer 把某一个片段应用到 Start/End。真正
把多个片段同时保存为多个视频 segment，仍然需要后续 schema review。

## 第一版 Feature Candidate

Hurdle Step 首轮 feature-only evidence 已加入 helper 和单元测试：

- `stepClearance`: 跨栏脚 ankle / knee 是否出现明显抬升。
- `stanceStability`: 支撑侧 hip/knee/ankle 是否相对稳定。
- `trunkControl`: shoulder/hip center 是否出现明显左右偏移或前倾 proxy。
- `sideConfidence`: 当前 segment 是否能判断 left/right side。

这些 feature 先服务 reviewer-readable evidence，不直接声称 certified FMS scoring。

## 第二版 Hurdle Step Scoring Evidence

截至 2026-05-30，Hurdle Step 已从 first-pass proxy 升级为更接近动作本身的
pose-based reviewer support。它仍然不是 certified FMS 自动评分，而是给 reviewer
提供可解释的 raw-score 建议和证据理由。

新增的 movement-specific evidence：

- `hurdleClearance`: 跨步腿是否进入 score 3 / score 2 / score 1 clearance proxy 区间。
- `stanceLegControl`: 支撑腿膝角和支撑脚踝漂移，用于观察支撑腿是否稳定。
- `pelvisTrunkControl`: 肩/髋中心偏移与左右髋高度差，用于观察骨盆和躯干控制。
- `stepLegAlignment`: 跨步侧 hip-knee-ankle 线条和膝角，用于观察 knee-ankle-line proxy。

为了保持导出和旧 UI 的兼容性，`stepClearance`、`stanceStability`、`trunkControl`
仍然保留，但新版 suggestion 优先使用上面四个 Hurdle-specific ratings。当前 subscore
映射为：

| Hurdle Step rubric slot | Pose evidence                                        |
| ----------------------- | ---------------------------------------------------- |
| `Hip Mobility`          | `hurdleClearance`                                    |
| `Balance Control`       | `stanceLegControl` + `pelvisTrunkControl` 中较保守者 |
| `Knee-ankle Line`       | `stepLegAlignment` + `sideConfidence` 中较保守者     |

## Timing Helper 试跑结果

第一版 `hurdle-step-timing.js` 已加入单元测试，能够在 synthetic fixture 中检测左右脚
交替抬升的 candidate cycles，并沿用现有 `poseTiming` 报告形状，不改变 export
schema。

真实样本上的首轮结果说明：当前 helper 检测的是 `step clearance peaks`，还不是最终
FMS repetition 边界。Hurdle Step 一个 rep 里可能包含跨过、落地、返回等多个动作峰，
所以真实视频会出现 over-detect，需要后续结合 side、stance leg 和动作阶段再收敛。

| Pose JSON                  | Candidate cycles | 观察                                                        |
| -------------------------- | ---------------: | ----------------------------------------------------------- |
| `2-reps-score-3.pose.json` |                5 | 能抓到明显抬脚峰，但多于文件名中的 2 reps，不能直接当切片。 |
| `7-reps-score-3.pose.json` |               13 | 能覆盖主要动作段，但一个 rep 内可能有多个 clearance peaks。 |

这一步的价值是证明 MediaPipe pose 轨迹能提供 Hurdle Step 的基础 timing evidence；
下一步需要把 `candidate cycles` 转成更接近 reviewer 直觉的 segment 建议。

## Feature Helper 试跑结果

新版 `hurdle-step-features.js` 会基于 timing cycle 的 peak frame 和 segment window
输出 reviewer-readable evidence，并可生成 pose-based AI suggestion。

在 `7-reps-score-3.pose.json` 的前 4 个 candidate cycles 上试跑，feature helper 能
输出可用 evidence：

| Metric                 | 结果  | 说明                            |
| ---------------------- | ----- | ------------------------------- |
| usable repetitions     | 4/4   | 前 4 个 candidate cycles 可用。 |
| average peak clearance | 0.193 | 跨栏脚抬升 proxy。              |
| average stance drift   | 0.016 | 支撑脚稳定性 proxy。            |
| average visibility     | 0.961 | 关键点整体可见度较好。          |

首个 candidate cycle 的核心 ratings 包括 `hurdleClearance`、`stanceLegControl`、
`pelvisTrunkControl`、`stepLegAlignment`、`sideConfidence`。但这仍然建立在 pose
cycle 和 reviewer 可复核 segment 上，不能直接等同最终 FMS person-level score。

## Demo Path

Hurdle demo path 已接入：`Demo Preset` 选择 `Hurdle score-3 sample`
后，会默认使用 `17.0s - 55.6s` 的分析范围，避开开头准备时间。可以验证 skeleton、
Timing QA、Hurdle Step Features、pose-based AI suggestion 和 dataset export。

浏览器 smoke 已验证：

- Action 为 `Hurdle Step`。
- `7 clips` 可以生成。
- `Hurdle Step Features` 显示 7/7 usable，visibility 约 95%。
- 右侧 summary 显示 `基于 Pose 的 AI 建议`，但仍定位为 reviewer support。
- Timing helper 会优先选择落在当前 segment 内、离 segment 中心最近的 cycle，减少
  准备时间或重复峰导致的错配。

## 下一步

1. 继续用更多 Hurdle Step 样本校准 threshold，特别是 score 1/2 mixed 样本。
2. 继续校准 timing：减少一个 rep 内的重复峰，并明确 side/return phase。
3. 若要把 candidate cycles 合并为正式 segment，需要先评审 schema/provenance 语义。
