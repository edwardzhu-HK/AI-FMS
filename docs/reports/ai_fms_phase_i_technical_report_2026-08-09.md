# AI-FMS Phase I 技术报告

## AI-FMS: A Human-in-the-Loop Platform for FMS Video Annotation and Pose-Based Movement Evidence

初始日期：2026-08-09

最近更新：2026-08-11

文档性质：Phase I 技术报告与申请材料底稿

## English Abstract

AI-FMS is a human-in-the-loop platform designed to support Functional Movement
Screen review when direct observation is brief, remote, asynchronous, or
difficult to reproduce. It enables reviewers to segment videos into
repetitions, pause and loop each movement, preserve camera view and protocol
context, inspect MediaPipe pose overlays and quantitative features, record
confidence and uncertainty, compare independent reviews, adjudicate
disagreements, and export a traceable evidence package. All seven FMS movements
share the same end-to-end annotation, pose-evidence, and first-pass AI
suggestion workflow. AI suggestions remain reviewer support rather than final
clinical judgments.

The platform was evaluated through a four-movement exploratory pilot containing
28 unique source videos and 110 repetitions. Sixty-six repetitions passed pose
and timing quality gates. A balanced 32-repetition subset underwent two rounds
of independent, blinded review, while a locked AI system scored the same sample
through a separate analysis path. The reviewers agreed on scoreability for all
32 repetitions and assigned identical scores to all 26 repetitions that both
could score. The AI system produced scores for 28 of 32 repetitions; among the
25 cases with both an AI score and a numeric human consensus, 16 matched exactly
and 23 were within one point. These results establish strong internal human
review consistency and moderate exploratory AI-human concordance, but they do
not constitute external or clinical validation.

The scientific contribution is not limited to reproducing an ordinal score.
Pose-derived angles, normalized distances, trajectories, side evidence, and
cycle-level events preserve information compressed by the traditional 0-3 FMS
scale. Deep Squat examples showed that repetitions with the same human score
could differ substantially in depth and joint strategy. ASLR, Hurdle Step, and
Rotary Stability analyses further demonstrated why subject selection, camera
view, temporal trajectory, and evidence quality must be modeled explicitly.
AI-FMS therefore contributes an auditable bridge between human movement
judgment and continuous quantitative evidence, while retaining human oversight
and explicit abstention when the available video does not support a reliable
suggestion.

## 摘要

AI-FMS 是一个 AI-assisted、human-in-the-loop 的 FMS 视频审核与研究平台。它帮助
reviewer 在远程、异步或动作难以重复观察的情况下，对视频进行 rep 切分、暂停和循环
播放，保存 camera view、side、protocol condition、confidence 和备注，并查看
MediaPipe pose overlay、角度、相对距离、轨迹和动作特异性证据。平台覆盖全部七个
FMS 动作；七个动作均具备统一的 annotation、pose evidence 和 first-pass AI
suggestion workflow。AI suggestion 用于辅助人工复核，不替代人工最终判断。

Phase I 选择其中四个动作进行重点研究，形成 28 个唯一视频、110 个 reps 的
canonical pilot，其中 66 条通过 pose 与 timing quality gate。研究从平衡样本中冻结
32 条，完成两轮双 reviewer 独立盲评，并让锁定的 AI 系统通过隔离路径分析同一批
样本。两位 reviewer 对全部 32 条的可评分性判断一致，并在共同可评分的 26 条上全部
同分。AI 对 32 条中的 28 条给出分数；在同时具有 AI 分数和人工数值共识的 25 条中，
16 条完全一致，23 条相差不超过 1 分。该结果支持较高的内部人工一致性和中等程度的
探索性 AI-human concordance，但不构成外部或临床验证。

本项目的研究价值不只是重现一个 0-3 分，而是恢复 ordinal score 压缩掉的连续动作
信息。Deep Squat 案例显示，同为人工 2 分的动作仍可在深度和关节策略上明显不同；
ASLR、Hurdle Step 和 Rotary Stability 的分析进一步说明，主体选择、机位、完整轨迹
和证据质量会直接影响定量解释。AI-FMS 因而建立了一条连接人工 movement judgment
与连续 quantitative evidence 的可审计路径，同时在证据不足时保留人工复核和主动
拒判。

