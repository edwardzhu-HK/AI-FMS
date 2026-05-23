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

## 下一步

1. 新增 ASLR timing helper，从 ankle/foot vertical trajectory 与 hip-to-ankle
   angle proxy 中找 leg raise peak。
2. 新增 ASLR feature helper，先输出 reviewer-readable evidence：
   hip flexion、pelvic stability、knee extension / leg line、side confidence。
3. 接入 movement adapter，但保持不修改 dataset schema。
4. 浏览器中先验证主样本：加载视频 + pose JSON 后能显示 skeleton，并能生成
   timing/features/suggestion。
