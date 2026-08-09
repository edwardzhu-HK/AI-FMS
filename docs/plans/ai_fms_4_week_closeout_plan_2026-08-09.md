# AI-FMS 四周阶段收尾与申请输出计划

## 文档控制

| 字段     | 当前值                         |
| -------- | ------------------------------ |
| 文档状态 | ACTIVE - Canonical Plan        |
| 版本     | v1.10                          |
| 执行周期 | 2026-08-09 至 2026-09-06       |
| 硬截止   | 2026-09-06                     |
| 最近更新 | 2026-08-09                     |
| 执行清单 | `docs/backlog.md` 的 P8        |
| 数据证据 | `research/pilot-v1/generated/` |

本文件是四周收尾工作的唯一正式计划。Downloads 中的早期草案只作历史参考，
不再单独维护。产品长期范围仍由 `docs/specs/v1_5_scope_and_roadmap.md`
管理；逐项执行状态由 `docs/backlog.md` 管理。

状态标记：

- `[x]`：已完成，并有代码、数据、测试、报告或 commit 证据。
- `[ ]`：尚未完成。
- `IN PROGRESS`：当前正在执行的验收门。
- `BLOCKED`：存在明确阻断项，必须同时记录原因和解除条件。

## 1. 项目定位

AI-FMS 是一个 AI-assisted、human-in-the-loop 的 FMS 视频标注、定量动作特征和审核平台。它帮助 reviewer：

- 对视频中的动作 rep 进行分段和可追踪评分；
- 检查 pose-based quantitative features；
- 比较独立人工评分与 AI evidence；
- 分析相同 FMS RAW SCORE 背后的不同 movement-quality profiles；
- 生成可复现的研究数据和申请输出。

项目不替代认证 FMS 专业人员，不进行医疗诊断、伤病预测或功能障碍确诊。

核心叙事：

> FMS score 表示动作是否达到规则要求；AI-FMS 进一步描述动作是如何完成的，并帮助审核者识别同一分数背后的不同 movement profiles。

## 2. 四周完成定义

到 2026-09-06，计划形成一个可以演示、复现、审阅和用于大学申请叙事的 Phase I 版本：

1. Ronnie 分支中有价值的实现被干净整合，主质量门通过。
2. 四动作、28 个唯一视频、110 个 rep 形成可追溯的 canonical pilot。
3. 视频、pose、review、feature 和 AI suggestion 具有稳定 ID、版本和 lineage。
4. AI 定量特征不从文件名、notes 或人工分数中读取答案。
5. Study Mode 支持独立 blind review、AI-assisted second round 和完整 event log。
6. 正式 study 样本量经过 G2 决策门确认，不以早期草案数字代替实际 QA。
7. 所有分析表格和图能够从冻结数据通过脚本重新生成。
8. 技术报告、中文摘要、dataset card、README、项目页和演示视频完成。
9. 公开包不包含绝对本地路径、个人敏感信息、无授权视频或诊断性表述。

生产数据库不是本轮收尾的硬依赖。Canonical JSON/CSV、schema、manifest、
checksum 和可复现脚本仍是 Phase I 冻结证据；完整 review export 另写入被 Git
忽略的本地 SQLite 研究数据库，便于可靠查询与后续分析。部署型多用户数据库列入后续工程路线。

## 3. 当前状态

### 3.1 Gate 状态

| Gate                            | 状态        | 当前结论                                                        |
| ------------------------------- | ----------- | --------------------------------------------------------------- |
| G1 数据可信基线                 | COMPLETE    | 分支整合、去泄漏、canonical 数据和 29/29 pose 已完成            |
| G2A Study Mode 基础             | COMPLETE    | 正式 manifest 队列、盲法字段隔离、append-only events 和本地续做 |
| G2B Blindability 与正式样本冻结 | COMPLETE    | 97/110 可盲审、66/110 feature-ready；正式 32 例均通过双门槛     |
| G2C 双轮独立审核                | IN PROGRESS | Round A 双 reviewer 已完成并分析；等待间隔后进入 Round B        |
| G3 定量研究与结果冻结           | IN PROGRESS | 110/66 full-pool 与 32/26 gold 分层已建立；最终冻结仍等 Round B |
| G4 报告与申请发布包             | PENDING     | 等 G3 结果冻结                                                  |