## 1. 背景与动机

FMS 使用 0-3 RAW SCORE 对动作是否达到规则要求进行总结。这个体系适合快速
movement screening，但一次现场观察具有天然限制：动作很快结束，reviewer 可能只能
抓住一两个显著现象；远程、异步或无法亲临现场时更难重复观察；不同 rep、机位、侧别
和 protocol condition 也不容易在同一证据链中保存。人眼擅长理解动作整体，却难以
稳定记录连续角度、相对距离和轨迹。

### 1.1 帮助人更好地完成 FMS 评分

AI-FMS 的第一层目的，是把人工评分变成一个可以暂停、回放、比较和追溯的审核流程。
系统不是替 reviewer 做最终判断，而是为判断提供更好的工作条件：

- 支持远程和异步 review，不要求 reviewer 必须亲临一次性现场观察；
- 自动生成 rep segmentation，并允许人工校正 timing；
- 对单条 rep 循环播放，使动作不会“过去就过去了”；
- 保存 camera view、side、protocol condition、confidence、备注和质量标志；
- 叠加 pose skeleton，并展示角度、相对距离、轨迹和 movement-specific evidence；
- 对遮挡、低可见度、主体选择、侧别不稳定和协议条件不足提示人工复核；
- 保留独立 reviewer 记录、分歧、adjudication 和完整 export lineage。

这些功能共同解决的是人工观察的可重复性、可追溯性和定量信息不足问题。平台的目标
不是让 reviewer 服从 AI，而是让 reviewer 能够在更完整的上下文中作出、解释和复核
自己的判断。

### 1.2 恢复 0-3 分压缩掉的信息

AI-FMS 的第二层目的，是在不推翻 FMS 规则的前提下，保留 ordinal score 之外的连续
movement evidence。两个同为 2 分的动作，可能在深度、髋膝踝策略、躯干控制、左右侧
稳定性和完整轨迹上不同。传统总分保留“是否达到规则要求”，pose-derived parameters
进一步描述“动作是如何完成的”。

长期游泳训练使 movement quality、左右差异和动作效率成为 Ronnie 可以持续观察的
问题。AI-FMS 把这种经验转化为一个 Human Movement Science 与计算机视觉交叉项目：
既改善实际审核流程，也为同分动作的定量差异建立可检查、比较和后续研究的证据。

## 2. 研究问题

1. 能否建立覆盖七动作、适合远程和异步复核的视频 annotation 与 reviewer workflow？
2. 能否建立从视频、rep、pose、人工评分到研究输出的完整 lineage？
3. Pose-derived parameters 能否揭示同分动作内部的连续差异？
4. 独立人工审核在两位 reviewer 和两次盲评之间是否一致、稳定？
5. 锁定的 first-pass AI 与人工共识的一致性、coverage 和 abstention 情况如何？
6. 哪些 measurement limitations 最值得通过算法改进或定向采集继续研究？

本项目不回答“AI 是否能自动诊断或替代 certified FMS professional”。

## 3. 系统设计

### 3.1 人工困难、系统功能与产生的帮助

| 人工审核中的困难                 | 已实现的系统功能                                             | 产生的帮助与边界                      |
| -------------------------------- | ------------------------------------------------------------ | ------------------------------------- |
| 无法亲临现场或需要异步复核       | 本地视频导入、匿名 reviewer queue、可恢复 review state       | 支持远程与异步工作                    |
| 动作快速结束，难以回看细节       | Duration-aware range、逐 rep segment、loop playback          | 允许暂停和重复观察                    |
| 长视频中寻找 rep 耗时            | Timing detector、draft segmentation、人工 timing 校正        | 减少定位工作；错误切分仍需人工修正    |
| 人眼难以稳定记录连续量           | MediaPipe overlay、角度、距离、轨迹和动作特异性特征          | 增加定量旁证；2D proxy 不是临床量角器 |
| 机位、侧别和协议条件容易丢失     | Camera view、side、attempt condition、clearing/pain metadata | 保留评分上下文；pain 不由 AI 自动判断 |
| 遮挡、主体混乱或证据不足         | Pose-quality gate、subject/side QA、watch/abstain            | 提醒 reviewer 复核，不强行输出总分    |
| 第二 reviewer 与争议处理难以追溯 | Blind Study Mode、append-only events、adjudication、export   | 支持独立复核、争议处理与事后追溯      |

