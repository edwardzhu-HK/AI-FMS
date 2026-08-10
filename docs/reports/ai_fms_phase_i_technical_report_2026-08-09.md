# AI-FMS Phase I 技术报告

## AI-FMS: A Human-in-the-Loop Platform for FMS Video Annotation and Pose-Based Movement Evidence

初始日期：2026-08-09

叙事更新：2026-08-10

状态：Phase I release candidate；Round A complete，Round B pending

## English Abstract

AI-FMS is a human-in-the-loop platform designed to support Functional Movement
Screen review when direct observation is brief, remote, asynchronous, or hard
to reproduce. It lets a reviewer segment video into repetitions, pause and loop
each movement, preserve camera view and protocol context, inspect MediaPipe pose
overlays and quantitative features, record confidence and uncertainty, compare
independent reviews, adjudicate disagreements, and export a traceable evidence
package. The platform covers annotation and review workflows for all seven FMS
movements. Six movements have first-pass pose-based AI suggestions. Rotary
Stability remains feature-only in the frozen Round B AI v1.0, while a separate
experimental v1.1 now derives full-cycle evidence and either proposes a
conservative score or abstains. It is not exposed to Round B reviewers.

The second goal is scientific: to recover continuous information compressed by
the traditional 0-3 ordinal score. A four-movement Phase I pilot was
reconstructed from 28 unique source videos and 110 repetitions. Sixty-six
repetitions passed pose and timing quality gates, and 32 balanced repetitions
were frozen for a two-round reviewer study. In Round A, the two reviewers agreed
on scoreability for 31 of 32 repetitions and assigned the same raw score to all
26 repetitions that both could score. Leakage-controlled AI suggestions were
comparable on 16 of these consensus repetitions, matching exactly on 9 and
falling within one point on 14. Deep Squat cases showed that the same human
score can preserve different movement-depth and joint-strategy profiles. An
ASLR audit further showed that pose visibility alone does not guarantee correct
subject or side tracking; target-subject extraction recovered non-limited
continuous evidence in three previously limited windows without changing the
frozen score benchmark.

Round B is a second blind review after a planned interval. Reviewers see neither
AI scores nor pose-derived evidence, allowing human test-retest stability to be
measured without AI exposure. The frozen AI package is loaded only after both
signed Round B exports, and AI-human agreement is reported as a parallel
benchmark with coverage and abstention separated. A later improved internal
benchmark must remain distinct from held-out confirmation if the same 32
repetitions informed system development. The contribution is therefore neither
automated diagnosis nor reviewer replacement. It is an end-to-end, auditable
system that helps people review FMS video and preserves quantitative movement
evidence alongside human judgment and explicit uncertainty.

## 摘要

AI-FMS 有两个相互连接的目标。第一，帮助 reviewer 更方便、更完整地完成 FMS 视频
评分：在远程或异步场景下切分动作、暂停回放、逐 rep 循环，保存 camera view、side、
protocol condition、confidence 和备注，并用 pose overlay、角度、距离、轨迹和质量提示
辅助肉眼判断。第二，恢复传统 0-3 分压缩掉的连续信息：分数相同的动作仍可能具有不同
的深度、关节策略、躯干控制和左右稳定性。

平台层面覆盖全部 7 个 FMS 动作，七个动作均具备 first-pass pose-based AI suggestion。
Rotary Stability 在 frozen Round B v1.0 中仍为 feature-only；默认 Workbench 的 v1.1
experimental 路径已加入完整周期判分与 abstain，但不向 Round A/B reviewer 展示。
Phase I 数据研究重点选择 4 个动作，重建了 28 个唯一视频、110 个 reps 的 canonical
pilot；66 条通过 quantitative feature quality gate，32 条进入正式双轮研究。

Round A 显示，两位 reviewer 在共同可评分的 26 条上全部同分；这证明的是本轮人工
workflow 的一致性，不是 AI 准确率。冻结 AI 在 16 条可比较共识记录中 9 条完全同分、
14 条相差不超过 1 分。Deep Squat 案例说明同分动作仍可保留不同的定量 movement
profiles；ASLR 审计说明系统还必须识别错误主体、侧别切换和 pose evidence 不可靠的
情况。Round B 将在不显示 AI 或 pose evidence 的条件下检验人工评分稳定性、
confidence 和 review time 变化；冻结 AI 将在人评完成后单独比较。最终目标不是让 AI
取代 reviewer，而是形成一个更可回放、可解释、可复核
和可追溯的 FMS 审核流程。

