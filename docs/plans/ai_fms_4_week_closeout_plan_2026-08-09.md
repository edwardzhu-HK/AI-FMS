# AI-FMS 四周阶段收尾与申请输出计划

## 文档控制

| 字段     | 当前值                         |
| -------- | ------------------------------ |
| 文档状态 | ACTIVE - Canonical Plan        |
| 版本     | v1.44                          |
| 执行周期 | 2026-08-09 至 2026-09-06       |
| 硬截止   | 2026-09-06                     |
| 最近更新 | 2026-08-23                     |
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
8. 技术报告、中文摘要、dataset card、README、项目页、演示视频和 NHSJS
   submission-ready manuscript package 完成。
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
| G4 报告与申请发布包             | IN PROGRESS | 研究内容已冻结；进入 PDF、项目页、demo、公开审计与最终发布阶段  |

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
- [x] 完成早期案例候选与两张图的可行性验证；该初版已由后续 v2 案例组合取代，不再作为当前发布口径。
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
- [x] 完成过渡性四个同分定量案例版本，并在 v1.29 中进一步升级为连续谱、双侧
      重复性、扣分路径和周期事件四种不同方法；measurement QA 继续留在 Limitations。
- [x] 为四个案例补充“observed feature → movement profile → functional hypothesis”
      解释层，提出 mobility、stability、coordination 与 compensation 的定向复核假设，
      同时明确不作医学或功能障碍诊断。
- [x] 重新从 110-rep pool 审计案例结构，取消统一 pair template：Deep Squat 改为
      15-rep side-view continuum，ASLR 改为 4-rep bilateral repeatability，Hurdle
      改为 5-rep blind score-2 pathway taxonomy，Rotary 改为 8-rep cycle-event matrix。
- [x] 将案例生成器升级为 checksum-pinned v2，生成 4 张差异化、无人物研究图。
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

冻结 case-study portfolio：

- Deep Squat：15 条侧视 rep / 7 个源视频的 strategy continuum，区分深度轴与踝、
  躯干和对线等相对独立维度。
- ASLR：同一来源四条 good rep 的 bilateral repeatability series，研究目标高度与
  固定腿、骨盆控制是否同步。
- Hurdle Step：五个源视频中五条盲评 2 分的 pathway taxonomy，区分多领域控制、
  远端对线、回收阶段与 dowel control。
- Rotary Stability：八条正式 rep 的 full-cycle event matrix，研究触踝、伸展、
  时序、回位与周期完整度。

统计口径：

- 描述统计按动作、视频和 rep 分层报告。
- Feature 比较优先报告分布、effect size 和 bootstrap interval。
- 条件允许时以 video 为 bootstrap 单位，避免把同视频 rep 当成独立参与者。
- 聚类或 profile 分组只作 exploratory analysis，并报告样本数和稳定性限制。

### G4：报告、演示和申请发布包

目标窗口：Week 4

- [x] 完成中文 Phase I 技术报告和 English abstract，并按 Round B 最终数字更新。
- [x] 完成四张动作特异性研究图：Deep Squat continuum、ASLR bilateral series、
      Hurdle pathway taxonomy 与 Rotary cycle-event matrix。
- [ ] 为最终报告和项目页补充一张系统 workflow、一张 data/evidence lineage 和一张
      study/AI 结果总览图；不得重复堆叠已有四张研究图。
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
- [ ] 完成剩余 contribution/advisor、PII、非界面媒体、音乐和最终夸大表述检查；
      Workbench/Study Mode 固定人物帧已使用自采授权素材完成该项审核。
- [x] 标记 `ai-fms-phase-i-rc2-2026-08-11` results-frozen release candidate，并保留
      demo、rights/privacy 与 held-out 工作缓冲时间。
- [x] 将 peer-reviewed publication 纳入 Phase I 输出路线：主目标为 NHSJS
      expedited review；Zenodo 仅在期刊书面允许 preprint 后使用。
- [x] 核对 NHSJS Research Article 当前格式：200-250 word abstract、20-page limit、
      至少 5 个 figures/tables，以及匿名标准引用版与 online-citation Word 版。
- [x] 建立 publication track、presubmission inquiry 草稿和 manuscript evidence map。
- [x] 完成中文论文完整初稿 v0.3：以七动作 AI 辅助人工审核系统开发为主线，以四动作
      Phase I 作为评估范围，并将同分隐藏信息定位为 secondary research contribution；
      生成并逐页检查 24 页 A4 内部审阅 PDF。