### 3.2 已验证基线

- [x] 建立 `codex/application-closeout-v1` 整合分支。
- [x] 选择性纳入 Ronnie 改动，不纳入大体积 pose backup 和错误删除。
- [x] 删除从文件名、notes 或人工参考分数推导 AI 分数的路径。
- [x] 修复 real API/stub 的关键 persistence 和 round-trip 问题。
- [x] 从 28 个 history 文件构建 29 个 ingest、28 个视频和 110 个 rep。
- [x] 生成稳定 video、ingest 和 repetition ID，并检测内容冲突。
- [x] 解析 29/29 视频资产和 29/29 MediaPipe pose 资产。
- [x] 对多人 Hurdle Step 构图完成 visual subject QA 和 inference ROI。
- [x] 将 92 个 legacy numeric AI suggestions 标记为 label-leakage-ineligible。
- [x] 生成 canonical JSON、CSV、JSON Schema、data dictionary、QA 和 checksums。
- [x] 完成 Study Mode V1 和桌面、手机真实浏览器检查。
- [x] 完成 28 个源视频、110 个 rep 的 blindability contact-sheet QA。
- [x] 将 13 个存在评分字幕、直接分数提示或构图不足的 rep 排除，97 个通过。
- [x] 冻结四动作各 8 个的 Core study N=32，并锁定 pool fingerprint 和 rep ID。
- [x] 生成 110-rep quantitative feature matrix：66 ready、44 limited。
- [x] 正式 32 例全部同时满足 blindability eligible 和 feature ready。
- [x] 为 21 个入选源视频生成匿名媒体别名，Reviewer manifest 不含源文件名和历史标签。
- [x] 完成 4 例隔离 Dry Run；保存/刷新恢复不污染正式 review events。
- [x] 锁定 Review Event/Export V2、round 隔离、前台计时和 32/32 validator。
- [x] 建立 JSON 与 SHA-256 成对导出及中文 Round A reviewer protocol。
- [x] 明确 `0=已观察或报告疼痛`，并为无法独立评分建立终态、原因和分析排除规则。
- [x] 建立 checksum 校验、不可变 event 和幂等导入的本地 SQLite 研究数据库。
- [x] Ronnie Round A 完成：32 reviewed、27 scored、5 unscorable，46 个累计 event 已入库。
- [x] Other Reviewer Round A 完成：32 reviewed、26 scored、6 unscorable，32 个 event 已入库。
- [x] 两份 Round A 导出均通过 SHA-256、manifest 和 schema 校验；数据库共保存 78 个 event。
- [x] 生成 Round A agreement package：outcome agreement 31/32，jointly scored RAW SCORE agreement 26/26。
- [x] 将 26 条双方同分 rep 关联到 quantitative feature matrix；全部 feature-ready，覆盖 16 个源视频。
- [x] 生成 Round A movement-profile 数据表、描述统计、7 组同分异质性候选、中文报告和 checksums。
- [x] 建立 110/66/58/32/26 evidence tiers，确保完整 pilot pool 不被缩减为 gold subset。
- [x] 将 110 条 canonical repetitions 和 110 条 quantitative feature rows 幂等镜像至本地 SQLite。
- [x] 生成 110-rep tier table、66-rep label-free feature summary、28-video summary、中文报告和 checksums。
- [x] 对 66 条 feature-ready rep 完成 label-free robust-z、deterministic k-medoids、source-video effect 和 leave-one-video-out stability 分析。
- [x] 在冻结 label-free groups 后 post-hoc 叠加 26 条 Round A gold consensus，并生成视频/时间段复核队列。
- [x] 初步发现：3/7 个 action-score strata 跨 group，但均受 singleton、来源效应或独立视频不足限制；当前结论是同分内存在连续多维异质性，不是已验证的障碍亚型。
- [x] 完成首个 Hurdle Step 同机位、跨视频、同为 2 分的人工 case review；支持“同一规则失败内的连续程度/参数组合差异”。
- [x] 通过 lint、format、294/294 tests 和三页面 production build。

