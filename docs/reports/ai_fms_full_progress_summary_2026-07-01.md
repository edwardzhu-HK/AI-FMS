# AI-FMS 从接手到当前的完整进展总结

日期：2026-07-01
项目路径：`/Users/ronnie/Desktop/Codex-Projects/AI-FMS`
定位：AI-assisted, human-in-the-loop FMS video annotation and movement-quality dataset platform

## 1. 总结

从项目移交到现在，AI-FMS 已经从一个以 React/Vite workbench、mock API 和人工标注流程为主的 FMS calibration prototype，推进成一个更完整的 human-in-the-loop FMS 视频标注、pose evidence、AI-assisted review 和 dataset export 平台。

当前项目的核心方向不是“全自动 FMS 打分器”，也不是医疗诊断工具，而是：

- 帮助 reviewer 对 FMS 视频进行切片、循环播放、人工评分和 adjudication。
- 在合适的视频和动作上加入 MediaPipe pose evidence、timing QA、movement features 和 explainable AI suggestion。
- 保留 human reviewer 的最终判断，尤其是 pain、clearing test、setup ambiguity 和 FMS manual 中需要人工确认的部分。
- 把每一次 review、AI evidence、segment timing、side metadata 和 export record 做成可追溯的数据，为后续 movement-quality model 和申请展示打基础。

目前 Deep Squat 是最完整的 flagship AI pipeline；Active Straight Leg Raise、Hurdle Step、In-Line Lunge、Shoulder Mobility 和 Trunk Stability Push-Up 已进入 first-pass pose-based AI suggestion 阶段；Rotary Stability 目前保持 feature-only，不输出 AI RAW SCORE。

## 2. 项目定位和范围调整

项目接手后，首先完成的是方向重置：

- 明确 AI-FMS 是 AI-assisted、human-in-the-loop 的 FMS video annotation / movement-quality dataset platform。
- 不把项目表述为 medical diagnosis tool。
- 不承诺替代 certified FMS professional。
- 保留 7 个 FMS movement 的 workflow-level annotation 能力。
- 把 Deep Squat 作为 V1.5 的 flagship AI pipeline。
- 后续按 V1.7 逐步扩展到 ASLR、Shoulder Mobility、Hurdle Step、In-Line Lunge、Trunk Stability Push-Up 和 Rotary Stability。

这个方向已经沉淀到以下文档：

- `AGENTS.md`
- `README.md`
- `docs/backlog.md`
- `docs/specs/v1_5_scope_and_roadmap.md`
- `docs/specs/v1_7_movement_maturity_and_side_clearing.md`
- `docs/specs/fms_manual_scoring_baseline.md`
- `RONNIE_CODEX_HANDOFF.md`

## 3. 保留并复用的原有基础

开发过程中没有重写项目，而是优先复用并增强原来的系统：

- React/Vite workbench。
- Mock API workflow。
- Local HTTP API stub。
- 7 个 FMS action selector。
- 视频上传、Start/End 分析范围、Expected Reps 和 Notes-assisted segmentation。
- Segment list、loop playback、previous/next navigation。
- Reviewer A/B scoring forms。
- A/B/AI adjudication logic。
- Consistency snapshot。
- JSON / CSV export。
- Manifest validation、manifest import、sample inventory scripts。
- Node test suite。

这个复用策略很重要，因为主线合并时可以看到项目是“沿着原架构长出来的”，而不是另起一套不兼容流程。

## 4. 评分和数据模型升级

评分模型从早期的 1/2/3 扩展为更符合 FMS 逻辑的 0/1/2/3，并加入更多 rep-level metadata：

- `pain_flag`
- `clearing_test`
- `clearingFindings`
- `rubric_version`
- `side`
- `criteriaScores`
- legacy `subscores` compatibility
- reviewer score-basis metadata
- rep-level RAW SCORE scope
- action-specific side / clearing / pain policy metadata

当前设计区分了几层分数：

- Attempt score：某一次 attempt / rep 在特定 setup 下的分数。
- Raw score：rep 或 side 层面的原始人工分数。
- AI suggestion：基于 pose/features 的 reviewer-facing 建议。
- Final score：根据 FMS manual 的 movement-level 规则推导后的最终分数。
- Total score：完整 screen 中多个 movement final scores 的总和。

这避免了一个常见问题：把某个 segment 的 AI suggestion 直接当成 official final score。

## 5. Deep Squat Flagship Pipeline