## 1. 背景与动机

FMS 使用 0-3 RAW SCORE 对动作是否达到规则要求进行总结。这个体系适合快速
movement screening，但一次现场观察具有天然限制：动作很快结束，reviewer 可能只能
抓住一两个显著现象；远程、异步或无法亲临现场时更难重复观察；不同 rep、机位、侧别和
protocol condition 也不容易在同一证据链中保存。人眼擅长理解动作整体，却难以稳定记录
连续角度、相对距离和轨迹。

### 1.1 帮助人更好地完成 FMS 评分

AI-FMS 的第一层目的，是把人工评分变成一个可以暂停、回放、比较和追溯的审核流程。
系统不是替 reviewer 做最终判断，而是为判断提供更好的工作条件：

- 支持远程和异步 review，不要求 reviewer 必须亲临一次性现场观察；
- 自动或人工校正 rep segmentation，减少在长视频中反复寻找动作的时间；
- 对单条 rep 循环播放，使动作不会“过去就过去了”；
- 同时保存 camera view、side、protocol condition、confidence、备注和质量标志；
- 叠加 pose skeleton，并展示角度、相对距离、轨迹和 movement-specific evidence；
- 对遮挡、低可见度、主体选择、侧别不稳定和协议条件不足主动提示人工复核；
- 保留两位 reviewer 的独立记录、分歧、adjudication 和完整 export lineage。

这些是当前系统已经实现的产品能力。它们是否提高 confidence、降低 review time 或改变
评分，将由 Round B 对照 Round A 的数据回答，不能在实验完成前预设结论。

### 1.2 恢复 0-3 分压缩掉的信息

AI-FMS 的第二层目的，是在不推翻 FMS 规则的前提下，保留 ordinal score 之外的连续
movement evidence。两个同为 2 分的动作，可能在深度、髋膝踝策略、躯干控制、左右侧
稳定性和完整轨迹上不同。传统总分保留“是否达到规则要求”，pose-derived parameters
进一步描述“动作是如何完成的”。

长期游泳训练使 movement quality、左右差异和动作效率成为 Ronnie 可以持续观察的问题。
AI-FMS 把这种经验转化为一个 Human Movement Science 与计算机视觉交叉项目：既改善
实际审核流程，也为同分动作的定量差异建立可检查、比较和后续研究的证据。

## 2. 研究问题

1. 能否建立覆盖七动作、适合远程/异步复核的视频 annotation 与 reviewer workflow？
2. 能否建立从视频、rep、pose、人工评分到研究输出的完整 lineage？
3. Pose-derived parameters 能否揭示同分动作内部的连续差异？
4. Frozen rules-based AI 与独立人工共识的一致性和 coverage 如何？
5. AI/pose evidence 是否会改变 reviewer 的评分、confidence、review time 或主观
   usefulness？
6. AI 在哪些情况下应主动 abstain，并把最终判断保留给人工？

本项目不回答“AI 是否能自动诊断或自动替代 FMS professional”。

## 3. 系统设计

### 3.1 人工困难、系统功能与预期帮助

| 人工审核中的困难                 | 已实现的系统功能                                             | 预期帮助与验证边界                           |
| -------------------------------- | ------------------------------------------------------------ | -------------------------------------------- |
| 无法亲临现场或需要异步复核       | 本地视频导入、匿名 reviewer queue、可恢复 review state       | 支持远程/异步工作；不是临床远程服务验证      |
| 动作快速结束，难以回看细节       | Duration-aware range、逐 rep segment、loop playback          | 允许暂停和重复观察                           |
| 长视频中寻找 rep 耗时            | Timing detector、自动 draft segmentation、人工 timing 校正   | 减少定位工作；错误切分仍需人工修正           |
| 人眼难以稳定记录连续量           | MediaPipe overlay、角度、距离、轨迹和 movement-specific 特征 | 增加定量旁证；2D proxy 不是临床量角器        |
| 机位、侧别和协议条件容易丢失     | Camera view、side、attempt condition、clearing/pain metadata | 保留评分上下文；pain 不由 AI 自动判断        |
| 遮挡、主体混乱或证据不足         | Pose-quality gate、subject/side QA、watch/limited/abstain    | 提醒 reviewer 复核，不强行输出总分           |
| 第二 reviewer 与争议处理难以追溯 | Blind Study Mode、append-only events、adjudication、export   | 支持独立复核与追溯；实际辅助效果等待 Round B |