### 3.2 系统架构

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

### 3.3 Product Scope：七动作统一功能覆盖

| Action                    | Timing / annotation                  | 主要 pose evidence                                 | First-pass AI suggestion             | 人工保留的边界                        |
| ------------------------- | ------------------------------------ | -------------------------------------------------- | ------------------------------------ | ------------------------------------- |
| Deep Squat                | Rep cycle + floor/board context      | Depth、torso、hip/knee/ankle proxies               | Staged、可解释、允许 abstain         | Protocol condition 与 pain            |
| Active Straight Leg Raise | Left/right raise cycle               | Active leg、stationary leg、pelvis、side evidence  | 侧别与抬腿质量建议                   | Side uncertainty                      |
| Hurdle Step               | Forward/return step cycle            | Clearance、stance leg、pelvis/trunk、alignment     | 动态动作质量建议                     | Dowel、接触和恢复过程复核             |
| In-Line Lunge             | Lunge-depth cycle                    | Depth、trunk/pelvis、rear leg、knee-foot alignment | 动作质量与侧别建议                   | Ankle clearing                        |
| Shoulder Mobility         | Best-reach evidence                  | Reach distance、visibility、side context           | 保守 reach-based suggestion          | Shoulder clearing 与 pain             |
| Trunk Stability Push-Up   | Push-up lift event                   | Lift、body line、arm extension、hip drift          | 保守 body-line suggestion            | Extension clearing 与 pain            |
| Rotary Stability          | Complete setup-touch-extension cycle | 两次触踝、肘膝伸展、离地时序、回位、稳定性与 side  | 完整周期 1/2/3 suggestion 或 abstain | Flexion clearing、pain 与边界证据复核 |

七个动作都使用同一产品框架：timing、pose features、first-pass AI suggestion、
human confirmation 和 traceable export。各动作的 feature、protocol 和 clearing
规则不同，但 Rotary Stability 在产品能力层面不再是例外动作。平台功能完整不等于七个
动作已经获得同等强度的外部验证；验证范围由下一节单独说明。

### 3.4 Research Scope：四动作重点研究

| 研究层级                   | 当前范围                                        |
| -------------------------- | ----------------------------------------------- |
| Product workflow           | 全部 7 个 FMS movements                         |
| Phase I quantitative pilot | Deep Squat、Hurdle Step、ASLR、Rotary Stability |
| Canonical research pool    | 28 个唯一 source videos、110 reps               |
| Quantitative feature pool  | 66 feature-ready reps                           |
| Formal blinded study       | 32 reps；四动作各 8                             |
| Stable blind consensus     | 25 条在两次盲评中保持稳定数值共识               |

Product Scope 回答“系统做出了什么”；Research Scope 回答“本阶段用哪些数据进行了正式
研究”。Phase I 选择四个动作，是为了在可控范围内完成数据治理、人工验证和定量案例
分析，不意味着另外三个动作缺少主要产品功能。

### 3.5 当前界面证据

![AI-FMS workbench overview](../assets/ai-fms-demo-overview.jpg)

[打开原图：Workbench overview](../assets/ai-fms-demo-overview.jpg)

![Deep Squat side-view angle features](../assets/ai-fms-demo-side-angle-features.jpg)

[打开原图：Deep Squat angle features](../assets/ai-fms-demo-side-angle-features.jpg)

![Export evidence dashboard](../assets/ai-fms-demo-export-evidence.jpg)

[打开原图：Export evidence dashboard](../assets/ai-fms-demo-export-evidence.jpg)

这些截图说明已实现的产品流程和开发工作量。人物或源视频画面进入公开申请材料前仍需
完成 source-rights 与 privacy audit。

