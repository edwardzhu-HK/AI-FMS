# AI-FMS Phase I 技术报告

## AI-FMS: A Human-in-the-Loop Platform for FMS Video Annotation and Pose-Based Movement Evidence

日期：2026-08-09

状态：Phase I release candidate；Round A complete，Round B pending

## English Abstract

AI-FMS is a human-in-the-loop platform for Functional Movement Screen video
annotation and pose-based movement evidence. The project combines repetition
segmentation, blinded human review, MediaPipe pose extraction, interpretable
movement features, rules-based AI suggestions, adjudication, and traceable
exports. A four-movement pilot was reconstructed from 28 unique source videos
and 110 repetitions. Sixty-six repetitions passed pose and timing quality gates;
32 balanced repetitions were frozen for a two-round reviewer study. In Round A,
two reviewers agreed on scoreability for 31 of 32 repetitions and assigned the
same raw score to all 26 repetitions that both could score. This agreement
describes the reviewer workflow, not AI accuracy. Leakage-controlled AI
suggestions were comparable on 16 consensus repetitions, matching exactly on 9
and falling within one point on 14. A targeted audit showed that some Deep Squat
differences came from missing staged-attempt metadata, while ASLR and Hurdle
differences exposed pose-side, peak-selection, camera-view, and cycle-level
feature limitations. The most useful contribution is therefore not automated
diagnosis or reviewer replacement. It is a reproducible evidence pipeline that
adds quantitative movement profiles to ordinal FMS scores while preserving
human judgment, provenance, and explicit uncertainty.

## 摘要

AI-FMS 将 FMS 视频 review 建模为一个可追溯的人机协同研究流程。平台支持动作 rep
切分、blind review、MediaPipe pose、可解释 feature、AI evidence、分歧复核和数据
导出。Phase I pilot 包含四动作、28 个唯一视频和 110 个 reps，其中 66 条通过
quantitative feature quality gate，32 条进入正式双轮研究。

Round A 显示人工 workflow 可以得到高一致性，但现有规则式 AI 总分仍不足以替代人工。
项目更重要的发现是：同一个 0-3 分数内部存在可量化的动作差异，而错误分析还能明确
指出 protocol metadata、pose tracking、camera view 和动态 trajectory 的不同缺口。

## 1. 背景与动机

FMS 使用 0-3 RAW SCORE 对动作是否达到规则要求进行总结。该分数适合快速 screening，
但无法完整记录动作是如何完成的。人眼可以观察躯干稳定、膝踝对齐和动作流畅性，却难以
稳定记录连续角度、相对距离和轨迹。

长期游泳训练使 movement quality、左右差异和动作效率成为 Ronnie 可以持续观察的问题。
AI-FMS 尝试把这种经验转化为一个 Human Movement Science 与计算机视觉交叉项目：不
推翻人工规则，而是在其旁边增加可以检查、比较和追踪的 quantitative evidence。

## 2. 研究问题

1. 能否建立从视频、rep、pose、人工评分到研究输出的完整 lineage？
2. Pose-derived parameters 能否揭示同分动作内部的连续差异？
3. Rules-based AI 在哪些动作上能提供 reviewer-support，在哪些地方应拒绝评分？
4. Blinded human review 能否为既有 110-rep pool 建立较可信的抽样审核层？

本项目不回答“AI 是否能自动诊断或自动替代 FMS professional”。

## 3. 系统设计

```text
Local videos + review histories
              |
              v
Canonical builder -> stable IDs -> asset/checksum lineage
              |
              v
MediaPipe pose -> timing QA -> movement-specific features
              |
              +--------------------+
              |                    |
              v                    v
        Study Mode            Workbench
      blind review       annotation + AI evidence
              |                    |
              +----------+---------+
                         v
       JSON/CSV exports + SQLite + research reports
```

Workbench 覆盖 7 个 FMS movements。Phase I quantitative pilot 聚焦 Deep Squat、
Hurdle Step、ASLR 和 Rotary Stability。所有建议保留 reasons、confidence、model
version 和 evidence quality；Rotary 在未完成规则验证前只输出 features。

## 4. 数据与质量门

Canonical snapshot：

- 28 个 source history files；
- 29 个 unique ingests；
- 28 个唯一 source videos；
- 110 个 repetitions；
- 29/29 video 与 pose references resolved；
- 97 blindable；
- 66 feature-ready；
- 58 同时 blindable + feature-ready。

Formal study 从 58 条双门槛候选中 deterministic freeze 32 条，四动作各 8 条。
Selection 同时考虑动作平衡和 source-video dispersion，不将其描述为 simple random
sample。

## 5. Human Review 设计

Round A 对两位 reviewer 隐藏历史评分、legacy AI、源文件名和音频。Review Event V2
保存 score/status、confidence、camera view、side、comment、quality flag、review time
和 supersession lineage。

Round A 结果：

| 指标                           |         结果 |
| ------------------------------ | -----------: |
| 每位 reviewer 完成             |        32/32 |
| Outcome/scoreability agreement | 31/32，96.9% |
| 双方都能评分                   |           26 |
| RAW SCORE exact agreement      |  26/26，100% |
| Linear weighted kappa          |       1.0000 |
| Quadratic weighted kappa       |       1.0000 |
| 双方均 unscorable              |            5 |
| Scoreability mismatch          |            1 |

Kappa 只使用双方都能评分的 26 条。Unscorable reason agreement 较弱，说明 protocol
taxonomy 仍需改进；高 score agreement 不能外推为临床可靠性。

## 6. Quantitative Movement Profiles

