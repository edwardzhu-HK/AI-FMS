# AI-FMS：系统开发、Phase I 评估及 FMS 视频审核中的人机协作

**Haoran ZHU**
Kang Chiao International School East China Campus
通讯邮箱：13061747546@163.com

**预印本，未经同行评审。**
版本 1.0 中文翻译审阅稿，修订于 2026 年 10 月 3 日
DOI：[在最终 PDF 前于 Zenodo 预留]

本稿为英文 Zenodo preprint 的中文翻译审阅稿。如中英文表述存在差异，以最终人工确认的英文原稿为准。

## 摘要

Functional Movement Screen（FMS，功能性动作筛查）的评估依赖经过训练的人工观察，但在实际视频审核中，审核者常受到动作一闪而过、无法亲临现场、需要反复手动定位、判断主要依靠定性观察，以及动作信息最终被压缩成 0-3 分有序等级评分等限制。为此，我们开发了 AI-FMS：一个覆盖全部 7 个 FMS 动作的 human-in-the-loop 视频审核系统。上述 7 个动作均已实现视频上传、repetition（rep）分段、循环播放、reviewer 评分、结构化协议字段、pose overlay、定量特征、可解释的 first-pass AI 评分建议、质量警示、abstention（拒绝评分）、adjudication（裁定）和可追溯导出。系统使用二维 pose landmarks 保存关节角度、相对距离、侧别轨迹和完整动作周期事件等运动证据，同时把协议条件、疼痛、clearing 条件和最终评分的决定权保留给人类审核者。

在七动作系统功能实现的基础上，Phase I 定量研究重点选取 Deep Squat、Hurdle Step、Active Straight-Leg Raise 和 Rotary Stability 四个动作，整理了包含 28 个独立源视频、110 个 canonical reps 的 corpus，并选出每动作 8 条、共 32 条 reps，由 2 位 reviewer 完成两轮独立盲评。两轮均对 AI 分数、pose evidence、既往评分及另一位 reviewer 的结果保持盲法。人工评分一致性与 AI-human 评分比较构成这项研究的一部分；在 25 条可比较项目中，锁定 AI 与人工参考完全同分 16 条，相差不超过 1 分 23 条。这些结果属于内部探索性评估，尚不构成独立外部验证。

系统保留的结构化动作证据还支持进一步分析：Deep Squat 的深度与关节策略连续谱、ASLR 的双侧重复性、Hurdle Step 中相同分数对应的不同控制与扣分路径，以及 Rotary Stability 的完整周期事件结构。这些分析展示了 0-3 分之外的连续差异、左右关系和时间信息，为动作解释、跨 rep 比较及后续研究提供了可追溯依据。AI-FMS 的成果因此涵盖七动作系统实现、Phase I 定量研究，以及基于系统数据的动作分析；自动化负责整理证据和提供可检查的建议，人工 reviewer 保留最终解释与评分权。系统不用于临床诊断或伤病预测。

**关键词：** Functional Movement Screen；human-in-the-loop AI；movement screening；pose estimation；视频审核；explainable AI；human-AI interaction；sports technology

## 1. 引言

Functional Movement Screen 使用 7 个动作模式构成一套结构化评估，并采用 0-3 分有序等级评分。既有研究报告了具有实用价值的 interrater 和 intrarater reliability，同时也指出了其 validity 方面的重要问题，并警告不应把 composite score 作为独立的伤病预测工具 [1-3]。这一界限对本项目十分重要：AI-FMS 是 movement-screening 和审核系统，不是诊断工具或伤病预测工具。

人工评分不可缺少，因为评估者必须判断动作是否遵循协议、clearing condition 或疼痛报告是否会改变分数，以及现有视觉证据是否足以支持独立评分。然而，传统工具并未充分支持这项工作。动作可能在 reviewer 检查完所有身体区域之前就已经结束；远程或异步审核需要在长视频中反复手动定位；camera view 和 side 可能被错误标注；reviewer 也可能希望比较多个尝试，或逐帧检查关节关系，但普通播放器不会把这些证据保存成结构化数据。