- [x] 通过真实浏览器 workflow 生成 Workbench 总览、quantitative evidence 近景和
      Study Mode blind-review dry-run；保留清晰真实动作帧，移除源文件名、score-bearing
      notes 与具体 reviewer IDs，并将两张系统图嵌入内部论文稿。
- [x] 将 application copy、claim-control table、project-page copy 和 demo script 统一到
      已认可的“七动作系统开发 + 四动作 Phase I 评估 + secondary findings”叙事。
- [x] 建立 canonical output index 和 Ronnie GitHub repository-transfer checklist。
- [x] 将 demo 从 software walkthrough 升级为 applicant-led application film：Ronnie
      全程旁白、首尾出镜，并加入 FMS 定义、Level 1/Level 2 certification、实际评估
      动机、个人反思和大学阶段研究方向。
- [x] 建立逐镜头 asset/shot plan，区分 A-roll/FMS 新拍、证书处理、Workbench/Study
      screen recording、frozen-results graphics、research figures、rights gate 和素材交付。
- [x] 生成可打印 production pack：12 页 A4 横向 asset/shot plan 与 9 页 A4 纵向
      on-set script；完成逐页视觉、文字提取、页数、表格与旁白分页检查。
- [ ] 由人工确认 Ronnie 作者名/年级/学校、成人 corresponding contact、贡献声明、
      rights 范围与完整 AI-use disclosure。
- [ ] 向 `submissions@nhsjs.com` 发送 presubmission inquiry，并取得 secondary-video
      ethics、AI-generated analysis figures、advisor 与 Zenodo preprint 政策的书面回复。
- [x] 按 NHSJS 当前 AI policy 建立 author-only prose workflow，并使用 2026-07 官方
      Standard Citations Word 模板生成 11 页英文 authoring manuscript，内含 4 表 6 图、
      盲审 metadata scrub 和可删除黄色 prompts。
- [ ] Ronnie 独立写成全部英文正文、验证引用并删除 prompts；随后机械生成 Online
      Citations 版、supplement 和投稿清单，再决定是否支付 $280 expedited-review fee。

### G4.1 最终交付物与应用途径

Phase I 最终交付分成公开申请材料、受控研究材料和内部证据三层。公开层只使用通过
rights/privacy 审计的媒体与聚合数据；私有研究资产不因“方便展示”而进入公开包。

| 交付物                             | 最终形态                                                                                                                     | 当前状态                                                                                             | 主要应用途径                                                             |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 可运行代码与 GitHub release        | 受控源码、README、版本 tag、public-safe sample 和复现命令                                                                    | 17/17 RC 已完成；待 main 收口、clean rebuild、final manifest 与 Ronnie 账户 transfer                 | GitHub 项目主页、技术能力证明、技术面试与后续协作者复现                  |
| Phase I 技术报告                   | 中文正文、English abstract、图表完整的 PDF 与 Markdown                                                                       | 内容已完成；待排版、PDF 生成和逐页 QA                                                                | 申请补充材料、研究导师/老师审阅、面试深讲、竞赛或研究项目说明            |
| 研究图与界面视觉包                 | 4 张动作研究图、3 张界面截图和经授权的演示帧                                                                                 | 4 张研究图与 3 张当前界面图完成；两张人物帧已改用 2026-08-23 自采授权素材                            | 技术报告、项目页、demo、演示文稿和面试快速说明                           |
| Portfolio project page             | 问题、产品、方法、发现、个人角色、限制与链接组成的简洁页面                                                                   | Canonical copy 与 evidence table 已更新；正式页面待制作                                              | 个人网站、学校允许的 supplementary link、面试前快速浏览                  |
| Demo video                         | 4:15-4:30 application-film Master、3 分钟版、60 秒版和英文字幕                                                               | v2.1 脚本、逐镜头 plan、真人/旁白/证书/动作素材完成；待 screen/graphics、剪辑和成片审计              | Portfolio、补充材料、老师/推荐人了解项目、面试展示                       |
| Application writing pack           | short description、Activities/Additional Information 素材、resume bullets、60-second answer、contribution/learning statement | 主文案、142/295-character variants 和 claim-control 已更新；待 Ronnie 确认第一人称事实与最终载体限制 | 大学申请表、简历、面试、推荐人 briefing；具体使用以学校允许格式为准      |
| Journal manuscript and submission  | NHSJS Research Article、匿名标准引用 Word、online-citation Word、supplement 与投稿记录                                       | 中文 v0.3 内部稿完成；官方模板英文 authoring manuscript 为 11 页、4 表 6 图，待 Ronnie 独立完成正文  | 争取正式同行评审、申请研究成果、导师审阅；接受前只使用实际投稿状态       |
| Dataset / methods / ethics package | Dataset card、methods/limitations/ethics、claim-control table、data dictionary                                               | 内容已完成；待最终 public-safe 人工复核                                                              | 展示研究严谨性、回答数据来源与伦理问题、支持老师或技术 reviewer 深入检查 |
| Private research evidence archive  | 签名 review exports、SQLite、raw media/pose、17/17 manifest、checksums 与生成日志                                            | Results-frozen RC 已完成；待最终只读快照与恢复说明                                                   | 内部审计、未来 held-out 研究、结果复现和项目交接；不得公开分发           |
| Final closeout index               | 最终文件清单、公开/私有边界、版本号、checksum 和已知限制                                                                     | v0.3 canonical output index 已更新；最终 release 时补 checksum 与完成记录                            | 防止交付遗漏，为申请、GitHub 与未来研究提供统一入口                      |

