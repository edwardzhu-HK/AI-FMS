# AI-FMS 四动作 Pilot V1 数据字典

## 1. 数据定位

本数据集是 AI-FMS Phase I 的私有研究快照，用于动作标注、pose-based
feature 分析和 human-in-the-loop 审核研究。它不是临床数据集，也不能用于医疗诊断、损伤风险预测或功能障碍确诊。

生成入口：

```bash
npm run data:pilot:build
```

输入来自本地 `Ingested-data/`，生成物位于被 Git 忽略的
`research/pilot-v1/generated/`。所有资产路径均为仓库相对路径。

## 2. 基线范围

| 项目                 | 数量 |
| -------------------- | ---: |
| 原始 history 文件    |   28 |
| entry occurrence     |   50 |
| 去重后 ingest        |   29 |
| 唯一视频             |   28 |
| rep                  |  110 |
| Deep Squat rep       |   34 |
| Hurdle Step rep      |   41 |
| ASLR rep             |   17 |
| Rotary Stability rep |   18 |

同一 entry 在累计导出文件中重复出现时，使用原始 `entry.id` 去重，并比较规范化内容 hash。若同一 ID 出现不同内容，构建立即失败，不自动选择版本。

## 3. 核心实体

### `videos`

- `videoId`：由动作和解析后的相对路径生成的稳定 ID。
- `actionType`：四个动作之一。
- `relativePath`：本地仓库相对路径，不包含用户目录。
- `durationSecond`：通过 ffprobe 读取的视频时长。
- `sha256`：资产内容 checksum。
- `status`：`found`、`ambiguous`、`missing` 或 `not_referenced`。

### `ingests`

- `ingestId`：由原始 history entry ID 生成的稳定 ID。
- `videoId`：关联 canonical video。
- `sourceHistoryFiles`：该 entry 出现过的全部原始导出文件。
- `sourceOccurrenceCount`：累计导出中的出现次数。
- `originalIds`：保留原 `entryId`、`ingestBatchId` 和 `videoId`，只用于 lineage。
- `apiMode`：历史记录当前均为 `mock`，不代表数据库持久化。

### `repetitions`

- `repetitionId`：由 ingest、原 segment、顺序和时间范围生成的稳定 ID。
- `startSecond` / `endSecond`：最终审核片段范围。
- `originalStartSecond` / `originalEndSecond`：初始建议范围。
- `cameraView`、`side`、`attemptCondition`：历史动作与协议 metadata；其中
  `cameraView` 保留原始 lineage，不直接作为分析真值。
- `auditedCameraView`：由 `camera-view-overrides.json` 与完整 contact-sheet QA
  生成的分析机位字段，取值为 `front`、`side` 或 `mixed`。需要机位分层时通过
  `repetitionId` 连接使用，不覆盖 canonical `cameraView`。
- `camera-audited feature matrix`：使用 `auditedCameraView` 重建的 sensitivity
  layer。它保留 `sourceFeatureMatrixFingerprint` 指向 Round A 冻结 matrix，不修改
  formal manifest；新的 AI evidence 和机位分层优先使用此层。
- `round-a-ai-evidence`：先对 110 条审计后 feature rows 独立运行现有规则，再连接
  Round A 人工共识的 exploratory concordance 层。只有 feature-ready 且规则实际给出
  总分的 row 进入比较；Rotary feature-only 和 Deep Squat protocol gate 单独记录。
- `round-a-targeted-ai-audit`：对九条 actionable follow-up 的 5 帧视觉、双 reviewer
  描述、pose feature 和规则路径复核。确认的 Deep Squat `attemptCondition` 只进入
  单独 post-audit sensitivity，不覆盖冻结 baseline，也不用于调整 ASLR/Hurdle 阈值。
