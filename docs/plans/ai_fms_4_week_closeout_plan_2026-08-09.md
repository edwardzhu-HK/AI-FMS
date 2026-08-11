# AI-FMS 四周阶段收尾与申请输出计划

## 文档控制

| 字段     | 当前值                         |
| -------- | ------------------------------ |
| 文档状态 | ACTIVE - Canonical Plan        |
| 版本     | v1.26                          |
| 执行周期 | 2026-08-09 至 2026-09-06       |
| 硬截止   | 2026-09-06                     |
| 最近更新 | 2026-08-11                     |
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
5. Study Mode 支持两轮独立 blind review 和完整 event log；AI 另走隔离 benchmark。
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
| G2C 双轮独立审核                | COMPLETE    | Round A/B 均完成；四份签名导出已校验并入库                      |
| G3 定量研究与结果冻结           | COMPLETE    | 双轮人工、locked AI 和历史标签审计结果已冻结                    |
| G4 报告与申请发布包             | IN PROGRESS | 结果文档已更新；等待 demo 与公开素材 rights/privacy 审计        |

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
- [x] 完成 Hurdle Step 跨视频 2 分 pair 复核；机位审计后将其从“同机位证据”降级为 view-confounded 方法学案例。
- [x] 完成 Deep Squat 跨视频、同为垫板 2 分的 case review；人工深度判断与AI角度/深度参数方向一致，升级为首要说明案例。
- [x] 完成 110/110 rep camera-view contact-sheet 审计：65 条确认、45 条校正；Round A 29 条双人一致机位全部通过交叉检查。
- [x] 生成独立 camera-audited feature sensitivity matrix；66/44 readiness、profile groups、score strata、source effects 和 stability 状态均保持不变。
- [x] 对全部 110 条先独立生成 leakage-free AI evidence，再连接 26 条 Round A 共识；16 条可比较、9 条完全同分、14 条相差不超过 1 分。
- [x] 确认当前规则式 AI 总分不具备替代人工评分的证据；ASLR、Hurdle 和 Deep Squat 分别形成阈值、定性规则与 protocol metadata 复核队列。
- [x] 完成九条 AI 差异逐帧复核；定位 2 条 Deep Squat metadata 修正、2 条 ASLR pose/timing QA、4 条 Hurdle 动态证据缺口和 1 条 floor depth proxy 差异。
- [x] 保留 9/16 冻结基线，并单独生成 Deep Squat protocol-audited sensitivity：11/17 完全同分、15/17 相差不超过 1 分。
- [x] 完成全部 17 条 ASLR 记录的 label-free side/peak evidence audit；16 个独立窗口中 11 good、2 watch、3 limited，且不调评分阈值。
- [x] 对 3 个 ASLR limited 窗口完成 subject-aware ROI sensitivity：1 good、2 watch、0 limited；两条原 watch 完成人工视频 QA。
- [x] 选定 4 个申请案例：Deep Squat 主案例、ASLR 测量可靠性案例、Hurdle 方法案例和 Rotary 边界案例。
- [x] 从冻结数据生成 2 张无人物申请图，并通过 source fingerprint、SHA-256、XML 和真实浏览器排版检查。
- [x] 重写 Phase I 技术报告的双语摘要、背景动机、系统功能、七动作 Product Scope、四动作 Research Scope 与四层 AI-human 评测设计。
- [x] 建立与 Round B 隔离的 Rotary AI v1.1 experimental first-pass：使用完整周期
      pose evidence、updated FMS 规则和 abstain gate；criterion-specific visibility
      修正后正式 8 条均可评分，internal benchmark 为 6/8 exact、8/8 within one。
- [x] 将 Rotary 完整周期 first-pass 接入默认 Workbench；七动作统一显示
      pose-based AI suggestion，冻结研究 artifact 与 blind Study Mode 保持隔离。
- [x] 完成 8/8 Deep Squat floor/board protocol metadata 独立视觉审计；未读取人工分数，
      未根据审计结果移动 AI threshold。
- [x] 生成 label-free、checksum-protected final AI v1.1 package：32 条均被分析，
      28 条有 AI raw score，4 条 floor attempt 因缺少 staged follow-up 合理拒判。
- [x] Ronnie 与 Other Reviewer 完成 Round B 32/32；两份导出通过 SHA-256、schema、
      blind-state 校验并幂等写入本地 SQLite。