### G4.2 收尾判断

**GO FOR CLOSEOUT。** G1-G3 已完成，Phase I 的数据、双轮人工结果、AI internal
benchmark、四种定量分析和主要主张均已冻结。当前不需要为“让结论更好看”继续调参或
临时扩大样本。G4 剩余工作是展示、授权、复现、论文投稿和发布质量，而不是重新开启
研究设计。

新的 held-out 视频、更多 reviewer、expert panel 和 evidence-assisted controlled study
属于 Phase II confirmation。它们可以增强未来证据，但不是 Phase I 按期收尾的阻断项。

建议英文论文标题：

`AI-FMS: Development and Phase I Evaluation of an Explainable Human-in-the-Loop System for Functional Movement Screen Video Review`

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
- 提供 Level 1/Level 2 证书原图和准确 title/date，录制首尾 A-roll，并确认所有第一人称
  certification、实践、反思和未来方向表述。
- 注册个人 GitHub 账户，提供准确 username，并在 repository transfer 发出后及时接受。

### Other Reviewer

- 独立完成 Round A 和 Round B，不查看 Ronnie 的当轮答案。
- 确认公开范围、研究限制和项目叙事。
- 参与选择最能说明“同分异型”的案例。

### 可选专业审核者

- 只在可获得时审核少量高分歧样本或未来研究 protocol。
- 不作为四周按期完成的硬依赖。

## 7. 研究问题与边界

Primary question：

> 在保留人工最终判断的前提下，AI-FMS 能否恢复 FMS ordinal score 压缩掉的、动作特异性的定量信息？

Secondary questions：

- 独立 reviewer 的 rep-level agreement 如何？
- 两轮独立 blind review 的人工一致性与 test-retest stability 如何？
- 锁定 AI 的 coverage、abstention 和与人工共识的 internal concordance 如何？
- 不同动作分别压缩了哪些连续策略、左右/重复性、扣分路径和事件顺序？

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
- 七个动作达到同等 validation、calibration 和样本证据成熟度。
- 新 pose model 训练、YOLO Pose 或 MMPose 迁移。
- 实时手机评分、移动 App 和云端生产部署。
- 医疗诊断、损伤风险预测或治疗建议。
- 在四周内保证期刊接受或正式发表；本轮只承诺完成合规投稿包，并在资格确认后投稿。
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

