# V1.7 In-Line Lunge Pose Probe

本文档记录 In-Line Lunge 第一轮 pose extraction 试跑结果。目标不是马上接入
feature-only demo 或 AI suggestion，而是先判断样本质量、无效时间分布，以及它是否适合
作为 Hurdle Step 之后的下一轮 movement expansion。

## 结论

In-Line Lunge 的首轮 pose coverage 很好，可以进入下一步 timing / feature probe。
但它对视角、左右侧、脚踩线、躯干稳定性和前后脚关系更敏感，不能直接照搬 Hurdle
Step 的 step-clearance helper。

当前最适合作为主开发样本的是 `4 reps score 2.mp4`：时长短、pose 完整、reps/score
线索清楚。`1 rep score 3.mp4` 很短，适合做 smoke fixture。`6 reps score 3.mp4`
适合观察普通视频里的准备时间和 active-period 行为。

## 样本选择

| 样本                 | 评分线索 | 选择原因                                     |
| -------------------- | -------- | -------------------------------------------- |
| `1 rep score 3.mp4`  | score 3  | 极短样本，适合 smoke 和低成本回归。          |
| `4 reps score 2.mp4` | score 2  | pose 完整、时长短，适合作为主 probe。        |
| `6 reps score 3.mp4` | score 3  | 较长样本，适合验证无效时间和 active-period。 |

## 生成命令

生成的 pose JSON 是本地大文件，按 `.gitignore` 不提交到 Git。可以用以下脚本复现：

```bash
npm run pose:extract:inline:score3-1rep
npm run pose:extract:inline:score2-4reps
npm run pose:extract:inline:score3-6reps
```

如果本机 MediaPipe 在沙盒内无法创建图形上下文，需要在 Codex 中允许提升权限运行
现有 `.venv/bin/python scripts/extract-pose-landmarks.py` 命令。

## 输出位置

```text
Eval_Videos/Sample videos/3-Inline Lunge/pose/1-rep-score-3.pose.json
Eval_Videos/Sample videos/3-Inline Lunge/pose/4-reps-score-2.pose.json
Eval_Videos/Sample videos/3-Inline Lunge/pose/6-reps-score-3.pose.json
```

## Pose Quality Summary

| Pose JSON                  |  Frames | Missing ratio | Avg visibility | 备注                              |
| -------------------------- | ------: | ------------: | -------------: | --------------------------------- |
| `1-rep-score-3.pose.json`  |   56/56 |         0.000 |          0.829 | 极短样本，可做 smoke fixture。    |
| `4-reps-score-2.pose.json` | 165/165 |         0.000 |          0.875 | 当前最适合作为主开发样本。        |
| `6-reps-score-3.pose.json` | 561/602 |         0.068 |          0.864 | 较长样本，适合 active-period QA。 |

## Active Period 观察

| Pose JSON                  | 建议范围      | Motion fragments | 观察                                   |
| -------------------------- | ------------- | ---------------: | -------------------------------------- |
| `1-rep-score-3.pose.json`  | 1.3s - 5.5s   |                1 | 与短动作直觉一致。                     |
| `4-reps-score-2.pose.json` | 3.3s - 16.1s  |                2 | 动作中间有明显节奏变化，需要人工复核。 |
| `6-reps-score-3.pose.json` | 35.4s - 55.4s |                2 | 开头存在较长非动作/准备时间。          |

这继续支持当前产品方向：普通视频应先显示 active-period evidence，由 reviewer 决定
应用哪个有效片段；在没有 schema review 前，不自动把多个有效片段保存为多个视频
segment。

## 第一版 Feature Candidate

In-Line Lunge 首轮可以先尝试 feature-only evidence：

- `lungeDepth`: 前腿 knee/hip 的下降幅度或 knee angle proxy。
- `trunkAlignment`: shoulder/hip center 是否保持在可控范围。
- `kneeFootAlignment`: 前膝与前脚的水平偏移 proxy。
- `sideConfidence`: 当前 segment 是否能判断 left/right side。

这些 feature 先服务 reviewer-readable evidence，不直接声称 certified FMS scoring。

## Timing Helper 试跑结果

第一版 `inline-lunge-timing.js` 已加入单元测试，能够在 synthetic fixture 中检测
lunge depth candidate cycles，并沿用现有 `poseTiming` 报告形状，不改变 export
schema。

真实样本上的首轮结果说明：这个 helper 能提供 lunge depth evidence，但尚未稳定到可以
直接驱动 demo preset。

| Pose JSON                  | Expected reps | Candidate cycles | 观察                                    |
| -------------------------- | ------------: | ---------------: | --------------------------------------- |
| `1-rep-score-3.pose.json`  |             1 |                1 | timing 干净，适合 smoke fixture。       |
| `4-reps-score-2.pose.json` |             4 |                2 | 只抓到 2 个明显深度周期，需要继续校准。 |
| `6-reps-score-3.pose.json` |             6 |                7 | 有重复峰，适合作为鲁棒性样本。          |

因此 In-Line Lunge 下一步应先继续校准 timing，而不是马上接入 feature-only demo。

## 下一步

1. 继续校准 In-Line Lunge timing：减少重复峰，并提升 4-reps 样本的周期召回。
2. 新增 `inline-lunge-features.js` 和测试，输出 feature-only evidence。
3. 等一个 In-Line Lunge demo path 稳定后，再决定是否接入 AI suggestion。
