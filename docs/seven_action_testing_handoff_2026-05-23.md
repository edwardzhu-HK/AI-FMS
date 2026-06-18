# AI-FMS 七动作测试交接（2026-05-23）

2026-06-18 对齐注记：本文最初记录 2026-05-23 的七动作测试交接。当前代码和
`npm run demo:flow:seven` 已把 Trunk Stability Push-Up 升级为 implemented，把
Rotary Stability 升级为 features-only；当前状态以本文更新后的 smoke 表、
`README.md` 和 `docs/specs/v1_7_movement_maturity_and_side_clearing.md` 为准。

## 明早测试目标

这轮已经把 7 个 FMS actions 都接入到可测试流程，但成熟度分层不同：

- `implemented`：Deep Squat、Active Straight Leg Raise、Hurdle Step、In-Line Lunge、
  Shoulder Mobility、Trunk Stability Push-Up
  - 有 pose timing、features、基于 pose 的 AI 建议。
- `features_only`：Rotary Stability
  - 有 pose timing / features / side suggestion / export evidence，但暂不生成
    pose-based AI RAW SCORE。

这不是宣称 7 个动作都已经具备同等 AI 能力，而是先让 7 个动作都能进入统一的 human-in-the-loop workflow。

## 自动 smoke 结果

新增命令：

```bash
npm run demo:flow:seven
```

当前已通过：

| Demo Preset                            | Action                    | Pipeline      | Records | Timing | Features | AI suggestion  | AI side | Pose evidence | Ingest    |
| -------------------------------------- | ------------------------- | ------------- | ------: | ------ | -------- | -------------- | ------- | ------------- | --------- |
| Sample-1 mixed views                   | Deep Squat                | implemented   |       7 | 7/7    | 7/7      | available      | 0/7     | yes           | succeeded |
| Hurdle score-3 sample                  | Hurdle Step               | implemented   |       7 | 7/7    | 7/7      | available      | 7/7     | yes           | succeeded |
| In-Line Lunge score-3 sample           | In-Line Lunge             | implemented   |       6 | 6/6    | 6/6      | available      | 6/6     | yes           | succeeded |
| Shoulder score-2 sample                | Shoulder Mobility         | implemented   |       2 | 2/2    | 2/2      | available      | 0/2     | yes           | succeeded |
| ASLR score-3 sample                    | Active Straight Leg Raise | implemented   |       2 | 2/2    | 2/2      | available      | 2/2     | yes           | succeeded |
| Trunk Stability Push-Up score-3 sample | Trunk Stability Push-Up   | implemented   |       1 | 1/1    | 1/1      | available      | 0/1     | yes           | succeeded |
| Rotary Stability feature-only sample   | Rotary Stability          | features_only |       2 | 2/2    | 2/2      | not_applicable | 2/2     | yes           | succeeded |

## 推荐人工测试顺序

打开：

```text
http://127.0.0.1:5173/
```

如果打不开，重新启动：

```bash
npm run dev
```

建议按这个顺序测，先测 implemented 动作，再测 Rotary features-only 边界：

1. `Sample-1 mixed views`
2. `ASLR score-3 sample`
3. `Shoulder score-2 sample`
4. `Hurdle score-3 sample`
5. `In-Line Lunge score-3 sample`
6. `Trunk Stability Push-Up score-3 sample`
7. `Rotary Stability feature-only sample`

每个 preset 的基本流程一样：

1. 选择 `Demo Preset`。
2. 点击 `加载 Demo`。
3. 点击 `开始分析`。
4. 检查分段列表、播放窗口、Segment 元数据、右侧 AI/Pose 证据卡。
5. 给 Reviewer A 和 Reviewer B 保存一致评分。
6. 点 `检查准备状态`。
7. 如果 Ready 为 `是`，点 `入库`。
8. 分别试 `导出 JSON`、`导出 CSV`、`导出 Package`。

## 每类动作应该看到什么

### Deep Squat / ASLR

- `显示骨骼` 打开后应看到真实 MediaPipe skeleton 跟随动作。
- Segment 列表应有 Timing QA。
- Features 面板应显示对应动作的可解释指标。
- 右侧应显示 `基于 Pose 的 AI 建议`，包含总分、子项分和理由。

### Hurdle Step

- 有真实 skeleton。
- 有 Timing QA 和 Hurdle Step Features。
- 右侧应显示 `基于 Pose 的 AI 建议`，包含 Hip Mobility、Balance Control、Knee-ankle Line 三项分数。
- 这是 first-pass explainable prototype，用于 reviewer support，不是最终自动评分。

### In-Line Lunge

- 有真实 skeleton。
- 有 Timing QA 和 In-Line Lunge Features。
- 右侧应显示 `基于 Pose 的 AI 建议`，包含 Lunge Depth、Trunk Stability、Foot-knee Alignment 三项分数。
- 这是 first-pass explainable prototype，用于 reviewer support，不是最终自动评分。

### Shoulder Mobility

- 有真实 skeleton。
- 有 Timing QA 和 Features。
- 右侧应显示保守版 `基于 Pose 的 AI 建议`，但 shoulder clearing / pain 仍必须人工确认。
- 这是 first-pass reviewer support，不是最终自动评分。

### Trunk Push-Up

- 有真实 skeleton。
- 有 Timing QA 和 Trunk Stability Push-Up Features。
- 右侧应显示保守版 `基于 Pose 的 AI 建议`。
- Extension clearing / pain 仍必须人工确认。

### Rotary

- 有真实 skeleton 和 Rotary Stability Features。
- 可以显示 AI side suggestion / feature evidence。
- 不应显示 AI RAW SCORE；当前仍是 features-only。
- 后续最好补正式 score-labeled Rotary 测试视频，再决定是否进入 pose-based AI suggestion。

## 当前重要边界

- 7 动作 workflow 已可测，但不是 7 动作 AI scoring 都完成。
- Deep Squat、ASLR、Hurdle Step、In-Line Lunge、Shoulder Mobility、Trunk Push-Up 已有 first-pass pose-based AI suggestion。
- 现阶段正式入库仍是 mock ingest，不是后端数据库持久化。
- Rotary 是 features-only，占位意义已经从“只测平台闭环”升级为“看 pose evidence / side suggestion”，但仍不输出 AI RAW SCORE。
- In-Line Lunge、Trunk Push-Up、Shoulder Mobility 和 Rotary 都仍建议继续收集更稳定、更多 score 分布的样本。