### 3.2 系统架构

```text
Local videos + review histories
              |
              v
Canonical builder -> stable IDs -> asset/checksum lineage
              |
              v
MediaPipe pose -> timing QA -> movement-specific features
              |
              +--------------------+
              |                    |
              v                    v
        Study Mode            Workbench
      blind review       annotation + AI evidence
              |                    |
              +----------+---------+
                         v
       JSON/CSV exports + SQLite + research reports
```

### 3.3 Product Scope：七动作功能覆盖

| Action                    | Annotation / timing                      | Pose features                                      | AI-assisted review                             | Side / clearing 边界                      |
| ------------------------- | ---------------------------------------- | -------------------------------------------------- | ---------------------------------------------- | ----------------------------------------- |
| Deep Squat                | Rep timing + floor/board attempt context | Depth、torso、hip/knee/ankle proxies               | First-pass explainable suggestion              | 非左右动作；无 clearing                   |
| Active Straight Leg Raise | Left/right raise cycles                  | Active-leg height、stationary-leg、pelvis、side    | First-pass explainable suggestion + QA         | AI side suggestion；无 clearing           |
| Hurdle Step               | Step-cycle timing                        | Clearance、stance leg、pelvis/trunk、alignment     | First-pass explainable suggestion + QA         | AI side suggestion；无 clearing           |
| In-Line Lunge             | Lunge-depth cycles                       | Depth、trunk/pelvis、rear leg、knee-foot alignment | First-pass explainable suggestion              | AI side；ankle clearing 由人工确认        |
| Shoulder Mobility         | Best-reach evidence                      | Reach distance、visibility、side context           | Conservative first-pass suggestion             | AI side；shoulder pain 由人工确认         |
| Trunk Stability Push-Up   | Best push-up frame                       | Lift、body line、arm extension、hip drift          | Conservative first-pass suggestion             | 非左右动作；extension pain 由人工确认     |
| Rotary Stability          | Segment cycle + pose-derived phase QA    | 两次触踝、肘膝伸展、离地时序、回位、稳定性         | v1.0 feature-only；Workbench v1.1 experimental | AI side evidence；flexion pain 由人工确认 |

七个动作都已进入 `implemented` 产品状态，具有 timing、features 和可人工校准的
first-pass pose-based suggestion。Rotary Stability 的默认 Workbench 使用明确标注为
experimental 的 v1.1 cycle rules；frozen v1.0 仍保持 `features_only`，blind Round B
也完全不载入 v1.1。v1.1 对完整周期输出可解释建议，对证据不足的周期 abstain，并将
pain / flexion clearing 保留为人工 gate。

### 3.4 Research Scope：四动作 Phase I pilot

| 研究层级                     | 当前范围                                               |
| ---------------------------- | ------------------------------------------------------ |
| Product workflow             | 全部 7 个 FMS movements                                |
| Phase I quantitative pilot   | Deep Squat、Hurdle Step、ASLR、Rotary Stability        |
| Canonical research pool      | 28 个唯一 source videos、110 reps                      |
| Quantitative feature pool    | 66 feature-ready reps                                  |
| Formal blind study           | 32 reps；四动作各 8                                    |
| Round A gold-consensus layer | 26 条双方均可评分且同分；不是对 110 条的随机有效性证明 |

Product Scope 回答“系统做出了什么”，Research Scope 回答“本阶段用哪些数据做了正式分析”。
平台覆盖七动作，不等于七动作都已完成同等强度的模型验证；四动作 pilot 也不意味着另外
三个动作没有实现主要产品功能。

### 3.5 当前界面证据

![AI-FMS workbench overview](../assets/ai-fms-demo-overview.jpg)

![Deep Squat side-view angle features](../assets/ai-fms-demo-side-angle-features.jpg)

![Export evidence dashboard](../assets/ai-fms-demo-export-evidence.jpg)

这些截图用于说明已实现的产品流程和开发工作量。人物或源视频画面在进入公开申请材料前
仍需完成 source-rights 与 privacy audit。

## 4. 数据与质量门

Canonical snapshot：

- 28 个 source history files；
- 29 个 unique ingests；
- 28 个唯一 source videos；
- 110 个 repetitions；
- 29/29 video 与 pose references resolved；
- 97 blindable；
- 66 feature-ready；
- 58 同时 blindable + feature-ready。

