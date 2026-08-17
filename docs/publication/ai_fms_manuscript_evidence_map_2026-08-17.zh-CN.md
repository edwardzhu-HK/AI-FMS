# AI-FMS NHSJS 论文证据地图中文版

状态：INTERNAL WORKING OUTLINE - 不是投稿论文正文

英文原版：`ai_fms_manuscript_evidence_map_2026-08-17.md`

本文档把已经冻结的研究证据映射到 NHSJS Research Article 的结构中。在期刊的 AI-use
政策尚未确认前，本文档有意保持为证据与写作提纲，而不是润色后的投稿论文。

## 暂定标题

**AI-FMS: Development and Phase I Evaluation of an Explainable Human-in-the-Loop
System for Functional Movement Screen Video Review**

中文理解：

**AI-FMS：可解释的人机协同 Functional Movement Screen 视频审核系统开发与 Phase I
评估**

## 文章类型与核心问题

文章类型：Original Research Article；human-centered system development 与 formative
evaluation，并包含探索性 secondary analyses。

核心问题：

> 一套可解释的 human-in-the-loop 系统能否覆盖七动作、辅助人工 FMS 视频审核？四动作
> Phase I 和 secondary quantitative analyses 能够为流程可靠性、AI-human concordance
> 和信息保存提供哪些证据？

不得把这个问题描述为提前注册的验证性假设。四种动作特异性分析是在 Phase I 审计中
逐步完善的，属于探索性研究。

## NHSJS 结构映射

### 标题、作者与所属机构

- 目标第一作者：Ronnie，但需经过最终贡献与责任确认。
- 成人通信联系人：待确定。
- Other Reviewer：只有在满足作者资格时才列为作者；否则列入致谢或贡献说明。
- Codex/OpenAI：作为 AI-assisted tool 完整披露，不能列为作者。

### 摘要

目标：论文冻结后形成 200-250 个英文单词的摘要。

必须包含：

- 背景：人工 FMS 评分存在回放、远程复核、rep 定位、定量观察、上下文保存和追踪困难。
- 目的：开发覆盖七动作的 AI-assisted review system，并评估其内部工作流、人工一致性、
  AI-human concordance 和进一步科研价值。
- 方法：28 个视频、110 个 canonical repetitions、66 个 feature-ready repetitions、
  32 个平衡正式样本、两位 reviewer、两轮盲评、锁定 AI comparison，以及四种探索性
  分析方法。
- 结果：Round B 可评分性判断 32/32 一致；双方均可评分的 26 条为 26/26 exact；最终
  锁定 AI 对 28/32 给出分数；AI 与人工数值共识交集为 25 条，其中 16/25 exact、
  23/25 within one、MAE 0.44、linear weighted kappa 0.4917。
- 结论：七动作系统已完成主要功能，四动作 Phase I 提供了有边界的内部评估证据；定量
  信息恢复是 secondary research contribution，不是项目唯一目的。

### Introduction

证据与文献任务：

1. 定义 FMS 以及现场、远程和视频人工评分中的实际困难，但不无必要地复制受保护的评分
   材料。
2. 综述 FMS 的 interrater 与 intrarater reliability。
3. 区分 reliability、construct validity 和 injury prediction。
4. 综述运动与锻炼场景中的 markerless pose estimation。
5. 说明 2D pose 限制：camera view、遮挡、out-of-plane movement、主体选择和 landmark
   jitter。
6. 说明主要缺口：在本项目场景中，还缺少一套把七动作视频审核、回放、metadata、pose
   evidence、人工评分、AI suggestion、abstention 和 traceable export 连起来的系统。
7. 将 ordinal-score information recovery 作为系统完成后解锁的 secondary research
   opportunity。
8. 使用探索性研究目标，不把事后形成的问题包装成验证性假设。

需要人工阅读并核实的首批参考文献：

1. Cuchna JW, Hoch MC, Hoch JM. The interrater and intrarater reliability of the
   Functional Movement Screen: a systematic review with meta-analysis. Physical
   Therapy in Sport. 2016;19:57-65. DOI: 10.1016/j.ptsp.2015.12.002.