Deep Squat 是当前最完整的一条 pipeline，已经覆盖：

- MediaPipe pose extraction。
- 真实 pose JSON。
- skeleton overlay。
- pose quality summary。
- squat timing / movement cycle detection。
- segment timing QA。
- feature evidence。
- explainable AI suggestion。
- FMS manual staged scoring logic。
- heel-elevated / FMS board attempt handling。
- not scored / needs board review workflow。
- ingest readiness 和 dataset export evidence。

### 5.1 Pose JSON 和 Skeleton Overlay

当前项目支持上传或预加载 MediaPipe pose JSON，并将真实 keypoints 渲染到视频上。

相关文件：

- `scripts/extract-pose-landmarks.py`
- `src/components/KeypointOverlay.jsx`
- `src/lib/pose-landmarks.js`
- `docs/specs/pose_landmarks_schema.md`

重要原则：

- 有真实 pose JSON 时显示真实 skeleton overlay。
- 没有真实 pose JSON 时只能显示明确标注的 demo skeleton，不能把 mock skeleton 当作模型输出。
- pose JSON 中保留 source video、model metadata、frame landmarks、world landmarks、visibility 和 processed windows。

当前本地工作区可见的 Deep Squat pose JSON 包括：

- `Eval_Videos/01-Deep Squat/pose/Sample-1.pose.json`
- `Eval_Videos/01-Deep Squat/pose/front.pose.json`
- `Eval_Videos/01-Deep Squat/pose/side.pose.json`
- `Eval_Videos/Sample videos/1-Squat/pose/4reps score 2.pose.json`
- `Eval_Videos/Sample videos/1-Squat/pose/4reps score 2 (2).pose.json`
- `Eval_Videos/Sample videos/1-Squat/pose/3reps score 3.pose.json`
- `Eval_Videos/Sample videos/1-Squat/pose/3reps.pose.json`
- `Eval_Videos/Sample videos/1-Squat/pose/3 reps.pose.json`
- `Eval_Videos/Sample videos/1-Squat/pose/3 (2) reps score 3.pose.json`
- `Eval_Videos/Sample videos/1-Squat/pose/2reps score 3.pose.json`
- `Eval_Videos/Sample videos/1-Squat/pose/2reps score 2.pose.json`
- `Eval_Videos/Sample videos/1-Squat/pose/5reps score 2.pose.json`
- `Eval_Videos/Sample videos/1-Squat/pose/1 rep score 2.pose.json`

### 5.2 Segment Timing QA

新增并完善了 Deep Squat timing QA：

- 检测 squat cycle。
- 找 lowest point。
- 给出 suggested start/end。
- 计算 coverage。
- 标记 missing start、missing return、too short、wide lead/tail 等问题。
- 对 detected cycles 和 expected reps 不一致的情况给出 blocker 或 warning。
- 支持 reviewer 手动调整 segment timing，并保留 suggested vs manual 的差异。

相关文件：

- `src/lib/deep-squat-timing.js`
- `src/lib/ai-draft-timing.js`
- `src/lib/timing-qa.js`
- `src/components/SegmentList.jsx`
- `src/components/SegmentEditor.jsx`
- `src/components/SegmentTimingReport.jsx`

针对用户上传的深蹲样片，已经解决了两个重点问题：

- 不再把教练和学员对话、等待、准备等无关情节作为 rep segment。
- 每个 rep 尽量裁成从动作开始到动作结束，而不是一个过长大段。

### 5.3 Deep Squat Feature Evidence

Deep Squat feature evidence 包括：

- depth proxy
- torso control
- knee alignment
- hip / knee / ankle proxy angles
- front-view vs side-view evidence limitation
- pose visibility / confidence
- timing coverage

相关文件：

- `src/lib/deep-squat-features.js`
- `src/lib/deep-squat-suggestion.js`
- `src/components/DeepSquatFeatureSnapshot.jsx`
- `src/components/ScoreSummary.jsx`

AI suggestion 会输出 reviewer-readable explanation，而不是只给一个分数。对于 front-view 无法可靠判断的 torso / depth 细节，系统应标记 evidence limitation，而不是强行给高置信结论。

### 5.4 FMS Manual Deep Squat Final Score

根据 FMS manual baseline，Deep Squat 的 final score 是 staged process：