Formal study 从 58 条双门槛候选中 deterministic freeze 32 条，四动作各 8 条。
Selection 同时考虑动作平衡和 source-video dispersion，不将其描述为 simple random
sample。

## 5. Human Review 设计

Round A 对两位 reviewer 隐藏历史评分、legacy AI、源文件名和音频。Review Event V2
保存 score/status、confidence、camera view、side、comment、quality flag、review time
和 supersession lineage。

Round A 结果：

| 指标                           |         结果 |
| ------------------------------ | -----------: |
| 每位 reviewer 完成             |        32/32 |
| Outcome/scoreability agreement | 31/32，96.9% |
| 双方都能评分                   |           26 |
| RAW SCORE exact agreement      |  26/26，100% |
| Linear weighted kappa          |       1.0000 |
| Quadratic weighted kappa       |       1.0000 |
| 双方均 unscorable              |            5 |
| Scoreability mismatch          |            1 |

Kappa 只使用双方都能评分的 26 条。Unscorable reason agreement 较弱，说明 protocol
taxonomy 仍需改进；高 score agreement 不能外推为临床可靠性。

### Round B：第二次独立盲评

Round B 与 Round A 使用隔离 namespace、重新随机的队列和独立 append-only events。
两位 reviewer 各自评分，看不到历史答案、另一位 reviewer 结果、AI RAW SCORE、
AI confidence、pose-derived 角度/距离/轨迹、质量提示或原始文件名。正式导出中
`evidenceReview` 必须为 `null`，并明确标记 current pose evidence 和 current AI
suggestion 均未展示。

AI v1.0 rule fingerprint、source checksums 和 32-rep benchmark package 仍在人评前冻结，
但 Study Mode 不会请求该包。两位 reviewer 完成签名导出后，分析脚本才读取：

- 18/32 冻结 AI v1.0 RAW SCORE；
- 8/32 Rotary Stability v1.0 feature-only 记录；
- 6/32 缺少 floor/board protocol metadata 的 Deep Squat 记录。

Round B 尚未完成。完成后将比较逐 reviewer score change、confidence delta、
review-time delta、Round A/B 人际一致性，以及冻结 AI 对两轮人工共识的探索性匹配。

## 6. Quantitative Movement Profiles

66 条 feature-ready reps 在不使用历史或 Round A score 的情况下按 action 做 robust
z-score 与 deterministic k-medoids。分析同时检查 source-video distance 和
leave-one-video-out stability。

Round A labels 在 groups 冻结后才 overlay。7 个 action-score strata 中有 3 个跨越
多个 profile groups，但这些结果受 singleton、source effect 或独立视频不足影响。
因此当前证据支持“同分内存在连续多维差异”，不支持“已经发现稳定的功能障碍亚型”。

### Deep Squat 首要案例

两条不同源视频、侧面机位、脚跟垫板的 reps 均由两位 reviewer 判为 2 分：

| Feature                 | Shallower/uncertain | Deeper | 观察                 |
| ----------------------- | ------------------: | -----: | -------------------- |
| `peakDepthRatio`        |              0.6600 | 0.7542 | 后者更深             |
| `hipKneeVerticalGap`    |             -0.0121 | 0.0673 | 后者髋部相对膝部更低 |
| `hipAngleDegrees`       |                86.3 |   42.8 | 后者髋屈曲更多       |
| `kneeAngleDegrees`      |                64.9 |   35.0 | 后者膝屈曲更多       |
| `ankleShankLeanDegrees` |                32.4 |   15.1 | 两条使用不同下肢策略 |
| `maxKneeAnkleOffset`    |              0.0709 | 0.0403 | 前者 offset 更大     |

FMS 规则正确地把两条垫板动作归为 2 分；AI-FMS 的增量价值是进一步描述两条动作的
完成程度和 movement strategy，而不是推翻人工分数。

### 四案例申请组合

正式 application candidate 不是四个只展示“AI 成功”的案例，而是一个受控组合：

1. Deep Squat：同分背后的连续 movement-profile 差异。
2. ASLR：subject-aware extraction 如何改变 pose evidence reliability。
3. Hurdle Step：mixed/front 机位差异为什么阻止 movement-only 解释。
4. Rotary Stability：完整周期证据、保守 AI first-pass 与 human clearing boundary。

