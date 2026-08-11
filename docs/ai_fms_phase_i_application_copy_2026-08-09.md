# AI-FMS Phase I Application Copy

## 项目名称

**AI-FMS: Quantitative Movement Evidence for Human FMS Review**

中文：**AI-FMS：为人工 FMS 审核增加可解释的定量动作证据**

## 一句话介绍

我开发了一个 human-in-the-loop 计算机视觉平台，把 FMS 视频中的动作切片、人工评分、
MediaPipe pose、角度/距离参数、AI suggestion 和研究导出连接成可追溯证据链。

## English Short Description

AI-FMS is a human-in-the-loop computer vision platform for reviewing Functional
Movement Screen videos. It combines repetition segmentation, blinded human
scoring, MediaPipe pose features, interpretable AI evidence, and traceable data
exports. The goal is not to replace trained reviewers, but to add quantitative
movement profiles to an ordinal screening score.

## 项目故事

长期游泳训练让我持续注意到：两个人完成同一个动作，即使教练给出相同分数，动作过程
也可能完全不同。FMS 提供了清楚的 0-3 规则，但人工观察很难稳定记录每一次动作的角度、
相对距离和动态轨迹。

我把这个问题拆成三个部分：先建立可以反复审核的视频标注工具，再使用 pose estimation
提取 quantitative evidence，最后通过 blind review 检查 AI 在哪里与人工一致、在哪里
遗漏了人能看到的动作信息。

## 我完成了什么

- 构建 7-movement annotation workbench，支持视频、rep timing、loop playback、人工
  scoring、adjudication 和 JSON/CSV export。
- 使用 MediaPipe Pose Landmarker 建立动作 timing、pose overlay 和 movement-specific
  feature pipeline。
- 将 28 个 history exports 重建为 28 个唯一视频、110 个 reps 的 canonical pilot，
  带稳定 ID、lineage 和 SHA-256。
- 建立 blind Study Mode，冻结四动作各 8 条的正式 32-rep 样本，并完成双 reviewer
  Round A 与间隔约 51 小时的 Round B。
- 对 66 条 feature-ready reps 做 label-free movement profiles 和 source-effect audit。
- 逐条复核 AI/人工差异，区分 protocol metadata、pose tracking、camera view 和动态
  feature 缺口。
- 让锁定的 Phase I AI 通过与盲评隔离的路径分析同一批正式样本，完成人工一致性与
  AI-human agreement 的平行 benchmark，并审计历史标签的可复用范围。
- 选定四案例申请组合，并把 Deep Squat 同分异型与 ASLR 主体选择生成两张无人物、
  可由冻结数据重建的图表。

## 最有意义的发现

两条 Deep Squat 都因脚跟垫板获得人工 2 分，但 pose parameters 显示它们的深度、髋膝
角度、踝-胫策略和膝踝 offset 明显不同。

这说明 AI-FMS 的价值不是把一个 2 分改成另一个分数，而是让 reviewer 看见：

> 相同 FMS RAW SCORE 背后，可能存在不同的动作完成程度和 movement strategy。

另一个重要结果是有边界的：两位 reviewer 在第二轮的 26 条可评分记录中全部同分，
而锁定的 Phase I AI 在 25 条可比较记录中与人工完全同分 16 条、23 条相差不超过 1 分。
这提供了一个覆盖四动作的内部 benchmark，但仍不能说它已经是经过独立验证的自动
评分器。定向误差分析进一步说明，ASLR 需要更稳健的 active-side/peak detection，
Hurdle 需要完整动作轨迹和 dowel evidence。
随后覆盖全部 17 条 ASLR 记录的无标签审计把 16 个独立窗口分为 11 good、2 watch、
3 limited，说明 landmark visibility 高并不自动代表跟踪了正确主体或正确侧别。
Subject-aware sensitivity 再对 3 个 limited 窗口做受试者 ROI 重提取，得到 1 good、
2 watch、0 limited；这支持“部分失败来自错误主体选择或裁剪”的解释，但不回写冻结
结果，也不构成评分准确率提升。

## Evidence Snapshot

| Evidence                             |                                    Result |
| ------------------------------------ | ----------------------------------------: |
| Canonical pilot                      |                      28 videos / 110 reps |
| Feature-ready                        |                                   66 reps |
| Formal blind sample                  |                    32 reps，4 actions x 8 |
| Round B status agreement             |                                     32/32 |
| Round B human score agreement        |                               26/26 exact |
| Locked Phase I AI vs human consensus |             16/25 exact；23/25 within one |
| Historical audited weak labels       |    18 confirmed among 25 stable consensus |
| ASLR side/peak evidence audit        | 16 windows：11 good / 2 watch / 3 limited |
| ASLR subject-aware sensitivity       |              3 limited → 1 good / 2 watch |
| Application case portfolio           |                       4 cases / 2 figures |
| Automated quality gate               |     Full test suite + 3 production builds |

## 我的角色

适合申请材料中的第一人称表述：

> I turned a question from my swimming experience into the AI-FMS research
> project. I learned and applied the FMS review protocol, helped define the
> study design, completed blinded movement reviews, and iterated the platform
> through AI-assisted development. I also helped interpret both the useful
> quantitative signals and the system's failures. I learned that responsible
> sports technology depends as much on data lineage, human review, and honest
> limitations as it does on computer vision.

协作贡献应如实披露：Ronnie 提出来自游泳训练的研究问题，学习并执行 FMS protocol，
完成 Reviewer A 的 blind review，参与研究设计、专业校准和结果解释；Other Reviewer
提供独立 blind review；Codex 作为 AI coding agent 协助工程实现、数据治理、分析与文档，
所有输出均保留在可检查的本地代码、数据和测试中。

## Resume Bullets

- Developed AI-FMS through AI-assisted coding, creating a React/MediaPipe
  human-in-the-loop workflow for FMS video segmentation, blinded review,
  pose-based movement features, adjudication, and traceable JSON/CSV exports.
- Reconstructed a four-movement pilot with 28 source videos and 110 repetitions;
  completed a balanced two-round, 32-repetition blinded reviewer study with
  stable IDs, append-only events, and SHA-256 validation.
- Analyzed 66 feature-ready repetitions and showed how identical ordinal FMS
  scores can contain different quantitative movement profiles, while documenting
  why the current AI rules are not a replacement for trained reviewers.

## 60-Second Interview Version

我做 AI-FMS 的起点是游泳训练中对动作质量的长期观察。传统 FMS 最终给 0-3 分，但
同分动作可能以不同方式完成。我先做了一个可用的视频审核平台，然后用 MediaPipe 把
动作变成角度、相对距离和稳定性参数。项目后来形成了 28 个视频、110 个 reps 的四动作
pilot，并完成 32 条双人、双轮 blind review。第二轮中人工在共同可评分的 26 条上
完全一致；锁定的 Phase I AI 在 25 条可比较记录中完全匹配 16 条，23 条相差不超过 1 分。
它没有证明 AI 能替代人，反而让我更清楚地看到 protocol metadata、pose tracking、
动态 feature 和 held-out validation 的边界。这个项目最重要的成果，是把运动经验、
研究设计和负责任的 AI 工程连接了起来。

## 必须保留的边界

- Educational and research prototype。
- Not a medical diagnostic or injury-risk prediction system。
- Does not automatically detect pain。
- Does not replace certified FMS professionals。
- Round A/B 是 exploratory pilot；双轮盲评已完成，外部 held-out validation 尚未完成。
- 公开视频和人物画面只有在 rights/privacy audit 后才能公开展示。