1. 先看 heels on floor attempts。
2. 如果 floor attempt 能达到 score 3，则 final score 为 3。
3. 如果 floor attempt 未达到 3，再看 FMS board / heel-elevated attempts。
4. heel-elevated attempts 最高只能用于 score 2，不能给 3。
5. 如果 heel-elevated attempt 达到 score-2 criteria，则 final score 为 2。
6. 如果 heel-elevated 后仍然达不到 score-2 criteria，则 final score 为 1。
7. pain 或 clearing fail 会覆盖为 0。

这个逻辑解决了用户指出的关键问题：

- 一个动作很完美，但脚后跟垫高完成，不应给 3，应按 staged rule 给 2。
- 如果 floor attempt 不满足 3，但 board attempt 表现良好，final score 不应一直 pending，而应能得到 2。
- 如果当前只有 floor attempt 且未达到 3，可以出现 `not scored / needs board`，提示需要继续 board condition 后再 final score。

相关文件：

- `src/lib/fms-final-score.js`
- `tests/fms-final-score.test.js`
- `src/components/DeepSquatFinalScorePanel.jsx`
- `docs/specs/fms_manual_scoring_baseline.md`

## 6. Reviewer Workflow 改进

人工审核流程从单纯的分数输入，升级为更接近 scoresheet-like review：

- Reviewer A / B 保留 raw score、reviewer ID 和 comment。
- 增加 `Not scored / needs board` 选项。
- not-scored 状态也必须写清楚原因，不再只显示 pending。
- reviewer score 与 AI criteria suggestion 分开保存。
- pain 和 clearing test 由 human reviewer 确认，AI 不自动判 pain。
- Segment Metadata UI 支持 side、pain、clearing、manual timing 等字段。

这让系统更适合实际标注：AI 可以提供 evidence 和 suggestion，但 reviewer 仍然是最终解释和确认的人。

## 7. Ingest、History 和 Dataset Export

当前系统已经支持：

- 检查 readiness。
- mock ingest。
- ingest history / 已入库数据面板。
- JSON export。
- CSV export。
- dataset package ZIP export。
- export quality summary。
- pose evidence coverage。
- timing correction summary。
- reviewer agreement / AI-final agreement。
- movement-level valid / pending / invalid summary。

相关文件：

- `src/components/IngestHistoryPanel.jsx`
- `src/lib/dataset-export.js`
- `src/lib/dataset-csv.js`
- `src/lib/dataset-package.js`
- `src/lib/export-quality.js`
- `src/lib/consistency.js`
- `server/api-stub.js`
- `src/api/mockCalibrationApi.js`
- `src/api/realCalibrationApi.js`

导出的数据不只是分数，还包括：

- segment metadata
- timing provenance
- pose evidence summary
- AI suggestion evidence
- reviewer labels
- adjudication result
- side suggestion
- clearing / pain metadata

这使项目从 demo UI 更接近一个 traceable training data workflow。

## 8. V1.6 Dataset 和 AI Draft Timing

V1.6 的重点是把 Deep Squat demo 发展为更稳定的 dataset workflow：

- 一键导出 dataset package。
- 更清楚的 export / ingest readiness checklist。
- localStorage 保存 reviewer scores、segment metadata、active preset 和 selected segment。
- AI draft timing：Start/End 只定义分析范围，真正 segment 默认由 pose-detected movement cycles 生成。
- raw detected cycle 保留在 poseTiming，用于 audit/export。
- manual edit 会覆盖 segment timing，并保留 provenance。
- duplicate cycle assignment / no unique cycle assignment 被作为 timing QA blocker。

相关文件：

- `src/lib/ai-draft-timing.js`
- `src/lib/pose-active-periods.js`
- `src/lib/segmenting.js`
- `docs/ai_draft_timing_batch_qa_2026-05-23.md`

这个阶段解决的是“长视频里有很多无关片段”的实际问题：系统不能简单按文件名或 Expected Reps 平均切片，而应该尽量基于 pose trajectory 找有效动作段。

## 9. V1.7 多动作扩展

项目现在不再只是 Deep Squat demo。V1.7 已经把多个动作接入到统一的 movement adapter / evidence gate 思路中。

### 9.1 当前成熟度

