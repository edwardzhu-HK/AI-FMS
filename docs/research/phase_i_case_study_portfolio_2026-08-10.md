# AI-FMS Phase I 案例组合

初始日期：2026-08-10

最近更新：2026-08-15

状态：application candidate；Round A/B complete

## 组合原则

本组合不再把四个动作机械地写成“两条同分 rep 的参数对比”。分析从完整的 110-rep
canonical pool 出发，再依据动作特性、质量门和证据等级选择不同方法：

| 动作             | 研究问题                               | 方法                                                 | 分析单位              |
| ---------------- | -------------------------------------- | ---------------------------------------------------- | --------------------- |
| Deep Squat       | 深度是否决定完整动作策略？             | 侧视连续谱与 rank correlation                        | 15 reps / 7 videos    |
| ASLR             | 同一结果在左右侧和重复动作中是否稳定？ | 同源 bilateral repeatability series                  | 4 good reps           |
| Hurdle Step      | 同为 2 分是否因为同一种问题？          | blind reviewer thematic coding + quantitative ranges | 5 reps / 5 videos     |
| Rotary Stability | 单帧参数能否表达复杂动作顺序？         | full-cycle event matrix                              | 8 blind-reviewed reps |

四种方法共同研究“0-3 分压缩了什么信息”，但不预设四个动作必须产生同一种案例形式。

## 1. Deep Squat：15 条侧视 rep 的动作策略连续谱

从 31 条 feature-ready Deep Squat 中保留 15 条审计后 side-view rep，
覆盖 7 个源视频。分析不使用人工分数，以 `peakDepthRatio` 为连续
参考轴：

| Feature vs depth        | Rep-level Spearman ρ | Source-median sensitivity ρ |
| ----------------------- | -------------------: | --------------------------: |
| `hipKneeVerticalGap`    |                0.700 |                       0.750 |
| `hipAngleDegrees`       |               -0.689 |                      -0.821 |
| `kneeAngleDegrees`      |               -0.850 |                      -0.929 |
| `ankleShankLeanDegrees` |               -0.204 |                      -0.107 |
| `trunkLeanDegrees`      |               -0.050 |                       0.464 |
| `maxKneeAnkleOffset`    |               -0.118 |                      -0.214 |

深度与膝、髋屈曲及 hip-knee gap 呈较强方向关系，但与 ankle-shank lean、trunk lean 和
knee-ankle offset 的关系较弱。这意味着“蹲得更深”主要描述一个深度/髋膝屈曲轴，不能
代表踝策略、躯干策略和对线控制也完全相同。

![Deep Squat strategy continuum](../assets/phase-i-case-studies/deep-squat-strategy-continuum.svg)

## 2. ASLR：同一来源的左右侧与重复性

一个五-rep 源视频中有四条通过 `good` side/peak gate，另有一条 `watch` 被排除。
四条 good rep 均保留历史 3 分；其中两条左侧和一条右侧 rep 另有稳定 blind consensus，
剩余一条右侧只保留 historical weak-label evidence：

| Rep     | Active height | Stationary knee | Stationary ankle drift | Pelvic gap | Label evidence         |
| ------- | ------------: | --------------: | ---------------------: | ---------: | ---------------------- |
| left 1  |        0.3053 |           161.6 |                 0.0100 |     0.0180 | stable_blind_consensus |
| left 2  |        0.3009 |           174.9 |                 0.0040 |     0.0251 | stable_blind_consensus |
| right 4 |        0.2850 |           162.8 |                 0.0170 |     0.0361 | stable_blind_consensus |
| right 5 |        0.2758 |           164.5 |                 0.0170 |     0.0460 | historical_weak_label  |

active ankle height 仅跨 0.2758–0.3053，
而 stationary ankle drift 跨 4.25 倍，
pelvic gap 跨 2.56 倍。这个 case series 研究的不是
“哪一条更好”，而是同一结果下的左右侧差异与 repeatability。