有序评分还会产生必要的信息压缩。两个 rep 可能同为 2 分，但在下蹲深度、躯干策略、膝部控制、左右稳定性或完整运动路径方面并不相同。分数适合 screening，但动作本身还包含可用于解释、质量控制和后续研究的信息。Markerless pose estimation 使普通视频也能产生连续动作描述量，但二维测量仍会受到 camera geometry、遮挡、服装和构图的影响 [4-7]。

因此，AI-FMS 围绕两个相互关联的目标设计。第一，使人工视频审核更易用、更可重复、更可追溯；第二，保存 0-3 分结果没有保留的部分定量证据。项目最核心的设计决定，不是用自动化把人排除出去，而是将机器辅助分段、pose evidence、明确的不确定性和 first-pass suggestion，与 reviewer 控制的协议字段、评分、备注和 adjudication 结合起来。

本报告有 3 项主要贡献：

1. 实现覆盖全部 7 个 FMS 动作的端到端 AI-assisted review 系统，整合视频标注、pose evidence、可解释建议、人工审核与可追溯导出。
2. 开展聚焦 4 个动作的 Phase I 定量研究，建立可复现 corpus 和双 reviewer、双轮盲评流程，并报告人工评分一致性、内部 AI-human benchmark、coverage 和 abstention。
3. 利用系统保留的结构化动作证据，开展动作特异性的连续策略、双侧重复性、控制与扣分路径及完整周期事件分析，展示有序分数之外的信息价值，同时保持非临床主张边界。

## 2. 系统目标与设计原则

### 2.1 在预测分数之前，先支持 reviewer 完成审核

系统从审核任务出发。用户可以上传视频、定义分析区间、检测或调整 reps、循环播放所选 rep，并在协议语境下记录分数。每个 rep 都具有稳定 ID，并与其源视频保持可追溯关系。这种结构减少了重复搜索，也为后续 adjudication 提供支持。

### 2.2 保存证据，而不只保存输出标签

针对每个支持的动作，AI-FMS 可以保存 timing、pose landmarks、派生角度或相对距离、side evidence、quality flags，以及 AI suggestion 的解释。可视化 overlay 允许 reviewer 检查 landmarks 是否真正对应人体。所有定量值都作为 supporting evidence 呈现，而不是被当作 ground truth。

### 2.3 让不确定性可以被处理

系统区分“低分”和“证据不足”。当协议 metadata 缺失、分阶段条件会改变解释、pose quality 不足，或疼痛/clearing 决定需要人工输入时，系统可以 abstain。这符合 human-AI interaction 的设计建议：系统应当沟通自身限制，并允许人进行纠正 [8]。

### 2.4 明确保留人的最终决定权

Reviewer 控制 camera view、side、protocol condition、score、confidence 和 notes。系统不会从无声视频中推断疼痛或 clearing test。AI suggestion 可以被接受、修改或忽略。第二位 reviewer 和 adjudication workflow 可以检查同一个 rep，而不会覆盖第一位 reviewer 的判断。

## 3. 系统实现

### 3.1 界面与数据流

AI-FMS 使用浏览器端 React/Vite Workbench、结构化数据层和私有本地数据库实现。其操作流程如下：

1. ingest 源视频并记录 provenance；
2. 定义可用分析区间；
3. 分割候选 reps；
4. 提取 pose landmarks；
5. 计算动作特异性特征和 quality gates；
6. 生成可解释的 first-pass suggestion，或选择 abstain；
7. 开展独立人工审核和 adjudication；
8. 导出用于分析的结构化记录。

实现层复用稳定 schema 和 generated adapters，使界面字段、exports、reports 和 database records 都指向同一套 source-of-truth representation。自动化检查覆盖数据解析、评分逻辑、Study Mode 盲法、导出行为和 production builds。在 Phase I release 时，repository quality gate 包含 340 个自动化 tests、linting、formatting 和 3 个 production entry builds。这里的结果属于工程质量证据，不能表述为 3 次独立科学验证。