| 日期       | 决策                                                   | 原因                                                                                 |
| ---------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| 2026-08-09 | 四周硬截止为 2026-09-06                                | 保证申请输出有明确结束点                                                             |
| 2026-08-09 | 110 rep 作为完整数据池，正式 study N 在 G2B 决定       | 样本量应服从 blindability、动作平衡和审核工作量                                      |
| 2026-08-09 | Legacy AI suggestions 不进入准确率分析                 | 已确认存在 score hint 标签泄漏                                                       |
| 2026-08-09 | Frozen AI v1.0 中 Rotary 保持 feature-only             | 当时证据不足以支持可信 AI RAW SCORE；该基线不被后续改写                              |
| 2026-08-09 | 第二 reviewer 在 UI 中使用 `Other Reviewer`            | 保持研究界面角色通用，不绑定个人姓名                                                 |
| 2026-08-09 | 本文件为唯一 canonical 四周计划                        | 避免 Downloads 草案与仓库执行版并行分叉                                              |
| 2026-08-09 | 正式 study 冻结为 Core N=32，四动作各 8 个             | 97 个通过盲法 QA；兼顾动作平衡、源视频分散与 128 次审核工作量                        |
| 2026-08-09 | 正式 32 例必须同时 feature-ready                       | 支持评后定量比较；feature 不在 blind Round B 中展示                                  |
| 2026-08-09 | Round A/B 使用独立 namespace 和显式 `studyRound`       | 避免后续事件覆盖或仅凭时间推断轮次                                                   |
| 2026-08-09 | Round A 与 Round B 间隔至少 48–72 小时                 | 降低短期记忆对第二轮评分的影响                                                       |
| 2026-08-09 | `0` 仅表示已观察或报告疼痛；条件不足记为 `unscorable`  | 防止把 protocol 缺失误写成 FMS 分数并污染分析                                        |
| 2026-08-09 | 完整签名导出进入本地 SQLite 研究数据库                 | 保留冻结 JSON 证据，同时提供幂等、不可变和可查询的分析入口                           |
| 2026-08-09 | Kappa 仅使用双方都给出 RAW SCORE 的 rep                | `unscorable` 不是数值分数；可评分性和原因一致率必须单独报告                          |
| 2026-08-09 | G3 可先使用 Round A consensus 启动                     | 分析输入与 Round B 隔离；先推进 profile 与 case selection 不影响复测                 |
| 2026-08-09 | 110/66 full pool 与 32/26 gold subset 分层报告         | 既充分利用既有工作，又不把 weak labels 误写成经过验证的 gold labels                  |
| 2026-08-09 | Formal 32 不表述为对 110 的 simple random proof        | 样本来自 58 条双门槛候选的 deterministic balanced selection                          |
| 2026-08-09 | Profile discovery 先无标签冻结、再叠加 Round A 分数    | 防止人工分数反向塑造分组；post-hoc overlay 只用于解释                                |
| 2026-08-09 | 采集优先级按独立源视频而不是 rep 数                    | ASLR/Deep Squat 显示明显 source-video signature，同视频重复不等于独立证据            |
| 2026-08-09 | Camera view 使用审计层，不覆盖 canonical 原字段        | 45/110 历史机位需校正；保留原值可追踪数据来源并避免静默改写                          |
| 2026-08-09 | Round A matrix 冻结保留，另建 audited sensitivity 层   | 审核 lineage 不应被事后覆盖；新证据仍需使用正确机位进行稳健性检查                    |
| 2026-08-09 | 九条复核不直接用于移动评分阈值                         | 先分离 protocol、pose/timing、机位与动态 feature 缺口；避免同批调参与评估            |
| 2026-08-09 | ASLR 先过侧别/峰值证据门，再讨论评分规则               | 3 个 limited 窗口不进入总分比较；重提取结果仅作 sensitivity                          |
| 2026-08-10 | AI v1.0 在 Round B 人评前冻结                          | 防止第二轮人工结果反向影响规则；完成后再统一计算 AI-vs-human                         |
| 2026-08-10 | Round B 修正为第二次完全盲评                           | Reviewer 不见 AI 分数、pose parameters 或任何上轮结果；AI 只在评后比较               |
| 2026-08-10 | ASLR subject-aware 结果只进入 sensitivity              | 受试者 ROI 恢复连续信号，但尚未在独立多人视频验证，不覆盖冻结 evidence               |
| 2026-08-10 | 申请案例采用四种作用而非只挑成功案例                   | 同时展示 movement profile、测量 QA、metadata gate 与 fail-closed 边界                |
| 2026-08-10 | 技术报告并列呈现产品价值与研究价值                     | 先说明如何辅助人工审核，再说明如何恢复 0-3 分压缩掉的信息                            |
| 2026-08-10 | Rotary v1.1 与 blind Round B 严格隔离                  | 防止 post-audit 新规则污染人工复评；新结果只作 internal benchmark                    |
| 2026-08-10 | Rotary 不通过降低 visibility gate 强行补 coverage      | 正式 score-2 来源关键阶段遮挡；Full 模型重提取也未改善                               |
| 2026-08-10 | Rotary v1.1 改用 criterion-specific visibility         | 支撑侧关节遮挡不应让完整 core cycle 整体失效；单项证据不足仍可 watch                 |
| 2026-08-10 | Final AI v1.1 在 Round B 结果产生前锁定                | 让 28/32 score-bearing predictions 可在评后比较，同时不污染人工盲评                  |
| 2026-08-11 | Round A 旧导出只允许 checksum-pinned attestation       | 不改写历史 JSON；兼容旧 schema，同时让未知或可能暴露 AI 的文件 fail closed           |
| 2026-08-11 | 32-rep 抽检不自动证明全部历史标签有效                  | 仅 18 条 exact stable blind consensus 可升级为 audited weak labels                   |
| 2026-08-11 | Round B 只回答盲评复测，不回答 AI 辅助效果             | 两轮均未展示 AI/pose evidence；效率或信心变化不作 AI 因果解释                        |
| 2026-08-15 | 第 6 节四案例统一回答“0-3 分压缩了什么信息”            | 技术失败属于 measurement QA；Deep Squat 为主案例，其余为支持性探索案例               |
| 2026-08-15 | 同分案例从参数差异延伸到可检验的 movement hypothesis   | 功能性解释用于指导后续复核，不直接命名为病因、诊断或 validated subtype               |
| 2026-08-15 | 案例方法由动作和数据结构决定，不统一套用 pair template | 分别研究连续谱、双侧重复性、扣分路径和完整周期，充分利用 110-rep pool                |
| 2026-08-17 | G1-G3 冻结后正式转入 G4 收尾输出                       | 剩余阻断是 demo、rights/privacy、clean rebuild 与 final release，不再重开调参        |
| 2026-08-17 | 论文主线采用 NHSJS expedited + conditional Zenodo      | 先取得 AI/ethics/preprint 书面许可；投稿完成是目标，期刊接受时间不作 Phase I 门槛    |
| 2026-08-17 | 论文主线改为七动作系统开发与 Phase I 评估              | 四动作是评估范围，不是产品边界；同分信息恢复是系统完成后的 secondary finding         |
| 2026-08-17 | Ronnie 注册账户后接收 GitHub repository 所有权         | 使用官方 transfer 保留完整历史；不建立无历史平行仓库，迁移前先完成 main/release 审计 |
| 2026-08-17 | 中文论文整体框架进入细节打磨阶段                       | 标题、摘要、结构和主要结论已获内部认可；后续重点转向配套输出、授权和载体适配         |
| 2026-08-17 | Demo 定位升级为申请人主导的 application film           | 视频既展示项目，也展示 Ronnie 的专业准备、presentation、反思与未来研究方向           |
| 2026-08-17 | 视频人物与 FMS 素材优先重新拍摄                        | 避免外部素材授权与风格问题；系统画面和图表从现有 source-of-truth 生成                |