对应检查点 commits：

- `4a7f1c6`：G1 数据基线和 Study Mode V1。
- `faff513`：第二 reviewer 身份改为 `Other Reviewer`。
- `fb2decd`：PR #1 合并 application closeout、G2B 和正式 study 基线。

## 4. 正式 Study 样本量决策门

### 4.1 数据池与正式样本的区别

- `110 rep`：完整 canonical research pool，用于资产 QA、feature extraction 和描述性统计。
- `formal study N`：从可盲审样本中冻结的双轮人工实验样本。
- 正式样本不必等于 110，也不预先锁死为 32 或 64。

### 4.2 候选规模

| 层级              |  建议规模 | 最少最终状态数 | 适用条件                             |
| ----------------- | --------: | -------------: | ------------------------------------ |
| 最低可接受        |    24 rep |      96 events | 每动作至少 6 个，时间明显受限        |
| Core              |    32 rep |     128 events | 每动作约 8 个，平衡质量与工作量      |
| Expanded          |    64 rep |     256 events | 盲审样本充足，两位 reviewer 时间允许 |
| Full eligible set | QA 后决定 | `4 x N` events | 仅在样本独立性和工作量都合理时使用   |

最少最终状态数公式：`2 reviewers x N reps x 2 rounds = 4N`。实际
append-only event 总数会因 reviewer 修改和 supersession 而高于 `4N`。

### 4.3 当前冻结决定

正式 study 采用 **Core N=32**，四动作各 8 个，双轮设计至少形成 128 个最终
review 状态。入选 rep 来自 21 个源视频：Deep Squat 8 个、Hurdle Step 7 个、
ASLR 4 个、Rotary Stability 2 个。选择器先要求 blindability eligible 和
feature ready，再优先覆盖源视频和历史 score bucket；历史标签只存在于
internal manifest，不进入 Reviewer manifest。

冻结证据：

- 选择策略：`research/pilot-v1/formal-study-selection.json`
- Reviewer manifest：`research/pilot-v1/generated/formal-study-manifest.json`
- Internal lineage：`research/pilot-v1/generated/formal-study-internal-manifest.json`
- Checksums：`research/pilot-v1/generated/formal-study-SHA256SUMS`
- Pool fingerprint：`931bbc428b7190117ccea69bd885e92e12bb5888d3da94771269c0292379bc8f`
- Feature matrix fingerprint：`1c8953cede2dd19af6510d5acb2004948a87c9971207c46e5f8d1dc88d152097`

### 4.4 冻结标准

G2B 完成时，根据以下证据确定正式样本量：

1. 每个 rep 是否存在画面、字幕、标题卡或音频分数线索。
2. 目标人物是否明确，是否需要 crop 或排除。
3. 片段是否包含完整动作和回位，边界是否可评分。
4. 四动作是否尽量平衡，并覆盖不同历史分数、视角和质量。
5. 是否避免由少数长视频贡献过多高度相关的 rep。
6. 两名 reviewer 完成两轮所需的实际时间。
7. 是否足以支持预定的描述性指标和 case studies。

样本量决定必须写入本文件的“决策记录”，并生成冻结的 blinded study manifest。正式审核开始后，不因结果好坏任意更换样本。

## 5. 四周执行计划

### G1：整合、资产和 canonical 数据

目标窗口：Week 1