66 条 feature-ready reps 在不使用历史或 Round A score 的情况下按 action 做 robust
z-score 与 deterministic k-medoids。分析同时检查 source-video distance 和
leave-one-video-out stability。

Round A labels 在 groups 冻结后才 overlay。7 个 action-score strata 中有 3 个跨越
多个 profile groups，但这些结果受 singleton、source effect 或独立视频不足影响。
因此当前证据支持“同分内存在连续多维差异”，不支持“已经发现稳定的功能障碍亚型”。

### Deep Squat 首要案例

两条不同源视频、侧面机位、脚跟垫板的 reps 均由两位 reviewer 判为 2 分：

| Feature                 | Shallower/uncertain | Deeper | 观察                 |
| ----------------------- | ------------------: | -----: | -------------------- |
| `peakDepthRatio`        |              0.6600 | 0.7542 | 后者更深             |
| `hipKneeVerticalGap`    |             -0.0121 | 0.0673 | 后者髋部相对膝部更低 |
| `hipAngleDegrees`       |                86.3 |   42.8 | 后者髋屈曲更多       |
| `kneeAngleDegrees`      |                64.9 |   35.0 | 后者膝屈曲更多       |
| `ankleShankLeanDegrees` |                32.4 |   15.1 | 两条使用不同下肢策略 |
| `maxKneeAnkleOffset`    |              0.0709 | 0.0403 | 前者 offset 更大     |

FMS 规则正确地把两条垫板动作归为 2 分；AI-FMS 的增量价值是进一步描述两条动作的
完成程度和 movement strategy，而不是推翻人工分数。

## 7. AI Evidence 与人工共识

运行顺序先生成 110 条 AI suggestions，再连接 26 条人工 consensus。Files、notes、
历史 labels、legacy AI 和 reviewer comments 不进入 suggestion builder。

| 分析                 | 可比较 | Exact | Within 1 |    MAE | Linear / Quadratic kappa |
| -------------------- | -----: | ----: | -------: | -----: | -----------------------: |
| 冻结基线             |     16 |  9/16 |    14/16 | 0.5625 |        -0.0588 / -0.1556 |
| Protocol sensitivity |     17 | 11/17 |    15/17 | 0.4706 |          0.1807 / 0.0286 |

基线结果足以排除“当前规则式 AI 已经可以替代人工”的描述。Sensitivity 的变化来自
Deep Squat attempt metadata 补齐，不是训练后 performance improvement。

## 8. 九条 Targeted Error Audit

九条 actionable differences 使用每条 5 帧画面、双 reviewer comments 和 feature
values 复核：

- 2 条 Deep Squat：heels-elevated metadata 补齐后现有 staged rule 正确输出 2。
- 1 条 Deep Squat floor attempt：人工 3，AI raw 2，保留为真实 depth proxy 差异。
- 1 条 ASLR：blind reviewer active side 与 feature row 不一致，需排查 side/peak。
- 1 条 ASLR：dowel 放错侧且 reviewer low confidence，疑似 pose 遮挡/左右追踪问题。
- 3 条 Hurdle：人工扣分来自 recovery 或动态 knee/ankle/trunk evidence，当前 peak
  frame proxy 未覆盖。
- 1 条 Hurdle：侧面 alignment evidence 仅轻微越过 threshold，机位导致不确定性。

本轮没有根据这九条移动 ASLR/Hurdle thresholds。

## 9. 工程实现

- React 19 + Vite multi-entry frontend。
- Mock API、local HTTP API stub 与 Video Manager API。
- MediaPipe Pose Landmarker 本地 extraction。
- Movement-specific timing、features、suggestion adapters。
- Append-only study events、signed export validation、SQLite idempotent ingest。
- Canonical JSON/CSV、data dictionary、manifest、SHA-256 和 reproducible scripts。
- 303 automated tests 与三个 production entries。

工程价值不只在 UI，而在 source-of-truth、审计层、数据隔离和 fail-closed 边界。

## 10. Limitations

- 110 reps 嵌套于 28 个视频，不是独立参与者样本。
- 数据来源、机位、动作和 score distribution 不平衡。
- 两位 reviewer 不构成 certified expert panel validation。
- 没有人口统计、consent registry、clinical outcome 或 injury labels。
- 2D pose 受视角、遮挡和 source-video signature 影响。
- Rules 可能接触过同一公开视频，不是 held-out test set。
- Round B 尚未完成，不能报告 AI-assisted change 或 test-retest effect。
- 未完成 rights/privacy audit 的媒体不能进入公开 release。

## 11. 伦理与合理主张

可以主张：

- 建成了可运行的 human-in-the-loop annotation 和 study platform；
- 保存了 pose-derived quantitative evidence 和完整 lineage；
- 完成了四动作 pilot、Round A blind review 和 exploratory analyses；
- 发现了同分动作内部的可量化差异及当前 AI 的明确边界。

不能主张：

- AI 比专业 reviewer 更准确；
- 系统能诊断功能障碍或预测伤病；
- 32 条正式样本证明全部 110 条历史标签有效；
- 当前 profile groups 是经过验证的 impairment subtypes。

## 12. 结论与下一步

AI-FMS Phase I 已从单一 demo 发展为包含产品、数据、盲审和研究输出的完整 pilot。
最可信的贡献是把 ordinal FMS judgment 与 continuous pose evidence 放在同一可审计流程
中，并诚实暴露 AI 何时有帮助、何时证据不足。

下一步：

1. 完成 Round B 和 A/B change metrics；
2. 排查 ASLR side/peak selection；
3. 开发 Hurdle cycle-level path 和 dowel features；
4. 增加独立来源和 rights/consent-clear 数据；
5. 完成 demo video、公开素材 audit 与 final Phase I release。
