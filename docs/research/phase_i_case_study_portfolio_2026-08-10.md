# AI-FMS Phase I 案例组合

初始日期：2026-08-10

最近更新：2026-08-15

状态：application candidate；Round A/B complete

## 组合原则

技术报告的核心研究命题是：传统 0-3 FMS score 保留规则结果，但会压缩动作完成过程中的
连续信息。因此，正文案例统一回答同一个问题：

> 同一个 FMS RAW SCORE 下，pose-derived parameters 还原了哪些不同的动作完成方式？

每个案例均按“observed feature → movement profile → functional hypothesis”解释。最后
一层只用于提出后续复核方向，不把 2D pose proxy 直接命名为疾病、伤病风险或已确认的
功能障碍。

案例选择优先满足：两位 reviewer 同分、两轮分数稳定、pose/timing ready、机位可解释。
四个案例不是四次等强度的证明：Deep Squat 是主案例，ASLR、Hurdle 和 Rotary 是
支持性、探索性案例。测量失败、主体选择、camera-view gate 和 fail-closed 规则仍保留为
方法与质量控制证据，但不再充当主要科学发现。

## 1. Deep Squat：同为 2 分，深度与关节策略不同

两条来自不同源视频、审计后均为 side view、使用 heels-elevated board 的 rep，在两轮
盲评中均保持 RAW SCORE 2：

| Feature                 |  Case A | Case B | Unit              |
| ----------------------- | ------: | -----: | ----------------- |
| `peakDepthRatio`        |  0.6600 | 0.7542 | normalized ratio  |
| `hipKneeVerticalGap`    | -0.0121 | 0.0673 | normalized height |
| `hipAngleDegrees`       |    86.3 |   42.8 | degrees           |
| `kneeAngleDegrees`      |    64.9 |   35.0 | degrees           |
| `ankleShankLeanDegrees` |    32.4 |   15.1 | degrees           |
| `maxKneeAnkleOffset`    |  0.0709 | 0.0403 | normalized width  |

可报告结论：FMS 正确记录了两条垫板动作都属于 2 分；AI-FMS 进一步显示它们在完成深度、
髋膝屈曲和踝膝策略上不同。

探索性假设：两条动作可能具有不同的踝、膝、髋协同活动度与控制策略，后续可分别检查
踝背屈、髋膝屈曲和躯干控制；不能据此确定某个关节存在特定缺陷。

![Deep Squat same-score movement profile](../assets/phase-i-case-studies/deep-squat-same-score.svg)

## 2. ASLR：同为 3 分，活动腿高度相近但固定腿控制不同

两条 rep 来自同一源视频、同一左侧动作，两轮均保持 RAW SCORE 3，side/peak gate 均为
`good`：

| Feature                      | Case A | Case B |
| ---------------------------- | -----: | -----: |
| `ankleAboveHip`              | 0.3009 | 0.3053 |
| `peakElevation`              | 0.3309 | 0.3361 |
| `stationaryKneeAngleDegrees` |  174.9 |  161.6 |
| `stationaryAnkleDrift`       | 0.0040 | 0.0100 |
| `hipHeightGap`               | 0.0251 | 0.0180 |

可报告结论：两条动作都达到 3 分的活动腿高度要求，但固定腿屈曲、固定踝漂移和骨盆高度差
组成不同。它们是不同 movement-control profiles，不宜简单排成全面优劣。

探索性假设：一条更接近固定腿代偿，另一条更接近骨盆控制变化，可用于指导后续复核
固定腿伸展保持、lumbopelvic stability 和后侧链活动度；不能单独归因于 hamstring
flexibility。

限制：这是同一来源内的重复动作对照，可减少人物和机位差异，但不是独立样本复制。

## 3. Hurdle Step：同为 2 分，对线问题的参数组合不同

两条 rep 来自不同源视频，均为审计确认的 front view。两轮中两位 reviewer 均以 high
confidence 判为 RAW SCORE 2，并记录髋膝踝对线丢失或脚踝内移：