- [x] 干净整合 Ronnie 分支的有效实现。
- [x] 修复 score hint 标签泄漏和评分摘要风险。
- [x] 修复 Deep Squat protocol metadata 和 persistence 状态。
- [x] 建立 action-aware asset manifest。
- [x] 重新生成缺失 pose，并记录模型、ROI、时间范围和质量。
- [x] 构建 canonical dataset、schema、data dictionary 和 QA report。
- [x] 划分 private research artifacts 与 public application outputs。
- [x] 通过完整质量门。

G1 验收证据：

- 29/29 引用视频找到。
- 29/29 引用 pose 找到。
- 110 个 rep 无全局 ID 冲突和未解释重复。
- Legacy AI 结果全部排除于 accuracy analysis。
- 254/254 tests 通过。

### G2：Movement Profile 与双轮 Study

目标窗口：Week 1-2

#### G2A Study Mode Foundation

- [x] Reviewer 选择：`Ronnie` 与 `Other Reviewer`。
- [x] Reviewer 数据分离和 deterministic randomized queue。
- [x] Round A 界面隐藏文件名、历史分数、AI suggestion 和 notes。
- [x] 视频静音、rep loop、前后导航和进度显示。
- [x] FMS RAW SCORE、confidence、camera view、side、QA flags 和 note。
- [x] Append-only review events、superseding event 和 local resume。
- [x] JSON review export。
- [x] 桌面和手机浏览器检查。

#### G2B Blindability、Feature Contract 与样本冻结

- [x] 检查全部候选视频的画面、字幕、标题卡和可见分数线索。
- [x] 检查目标人物、动作完整性和 rep 时间边界。
- [x] 为每个候选 rep 写入 blindability 和 exclusion reason。
- [x] 定义四动作统一 feature contract：算法版本、单位、方向和质量字段。
- [x] 生成 110-rep quantitative feature matrix。
- [x] 根据第 4 节规则决定正式 study N。
- [x] 生成冻结的 blinded study manifest 和 checksum。
- [x] 用非正式样本完成 dry run，不污染正式 review events。

#### G2C Round A 与 Round B

Round A：

- [x] 锁定 `round_a` 随机队列、独立浏览器 namespace 和 V2 event schema。
- [x] 记录 score、confidence、reason/notes、QA flags 和前台 review time。
- [x] 建立 partial/complete 状态、JSON + SHA-256 导出和 CLI validator。
- [x] 建立 `unscorable` 终态；它计入完成度但不进入分数分析。
- [x] 将验证通过的完整导出幂等写入本地 SQLite 研究数据库。
- [x] Ronnie 独立完成正式样本盲评：32 reviewed、27 scored、5 unscorable。
- [x] Other Reviewer 独立完成正式样本盲评：32 reviewed、26 scored、6 unscorable。
- [x] Round A 页面不显示参考标签、AI evidence 或另一位 reviewer 的结果。
- [x] 生成 reviewer comparison、confusion matrix、weighted kappa 和 adjudication queue。

Round B：

- [ ] 两轮之间保留合理间隔，并重新随机样本顺序。
- [ ] 展示 pose-derived quantitative evidence 和质量提示。
- [ ] 不显示历史教练分数、参考标签或另一位 reviewer 的结果。
- [ ] 记录改分、confidence delta、evidence usefulness、原因和用时。
- [ ] Rotary Stability 保持 feature-only，不显示未经验证的 AI RAW SCORE。

G2 验收证据：

- 正式样本均能加载、循环、保存、刷新恢复和导出。
- Round A 不暴露任何已知人工或 AI 答案。
- Round B 每个数值可追溯到 pose、算法版本和质量标志。
- 两位 reviewer 的完整 event log 均通过 checksum、manifest 和 schema 校验并入库。
- Round A outcome agreement 为 31/32；共同评分的 26 条 RAW SCORE agreement
  为 26/26，linear 与 quadratic weighted kappa 均为 1.0000。
- 1 条 scoreability mismatch 与 3 条 reason taxonomy mismatch 保留在私有
  adjudication queue，不静默改写 reviewer 原始记录。

### G3：分析、Case Studies 与结果冻结

目标窗口：Week 3