## 12. 变更记录

### v1.44 - 2026-08-24

- 完成 Master v2 逐段看片总结并按确认意见制作独立 `rough-cut-v3` / `master-review-v3`，
  保留 V1/V2，不覆盖既有成片。
- 首帧改为 1.25 秒 AI-FMS 项目页；字幕缩至 31px、单行优先、下移并降低背景不透明度，减少
  对贴地动作的遮挡；七动作改用自然 VO01 并延长动作窗口、增加小转场。
- 从已登录 FMS Level 1 课程保存 Hurdle Step lesson 界面；与 completed-course 和两张证书
  共同构成 training evidence，画面不显示账号姓名、登录按钮或聊天信息。
- 将 `1:04-1:11` idle 片段替换为 `33614` 辅导过程和 `33831` 测量特写；保留后续已认可
  的实践镜头。
- 重录 Workbench，真实展开 action selector 的七动作名称；Study Mode 前 14 秒保持全页并
  高亮标题，进入控件操作后才放大；重新对齐 segments、pose、AI evidence、protocol 和
  reviewer fields 的框选时序。
- Phase I 数字页和四动作研究图全部保持完整全页、无镜头缩放；用渐入橙色圈线强调当前数字
  和证据区。A03 恢复从电脑转向镜头的完整动作，并以原速现场音频保持口型同步。