## 4. 数据与研究方法

### 4.1 Canonical 数据与质量门

项目从 28 个 cumulative history exports 重建稳定数据层，使用内容 checksum 去重，
并为 video、ingest 和 repetition 建立稳定 ID。Canonical snapshot 包含：

- 28 个唯一 source videos、110 个 repetitions；
- 29/29 video references 与 29/29 pose references resolved；
- 97 条通过 blindability audit；
- 66 条通过 pose/timing feature quality gate；
- 58 条同时 blindable + feature-ready。

正式 32 条从 58 条双门槛候选中按四动作平衡和 source-video dispersion 冻结，不是
从 110 条总体做 simple random sample。Reps 嵌套于 source videos，因此分析不会把
110 reps 表述为 110 个独立参与者。

### 4.2 双轮人工盲评

两位 reviewer 独立完成两轮评审。每轮均隐藏历史评分、AI suggestion、pose-derived
参数、源文件名、另一位 reviewer 的结果和音频标签提示；第二轮重新随机顺序，并与
第一轮保持约 51 小时间隔。Review Event 使用 append-only 结构，保存 status、0-3
RAW SCORE、confidence、camera view、side、comment、quality flags、foreground review
time 和 supersession lineage。

`score=0` 只表示观察或报告 pain。动作、画面或 protocol condition 不足时记录
`unscorable`，不把它错误编码为 0。Signed JSON 与 SHA-256 经过 validator 后幂等写入
本地 SQLite。

### 4.3 Quantitative profile analysis

66 条 feature-ready reps 先按 action 独立做 robust standardization，再进行
label-free descriptive analysis 和 deterministic profile discovery。人工分数只在
分组冻结后 overlay，以减少标签反向塑造 quantitative groups 的风险。分析同时检查：

- 同分动作内部的多维参数差异；
- source-video effect；
- leave-one-video-out stability；
- camera-view applicability；
- subject、side、peak 和完整动作周期的 evidence quality。

Profile groups 只用于探索连续结构，不命名为功能障碍亚型。

### 4.4 AI-human comparison

锁定 AI 系统通过与 Study Mode 隔离的数据路径处理同一 32-rep 正式样本。Suggestion
builder 不接收人工分数、reviewer comments、score-bearing filename 或 legacy AI。
分析分别报告：

- score-bearing coverage 和 abstention；
- exact agreement；
- within-one agreement；
- mean absolute error；
- weighted Cohen's kappa；
- 分动作结果。

AI 分析全部 32 条不等于强迫系统给 32 条总分。证据不足时 abstain 是系统设计的一部分。

## 5. Human Review Reliability

本节回答的是“人工评分是否一致、稳定”，不讨论 AI 与人工是否一致。

| 指标                           | Round A | Round B |
| ------------------------------ | ------- | ------- |
| 每位 reviewer 完成             | 32/32   | 32/32   |
| Outcome/scoreability agreement | 31/32   | 32/32   |
| 双方都能评分                   | 26      | 26      |
| RAW SCORE exact agreement      | 26/26   | 26/26   |
| Linear weighted kappa          | 1.0000  | 1.0000  |
| 双方均 unscorable              | 5       | 6       |
| Unscorable reason agreement    | 2/5     | 6/6     |

两位 reviewer 从第一轮到第二轮各改变 1 条可比较数值评分，而且改变的是同一条
Hurdle Step。第二轮还解决了第一轮的一条 scoreability mismatch。整体结果支持本研究
workflow 在当前样本和两位 reviewer 之间具有较高的一致性和复测稳定性。

这个结论仍有明确边界：两位 reviewer 不能替代 certified expert panel；高度一致也会
受到正式样本筛选、分数分布和共同 protocol training 的影响。Confidence 和 review
time 可作流程描述，但本研究没有设置 AI-evidence exposure 组，因此不能把其变化解释
为 AI 带来的效率或准确性提升。

## 6. Quantitative Movement Findings

