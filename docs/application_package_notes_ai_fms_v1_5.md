# AI-FMS V1.5 Application Package Notes

> 历史文件：本文件保留 2026-05-22 的申请材料规划。当前可用文案与 evidence
> 分别为 `docs/ai_fms_phase_i_application_copy_2026-08-09.md` 和
> `docs/ai_fms_phase_i_application_evidence_table_2026-08-09.md`。

日期：2026-05-22

用途：这份文档面向 Ronnie 的申请材料准备。它不是代码 spec，而是把 AI-FMS 如何被“展示、解释、验证、包装”说清楚，方便后续写项目页、简历条目、申请文书段落、老师推荐材料和 demo 视频。

## 一句话项目定位

AI-FMS 是一个面向 Functional Movement Screen 视频标注的 human-in-the-loop computer vision platform。它帮助 reviewer 切分动作视频、查看 pose-based movement features、比较 AI suggestion 与人工评分、完成 adjudication，并导出可追溯的数据集记录。

中文表达：

AI-FMS 不是“AI 替代教练自动诊断”，而是一个 AI 辅助的动作筛查视频标注和数据集生产平台。

## 申请材料中的核心故事

Ronnie 的项目叙事可以按这条线展开：

1. 长期游泳训练让他对动作质量、疲劳、恢复和技术细节敏感。
2. FMS 提供了观察 movement quality 的结构化框架。
3. Human Movement Science / Kinesiology 是他希望深入学习的方向。
4. AI-FMS 是他把运动观察转化为数据、系统和可解释 AI 辅助的实践。

可用英文短句：

> Through AI-FMS, I explored how computer vision can support safer, more consistent, and more traceable movement screening while keeping trained human reviewers in control.

## 当前可以展示的功能

### 已经能跑通的 V1/V1.5 Demo

- 7 个 FMS movements 的 action selector。
- 本地视频上传。
- 视频 duration-aware Start/End range。
- Expected Reps 和 Notes-assisted segment generation。
- Segment list 和 loop playback。
- Manual segment start/end correction。
- Reviewer A/B scoring。
- Adjudication 和 final label。
- Optional pose JSON upload。
- Deep Squat real MediaPipe pose overlay。
- Deep Squat timing QA。
- Deep Squat feature snapshot。
- Deep Squat explainable AI suggestion。
- JSON dataset export。
- CSV dataset export。
- Dataset card draft。

### 目前不应该过度承诺的部分

- 不说已经能全自动评分所有 7 个 FMS movements。
- 不说可以做 medical diagnosis。
- 不说可以预测 injury risk。
- 不说可以自动判断 pain。
- 不说可以替代 certified FMS professionals。
- 不把 demo skeleton 当成真实模型输出。

## 最终申请证据包

建议最终形成以下 artifacts：

1. GitHub-ready README。
2. 2-3 分钟 demo video。
3. Technical report。
4. Dataset card。
5. Project brief PDF。
6. Project page copy。
7. 3-5 张高质量 screenshots。
8. Sample JSON export。
9. Sample CSV export。
10. Limitation and ethics statement。

当前 project page copy 草稿：

- `docs/project_page_copy_ai_fms_v1_5.md`

## Project Page 建议结构

项目页不需要写成 marketing landing page，可以更像 research portfolio page。

### Hero Section

标题：

**AI-FMS**

副标题：

**A human-in-the-loop computer vision platform for Functional Movement Screen video annotation**

短描述：

AI-FMS helps reviewers segment FMS videos, inspect pose-based movement evidence, compare AI suggestions with human labels, adjudicate disagreements, and export traceable datasets for future movement-quality models.

### Problem

要点：

- Movement screening video review is valuable but hard to standardize.
- Segment boundaries may be inconsistent.
- Reviewer decisions are often not stored with enough evidence.
- Future AI models need traceable, high-quality labeled data.

### My Approach

要点：

- Keep humans in control.
- Use pose estimation as evidence, not as final authority.
- Store segment-level labels, reviewer comments, AI suggestions, and pose quality.
- Start with Deep Squat as a flagship AI pipeline, while supporting all 7 movements at workflow level.

### Demo Highlights

展示四个截图或短 GIF：

1. Video upload and segment list。
2. Real pose overlay。
3. Feature snapshot and AI suggestion。
4. JSON/CSV export or dataset card。

### Technical Stack

