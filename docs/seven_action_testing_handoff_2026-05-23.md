# AI-FMS 七动作测试交接（2026-05-23）

## 明早测试目标

这轮已经把 7 个 FMS actions 都接入到可测试流程，但成熟度分层不同：

- `implemented`：Deep Squat、Active Straight Leg Raise、Hurdle Step、In-Line Lunge
  - 有 pose timing、features、基于 pose 的 AI 建议。
- `features_only`：Shoulder Mobility
  - 有 pose timing / features / export evidence，但暂不生成 pose-based AI score。
- `annotation_only`：Trunk Stability Push-Up、Rotary Stability
  - 暂无 pose JSON，不显示骨骼、不显示 pose features；用于测试人工标注、双 reviewer、入库与导出流程。

这不是宣称 7 个动作都已经具备同等 AI 能力，而是先让 7 个动作都能进入统一的 human-in-the-loop workflow。

## 自动 smoke 结果

新增命令：

```bash
npm run demo:flow:seven
```

当前已通过：

| Demo Preset                            | Action                    | Pipeline        | Records | Timing | Features | AI suggestion  | Pose evidence | Ingest    |
| -------------------------------------- | ------------------------- | --------------- | ------: | ------ | -------- | -------------- | ------------- | --------- |
| Sample-1 mixed views                   | Deep Squat                | implemented     |       7 | 7/7    | 7/7      | available      | yes           | succeeded |
| Hurdle score-3 sample                  | Hurdle Step               | implemented     |       7 | 7/7    | 7/7      | available      | yes           | succeeded |
| In-Line Lunge score-3 sample           | In-Line Lunge             | implemented     |       6 | 6/6    | 6/6      | available      | yes           | succeeded |
| Shoulder score-2 sample                | Shoulder Mobility         | features_only   |       2 | 2/2    | 2/2      | not_applicable | yes           | succeeded |
| ASLR score-3 sample                    | Active Straight Leg Raise | implemented     |       2 | 2/2    | 2/2      | available      | yes           | succeeded |
| Trunk Stability Push-Up score-3 sample | Trunk Stability Push-Up   | annotation_only |       1 | N/A    | N/A      | not_applicable | no            | succeeded |
| Rotary Stability review-only sample    | Rotary Stability          | annotation_only |       2 | N/A    | N/A      | not_applicable | no            | succeeded |

## 推荐人工测试顺序

打开：

```text
http://127.0.0.1:5173/
```

如果打不开，重新启动：

```bash
npm run dev
```

建议按这个顺序测，先测能力最完整的，再测 annotation-only 边界：

1. `Sample-1 mixed views`
2. `ASLR score-3 sample`
3. `Shoulder score-2 sample`
4. `Hurdle score-3 sample`
5. `In-Line Lunge score-3 sample`
6. `Trunk Stability Push-Up score-3 sample`
7. `Rotary Stability review-only sample`

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
- 右侧应显示 `仅显示 Pose 证据`，不应出现自动评分承诺。
- 这是 deliberate design：先积累 human labels 和 evidence，再决定是否做 AI suggestion。

### Trunk Push-Up / Rotary

- 不应自动显示 skeleton，因为当前没有 Pose JSON。
- Timing / Features 显示 N/A 或缺失是正常的。
- 仍应可以生成 segments、保存 Reviewer A/B、通过 readiness、入库、导出。
- Rotary 目前是 review-only sample，后续最好补正式测试视频。

## 当前重要边界

- 7 动作 workflow 已可测，但不是 7 动作 AI scoring 都完成。
- Deep Squat、ASLR、Hurdle Step、In-Line Lunge 已有 pose-based AI suggestion。
- 现阶段正式入库仍是 mock ingest，不是后端数据库持久化。
- Trunk Push-Up 和 Rotary 是 annotation-only，占位意义是测试平台闭环，不是动作算法已完成。
- In-Line Lunge 已接入 first-pass AI suggestion，但仍建议继续收集更稳定的前后视角样本。