- `reviewStatus`：历史 workflow 中的 rep 审核状态。
- `humanReviews`：Reviewer A/B 的原始审核记录。
- `humanReviewSummary`：仅做机械汇总，不等于独立 adjudication。
- `legacyAiSuggestion`：旧 workflow 的 AI 字段，仅保留 provenance。

## 4. ID 规则

Canonical ID 使用 SHA-256 派生的 12 位十六进制前缀：

- `vid_<hash>`
- `ing_<hash>`
- `rep_<hash>`

原始 `vid_0001`、`ing_0001` 和 `seg_0001` 在不同 mock 会话中重复使用，不能作为跨文件主键。

## 5. 人工标签

- `reviewer_a` 多数记录来自视频中已有教练评分或参考分数。
- `reviewer_b` 是 Ronnie 的历史复核。
- 历史两名 reviewer 的 criteria fields 常由 total score 展开，不能解释为三个维度都经过独立判断。
- `humanReviewSummary.consensusScore` 只表示两个现有数值相同，不表示经过独立、盲法或专业 adjudication。
- 新 Study Mode 的 Ronnie/Other Reviewer 双轮审核必须保存为独立 review events，不能覆盖本历史快照。

## 6. 旧 AI 分数边界

旧 workflow 可能从带分数的文件名和 notes 中读取答案。因此：

- `legacyAiSuggestion.provenanceStatus` 固定为 `label_leakage_confirmed`。
- `legacyAiSuggestion.eligibleForAccuracyAnalysis` 固定为 `false`。
- 旧 AI 分数不能用于 accuracy、agreement、validation 或模型优越性结论。
- 后续 AI evidence 必须来自 pose、定量 feature 和有版本记录的规则。

## 7. 生成文件

- `canonical-pilot.json`：完整 canonical snapshot。
- `canonical-repetitions.csv`：用于统计分析的扁平 rep 表。
- `asset-manifest.json`：29 个 ingest entry 的视频与 pose 解析结果。
- `qa-report.md`：数量、review coverage、缺失 pose 和解释边界。
- `SHA256SUMS`：上述生成物的 checksum。
- `blindability-manifest.json`：每个 rep 的盲审资格、pending fields 和排除原因。
- `blindability-candidates.csv`：供内部 QA 和样本策展使用的扁平清单。
- `blindability-qa-report.md`：按动作汇总 eligible、pending 和 excluded。
- `blindability-previews/`：每个 rep 起始、中间、结束帧组成的私有 QA contact sheets。
- `formal-study-manifest.json`：Study Mode 使用的 32-rep Reviewer-safe 冻结清单。
- `formal-study-internal-manifest.json`：保留 source correlation 和历史分层摘要的私有 lineage 清单。
- `formal-study-SHA256SUMS`：两份正式 study manifest 的 checksum。
- `formal-study-previews/`：32 个正式 rep 的最终 contact-sheet 检查。
- `quantitative-feature-matrix.json/.csv`：110 个 rep 的无标签定量 feature 矩阵。
- `feature-matrix-qa-report.md`：按动作汇总 ready 和 limited，并保留质量原因。
- `feature-matrix-SHA256SUMS`：JSON/CSV feature matrix checksum。
- `dry-run-study-manifest.json`：与正式事件隔离的四动作 workflow 测试队列。
- `study-review-export.schema.json`：Round A/B review export V2 的结构契约。
- `round-a-agreement/`：两份签名 Round A export 生成的私有 reviewer
  comparison、agreement report、adjudication queue 和 checksums。

Blindability 将两类视觉线索分开记录：

- `visualLabelCue`：画面中直接出现 0-3 分或等价答案；出现即排除。
- `instructionalVisualCue`：区分无提示、仅动作名称和评分教学字幕；评分教学字幕即使没有直接给出答案，也从正式盲评中排除。

画面 QA 使用每个 rep 的起始、中间、结束帧 contact sheet。正式 reviewer
仍可在 Study Mode 中标记未被抽帧捕获的边界、可见性或 label-cue 问题。

