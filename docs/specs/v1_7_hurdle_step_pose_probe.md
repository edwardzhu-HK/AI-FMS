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

Hurdle Step 首轮可以先尝试 feature-only evidence：

- `stepClearance`: 跨栏脚 ankle / knee 是否出现明显抬升。
- `stanceStability`: 支撑侧 hip/knee/ankle 是否相对稳定。
- `trunkControl`: shoulder/hip center 是否出现明显左右偏移或前倾 proxy。
- `sideConfidence`: 当前 segment 是否能判断 left/right side。

这些 feature 先服务 reviewer-readable evidence，不直接声称 certified FMS scoring。

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

## 下一步

1. 继续校准 Hurdle Step timing：减少一个 rep 内的重复峰，并明确 side/return phase。
2. 新增 `hurdle-step-features.js` 和测试，输出 feature-only evidence。
3. 等至少一个 Hurdle Step demo path 稳定后，再决定是否接入 AI suggestion。