- Master review cut v3 为 277.0 秒 / 4:37.0、1920x1080、30fps、H.264/AAC 48kHz；
  51 条 SRT 无重叠，综合响度 -16.0 LUFS、true peak -1.4 dBFS，未检出异常黑帧。
- v3 MP4 SHA-256 为 `a28b56005f1e0268fbfdb6f7499187582f74f602d901e3941e97040029a15b19`；
  当前仍为 human-review cut，确认后才冻结 Master 并派生 3min / 60s。

### v1.43 - 2026-08-23

- 完成 Master v1 三人逐段看片，将 Edward 与 Ronnie 的意见整理为时间轴修改清单；明确总体
  节奏不推翻，只修复局部过快、停顿、硬转场、画面与旁白脱节及声音不统一。
- 从 Ronnie 已登录的 Functional Movement Systems 账号保存课程目录与 Level 1 / Level 2
  completed-course 画面；成片裁除账号姓名、个人按钮和聊天组件，仅保留学习与认证证据。
- 重录 Workbench 与 blind Study Mode：真实操作七动作能力、segments、pose features、AI
  evidence、protocol、reviewer score、confidence、camera view、side 与 review note；重点区域
  使用鼠标、高亮框和动态放大引导视线。
- 完成 Master review cut v2：271.8 秒 / 4:31.8、1920x1080、30fps、H.264/AAC 48kHz；
  加入七动作名称、完整烧录字幕、51 条可编辑 SRT、0.2 秒柔和转场与低电平 Apple Loop
  `Slow Drift Ambient Synth`。
- v2 综合响度为 -16.0 LUFS、true peak -1.4 dBFS，未检出异常黑帧；最终 MP4 SHA-256 为
  `dbd9ea23b614cc48c67988efc355c7d5e48ccc165dda81f0b814322a431ce5cd`。下一步仅进行
  人工看片、必要的局部修正和 Master 冻结，再派生 3min / 60s。

### v1.42 - 2026-08-23

- 将已确认的论文 authoring package fast-forward 合并并推送到 `main`，从 main 新建
  `codex/application-video-postproduction`，使视频与论文后续修改保持独立边界。
- 使用 whisper.cpp base.en 在本机离线转录 20 个 GarageBand regions、3 个 opening、8 个
  transition 与 3 个 closing clips；未将私有音频上传到云端服务。
- 锁定 VO01-VO09 take selection；生成自然语速 selected 层 221.95 秒和 timeline 层
  204.00 秒，保留全部原始 GarageBand 文件。
- 通过 Playwright 录制 1080p Workbench S01-S03 master 和 Study Mode S04 master；统一使用
  2026-08-23 自采 Deep Squat proxy，不暴露 AI/pose/history/source filename 到盲评画面。
- 生成 5 张 Phase I results cards 与无 URL G06 end card，沿用 4 张 frozen research
  figures；用 FFmpeg 组装 music-free Master review cut v1。
- Review cut v1 为 272.4 秒 / 4:32.4、1920x1080、30fps、H.264/AAC 48kHz；综合响度约
  -17.1 LUFS、true peak -2.8 dBFS，未检出异常黑帧。
- 下一轮只处理人工看片反馈、2.4 秒精简、lower third/action labels、SRT、可选音乐和
  A03 monitor/future-work 句取舍，再输出 Master v2、3min 与 60s。

### v1.41 - 2026-08-23

- 将 `codex/rotary-final-ai-benchmark` 的 17 个已验证提交 fast-forward 合并并推送到
  `main`；从新 main 建立 `codex/english-manuscript-submission` 作为论文独立工作分支。
- 核对 NHSJS 2026-08 当前 AI Usage Policy：允许 coding、analysis、interpretation 和
  literature search，但禁止 AI 起草、翻译、paraphrase、扩写或改写投稿正文，即使作者
  后续修改也不例外。
- 放弃直接 AI 翻译中文稿的方案，建立 author-only prose workflow；中文稿只作内部证据和
  结构参考。
- 下载并审计 NHSJS 2026-07 官方 Standard Citations Word 模板；生成 11 页 Letter、12 pt、
  单倍行距英文 authoring manuscript，内含 4 表 6 图、25 个黄色 prose prompts、12 条起始
  参考文献，且不含作者名、路径、reviewer ID 或 AI-drafted narrative prose。