- [ ] 冻结 canonical snapshot、study manifest、pose、feature 和 rule version。
- [x] 计算 Round A raw agreement、weighted Cohen's kappa 和 confusion matrix。
- [ ] Round B 完成后计算 Round B agreement 及 Round A/B change metrics。
- [ ] 计算 score-change rate、confidence delta 和 review-time delta。
- [ ] 分析每个动作的分歧率、常见理由和 pose-quality 影响。
- [x] 完成 Round A 26 条 consensus rep 的 quantitative profile 异质性分析。
- [x] 使用全部 110 条进行 evidence-tier/quality 分析，并使用全部 66 条 feature-ready rep 生成 label-free feature distribution。
- [x] 对 66 条 feature-ready rep 完成无标签分组、来源效应和留一来源稳定性分析。
- [x] 分组冻结后叠加 Round A score，输出 7 个 action-score strata 和优先视频复核队列。
- [ ] 使用新 pose-derived 输出比较 AI evidence 与人工 consensus。
- [x] 旧 AI 字段不进入 accuracy、agreement、profile distance 或 validation。
- [x] 生成 7 组可审阅 case-study candidates；正式选定 4-6 组仍需人工复核。
- [x] 通过脚本重新生成当前全部结果表、四动作 heatmap 和 SHA-256。
- [ ] 在 G3 结束时冻结主要数字和结论。

建议 case studies：

- Deep Squat：同分 case-pair 在同一主 group 内仍呈现连续参数差异。
- Hurdle Step：同为 2 分、同一对线失败家族内的连续参数差异，以及 stance-stability AI-human discrepancy。
- ASLR：历史高一致性为何不能解释为模型准确。
- Rotary Stability：为什么当前采取 feature-only 策略。

统计口径：

- 描述统计按动作、视频和 rep 分层报告。
- Feature 比较优先报告分布、effect size 和 bootstrap interval。
- 条件允许时以 video 为 bootstrap 单位，避免把同视频 rep 当成独立参与者。
- 聚类或 profile 分组只作 exploratory analysis，并报告样本数和稳定性限制。

### G4：报告、演示和申请发布包

目标窗口：Week 4

- [ ] 完成英文技术报告和中文执行摘要。
- [ ] 制作系统、数据 lineage、动作分布、study 结果和 profile 对比图。
- [ ] 更新 dataset card、README、方法和 limitations。
- [ ] 完成 3 分钟英文 demo video 和字幕。
- [ ] 完成 Ronnie 第一人称 contribution/learning statement。
- [ ] 完成项目页和申请用项目摘要。
- [ ] 生成 public/private manifests 和 checksums。
- [ ] 在干净环境重建代码、数据、分析和核心 demo。
- [ ] 完成绝对路径、PII、素材授权和夸大表述检查。
- [ ] 标记 release candidate，并保留最终缓冲时间。

建议英文报告标题：

`AI-FMS: From Ordinal Scores to Quantitative Movement Profiles in a Human-in-the-Loop Four-Movement Pilot`

## 6. 人员分工

### Codex

- 分支整合、缺陷修复、测试和质量门。
- Pose 重建、asset manifest、canonical dataset 和 feature extraction。
- Study Mode、review schema、分析脚本、图表和报告初稿。
- 每个验收门结束时更新本文件、backlog 和 evidence paths。

### Ronnie

- 确认历史评分 rubric、动作语境和 feature 解释。
- 独立完成 Round A 和 Round B。
- 对高分歧案例提供基于规则的理由，不事后迎合 AI。
- 完成第一人称贡献、学习和反思材料。
- 录制英文 demo narration 或出镜说明。

### Other Reviewer

- 独立完成 Round A 和 Round B，不查看 Ronnie 的当轮答案。
- 确认公开范围、研究限制和项目叙事。
- 参与选择最能说明“同分异型”的案例。

### 可选专业审核者

- 只在可获得时审核少量高分歧样本或未来研究 protocol。
- 不作为四周按期完成的硬依赖。

## 7. 研究问题与边界