### 3.2 七动作产品范围

产品 workflow 支持 Deep Squat、Hurdle Step、In-Line Lunge、Shoulder Mobility、Active Straight-Leg Raise、Trunk Stability Push-Up 和 Rotary Stability。所有动作共享视频 ingest、rep timing、playback、reviewer scoring、structured evidence 和 export 等能力；movement-specific modules 则分别定义所需 landmarks、events、side logic、protocol gates 和 explanation text。

Rotary Stability 不能只依赖一个 peak-angle threshold。它的 first-pass suggestion 使用完整动作周期事件，包括 pattern 和 side 的关系、reach 或 contact 行为、trunk rotation、center displacement、return completion 和 balance-related events。系统保持保守；当无法可靠解析完整周期时，可以 abstain。

### 3.3 界面视图

Workbench 面向透明检查而设计。Video panel、rep navigator、movement 和 protocol fields、quantitative evidence、pose overlay 与 score controls 同时保留在一个任务导向的界面中。独立的 Study Mode 会隐藏 filename、prior answers、AI scores、pose evidence 和另一位 reviewer 的数据，从而在没有 information leakage 的条件下采集正式人工评分。

**图 1.** AI-FMS 从源视频到 reviewer-controlled traceable output 的系统流程。
`figures/figure-01-ai-fms-workflow.png`

**图 2.** 使用已获许可的真实演示视频，并显示可检查定量证据的主 Workbench。
`figures/figure-02-workbench-overview.png`

**图 3.** 用于采集独立人工评分的 blind Study Mode。
`figures/figure-03-study-mode.png`

## 4. Phase I 方法

### 4.1 研究范围

Phase I 聚焦 Deep Squat、Hurdle Step、Active Straight-Leg Raise（ASLR）和 Rotary Stability。这 4 个动作分别代表不同技术挑战：多关节深度与动作策略、动态单腿控制、侧别活动范围与稳定性，以及完整周期的 pattern events。本研究是探索性研究，目的是测试数据与审核 pipeline，而不是建立临床表现。

### 4.2 Corpus 构建

整理后的 corpus 包含 28 个独立源视频，对应 29 条 ingest 记录和 110 个 canonical reps。其中 97 条可用于盲评，66 条 feature-ready，58 条同时满足两项条件。Rep 始终与源视频保持关联，因为同一视频中的多个 repetitions 并不具有统计独立性。

Formal subset 包含 32 个 reps，每个动作 8 条，来自 21 个源视频。选样是确定性和平衡化的，不是随机抽样。稳定 study IDs 和随机展示顺序对 reviewer 隐藏了源 filename 和与分数有关的 metadata。Corpus 中部分项目存在历史 AI suggestions，但 92 条 legacy numeric suggestions 被排除在 formal evidence 之外，因为它们产生于开发过程，可能包含 label leakage 或 tuning dependence。

### 4.3 人工审核协议

其中一位 reviewer Haoran ZHU 已于 2025 年 7 月 17 日完成 FMS Level 1 认证，并于 2025 年 8 月 10 日获得 FMS Level 2 Certified Professional 认证，均早于 Phase I 人工审核。这些认证为其应用 FMS protocol 和解释动作证据提供了专业准备。

两位 reviewer 在约 51 小时的间隔后分别完成 Round A 和 Round B。两轮中，每位 reviewer 都看不到源 filename、historical labels、AI scores、pose evidence、audio、prior answers 和另一位 reviewer 的回答。展示顺序分别随机化。Reviewer 记录：

- 当 rep 可以独立评分时，记录 numeric FMS score；
- 当协议或证据不足时，记录 unscorable status 和 reason；
- camera view 和 side；
- protocol condition；
- confidence；
- 可选 notes。

Round B 是第二次 blind review，不是 AI-assisted review。因此，它衡量短间隔下的人工复评稳定性，而不是显示 AI evidence 是否提高速度、confidence 或 accuracy。

### 4.4 锁定 AI benchmark

