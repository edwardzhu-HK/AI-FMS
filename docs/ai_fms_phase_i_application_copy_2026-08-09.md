# AI-FMS Phase I Application Copy

## 项目名称

**AI-FMS: Explainable Human-in-the-Loop FMS Video Review**

中文：**AI-FMS：可解释的人机协同 FMS 视频审核系统**

## 一句话介绍

我参与开发了一个 AI 辅助人工审核的 FMS 视频平台，让 reviewer 可以远程、异步地回放
每个动作，查看 MediaPipe pose、角度/距离参数和 AI suggestion，并把人工评分与研究
导出连接成可追溯证据链。

## English Short Description

AI-FMS is an explainable, human-in-the-loop system for reviewing Functional
Movement Screen videos. It supports repetition-level replay, blinded human
review, MediaPipe pose features, interpretable AI suggestions, and traceable
data exports across all seven FMS movements. It was designed to help reviewers
work more consistently while preserving the quantitative movement information
that a 0-3 score cannot fully express.

## 项目故事

长期游泳训练让我持续注意动作质量，但人工视频审核有几个现实问题：动作发生后很难
回溯，远程或异步场景不方便，reviewer 需要反复寻找每个 rep，而且肉眼通常只能定性
判断角度、距离和轨迹。FMS 提供了清楚的 0-3 规则，却不会自动保存这些观察证据。

为了先理解和负责地执行这套 protocol，我完成了 FMS Level 1 和 Level 2 training，并
取得两项 certification。随后在实际进行和复核 FMS assessments 的过程中，我进一步
确认这些问题并不只是理论上的不便，而是会直接影响视频审核效率、证据保存和后续解释。

我把问题拆成三个部分：先建立覆盖七动作、可以暂停回放和逐 rep 审核的工作台，再用
pose estimation 提取 quantitative evidence，最后通过 blind review 检查人工评分的
稳定性，以及锁定 AI 在哪里与人工一致、在哪里应该拒判或交给人复核。

## 我完成了什么

- 构建 7-movement annotation workbench，支持视频、rep timing、loop playback、人工
  scoring、adjudication 和 JSON/CSV export。
- 完成 FMS Level 1 和 Level 2 training/certification，并将 protocol 学习用于系统规则、
  blind review 和结果解释。
- 使用 MediaPipe Pose Landmarker 建立动作 timing、pose overlay 和 movement-specific
  feature pipeline；全部 7 个动作均可生成 first-pass、可解释、允许 abstain 的 AI
  reviewer-support suggestion。
- 将 28 个 history exports 重建为 28 个唯一视频、110 个 reps 的 canonical pilot，
  带稳定 ID、lineage 和 SHA-256。
- 建立 blind Study Mode，冻结四动作各 8 条的正式 32-rep 样本，并完成双 reviewer
  Round A 与间隔约 51 小时的 Round B。
- 对 66 条 feature-ready reps 做 label-free movement profiles 和 source-effect audit。
- 逐条复核 AI/人工差异，区分 protocol metadata、pose tracking、camera view 和动态
  feature 缺口。
- 让锁定的 Phase I AI 通过与盲评隔离的路径分析同一批正式样本，完成人工一致性与
  AI-human agreement 的平行 benchmark，并审计历史标签的可复用范围。
- 从完整 110-rep pool 建立四种差异化研究：Deep Squat 15-rep 侧视连续谱、ASLR
  同源 bilateral repeatability series、Hurdle 五条盲评 2 分的 pathway taxonomy，
  以及 Rotary 八-rep full-cycle event matrix；另保留 measurement QA。

## 最有意义的研究发现

系统开发和 Phase I 评估完成后，我们进一步发现它不只可以帮助 reviewer 完成评分，
还可以支持传统 FMS 分数之外的 movement-science 分析。

研究显示，0-3 分压缩的不只是更多角度。15 条 Deep Squat 侧视 rep 显示，深度与髋膝
屈曲形成连续轴，但踝、躯干和对线策略不能由深度自动推断。ASLR 同源四-rep 序列显示，
active height 变化较小，固定踝漂移和骨盆 gap 却变化更大。五条来自五个视频的 Hurdle
盲评 2 分形成四种 review pathway。Rotary 的八-rep event matrix 则显示，第二次触踝、
回位和动作时序必须放在完整周期中解释。

这说明 AI-FMS 的价值不是把一个 2 分改成另一个分数，而是让 reviewer 看见：

> FMS 分数可能压缩连续动作策略、左右与重复性、规则扣分路径和时间事件顺序；
> AI-FMS 把这些信息恢复成可检查、可继续验证的 movement evidence。

这些结果可以提示不同的 mobility、stability、coordination、repeatability 和
compensation follow-up，但不是医学诊断或已确认的功能障碍。

另一个重要结果是有边界的：两位 reviewer 在第二轮的 26 条可评分记录中全部同分，
而锁定的 Phase I AI 在 25 条可比较记录中与人工完全同分 16 条、23 条相差不超过 1 分。
这提供了一个覆盖四动作的内部 benchmark，但仍不能说它已经是经过独立验证的自动
评分器。定向误差分析进一步说明，ASLR 仍需要更稳健的 active-side/peak detection，
Hurdle 仍需要完整动作轨迹和 dowel evidence；这些内容属于 measurement limitations，
不作为同分异型的主要证明。
随后覆盖全部 17 条 ASLR 记录的无标签审计把 16 个独立窗口分为 11 good、2 watch、
3 limited，说明 landmark visibility 高并不自动代表跟踪了正确主体或正确侧别。
Subject-aware sensitivity 再对 3 个 limited 窗口做受试者 ROI 重提取，得到 1 good、
2 watch、0 limited；这支持“部分失败来自错误主体选择或裁剪”的解释，但不回写冻结
结果，也不构成评分准确率提升。