- [x] Round B status agreement 32/32；共同评分 26/26 exact，6/6 unscorable reason
      agreement，linear/quadratic weighted kappa 均为 1.0000。
- [x] 完成 Final AI v1.1 vs Round B internal benchmark：25 条可比较，16/25 exact、
      23/25 within one、MAE 0.44、linear weighted kappa 0.4917。
- [x] 完成历史标签审计：25 条稳定双轮共识中 18 条确认历史 weak label，6 条稳定
      不一致，1 条历史分数缺失；未将其余历史标签升级为 gold。
- [x] 通过 lint、format、340/340 tests 和三页面 production build。
- [x] 将 README、Phase I dataset card、methods/limitations/ethics、中文 technical report、application copy 和 claim-control evidence table 更新到当前四动作研究状态。
- [x] 建立 Phase I release-candidate spec 与生成器；17/17 研究/申请 artifacts 通过 SHA-256，11 份主文档进入 checksum manifest。

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

- [x] 两轮之间保留约 51 小时间隔，并重新随机样本顺序。
- [x] 仅显示匿名视频和人工评分表单；不显示 AI RAW SCORE、pose-derived
      parameters、质量提示或 evidence usefulness。
- [x] 不显示 Round A 答案、历史教练分数、参考标签或另一位 reviewer 结果。
- [x] 记录可计算 score change、confidence delta 和 review-time delta 的 blind events。
- [x] 校验器拒绝包含 `evidenceReview`、current pose evidence 或 current AI suggestion
      暴露的正式 Round B event。
- [x] 在人评前冻结 AI v1.0 rule fingerprint、source checksums 和 32-rep private
      benchmark manifest；该包仅在 Round B 签名导出后由分析脚本读取。
- [x] 在 Round B 人评结果产生前锁定 final AI v1.1 prediction package；生成器不载入
      human labels、reviewer exports 或 Study Mode state。
- [x] Ronnie 与 Other Reviewer 分别完成 32/32，并导出、校验、入库。

G2 验收证据：

- 正式样本均能加载、循环、保存、刷新恢复和导出。
- Round A 不暴露任何已知人工或 AI 答案。
- Round B 不暴露 AI/pose 数值或上轮结果；每个签名 event 均通过 blind-state 校验。
- 评后 AI 比较中的每个数值可追溯到 pose、算法版本和质量标志。
- 两位 reviewer 的完整 event log 均通过 checksum、manifest 和 schema 校验并入库。
- Round A outcome agreement 为 31/32；共同评分的 26 条 RAW SCORE agreement
  为 26/26，linear 与 quadratic weighted kappa 均为 1.0000。
- 1 条 scoreability mismatch 与 3 条 reason taxonomy mismatch 保留在私有
  adjudication queue，不静默改写 reviewer 原始记录。
- Round B outcome agreement 为 32/32；共同评分 26/26 exact，6/6 unscorable
  reason agreement，linear 与 quadratic weighted kappa 均为 1.0000。
- Round A 旧导出只通过两份 SHA-256 白名单的 legacy blind attestation 进入 closeout；
  不改写原始 reviewer JSON，未知 checksum fail closed。

### G3：分析、Case Studies 与结果冻结

目标窗口：Week 3

- [x] 冻结 canonical snapshot、study manifest、pose、feature 和 rule version。
- [x] 冻结评后使用的 AI v1.0 benchmark snapshot：32/32 有定量特征，
      18/32 有 AI RAW SCORE，8/32 Rotary feature-only，6/32 Deep Squat
      protocol-metadata-required；不对 reviewer 显示。
- [x] 计算 Round A raw agreement、weighted Cohen's kappa 和 confusion matrix。
- [x] 计算 Round B agreement 及 Round A/B change metrics。
- [x] 用人评前冻结的 AI v1.0 对同一 32 rep 计算 AI-vs-Round A
      consensus 与 AI-vs-Round B consensus；coverage 与 agreement 分开报告。
- [x] 建立 checksum-verified Round B closeout command，一次生成双 reviewer
      agreement、逐 reviewer A/B change、blind-exposure validation 与 frozen AI comparison。