这一部分是 Phase I 的主要研究输出。它不只问“AI 是否给对了分”，而是研究连续 pose
parameters 能否揭示 ordinal score 没有表达的动作差异，以及哪些 measurement
conditions 会影响这些参数的可信度。

### 6.1 总体发现：同分不等于同一种动作完成方式

对 66 条 feature-ready reps 的 label-free analysis 显示，部分相同 action-score
strata 跨越多个 quantitative profiles。但这些分组仍受到 singleton、source-video
signature 和独立来源不足影响，因此当前最稳妥的结论不是“发现了新的障碍分类”，而是：

> 相同 FMS RAW SCORE 内部可以存在连续、多维的 movement-strategy differences；
> AI-FMS 能将这些差异保存为可检查的定量证据。

### 6.2 Deep Squat：同分动作的深度和关节策略不同

两条来自不同源视频、审计后均为 side view、使用 heels-elevated board 的 Deep Squat
rep，均由两位 reviewer 判为 RAW SCORE 2：

| Feature                 |  Case A | Case B | 观察                      |
| ----------------------- | ------: | -----: | ------------------------- |
| `peakDepthRatio`        |  0.6600 | 0.7542 | Case B 完成深度更大       |
| `hipKneeVerticalGap`    | -0.0121 | 0.0673 | Case B 髋部相对膝部更低   |
| `hipAngleDegrees`       |    86.3 |   42.8 | 两条髋屈曲策略明显不同    |
| `kneeAngleDegrees`      |    64.9 |   35.0 | 两条膝屈曲策略明显不同    |
| `ankleShankLeanDegrees` |    32.4 |   15.1 | 下肢推进策略不同          |
| `maxKneeAnkleOffset`    |  0.0709 | 0.0403 | Case A 的膝踝 offset 更大 |

FMS 规则正确地把两条垫板动作归为 2 分；AI-FMS 的增量价值是进一步描述两条动作的
完成程度和 movement strategy，而不是推翻人工分数。该案例是当前最成熟的“同分异型”
研究输出。

![Deep Squat same-score movement profile](../assets/phase-i-case-studies/deep-squat-same-score.svg)

[打开原图：Deep Squat same-score profile](../assets/phase-i-case-studies/deep-squat-same-score.svg)

### 6.3 ASLR：定量证据首先依赖正确主体、侧别和峰值

ASLR 的研究发现不是简单的角度阈值，而是 measurement reliability。17 条 ASLR
记录对应 16 个独立 evidence windows：11 个为 `good`、2 个为 `watch`、3 个为
`limited`。部分窗口即使 landmark visibility 较高，仍可能跟踪到错误主体、在峰值
附近切换左右侧，或只捕获到稀疏的强抬腿帧。

对 3 个 limited 窗口进行 target-subject ROI re-extraction 后，结果变为 1 good、
2 watch、0 limited。这说明一部分失败来自主体选择和裁剪，而不是视频中没有动作信号。
研究意义是：在解释 active-leg height、stationary-leg control 和 pelvic proxy 之前，
系统必须先证明“看的是正确的人、正确的腿和正确的动作峰值”。

![ASLR subject-aware evidence quality](../assets/phase-i-case-studies/aslr-subject-aware-qa.svg)

[打开原图：ASLR subject-aware evidence quality](../assets/phase-i-case-studies/aslr-subject-aware-qa.svg)

### 6.4 Hurdle Step：峰值相似不代表完整轨迹相同

Hurdle Step 的现有特征能够描述 clearance、stance leg、step-knee alignment、pelvis
和 trunk position，但单一 peak frame 容易遗漏跨越后的恢复过程、动态膝踝控制、
dowel orientation 和轻微接触。两条人工 2 分的 rep 曾显示明显参数差异，但 camera
audit 发现它们分别来自 `mixed` 和 `front` view，因此不能把全部差异归因于动作本身。

这个结果不是失败，而是一个重要的方法学发现：动态动作需要完整 trajectory 和
view-aware feature gate。Hurdle Step 后续研究应重点增加 forward-return cycle、动态
trunk/knee/ankle 和 dowel evidence，而不是继续微调单帧阈值。