## 8. Study Review Event V2

正式审核使用 append-only `ai_fms_study_review_event_v2`：

- `studyRound`：`round_a`、`round_b` 或 `dry_run`，同时参与随机队列和浏览器存储隔离。
- `reviewStartedAt`：当前 rep 审核 session 的 UTC 开始时间。
- `reviewDurationMs`：页面处于前台时累计的审核时间；不把后台停留计入 review time。
- `supersedesEventId`：修改评分时指向被替代事件，旧事件仍保留。
- `blindReview`：保存 Round A 的隐藏边界和 label-cue QA。
- `status`：`scored`、`unscorable` 或 `deferred`。`scored` 和
  `unscorable` 都属于已处理，只有 `scored` 进入分数分析。
- `scoreZeroReason`：RAW SCORE 为 `0` 时必须是
  `pain_observed_or_reported`；不能用 `0` 代替视频条件不足。
- `unscorableReason`：无法独立评分时记录动作不可见、缺少参照物、缺少必要
  protocol condition、片段时间无效或其他原因。
- `eligibleForBlindAnalysis`：Round A 和 Round B 中的 scored event 在无 label cue 时为
  `true`；`unscorable` 或 label-cue event 为 `false`。
- `evidenceReview`：正式 Round A/B 必须为 `null`。校验器会拒绝任何在 Round B
  展示当前 AI suggestion 或 pose-derived evidence 的 event。

`ai_fms_study_review_export_v2` 同时保存 frozen repetition IDs、source
fingerprints、完整 event log 和 `completion`。只有 `completion.complete=true`
且 CLI validator 通过的 32/32 文件可以冻结为正式 reviewer 输出。32/32
表示 32 条均已处理，可以由 `scored` 与 `unscorable` 共同组成；统计分析必须
另行报告 scored 与 excluded 数。JSON 必须与页面生成的 `.sha256` 文件成对保存。

### 8.1 本地研究数据库

完整导出通过 `npm run study:reviews:ingest -- <review.json>` 写入被 Git 忽略的
`Ingested-data/ai-fms-study-reviews.sqlite`。数据库使用 Node 内置 SQLite，包含：

- `study_review_exports`：签名导出的 hash、来源、完成统计和原始 JSON；
- `study_review_events`：按 `eventId` 不可变保存全部 append-only events；
- `study_review_export_events`：导出与 event 的顺序关联；
- `study_review_evidence_reviews`：仅保留为历史/实验性子表；正式 blind Round B
  不写入该表；
- `study_review_schema_migrations`：本地 schema 版本。

SQLite 用于本地查询与后续分析，不取代成对 JSON/SHA-256 的冻结交付物。相同
export hash 重复导入是幂等操作；同一 `eventId` 内容冲突时事务回滚。

截至 2026-08-09，数据库为约 1.3 MB、UTF-8、4 KB page 的 SQLite 3 文件。审核层
包含 2 个完整 export、78 个不可变 event 和 78 条 export-event 顺序关联。两个
export 合计形成 64 个 reviewer-repetition 最终状态：53 个 `scored`、11 个
`unscorable`。数据库会保留 superseded event、comment、quality flags、
blind-review metadata 和原始 event/export JSON，因此属于私有研究数据，不进入 Git。

Full-pool 层包含 1 个 fingerprint-traceable snapshot、110 条
`pilot_repetitions` 和 110 条 `pilot_quantitative_features`。冻结 JSON/SHA-256
继续作为 source of truth；SQLite 是幂等、可查询的镜像，不取代 canonical
JSON/CSV、pose、视频或 manifest。

### 8.2 双 Reviewer Agreement

`npm run study:reviews:agreement -- <review-a.json> <review-b.json>` 会再次验证
两份相邻 SHA-256、完整 manifest 和 event contract，再生成：