Primary question：

> 在相同人工 FMS RAW SCORE 内，pose-derived quantitative features 是否能识别不同的 movement-quality profiles？

Secondary questions：

- 独立 reviewer 的 rep-level agreement 如何？
- AI evidence 是否改变评分、信心和审核时间？
- 哪些 feature 在不同分数之间具有方向一致、可解释的差异？
- 哪些同分 rep 呈现不同的深度、躯干控制、左右控制或稳定性模式？

不做的结论：

- 不从当前样本诊断疾病、功能障碍或未来伤病风险。
- 不声称模型达到临床或认证专家水平。
- 不把同一来源视频中的多个 rep 当作独立受试者。
- 不用旧 AI 字段计算 accuracy。
- 没有外部功能或临床标签时，只提出 compensation hypothesis，不声称机制验证。

## 8. 风险与降级规则

### Pose 或 Blindability 不足

- 优先保证正式 study sample 和 case studies 的证据完整。
- 不可靠样本保留 exclusion reason，不伪造或手填 keypoints。

### Reviewer 时间不足

- 使用断点续做，每次可分成 20-30 分钟 session。
- 按第 4 节从 Expanded 降为 Core 或最低可接受规模。
- 降级必须记录原因，并保持四动作最低覆盖。

### AI Evidence 不稳定

- 降级为 quantitative feature panel，不输出综合 AI RAW SCORE。
- 保留“辅助观察”定位，不声称验证评分准确率。

### 报告时间被工程挤压

- G3 结束时冻结主要功能、数据和结果。
- G4 不接受数据库、移动端、实时评分或新动作模型任务。

### 数据权利不清

- Private package 保留完整研究数据。
- Public package 只发布 schema、聚合统计、获授权案例和脱敏截图。

## 9. 明确不在四周范围内

- 生产级数据库和用户账户系统。
- 七个动作达到同等 AI 模型成熟度。
- 新 pose model 训练、YOLO Pose 或 MMPose 迁移。
- 实时手机评分、移动 App 和云端生产部署。
- 医疗诊断、损伤风险预测或治疗建议。
- 大样本临床验证和正式 peer-reviewed publication。
- 为了“看起来准确”而使用文件名、notes 或人工标签生成 AI 结果。

## 10. 维护规则

1. 不要求每天连续工作；只有实际状态变化时更新文档。
2. 每次工作结束时，若完成任务或出现阻断，更新 `docs/backlog.md`。
3. 每个 Gate 通过时，更新本文件的 Gate 状态、验收证据和变更记录。
4. 样本量、研究设计、截止时间或公开边界发生变化时，先写入“决策记录”。
5. 所有数字、图表和结论必须能指向冻结数据与生成脚本。
6. 已完成事实不静默改写；若结论变化，新增一条带日期的决策记录。
7. G3 结果冻结后，只允许修复阻断问题、文档和展示，不随意改变研究设计。

## 11. 决策记录

