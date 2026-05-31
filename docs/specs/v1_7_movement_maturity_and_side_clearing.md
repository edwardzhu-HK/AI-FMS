# V1.7 七动作成熟度与 Side / Clearing 能力表

日期：2026-05-30

本文档用于把当前 AI-FMS workbench 的 7 个 FMS actions 放在同一张图里看清楚：

- 哪些动作已经进入 pose-based AI suggestion。
- 哪些动作只有 pose evidence，暂时不负责任地给 AI 分数。
- 哪些动作还只是 annotation-only。
- Side、clearing、pain 这些 rep-level metadata 应该如何进入后续开发。

本文档不是 FMS 专业评分标准本身。专业 threshold、score mapping 和 rubric 文案后续
可由 Ronnie 继续校准；平台侧需要保证的是 evidence traceable、人工可复核、schema
不乱。

## 总体判断

当前方向是成立的：系统已经不再只是一个 Deep Squat demo，而是一个
human-in-the-loop 的 FMS video annotation / pose evidence / dataset workflow。

截至目前，六个动作已经进入“可测试、可解释、可人工校准”的阶段：

- Deep Squat
- Active Straight Leg Raise
- Hurdle Step
- In-Line Lunge
- Shoulder Mobility
- Trunk Stability Push-Up

Shoulder Mobility 与 clearing / pain report 关系更强，而且评分逻辑不能简化成手距
一个 proxy。当前 AI 只基于 reach proxy / visibility / side context 给 reviewer
一个 RAW SCORE 参考，不自动判 pain。

Trunk Stability Push-Up 已有 first-pass pose-based AI suggestion，并已接入
score-3 sample 的本地 pose extraction / demo preset；但还需要更多样本复核和
Ronnie threshold 校准。Rotary Stability 已从 annotation-only 升级到
features-only：可以显示 pose evidence 与 side suggestion，但暂不显示 AI RAW SCORE。

## 七动作 Maturity Table

| Action                    | 当前 maturity | Pose JSON / Demo                | Timing                                                           | Features                                                                                   | AI suggestion                       | Side 自动判断                                                         | Clearing / Pain                                        | 下一步建议                                                |
| ------------------------- | ------------- | ------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------- |
| Deep Squat                | implemented   | 有 Sample-1 / front / side demo | 已有 Deep Squat cycle detector                                   | 已有 depth、torso、knee、hip/knee/ankle proxies                                            | 已有 pose-based AI suggestion       | 不适用，`side=none`                                                   | 无 clearing；pain 只能人工标记                         | Ronnie 校准专业 threshold 和解释文案                      |
| Active Straight Leg Raise | implemented   | 有 ASLR score-3 demo            | 已有 left/right leg raise cycle detector                         | 已有 active leg raise、stationary leg control、pelvic stability、leg line、side confidence | 已有 pose-based AI suggestion       | 已统一输出 segment-level `aiSideSuggestion`                           | 无 clearing；pain 只能人工标记                         | 继续补 score 1/2 样本校准                                 |
| Hurdle Step               | implemented   | 有 Hurdle score-3 demo          | 已有 Hurdle Step cycle detector；仍会出现 extra candidate cycles | 已有 clearance zone、stance leg、pelvis/trunk、step leg alignment、side confidence         | 已有 pose-based AI suggestion       | 已统一输出 segment-level `aiSideSuggestion`                           | 无 clearing；pain 只能人工标记                         | 用 mixed-score 样本校准 thresholds                        |
| In-Line Lunge             | implemented   | 有 In-Line Lunge score-3 demo   | 已有 lunge depth cycle detector；4-rep score-2 样本召回仍需校准  | 已有 lunge depth zone、trunk/pelvis、rear leg、front knee-foot line、side confidence       | 已有 pose-based AI suggestion       | 已统一输出 segment-level `aiSideSuggestion`，保留 front/rear evidence | 有 ankle clearing pain / mobility；AI 不应自动判定疼痛 | 优先做 clearing reminder/gate，不自动判 positive/negative |
| Shoulder Mobility         | implemented   | 有 Shoulder score-2 demo        | 目前是 best reach frame，不是真正 movement-cycle timing          | 已有 reach distance、hand visibility、shoulder reference、side context                     | 已有保守版 pose-based AI suggestion | 已统一输出 segment-level `aiSideSuggestion`                           | 有 shoulder clearing；pain 只能人工确认                | Ronnie 校准 thresholds；后续做 clearing reminder/gate     |
| Trunk Stability Push-Up   | implemented   | 有 score-3 pose demo            | 已有 best push-up frame timing；暂不 auto-apply draft timing     | 已有 push-up lift、trunk/body-line、arm extension、hip-drift compensation proxies          | 已有保守版 pose-based AI suggestion | 不适用，`side=none`                                                   | 有 extension clearing；pain 只能人工确认               | 扩展 score 1/2 样本；Ronnie 校准 thresholds               |
| Rotary Stability          | features-only | 有 3 个 probe pose JSON         | 已有 best rotary frame feasibility probe                         | 已有 rotary reach、trunk rotation、balance stability、side confidence proxies              | 暂无，不显示 AI RAW SCORE           | 已统一输出 segment-level `aiSideSuggestion`，但需 Ronnie 校准语义     | 有 flexion clearing；pain 只能人工确认                 | 继续补正式 score 样本；先校准 phase/side 语义             |

