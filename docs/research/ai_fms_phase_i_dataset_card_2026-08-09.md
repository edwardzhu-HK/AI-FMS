# AI-FMS Phase I Dataset Card

| 字段            | 当前值                                         |
| --------------- | ---------------------------------------------- |
| 版本            | `phase-i-rc1`                                  |
| 日期            | 2026-08-09                                     |
| 状态            | Round A complete；Round B pending              |
| Pilot ID        | `four-movement-pilot-v1`                       |
| 正式 Study ID   | `ai-fms-four-movement-core-2026-08-09`         |
| Source snapshot | 2026-07-05T07:56:31.603Z                       |
| 发布级别        | Private research dataset；不可直接公开原始媒体 |

## 1. 数据集用途

AI-FMS Phase I dataset 支持 FMS 视频的 human-in-the-loop annotation、pose-based
quantitative feature analysis、blind reviewer study 和可追溯研究输出。

允许用途：

- 复核动作切片、camera view、side 和 protocol metadata；
- 比较人工 FMS RAW SCORE 与 pose-derived evidence；
- 研究同一 ordinal score 内部的连续 movement-profile 差异；
- 测试可解释 reviewer-support workflow；
- 为后续独立采集和模型研究确定数据缺口。

不允许据此声称：医疗诊断、功能障碍确诊、伤病风险预测、自动 pain detection、
certified professional replacement 或经过独立验证的自动 FMS scoring。

## 2. 数据范围

Canonical pilot 由 28 个 cumulative history exports 去重构建，包含 29 个 unique
ingests、28 个唯一视频和 110 个 repetitions。29/29 video references 与 29/29 pose
references 均在本地解析；相同内容的视频通过 checksum 合并为 28 个唯一资产。

| Action                    | Source videos |    Reps | Blindable | Feature-ready | Formal | Round A consensus |
| ------------------------- | ------------: | ------: | --------: | ------------: | -----: | ----------------: |
| Active Straight Leg Raise |             7 |      17 |        11 |            11 |      8 |                 6 |
| Deep Squat                |            11 |      34 |        31 |            31 |      8 |                 4 |
| Hurdle Step               |             7 |      41 |        37 |            16 |      8 |                 8 |
| Rotary Stability          |             3 |      18 |        18 |             8 |      8 |                 8 |
| **Total**                 |        **28** | **110** |    **97** |        **66** | **32** |            **26** |

`blindAndFeatureReady=58`。正式 32 条从这 58 条中按动作平衡、源视频分散和固定
selection policy 冻结，而不是从 110 条做 simple random sample。

## 3. Evidence Tiers

| Tier                            | Reps | 含义                                           |
| ------------------------------- | ---: | ---------------------------------------------- |
| `gold_consensus`                |   26 | Round A 两位 blind reviewers 均可评分且同分    |
| `formal_non_consensus`          |    6 | 正式样本，但存在 scoreability/unscorable 边界  |
| `expansion_candidate`           |   26 | Blindable + feature-ready，尚未进入正式审核    |
| `feature_ready_not_blindable`   |    8 | 可做 label-free feature analysis，不可进入盲审 |
| `blindable_feature_limited`     |   39 | 画面可盲审，但 timing/pose feature 尚不足      |
| `not_blindable_feature_limited` |    5 | 两类门槛均未通过                               |

历史 97 条 numeric reviewer pairs 只保留为 weak-label provenance。它们来源于旧工作流，
部分视频或文件名含评分线索，不能替代 blind gold consensus。

## 4. 数据单元与标识

核心分析单位是 repetition，而不是整段视频。

- `videoId`：按视频内容派生的稳定 ID。
- `ingestId`：按原 history entry 派生的稳定 ID。
- `repetitionId`：由 ingest、原 segment、顺序和时间范围派生。
- `sourceCorrelationGroup`：同一源视频内 reps 的依赖分组。
- `startSecond` / `endSecond`：当前审核动作范围。
- `cameraView`：canonical 历史字段；不直接作为分析真值。
- `auditedCameraView`：110/110 contact-sheet audit 后的分析机位。
- `side`：人工或 workflow 记录的动作侧。
- `attemptCondition`：Deep Squat 的 `floor` 或 `heels_elevated_board`。
- `poseSha256` / `featureContractVersion` / `modelVersion`：证据 lineage。

## 5. Review Labels

正式 Study Mode 记录 append-only Review Event V2：

- reviewer identity 与 `studyRound`；
- `scored` 或 `unscorable` status；
- 0-3 FMS RAW SCORE；
- confidence、camera view、side、comment 和 quality flags；
- foreground review duration；
- blind-review boundary；
- supersession lineage 与 timestamp。

`score=0` 只表示观察或报告 pain。动作条件不足使用 `unscorable`，不编码为 0。

Round A：

- 每位 reviewer 完成 32/32；
- outcome agreement 31/32；
- 双方都能评分的 26 条中 26/26 完全同分；
- linear/quadratic weighted Cohen's kappa 均为 1.0000；
- 5 条双方均 unscorable，1 条 scoreability mismatch；
- unscorable reason taxonomy 仍有差异，未静默改写原事件。