| Action                    | 当前状态      | 说明                                                                            |
| ------------------------- | ------------- | ------------------------------------------------------------------------------- |
| Deep Squat                | implemented   | 最完整 pipeline：timing、features、AI suggestion、Final Score rule              |
| Active Straight Leg Raise | implemented   | 有 timing、features、side evidence、AI suggestion                               |
| Hurdle Step               | implemented   | 有 timing、features、clearance / stance control evidence、AI suggestion         |
| In-Line Lunge             | implemented   | 有 timing、features、front knee-foot / rear leg / trunk evidence、AI suggestion |
| Shoulder Mobility         | implemented   | 有 conservative pose suggestion；clearing / pain 仍需人工                       |
| Trunk Stability Push-Up   | implemented   | 有 first-pass timing/features/suggestion；需要更多样本校准                      |
| Rotary Stability          | features-only | 有 pose evidence 和 side suggestion，但暂不输出 AI RAW SCORE                    |

### 9.2 Movement Adapter 和 Evidence Gate

新增 movement capability registry，用来明确每个动作当前是：

- `implemented`
- `features_only`
- `annotation_only`

这避免了 UI 或 export 把 feature-only 的动作包装成完整 AI scoring。

相关文件：

- `src/lib/movement-adapters.js`
- `tests/movement-adapters.test.js`
- `docs/specs/v1_7_movement_maturity_and_side_clearing.md`

### 9.3 ASLR

Active Straight Leg Raise 已加入：

- timing helper
- feature helper
- suggestion helper
- active leg raise zones
- stationary leg control proxy
- side confidence
- browser-verifiable demo path

相关文件：

- `src/lib/aslr-timing.js`
- `src/lib/aslr-features.js`
- `src/lib/aslr-suggestion.js`
- `tests/aslr-timing.test.js`
- `tests/aslr-features.test.js`
- `tests/aslr-suggestion.test.js`

### 9.4 Shoulder Mobility

Shoulder Mobility 已加入：

- reach proxy
- hand visibility
- shoulder reference
- side context
- conservative AI suggestion
- pain / clearing limitation explanation

但 Shoulder Mobility 仍需要 Ronnie 继续校准 thresholds 和 reviewer-facing language。

相关文件：

- `src/lib/shoulder-mobility-timing.js`
- `src/lib/shoulder-mobility-features.js`
- `src/lib/shoulder-mobility-suggestion.js`
- `docs/specs/v1_7_shoulder_mobility_pose_probe.md`

### 9.5 Hurdle Step

Hurdle Step 已加入：

- cycle detector
- clearance zones
- stance leg control
- pelvis/trunk control
- stepping-leg alignment proxy
- side suggestion
- pose-based AI suggestion

相关文件：

- `src/lib/hurdle-step-timing.js`
- `src/lib/hurdle-step-features.js`
- `src/lib/hurdle-step-suggestion.js`
- `docs/specs/v1_7_hurdle_step_pose_probe.md`

### 9.6 In-Line Lunge

In-Line Lunge 已加入：

- lunge depth timing
- trunk / pelvis control
- rear-leg control
- front knee-foot line proxy
- side suggestion
- ankle clearing metadata
- pose-based AI suggestion

相关文件：

- `src/lib/inline-lunge-timing.js`
- `src/lib/inline-lunge-features.js`
- `src/lib/inline-lunge-suggestion.js`
- `docs/specs/v1_7_inline_lunge_pose_probe.md`

### 9.7 Trunk Stability Push-Up

Trunk Stability Push-Up 已加入 first-pass：

- best push-up frame timing
- push-up lift
- trunk/body-line stability
- arm extension
- hip-drift compensation proxy
- pose-based AI suggestion
- extension clearing reminder

相关文件：

- `src/lib/trunk-stability-timing.js`
- `src/lib/trunk-stability-features.js`
- `src/lib/trunk-stability-suggestion.js`

### 9.8 Rotary Stability

Rotary Stability 当前是 feature-only：

- rotary reach
- trunk rotation
- balance stability
- side-confidence evidence
- pose feasibility probe

目前不显示 AI RAW SCORE，因为 phase/side semantics 和 scoring thresholds 还没有足够稳定。

相关文件：

- `src/lib/rotary-stability-timing.js`
- `src/lib/rotary-stability-features.js`
- `docs/rotary_feature_probe_report_2026-05-31.md`

## 10. Side、Clearing 和 Pain 边界

项目加入了统一的 side suggestion 和 clearing readiness 思路。

### 10.1 AI Side Suggestion

ASLR、Hurdle Step、In-Line Lunge、Shoulder Mobility、Rotary Stability 等 lateralized actions 现在可以输出 segment-level `aiSideSuggestion`。

原则：

