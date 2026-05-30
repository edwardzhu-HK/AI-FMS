# AI Draft Timing 批量 QA（2026-05-23）

## 测试目的

这次测试专门验证“在含有等待、讲解或其他冗余片段的视频中，系统能否稳定找到真正有效动作周期，并把它作为 segment timing 的 AI draft”。

当前结论不是“已经完全稳定”，而是：

- Deep Squat 的现有 3 条 pose 样本表现稳定。
- ASLR 的 1-rep / 2-rep 样本表现稳定；4-rep 样本现在会明确提示
  `no_unique_cycle_assignment`，说明 pose 只检测到 2 个可靠动作周期，不应自动生成
  4 个独立 clips。
- Hurdle Step 7-rep 样本在加入 ordered one-to-one matching 后，可以从全范围视频中
  选出 7 个唯一动作周期；重叠周期去重后候选 cycle 从 13 个降到 11 个，但仍多于
  Expected Reps，后续需要继续区分主动作与准备/回程噪声。
- In-Line Lunge 的 6-rep 样本在重叠周期去重后可以生成 6/6 AI draft timing；4-rep
  样本仍只检测到 2 个可靠 cycle，应保持人工复核。
- Shoulder Mobility 当前只是 feature-only evidence，不应被当作稳定的 AI draft timing。

## 测试方法

对现有 pose JSON 资产做两段式测试：

1. 先用当前 `Start/End + Expected Reps` 生成粗 segment。
2. 使用 movement-specific timing helper 检测 pose-based cycle。
3. 使用 detected cycle 前后各约 `0.2s` buffer 生成 AI draft timing。
4. 使用 ordered one-to-one matching：每个 detected cycle 最多只能分配给一个
   segment，未匹配到唯一 cycle 的 segment 标记为 `no_unique_cycle_assignment`。
5. 对重叠度很高的 candidate cycles 做去重，优先保留动作信号更强、可见度更好的周期。
6. 重新跑 Timing QA，检查每个 segment 是否覆盖唯一的动作周期。

## 测试样本与结果

| 样本                      | 动作              | Expected Reps | Pose 覆盖 | 粗切 QA |  AI draft QA | 候选 cycle | 结论                                             |
| ------------------------- | ----------------- | ------------: | --------- | ------: | -----------: | ---------: | ------------------------------------------------ |
| Sample-1 mixed views      | Deep Squat        |             7 | 441/441   |     7/7 |          7/7 |          7 | 稳定                                             |
| front only                | Deep Squat        |             3 | 179/179   |     3/3 |          3/3 |          3 | 稳定                                             |
| side only                 | Deep Squat        |             4 | 261/261   |     4/4 |          4/4 |          4 | 稳定                                             |
| 2 reps score 3            | ASLR              |             2 | 237/237   |     2/2 |          2/2 |          2 | 稳定                                             |
| 1 rep score 1 right       | ASLR              |             1 | 48/48     |     1/1 |          1/1 |          1 | 稳定                                             |
| 4 reps score 2            | ASLR              |             4 | 523/598   |     2/4 |          2/4 |          2 | 需要复核：只检测到 2 个唯一 cycle                |
| 2 reps score 3            | Hurdle Step       |             2 | 370/462   |     2/2 |          2/2 |          5 | 可用，但候选 cycle 多于 Expected Reps            |
| 7 reps score 3 full range | Hurdle Step       |             7 | 556/592   |     4/7 |          7/7 |         11 | AI draft 可以从冗余全范围中切出 7 个有效动作     |
| 7 reps score 3 demo range | Hurdle Step       |             7 | 556/592   |     7/7 |          7/7 |         11 | 默认 demo 范围可用                               |
| 1 rep score 3             | In-Line Lunge     |             1 | 56/56     |     1/1 |          1/1 |          1 | 稳定                                             |
| 4 reps score 2            | In-Line Lunge     |             4 | 165/165   |     0/4 |          2/4 |          2 | 需要复核：只检测到 2 个唯一 cycle                |
| 6 reps score 3            | In-Line Lunge     |             6 | 561/602   |     2/6 |          6/6 |          6 | 重叠周期去重后稳定                               |
| 1 rep score 3 right       | Shoulder Mobility |             1 | 114/141   |     1/1 | feature-only |         45 | 不纳入 AI draft timing                           |
| 2 reps score 2            | Shoulder Mobility |             2 | 220/220   |     2/2 | feature-only |        188 | 不纳入 AI draft timing                           |
| 2 reps score 1 both long  | Shoulder Mobility |             2 | 1132/1218 |     2/2 | feature-only |        770 | 不纳入 AI draft timing；长视频尤其不能当作已解决 |

