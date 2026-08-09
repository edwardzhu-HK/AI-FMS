# Round A AI Evidence 与人工共识评估

## 研究问题

在不读取历史文件名分数、旧 AI score、人工 score 或 reviewer comment 的前提下，
现有 pose-derived evidence 和冻结规则能否生成可解释的建议分数？这些建议与 Round A
双方同分共识的关系如何？

这不是模型准确率验证。运行时标签已经隔离，但现有规则的早期开发可能接触过同一批
公开视频，因此不存在严格独立的 held-out evaluation set。目标是判断当前 AI 层适合
承担什么角色，以及下一步应优先修复规则、metadata，还是定向补采数据。

## 防泄漏方法

1. 对 camera-audited feature matrix 的全部 110 条先独立运行现有 movement adapter
   和 suggestion builder。
2. Suggestion builder 的 `notes`、`fileName` 固定为空，不传入历史人工评分、legacy
   AI score 或 reviewer comment。
3. 只有建议生成完成后，才按 `repetitionId` 连接 26 条 Round A 双方同分共识。
4. 仅 `feature-ready` 且规则实际给出 0-3 总分的 rep 进入分数比较。
5. Rotary Stability 继续执行 feature-only 边界；Deep Squat 缺少 staged-attempt
   metadata 时按 FMS 规则拒绝生成最终分。

## 结果

| 指标                     |         结果 |
| ------------------------ | -----------: |
| 全部 canonical reps      |          110 |
| Feature-ready reps       |           66 |
| 全池严格可生成 AI 总分   |           36 |
| Round A 双方同分共识     |           26 |
| Round A 可比较 AI 总分   |           16 |
| 完全同分                 |  9/16，56.3% |
| 相差不超过 1 分          | 14/16，87.5% |
| Mean absolute difference |       0.5625 |
| Linear weighted kappa    |      -0.0588 |
| Quadratic weighted kappa |      -0.1556 |

Round A 未进入总分比较的 10 条由两类明确边界构成：8 条 Rotary Stability
feature-only，以及 2 条 Deep Squat 缺少 floor / heels-elevated board
`attemptCondition`。

### 按动作

| 动作             | Consensus | 可比较 | 完全同分 | 相差不超过 1 分 |    MAE |
| ---------------- | --------: | -----: | -------: | --------------: | -----: |
| ASLR             |         6 |      6 |      4/6 |             4/6 | 0.6667 |
| Deep Squat       |         4 |      2 |      1/2 |             2/2 | 0.5000 |
| Hurdle Step      |         8 |      8 |      4/8 |             8/8 | 0.5000 |
| Rotary Stability |         8 |      0 |      N/A |             N/A |    N/A |

## 主要发现

### 1. 定量参数有价值，但当前总分规则尚不可靠

16 条可比较样本只有 9 条完全同分，weighted kappa 为负。样本很小、来源视频不独立，
且不构成 held-out validation，因此不能把该数字外推为模型准确率；但它足以排除“当前
规则已经可以替代人工评分”这一表述。项目更可信的定位仍是 AI-assisted quantitative
evidence，而不是自动诊断或自动替代 reviewer。

### 2. ASLR 是最高优先级规则复核点

两条人工 3 分被 AI 判为 1 分，均涉及 stationary-leg control proxy。两条来自不同
源视频，因此不能只用单一视频异常解释。应先做逐帧动作定义和阈值复核，不能直接用这
26 条标签重新调参并报告同一批数据上的“改进准确率”。

### 3. Hurdle Step 缺少部分人工定性扣分信息

人工 2 分的 4 条中，AI 有 3 条判为 3 分；人工 3 分的 4 条中，AI 有 1 条判为 2 分。
这说明现有几何 proxy 能描述动作，但没有完整覆盖 hurdle contact、balance、pelvis/trunk
control 等人工判分依据。后续复核应连接视频时间段和 reviewer note，而不是只改一个
阈值。

### 4. Deep Squat 首先是 metadata 问题

全池 31 条 feature-ready Deep Squat 中，只有 9 条满足当前最终分生成条件，22 条因
缺少 staged-attempt metadata 被规则门禁。Round A 中也有 2/4 因此不产生最终分。
另有 1 条可比较 rep 比人工共识高 1 分。应建立直观的 `floor` /
`heels_elevated_board` 标注流程，并复核该分数差异；禁止从带分数文件名反推。

### 5. Rotary Stability 的保守策略正确

8 条 Round A 共识均保留角度、位移和动作 profile，但没有生成未经验证的 AI 总分。
这不是“缺数据”，而是当前研究边界的一部分。

## 下一步决策

1. 逐帧复核 2 条 ASLR 大分差、4 条 Hurdle 分歧和 1 条 Deep Squat 分数差异，判断
   是阈值、动作定义、机位还是 pose tracking 问题。
2. 复核 2 条 Deep Squat protocol gap，并建立友好的 staged-attempt metadata
   补录界面和可审计输出。
3. 在上述复核前不定向采集大量新数据；复核后再决定是否优先补充独立来源的 ASLR
   1/2 分与 Hurdle 2/3 分视频。
4. Round B 继续使用当前冻结 evidence，不因本次对照结果临时调参，避免污染两轮比较。

## 可复现证据

- 命令：`npm run study:ai-evidence:round-a`
- 输出：`research/pilot-v1/generated/round-a-ai-evidence/`
- 文件：analysis JSON、comparison CSV、follow-up queue CSV、中文报告和 SHA-256
- Rule fingerprint：`74d7b5d0ef59edc5785c5b39c61d30a65149eb4e35d1e01445a17c5e319818d8`
