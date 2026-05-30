# AI-FMS 四动作测试交接（2026-05-23）

## 今天睡前目标

今晚的目标不是把 7 个 FMS actions 都做完，而是把 4 个已经进入主线的动作做到“可以人工测试、可以解释、可以导出、正式入库有质量门禁”的状态：

1. Deep Squat
2. Active Straight Leg Raise
3. Shoulder Mobility
4. Hurdle Step

这四个动作覆盖了当前项目的三种成熟度：

- `implemented`：Deep Squat、Active Straight Leg Raise
  - 有 pose timing、features、基于 pose 的 AI 建议。
- `features_only`：Shoulder Mobility、Hurdle Step
  - 有 pose timing / features / export evidence，但暂不宣称 pose-based AI scoring。

## 自动检查结果

已新增命令：

```bash
npm run demo:check:four
```

当前检查结果：

| Demo Preset             | Action                    | Pipeline      | Pose 覆盖 | Timing QA | Features | AI suggestion  | 结果 |
| ----------------------- | ------------------------- | ------------- | --------- | --------- | -------- | -------------- | ---- |
| Sample-1 mixed views    | Deep Squat                | implemented   | 441/441   | 7/7       | 7/7      | available      | PASS |
| ASLR score-3 sample     | Active Straight Leg Raise | implemented   | 237/237   | 2/2       | 2/2      | available      | PASS |
| Shoulder score-2 sample | Shoulder Mobility         | features_only | 220/220   | 2/2       | 2/2      | not_applicable | PASS |
| Hurdle score-3 sample   | Hurdle Step               | features_only | 556/592   | 7/7       | 7/7      | not_applicable | PASS |

## 完整流程自动 smoke

已新增完整流程命令：

```bash
npm run demo:flow:four
```

这个命令比 `demo:check:four` 更接近人工测试流程，会逐个动作跑：

1. mock video analysis job
2. segment generation
3. pose timing / AI draft timing
4. features / AI suggestion 或 feature-only evidence
5. Reviewer A/B 共识评分
6. readiness check
7. mock Ingest
8. JSON / CSV / dataset package export

当前结果：

| Demo Preset             | Records | Valid Labels | Timing | Features | AI suggestion  | Ingest    | Package files | 结果 |
| ----------------------- | ------: | -----------: | ------ | -------- | -------------- | --------- | ------------: | ---- |
| Sample-1 mixed views    |       7 |            7 | 7/7    | 7/7      | available      | succeeded |             5 | PASS |
| ASLR score-3 sample     |       2 |            2 | 2/2    | 2/2      | available      | succeeded |             5 | PASS |
| Shoulder score-2 sample |       2 |            2 | 2/2    | 2/2      | not_applicable | succeeded |             5 | PASS |
| Hurdle score-3 sample   |       7 |            7 | 7/7    | 7/7      | not_applicable | succeeded |             5 | PASS |

## 明早推荐人工测试路径

打开：

```text
http://127.0.0.1:5173/
```

如果页面打不开，重新启动：

```bash
npm run dev
```

### 1. Deep Squat

1. `Demo Preset` 选择 `Sample-1 mixed views`。
2. 点击 `Load Demo`。
3. 点击 `Start Analysis`。
4. 观察：
   - 视频能播放。
   - `显示骨骼` 开启后，骨骼跟随真人动作。
   - 分段显示 `Timing QA: 7/7 OK`。
   - `Deep Squat Features` 显示 `7/7 可用`。
   - 右侧 `基于 Pose 的 AI 建议` 有打分和理由。

### 2. Active Straight Leg Raise

1. `Demo Preset` 选择 `ASLR score-3 sample`。
2. 点击 `Load Demo`，再点击 `Start Analysis`。
3. 观察：
   - Action 自动变成 `Active Straight Leg Raise`。
   - Expected Reps 为 `2`。
   - `Timing QA: 2/2 OK`。
   - Features 显示 Hip Flexion、Knee Extension、Pelvic Stability、Side Confidence。
   - 右侧有基于 pose 的 AI 建议，但它仍是 explainable prototype，不是临床判断。

### 3. Shoulder Mobility

1. `Demo Preset` 选择 `Shoulder score-2 sample`。
2. 点击 `Load Demo`，再点击 `Start Analysis`。
3. 观察：
   - Action 自动变成 `Shoulder Mobility`。
   - `Timing QA: 2/2 OK`。
   - Features 显示 Reach Distance、Hand Visibility、Shoulder Reference、Side Context。
   - 右侧应显示“仅显示 Pose 证据”，不应显示自动评分承诺。

### 4. Hurdle Step

1. `Demo Preset` 选择 `Hurdle score-3 sample`。
2. 点击 `Load Demo`，再点击 `Start Analysis`。
3. 观察：
   - Action 自动变成 `Hurdle Step`。
   - Expected Reps 为 `7`。
   - `Timing QA: 7/7 OK`。
   - Features 显示 Step Clearance、Stance Stability、Trunk Control、Side Confidence。
   - Hurdle Step 是 feature-only demo path，不应显示 pose-based AI score。

## 入库与导出测试

### 可以测试

- `Export JSON`
- `Export CSV`
- `Export Package`

这些导出允许用于调试和人工复核，即使某些样本尚未达到正式训练数据质量。

### 正式 Ingest 门禁

现在正式 `Ingest` 会检查两类条件：

1. Reviewer A/B 都已经评分。
2. Timing QA 没有 blocker。

如果存在：

- `no_unique_cycle_assignment`
- `duplicate_cycle_assignment`
- `missing_start`
- `missing_return`
- `too_short`

左侧 `Ready` 会保持 `No`，`Ingest` 按钮会被禁用。这个设计是为了避免切片不可靠的数据进入正式 training dataset。

## 当前边界

- Deep Squat 是 flagship pipeline。
- ASLR 是第二个 implemented pose pipeline。
- Shoulder Mobility 和 Hurdle Step 当前是 feature-only evidence，不做自动评分承诺。
- In-Line Lunge 已经有底层 timing/features 试验，但还没有进入本轮四动作可测主线。
- Trunk Stability Push-Up 和 Rotary Stability 仍属于后续扩展。