## Pipeline 状态定义

项目里目前有三层 pipeline 状态：

| 状态              | 含义                                          | UI / Export 行为                                               |
| ----------------- | --------------------------------------------- | -------------------------------------------------------------- |
| `implemented`     | 有 timing、features、pose-based AI suggestion | 可以显示“基于 Pose 的 AI 建议”，但仍需 human reviewer 最终确认 |
| `features_only`   | 有 pose evidence / features，但不显示 AI 分数 | 只显示 feature evidence，不把它包装成 score                    |
| `annotation_only` | 只支持人工切片、review、ingest、export        | 不显示 pose evidence 和 AI suggestion                          |

当前 `movementCapabilities` 与 `movementEvidenceGate` 已经能表达这三层状态。后续扩展时应继续复用这套机制，避免每个动作单独开一套 UI 分支。

## Side Capability Schema

Side 是 rep-level metadata，不是 person-level final score。当前阶段只需要回答：

> 这个视频片段里的这一次 rep，是 left、right、bilateral、none，还是 unknown？

### 当前动作侧别策略

| Action                  | `sidePolicy`      | 默认值    | AI side inference | 说明                                                        |
| ----------------------- | ----------------- | --------- | ----------------- | ----------------------------------------------------------- |
| Deep Squat              | `not_lateralized` | `none`    | `not_applicable`  | 不按左右侧评分                                              |
| ASLR                    | `left_right`      | `unknown` | `pose_supported`  | 抬起的是左腿还是右腿                                        |
| Hurdle Step             | `left_right`      | `unknown` | `pose_supported`  | 跨步侧 / 支撑侧需要进入 evidence                            |
| In-Line Lunge           | `left_right`      | `unknown` | `pose_supported`  | front side / rear side 需要清楚                             |
| Shoulder Mobility       | `left_right`      | `unknown` | `pose_supported`  | 当前有 side context，但还要校准语义                         |
| Trunk Stability Push-Up | `not_lateralized` | `none`    | `not_applicable`  | 不按左右侧评分                                              |
| Rotary Stability        | `left_right`      | `unknown` | `pose_supported`  | 当前是 features-only，AI 只给 side evidence，不给 RAW SCORE |

### 已完成：统一 `aiSideSuggestion`

ASLR、Hurdle Step、In-Line Lunge、Shoulder Mobility 的 side evidence 现在通过
统一 helper 汇总为 segment-level `aiSideSuggestion`。它是 AI 对当前 rep 左右侧的
建议旁证，不会覆盖人工保存的 `side`。

```json
{
  "status": "suggested",
  "source": "pose_features",
  "side": "left",
  "confidence": 0.92,
  "confidenceStatus": "good",
  "reviewerSide": "right",
  "matchesReviewerSide": false,
  "reasonCode": "pose_side_detected",
  "evidence": {
    "frontSide": "left",
    "rearSide": "right",
    "ratingStatus": "good",
    "sideVisibility": 0.95
  }
}
```