### 6.5 Rotary Stability：完整周期比单帧姿势更重要

Rotary Stability 的定量分析覆盖 setup、第一次触踝、extension、第二次触踝、手膝
离地时序、肘膝伸展、回位和稳定性。它说明复杂动作不能仅靠某一个峰值角度判定，必须
识别事件顺序和完整动作周期。

在正式 8 条样本中，AI 对 8/8 给出 first-pass 分数，6/8 与人工共识完全一致，8/8
相差不超过 1 分。两条差异来自 2D hand-to-ankle proxy 的保守判断，没有通过移动
threshold 追成人工答案。这个案例同时展示了系统能力和证据边界：完整周期使自动建议
成为可能，而 pain、flexion clearing、board alignment 和遮挡下的触踝仍需人工确认。

### 6.6 历史数据如何继续产生价值

32 条正式样本还用于审计历史评分，而不是把旧数据丢弃。25 条在两次盲评中保持稳定
数值共识，其中 18 条与历史标签完全一致，6 条稳定不一致，1 条历史分数缺失。由此：

- 18 条可标记为 `audited weak labels`；
- 其余历史标签继续用于 provenance、抽样和假设生成；
- 未经逐条审核的历史标签不能升级为 gold labels；
- 110-rep pool 仍可用于 label-free feature distribution 和数据缺口分析。

这使前期工作被充分利用，同时避免用 32 条目的性平衡样本去证明全部 110 条历史评分
有效。

## 7. AI-Human Agreement

第 5 节衡量 human-human reliability；本节衡量锁定 AI 与 human consensus 的
concordance。两者使用不同问题和不同分母，不能互相替代。

锁定 AI 系统分析全部 32 条正式样本，对 28 条给出分数，对 4 条因 staged protocol
证据不足而 abstain。人工形成 26 条数值共识；AI 与人工共识的交集为 25 条。

| Action                    | Comparable |     Exact | Within one |        MAE |
| ------------------------- | ---------: | --------: | ---------: | ---------: |
| Active Straight Leg Raise |          6 |       4/6 |        4/6 |     0.6667 |
| Deep Squat                |          3 |       3/3 |        3/3 |     0.0000 |
| Hurdle Step               |          8 |       3/8 |        8/8 |     0.6250 |
| Rotary Stability          |          8 |       6/8 |        8/8 |     0.2500 |
| **Overall**               |     **25** | **16/25** |  **23/25** | **0.4400** |

Overall linear weighted kappa 为 0.4917，quadratic weighted kappa 为 0.5247。
这可以表述为中等程度的内部一致性，不能表述为外部准确率。

结果同时指出了下一步最有价值的改进方向：

- ASLR 的主要问题是少数严重低估，需要在新视频中验证主体、侧别和 robust peak-window
  geometry；
- Hurdle Step 的主要问题集中在 2/3 边界，说明完整轨迹和 dowel evidence 比单帧
  threshold 更重要；
- Rotary Stability 的两条差异来自保守触踝 proxy，适合使用手脚无遮挡的新来源做
  held-out confirmation；
- Deep Squat 当前可比较样本较少，不能因 3/3 exact 作强泛化结论。

因此，本阶段支持的主张是：AI 已能为大部分正式样本提供可解释的 first-pass suggestion，
并在多数可比较样本上与人工相同或相差不超过 1 分；它仍应作为 reviewer support，
并通过 abstention、quality gate 和人工 protocol confirmation 控制边界。

## 8. 工程实现

- React 19 + Vite multi-entry frontend，包含 Workbench、Study Mode 和 Video Manager；
- Duration-aware range、rep segmentation、loop playback 和 timing correction；
- MediaPipe Pose Landmarker extraction、pose overlay 和 movement-specific features；
- 七动作统一 movement adapter、side evidence、clearing gate 和 first-pass AI suggestion；
- Append-only study events、signed export validation 和 SQLite idempotent ingest；
- Stable IDs、canonical JSON/CSV、data dictionary、manifest 和 SHA-256；
- 可复现的数据构建、研究分析、图表和 release scripts；
- 340 项自动测试、lint、Prettier 和三个 production builds。