| Feature              | Case A | Case B |
| -------------------- | -----: | -----: |
| `peakClearance`      | 0.2413 | 0.2061 |
| `stepKneeLineOffset` | 0.0043 | 0.0092 |
| `trunkCenterOffset`  | 0.0036 | 0.0105 |
| `hipHeightGap`       | 0.0199 | 0.0166 |
| `stanceAnkleDrift`   | 0.0191 | 0.0184 |

可报告结论：同一种定性扣分可以伴随不同的 clearance、峰值膝线、躯干位移和骨盆参数组合。
现有 peak features 尚不能完整表示恢复阶段脚踝内移，因此不能把某一个参数认定为 2 分的
唯一原因。

探索性假设：两条动作可能分别更突出单腿骨盆稳定问题，以及 clearance、动态对线与
躯干控制问题。这里表达的是 follow-up priority，不是已确认病因。

## 4. Rotary Stability：同为 2 分，周期完成质量不同

两条 rep 来自同一源视频、同一侧面动作，两轮均保持 RAW SCORE 2：

| Cycle evidence          | Case A | Case B |
| ----------------------- | -----: | -----: |
| `trunkTwistDegrees`     |   70.9 |    4.9 |
| `firstTouchDistance`    |  0.614 |  0.401 |
| `secondTouchDistance`   |  0.635 |  2.152 |
| `elbowExtensionDegrees` |  171.6 |  163.1 |
| `kneeExtensionDegrees`  |  168.0 |  153.5 |
| `returnError`           |  0.124 |  0.649 |

可报告结论：相同的 2 分背后，第二次触踝、肘膝伸展、回位和躯干旋转仍可明显不同。AI 对
两条分别建议 2 和 1；这不表示 AI 比人工更正确，而是提示 reviewer 回看完整周期。

探索性假设：一条可能依赖较大的躯干旋转完成接触和回位，另一条可能更受对侧肢体协调、
周期顺序或回位控制限制；需要正面机位和专项复核确认。

限制：这是同来源对照，touch distance 是 2D proxy；pain、clearing 和 board alignment
仍需人工确认。

## 证据等级

| 案例        | 关系                 | 主要价值                   | 主要限制                     |
| ----------- | -------------------- | -------------------------- | ---------------------------- |
| Deep Squat  | 跨视频、同机位、同分 | 最直接的同分异型主案例     | 样本仅一对                   |
| ASLR        | 同视频、同侧、同分   | 主任务近似但固定腿策略不同 | 非独立来源                   |
| Hurdle Step | 跨视频、同机位、同分 | 同一定性扣分下参数组合不同 | 尚缺完整 recovery trajectory |
| Rotary      | 同视频、同侧、同分   | 完整周期信息超出单一总分   | 2D touch proxy、非独立来源   |

四个案例共同支持“同分不等于同一种动作完成方式”，但不支持将参数组合命名为临床障碍、
伤病风险或 validated impairment subtype。

它们同时形成了四组可继续检验的运动科学假设，使案例意义不止停留在角度和距离本身，
而是指向潜在的 mobility、stability、coordination 与 compensation pattern。

## 方法与质量控制补充材料

以下结果仍然重要，但在正式报告中归入 measurement QA 与 Limitations：

- ASLR 的 16 个独立窗口中有 11 `good`、2 `watch`、3 `limited`；target-subject ROI
  sensitivity 将 3 个 limited 变为 1 good、2 watch。它说明主体选择影响测量可靠性，
  不是同分异型主发现。
- 最初的 Hurdle score-2 candidate pair 存在 `mixed` 对 `front` 的机位混杂，继续作为
  view-aware feature gate 案例，不再用于支持动作差异。
- Rotary 的 AI coverage 和 conservative disagreement 继续用于 AI-human agreement
  与 fail-closed 讨论，不代替本节的同分周期对照。

![ASLR subject-aware evidence quality](../assets/phase-i-case-studies/aslr-subject-aware-qa.svg)

## 发布边界

- 当前图表可作为无人物媒体的 application candidate。
- 后续应为 ASLR、Hurdle 和 Rotary 的同分案例生成统一视觉语法的数据图。
- 人物或源视频画面公开前仍需 rights/privacy audit。
- 不声称医学诊断、临床验证、伤病预测或 validated impairment subtype。