- [x] 将 final AI v1.1 接入同一 closeout command；保留 v1.0 baseline 与 v1.1
      post-audit internal benchmark 两个独立版本和 fingerprint。
- [x] 计算 score-change rate、confidence delta 和 review-time delta；review time 只作
      描述，不作 AI 效率因果解释。
- [x] 分析每个动作的分歧率、unscorable reason 和 AI-vs-human 差异。
- [x] 完成 Round A 26 条 consensus rep 的 quantitative profile 异质性分析。
- [x] 使用全部 110 条进行 evidence-tier/quality 分析，并使用全部 66 条 feature-ready rep 生成 label-free feature distribution。
- [x] 对 66 条 feature-ready rep 完成无标签分组、来源效应和留一来源稳定性分析。
- [x] 分组冻结后叠加 Round A score，输出 7 个 action-score strata 和优先视频复核队列。
- [x] 审计全池历史 camera-view metadata，保留 original lineage，并生成可按 `repetitionId` 连接的 `auditedCameraView`。
- [x] 在不改变 Round A 冻结 fingerprint 的前提下重建 audited feature matrix，并验证既有 profile 结论的 camera-metadata 稳定性。
- [x] 使用 camera-audited pose-derived 输出比较 AI evidence 与人工 consensus；按 exploratory concordance 报告，不表述为模型准确率。
- [x] 复核 2 条 ASLR 大分差、4 条 Hurdle 分歧、1 条 Deep Squat 分数差异和 2 条 Deep Squat protocol metadata 缺口；本轮不调阈值。
- [x] 对全部 17 条 ASLR 记录运行不读取分数/文件名/reviewer 结果的 side/peak evidence gate；16 个独立窗口中 11 good、2 watch、3 limited。
- [x] 对 3 个 ASLR `limited` 窗口做 subject-aware pose re-extraction，并人工复核 2 个 `watch` 窗口；新结果只进入 sensitivity。
- [x] 为 Rotary 建立不读取人工 score/override 的 pose-derived full-cycle evidence：
      两次 hand-to-ankle、肘膝伸展、hand/knee lift timing、return/balance proxy 与
      human flexion-clearing gate。
- [x] 生成 Rotary v1.1 post-audit internal benchmark 和 SHA-256；核心 landmarks 与
      criterion-specific 可见性分离后 8/8 可判、6/8 exact、8/8 within one、MAE 0.25。
- [x] 两条 AI 1 / 人工 2 的差异保留为触踝 proxy 的保守边界，不移动 threshold 追分。
- [x] 生成无人工字段的 Rotary label-free prediction layer，并合入 final AI v1.1。
- [x] 审计正式 Deep Squat 8 条的 attempt condition：5 条 floor、3 条 heels-elevated；
      final v1.1 中 4 条 staged floor attempt 保持 abstain。
- [x] 审计历史标签与双轮稳定盲审共识；仅 18 条 exact match 正式样本进入
      `audited weak labels`，其余保持 weak-label provenance。
- [x] 旧 AI 字段不进入 accuracy、agreement、profile distance 或 validation。
- [x] 生成 7 组可审阅 case-study candidates，并正式选定 4 个作用不同的申请案例。
- [x] 通过脚本重新生成当前全部结果表、四动作 heatmap 和 SHA-256。
- [x] 在 G3 结束时冻结主要数字和结论。

建议 case studies：

- Deep Squat：同分 case-pair 在同一主 group 内仍呈现连续参数差异。
- Hurdle Step：保留为 camera-view metadata gate 的方法学案例；stance discrepancy 已关闭，不作为 movement-only 主证据。
- ASLR：历史高一致性为何不能解释为模型准确。
- Rotary Stability：完整 cycle-level evidence 如何支持 first-pass suggestion，并在
  低质量视频上主动 abstain。

统计口径：

- 描述统计按动作、视频和 rep 分层报告。
- Feature 比较优先报告分布、effect size 和 bootstrap interval。
- 条件允许时以 video 为 bootstrap 单位，避免把同视频 rep 当成独立参与者。
- 聚类或 profile 分组只作 exploratory analysis，并报告样本数和稳定性限制。

### G4：报告、演示和申请发布包

目标窗口：Week 4

