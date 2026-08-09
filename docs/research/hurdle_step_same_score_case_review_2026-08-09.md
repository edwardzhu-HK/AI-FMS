# Hurdle Step 同分定量异质性案例复核

## 结论状态

- 状态：`exploratory_case_view_confounded`
- 用途：Phase I 技术报告中的 metadata QA 和 feature-audit 次要案例
- 非用途：功能障碍确诊、临床表型命名或受伤风险判断

## 研究问题

FMS Hurdle Step 同为 RAW SCORE 2 的 rep，是否仍可呈现具有解释价值的
pose-derived quantitative 差异？

## 对照设计

本次复核选择两条不同源视频中的 rep：

| 角色               | Repetition         | Round A | Audited view | Side  | Source relation |
| ------------------ | ------------------ | ------: | ------------ | ----- | --------------- |
| Label-free outlier | `rep_40850b8084c3` |       2 | mixed        | right | different video |
| Comparator         | `rep_d13daa76b8a8` |       2 | front        | right | different video |

两条 rep 均由 Ronnie 和 Other Reviewer 在独立 blind Round A 中判为 2 分。最初按
historical metadata 将两条都视为 `front`；全池 camera-view 审计后，outlier 被两位
reviewer 和 contact sheet 一致确认为 `mixed`，comparator 为 `front`。因此该 pair
仍可用于发现问题，但不能再作为严格同机位对照。

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

该案例呈现相同 FMS 分数下的参数差异，但 camera view 是无法排除的混杂因素。因此
它只支持一个更保守的结论：

> 相同 FMS ordinal score 的 rep 可以出现不同 quantitative feature panel，但只有在
> 机位一致或完成 view-aware 校正后，才能进一步判断差异主要来自动作还是拍摄方式。

这个结果没有被删除，因为它清楚展示了 AI-FMS 为什么需要 traceable metadata 和
feature QA。现有证据不能把该 pair 的全部参数差异归因于动作本身，更不能连接到具体
功能障碍或临床结局。

## 下一步

1. 将该 pair 降级为次要、view-confounded 方法学案例。
2. 复核 `stanceAnkleDrift` 的 peak-frame 和 recovery-phase 计算，解释 AI-human 差异。
3. 首要 same-score 案例改用两条审计后均为 `side` 的 Deep Squat pair。
4. 最终报告如引用本 pair，必须同时显示 audited view limitation。
