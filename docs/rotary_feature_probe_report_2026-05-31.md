# Rotary Stability Feature Probe Report

日期：2026-05-31

生成时间：2026-05-31T02:55:30.003Z

本文档用于记录 Rotary Stability 当前 feature-only pose probe 在多个样本上的稳定性。它不是 AI RAW SCORE，也不应作为 FMS 最终评分依据。

## 总览

| Sample                         | Status | Pose frames | Pose coverage | Timing | Features | AI side counts | Notes                                    |
| ------------------------------ | ------ | ----------: | ------------: | -----: | -------: | -------------- | ---------------------------------------- |
| Rotary review sample           | ok     |     386/501 |           77% |    2/2 |      2/2 | {"left":2}     | 本地 review sample，仅使用前 40 秒。     |
| Online Redefined Physiotherapy | ok     |     457/465 |           98% |    1/1 |      1/1 | {"left":1}     | 已批准下载的 online candidate，46.5 秒。 |
| Online Capacity Performance    | ok     |     402/402 |          100% |    1/1 |      1/1 | {"right":1}    | 已批准下载的 online candidate，40.2 秒。 |

## 观察结论

- 当前 probe 能在 3 个已有 pose 的样本上输出 segment-level feature evidence 和 AI side suggestion。
- 两个 online candidate 的 pose coverage 较好；本地 review sample 前 40 秒 coverage 约 77%，更适合当作测试样本，不适合作为稳定 demo 样本。
- 不同样本的 side suggestion 会出现 left/right，说明 side 语义需要 Ronnie 结合动作标准校准，不能直接当作评分结论。
- Rotary Stability 仍保持 feature-only：可以辅助 reviewer 看 pose evidence，但不输出 AI RAW SCORE。
- 后续要校准的核心不是 UI，而是动作 phase、side 语义、以及哪些 proxy 可以进入评分解释。

## 样本细节

### Rotary review sample

- 视频：`Eval_Videos/Sample videos/7-rotatory stability/videoplayback (21).mp4`
- Pose：`Eval_Videos/Sample videos/7-rotatory stability/pose/rotary-review.pose.json`
- 状态：`ok`

| Rep | Feature status | AI side status | AI side | Confidence | Pattern        | Reach | Trunk twist | Balance         |
| --: | -------------- | -------------- | ------- | ---------: | -------------- | ----: | ----------: | --------------- |
|   1 | ok             | suggested      | left    |       0.73 | left_same_side | 7.738 |        78.3 | stability watch |
|   2 | ok             | suggested      | left    |       0.73 | left_same_side | 7.838 |        83.3 | stability watch |

### Online Redefined Physiotherapy

- 视频：`Eval_Videos/Online Candidates/07-Rotary Stability/Rotary stability test (Functional movement screen)-_iOv5nPrVzc.mp4`
- Pose：`Eval_Videos/Online Candidates/07-Rotary Stability/pose/redefined-functional-movement-screen.pose.json`
- 状态：`ok`

| Rep | Feature status | AI side status | AI side | Confidence | Pattern            | Reach | Trunk twist | Balance               |
| --: | -------------- | -------------- | ------- | ---------: | ------------------ | ----: | ----------: | --------------------- |
|   1 | ok             | suggested      | left    |       0.56 | right_arm_left_leg | 8.073 |        11.2 | stable quadruped line |

### Online Capacity Performance

- 视频：`Eval_Videos/Online Candidates/07-Rotary Stability/Rotatory Stability Test-2uSUaw5gJ_s.mp4`
- Pose：`Eval_Videos/Online Candidates/07-Rotary Stability/pose/capacity-rotatory-stability-test.pose.json`
- 状态：`ok`

| Rep | Feature status | AI side status | AI side | Confidence | Pattern            | Reach | Trunk twist | Balance               |
| --: | -------------- | -------------- | ------- | ---------: | ------------------ | ----: | ----------: | --------------------- |
|   1 | ok             | suggested      | right   |       0.72 | left_arm_right_leg | 7.132 |        13.0 | large stability shift |