- React / Vite frontend。
- MediaPipe Pose Landmarker for Deep Squat pose extraction。
- JavaScript feature extraction and rules-based explainable suggestion。
- Mock API and local API stub。
- JSON/CSV export。
- Node test suite。

### Evaluation

第一版可展示：

- Pose quality summary。
- Segment timing QA。
- Reviewer A/B agreement 计划。
- AI-final agreement 计划。
- Dataset card and limitations。

### Ethics and Limitations

必须写：

- Educational and research prototype。
- Not a diagnostic tool。
- Not a replacement for trained professionals。
- Pain and medical interpretation require human expertise。
- Dataset size and diversity are limited in the current demo。

### Future Work

建议写：

- Add prepared sample videos for remaining FMS movements。
- Expand pose features to Active Straight Leg Raise and Shoulder Mobility。
- Add dashboard agreement metrics。
- Build a small anonymized dataset with clear consent and dataset card。
- Explore lightweight supervised models only after label quality improves。

## 截图清单

建议最终准备：

1. Workbench overview：左侧 input，中间 playback，右侧 AI/reviewer panels。
2. Real pose overlay：Deep Squat video 上的 MediaPipe pose。
3. Segment Timing QA：显示 suggested range 和 current range。
4. Deep Squat Feature Snapshot：depth、torso control、knee alignment。
5. AI Suggestion：score、confidence、reasons、pose-vs-final。
6. Export controls：JSON/CSV export。
7. Dataset card or README excerpt。

当前已生成的截图素材：

- `docs/assets/publication/ai-fms-workbench-overview-real-video.png`
- `docs/assets/ai-fms-demo-side-angle-features.jpg`
- `docs/assets/ai-fms-demo-export-evidence.jpg`

截图注意：

- 不要使用错位 keypoints 的旧图。
- 如果没有加载 pose JSON，必须避免把 demo skeleton 当作真实模型截图。
- 截图中不要出现 private file path、无关浏览器标签或个人隐私信息。

## Sample 视频接入清单

当浩然提供其他 FMS sample videos 时，建议按这个流程接入：

1. 放入对应 movement 目录，例如 `Eval_Videos/05-Active Straight Leg Raise/`。
2. 文件命名尽量包含 action、view、side、sample index。
3. 更新该 movement 的 `manifest.csv`。
4. 记录 camera view、expected reps、side、notes、consent/privacy 状态。
5. 运行对应 manifest validation。
6. 只在视频质量足够时生成 pose JSON。
7. 先作为 annotation workflow sample 接入，再决定是否做 movement-specific features。

最低 metadata 建议：

- action type
- file name
- camera view
- side
- expected reps
- reviewer notes
- consent/privacy status
- sample quality note

## 简历条目草稿

英文：

> Built AI-FMS, a human-in-the-loop computer vision platform for Functional Movement Screen video annotation. Implemented video segmentation, reviewer scoring, MediaPipe pose overlay, Deep Squat movement features, explainable AI suggestions, adjudication workflow, and JSON/CSV dataset export.

中文理解：

做了一个 FMS 视频标注的人机协同计算机视觉平台，包含视频切片、人工评分、真实 pose overlay、Deep Squat 特征、可解释 AI 建议、仲裁和数据集导出。

## 面试回答框架

如果被问 “What did you build?”：

1. 先说项目定位：human-in-the-loop FMS annotation platform。
2. 再说为什么做：游泳训练和 movement quality 观察。
3. 再说技术：React/Vite、MediaPipe Pose、segment-level schema、explainable suggestion。
4. 再说边界：不是 medical diagnosis，不替代 professionals。
5. 最后说未来：扩展更多 FMS movements，增加 agreement metrics 和 dataset card。

如果被问 “What was the hardest part?”：

- 技术上：让 pose output 与 video playback time 对齐，以及把 raw keypoints 转成 reviewer-readable features。
- 产品上：避免把 AI 过度包装成自动评分，而是放进真实 reviewer workflow。
- 数据上：把每个 segment 的 timing、score、comments、AI evidence 和 final label 都保存成可追溯 record。

## 当前下一步

短期建议：

1. 录制 Deep Squat flagship demo。
2. 补 dashboard agreement/export-quality cards。
3. 添加 angle-based hip/knee/ankle features。
4. 接入剩余 movement sample videos。
5. 生成 project page 初稿和截图包。

这套顺序能保证申请材料先可展示，再逐步增加技术深度。
