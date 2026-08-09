# AI-FMS 四周收尾与输出计划

Date: 2026-08-09

## 1. 收尾目标

四周内把现有工程和四动作数据整理成一套可信、可复现、适合大学申请展示的阶段成果：

1. 一个可运行的 human-in-the-loop FMS 视频标注与 pose-based feature 平台。
2. 一个有稳定 ID、资产 checksum、数据字典和 QA 报告的四动作 pilot 数据集。
3. 一轮与旧文件名/notes 分数隔离的独立人工复核。
4. 一套不使用泄漏标签的 AI/规则复算结果。
5. 一份围绕“同一 FMS 分数内部的定量运动表型差异”的阶段研究报告。
6. README、dataset card、技术报告、项目页材料和 2-3 分钟演示视频。

项目定位仍是 AI-assisted movement screening、annotation 和研究工具，不是医疗诊断、伤病预测或认证 FMS 专家的替代品。

## 2. 执行原则

- 按验收门推进，不要求每天连续工作；完成一个门后即可进入下一门。
- 有完整空闲日时可以提前完成后续门，空几天不会改变数据版本和任务状态。
- Ronnie 和 Edward 的人工任务集中在简洁的 Study Mode 中完成，尽量不要求手工整理 JSON。
- 每个结论必须能追溯到 canonical repetition、pose 版本、规则版本和 review event。
- 旧 AI 分数受文件名/notes 标签泄漏影响，只保留 provenance，不进入准确率或一致性统计。
- 现有 Reviewer A/B 同分记录不是独立盲审，只作为历史标签；新盲审另存事件，不覆盖历史快照。
- “功能性障碍”暂时表述为 movement-quality phenotype 或 compensation hypothesis；没有外部临床标签时不做诊断性结论。

## 3. 四周里程碑

| 验收门          | 目标窗口            | 主要工作                                                                                         | 验收证据                                                         |
| --------------- | ------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| G1 数据可信基线 | Week 1, 8/9-8/15    | 整合 Ronnie 分支；去除标签泄漏；构建 canonical pilot、资产清单和 pose 提取计划                   | 29/29 video、29/29 pose；checksum 通过；`npm run check` 全绿     |
| G2 独立复核     | Week 1-2, 8/12-8/22 | 实现 Study Mode；隐藏文件名、旧分数和 AI；Ronnie/Edward 独立评分；记录 timing/side/view/可见质量 | 双 reviewer review events；盲审资格表；weighted kappa 和分歧清单 |
| G3 定量研究     | Week 2-3, 8/18-8/29 | 用无泄漏 pose 规则复算；分析同分内部角度/稳定性差异；形成 phenotype 假设和案例                   | 特征表、effect size/CI、同分异型案例、AI-vs-consensus 结果       |
| G4 输出与封版   | Week 4, 8/30-9/6    | 技术报告、dataset card、README、项目页、图表、演示录屏、限制声明                                 | 可复现 release bundle、最终 QA、2-3 分钟 demo、阶段报告          |

窗口是节奏参考，不是硬性的每日排班。唯一硬约束是 G4 前必须通过前面的证据门。

## 4. 人工工作量

### Ronnie

- 在 Study Mode 中独立复核可盲审 rep。
- 对动作侧别、动作阶段、评分理由和明显补偿模式做简短标记。
- 复核 Deep Squat、Hurdle Step、ASLR 的 feature 命名和解释是否符合 FMS 学习语境。
- 对分歧最大的案例做最终专业解释。

### Edward

- 独立完成第二 reviewer 评分，不查看 Ronnie 的当轮答案。
- 确认公开素材授权边界和申请材料的叙事重点。
- 参与选择 3-5 个最能说明“同分异型”的案例。

### Codex

- 维护数据、pose、规则、测试和研究脚本。
- 生成 review 队列、统计分析、图表、报告和可复现命令。
- 每个验收门结束时更新 backlog、QA 和输出清单。

## 5. Study Mode 最小体验

1. 自动载入 canonical review 队列，不让 reviewer 找文件。
2. 默认静音、隐藏文件名、历史人工分数和 AI 建议。
3. 只显示当前 rep 视频、动作名、侧别/视角确认、0-3 分和简短理由。
4. 支持循环播放、前后 rep、快捷保存、稍后处理和进度统计。
5. Reviewer 登录仅用于区分独立事件，不显示另一人的答案。
6. 保存 append-only review event，并记录 schema、rubric、时间和盲审状态。
7. 管理员导出后才生成分歧队列和 consensus/adjudication 视图。

## 6. 研究问题

### Primary

在相同人工 FMS RAW SCORE 内，pose-derived quantitative features 是否能识别出不同的 movement-quality phenotype？

### Secondary

- 独立 reviewer 的 rep-level weighted agreement 如何？
- 无标签泄漏的规则建议与人工 consensus 的一致性如何？
- 哪些 feature 在不同分数间有方向一致、可解释的差异？
- 哪些同分 rep 呈现不同的深度、躯干控制、左右控制或稳定性模式？

### 不做的结论

- 不从当前样本推断患病、受伤或未来伤病风险。
- 不声称模型达到临床或认证专家水平。
- 不把同一来源视频中的多个 rep 当作完全独立受试者。
- 不用旧 AI 字段计算 accuracy。

## 7. 统计与输出口径

- 描述统计按动作、视频和 rep 分层报告。
- Inter-rater 使用 raw agreement、weighted Cohen's kappa 和分歧矩阵。
- AI evaluation 只使用新 pose-derived 输出和独立人工 consensus。
- feature 比较优先报告分布、effect size 和 bootstrap interval，避免只报 p-value。
- 聚类或 phenotype 分组只作为 exploratory analysis，并给出样本数和稳定性限制。
- 视频内 rep 相关性在报告中明确说明；条件允许时以 video 为 bootstrap 单位。

## 8. Day 1 Checkpoint

2026-08-09 已完成：

- 建立 `codex/application-closeout-v1` 整合分支。
- 选择性纳入 Ronnie 改动，并移除大体积备份和错误删除。
- 删除从文件名、notes 或人工参考分数推导 AI 分数的路径。
- 修复 real API/stub persistence 的关键 round-trip 和失败状态。
- 建立四动作 canonical pilot：28 history 文件、29 ingest、28 视频、110 rep。
- 生成并解析 29/29 视频和 29/29 MediaPipe pose 资产。
- 将 92 个 legacy numeric AI suggestion 全部标记为 label-leakage-ineligible。
- 生成 manifest、CSV、QA、checksum 和数据字典。
- 通过 249/249 tests、lint、format 和 production build。
- 完成 Study Mode V1：110-rep 随机队列、静音循环播放、盲法字段隔离、
  append-only review events、本地续做、稍后处理和 JSON 导出。
- Study Mode 加入后通过 254/254 tests、桌面/手机浏览器检查和三页面
  production build。

下一验收门是 G2 的 blindability QA、独立人工复核和分歧统计。