- 新增逐节 English authoring guide，定义 4,050-5,050 词预算、冻结事实、引用目标、限制、
  禁用主张和 Ronnie 后续逐段写作流程。

### v1.40 - 2026-08-23

- 完成 application-video 素材技术审核：44 条 MP4、两份正式证书 PDF、旁白 WAV 与
  GarageBand raw regions 均可用；原始手机文件名无需人工修改。
- 确认 applicant 正式英文姓名为 `Haoran Zhu`；participant、家庭场地、证书与当天拍摄
  素材可用于大学申请/portfolio，A03 Take 3 通过，没有 take 被明确排除。
- 锁定后续 S01-S04 与论文 Demo 界面图只使用 2026-08-23 项目自采素材，不再使用网络
  下载视频；生成 160/160 pose-ready 的 MediaPipe landmarks、去 location metadata 的
  1080p H.264 proxy 与最低点匿名固定帧。
- 重新生成 Workbench、Study Mode 和 quantitative-feature 三张界面图；raw video 与
  raw pose 继续保持私有，演示素材不进入 Phase I benchmark。
- 背景音乐保留为后期可选项，只使用舒缓、无歌词、授权清晰且不遮挡 narration 的音轨。

### v1.39 - 2026-08-22

- 从 canonical Markdown 生成两份 print-ready PDF：12 页 A4 landscape 拍摄计划和 9 页
  A4 portrait 现场脚本。
- Shot plan 对 18 个 time-coded units 使用可读列宽、重复表头和逐页 section bands；script
  使用 timecode cards、画面提示与 narration blocks。
- 通过全页 contact-sheet 与关键页高分辨率检查，修正旁白标签页尾孤行；确认无截断、溢出、
  黑块或不可读字符。
- 新增可重复渲染脚本 `scripts/render-ai-fms-video-print-pdfs.mjs`。

### v1.38 - 2026-08-17

- 新增 application video asset and shot plan，以 timecode 表明确每段画面形式、素材来源、
  制作方法、owner、rights 和验收要求。
- 规定 A-roll、七动作 montage 与 evaluator-practice B-roll 的构图、收音、机位、take 和
  consent；证书原件进入 private archive，公开版遮挡 identifier。
- 明确 Workbench/Study screen recording、Phase I results card、四张研究图和 end card 的
  source-of-truth、生成方式和禁止扩展主张。
- 给出半天拍摄安排、人员分工、Git-ignored production folder、文件命名和 final review gates。

### v1.37 - 2026-08-17

- 保留已认可的 AI-FMS 系统与研究主体，新增 Ronnie 出镜的 opening/closing 和中段实践转场。
- Opening 依次说明 FMS 七动作与 0-3 screen、Level 1/Level 2 certification、实际评估
  经历及由实践问题引出 AI-FMS；closing 说明个人角色、反思、收获和大学后研究方向。
- 正式交付调整为 4:15-4:30 Master、约 3 分钟压缩版和 60 秒 teaser；全程由 Ronnie
  narration，证书和实践画面进入 rights/privacy 清单。
- Application copy、project-page copy、claim-control 和 human-input form 同步增加
  certification 事实与不过度扩展边界。

### v1.36 - 2026-08-17

- 将 application copy、claim-control table、project-page copy 和 3 分钟/60 秒 demo
  script 统一到当前七动作系统叙事及冻结 Phase I 数字。
- 新增 canonical output index，明确公开申请、论文研究与私有证据三层交付物及用途。
- 新增 Ronnie GitHub transfer checklist；当前仓库保持 PRIVATE，待 main/release、rights
  与 clean-clone 审计完成后迁移所有权。
- 记录中文论文整体框架已获认可，后续以细节 polish 和输出适配为主。

### v1.35 - 2026-08-17

- 根据内部审阅反馈，Workbench 与 Study Mode 截图恢复真实动作视频帧；Workbench 同时
  保留对齐的 MediaPipe pose overlay，不再使用黑色 pose-only 占位画面。
- 截图继续移除源文件名、score-bearing notes 与具体 reviewer IDs；含人物界面图在
  frame-level rights 确认前只用于内部审阅，无法授权时改用项目自有并取得同意的视频。