原则：

- AI 可以建议 side，但不能静默覆盖 reviewer 保存的 side。
- reviewer 保存后，dataset export 同时保留 `side`、`sideSource` 和
  `aiSideSuggestion`。
- `unknown` 是合法状态，不能为了好看强行猜左右。
- `not_lateralized` 动作仍显示 Side 字段，但置灰为 `none`，保持 UI 结构稳定。
- CSV 导出同步包含 `ai_side_status`、`ai_side_confidence`、
  `ai_side_matches_reviewer` 和 `ai_side_evidence`，方便后续人工校准。

## Clearing / Pain Capability Schema

Clearing 与 pain 的边界要比 side 更保守。许多 clearing test 本质上依赖 pain report，
AI 不应该自动判断“疼 / 不疼”。

### 当前动作 clearing 策略

| Action                  | `clearingPolicy`          | Clearing tests                                   | AI 自动判定策略                         |
| ----------------------- | ------------------------- | ------------------------------------------------ | --------------------------------------- |
| Deep Squat              | `none`                    | 无                                               | 不适用；UI 置灰显示 `not_applicable`    |
| ASLR                    | `none`                    | 无                                               | 不适用；UI 置灰显示 `not_applicable`    |
| Hurdle Step             | `none`                    | 无                                               | 不适用；UI 置灰显示 `not_applicable`    |
| In-Line Lunge           | `ankle_pain_and_mobility` | `ankle_clearing_pain`、`ankle_clearing_mobility` | 不自动判 pain；可提示 reviewer 必须确认 |
| Shoulder Mobility       | `shoulder_pain`           | `shoulder_clearing`                              | 不自动判 pain；可提示 reviewer 必须确认 |
| Trunk Stability Push-Up | `spinal_extension_pain`   | `extension_clearing`                             | 不自动判 pain；可提示 reviewer 必须确认 |
| Rotary Stability        | `spinal_flexion_pain`     | `flexion_clearing`                               | 不自动判 pain；可提示 reviewer 必须确认 |

### 已接入：clearing reminder / gate

当前先做“辅助提示 + 入库 gate”，不做自动判定：

```json
{
  "status": "needs_human_review",
  "reasonCode": "clearing_required_for_action",
  "requiredFindings": ["shoulder_clearing"],
  "blocksFormalIngest": true,
  "aiObservedPain": "not_supported"
}
```

原则：

- AI 不直接输出 `positive` / `negative pain`。
- 有 clearing 的动作，UI 应明确提示 reviewer 必须人工确认。
- `checkVideoReadiness` 和本地 readiness 都会阻止未确认 clearing / pain 的
  segment 入库。
- 如果 reviewer 标记 positive pain，raw score 规则可以由现有 `clearingFindings`
  和 `deriveClearingTestFromFindings` 进入导出与 warning。
- 如果后续要基于视频表情、停顿、手势做 pain proxy，只能作为 `review_hint`，不能
  作为自动 clearing result。

## 与 Ronnie 专业校准的边界

Ronnie 后续适合修改：

- 每个动作的 threshold。
- 每条 evidence 的 reviewer-facing 文案。
- score 3 / 2 / 1 的专业解释。
- 哪些 feature 应该参与 min-score mapping，哪些只作为辅助证据。

平台侧应保持：

- 每个 segment 的 evidence 可追溯。
- AI suggestion 和 human raw score 分开保存。
- Side / clearing / pain metadata 不被 AI 静默覆盖。
- `criteriaScores` 作为长期主结构，legacy `subscores` 继续兼容 UI/CSV。

## 推荐开发顺序

1. 已增加统一 `aiSideSuggestion` 汇总层，把各动作已有 side evidence 合并为同一导出字段。
2. 已增加 clearing reminder / gate：有 clearing policy 的动作必须提示人工确认。
3. 继续校准 Shoulder Mobility suggestion thresholds。
4. Rotary Stability 继续扩大 pose feasibility probe，不直接做 score。当前 3 个样本
   的 probe 结果记录在 `docs/rotary_feature_probe_report_2026-05-31.md`。
