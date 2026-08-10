# ASLR Subject-Aware Pose Sensitivity

日期：2026-08-10

状态：Phase I G3 sensitivity 完成；不修改冻结 Round A / Round B evidence

## 研究问题

ASLR 原始 side/peak audit 中的 3 个 `limited` 独立窗口，究竟是动作没有可用 pose
信号，还是 single-pose 提取在教练、受试者同时出现或遮挡时选择了错误主体？

## 方法

本次只对 3 个原 `limited` 窗口建立独立 sensitivity layer：

- 一个双人教学视频使用 `numPoses=2`、受试者 ROI 和下半画面 inference crop；
- 同一竖屏家庭视频中的两个窗口使用覆盖平躺受试者的 inference crop，尽量排除站立
  辅助者；
- MediaPipe model、ASLR side/peak 质量门和阈值保持不变；
- 不读取 source filename 中的分数、历史 AI、Round A score 或 reviewer 结果来选择 ROI；
- 新 pose 和结果写入独立 generated 目录，不覆盖原 pose、feature matrix 或冻结 evidence。

两个原有 `watch` 窗口另作视频 QA，不重新提取，也不据此调分。

## 结果

| Rep                | 原状态  | Sensitivity | 强信号帧变化 | Dominance | Switch rate | 结论                 |
| ------------------ | ------- | ----------- | -----------: | --------: | ----------: | -------------------- |
| `rep_6830e0689f85` | limited | watch       |      3 → 107 |     0.757 |       0.038 | 主体信号恢复，仍观察 |
| `rep_d7a697f7dad0` | limited | watch       |     27 → 102 |     0.951 |       0.099 | 侧别稳定，转换期观察 |
| `rep_63fb86ee032d` | limited | good        |      30 → 47 |     0.957 |       0.043 | 侧别和峰值均可用     |

两个 extraction job 的源视频 SHA-256 均与 canonical 记录一致。教学视频 138/138 帧
有 pose；竖屏视频 248/251 帧有 pose。三个窗口在 sensitivity 中变为 1 `good`、
2 `watch`、0 `limited`。

## 原有 Watch 窗口人工复核

### `rep_8333424d5d28`

画面中只有一名受试者，右腿峰值清楚；但测量杆放在相反一侧，两位 blind reviewer
均记录 low confidence。保留 `watch`，可描述 side/peak evidence，不作为评分阈值锚点。

### `rep_fba72f13a0cb`

画面中只有一名受试者，左腿峰值清楚；侧别切换主要位于动作转换阶段，而不是错误主体
跟踪。保留 `watch`，可用于 peak-window 描述，不作为评分阈值锚点。

## 可报告发现

> ASLR 的部分 pose 失败不是因为视频里没有动作信息，而是因为通用 single-pose
> pipeline 没有稳定选择 FMS 受试者。Subject-aware ROI 能恢复连续侧别和峰值证据，
> 但恢复后的结果仍需保留质量标志，不能自动等同于可靠评分。

这个案例展示了 human-in-the-loop 的另一层价值：reviewer 不仅审核动作分数，也能发现
AI 看错人、看错时间窗或受协议布置影响的情况。它是 measurement reliability 案例，
不是 AI score accuracy improvement。

## 决策

1. 原始 11 `good` / 2 `watch` / 3 `limited` 基线保持冻结。
2. Subject-aware 结果只作为独立 sensitivity；不回写 Round B evidence manifest。
3. 三个窗口均不再是 `limited`，暂不需要为这类问题定向采集新视频。
4. 未来正式纳入 pipeline 前，应在独立多人/遮挡视频上验证 ROI 策略。
5. ASLR 评分阈值继续保持不变。

## 复现

```bash
npm run study:aslr:subject-sensitivity:extract
cd research/pilot-v1/generated/aslr-subject-sensitivity
shasum -c SHA256SUMS
```

配置：`research/pilot-v1/aslr-subject-sensitivity.json`

私有生成目录包含两份 sensitivity pose、JSON、CSV、Markdown 报告和 `SHA256SUMS`；
raw pose 不进入 public package。