- [x] 完成中文 Phase I 技术报告和 English abstract，并按 Round B 最终数字更新。
- [ ] 制作系统、数据 lineage、动作分布、study 结果和 profile 对比图。
- [x] 完成该图表任务中的首批两张：Deep Squat 同分 movement profile 与 ASLR
      subject-aware measurement reliability；其余系统/lineage/study 图仍待完成。
- [x] 更新 dataset card、README、methods、limitations、ethics 和 publication
      boundaries。
- [ ] 完成 3 分钟英文 demo video 和字幕。
- [x] 完成 Ronnie 第一人称 contribution/learning statement 初稿。
- [x] 完成项目页文案、申请摘要、resume bullets 和 60-second interview version。
- [x] 生成 private release-candidate manifest 和 checksums；public manifest 等
      rights/privacy audit 后生成。
- [ ] 在干净环境重建代码、数据、分析和核心 demo。
- [x] 完成 release documents 的绝对路径、关键边界措辞、冻结数字漂移自动预检，
      并通过 340 tests 和三入口 production build。
- [ ] 完成人工 PII、素材授权、demo 画面和最终夸大表述检查。
- [x] 标记 `ai-fms-phase-i-rc2-2026-08-11` results-frozen release candidate，并保留
      demo、rights/privacy 与 held-out 工作缓冲时间。

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

| 日期       | 决策                                                  | 原因                                                                       |
| ---------- | ----------------------------------------------------- | -------------------------------------------------------------------------- |
| 2026-08-09 | 四周硬截止为 2026-09-06                               | 保证申请输出有明确结束点                                                   |
| 2026-08-09 | 110 rep 作为完整数据池，正式 study N 在 G2B 决定      | 样本量应服从 blindability、动作平衡和审核工作量                            |
| 2026-08-09 | Legacy AI suggestions 不进入准确率分析                | 已确认存在 score hint 标签泄漏                                             |
| 2026-08-09 | Frozen AI v1.0 中 Rotary 保持 feature-only            | 当时证据不足以支持可信 AI RAW SCORE；该基线不被后续改写                    |
| 2026-08-09 | 第二 reviewer 在 UI 中使用 `Other Reviewer`           | 保持研究界面角色通用，不绑定个人姓名                                       |
| 2026-08-09 | 本文件为唯一 canonical 四周计划                       | 避免 Downloads 草案与仓库执行版并行分叉                                    |
| 2026-08-09 | 正式 study 冻结为 Core N=32，四动作各 8 个            | 97 个通过盲法 QA；兼顾动作平衡、源视频分散与 128 次审核工作量              |
| 2026-08-09 | 正式 32 例必须同时 feature-ready                      | 支持评后定量比较；feature 不在 blind Round B 中展示                        |
| 2026-08-09 | Round A/B 使用独立 namespace 和显式 `studyRound`      | 避免后续事件覆盖或仅凭时间推断轮次                                         |
| 2026-08-09 | Round A 与 Round B 间隔至少 48–72 小时                | 降低短期记忆对第二轮评分的影响                                             |
| 2026-08-09 | `0` 仅表示已观察或报告疼痛；条件不足记为 `unscorable` | 防止把 protocol 缺失误写成 FMS 分数并污染分析                              |
| 2026-08-09 | 完整签名导出进入本地 SQLite 研究数据库                | 保留冻结 JSON 证据，同时提供幂等、不可变和可查询的分析入口                 |
| 2026-08-09 | Kappa 仅使用双方都给出 RAW SCORE 的 rep               | `unscorable` 不是数值分数；可评分性和原因一致率必须单独报告                |
| 2026-08-09 | G3 可先使用 Round A consensus 启动                    | 分析输入与 Round B 隔离；先推进 profile 与 case selection 不影响复测       |
| 2026-08-09 | 110/66 full pool 与 32/26 gold subset 分层报告        | 既充分利用既有工作，又不把 weak labels 误写成经过验证的 gold labels        |
| 2026-08-09 | Formal 32 不表述为对 110 的 simple random proof       | 样本来自 58 条双门槛候选的 deterministic balanced selection                |
| 2026-08-09 | Profile discovery 先无标签冻结、再叠加 Round A 分数   | 防止人工分数反向塑造分组；post-hoc overlay 只用于解释                      |
| 2026-08-09 | 采集优先级按独立源视频而不是 rep 数                   | ASLR/Deep Squat 显示明显 source-video signature，同视频重复不等于独立证据  |
| 2026-08-09 | Camera view 使用审计层，不覆盖 canonical 原字段       | 45/110 历史机位需校正；保留原值可追踪数据来源并避免静默改写                |
| 2026-08-09 | Round A matrix 冻结保留，另建 audited sensitivity 层  | 审核 lineage 不应被事后覆盖；新证据仍需使用正确机位进行稳健性检查          |
| 2026-08-09 | 九条复核不直接用于移动评分阈值                        | 先分离 protocol、pose/timing、机位与动态 feature 缺口；避免同批调参与评估  |
| 2026-08-09 | ASLR 先过侧别/峰值证据门，再讨论评分规则              | 3 个 limited 窗口不进入总分比较；重提取结果仅作 sensitivity                |
| 2026-08-10 | AI v1.0 在 Round B 人评前冻结                         | 防止第二轮人工结果反向影响规则；完成后再统一计算 AI-vs-human               |
| 2026-08-10 | Round B 修正为第二次完全盲评                          | Reviewer 不见 AI 分数、pose parameters 或任何上轮结果；AI 只在评后比较     |
| 2026-08-10 | ASLR subject-aware 结果只进入 sensitivity             | 受试者 ROI 恢复连续信号，但尚未在独立多人视频验证，不覆盖冻结 evidence     |
| 2026-08-10 | 申请案例采用四种作用而非只挑成功案例                  | 同时展示 movement profile、测量 QA、metadata gate 与 fail-closed 边界      |
| 2026-08-10 | 技术报告并列呈现产品价值与研究价值                    | 先说明如何辅助人工审核，再说明如何恢复 0-3 分压缩掉的信息                  |
| 2026-08-10 | Rotary v1.1 与 blind Round B 严格隔离                 | 防止 post-audit 新规则污染人工复评；新结果只作 internal benchmark          |
| 2026-08-10 | Rotary 不通过降低 visibility gate 强行补 coverage     | 正式 score-2 来源关键阶段遮挡；Full 模型重提取也未改善                     |
| 2026-08-10 | Rotary v1.1 改用 criterion-specific visibility        | 支撑侧关节遮挡不应让完整 core cycle 整体失效；单项证据不足仍可 watch       |
| 2026-08-10 | Final AI v1.1 在 Round B 结果产生前锁定               | 让 28/32 score-bearing predictions 可在评后比较，同时不污染人工盲评        |
| 2026-08-11 | Round A 旧导出只允许 checksum-pinned attestation      | 不改写历史 JSON；兼容旧 schema，同时让未知或可能暴露 AI 的文件 fail closed |
| 2026-08-11 | 32-rep 抽检不自动证明全部历史标签有效                 | 仅 18 条 exact stable blind consensus 可升级为 audited weak labels         |
| 2026-08-11 | Round B 只回答盲评复测，不回答 AI 辅助效果            | 两轮均未展示 AI/pose evidence；效率或信心变化不作 AI 因果解释              |