## Evidence Snapshot

| Evidence                             |                                        Result |
| ------------------------------------ | --------------------------------------------: |
| Canonical pilot                      |                          28 videos / 110 reps |
| Feature-ready                        |                                       66 reps |
| Formal blind sample                  |                        32 reps，4 actions x 8 |
| Round B status agreement             |                                         32/32 |
| Round B human score agreement        |                                   26/26 exact |
| Locked Phase I AI vs human consensus |                 16/25 exact；23/25 within one |
| Historical audited weak labels       |        18 confirmed among 25 stable consensus |
| ASLR side/peak evidence audit        |     16 windows：11 good / 2 watch / 3 limited |
| ASLR subject-aware sensitivity       |                  3 limited → 1 good / 2 watch |
| Application case portfolio           |                        4 analyses / 4 figures |
| Automated quality gate               | 340 tests + lint/format + 3 production builds |
| Manuscript status                    |         24-page Chinese internal review draft |
| FMS preparation                      |            Level 1 and Level 2 certifications |

## 我的角色

适合申请材料中的第一人称表述：

> I turned a question from my swimming experience into the AI-FMS research
> project. I completed FMS Level 1 and Level 2 certification, applied the
> protocol in practice, helped define the study design, completed blinded
> movement reviews, and iterated the platform through AI-assisted development. I
> also helped interpret both the useful quantitative signals and the system's
> failures. I learned that responsible sports technology depends as much on data
> lineage, human review, and honest limitations as it does on computer vision.

协作贡献应如实披露：Ronnie 提出来自游泳训练的研究问题，学习并执行 FMS protocol，
完成 Reviewer A 的 blind review，参与研究设计、专业校准和结果解释；Other Reviewer
提供独立 blind review；Codex 作为 AI coding agent 协助工程实现、数据治理、分析与文档，
所有输出均保留在可检查的本地代码、数据和测试中。

## Resume Bullets

- Completed FMS Level 1 and Level 2 certification and applied the protocol in
  movement-screening practice, blinded review, and system rule interpretation.
- Developed AI-FMS through AI-assisted coding, creating a React/MediaPipe
  human-in-the-loop workflow for FMS video segmentation, blinded review,
  pose-based movement features, adjudication, and traceable JSON/CSV exports.
- Reconstructed a four-movement pilot with 28 source videos and 110 repetitions;
  completed a balanced two-round, 32-repetition blinded reviewer study with
  stable IDs, append-only events, and SHA-256 validation.
- Analyzed 66 feature-ready repetitions using a movement-strategy continuum,
  bilateral repeatability series, blind-review pathway taxonomy, and cycle-event
  matrix, while documenting why the current AI rules are not a replacement for
  trained reviewers.

## Length Variants

以下版本不绑定某个申请系统的当前字数规则；正式填写时应按实际载体重新核对限制。

### 150-character version

142 characters including spaces:

> Developed AI-FMS through AI-assisted coding: a 7-movement video-review platform
> with blinded human scoring, pose evidence, and traceable data.

### 350-character version

295 characters including spaces:

> Developed AI-FMS through AI-assisted coding, connecting my swimming and Human
> Movement Science interests with a seven-movement video-review platform. I
> learned the FMS protocol, completed two rounds of blinded review, and helped
> interpret pose-based evidence from a 110-repetition Phase I pilot.

### Short additional-information version

> AI-FMS is an explainable, human-in-the-loop system for reviewing Functional
> Movement Screen videos. I helped shape the research question from my swimming
> experience, learned the FMS protocol, completed two blinded review rounds, and
> interpreted both the system's quantitative evidence and its failures. The
> platform supports all seven FMS movements; Phase I evaluated four movements
> using 28 source videos and 110 repetitions. The work taught me to treat AI
> output as evidence that requires protocol context, quality gates, human
> responsibility, and honest limits rather than as an automatic diagnosis.

## 60-Second Interview Version

我做 AI-FMS 的起点是游泳训练中对动作质量的长期观察。我完成了 FMS Level 1 和
Level 2 certification，并在实际评估中发现视频回放、定量观察和证据保存的不足。随后
我参与开发了一个覆盖七个 FMS 动作的视频审核平台，让 reviewer 能够远程回放每个
rep、保存判断依据，并用 MediaPipe 查看肉眼难以量化的角度、距离和动作轨迹。在系统
完成后，我们又构建了 28 个视频、110 个 reps 的四动作 Phase I pilot，并完成 32 条
双人、双轮 blind review。第二轮中人工在共同可评分的 26 条上
完全一致；锁定的 Phase I AI 在 25 条可比较记录中完全匹配 16 条，23 条相差不超过 1 分。
定量分析还显示，相同 FMS 分数可能隐藏不同的动作策略、左右重复性、扣分路径和周期
顺序。项目没有证明 AI 能替代人，却让我更清楚地理解了 protocol metadata、pose
tracking、abstention 和 held-out validation 的边界。

## 必须保留的边界

- Educational and research prototype。
- Not a medical diagnostic or injury-risk prediction system。
- Does not automatically detect pain。
- Does not replace certified FMS professionals。
- Round A/B 是 exploratory pilot；双轮盲评已完成，外部 held-out validation 尚未完成。
- 当前论文中的两张真实视频界面图仅供内部审阅；逐帧 rights clearance 完成后才能公开。
- GitHub 当前仍由项目发起账户托管；Ronnie 注册账户后将按保留完整历史的 repository
  transfer 流程迁移所有权。