| 日期       | 决策                                                  | 原因                                                                      |
| ---------- | ----------------------------------------------------- | ------------------------------------------------------------------------- |
| 2026-08-09 | 四周硬截止为 2026-09-06                               | 保证申请输出有明确结束点                                                  |
| 2026-08-09 | 110 rep 作为完整数据池，正式 study N 在 G2B 决定      | 样本量应服从 blindability、动作平衡和审核工作量                           |
| 2026-08-09 | Legacy AI suggestions 不进入准确率分析                | 已确认存在 score hint 标签泄漏                                            |
| 2026-08-09 | Rotary Stability 保持 feature-only                    | 当前证据不足以支持可信 AI RAW SCORE                                       |
| 2026-08-09 | 第二 reviewer 在 UI 中使用 `Other Reviewer`           | 保持研究界面角色通用，不绑定个人姓名                                      |
| 2026-08-09 | 本文件为唯一 canonical 四周计划                       | 避免 Downloads 草案与仓库执行版并行分叉                                   |
| 2026-08-09 | 正式 study 冻结为 Core N=32，四动作各 8 个            | 97 个通过盲法 QA；兼顾动作平衡、源视频分散与 128 次审核工作量             |
| 2026-08-09 | 正式 32 例必须同时 feature-ready                      | Round B 需要每例都有可追溯 quantitative evidence；正式审核尚未开始        |
| 2026-08-09 | Round A/B 使用独立 namespace 和显式 `studyRound`      | 避免后续事件覆盖或仅凭时间推断轮次                                        |
| 2026-08-09 | Round A 与 Round B 间隔至少 48–72 小时                | 降低短期记忆对第二轮评分的影响                                            |
| 2026-08-09 | `0` 仅表示已观察或报告疼痛；条件不足记为 `unscorable` | 防止把 protocol 缺失误写成 FMS 分数并污染分析                             |
| 2026-08-09 | 完整签名导出进入本地 SQLite 研究数据库                | 保留冻结 JSON 证据，同时提供幂等、不可变和可查询的分析入口                |
| 2026-08-09 | Kappa 仅使用双方都给出 RAW SCORE 的 rep               | `unscorable` 不是数值分数；可评分性和原因一致率必须单独报告               |
| 2026-08-09 | G3 可先使用 Round A consensus 启动                    | 分析输入与 Round B 隔离；先推进 profile 与 case selection 不影响复测      |
| 2026-08-09 | 110/66 full pool 与 32/26 gold subset 分层报告        | 既充分利用既有工作，又不把 weak labels 误写成经过验证的 gold labels       |
| 2026-08-09 | Formal 32 不表述为对 110 的 simple random proof       | 样本来自 58 条双门槛候选的 deterministic balanced selection               |
| 2026-08-09 | Profile discovery 先无标签冻结、再叠加 Round A 分数   | 防止人工分数反向塑造分组；post-hoc overlay 只用于解释                     |
| 2026-08-09 | 采集优先级按独立源视频而不是 rep 数                   | ASLR/Deep Squat 显示明显 source-video signature，同视频重复不等于独立证据 |

## 12. 变更记录

### v1.10 - 2026-08-09

- 对最高优先级 Hurdle Step outlier 进行源视频 contact-sheet、Round A comment 和
  feature cross-check。
- 改用另一条 front/right、不同源视频、同为 Round A 2 分的 rep 作为主要对照，
  避免把 front/side feature availability 差异误写成动作 profile。
- 两条 rep 的人工规则失败家族相近，但 outlier 的 stance ankle drift、step-knee
  line offset 和 hip-height gap 分别约为对照的 4.6、4.7 和 3.0 倍。
- 将核心发现收紧为“同一 ordinal score 内的连续多维异质性”；保留 AI 对支撑腿
  稳定性的判断与人工评论不一致，列为 feature audit 项。
- 新增 `docs/research/hurdle_step_same_score_case_review_2026-08-09.md`。

### v1.9 - 2026-08-09

- 新增 66-rep label-free profile discovery：movement-only robust z-score、
  deterministic k-medoids、silhouette、source-video distance ratio 和
  leave-one-video-out stability。
- 生成四动作热图、assignments/groups/outliers/source-effects 表、中文报告、
  review queue 和 SHA-256；所有结果均可由单一命令重建。
- 分组冻结后才 post-hoc 叠加 26 条 Round A gold consensus；7 个 action-score
  strata 中 3 个跨 group，但没有一个足以命名为稳定功能障碍亚型。
- Deep Squat 的同分差异更接近主 group 内的连续参数变化；Hurdle 的跨组结果由
  单个高杠杆 outlier 驱动；Rotary 只有 2 个独立源视频。
- 下一步先人工复核优先案例，再按独立来源和动作缺口决定定向补采。

### v1.8 - 2026-08-09

- 明确完整研究规模为 110-rep pilot pool、66-rep feature-ready quantitative
  pool、32-rep formal audit sample 和 26-rep Round A gold consensus subset。