其中 Deep Squat 和 ASLR 已生成不含人物图像、源文件名或本机路径的数据驱动图，完整
数字与发布边界见
`docs/research/phase_i_case_study_portfolio_2026-08-10.md`。该组合同时展示项目的
科学价值、human-in-the-loop 质量控制和 fail-closed 边界。

## 7. AI 与人工：四层评测设计及当前基线

“AI 与人工是否一致”和“AI evidence 是否帮助人工”是两个不同问题。Phase I 将其拆成
四个评测层次：

| 评测层次                 | 比较内容                                  | 回答的问题                   | 当前状态                              |
| ------------------------ | ----------------------------------------- | ---------------------------- | ------------------------------------- |
| Human reliability        | Reviewer A vs Reviewer B，Round A 与 B    | 人工评分是否一致、稳定       | Round A 完成；Round B pending         |
| Frozen AI benchmark      | 人评前冻结 AI v1.0 vs Round A/B consensus | 当前 AI 与独立人工判断多一致 | Round A 基线完成；Round B 待生成      |
| Human test-retest        | 每位 reviewer 的 Round B vs Round A       | 盲评分数、信心和时间是否稳定 | 待 Round B                            |
| Final internal benchmark | 完整改进版 AI vs 最终人工参考             | 改进版在这 32 条上的内部表现 | v1.1 预测已锁定；agreement 待 Round B |

冻结基线的运行顺序是先对 110 条生成 leakage-controlled AI suggestions，再连接 26 条
人工 consensus。Files、notes、历史 labels、legacy AI 和 reviewer comments 不进入
suggestion builder。

| 分析                 | 可比较 | Exact | Within 1 |    MAE | Linear / Quadratic kappa |
| -------------------- | -----: | ----: | -------: | -----: | -----------------------: |
| 冻结基线             |     16 |  9/16 |    14/16 | 0.5625 |        -0.0588 / -0.1556 |
| Protocol sensitivity |     17 | 11/17 |    15/17 | 0.4706 |          0.1807 / 0.0286 |

基线结果足以排除“当前规则式 AI 已经可以替代人工”的描述。Sensitivity 的变化来自
Deep Squat attempt metadata 补齐，不是训练后 performance improvement。

### Final Locked AI Scoring Pass

两位 reviewer 完成 Round B 后，将对同一 32 reps 运行一次锁定的 AI scoring pass，
并同时保留三层结果：

1. **Frozen AI v1.0 baseline**：人评前已冻结，防止 Round B 结果反向影响规则。
2. **Post-audit / final internal benchmark**：若补齐 Deep Squat protocol metadata 或
   新增 Rotary first-pass rule，必须使用新 version 和 fingerprint 单独报告。
3. **Held-out confirmation**：最终锁定后再使用少量、未参与调参的新视频，才用于讨论
   初步推广能力。

每个 AI benchmark 至少报告 coverage、exact agreement、within-one agreement、MAE、
weighted Cohen's kappa、分动作结果，以及 abstain / evidence-insufficient 数量。分析全部
32 条不等于强迫 AI 给 32 条总分；合理拒绝评分本身是 human-in-the-loop 系统能力。

当前 frozen AI v1.0 的 score-bearing coverage 为 18/32：ASLR 8、Hurdle Step 8、
Deep Squat 2、Rotary Stability 0。Rotary v1.1 已建立 cycle-level、规则驱动、允许
abstain 的 first-pass suggestion，并单独完成组件 benchmark；其结果不会回写 v1.0。
Final AI v1.1 的 label-free prediction package 已在 Round B 人评结果产生前锁定：32 条
全部进入分析，28 条有 AI raw score，4 条合理 abstain。ASLR、Hurdle 与 Rotary 各
8/8 score-bearing；Deep Squat 为 4/8，另外 4 条 floor attempt 缺少 staged
heels-elevated follow-up，不能强行生成最终 raw score。该包不含 human/reviewer 字段，
也不由 Study Mode 载入。Round B 完成后只需连接人工共识计算 agreement。由于 v1.1
开发发生在 Round A 之后，它只能称为 internal benchmark，不能称为 held-out validation。

### Rotary Stability v1.1：实现与当前证据边界

Rotary 并非没有实现。正式 study 的 8 条样本全部 feature-ready，Round A 两位 reviewer
8/8 完全同分，其中 4 条为 1 分、4 条为 2 分。系统已经保存 rotary reach、trunk
rotation、center offset、hip-height/balance stability、side evidence 和人工
clearing/pain gate。