2. Bonazza NA, Smuin D, Onks CA, Silvis ML, Dhawan A. Reliability, validity, and
   injury predictive value of the Functional Movement Screen: a systematic
   review and meta-analysis. American Journal of Sports Medicine.
   2017;45(3):725-732. DOI: 10.1177/0363546516641937.
3. Morgan R, LeMire S, Knoll L, et al. The Functional Movement Screen: exploring
   interrater reliability between raters in the updated version. International
   Journal of Sports Physical Therapy. 2023;18(3):737-745. DOI:
   10.26603/001c.74724.
4. Bazarevsky V, Grishchenko I, Raveendran K, Zhu T, Zhang F, Grundmann M.
   BlazePose: on-device real-time body pose tracking. arXiv:2006.10204.
5. Colyer SL, Evans M, Cosker DP, Salo AIT. A review of the evolution of
   vision-based motion analysis and the integration of advanced computer vision
   methods towards developing a markerless system. Sports Medicine - Open.
   2018;4:24. DOI: 10.1186/s40798-018-0139-y.

在人类作者打开、阅读并确认文献及其与本研究的关系之前，任何引用都不能进入正式投稿包。

### Methods

#### Human-Centered 系统设计

- 人工评分问题与设计需求。
- 七动作产品能力表。
- Workbench、Study Mode、Video Manager、movement adapters、quality gates 与
  export/research architecture。

#### Phase I 研究设计

- 探索性观察型软件与数据 pilot。
- 产品 workflow 覆盖七动作；定量研究覆盖四动作。
- 没有前瞻性招募参与者，也没有收集临床结局。

#### Canonical Dataset

- 28 个唯一源视频。
- 重建 lineage 后有 29 个 ingests。
- 110 个 canonical repetitions。
- 稳定 ID 和 SHA-256 lineage。
- Repetitions 嵌套于源视频，不能称为 110 个 participants。

#### 质量门

- 97 个 blindable repetitions。
- 66 个通过 pose/timing 的 feature-ready repetitions。
- 58 个同时通过两道质量门。
- 正式样本：32 个 repetition，四动作各 8 个，来自 21 个源视频。
- 选择方式是 deterministic balanced selection，不是 simple random sampling。

#### 人工审核

- 两位 reviewer、两轮盲评。
- Round B 前间隔约 51 小时。
- 重新随机队列，并使用隔离的存储空间。
- 不显示文件名、历史标签、AI 分数、pose evidence、上一轮答案、另一 reviewer 答案或
  音频线索。
- `0` 只用于已观察或报告的 pain；协议证据不足记为 `unscorable`。

#### Pose 与定量特征

- 使用 MediaPipe Pose Landmarker。
- 使用动作特异性的 timing 与 feature adapters。
- 使用 2D normalized distances、angles、trajectories 和 cycle events。
- 包含 camera-audited feature sensitivity 与动作特异性质量门。

#### 锁定 AI 比较

- Suggestion 生成过程不读取文件名、notes、历史分数、reviewer comments 或 legacy AI
  labels。
- 最终规则在查看 Round B 结果前锁定。
- 开发发生在 Round A 之后，因此必须表述为 post-audit internal benchmark，而不是
  held-out validation。
- Coverage、abstention、exact agreement、within-one agreement、MAE 与 weighted
  kappa 分开报告。

#### 动作特异性分析

| 动作             | 研究问题                                 | 方法                                    | 分析单位              |
| ---------------- | ---------------------------------------- | --------------------------------------- | --------------------- |
| Deep Squat       | 深度是否决定完整动作策略？               | 侧视连续谱与 Spearman rank analysis     | 15 reps / 7 videos    |
| ASLR             | 相似结果在左右侧与重复动作中是否稳定？   | 同一来源 bilateral repeatability series | 4 good reps           |
| Hurdle Step      | 同为 2 分是否代表同一种 review pathway？ | 盲评 comments 主题编码与定量范围        | 5 reps / 5 videos     |
| Rotary Stability | 单一峰值帧能否代表复杂动作顺序？         | Full-cycle event matrix                 | 8 blind-reviewed reps |

### Results

#### 人工一致性

- Round A outcome agreement：31/32。
- Round A 双方均评分：26/26 exact。
- Round B outcome agreement：32/32。
- Round B 双方均评分：26/26 exact。
- Round B unscorable reason agreement：6/6。
- 两位 reviewer 从 Round A 到 Round B 各改变 1 条数值分，且为同一条 Hurdle Step。