最终 AI 规则在检查 Round A 结果后完成开发，但在查看 Round B 结果之前冻结。锁定 pass 随后与最终人工 reference 比较。由于 formal items 参与了开发，这是一项 internal post-audit benchmark，而不是 held-out validation。

主要指标包括 coverage、abstention、exact agreement、within-one agreement、mean absolute error 和 linear weighted Cohen's kappa [9]。Coverage 和 abstention 被单独报告，因为当必要证据缺失时，一个负责任的系统不应因为强制输出数值分数而获得额外评价。

### 4.5 进一步的定量分析

完整 corpus 用于考察：获得相同人工分数的 repetitions 是否可能采用不同、可观察的动作策略。这些分析属于 descriptive analysis，不用于识别诊断，也不能证明功能障碍。其目的在于形成可检验的假设，并展示 traceable pose record 可以保留哪些信息。

## 5. 结果

### 5.1 人工审核一致性与稳定性

在 Round A 中，两位 reviewer 对 31/32 条项目的 status 一致；在双方均判断为 numeric 的 26 条项目中，分数 26/26 完全一致。在 Round B 中，两位 reviewer 对全部 32 条项目的 status 一致，并再次在 26 条双方均给出数值分数的项目上完全同分。Round B 有 6 条项目因协议原因被双方共同判定为无法独立评分。

两轮之间，每位 reviewer 各修改了 1 条 numeric score，而且两处修改都涉及同一条 Hurdle Step rep。这一结果说明该小型 reviewer pair 内部具有较强一致性，但在开展更大规模、多 reviewer 研究之前，不能把该结果推广到其他审核者。样本分数范围有限时，exact agreement 也可能被抬高。

### 5.2 锁定 AI-human benchmark

锁定 AI 对 32 条 formal items 中的 28 条给出输出。对于 4 条 Deep Squat 项目，系统选择 abstain，因为仅凭现有 metadata 和视觉证据无法安全判断分阶段 protocol condition。另有 3 条 AI 输出没有可比较的人工 numeric reference，因此最终留下 25 条可比较项目。

在这 25 条项目中：

- exact agreement 为 16/25（64%）；
- within-one agreement 为 23/25（92%）；
- mean absolute error 为 0.44；
- linear weighted Cohen's kappa 为 0.4917。

这些结果显示 first-pass assistance system 与人工 reference 具有值得进一步研究的一致性，但仍有明显改进空间。4 次 abstention 不应被等同于错误的强制评分；它们表明，能够识别 protocol 条件并拒绝评分，本身可以成为系统能力的一部分。

**表 1. Phase I 证据摘要**

| 证据层               | 结果                                 | 合理解释                                                   |
| -------------------- | ------------------------------------ | ---------------------------------------------------------- |
| Corpus               | 28 个独立视频；110 个 canonical reps | 开发与探索性分析 corpus                                    |
| Formal review        | 32 个 reps；2 位 reviewers；2 轮盲评 | 小型 internal reliability audit                            |
| Round B 人工 status  | 32/32 一致                           | 该 reviewer pair 内的一致性                                |
| Locked AI coverage   | 28/32                                | AI 可以分析大部分 formal items，并对协议未解决项目 abstain |
| AI-human comparable  | 25 条                                | Internal post-audit benchmark，不是 held-out validation    |
| Exact / within one   | 16/25 / 23/25                        | 初步有序评分一致性                                         |
| MAE / weighted kappa | 0.44 / 0.4917                        | 描述性 internal performance                                |

### 5.3 有序分数内部的定量信息

#### Deep Squat：深度与关节策略构成的连续谱，而不是简单配对

Deep Squat 是 score compression 最清晰的例子。获得相同人工分数的 reps，在由下蹲深度、膝髋屈曲、躯干角度和膝-足关系构成的描述性连续谱上处于不同位置。AI-FMS 并不据此创建新的诊断 subtype，而是让证据可见：一条 score-2 rep 可能通过更明显的躯干前倾接近目标深度，另一条则可能下蹲更浅，并采用不同的膝-髋贡献关系。未来更大规模的研究可以检验，这类 feature profiles 是否有助于 coaching explanation 或 longitudinal tracking。