### v1.34 - 2026-08-17

- 将旧的局部、留白过多界面图替换为真实浏览器生成的完整 Workbench、Study Mode 和
  quantitative feature 三张 publication-safe screenshots。
- Workbench 图展示 AI-FMS 品牌、pose-only evidence、AI suggestion、两位 reviewer、
  segment metadata、timing 和七 rep；Study Mode 图展示完整盲评 controls。
- 截图脚本在该版自动隐藏人物帧、源文件名、score-bearing notes 和具体 reviewer IDs；
  人物帧策略已在 v1.35 根据内部审阅反馈调整。当前中文 PDF 为 24 页，正式英文正文将把
  Study Mode 图转入 supplement。

### v1.33 - 2026-08-17

- 将中文论文从“同分信息恢复主线”重构为“七动作系统开发、Phase I 评估、secondary
  research findings”三层叙事；标题不再强调四动作。
- 新增人工评分问题-系统功能表、七动作 capability table 与 public-safe Workbench 图；
  四动作结果保留为 Phase I evaluation 和进一步科研用途。
- 输出 v0.2 23 页中文内部审阅稿；正式 NHSJS 英文稿将把详细案例表和附录移入 supporting
  material，以满足 12 号字体、20 页正文限制。

### v1.32 - 2026-08-17

- 从冻结研究证据生成完整中文论文审阅稿，包含正文、10 个表/图组、声明、参考文献和附录。
- 输出 19 页 A4 PDF；通过逐页 PNG 视觉检查、文字提取、页数、图表与页眉页脚 QA。
- 该文件仍是 internal manuscript draft，不是 NHSJS submission，也不是 peer-reviewed
  publication；正式英文稿继续等待期刊 AI-use/ethics/preprint 书面确认。

### v1.31 - 2026-08-17

- 将 peer-reviewed manuscript 正式加入 G4 交付物，主目标为 NHSJS expedited review。
- 明确 Zenodo 只能在 NHSJS 书面确认 preprint policy 后发布，且不得称为 peer reviewed。
- 建立投稿规则、询问信和 manuscript evidence map；在 AI-use policy 未确认前不生成或
  提交可能违反期刊政策的最终 AI-written manuscript。

### v1.30 - 2026-08-17

- 交叉校准 technical report、dataset card、methods/ethics、README、application copy、
  evidence table、长期 roadmap 与 backlog，确认冻结数字和研究边界一致。
- 将 G4 更新为收尾输出阶段，明确 Phase I 不再以新增样本或调参作为交付阻断。
- 新增最终交付物、目标形态、公开/私有层级和具体应用途径矩阵。
- 修正旧的两图、pair-case 和 AI-assisted Round B 研究问题表述。

### v1.29 - 2026-08-15

- 重新审计完整 110-rep pool，确认四动作不适合使用同一种两-rep 对比模板。
- Deep Squat 使用 15 条侧视 rep 与 source-median sensitivity；ASLR 使用同源四-rep
  左右侧序列；Hurdle 使用五条独立盲评 2 分的四-pathway taxonomy；Rotary 使用八-rep
  cycle-event matrix。
- 升级既有 application-figure generator 和 source config，输出 4 张 checksum 保护的
  无人物图；同步 technical report、README、application copy、evidence table 与 backlog。

### v1.28 - 2026-08-15

- 将四个同分案例由“参数对比”提升为“定量观察、movement profile、探索性功能假设”
  三层解释。
- 增加 mobility、stability、coordination 和 compensation pattern 的定向复核意义，
  同时明确这些是假设，不是医学诊断或已确认功能障碍。
- 同步 technical report、案例组合、README、application copy、evidence table 与 backlog。

### v1.27 - 2026-08-15

- 根据项目详细 review，重新审计 Quantitative Movement Findings 的论证一致性。
- 保留 Deep Squat 同分异型主案例；将 ASLR、Hurdle 和 Rotary 改为经过两轮分数稳定性、
  pose/timing 与机位条件复核的同分定量对照。
- 将 ASLR 主体/峰值识别、Hurdle 机位/trajectory 缺口和 Rotary 触踝边界移回
  measurement QA 与 Limitations，不再把技术困难作为主要科学发现。
- 同步 Abstract、README、application copy、案例组合与 backlog，并明确四案例证据等级。

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