v1.1 不再把单帧 `rotaryReachScore` 直接映射成总分，而是在每个 segment 内重新寻找
setup、第一次 hand-to-lateral-malleolus、extension、第二次 touch 和 return 阶段，
再检查 hand/knee lift timing、肘膝伸展、回位误差和稳定性 proxy。Score 3 只有在完整
周期、同时离地与 board-parallel alignment 都被确认时才允许；score 0 仍只由人工
pain / flexion clearing metadata 触发。Curated timing 中的人工 score override 不进入
规则输入，并有自动测试防止标签泄漏。

正式 8 条的 post-audit internal benchmark 结果如下：

| 指标                     | Rotary v1.1 |
| ------------------------ | ----------: |
| Formal reps              |           8 |
| Score-bearing coverage   |   8/8，100% |
| Exact agreement          |         6/8 |
| Within-one agreement     |         8/8 |
| MAE                      |        0.25 |
| Abstain                  |           0 |
| Linear / quadratic kappa |   0.5 / 0.5 |

初版 all-or-nothing gate 要求 12 个 landmarks 每帧同时可见，因此 support-side elbow
遮挡会让整个动作周期失效。v1.1 将 setup/phase 所需的 core landmarks 与单项评分所需
的 elbow/finger landmarks 分开，并在可见时优先使用 thumb/index/pinky 作为
finger-to-lateral-malleolus proxy。修正后 8/8 均保留完整周期证据。

4 条人工 1 分全部被 AI 判为 1；4 条人工 2 分中 2 条判为 2，另 2 条因第二次触踝
proxy 明确失败而保守判为 1。两条差异没有通过移动 threshold 追成人工答案，而是作为
当前 2D touch proxy 的边界保留。6/8 exact 不能视为独立验证；更重要的下一步是使用
board edge、手指和脚踝更清晰的新来源做 held-out confirmation。

## 8. 九条 Targeted Error Audit

九条 actionable differences 使用每条 5 帧画面、双 reviewer comments 和 feature
values 复核：

- 2 条 Deep Squat：heels-elevated metadata 补齐后现有 staged rule 正确输出 2。
- 1 条 Deep Squat floor attempt：人工 3，AI raw 2，保留为真实 depth proxy 差异。
- 1 条 ASLR：blind reviewer active side 与 feature row 不一致，需排查 side/peak。
- 1 条 ASLR：dowel 放错侧且 reviewer low confidence，疑似 pose 遮挡/左右追踪问题。
- 3 条 Hurdle：人工扣分来自 recovery 或动态 knee/ankle/trunk evidence，当前 peak
  frame proxy 未覆盖。
- 1 条 Hurdle：侧面 alignment evidence 仅轻微越过 threshold，机位导致不确定性。

本轮没有根据这九条移动 ASLR/Hurdle thresholds。

## 9. ASLR 侧别与峰值证据审计

为避免用 Round A 分数反向优化规则，ASLR 审计不读取 source filename、历史分数或
reviewer 结果，只使用 segment 时间窗、side metadata 和脱敏 pose landmarks。17 条记录
对应 7 个视频和 16 个独立证据窗口；独立窗口中 11 个为 `good`、2 个为 `watch`、
3 个为 `limited`。

其中 `rep_6830e0689f85` 虽有较高平均 landmark visibility，但峰值附近只有 3 个强
抬腿帧，左右切换率为 0.500。多人教学画面使用 single-pose `first` selection 且没有
subject ROI，因此 visibility 不能证明跟踪了正确主体。`rep_8333424d5d28` 有清楚的
右侧峰值，但 dominant-side 比例为 0.829，且 stationary-knee 单帧角度不稳定，保留为
`watch`。

这一审计将工程方向从“调评分阈值”收紧为两个可验证任务：多人视频 subject-aware pose
重提取，以及 peak-window robust geometry。`limited` 窗口不进入自动总分比较，任何新
结果只作为独立 sensitivity，不覆盖冻结 baseline。

### Subject-aware sensitivity

随后对 3 个原 `limited` 独立窗口执行受试者 ROI / inference crop 重提取，模型和
side/peak 质量门保持不变。结果为 1 `good`、2 `watch`、0 `limited`：教学双人窗口的
连续强信号帧由 3 增至 107；竖屏视频两个窗口分别由 27 增至 102、30 增至 47。
两个原有 `watch` 窗口也完成视频 QA，并因协议布置或动作转换期侧别切换继续保留
`watch`。