**图 4.** 相同分数 Deep Squat repetitions 的动作策略连续谱。
`figures/figure-04-deep-squat-strategy-continuum.png`

#### ASLR：把双侧重复性作为 evidence-quality 问题

ASLR 具有明确侧别，视觉上看似简单，但 stationary leg、pelvis、camera framing 和 landmark quality 都会影响解释。左右侧的重复证据显示：active-leg height 在哪些位置相对稳定，以及哪些 side assignment 或 pose confidence 需要人工复核。这里的核心贡献不是判断某一种具体受限，而是保存双侧轨迹，并主动呈现低 confidence evidence，而不是把每次观察都缩成一个数字。

**图 5.** ASLR 双侧证据与重复性。
`figures/figure-05-aslr-bilateral-repeatability.png`

#### Hurdle Step：得到相同分数的多条动作路径

Hurdle Step 显示，相似 peak position 可以通过不同的时间路径达到。Full-trajectory evidence 可以分别呈现 ascent、clearance、stance control、return 和 balance events。因此，一条 rep 可以与另一条 rep 同分，但在动作何时开始失稳方面并不相同。这些是 descriptive movement pathways，不是医学上的 impairment categories。

**图 6.** Hurdle Step score-2 repetitions 的不同动作路径。
`figures/figure-06-hurdle-score2-pathways.png`

#### Rotary Stability：完整事件结构与合理 abstention

Rotary Stability 无法由单一 peak angle 可靠总结。它的协议依赖 pattern、side、sequence、contact、extension、balance 和 return。Event matrix 说明了为什么必须使用 full-cycle logic，以及当系统无法解析 pattern 时为何应当 abstain。它体现了参数提取之外的另一种价值：透明系统既能说明自己检测到了什么，也能说明这些证据为何仍不足以支持可信的总分建议。

**图 7.** Rotary Stability 完整周期 event matrix。
`figures/figure-07-rotary-cycle-event-matrix.png`

## 6. 开发过程中的 Human-AI Collaboration

本项目通过 domain-led human review 与 generative-AI-assisted engineering 的反复协作完成。Haoran ZHU 的 FMS 培训和持续评分实践塑造了 protocol logic、movement-specific evidence 和 acceptance criteria。人工 reviewers 定义 rep 何时可以评分，修正 camera 和 side metadata，识别 information leakage，审核每一条 formal item，并决定对外主张边界。

OpenAI Codex 协助进行 code exploration、implementation、tests、data reconciliation、statistical scripts、figure preparation、document drafting 和 release checks。这些帮助加快了迭代，但没有消除人工纠错的必要。3 个例子尤其重要：

1. 开发过程中产生的 legacy AI suggestions 不能被当作独立验证，因此与 formal evidence layer 分离。
2. Camera-view metadata 看似结构化，却有 45/110 条 canonical reps 需要修正，人工视觉审核仍不可替代。
3. Rotary Stability 不能通过增加一个方便的阈值负责任地完成；实现必须表达完整动作周期，并允许 abstention。

这些例子支持一个更广泛的设计结论：成功的 Human-AI Collaboration 不应由模型生成了多少内容来定义，而应由责任、证据、不确定性和纠错路径是否明确来定义。人类作者对本报告、参考文献、授权、计算和结论承担全部责任。

## 7. 讨论

AI-FMS 表明，在自动评分或临床级评分尚未成立之前，intelligent movement-review interface 仍然可以创造价值。系统让视频更易导航，把 repetitions 转换为 traceable records，保存定量证据，并为分歧与不确定性建立结构化位置。Reviewer 继续控制协议和最终解释。

内部 benchmark 值得肯定，但结论应保持克制。64% exact agreement 和 92% within-one agreement 表明 AI 经常接近人工 reference；与此同时，中等水平的 weighted kappa 和 movement-specific errors 也说明有序评分一致性尚未解决。报告 abstention 还改变了评估问题：不再只问“模型是否每次都输出一个数”，而是问“系统是否对审核做出了可辩护的贡献”。