## 12. 变更记录

### v1.26 - 2026-08-11

- 根据阶段性讨论重写技术报告：Abstract 改为完整项目叙事，不再用版本迁移解释
  Rotary；Human Review 与 AI-human agreement 分节回答不同问题。
- 将 Targeted Error Audit 与 ASLR 独立过程审计下沉到 Quantitative Movement
  Findings，扩写 Deep Squat、ASLR、Hurdle Step 和 Rotary 四动作研究发现。
- Rotary 在默认 Workbench 中提升为与其他六动作一致的 first-pass pose-based AI
  suggestion；旧研究 artifact 继续保留其冻结 provenance，不改写历史 benchmark。
- 为界面截图和案例图增加可点击原图入口。

### v1.25 - 2026-08-11

- Ronnie 与 Other Reviewer 完成 Round B 32/32；两份签名导出通过 SHA-256、schema、
  blind-state 校验并进入本地 SQLite。
- Round B status agreement 32/32，26/26 数值分 exact，6/6 unscorable reason
  agreement；两位 reviewer 各改变同一条 Hurdle score。
- Frozen AI v1.0 vs Round B 为 8/16 exact、14/16 within one；final v1.1 为
  16/25 exact、23/25 within one、MAE 0.44、linear weighted kappa 0.4917。