## 已修复的质量门槛

本轮发现一个关键风险：多个 segment 可能被映射到同一个 detected cycle，但旧版 Timing QA 仍可能显示为 OK。现在已加保护：

- 新增 `duplicate_cycle_assignment` timing issue。
- 新增 ordered one-to-one cycle-to-rep matching，使一个 detected cycle 最多只能分配给一个
  segment。
- 新增 `no_unique_cycle_assignment` timing issue，用于标出没有匹配到唯一动作周期的
  segment。
- 新增重叠 candidate cycle 去重，避免同一次动作的两个相邻峰值被当作两个 reps。
- 一旦多个 segment 使用同一个 cycle，Timing QA 会标记为 `needs_adjustment`。
- AI draft timing 自动应用时会跳过重复 cycle 或无法唯一分配的项，避免把同一个动作复制给多个
  segment，或把缺失动作伪造成有效 clip。
- UI 已在 Segment 列表和 Segment 元数据区域显示 reviewer-facing blocker 说明：
  `no_unique_cycle_assignment` 会解释为“未匹配到唯一动作周期”，并提示检查视频是否真的包含该
  rep、Expected Reps 是否正确，或是否需要手动调整 timing。
- 正式 Ingest readiness 已接入 Timing QA blocker：如果 timing rows 仍有
  `needs_adjustment`、重复 cycle 或无法唯一分配 cycle，左侧 Ready 会保持 No，Ingest 按钮会被禁用。
  JSON/CSV/Package export 仍保留，用于调试、复核和离线讨论。
- 截至 2026-05-30，ASLR / Hurdle Step / In-Line Lunge timing report 已加入
  batch-level `cycleCountQa`。它会同时记录 expected segment count、candidate
  cycle count、assigned cycle count，并输出 `detected_cycle_shortfall`、
  `assigned_cycle_shortfall`、`extra_candidate_cycles` 等 issue code。shortfall
  会阻断正式 ingest；extra candidate cycles 保留为 review warning，用于提醒 reviewer
  判断检测器看到的是有效 reps、准备动作、回程动作还是噪声。
- Shoulder Mobility 标记为不支持 `AI draft timing` 自动应用，避免把 feature-only evidence 误称为动作切片。

## 后续开发建议

1. 已完成：对 ASLR / Hurdle / In-Line Lunge 增加 `detectedCycles vs expectedReps` 的显式 QA：
   - cycle 少于 expected reps：提示可能漏检或 expected reps 错误。
   - cycle 多于 expected reps：提示可能检测到了准备动作、回程动作或噪声。
2. 继续为 Hurdle Step 增加 movement-specific cycle filtering，减少额外候选 cycle。
3. 对 ASLR 4-rep 和 In-Line Lunge 4-rep 样本做人工复核：判断是 pose 漏检、视频只包含
   2 个真正完整动作，还是 expected reps 标注需要修正。
4. 对 long instructional videos 增加 “active action windows” 报告，而不是只给整体 Start/End。
5. 后续可以把 Timing QA blocker 进一步写入 dataset package 的 machine-readable quality gates，
   方便 Ronnie 或后续 reviewer 在离线包里快速判断是否可训练。