![ASLR bilateral repeatability](../assets/phase-i-case-studies/aslr-bilateral-repeatability.svg)

## 3. Hurdle Step：五条 2 分对应四种 review pathway

Round B 中有 5 条来自 5 个不同视频的
Hurdle rep 被两位 reviewer 一致判为 2 分。对 blind comments 做结构化主题编码后，
它们不是一个统一类型：

| Pathway                | View  | Peak clearance | Trunk offset | Coded themes                                               |
| ---------------------- | ----- | -------------: | -----------: | ---------------------------------------------------------- |
| Multi-domain control   | mixed |         0.2245 |       0.0263 | alignment, trunk_control, support_stability, dowel_control |
| Distal alignment       | front |         0.2413 |       0.0036 | alignment, distal_ankle                                    |
| Return-phase alignment | mixed |         0.2956 |       0.0023 | alignment, return_phase                                    |
| Distal alignment       | front |         0.2061 |       0.0105 | alignment, distal_ankle                                    |
| Dowel control only     | front |         0.2225 |       0.0084 | dowel_control                                              |

五条动作形成 4 种路径：多领域控制问题、远端对线、回收阶段对线，
以及单独的 dowel control。相同的 2 分因此不能直接回答“应优先复核哪里”；人工观察理由
与连续参数共同保留后，后续检查方向才会不同。

![Hurdle score-two pathways](../assets/phase-i-case-studies/hurdle-score2-pathways.svg)

## 4. Rotary Stability：八条 rep 的动作周期事件矩阵

Rotary 不是峰值姿势问题，而是 setup、触踝、伸展、第二次触踝、回位和离地时序组成的
完整事件链。八条 blind-reviewed rep 的摘要如下，事件列顺序为 pass/watch/fail/unknown：

| Human score | Reps | Second touch P/W/F/? | Return P/W/F/? | AI score 1/2/3 |
| ----------: | ---: | -------------------- | -------------- | -------------- |
|           1 |    4 | 0/0/4/0              | 0/0/4/0        | 4/0/0          |
|           2 |    4 | 2/0/2/0              | 2/2/0/0        | 2/2/0          |

人工 1 分的四条中，第二次触踝与回位均为 4/4 fail；人工 2 分的四条中，第一次触踝和
肘膝伸展均保留，但两条仍在第二次触踝/回位出现边界证据，AI 因而保守提示 1 分。这个
case series 的价值是说明 temporal order 和 cycle completion 不能被单帧角度替代。

![Rotary cycle event matrix](../assets/phase-i-case-studies/rotary-cycle-event-matrix.svg)

## 跨案例综合

四个动作显示，FMS ordinal score 压缩的不只是“更多参数”，而是四类不同信息：

1. Deep Squat：连续的关节贡献与动作策略。
2. ASLR：左右侧差异和重复动作稳定性。
3. Hurdle Step：到达同一分数的不同扣分路径。
4. Rotary Stability：事件顺序、周期完整度与边界证据。

这些结果可以提出 mobility、stability、coordination、repeatability 和 compensation 的
定向复核假设，但不能命名为诊断、病因、伤病风险或 validated impairment subtype。

## 方法与质量控制补充材料

- ASLR subject-aware sensitivity、Hurdle camera-view gate 和 pose/timing limitations
  继续作为 measurement QA，不与动作科学发现混在一起。
- Deep Squat rep 嵌套于源视频；同时报告 source-median sensitivity，不能把 15
  条当作 15 个独立参与者。
- ASLR 剩余一条右侧 rep 尚不是 blind gold label；它用于同源 hypothesis generation。
- Hurdle pathway 来自结构化人工编码，不是自动诊断标签。
- Rotary 只有两个源视频，事件频率不能外推到总体人群。

## 发布边界

- 四张图均为无人物、数据驱动的 application candidate。
- 人物或源视频画面公开前仍需 rights/privacy audit。
- 不声称医学诊断、临床验证、伤病预测或 validated impairment subtype。