- 新增 checksum-pinned Round A legacy blind attestation，不修改原始导出；新增历史
  标签审计，确认 18 条 audited weak labels，并保留其余标签的弱证据边界。
- G2C 与 G3 转为 COMPLETE；G4 继续处理 demo、rights/privacy 和最终公开包。

### v1.24 - 2026-08-10

- Rotary v1.1 由 all-or-nothing 12-landmark gate 改为 core-cycle 与
  criterion-specific evidence；可见 finger landmarks 进入触踝 proxy。
- 正式 Rotary 8 条由 4/8 coverage 提升为 8/8；internal result 为 6/8 exact、
  8/8 within one、MAE 0.25。两条保守低估原样保留，不用人工答案移动 threshold。
- Rotary experimental first-pass 接入 Workbench；Round A/B、frozen AI v1.0 和
  reviewer export contract 保持完全隔离。
- 完成 8 条 Deep Squat attempt-condition 审计，并锁定无人工字段的 final AI v1.1
  package：28/32 有 raw score，4/32 staged floor attempt 合理拒判。
- Round B closeout command 已准备同时报告 v1.0 baseline 与 v1.1 internal benchmark。

### v1.23 - 2026-08-10

- 根据项目发起人确认，将 Round B 从 evidence-assisted 修正为第二次独立盲评；
  本版本取代 v1.18 中的 reviewer exposure 设计。
- Study Mode 不再请求或显示 AI/pose evidence，不再收集 evidence usefulness。
- Formal event/export validation 拒绝 `evidenceReview`、current pose evidence 和
  current AI suggestion 暴露；Round B scored event 可进入 blind analysis。
- AI v1.0 仍在人评前冻结，但只在两位 reviewer 签名导出完成后由 closeout
  脚本读取，用于 AI-vs-Round A/B consensus 比较。

### v1.22 - 2026-08-10

- 新增独立 `Rotary AI v1.1 experimental` adapter，以 pose-derived full-cycle
  evidence 实现 1/2/3 first-pass rule、human pain/clearing gate 和 abstain。
- 新规则不读取 curated manual score override，也不进入 frozen Round B；配置锁定
  AI v1.0 SHA-256，测试阻止 experimental score 暴露。
- 新增可复现内部 benchmark：正式 8 条中 4 条可判，4/4 exact，coverage 4/8；
  kappa 因可比较项均为 1 分而不可估计。
- MediaPipe Full 15 fps sensitivity 未提高低覆盖来源，后续优先补无遮挡、board
  edge 可见和完整侧身的新视频，不继续以更大 pose model 替代采集质量。

### v1.21 - 2026-08-10

- 重写 Phase I technical report 的 English Abstract、中文摘要和背景动机，将
  “帮助人工评分”与“恢复 ordinal score 压缩信息”明确为两层项目目的。
- 新增“人工困难、系统功能与预期帮助”表、七动作 Product Scope、四动作 Research
  Scope 和现有界面证据，突出真实功能与开发工作量。
- 新增 Human reliability、Frozen AI benchmark、Human test-retest 和 Final
  internal benchmark 四层评测框架，并把 held-out confirmation 作为推广性门槛。
- 按当前事实记录 Round B 界面与 AI v1.0 benchmark 已冻结、人工 Round B 尚待完成；
  Rotary 保持 feature-only，未来评分必须基于 cycle-level evidence 并允许 abstain。

### v1.20 - 2026-08-10

- 正式选定 4 个申请案例：Deep Squat 同分异型、ASLR subject-selection reliability、
  Hurdle camera-view gate 和 Rotary feature-only boundary。
- 新增 source-of-truth 案例配置与 `npm run release:phase-i:figures`，从冻结的
  camera-audited features、ASLR sensitivity 和 Round B 后置 AI benchmark manifest 生成结果。
- 生成 2 张不含人物图像、源文件名或本机路径的 application candidate SVG；通过
  source fingerprint、SHA-256、XML 和真实浏览器排版检查。
- Phase I release-candidate manifest 扩展到 13/13 artifacts 和 11 份文档；质量门
  提升到 319/319 tests。

### v1.19 - 2026-08-10

- 对 ASLR 三个原 `limited` 独立窗口执行 multi-pose / subject ROI / inference crop
  重提取；结果为 1 `good`、2 `watch`、0 `limited`。