- AI 可以建议 side，但不能覆盖 reviewer 保存的 side。
- reviewer side 和 AI side suggestion 同时进入 export。
- `unknown` 是合法状态。
- Deep Squat 和 Trunk Stability Push-Up 这类 non-lateralized action 显示为 `none`。

相关文件：

- `src/lib/ai-side-suggestion.js`
- `tests/ai-side-suggestion.test.js`

### 10.2 Clearing / Pain

clearing 和 pain 的边界保持保守：

- AI 不自动判断 pain positive / negative。
- Shoulder、Trunk、Rotary、In-Line Lunge 等有 clearing policy 的动作必须提醒 reviewer 人工确认。
- 未确认 clearing 的 segment 会影响 formal ingest readiness。

相关文件：

- `src/lib/clearing-readiness.js`
- `tests/clearing-readiness.test.js`

## 11. Video Manager 和样本管理

项目加入了 AI-FMS Video Manager sub-feature，用于支持数据集扩展：

- 独立 manager 页面。
- local manager API。
- action-specific library view。
- YouTube candidate recommendations。
- download confirmation。
- queue status。
- sample video inventory。
- sample manifest validation。

相关文件：

- `video-manager.html`
- `src/video-manager/main.jsx`
- `src/video-manager/styles.css`
- `server/video-manager-api.js`
- `docs/video_manager_subfeature.md`
- `scripts/inventory-sample-videos.js`
- `scripts/validate-sample-manifests.js`
- `scripts/discover-fms-videos.js`
- `scripts/download-approved-fms-videos.js`

Video Manager 是 dataset expansion support feature，不改变主 workbench 的 scoring / reviewer / ingest semantics。

## 12. 文档和申请材料

除了工程实现，项目也准备了 application-facing 材料：

- `docs/AI-FMS_project_brief_application.md`
- `docs/AI-FMS_project_brief_application.pdf`
- `docs/project_page_copy_ai_fms_v1_5.md`
- `docs/demo_walkthrough_script_ai_fms_v1_5.md`
- `docs/technical_report_outline_ai_fms_v1_5.md`
- `docs/application_package_notes_ai_fms_v1_5.md`
- `docs/dataset_card_deep_squat_v1_5_draft.md`
- `docs/sample_video_inventory.md`
- `docs/four_movement_testing_handoff_2026-05-23.md`
- `docs/seven_action_testing_handoff_2026-05-23.md`

这些文档的叙事重点是：

- Ronnie 的长期游泳背景。
- Human Movement Science / Kinesiology / Exercise Science 兴趣。
- FMS 学习和运动质量观察。
- AI-assisted sports health technology。
- interpretable AI 和 traceable dataset workflow。

## 13. 当前运行方式

安装依赖：

```bash
npm install
```

运行默认 mock-mode workbench：

```bash
npm run dev
```

运行 local HTTP API stub：

```bash
npm run api:stub
```

前端连接本地 API stub：

```bash
npm run dev:real
```

运行 Video Manager：

```bash
npm run dev:manager
npm run api:video-manager
```

运行质量检查：

```bash
npm run check
```

四动作 demo readiness：

```bash
npm run demo:check:four
```

四动作 mock workflow smoke：

```bash
npm run demo:flow:four
```

七动作 mock workflow smoke：

```bash
npm run demo:flow:seven
```

## 14. 当前测试覆盖

当前 `tests/` 目录下有 44 个 `.test.js` 文件，覆盖范围包括：

- segmentation
- timing QA
- Deep Squat timing / features / suggestion / final score
- ASLR timing / features / suggestion
- Shoulder Mobility timing / features / suggestion
- Hurdle Step timing / features / suggestion
- In-Line Lunge timing / features / suggestion
- Trunk Stability timing / features / suggestion
- Rotary Stability timing / features
- movement adapters
- AI side suggestion
- clearing readiness
- adjudication
- consistency
- export quality
- dataset JSON / CSV / package export
- mock API
- manifest utilities
- sample video inventory
- video manager API
- four-movement and seven-action workflow smoke tests

主要测试命令：

```bash
npm run lint
npm run format
npm run test
npm run build
npm run check
```

## 15. 当前本地资产概况

当前工作区可见：

