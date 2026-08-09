# AI-FMS Camera View 元数据审计

## 结论

历史 `cameraView` 不能直接作为机位真值使用。本次复用了既有 blindability
contact sheets，对 28 个源视频中的 110 个 rep 逐条检查 start、middle、end 三帧，
并用 Round A 两位 reviewer 的正式记录交叉验证。

- 110 / 110 rep 完成视觉审计。
- 65 条历史记录确认不变，45 条建立校正。
- 原始分布：front 92、side 18、mixed 0。
- 审计分布：front 48、side 54、mixed 8。
- Round A 32 条中，两位 reviewer 对机位判断 29 条一致、3 条不一致。
- 29 条双人一致记录全部与本次审计相符；3 条不一致记录均回看画面后解决。

原始 canonical 数据不被覆盖。后续分析通过 `repetitionId` 连接
`auditedCameraView`，同时保留 `originalCameraView` 作为 lineage。

## 按动作结果

| Action                    | Reps | Corrected | Front | Side | Mixed |
| ------------------------- | ---: | --------: | ----: | ---: | ----: |
| Active Straight Leg Raise |   17 |        17 |     0 |   17 |     0 |
| Deep Squat                |   34 |        13 |    17 |   15 |     2 |
| Hurdle Step               |   41 |         5 |    23 |   14 |     4 |
| Rotary Stability          |   18 |        10 |     8 |    8 |     2 |

这说明旧数据并不是“全部 front”。ASLR 的 17 条可用片段均提供侧面证据；Deep
Squat 和 Rotary Stability 的机位较平衡；Hurdle Step 以 front 为主，但存在侧面及
同一 rep 内切换机位的片段。

审计也改变了 case-study 强度：Deep Squat 首要 pair 的两条 rep 均确认是 `side`，
仍可作同机位参数对照；Hurdle Step pair 则是 `mixed` 对 `front`，已降级为
view-confounded 方法学案例。

## 可复现证据

- 审计决策：`research/pilot-v1/camera-view-overrides.json`
- 生成脚本：`scripts/audit-pilot-camera-views.js`
- 生成目录：`research/pilot-v1/generated/camera-view-audit/`
- 执行命令：`npm run data:pilot:camera-views`

生成目录包含逐 rep JSON、CSV、中文报告和 `SHA256SUMS`。若本地研究数据库存在，
脚本会自动读取最新 Round A reviewer event 并拒绝任何与双人一致判断冲突的结果。

## 使用边界

1. 这是人工 metadata QA，不是自动 camera-view classifier 的准确率实验。
2. `mixed` 表示片段存在实质切镜头或斜侧构图，不应硬当成单一 front/side 证据。
3. Contact sheet 只取三帧；机位会影响关键结论时，仍须回看完整 rep 视频。
4. 机位校正不会改变 FMS RAW SCORE，也不支持医疗诊断或功能障碍确诊。
5. 已完成的 label-free profile discovery 未使用 camera view 参与聚类，因此本次校正
   不改变既有 profile 分组；以后按机位分层时必须使用审计字段。

后续 sensitivity rebuild 已验证：66/44 feature readiness、profile groups、Round A
score strata、source-effect flags 和 stability status 均保持不变；详细结果见
`docs/research/camera_audited_feature_sensitivity_2026-08-09.md`。