- 两个原有 `watch` 窗口完成人工视频 QA；保留质量标志，不作为评分阈值锚点。
- 新 pose、配置、结果和 SHA-256 均保存在独立 sensitivity layer；Round A、Round B、
  原 feature matrix 和 AI v1.0 evidence 保持不变。
- Phase I release-candidate manifest 扩展到 12/12 artifacts 和 10 份文档；质量门
  提升到 317/317 tests。

### v1.18 - 2026-08-10 (superseded by v1.23)

> 以下 evidence-assisted reviewer exposure 为历史实现记录，已由 v1.23 的 blind Round B 替代。

- 开放独立的 Round B evidence-assisted Study Mode，并保留与 Round A 分离的
  queue、browser namespace 和 append-only event log。
- 冻结 reviewer-safe 32-rep evidence manifest、AI v1.0 rule fingerprint 和
  source checksums；全部 32 条有定量特征，18 条通过总分 gate。
- 每条 Round B 终态新增 evidence usefulness、manifest/item fingerprint 和
  AI-score exposure 记录；Rotary 继续 feature-only。
- 建立 Round B 完成后一键分析命令，覆盖人际一致性、A/B 变化、证据有用性及
  frozen AI-vs-human comparison。
- 新增中文 Round B reviewer protocol，并完成桌面和手机真实浏览器检查。
- Phase I release-candidate manifest 扩展到 11/11 artifacts 和 9 份文档；质量门
  提升到 315/315 tests。

### v1.17 - 2026-08-09

- 新增覆盖全部 17 条 ASLR 记录的 label-free side/peak evidence audit；按 16 个
  独立证据窗口报告 11 good、2 watch、3 limited，避免重复 ingest 被当作独立样本。
- 明确平均 landmark visibility 不能替代 subject identity、active side 和 trajectory
  QA；多人教学视频进入 subject-aware re-extraction 队列。
- `limited` 窗口退出自动总分比较，`watch` 窗口要求人工复核；冻结 baseline 和 ASLR
  thresholds 均不修改。
- Release candidate 扩展到 10/10 checksum-protected artifacts、8 份主文档；质量门
  提升到 307/307 tests、lint、format 和三入口 build。

### v1.16 - 2026-08-09

- 将 README 从 5 月单视频/mock prototype 叙事更新为四动作、110-rep、32-rep
  formal study 和 Round A 当前状态；旧 V1.5 文档明确标为历史参考。
- 新增 Phase I dataset card 与独立 methods/limitations/ethics 文档，明确 evidence
  tiers、source dependence、rights/privacy 和 no-diagnosis boundary。
- 新增中文 Phase I technical report（含 English abstract）、application copy 和
  claim-control evidence table。
- 新增 release-candidate spec 与 `npm run release:phase-i:manifest`；自动验证 9/9
  checksum-protected artifacts、7 份文档和 28/110/66/32/26/16 关键数字。
- release generator 新增 document preflight，阻止本机绝对路径并要求 Round B、
  no-diagnosis、human-review 和 rights/privacy 边界完整出现；完整质量门为
  303/303 tests、lint、format 和三入口 build。
- G4 进入 IN PROGRESS；Round B、demo video、公开素材 rights/privacy audit 和最终
  stale-claim pass 继续保持未完成。

### v1.15 - 2026-08-09

- 为九条 actionable AI/人工差异生成每条 5 帧高清审查材料，并逐条连接两位
  reviewer comment、camera/side、pose features 和现有评分规则。
- 确认两条 Deep Squat 为 heels-elevated board metadata 缺口；字段补齐后现有规则
  均输出 2 分。第三条确认是 floor attempt，保留 AI raw 2 与人工 3 的真实差异。
- 修复分析层把 `attemptCondition` 只写入兼容 metadata、未写到 staged rule 实际读取
  字段的问题，并增加自动测试。
- 冻结基线保持 9/16；另报 post-audit protocol sensitivity：11/17 完全同分、15/17
  相差不超过 1 分、MAE 0.4706，不包装为模型训练提升。
- ASLR 指向 active-side/peak selection 与 pose/protocol QA；Hurdle 指向全周期膝踝、
  trunk 和 dowel evidence。本轮不修改阈值。

### v1.14 - 2026-08-09

