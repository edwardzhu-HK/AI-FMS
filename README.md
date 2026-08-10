# AI-FMS

AI-FMS 是一个 **AI-assisted、human-in-the-loop 的 Functional Movement
Screen 视频标注、定量动作特征和研究数据平台**。它帮助 reviewer 对视频中的动作
rep 进行切分、盲法评分、pose evidence 检查、分歧复核和可追溯导出。

项目不进行医疗诊断、伤病风险预测或自动 pain detection，也不替代 certified FMS
professional。当前 AI 总分是可解释的研究性提示层，不是经过独立验证的自动评分器。

## 当前阶段

| 项目                 | 当前状态                                     |
| -------------------- | -------------------------------------------- |
| 产品工作流           | 7 个 FMS movements 的 annotation workflow    |
| 核心研究数据         | 4 个动作、28 个唯一视频、110 个 reps         |
| Pose/feature 数据    | 29/29 pose assets；66/110 feature-ready      |
| 正式盲审             | 32 reps，四动作各 8；Round A 已完成          |
| Round A 人工证据     | 26 条双方均可评分且同分的 consensus reps     |
| AI/人工探索性比较    | 冻结基线 9/16 完全同分；不能表述为模型准确率 |
| ASLR pose 证据审计   | 16 个独立窗口：11 good、2 watch、3 limited   |
| ASLR ROI sensitivity | 原 3 个 limited → 1 good、2 watch、0 limited |
| Rotary AI v1.1       | Experimental；4/8 coverage，比较项 4/4 exact |
| 申请案例与图表       | 4 个受控案例；2 张无人物数据驱动图           |
| 当前等待项           | Round B 与最终结果冻结                       |

四个 pilot actions：

- Deep Squat
- Hurdle Step
- Active Straight Leg Raise
- Rotary Stability

Deep Squat 是旗舰的 staged FMS pipeline；ASLR 和 Hurdle 已有 pose-based first-pass
suggestion。人评前冻结的 AI v1.0 仅在 Round B 完成后用于比较，其中
Rotary Stability 保持 feature-only。独立 v1.1 experimental adapter 已能按完整
周期提出保守 1/2/3 分或 abstain，但不进入 reviewer Study Mode，也不是
独立验证结果。

## 项目价值

传统 FMS 使用 0-3 ordinal score 表达规则结果。AI-FMS 保留这个人工评分框架，同时
增加角度、相对距离、动作轨迹、稳定性 proxy 和 pose quality。项目目前最有价值的
发现不是“AI 可以代替人工”，而是：

> 同一个 FMS RAW SCORE 可以包含不同的动作完成程度和 movement strategies；
> pose-derived parameters 能把这些差异记录下来，供 reviewer 解释和后续研究。

首要案例是两条不同源视频的 Deep Squat：两条均因脚跟垫板得到人工 2 分，但
`peakDepthRatio`、hip/knee angle、ankle-shank lean 和 knee-ankle offset 明显不同。
这些参数是视频 pose-derived proxy，不是临床量角器测量，也不能直接命名为功能障碍。

申请案例组合同时保留不同类型的证据：Deep Squat 是同分异型主案例，ASLR 展示
subject selection 对测量可靠性的影响，Hurdle Step 说明 camera-view metadata gate，
Rotary Stability 说明证据不足时如何从 features-only 发展到 cycle-level first-pass，
同时继续拒绝对遮挡周期硬给总分。

![Deep Squat same-score movement profile](docs/assets/phase-i-case-studies/deep-squat-same-score.svg)

![ASLR subject-aware evidence quality](docs/assets/phase-i-case-studies/aslr-subject-aware-qa.svg)

## 系统组成

### Workbench

- React/Vite 本地应用。
- 视频上传、duration-aware 范围、rep 列表和 loop playback。
- Segment timing、camera view、side、Deep Squat `attemptCondition` 和 clearing/pain
  metadata。
- 真实 MediaPipe pose overlay、timing QA 和 movement-specific feature snapshot。
- Reviewer scoring、AI evidence、adjudication、JSON/CSV/package export。

