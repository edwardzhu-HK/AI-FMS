# AI-FMS Phase I Methods、Limitations 与 Ethics

## 1. 研究定位

本项目是一项应用导向的 exploratory pilot。研究对象是 FMS 视频 review workflow 和
pose-derived movement evidence，不是疾病、疼痛或受伤风险。主要问题是：

1. 能否把视频、rep、人工评分、pose 参数和 AI suggestion 连接成可追溯证据链？
2. 同一 FMS RAW SCORE 内是否存在可描述的连续 quantitative differences？
3. 当前规则式 AI 在什么地方能辅助 reviewer，什么地方必须 fail closed？

## 2. 数据构建

28 个 cumulative history exports 经过结构化解析和 checksum 去重。稳定 ID 使用内容与
lineage 字段派生，不复用旧 mock session 中重复的 `vid_0001` 等临时 ID。

Canonical snapshot 保留：

- 原始 history lineage；
- video、pose 与内容 checksum；
- rep timing、action、camera/side/protocol metadata；
- 历史人工 label 和 legacy AI 只作 provenance；
- 冲突、缺失、歧义和 asset resolution 状态。

## 3. Pose 与 Feature Extraction

MediaPipe Pose Landmarker 对本地视频生成 time-aligned landmarks。Movement adapters
读取脱敏后的 pose payload，不接收 score-bearing filename 或人工 notes。

Feature quality gate 综合：

- pose frame coverage 与 missing-frame ratio；
- average visibility；
- timing cycle 是否存在及 coverage；
- camera-view-dependent feature 是否适用；
- 多人物画面中的 target subject/ROI QA。

ASLR 另运行 label-free side/peak evidence gate。它在 segment 内检查连续强抬腿帧、
dominant pose side 和左右切换率，不读取人工分数或文件名。17 条记录对应 16 个独立
窗口：11 `good`、2 `watch`、3 `limited`；`limited` 不进入自动总分比较。

Subject-aware sensitivity 对 3 个原 `limited` 窗口使用受试者 ROI / inference crop，
在不改变模型和质量门的情况下得到 1 `good`、2 `watch`、0 `limited`。该结果作为独立
sensitivity 保存，不覆盖冻结基线、feature matrix 或 post-review AI benchmark。

不满足门槛的 rep 保留在 canonical pool，但标记为 feature-limited，不进入需要可靠
quantitative evidence 的分析。

## 4. Blindability 与正式样本

每条 rep 通过三帧 contact-sheet QA。直接数字分数、明确评分指导、错误主体或动作不可见
会 fail closed。通过 blindability 与 feature-readiness 双门槛的 58 条构成正式候选池。

Formal N=32 使用 deterministic balanced selection：四动作各 8 条，并尽量分散源视频。
因此它是目的性平衡样本，不是对 110 条总体的简单随机抽检。

Reviewer manifest 只暴露匿名 media alias、action、timing 和必要 protocol 字段；隐藏
源文件名、历史分数、legacy AI 和 reviewer 之间的结果。音频强制静音。

## 5. Review Protocol

Round A 和 Round B 均为 blind human review。Round B 在至少 48-72 小时间隔后使用
重新随机的队列，用于观察 score、confidence 和 review-time 的 test-retest
change。两轮使用不同 storage key 和显式 `studyRound`，禁止事件覆盖。
Round B 不显示 AI score、AI confidence、pose-derived features 或任何历史人工结果。

Review event 为 append-only：修改产生新 event，并通过 `supersedesEventId` 连接。
Reviewer 可以给 0-3 RAW SCORE 或 `unscorable`。0 仅限 pain evidence；动作或协议条件
不足不能写成 0。

## 6. 分析方法

### 人工一致性

- Status/scoreability agreement 使用全部 32 条。
- RAW SCORE agreement、MAE、confusion matrix 和 weighted Cohen's kappa 只使用双方
  均给出数值分数的 reps。
- Unscorable reason taxonomy 单独报告。
- Reps 同源相关；不把 32 条视为 32 个独立参与者。

### Quantitative Profiles

- 66 条 feature-ready reps 先按 action 独立做 robust z-score。
- Deterministic k-medoids 和 silhouette 只用于探索性描述。
- 检查同源视频距离、source-video effect 和 leave-one-video-out stability。
- Round A score 在 groups 冻结后才 post-hoc overlay，避免标签塑造分组。

