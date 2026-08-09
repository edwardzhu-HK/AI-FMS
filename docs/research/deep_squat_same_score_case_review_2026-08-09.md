# Deep Squat 同分定量异质性案例复核

## 结论状态

- 状态：`exploratory_case_supported`
- 用途：Phase I 技术报告和申请叙事的优先 case study
- 非用途：功能障碍确诊、临床表型命名或受伤风险判断

## 研究问题

两条都因为脚跟垫高而得到 FMS Deep Squat RAW SCORE 2 的 rep，动作完成质量是否仍有
可解释的定量差异？

## 对照设计

| 角色                           | Repetition         | Round A | Audited view | Source relation |
| ------------------------------ | ------------------ | ------: | ------------ | --------------- |
| Shallower/uncertain-depth case | `rep_489b80ba8943` |       2 | side         | different video |
| Deeper case                    | `rep_ce280c79a07d` |       2 | side         | different video |

两条 rep 均由 Ronnie 和 Other Reviewer 在独立 blind Round A 中判为 2 分。两位
reviewer 对第一条是否达到股骨低于水平面保持谨慎，对第二条则明确认为达到足够深度；
两条最终都因为脚跟垫高而按 FMS 规则得到 2 分。

源视频逐帧检查显示两条动作都完整、人物正确、垫板可见，未发现明显错段或空白 pose。
画面实际为侧面证据，而 canonical `cameraView` 均记录为 `front`。全池 camera-view
审计已将两条 rep 的 `auditedCameraView` 校正为 `side`；本案例仍不使用机位差异解释
两条动作，因为二者现在属于同一审计机位。

## 定量对比

| Feature                 | Shallower case | Deeper case | 解释                           |
| ----------------------- | -------------: | ----------: | ------------------------------ |
| `peakDepthRatio`        |         0.6600 |      0.7542 | deeper case 约高 14%           |
| `hipKneeVerticalGap`    |        -0.0121 |      0.0673 | deeper case 的髋部相对膝部更低 |
| `hipAngleDegrees`       |           86.3 |        42.8 | deeper case 髋屈曲更多         |
| `kneeAngleDegrees`      |           64.9 |        35.0 | deeper case 膝屈曲更多         |
| `ankleShankLeanDegrees` |           32.4 |        15.1 | 两条下肢策略不同               |
| `maxKneeAnkleOffset`    |         0.0709 |      0.0403 | shallower case 约高 76%        |

数值来自冻结的 `pilot-four-movement-features-v1.0.0`，均是视频 pose-derived proxy，
不是临床量角器测量。

## 可报告发现

这个案例把 AI-FMS 的增量价值表达得很直接：

> FMS 规则正确地把两条脚跟垫高的动作都归为 2 分；AI-FMS 没有推翻这个分数，而是
> 进一步显示，一条动作更深、髋膝屈曲更多，两条还采用了不同的踝和膝控制策略。

因此，“同分异质性”不一定意味着两个离散障碍类型。它也可能表示同一个规则结果下
存在不同完成程度和运动策略。定量参数让这种差别可以被记录、比较和追踪。

相比 Hurdle Step provisional case，本案例的AI参数与人工深度判断方向一致，且两条
rep的2分来源清晰，因此更适合作为最终报告中的首要说明案例。

## 下一步

1. 将该 pair 设为首要 application-facing case study。
2. 对两条rep截取同一动作阶段的脱敏帧，并添加简明参数对比图。
3. [x] 完成全池 `cameraView` 审计；本 pair 的审计机位均为 `side`。
4. 不把角度差异解释为具体功能障碍，除非后续获得专家或外部标签支持。