该 sensitivity 说明部分失败来自 subject selection / crop，而不是视频完全没有动作
信号。它不覆盖 11 / 2 / 3 冻结基线、不回写 post-review AI benchmark，也不移动 ASLR 分数
阈值。

## 10. 工程实现

- React 19 + Vite multi-entry frontend，包含 Workbench、Study Mode 和 Video
  Manager。
- Duration-aware analysis range、rep segmentation、loop playback、timing correction
  和 movement-specific reviewer forms。
- Mock API、local HTTP API stub 与 Video Manager API。
- MediaPipe Pose Landmarker 本地 extraction、pose overlay 和 subject/side evidence。
- 七动作 adapters 与 first-pass suggestion；Rotary 在 Workbench 明确标注为
  experimental cycle-rule，frozen AI v1.0 与 blind Round B 仍走隔离路径。
- Append-only study events、signed export validation、SQLite idempotent ingest。
- Canonical JSON/CSV、data dictionary、manifest、SHA-256 和 reproducible scripts。
- 335 automated tests 与三个 production entries。

工程价值不只在 UI，而在 source-of-truth、审计层、数据隔离和 fail-closed 边界。

## 11. Limitations

- 110 reps 嵌套于 28 个视频，不是独立参与者样本。
- 数据来源、机位、动作和 score distribution 不平衡。
- 两位 reviewer 不构成 certified expert panel validation。
- 没有人口统计、consent registry、clinical outcome 或 injury labels。
- 2D pose 受视角、遮挡和 source-video signature 影响。
- Rotary v1.1 在正式 8 条上达到 8/8 score-bearing coverage，但只有两个来源，且两条
  人工 2 分被 touch proxy 保守判为 1；score 2/3 与 board alignment 仍需新视频验证。
- ASLR 冻结基线的 16 个独立窗口中有 3 个 pose-limited；subject-aware sensitivity
  将这 3 个窗口转为 1 good / 2 watch，但尚未在独立多人视频上验证。
- Rules 可能接触过同一公开视频，不是 held-out test set。
- Round B 尚未完成，不能报告 test-retest 结果或 AI-vs-Round B concordance。
- 未完成 rights/privacy audit 的媒体不能进入公开 release。

## 12. 伦理与合理主张

可以主张：

- 建成了覆盖七动作的 human-in-the-loop annotation、pose evidence 和 study
  platform；
- 七动作具有 first-pass AI suggestion；Rotary 在 frozen v1.0 中 feature-only，
  Workbench v1.1 experimental 可输出保守建议或 abstain；
- 保存了 pose-derived quantitative evidence 和完整 lineage；
- 完成了四动作 pilot、Round A blind review 和 exploratory analyses；
- 发现了同分动作内部的可量化差异及当前 AI 的明确边界。

不能主张：

- AI 比专业 reviewer 更准确；
- 系统能诊断功能障碍或预测伤病；
- 32 条正式样本证明全部 110 条历史标签有效；
- 当前 profile groups 是经过验证的 impairment subtypes。

## 13. 结论与下一步

AI-FMS Phase I 已从单一 demo 发展为包含产品、数据、盲审和研究输出的完整 pilot。
项目首先回应人工 FMS 在远程/异步审核、回放、定量观察和信息保留方面的不足，随后建立
覆盖七动作的人机协同系统，再选择四个动作进行结构化研究。最可信的贡献是把 ordinal
FMS judgment 与 continuous pose evidence 放在同一可审计流程中，并诚实暴露 AI 何时
可能提供帮助、何时证据不足。

下一步：

1. 完成双 reviewer Round B，冻结 agreement、confidence、time、usefulness 和 A/B
   change metrics；
2. 运行 Final Locked AI Scoring Pass，分开报告 frozen v1.0 与 post-audit internal
   benchmark；
3. 在独立多人视频上验证 ASLR subject-aware extraction，并继续开发 peak-window
   robust geometry；
4. 开发 Hurdle cycle-level pattern/event features；
5. 补采手脚无遮挡、board edge 可见的 Rotary 新视频，并在冻结 v1.1 后完成 held-out
   confirmation；
6. 增加少量其他独立来源、rights/consent-clear 新视频；
7. 完成 demo video、公开素材 audit 与 final Phase I release。
