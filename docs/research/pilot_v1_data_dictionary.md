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
- `cameraView`、`side`、`attemptCondition`：动作与协议 metadata。
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
- 新 Study Mode 的 Ronnie/Edward 双轮审核必须保存为独立 review events，不能覆盖本历史快照。

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

## 8. 公开边界

当前生成物标记为 `private_research_snapshot`。公开申请包只应包含获授权样本、聚合统计、schema、方法、限制和脱敏图表。是否公开原视频、逐 rep 标签或 reviewer identity，必须另行确认。