### Study Mode

- Round A blind review 与 Round B 隔离 namespace。
- Round A 和 Round B 均隔离历史分数、AI 分数、pose-derived 参数、源文件名
  和音频标签提示。
- Round B 是间隔 48-72 小时后、重新随机的第二次独立盲评；冻结 AI v1.0
  只在签名导出完成后由分析脚本读取。
- Append-only review events、foreground review time、confidence、comment 和
  unscorable taxonomy；校验器会拒绝 Round B 中的 AI/pose evidence 暴露。
- 完整 export 的 manifest/fingerprint/schema/SHA-256 校验。
- 签名 JSON 进入本地 SQLite 研究数据库，导入按 checksum 幂等。

### Research Pipeline

- 28 个 history 文件去重形成 canonical pilot。
- 稳定 `videoId`、`ingestId`、`repetitionId` 与 asset checksum。
- 110-rep blindability、camera-view 和 feature-quality 审计。
- 66-rep label-free profiles、source-video effect 和 leave-one-video-out stability。
- 26-rep Round A consensus overlay、case-study queue 和 AI evidence comparison。
- 九条 AI/人工差异的 5 帧视觉复核与 protocol sensitivity。
- 全部 17 条 ASLR 记录的 label-free side/peak evidence audit。
- 三个 ASLR limited 窗口的 subject-aware ROI sensitivity 与两个 watch 视频 QA。
- Rotary v1.1 的两次 hand-to-ankle、肘膝伸展、离地时序、回位与 clearing gate；
  `npm run study:rotary:v1-1` 生成 checksum-protected internal benchmark。

## 研究证据边界

Round A 两位 reviewer 在双方都能评分的 26 条上 26/26 同分，weighted Cohen's
kappa 为 1.0000；这反映本轮人工审核一致性，不证明 AI 准确。

现有 AI 与人工共识比较：

| 分析                            | 可比较 | 完全同分 | 相差不超过 1 分 |    MAE |
| ------------------------------- | -----: | -------: | --------------: | -----: |
| 冻结基线                        |     16 |     9/16 |           14/16 | 0.5625 |
| Post-audit protocol sensitivity |     17 |    11/17 |           15/17 | 0.4706 |

Sensitivity 只补入画面与双 reviewer 共同确认的 Deep Squat floor/board metadata。
它是数据完整性修正，不是训练或 accuracy improvement。ASLR/Hurdle 阈值没有根据
Round A 结果调整。

ASLR subject-aware sensitivity 另把三个原 `limited` 窗口重提取为 1 `good`、
2 `watch`、0 `limited`。该结果说明部分失败来自 subject selection / crop；它不回写
冻结 evidence，也不属于 AI score accuracy improvement。

## 界面截图

![AI-FMS workbench overview](docs/assets/ai-fms-demo-overview.jpg)

![Deep Squat side-view angle features](docs/assets/ai-fms-demo-side-angle-features.jpg)

![Export evidence dashboard](docs/assets/ai-fms-demo-export-evidence.jpg)

## 本地运行

安装依赖并启动：

```bash
npm install
npm run dev
```

主要页面：

- Workbench：`http://127.0.0.1:5173/`
- Study Mode Round A：`http://127.0.0.1:5173/study.html?round=a`
- Study Mode Round B：`http://127.0.0.1:5173/study.html?round=b`
- Video Manager：`http://127.0.0.1:5173/video-manager.html`

本地 HTTP API stub：

```bash
npm run api:stub
npm run dev:real
```

质量门：

```bash
npm run check
```

当前质量基线为 lint、Prettier、328 tests 和三个 Vite entry builds。

## 研究复现

以下命令依赖本机被 Git 忽略的 `Ingested-data/`、视频和 pose assets。原始媒体不会
进入代码仓库。

构建 canonical 数据与 feature matrix：

```bash
npm run data:pilot:build
npm run data:pilot:features
npm run data:pilot:camera-views
npm run data:pilot:features:camera-audited
```

重建完整数据利用与 label-free profiles：