- 对 110 条 camera-audited feature rows 先独立运行现有 suggestion rules，之后才
  连接 26 条 Round A 双方同分共识，从数据流上隔离人工标签。
- 26 条中 16 条可比较 AI 总分：9/16 完全同分、14/16 相差不超过 1 分、MAE
  0.5625；linear/quadratic weighted kappa 为 -0.0588/-0.1556。
- 10 条不比较由 8 条 Rotary feature-only 和 2 条 Deep Squat staged-attempt
  metadata 缺口构成，不把缺失结果当作错误分数。
- 形成 ASLR 两条 2 分级低估、Hurdle 四条分歧、Deep Squat 一条分数差异和两条
  metadata 缺口的 9 条定向复核队列；另保留 8 条 Rotary feature-only 预期边界。
- 新增 `npm run study:ai-evidence:round-a`、JSON/CSV/中文报告、rule fingerprint 和
  SHA-256 输出。

### v1.13 - 2026-08-09

- 复用现有 feature builder，以 `auditedCameraView` 重建独立 sensitivity matrix，
  不覆盖 Round A formal manifest 引用的冻结 fingerprint。
- 45 条机位变化导致 4 条 Hurdle numeric feature、13 条 Deep Squat rating 和 4 条
  Hurdle rating 变化；feature readiness 保持 66 ready / 44 limited。
- Label-free profile groups、7 个 Round A score strata、source-effect flags 和
  leave-one-video-out status 全部不变；仅 8 条 Hurdle outlier rank 调整。
- 将 Hurdle front-only stance features 对 `mixed/side/unknown` 改为不适用，原
  stance-stability AI-human discrepancy 归因于 metadata gate 并关闭。
- 新增 `npm run data:pilot:features:camera-audited`、敏感性报告和 SHA-256 输出。
- 通过 295/295 tests 和三页面 production build。

### v1.12 - 2026-08-09

- 复用 14 张既有 blindability contact sheets，完成 28 个视频、110 个 rep 的
  start/middle/end 三帧 camera-view 视觉审计。
- 保留 canonical `cameraView` 作为 lineage，新增 45 条显式校正并生成逐 rep
  `auditedCameraView`；最终分布为 front 48、side 54、mixed 8。
- 用本地 SQLite 中的 Round A event 交叉检查：两位 reviewer 29/32 机位一致，29 条
  全部与审计结果相符；3 条分歧经视觉复核解决。
- 新增 `npm run data:pilot:camera-views`，输出 JSON、CSV、中文报告和 SHA-256。
- Deep Squat 首要案例的两条 rep 均确认为同一 `side` 审计机位，继续支持同机位参数
  差异，不再依赖错误的历史 `front` 字段。
- Hurdle Step pair 的 outlier 审计为 `mixed`、comparator 为 `front`，因此从同机位
  案例降级为 view-confounded 方法学示例，避免夸大 movement-only 解释。

### v1.11 - 2026-08-09

- 复核 Deep Squat 两条不同源视频、Round A 同为 2 分的脚跟垫板动作。
- 两条动作因相同 protocol 条件得到相同分数，但 peak depth、hip/knee angle、
  ankle-shank lean 和 knee-ankle offset 明显不同。
- AI定量方向与两位reviewer对深度的描述一致；该pair升级为首要
  application-facing same-score case study。
- 逐帧检查发现历史 `cameraView=front` 与视觉上的侧/斜侧构图可能不一致，新增全池
  camera metadata QA，不在完成前使用该字段解释profile。
- 新增 `docs/research/deep_squat_same_score_case_review_2026-08-09.md`。

### v1.10 - 2026-08-09

- 对最高优先级 Hurdle Step outlier 进行源视频 contact-sheet、Round A comment 和
  feature cross-check。
- 当时按 historical metadata 改用另一条 `front/right`、不同源视频、同为 Round A
  2 分的 rep 作为对照；v1.12 camera audit 后该结论被收紧为 view-confounded。
- 初始 feature 表显示 stance ankle drift、step-knee line offset 和 hip-height gap
  差异；v1.13 sensitivity rebuild 已将 mixed-view stance 指标改为不适用。
- 当时记录的 AI 支撑腿稳定性与人工评论不一致已在 v1.13 归因为 camera metadata
  gate，并从动作层面结论中删除。
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
