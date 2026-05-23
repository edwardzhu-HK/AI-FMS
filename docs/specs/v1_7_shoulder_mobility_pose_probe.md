# V1.7 Shoulder Mobility Pose Probe

本文档记录 Shoulder Mobility 第一轮 pose extraction 试跑结果。目标不是马上把
Shoulder Mobility 做成完整 AI scoring，而是判断它是否适合作为 ASLR 之后的第二个
movement expansion，并提前暴露样本质量和无效时间问题。

## 结论

Shoulder Mobility 可以进入下一步 feature probe，但不建议直接跳到完整 suggestion。

当前最适合作为主开发样本的是 `2 reps score 2.mp4`：pose coverage 完整，时长短，
文件名有 reps/score 线索。`1 rep score 3 for right side.mp4` 可以作为 score-3/right
参考，但缺帧比例约 19%，需要谨慎。`2 reps score 1 for both side.mp4` 是典型长视频
样本，包含大量非动作时间，更适合作为 active-period / invalid-period QA 样本。

## 样本选择

| 样本                               | 评分线索       | 选择原因                                     |
| ---------------------------------- | -------------- | -------------------------------------------- |
| `2 reps score 2.mp4`               | score 2        | Pose 最干净，适合作为第一版 feature 主样本。 |
| `1 rep score 3 for right side.mp4` | score 3, right | 有 side 线索，可验证 right-side 元数据表达。 |
| `2 reps score 1 for both side.mp4` | score 1, both  | 长视频，适合验证无效时间和低分样本处理方式。 |

## 生成命令

生成的 pose JSON 是本地大文件，按 `.gitignore` 不提交到 Git。可以用以下脚本复现：

```bash
npm run pose:extract:shoulder:score3-right
npm run pose:extract:shoulder:score2
npm run pose:extract:shoulder:score1-both
```

如果本机 MediaPipe 在沙盒内无法创建图形上下文，需要在 Codex 中允许提升权限运行
现有 `.venv/bin/python scripts/extract-pose-landmarks.py` 命令。

## 输出位置

```text
Eval_Videos/Sample videos/4-Shoulder Mobility/pose/1-rep-score-3-right.pose.json
Eval_Videos/Sample videos/4-Shoulder Mobility/pose/2-reps-score-2.pose.json
Eval_Videos/Sample videos/4-Shoulder Mobility/pose/2-reps-score-1-both.pose.json
```

## Pose Quality Summary

| Pose JSON                       |    Frames | Missing ratio | Avg visibility | 备注                            |
| ------------------------------- | --------: | ------------: | -------------: | ------------------------------- |
| `1-rep-score-3-right.pose.json` |   114/141 |         0.191 |          0.704 | 可用但缺帧偏高，低分辨率竖屏。  |
| `2-reps-score-2.pose.json`      |   220/220 |         0.000 |          0.880 | 当前最适合做主开发样本。        |
| `2-reps-score-1-both.pose.json` | 1132/1218 |         0.071 |          0.608 | 长视频，适合 active-period QA。 |

## Active Period 观察

| Pose JSON                       | 建议范围       | Motion fragments | 观察                                    |
| ------------------------------- | -------------- | ---------------: | --------------------------------------- |
| `1-rep-score-3-right.pose.json` | 2.1s - 14.0s   |                2 | 动作和准备/收尾混在一起，需要人工复核。 |
| `2-reps-score-2.pose.json`      | 3.2s - 21.0s   |                2 | 与 2 reps 直觉一致，适合作为主样本。    |
| `2-reps-score-1-both.pose.json` | 44.5s - 242.6s |                8 | 长视频中有多段讲解/等待/动作混杂。      |

这验证了 Ronnie 提出的真实问题：普通视频不能默认全程有效。当前 UI 已能显示
detected periods，并明确说明应用按钮仍然只应用一个整体 Start/End。真正按多个有效
片段提取视频 segment，需要后续 schema review，因为它会影响 segment provenance 和
dataset export 语义。

## 下一步

第一版 feature-only demo path 已接入：`Demo Preset` 选择
`Shoulder score-2 sample` 后，可以验证 skeleton、Timing QA、Shoulder Mobility
Features 和 dataset export。当前不会生成 pose-based AI suggestion，右侧仍是 legacy
mock AI panel。

1. 继续校准 Shoulder Mobility feature helper。当前已能输出 reach distance、hand
   visibility、shoulder reference、side context，但还不生成 AI suggestion。
2. 对 `2-reps-score-1-both.pose.json` 做 active-period 交互测试，决定是否需要
   “preview/apply individual active period”的 UI，但不要在未评审 schema 前自动多段切片。
3. 在人工确认更多 Shoulder 样本后，再决定是否把 feature evidence 映射为 pose-based
   AI suggestion。