进一步分析把项目价值扩展到分数复现之外。传统 FMS 评分把动作压缩为实用 screening label；pose evidence 可以保存 label 内部的连续差异，并用于解释、比较和 hypothesis generation。然而，观察到的 feature patterns 不应直接转换为诊断。一个动作策略可能有多种原因，二维视频也不能确认其背后的 pathology。

本项目还展示了 generative AI 在学生研究与工程开发中的一种积极使用方式。Codex 加速了重复性和技术性工作，但最重要的决定仍由人完成：解决什么问题、哪条协议重要、哪些证据受到污染、哪些输出具有误导性、哪些素材必须重新录制，以及现有数据不能支持什么主张。这种责任分配也是系统设计本身的一部分。

## 8. 局限性

第一，corpus 属于 convenience sample，规模较小、来源异质，而且不同动作、视频来源、camera views 和 protocol conditions 的分布不均。Repetitions 嵌套于视频和受试者之内，因此 rep-level count 不等于独立样本量。

第二，双 reviewer audit 只包含一组 reviewer pair，复评间隔也较短。较高的 exact agreement 还需要在更多 reviewers、更广泛经验水平、更长间隔和正式 adjudication procedure 中复验。

第三，最终 AI 在 Round A 之后经过改进。虽然在查看 Round B 结果前锁定规则保护了流程的一部分，但这 32 条 formal items 仍参与过开发。因此，报告结果是 internal post-audit benchmark，不是 held-out validation。

第四，Round B 保持完全盲法。这保护了人工 reference，但也意味着本研究没有测试显示 AI evidence 是否会改变审核时间、confidence 或 accuracy。未来的 assistance study 应预先定义结果指标，并随机分配是否可以看到 AI evidence。

第五，二维 pose landmarks 会受到 perspective、self-occlusion、clothing、lighting、framing 和 model uncertainty 的影响。Relative features 能减轻但不能消除这些问题，相关数值不能被解释为实验室级三维 biomechanics。

第六，一部分 protocol information 无法从图像推断。Pain、clearing-test outcomes、staging、equipment conditions 和部分 contact events 都需要人工明确确认。

最后，当前 dataset 和 private database 无法完整公开，因为分析访问权不等于发布权，reviewer records 也可能包含敏感信息。Public replication materials 必须使用已获得公开许可的样本，或新采集并取得同意的数据。

## 9. 伦理、隐私与负责任使用

AI-FMS 面向 movement screening、教育、研究 workflow 和 reviewer assistance。它不应被用于诊断疾病、从外观推断疼痛、预测伤病、决定参与资格，或替代合格专业人员。用户应获得与录制、分析、保存和公开相匹配的同意；尽量减少 identifiers；保护 raw media 和 reviewer records；并定义 retention 和 deletion procedures。

界面应说明每条 suggestion 的来源，区分 measured evidence 与 inferred conclusion，并明确显示 abstention。公开演示应只使用 permission-cleared media，且不得暴露 filenames、local paths、authentication data 或 proprietary course content。

## 10. 下一步工作

下一阶段研究应优先完成：

1. 前瞻性定义、使用新采集并获得公开许可视频的 held-out set；
2. 纳入训练水平不同的多位 reviewers，并延长 retest interval；
3. 随机比较可以与不可以看到 AI evidence 的审核研究；
4. movement-specific calibration 和 confidence intervals；
5. camera protocol 标准化和 automated metadata validation；
6. 与 expert adjudication 比较的 external evaluation；
7. 检验连续 features 是否稳定且有用的 longitudinal analysis；
8. privacy-preserving public demo 和 replication materials。

## 11. 结论