- `Eval_Videos` 下有 75 个 MP4 文件。
- 7 个 canonical movement manifest：
  - `Eval_Videos/01-Deep Squat/manifest.csv`
  - `Eval_Videos/02-Hurdle Step/manifest.csv`
  - `Eval_Videos/03-In-Line Lunge/manifest.csv`
  - `Eval_Videos/04-Shoulder Mobility/manifest.csv`
  - `Eval_Videos/05-Active Straight Leg Raise/manifest.csv`
  - `Eval_Videos/06-Trunk Stability Push-Up/manifest.csv`
  - `Eval_Videos/07-Rotary Stability/manifest.csv`
- 当前可见的 active Deep Squat pose JSON 主要集中在 canonical Deep Squat demo 和 `Sample videos/1-Squat/pose/`。
- `package.json` 中已经保留多动作 pose extraction scripts，覆盖 Deep Squat、ASLR、Shoulder、Hurdle Step、In-Line Lunge、Trunk Stability Push-Up 和 Rotary Stability。

## 16. 已解决的典型问题

这段开发中解决了多个真实使用时暴露的问题：

- 长视频中无关对话、等待、准备片段被误识别为 reps。
- 文件名写 `2reps` 但实际视频有 5 reps，系统需要以 pose windows / detected cycles 为准。
- front-view 视频无法可靠判断所有关节角度，需要标记 evidence limitation。
- skeleton overlay 不能用 mock keypoints 冒充真实 pose。
- AI 不能在没有 pose evidence 时给出看似确定的高分。
- heel-elevated 深蹲不能给 3，但可以作为 FMS board condition 推导 final score 2。
- floor attempt 未达到 3 时，系统需要支持 `not scored / needs board`，而不是强行打 1/2。
- Not scored 状态也必须有原因解释。
- clearing / pain 不能由 AI 自动判断。
- side suggestion 不能覆盖 reviewer side。
- Rotary Stability 当前 evidence 不足，应该 feature-only，不应输出 AI RAW SCORE。

## 17. 当前限制

当前项目仍有一些明确限制：

- 真实 backend persistence 尚未完成，当前主要是 mock API / local API stub。
- pose extraction 是本地工具链，还没有接成稳定的后台自动 job。
- Deep Squat 最成熟，其他动作还需要更多 Ronnie 专业校准和更多 score 1/2/3 样本。
- Shoulder Mobility thresholds 和 pain / clearing language 需要继续校准。
- Hurdle Step 在 candidate cycles 超过 expected reps 时仍需要更强的 movement-specific filtering。
- In-Line Lunge 的 4-rep score-2 样本召回仍需继续调。
- Trunk Stability Push-Up 需要更多 score 1/2 样本校准。
- Rotary Stability 仍不适合输出 AI RAW SCORE。
- 单一 front-view 或 side-view 视频只能提供 partial evidence，不能替代完整人工观察。

## 18. 下一步最适合做什么

建议按这个顺序继续：

1. 先稳定 Deep Squat 的 final score export：同时保存 attempt-level records 和 movement-level final score。
2. 继续校准 Deep Squat thresholds 和 reviewer-facing explanation，尤其是 front-view limitation、board condition 和 pain/clearing 文案。
3. 给 ASLR、Hurdle Step、In-Line Lunge、Shoulder、Trunk 分别补更多 score 1/2/3 样本。
4. 把 movement-level final score 扩展到 bilateral actions：左右 raw score 取低侧，pain / clearing override 为 0。
5. 继续把 Rotary Stability 保持 feature-only，先校准 phase、side semantics 和样本质量。
6. 把 pose extraction 从手动脚本逐步整理成更稳定的 local job workflow。
7. 在主线合并前跑：

```bash
npm install
npm run check
npm run demo:check:four
npm run demo:flow:seven
```

## 19. 结论

AI-FMS 现在已经具备一个清晰的主线合并价值：

- 它不是一个孤立 demo，而是一个从 annotation 到 pose evidence、review、adjudication、ingest、dataset export 的完整工作流。
- 它保留 human-in-the-loop 的专业边界，避免过度声称全自动评分。
- 它已经有 Deep Squat flagship AI pipeline，并扩展出多个 FMS movements 的 first-pass pose evidence path。
- 它能支撑 Ronnie 的申请叙事：长期游泳经验、Human Movement Science 兴趣、FMS 学习、AI-assisted sports health technology 和 interpretable AI。

下一阶段最重要的不是继续堆 UI，而是用更多真实样本校准 evidence thresholds、final score rules 和 export schema，让这个项目从“能展示”继续向“能产生可靠训练数据”推进。