- 32 条上的 `scored`/`unscorable` outcome agreement；
- 仅在双方都 scored 的 rep 上计算 RAW SCORE agreement、linear/quadratic
  weighted Cohen's kappa、mean absolute difference 和 0-3 confusion matrix；
- 双方都 unscorable 时的原因分类一致率；
- scoreability、RAW SCORE 和 unscorable reason 的私有 adjudication queue。

`unscorable` 不转换成数值分数。某动作的共同评分样本没有分数边际变化时，
action-level kappa 记为 `N/A`，但 exact agreement 仍可报告。

### 8.3 Round A Quantitative Movement Profiles

`npm run study:profiles:round-a` 会校验 agreement package 与 quantitative
feature matrix 的 SHA-256，再以 `repetitionId` 关联双方同分的 26 条 rep。脚本
输出 consensus feature table、按动作/分数的描述统计、探索性 Hedges' g、同分
不同 profile 候选、中文报告和 checksums。Visibility 与 timing coverage 等
quality feature 不进入 profile distance；legacy AI score、历史 score hint 和
reviewer comment 不进入定量计算。

输出位于被 Git 忽略的
`research/pilot-v1/generated/round-a-movement-profiles/`。Round B 不属于该输入，
因此后续可以扩展分析而不改写冻结的 Round A 证据。

### 8.4 110-Rep Full-Pool Utilization

`npm run data:pilot:utilization` 会校验 canonical、feature matrix、formal
manifest 和 Round A agreement 的 checksum/fingerprint，并强制保留全部 110 个
canonical repetition ID。输出包括：

- 110-rep evidence-tier CSV；
- 66 条 feature-ready rep 的 label-free quantitative summary；
- 28 个源视频的聚类/重复计数表；
- 中文 full-pool utilization report 和 SHA-256。

六个研究层级分别为：26 条 `gold_consensus`、6 条
`formal_non_consensus`、26 条 `expansion_candidate`、8 条
`feature_ready_not_blindable`、39 条 `blindable_feature_limited` 和 5 条
`not_blindable_feature_limited`。历史分数统一保留为
`legacy_weak_label_pending_gold_audit`，Round B 后完成 gold audit 之前不能作为正式
validation label。

`npm run data:pilot:db:ingest` 将同一 snapshot 幂等写入本地 SQLite；
`npm run data:pilot:db:status` 查询最新 snapshot。相同 source hashes 重复执行不会
生成第二份数据。

### 8.5 66-Rep Label-Free Profile Discovery

`npm run data:pilot:profiles:label-free` 从已校验的 full-pool sources 重建 66 条
feature-ready rep 的动作内 quantitative map。距离只使用 movement features；
historical score、Round A score、reviewer comment、visibility 和 timing quality
fields 均不参与标准化或分组。方法包括 median/MAD robust z-score、deterministic
k-medoids、silhouette、同视频/跨视频距离比和 leave-one-video-out 稳定性。
Group count 按动作内样本量预设为 2 或 3，仅用于探索性描述，不表示通过模型选择
确认了自然类别数。

输出位于被 Git 忽略的 `research/pilot-v1/generated/label-free-profiles/`，包括：

- 66-rep assignment、group、outlier 和 source-effect CSV；
- 四动作 robust-z SVG heatmap；
- 分组冻结后才叠加的 26-rep Round A consensus crosswalk；
- 带视频相对路径和时间段的人工复核优先队列；
- JSON、中文报告和 SHA-256。

探索性 group 不是功能障碍、临床表型或诊断类别。当前 3/7 个 action-score strata
跨越多个 group，但分别受到 singleton outlier、source-video signature 或独立来源
不足限制；可报告结论是 ordinal score 内存在多维定量异质性，而不是已经验证出离散
障碍类型。

## 9. 公开边界

当前生成物标记为 `private_research_snapshot`。公开申请包只应包含获授权样本、聚合统计、schema、方法、限制和脱敏图表。是否公开原视频、逐 rep 标签或 reviewer identity，必须另行确认。