AI-FMS 的开发目的是支持人类完成 FMS 视频审核，并保存有序评分必然压缩掉的 movement evidence。最终平台覆盖全部 7 个动作，结合 segmentation、playback、pose-based quantities、可解释 first-pass suggestions、quality gates、abstention、independent review、adjudication 和 traceable export。针对 4 个动作的 Phase I 建立了可运行的 corpus 和 study workflow，观察到一组 reviewer pair 内部的较高一致性，以及具有潜力但仍不完整的 AI-human alignment。因此，项目的主要结果既不是 autonomous scoring，也不是 clinical claim，而是一种可实践、可检查的人机协作模式：自动化负责组织和定量化证据，reviewer 负责协议、不确定性与最终判断。

## 数据与代码可用性

源代码和项目文档可通过 https://github.com/edwardzhu-HK/AI-FMS 公开访问。本次发布不包含托管的在线交互演示。由于不同来源的同意和发布权不同，private Phase I corpus、raw video、pose records、reviewer event logs、comments 和 SQLite database 不公开。Aggregate analysis outputs 和 permission-cleared figures 随本 preprint 提供。

## 作者贡献

**Haoran ZHU：** Conceptualization；domain protocol；investigation；software testing；human review；validation；visualization review；writing - original draft；writing - review and editing。

## Generative AI 使用披露

在人工指导下，本项目使用 OpenAI Codex 协助 code exploration、implementation、test generation、data reconciliation、statistical scripting、figure preparation、document structuring、language editing 和部分 manuscript drafting。人类作者定义研究问题与 FMS protocol，审核 source evidence，执行并审计人工评分，修正模型与 metadata 错误，核对数值结果和参考文献，确定 limitations 和 claims，并批准最终文本。人类作者对本工作的原创性、准确性、授权和完整性承担全部责任。

## 利益冲突

作者声明不存在利益冲突。

## 资金支持

本研究未获得外部资金支持。

## 参考文献

1. Cuchna JW, Hoch MC, Hoch JM. The interrater and intrarater reliability of the Functional Movement Screen: A systematic review with meta-analysis. _Physical Therapy in Sport_. 2016;19:57-65. https://doi.org/10.1016/j.ptsp.2015.12.002
2. Bonazza NA, Smuin D, Onks CA, Silvis ML, Dhawan A. Reliability, validity, and injury predictive value of the Functional Movement Screen: A systematic review and meta-analysis. _American Journal of Sports Medicine_. 2017;45(3):725-732. https://doi.org/10.1177/0363546516641937
3. Moran RW, Schneiders AG, Mason J, Sullivan SJ. Do Functional Movement Screen composite scores predict subsequent injury? A systematic review with meta-analysis. _British Journal of Sports Medicine_. 2017;51(23):1661-1669. https://doi.org/10.1136/bjsports-2016-096938
4. Bazarevsky V, Grishchenko I, Raveendran K, Zhu T, Zhang F, Grundmann M. BlazePose: On-device real-time body pose tracking. _arXiv_. 2020. https://doi.org/10.48550/arXiv.2006.10204
5. Colyer SL, Evans M, Cosker DP, Salo AIT. A review of the evolution of vision-based motion analysis and the integration of advanced computer vision methods towards developing a markerless system. _Sports Medicine - Open_. 2018;4:24. https://doi.org/10.1186/s40798-018-0139-y
6. Kidzinski L, Yang B, Hicks JL, Rajagopal A, Delp SL, Schwartz MH. Deep neural networks enable quantitative movement analysis using single-camera videos. _Nature Communications_. 2020;11:4054. https://doi.org/10.1038/s41467-020-17807-z
7. Pagnon D, Kim H. Sports2D: Compute 2D human pose and angles from a video or a webcam. _Journal of Open Source Software_. 2024;9(101):6849. https://doi.org/10.21105/joss.06849
8. Amershi S, Weld D, Vorvoreanu M, et al. Guidelines for human-AI interaction. In: _Proceedings of the 2019 CHI Conference on Human Factors in Computing Systems_. ACM; 2019:1-13. https://doi.org/10.1145/3290605.3300233
9. Cohen J. Weighted kappa: Nominal scale agreement with provision for scaled disagreement or partial credit. _Psychological Bulletin_. 1968;70(4):213-220. https://doi.org/10.1037/h0026256
