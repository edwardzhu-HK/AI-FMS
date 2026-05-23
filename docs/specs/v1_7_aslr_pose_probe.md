# V1.7 ASLR Pose Probe

本文档记录 Active Straight Leg Raise 第一轮 pose extraction 试跑结果。目标是
判断 ASLR 是否适合作为 Deep Squat 之后的第一个 pose-based movement expansion。

## 结论

ASLR 可以进入下一步 timing/features 开发。三个样本都通过
`ai_fms_pose_landmarks_v1` schema summary，至少有两个样本 pose coverage 很干净，
可以作为首轮 ASLR adapter 的开发输入。

## 样本选择

首轮选择覆盖不同评分线索：

| 样本                          | 评分线索       | 选择原因                                                    |
| ----------------------------- | -------------- | ----------------------------------------------------------- |
| `2 reps score 3.mp4`          | score 3        | 清晰、时长适中，适合作为主 demo candidate。                 |
| `4 reps score 2.mp4`          | score 2        | 可覆盖中间评分，但原库存标记 low_resolution，需要谨慎使用。 |
| `1 rep score 1 for right.mp4` | score 1, right | 可覆盖低分和右侧标记，但样本较短且低分线索需要人工确认。    |

## 生成命令

生成的 pose JSON 是本地大文件，按 `.gitignore` 不提交到 Git。可以用以下脚本复现：

```bash
npm run pose:extract:aslr:score3
npm run pose:extract:aslr:score2
npm run pose:extract:aslr:score1
```

如果本机 MediaPipe 在沙盒内无法创建图形上下文，需要在 Codex 中允许提升权限运行
现有 `.venv/bin/python scripts/extract-pose-landmarks.py` 命令。

## 输出位置

```text
Eval_Videos/Sample videos/5-ASLR/pose/2-reps-score-3.pose.json
Eval_Videos/Sample videos/5-ASLR/pose/4-reps-score-2.pose.json
Eval_Videos/Sample videos/5-ASLR/pose/1-rep-score-1-right.pose.json
```

## Pose Quality Summary

| Pose JSON                       |  Frames | Missing ratio | Avg visibility | Schema |
| ------------------------------- | ------: | ------------: | -------------: | ------ |
| `2-reps-score-3.pose.json`      | 237/237 |         0.000 |          0.834 | valid  |
| `4-reps-score-2.pose.json`      | 523/598 |         0.125 |          0.783 | valid  |
| `1-rep-score-1-right.pose.json` |   48/48 |         0.000 |          0.801 | valid  |

## 推荐使用方式

1. `2 reps score 3.mp4` 作为第一版 ASLR timing/features 的主开发样本。
2. `1 rep score 1 for right.mp4` 用于验证 side/right metadata 与低分解释是否能表达清楚。
3. `4 reps score 2.mp4` 暂作为 robustness 样本，不作为第一版 demo 主样本。

## Timing / Feature / Suggestion Helper 试跑结果

第一版 ASLR timing、feature、suggestion helper 已接入 movement adapter。当前仍然
复用现有 `poseTiming`、`poseFeatures`、`poseSuggestion` 报告形状，没有改
dataset schema。

| Pose JSON                       | 检测周期 | 说明                                             |
| ------------------------------- | -------: | ------------------------------------------------ |
| `2-reps-score-3.pose.json`      |        2 | 稳定检测到 right + left 两个 leg raise cycles。  |
| `1-rep-score-1-right.pose.json` |        1 | 稳定检测到 right leg raise cycle。               |
| `4-reps-score-2.pose.json`      |        2 | 原样本 missing frames 较多，暂只作为鲁棒性参考。 |

ASLR cycle 会继续复用现有 `poseTiming.cycle` 结构；其中 `lowestPointSecond`
临时映射为 ASLR 的 `peakSecond`，用于兼容现有 UI 和导出结构。后续如果要把字段
改成更通用的 `keyPoseSecond` 或 `peakSecond`，需要单独评审 schema version。

## Feature Helper 试跑结果

第一版 ASLR feature helper 已输出以下 evidence：

- `hipFlexion`: raised ankle 是否高于 hip，作为 leg raise height proxy。
- `kneeExtension`: hip-knee-ankle angle，作为 straight leg line proxy。
- `pelvicStability`: left/right hip height gap，作为 pelvic compensation proxy。
- `sideConfidence`: timing cycle 检测出的 left/right side 是否可信。

在 `2-reps-score-3.pose.json` 主样本上，两个 rep 都能生成可用 feature evidence。
根据真实样本复核，`pelvicStability` 的第一版 proxy 已放宽到允许小幅 landmark/camera
jitter，避免把 score-3 主样本中的轻微 hip-height gap 直接降为 `watch`。

第一版 ASLR suggestion 会把 movement-specific features 映射到现有三项 subscore
槽位，方便沿用当前 Reviewer/AI panel 和 dataset export：

| ASLR evidence                      | 现有 subscore key | 含义                                       |
| ---------------------------------- | ----------------- | ------------------------------------------ |
| `hipFlexion`                       | `depth`           | 抬腿高度是否足够。                         |
| `pelvicStability`                  | `kneeAlignment`   | 骨盆是否稳定、是否出现明显代偿 proxy。     |
| `kneeExtension` + `sideConfidence` | `torsoControl`    | 抬腿侧是否接近直腿，且左右侧识别是否可信。 |

这仍然是 pose-based AI suggestion，不是 certified FMS scoring；最终标签仍由人工
Reviewer 保存和 adjudication 决定。

## 下一步

1. 增加一个浏览器可验证的 ASLR demo path：加载 ASLR 主样本视频 + pose JSON 后，
   能稳定显示 skeleton、timing、features、suggestion，并导出 dataset package。
2. 评估是否需要把 feature snapshot 组件泛化，避免 Deep Squat/ASLR 分别维护两套
   相似 UI。