## 6. Pose 与 Quantitative Features

Pose source 为 MediaPipe Pose Landmarker JSON。Raw per-frame landmarks 保存在本地，
分析表保存稳定 reference、quality summary、feature values 和 ratings。

当前 feature-ready 数量为 66/110。主要 evidence：

- Deep Squat：depth ratio、hip-knee vertical gap、hip/knee angle、trunk lean、
  ankle-shank lean、knee-ankle offset。
- Hurdle Step：clearance、stance ankle drift、stance/step knee geometry、
  step-knee line offset、trunk center offset、hip-height gap。
- ASLR：ankle/foot above hip、moving/stationary knee angle、stationary ankle drift、
  pelvic proxy 和 side visibility。
- Rotary Stability：reach、trunk/pelvis displacement 和 phase evidence；当前
  feature-only，不生成 AI RAW SCORE。

所有角度和距离均是 2D video pose-derived proxy，受 camera view、遮挡、透视、服装、
主体选择和 landmark jitter 影响，不等同于 clinical measurement。

## 7. AI Suggestion Labels

旧 workflow 中 92 条 numeric AI suggestions 被标记为
`label-leakage-ineligible`，不进入 accuracy、agreement、profile distance 或模型验证。

当前 comparison 先对 110 条 camera-audited feature rows 运行 suggestion rules，再连接
Round A 人工 consensus。Suggestion builder 不接收文件名、notes、历史分数、legacy AI
或 reviewer comments。

- 冻结基线：16 条可比较，9/16 完全同分，14/16 相差不超过 1 分，MAE 0.5625。
- Post-audit protocol sensitivity：17 条可比较，11/17 完全同分，15/17 相差不超过
  1 分，MAE 0.4706。

Sensitivity 只补入画面和双 reviewer 一致确认的 Deep Squat attempt condition，不能
解释为训练后准确率提升。当前 AI 总分不具备替代人工评分的证据。

## 8. Blindability 与质量控制

- 110/110 reps 使用 start/middle/end contact sheet 审计。
- 97 条 blindable；13 条因直接评分字幕、评分引导或构图不足排除。
- 110/110 camera views 复核：65 条确认、45 条校正。
- Camera correction 保存在独立 audit layer，不覆盖 canonical lineage。
- ASLR 17 条记录完成 label-free side/peak audit：16 个独立窗口中 11 `good`、
  2 `watch`、3 `limited`；重复 ingest window 不重复计为独立证据。
- 正式 32 条全部同时满足 blindability 和 feature-readiness。
- Reviewer media 使用匿名别名；界面隐藏源文件名、历史 label 和 legacy AI。
- 所有主要生成表均配套 SHA-256。

## 9. 来源、授权与隐私

Pilot 使用既有本地 FMS sample/reference videos，来源和使用条件不完全一致。当前数据集
只用于私有研究和申请材料内部证据。

- 未完成逐视频 rights audit 的视频不得公开分发。
- 原始视频、raw pose、reviewer event exports、comments 和 SQLite 不进入 Git。
- 当前没有系统化 consent records、participant recruitment protocol、人口统计或
  clinical outcome labels。
- 无法证明身份匿名和发布授权的画面不得进入公开 demo 或 dataset release。
- 对外发布只使用通过 rights/privacy review 的截图、聚合表和去标识说明。

## 10. 已知偏差与限制

- Reps 嵌套于 28 个 source videos，不是 110 个独立参与者。
- 动作、机位、分数和来源分布不平衡；Rotary 仅 3 个源视频。
- 多条公开视频可能来自教学示范，不代表目标申请人群。
- Round A 只有两位 reviewer，且不等同于 certified expert panel validation。
- Round A consensus 很高，但 26 条可评分样本的分数结构和筛选条件会影响 kappa。
- Pose rules 的早期开发可能接触过同一公开视频，不构成 held-out evaluation。
- Label-free profiles 中的分组可能受 source-video signature 驱动。
- ASLR 多人教学视频目前为 single-pose extraction；高 landmark visibility 仍可能
  跟错主体，3 个 `limited` 窗口不得用于自动总分结论。
- 当前不能将 feature group 命名为 impairment subtype。

## 11. 维护与版本

Source of truth：

- Canonical builder：`scripts/build-canonical-pilot-dataset.js`
- Feature contract：`research/pilot-v1/feature-contract.json`
- Formal manifest：私有 generated artifact + SHA-256
- Review exports：签名 JSON + SHA-256 + 本地 SQLite mirror
- Audit decisions：`research/pilot-v1/*.json`
- ASLR side/peak audit：私有 generated artifact + SHA-256；公开方法报告位于
  `docs/research/aslr_side_peak_evidence_audit_2026-08-09.md`
- 统一计划：`docs/plans/ai_fms_4_week_closeout_plan_2026-08-09.md`

Round B 完成后应发布 `phase-i-v1.0`，补充 test-retest/change metrics、最终 freeze
fingerprint、公开素材 rights/privacy verdict 和 final release manifest。