- 新增 full-pool utilization CLI、六层 evidence tier、66-rep label-free feature
  summary、source-video summary、中文报告和 checksums。
- 将 110 repetitions 与 110 feature/quality rows 幂等写入现有 SQLite，保留原有
  reviewer exports/events，canonical 文件继续作为 source of truth。
- 定向采集仍未冻结：Deep Squat 优先利用现有候选，ASLR/Hurdle 优先修 timing，
  Rotary 优先修 pose，残余缺口才进入采集计划。

### v1.7 - 2026-08-09

- G3 转为 IN PROGRESS，不等待 Round B 即启动 Round A exploratory analysis。
- 26 条双方同分 rep 全部成功连接至 feature matrix，覆盖 16 个源视频且全部 feature-ready。
- 新增 checksum-verified movement-profile CLI、consensus CSV、feature summary、
  7 组 case-study candidates、中文报告和 checksums。
- 明确 Deep Squat 与 Rotary Stability 的跨分数比较受源视频混杂，只作探索性描述。

### v1.6 - 2026-08-09

- Other Reviewer Round A 完成并入库：32 reviewed、26 scored、6 unscorable。
- 两位 reviewer 共形成 64 个最终状态和 78 个 append-only events。
- Round A outcome agreement 为 31/32；共同评分 26 条全部同分，weighted
  kappa 为 1.0000；另保留 1 条可评分性分歧和 3 条原因分类分歧。
- 新增可重复 agreement CLI、comparison CSV、adjudication queue、报告和 checksums。
- G2C 保持 IN PROGRESS，执行 48–72 小时间隔后再开始 Round B。

### v1.5 - 2026-08-09

- 新增无法独立评分终态、原因字段、score-0 疼痛确认和完成度/分析数分离。
- Ronnie Round A 完成 32/32：27 scored、5 unscorable、46 个累计 event。
- 最终 JSON/SHA-256 已通过 manifest validator 并幂等写入本地 SQLite。
- G2C 保持 IN PROGRESS，下一项是 Other Reviewer 独立完成 Round A。

### v1.4 - 2026-08-09

- 将 G2C 标记为 IN PROGRESS，先完成正式评分前的数据协议封口。
- 升级 Review Event/Export V2，保存 `studyRound`、前台 review time 和 supersession lineage。
- Round A/B/Dry Run 使用不同随机种子和 localStorage namespace。
- 增加 32/32 completion gate、JSON + SHA-256 成对导出和 CLI validator。
- 新增中文 Round A reviewer protocol；正式 reviewer 评分仍未开始。

### v1.3 - 2026-08-09

- 定义四动作 feature contract，并生成 110-rep feature matrix。
- 记录 66 ready、44 limited；Hurdle 和 Rotary 限制保留为质量结果。
- 将正式选择升级为 blindability + feature-readiness 双门槛，冻结 32/32 ready。
- 建立 4 例 Dry Run、`Test Reviewer` 和独立事件 namespace。
- G2B 标记 COMPLETE，G2C Round A 成为下一执行项。

### v1.2 - 2026-08-09

- 完成 110-rep blindability QA：97 eligible、13 excluded、0 pending。
- 区分直接分数提示、评分教学字幕和仅动作名称三类视觉线索。
- 冻结 Core N=32、32 个 rep ID 和 pool fingerprint。
- Study Mode 改读 Reviewer-safe manifest 和匿名媒体路径。
- 保持 G2B 为 IN PROGRESS，等待 feature contract、feature matrix 和 dry run。

### v1.1 - 2026-08-09

- 合并 Downloads 详细草案与仓库精简执行版。
- 用 G1 实际结果替换旧的 22/29 pose 缺口状态。
- 将样本量从固定 32 调整为 G2B 决策门。
- 加入 Gate 状态、文档控制、决策记录和维护规则。
- 记录 Study Mode V1、254 tests 和当前 commits。

### v1.0 - 2026-08-09

- 建立四周收尾、独立审核、定量研究和申请输出框架。