#### AI-Human Internal Concordance

- 最终 AI 可给分：28/32。
- Abstained：4/32，为缺少所需 staged follow-up 的 Deep Squat floor attempts。
- 与 Round B 数值人工共识可比较：25 条。
- Exact：16/25。
- Within one：23/25。
- MAE：0.44。
- Linear weighted kappa：0.4917。

#### 定量发现

1. Deep Squat：深度、髋屈曲和膝屈曲形成较清晰的连续轴；踝、躯干与对线保存了部分
   相对独立的信息。
2. ASLR：在选定的 bilateral series 中，active height 的变化小于 stationary-ankle
   drift 和 pelvic-gap proxies 的变化。
3. Hurdle Step：五条盲评 2 分动作形成四种 review pathway：multi-domain control、
   distal alignment、return-phase alignment 和 dowel control。
4. Rotary Stability：cycle-level touch、extension、timing 与 return evidence 能够区分
   未完成周期和保守的分值边界案例。

#### 历史标签审计

- 两轮稳定数值共识：25 条。
- 与历史分数 exact：18 条 audited weak labels。
- 稳定不一致：6 条。
- 历史分数缺失：1 条。
- 不能声称 32-repetition audit 验证了全部 110 条历史标签。

### Discussion

必须保持的解释：

- 主要贡献是信息保存和可追踪性，不是 autonomous scorer。
- 不同动作的 FMS 顺序分数可能压缩不同类型的信息。
- Human reliability 和 AI-human concordance 回答不同问题。
- Abstention 是设计好的证据边界，不是需要隐藏的缺失分数。
- 两位 reviewer 的高一致性不等于 expert-panel 或 population validation。
- 四种分析都是探索性的，并受源视频数量限制。

### Limitations

- 28 个源视频，不是 110 个独立 participants。
- 没有人口统计、训练背景、临床结局或伤病结局。
- 只有两位 reviewer；当前数据没有 certified expert panel。
- 公开/教学视频来源选择及授权状况不一致。
- 2D pose 和 camera-view 限制。
- ASLR series 只有一个来源；正式 Rotary subset 只有两个来源；Hurdle 使用人工主题编码。
- Final AI 是 post-audit，不是 held-out。
- Round B 为完全盲评，因此不能检验 AI evidence 是否提高人工效率、信心或准确性。

### Acknowledgments 与 Disclosures

必须说明：

- 人类作者贡献。
- 成人 advisor 的角色。
- Other Reviewer 的角色及其是否满足作者资格。
- MediaPipe 模型和版本。
- OpenAI Codex 在软件、脚本、图表与内部文档中的使用。
- AI 不列为作者。
- 资金与利益冲突。
- Rights/privacy 与数据可用性边界。
- Ethics/SRC/IRB 判定，或期刊认可的不适用理由。

### References

目标：形成一份简洁、经过人工核实的参考文献表，覆盖 FMS reliability 与 validity、
video-based FMS scoring、markerless pose estimation、2D measurement limitations 和
responsible human-in-the-loop AI。

## 图表计划

NHSJS 要求 Research Article 至少有 5 个 figures 或 tables。拟提交组合：

1. Table 1：人工评分问题、系统功能和边界。
2. Figure 1：AI-FMS human-in-the-loop workflow 与 evidence lineage。
3. Table 2：七动作产品能力。
4. Figure 2：public-safe Workbench quantitative-evidence interface。
5. Table 3：Dataset tiers 与四动作 Phase I 样本分布。
6. Table 4：Round A/B human reliability 与 AI-human concordance。
7. Figures 3-6：四种动作特异性的 secondary analyses。

所有图必须适合公开、适合印刷阅读，不包含源文件名、本地路径、可识别人物画面或原始
reviewer comments。

## 不得进入论文的主张

- AI 提高了 reviewer 效率或信心。
- 模型已经获得临床验证或具备诊断准确率。
- AI 可以预测 pain、功能障碍或伤病风险。
- 七个动作具有相同的 validation maturity。
- 32-repetition subset 验证了全部 110 条历史标签。
- Repetitions 是相互独立的 participants。
- Final AI v1.1 是 held-out validation。