工程价值不只在 UI，而在 source-of-truth、证据 lineage、数据隔离、质量门和 fail-closed
行为。所有主要研究数字均能从冻结 artifact 重新生成。

## 9. Limitations

- 110 reps 嵌套于 28 个 source videos，不是独立参与者样本；
- 数据来源、机位、动作和 score distribution 不平衡；
- 只有两位 reviewer，不构成 certified expert panel validation；
- 没有人口统计、consent registry、clinical outcome 或 injury labels；
- 2D pose 受视角、遮挡、透视、服装和 source-video signature 影响；
- AI rules 与部分公开视频存在开发重叠，当前结果不是 held-out test；
- ASLR 的 subject-aware extraction 尚未在独立多人视频验证；
- Hurdle Step 仍缺少完整 dynamic trajectory 和 dowel orientation；
- Rotary Stability 的触踝、board alignment 和 clearing 仍需要人工证据；
- Deep Squat 依赖完整 staged protocol，缺少 follow-up attempt 时必须 abstain；
- 当前 quantitative profiles 不能命名为 validated impairment subtypes；
- 双轮评审均为 blind human review，没有直接测量 AI evidence 对 reviewer 效率、
  confidence 或最终判断的因果影响；
- 未完成 rights/privacy audit 的媒体不能进入公开 release。

## 10. 伦理与合理主张

可以主张：

- 建成覆盖七动作的 human-in-the-loop annotation、pose evidence 和 AI-assisted
  review platform；
- 七个动作均具备 first-pass pose-based AI suggestion，并允许证据不足时 abstain；
- 完成四动作 canonical pilot、双轮盲评和探索性 AI-human comparison；
- 保存连续 quantitative movement evidence 和完整 lineage；
- 发现相同 FMS 分数内部的可量化差异，以及影响测量可靠性的关键条件。

不能主张：

- AI 比专业 reviewer 更准确或可以替代人工；
- 系统能诊断功能障碍、疼痛或伤病风险；
- 32 条正式样本证明全部 110 条历史标签有效；
- 当前 profile groups 是经过验证的 impairment subtypes；
- 当前内部 benchmark 等于临床或外部 validation。

## 11. 结论与下一步

AI-FMS Phase I 已从单一动作 demo 发展为一个覆盖七动作、连接产品功能、数据治理、
人工审核、pose evidence 和研究输出的完整平台。它首先改善人工 FMS 在远程审核、
回放、定量观察和信息保留方面的工作条件；随后通过四动作 pilot 验证人工流程的内部
一致性，并评估 first-pass AI 与人工共识的关系；最后用定量案例说明，相同 ordinal
score 背后可以存在不同的动作完成程度和 movement strategy。

现阶段最有价值的成果有三个：

1. 建立了七动作统一、可运行、可追溯的人机协同系统；
2. 建立了双轮人工盲评、锁定 AI comparison 和完整数据 lineage；
3. 找到了从“给出 0-3 分”进一步走向“解释动作如何完成”的研究路径。

下一阶段应围绕研究发现而不是盲目扩大数据量：

1. 深化 Deep Squat、ASLR、Hurdle Step 和 Rotary Stability 的案例分析与可视化；
2. 优先采集能够回答明确问题的 held-out 视频：ASLR 主体与峰值、Hurdle 完整轨迹与
   dowel、Rotary 清晰触踝与 board alignment；
3. 使用新的独立来源验证锁定 AI，而不继续用正式 32 条调参；
4. 引入更多 reviewer 或 expert panel，扩大 reliability evidence；
5. 如需验证 AI 对人工审核的实际帮助，另行设计 evidence-assisted controlled study；
6. 完成公开素材 rights/privacy audit、demo video 和最终 application package。

Phase I 的结论不是“AI 已经取代 FMS reviewer”，而是：AI-FMS 已经证明，人工 ordinal
judgment 可以与连续、可解释、可追溯的 movement evidence 放在同一套工作流中。这为
更精细的动作理解、后续验证和负责任的 sports technology research 建立了基础。
