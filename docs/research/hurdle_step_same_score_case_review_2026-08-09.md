# Hurdle Step 同分定量异质性案例复核

## 结论状态

- 状态：`exploratory_case_supported`
- 用途：Phase I 技术报告和申请叙事的候选 case study
- 非用途：功能障碍确诊、临床表型命名或受伤风险判断

## 研究问题

FMS Hurdle Step 同为 RAW SCORE 2 的 rep，是否仍可呈现具有解释价值的
pose-derived quantitative 差异？

## 对照设计

本次复核选择两条不同源视频中的 rep：

| 角色                 | Repetition         | Round A | Camera | Side  | Source relation |
| -------------------- | ------------------ | ------: | ------ | ----- | --------------- |
| Label-free outlier   | `rep_40850b8084c3` |       2 | front  | right | different video |
| Same-view comparator | `rep_d13daa76b8a8` |       2 | front  | right | different video |

两条 rep 均由 Ronnie 和 Other Reviewer 在独立 blind Round A 中判为 2 分。
选择同机位、同侧、不同源视频的对照，是为了降低 camera view 和同视频重复带来的
混杂。另一个距离更大的侧视候选未作为主要对照，因为其支撑腿 feature 有缺失，
不适合直接解释为动作差异。

## 定量对比

| Feature              | Outlier | Comparator | 描述性差异   |
| -------------------- | ------: | ---------: | ------------ |
| `peakClearance`      |  0.2956 |     0.2061 | 约高 43%     |
| `stanceAnkleDrift`   |  0.0845 |     0.0184 | 约 4.6 倍    |
| `stepKneeLineOffset` |  0.0435 |     0.0092 | 约 4.7 倍    |
| `hipHeightGap`       |  0.0495 |     0.0166 | 约 3.0 倍    |
| `trunkCenterOffset`  |  0.0023 |     0.0105 | outlier 更低 |

这些数值来自冻结的 `pilot-four-movement-features-v1.0.0`。它们是归一化图像或
角度 proxy，不是临床量角器测量。

## 人工与视频复核

两位 reviewer 对两条 rep 的描述均指向髋、膝、踝对线丢失，同时认为躯干和支撑腿
总体稳定、没有栏架接触。1 fps contact-sheet 复核确认两条都是完整可见的动作周期，
未发现明显的错段、错误人物或空白 pose 证据；截图未纳入仓库，以保留源视频的权限和
隐私边界。

AI feature 与人工观察有两层关系：

1. 更大的 `stepKneeLineOffset` 和 `hipHeightGap` 与更明显的下肢/骨盆对线偏离方向一致。
2. `stanceAnkleDrift` 把 outlier 标为更不稳定，但人工评论认为支撑腿稳定。这是需要
   定向核查 peak-frame、recovery phase 和机位敏感性的 AI-human discrepancy，不能
   静默解释为人工漏判。

## 可报告发现

该案例支持一个比“发现了第二种障碍类型”更准确的结论：

> 相同的 FMS ordinal score 可以覆盖同一规则失败家族中的不同程度和不同参数组合；
> pose-derived features 能补充这种连续、多维差异，而不替代人工 FMS 判断。

这正好说明 AI-FMS 的增量价值：FMS 2 分保留清晰、可执行的 ordinal decision，
定量 panel 则进一步描述动作是如何偏离的。现有证据尚不能把参数组合连接到具体功能
障碍或临床结局。

## 下一步

1. 将该 pair 保留为首个 provisional case study。
2. 复核 `stanceAnkleDrift` 的 peak-frame 和 recovery-phase 计算，解释 AI-human 差异。
3. 用同样的同机位、不同视频原则复核 Deep Squat 的同分 pair。
4. 最终报告使用参数 panel 和视频帧对照，不命名离散 impairment phenotype。