### AI 与人工共识

- 对全部 110 条 camera-audited feature rows 先独立生成 suggestion。
- `notes` 和 `fileName` 为空；人工 score、reviewer comment 与 legacy AI 不进入 builder。
- 之后才按稳定 repetition ID 连接 26 条 Round A consensus。
- Rotary Stability feature-only 与 Deep Squat staged gate 不当作错误分数。
- Targeted audit 补入的 protocol metadata 只进入单独 sensitivity，不覆盖 baseline。

## 7. 多重证据等级

项目避免把所有数据称为 ground truth：

- Round A blind consensus：当前较强人工 evidence。
- Formal non-consensus：保留 scoreability 和 taxonomy 边界。
- Historical scores：weak labels，只作数据利用与未来 audit 候选。
- Pose features：quantitative evidence，不是人工 label。
- AI suggestions：rules-based exploratory output，不是 gold label。
- File-name score cues：只作 lineage/leakage QA，禁止进入模型输入。

## 8. 主要限制

### Sampling

- 28 个视频和 110 reps 不代表 110 名独立参与者。
- 来源多为公开视频或教学材料，选择机制不可控。
- Rotary、ASLR 和低分动作的独立源视频不足。
- 没有人口统计、训练背景或 clinical outcome，不能做 subgroup 或 outcome inference。

### Measurement

- 2D pose 受视角、遮挡、透视和 landmark jitter 影响。
- Camera metadata 曾有 45/110 错误，说明旧字段不能未经审计直接使用。
- ASLR 的 16 个独立窗口中有 3 个暴露 active-side/peak selection、错误主体或遮挡
  风险；subject-aware sensitivity 能恢复连续信号，但尚未在独立多人视频上验证。
  平均 visibility 仍不能替代 identity/trajectory QA。
- Hurdle 当前缺少全周期膝踝轨迹、动态 trunk 与 dowel orientation。
- Deep Squat 依赖 floor/board staged metadata，缺失时必须拒绝最终分。

### Validation

- 两位 reviewer 的一致性不能替代 expert panel 或外部验证。
- 规则开发可能接触过同一公开视频，不是 held-out evaluation。
- Round A 不能同时用于调阈值和报告改进后的 performance。
- Label-free groups 受 source signature 和小样本影响，不能命名为功能障碍亚型。

## 9. Ethics 与发布规则

- 项目描述使用 movement screening、annotation、pose-based features 和
  AI-assisted review，不使用 diagnosis 或 injury prediction。
- Pain 由人工观察或报告，不由模型推断。
- 对外材料必须说明数据规模、来源依赖和未完成 Round B 的状态。
- 未完成 rights/consent/privacy audit 的视频、人物画面和 reviewer comments 不公开。
- 公开图表只显示聚合值、稳定 ID 或经批准的去标识截图。
- 不发布本地绝对路径、raw review events、raw landmarks 或 SQLite 数据库。
- 任何未来 supervised model 都需要独立训练/验证划分，并以 source video 或 participant
  为分组单位，防止同源泄漏。

## 10. Round B 前冻结规则

Round B 前允许修复：数据读取 bug、checksum/schema validation、明确的 protocol metadata
通路和 UI 可用性问题。

Round B 前不允许：依据 Round A 分数移动 ASLR/Hurdle thresholds、删除不利样本、改变
formal rep IDs 或把 post-hoc sensitivity 替代冻结 baseline。

当前 AI v1.0 benchmark package 已在人评前冻结：32 条均有定量特征，
18 条通过 AI v1.0 总分 gate，8 条 Rotary 保持 feature-only，6 条 Deep Squat
因缺少完整 attempt-condition metadata 不输出总分。该包不被 Study Mode 请求。
正式 Round B event 必须记录 `evidenceReview: null`、`currentPoseEvidenceShown:
false` 和 `currentAiSuggestionShown: false`。两位 reviewer 完成前不用 Round B
结果修改 AI v1.0；完成后才计算 A/B change 和 AI-vs-human exploratory concordance。

最终报告应同时保留 negative/null findings。当前最可信的贡献是可解释证据和研究流程，
不是自动评分性能。