```bash
npm run data:pilot:utilization
npm run data:pilot:profiles:label-free
```

重建 Round A 分析：

```bash
npm run study:reviews:agreement -- /path/reviewer-a.json /path/reviewer-b.json
npm run study:profiles:round-a
npm run study:ai-evidence:round-a
npm run study:ai-evidence:audit-previews
npm run study:aslr:side-peak-audit
```

重建申请案例组合与无人物图表：

```bash
npm run release:phase-i:figures
```

研究数据库：

```bash
npm run data:pilot:db:ingest
npm run data:pilot:db:status
npm run study:reviews:db:status -- --pilot-id ai-fms-four-movement-core-2026-08-09 --round round_a
```

## 文档入口

- 统一计划：`docs/plans/ai_fms_4_week_closeout_plan_2026-08-09.md`
- Phase I dataset card：`docs/research/ai_fms_phase_i_dataset_card_2026-08-09.md`
- Methods、limitations 与 ethics：
  `docs/research/ai_fms_phase_i_methods_limitations_ethics_2026-08-09.md`
- Phase I technical report：
  `docs/reports/ai_fms_phase_i_technical_report_2026-08-09.md`
- Application copy：`docs/ai_fms_phase_i_application_copy_2026-08-09.md`
- Application evidence table：
  `docs/ai_fms_phase_i_application_evidence_table_2026-08-09.md`
- 数据字典：`docs/research/pilot_v1_data_dictionary.md`
- Round A agreement：私有 generated report + checksum，主要数字已进入 technical report
- AI/人工比较：`docs/research/round_a_ai_consensus_evidence_2026-08-09.md`
- 九条差异复核：
  `docs/research/round_a_targeted_ai_difference_audit_2026-08-09.md`
- ASLR 侧别与峰值证据审计：
  `docs/research/aslr_side_peak_evidence_audit_2026-08-09.md`
- ASLR subject-aware sensitivity：
  `docs/research/aslr_subject_aware_sensitivity_2026-08-10.md`
- Phase I 案例组合与申请图：
  `docs/research/phase_i_case_study_portfolio_2026-08-10.md`

## Repository Layout

- `src/`：Workbench、Study Mode 与 Video Manager。
- `src/lib/`：动作 timing/features、scoring、review、export 和 analysis logic。
- `server/`：本地 API stub 与 Video Manager API。
- `scripts/`：数据构建、pose、study、分析和文档输出工具。
- `research/pilot-v1/`：source-of-truth contracts、audit decisions 和生成说明。
- `research/pilot-v1/generated/`：私有、可重建、被 Git 忽略的研究输出。
- `Ingested-data/`：私有 review exports 与 SQLite，Git ignored。
- `Eval_Videos/`：本地视频与 pose assets，Git ignored。
- `docs/`：规格、研究报告、计划和申请输出。
- `tests/`：Node test suite。

## 数据、隐私与发布

- 视频来源混合，部分只适合本地研究复核；没有完成 rights audit 的媒体不得公开。
- 当前数据不包含受控参与者招募、人口统计、临床结果或 injury outcome。
- Reviewer comments、原始视频、raw pose 和本地绝对路径不进入公开申请包。
- `0` 只表示观察或报告的 pain；无法按协议独立评分使用 `unscorable`，不能写成 0。
- 历史 97 条 numeric labels 仅作为 weak-label provenance；Round A blind consensus 才是
  当前较强的人工证据层。
- 所有结果都应表述为 exploratory pilot evidence，不做 clinical generalization。

## 下一阶段

1. 完成间隔后的 Round B，并冻结 Round A/B change metrics。
2. 为 Hurdle 增加 cycle-level knee/ankle、trunk 和 dowel-orientation evidence。
3. 为 Rotary 补采手脚无遮挡、board edge 可见、完整侧身的新来源视频，作为 held-out
   confirmation；不使用正式 8 条继续调参。
4. 按申请平台尺寸复核已生成的 Deep Squat 与 ASLR 图，并完成替代文本定稿。
5. 完成公开素材 rights/privacy audit、demo video 和最终 release manifest。
