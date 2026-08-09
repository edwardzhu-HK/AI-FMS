# AI-FMS 项目说明：申请材料版

> **历史版本说明（2026-08-09）**：本文件保留 2026-05-22 的早期申请叙事，相关 PDF 也仅作历史归档。当前 Phase I 申请材料以 `docs/ai_fms_phase_i_application_copy_2026-08-09.md`、`docs/ai_fms_phase_i_application_evidence_table_2026-08-09.md` 和 `docs/reports/ai_fms_phase_i_technical_report_2026-08-09.md` 为准。

日期：2026-05-22

## 项目标题

**AI-FMS：面向 Functional Movement Screen 视频标注的人机协同计算机视觉平台**

英文标题可用于申请材料：

**AI-FMS: A Human-in-the-Loop Computer Vision Platform for Functional Movement Screen Video Annotation**

## 一句话定位

AI-FMS 是一个 **human-in-the-loop** 的动作视频标注与数据集生产平台。它帮助 reviewer 对 FMS 视频进行切片、查看 pose-based movement features、比较 AI suggestion 与人工评分、完成双人评分与仲裁，并导出可追溯的训练数据，为未来的 movement-quality model 打基础。

## 为什么这个项目适合 Ronnie

Ronnie 的申请主线最强的地方，不是单独说“会游泳”或“做了一个 AI app”，而是把四件事连成一条自然的成长线：

1. 多年竞技游泳训练和耐力型 discipline。
2. 对动作质量、疲劳、恢复、表现反馈的真实观察。
3. FMS 学习，以及对 Human Movement Science、Kinesiology、Exercise Science、Sports Medicine、sports health technology 的兴趣。
4. AI-FMS 作为一个具体项目，把运动员经验转化为数据、标注流程和可解释的 AI 辅助。

建议申请叙事句：

> Ronnie turns repetition into observation, observation into data, and data into better movement. Through AI-FMS, he explores how computer vision can support safer, more consistent, and more traceable movement screening without replacing trained professionals.

中文理解：

> Ronnie 把长期重复训练转化为观察，把观察转化为数据，再把数据用于更好的动作理解。AI-FMS 体现的不是“AI 取代教练”，而是用 computer vision 帮助运动筛查变得更一致、更可追溯、更容易被分析。

## 这个项目到底是什么

AI-FMS 不应该被包装成 medical diagnosis tool，也不应该说成可以替代 certified FMS coach。更准确的定位是：

**一个面向教育和研究场景的 AI-assisted movement-screening annotation platform。**

它帮助 reviewer 完成以下工作：

- 上传 FMS 视频。
- 选择 FMS movement pattern。
- 把连续动作切成独立 segment。
- 循环播放并检查每一个 segment。
- 查看 pose/keypoint evidence。
- 记录 Reviewer A 和 Reviewer B 的独立评分。
- 比较 AI suggestion 和人工评分。
- 根据规则进行 label adjudication。
- 导出结构化 dataset records。
- 统计 reviewer agreement、AI-final agreement、pending/valid/invalid 等指标。

这个定位更成熟，也更适合申请。它强调 Ronnie 理解 AI 的边界：AI 不是魔法，而是嵌入真实专业工作流的辅助工具。

## 目前已有基础

现有原型已经不是空白项目，已经具备一套可复用的工作流基础：

- React/Vite 前端工作台。
- 七个 FMS 动作入口。
- 本地视频上传与播放。
- 根据视频长度自动填 Start/End。
- Expected Reps 和 Notes 辅助切片。
- Segment list 和 loop playback。
- Reviewer A/B 评分表单。
- Reviewer-readable AI suggestion 面板。
- A/B/AI 三方 adjudication 规则。
- Ingest readiness 和 consistency snapshot。
- Segment Metadata 面板，可人工修正 start/end、side、pain flag、
  clearing test 和 rubric version。
- Optional pose JSON 上传。
- Deep Squat 真实 MediaPipe pose overlay。
- Deep Squat pose-assisted timing QA。
- Deep Squat feature snapshot：depth、torso control、knee alignment，以及
  side-view hip/knee/ankle angle evidence。
- Deep Squat explainable AI suggestion：score、confidence、reasons 和
  pose-vs-final comparison。
- JSON 和 CSV dataset export。
- Export Evidence dashboard：label completion、pose coverage、timing QA、
  feature coverage 和 suggestion coverage。
- Reviewer agreement 和 AI-final agreement dashboard metrics。
- 7 个 FMS 动作位的 valid/pending/invalid label summary。
- Segment timing correction summary：人工边界调整次数、平均 timing shift。
- Deep Squat dataset card draft。
- 7 动作 sample video inventory：当前 64 个视频，已按动作、时长、分辨率、reps/score 线索和 readiness 分类，并生成 draft sample manifests。
- Mock API 和本地 HTTP API stub。
- Manifest validation、批量导入和 report 脚本。
- 针对 segmentation、adjudication、mock API、consistency、manifest utilities 的自动化测试。

但需要明确：当前 AI 部分仍然是 prototype-level。Deep Squat 已经有真实
MediaPipe pose pipeline；其他动作目前主要是 annotation workflow。没有上传
pose JSON 时，界面会明确把 overlay 标为 demo skeleton，不能把它当作真实模型输出。

## 升级后的项目范围

### Phase 1：七动作标注平台

平台层面保留全部七个 FMS movement patterns：

- Deep Squat
- Hurdle Step
- In-Line Lunge
- Shoulder Mobility
- Active Straight Leg Raise
- Trunk Stability Push-Up
- Rotary Stability

第一阶段的目标不是全自动评分，而是先把 annotation workflow 做扎实：上传、切片、循环播放、双人评分、仲裁、导出和基础 dashboard。

### Phase 2：Deep Squat 旗舰 AI 管线

Deep Squat 作为第一个 flagship movement，用来证明完整 AI 管线真的跑得通：

- real pose extraction
- aligned keypoint overlay
- angle and motion-feature extraction
- pose-assisted segment suggestions
- AI suggested score with confidence
- reviewer-readable explanation
- AI suggestion 与 human final label 的对比

这一步是项目的技术深度所在。Deep Squat 不是项目边界，而是“样板间”。

### Phase 3：多动作扩展

Deep Squat 稳定后，再按数据质量和开发时间扩展其他动作。推荐顺序：

1. Active Straight Leg Raise：侧面视频下腿部角度和髋关节活动度较容易量化。
2. Shoulder Mobility：与 Ronnie 的游泳背景和肩部功能高度相关，申请叙事价值高。
3. Hurdle Step：适合体现单腿稳定性和左右侧比较。
4. In-Line Lunge：动作价值高，但对视角和稳定性要求更高。

平台可以支持七个动作，但不需要一开始承诺七个动作都有同等深度的 AI 分析。

### Phase 4：申请证据包

最终项目不只是代码，还应该形成一套可以被招生官、老师或面试官快速理解的材料：

- polished GitHub README
- technical report
- dataset card
- demo video
- project page
- small-sample evaluation
- ethical limitation statement

当前已经准备的申请材料草稿：

- `docs/AI-FMS_project_brief_application.md`
- `docs/AI-FMS_project_brief_application.pdf`
- `docs/dataset_card_deep_squat_v1_5_draft.md`
- `docs/demo_walkthrough_script_ai_fms_v1_5.md`
- `docs/technical_report_outline_ai_fms_v1_5.md`
- `docs/application_package_notes_ai_fms_v1_5.md`
- `docs/sample_video_inventory.md`

这些材料共同证明：Ronnie 不只是做了一个网页，而是围绕真实问题设计了系统、数据流程、AI 辅助和评估指标。

## 技术架构

```text
React/Vite Workbench
  upload, video playback, segment editor, reviewer scoring, AI panel, dashboard

API Layer
  videos, analysis jobs, segments, reviews, labels, dataset exports

Pose Service
  MediaPipe first; YOLO Pose or MMPose later if needed

Data Layer
  segment records, reviewer labels, AI suggestions, pose keypoint JSON,
  dataset entries, metrics

Evaluation Layer
  reviewer agreement, AI-final agreement, segmentation error,
  sample-quality reports
```

### 技术选型建议

第一版真实 pose pipeline 推荐使用 **MediaPipe Pose Landmarker**，因为它接入速度快，适合 prototype 和 demo，并且能输出 2D landmarks 与 3D world landmarks。

后续如果需要更复杂的多人检测、实时 tracking 或研究型模型，可以再评估：

- **YOLO Pose**：工程成熟，适合实时和部署。
- **MMPose**：更偏 research，适合 model zoo、benchmark、自定义数据集和论文式拓展。

我的建议是：**V1.5 用 MediaPipe，技术报告里把 YOLO Pose / MMPose 写成 future work。**

## 推荐的第一个完整 Demo

第一个 polished demo 应该围绕一个 Deep Squat 视频展开：

1. 用户上传 Deep Squat 视频。
2. 系统读取视频 duration，并自动填入完整分析区间。
3. 用户输入 expected repetitions。
4. 系统提出 segment suggestions。
5. MediaPipe 提取 pose landmarks。
6. Workbench 显示真实 keypoint overlay。
7. 系统提取 squat depth、trunk angle、knee/hip/ankle features。
8. AI 生成 suggested score、confidence 和 explanation。
9. Reviewer A 和 Reviewer B 独立评分。
10. 系统根据 A/B/AI 进行 adjudication。
11. 用户导出 dataset record。
12. Dashboard 显示 agreement、pending/valid/invalid 等指标。

这个 demo 足够完整，也适合录 2-3 分钟英文展示视频。

## 推荐研究问题

不要把研究问题写成：

> Can AI score FMS automatically?

这个问题太大，也容易带来医学和准确性风险。

更好的问题是：

> Can pose-based AI assistance improve the consistency, efficiency, and traceability of Functional Movement Screen video annotation?

中文就是：

**基于姿态估计的 AI 辅助，能否提高 FMS 视频标注的一致性、效率和可追溯性？**

这个问题更适合申请，因为它可以被实际评估。

可用指标包括：

- Reviewer A/B agreement。
- AI-final label agreement。
- 平均每个 segment 的 review time。
- AI suggested segment 与人工调整 segment 的差异。
- invalid/disagreement rate。
- pose confidence 和 missing-frame ratio。
- per-movement difficulty notes。

## 数据与伦理边界

AI-FMS 必须保留清晰边界：

- 这是 educational and research prototype。
- 不提供 medical diagnosis。
- 不替代 certified professionals。
- pain flag 应来自人工输入，不能由 AI 自动判断。
- 视频数据需要匿名化或取得 consent。
- Dataset card 需要说明数据来源、动作类型、camera view、reviewer process、known bias 和 limitations。

这些限制不是弱点，反而会让项目显得成熟：它说明 Ronnie 不是在过度包装 AI，而是在认真处理真实场景里的边界。

## 为什么它适合申请

AI-FMS 对 Ronnie 申请有几个明显价值：

- 它扎根于 Ronnie 真实的 student-athlete 背景。
- 它自然连接 Human Movement Science 和 sports health technology。
- 它有真实工程内容：frontend workflow、pose pipeline、data schema、evaluation metrics。
- 它有人机协同和伦理边界，不是简单“AI 替代人”。
- 它可以通过 agreement、dataset quality、segmentation error 等指标被评估。
- 它可以扩展成 GitHub、technical report、demo video、project page 和 portfolio summary。

最重要的是，它把 Ronnie 的游泳经历从“活动荣誉”升级成了“专业问题意识”：

**长期训练让他关注 movement quality，FMS 给了他评估框架，AI-FMS 则是他把观察转化为系统和数据的实践。**

## Portfolio 可用英文段落

I built AI-FMS, a human-in-the-loop platform for annotating Functional Movement Screen videos. The system helps reviewers segment movement videos, extract pose-based features, compare AI suggestions with two independent human ratings, adjudicate disagreements, and export traceable datasets for future movement-quality models. The project grew out of my long-term swimming experience and my interest in how movement quality, fatigue, recovery, and corrective exercise can be studied through Human Movement Science and AI-assisted screening.

## Demo Video 脚本结构

建议 2-3 分钟展示视频按这个结构：

1. 问题背景：动作筛查需要更一致、更可追溯的数据。
2. Ronnie 背景：长期游泳训练、FMS 学习和 Human Movement Science 兴趣。
3. 上传一个 Deep Squat 视频。
4. 展示 AI-assisted segment suggestion。
5. 展示真实 pose overlay 和 extracted features。
6. 展示 Reviewer A/B scoring。
7. 展示 adjudication 和 final label。
8. 展示 dashboard metrics 和 dataset export。
9. 结尾说明 limitations 和 future expansion。

## 项目完成定义

当 AI-FMS 具备以下内容时，就可以作为申请材料中的核心项目资产：

- 一个 polished Deep Squat AI demo。
- 七动作 annotation workflow。
- 至少一个 flagship movement 的真实 pose output。
- 带 schema 说明的 dataset export。
- agreement 和 data-quality metrics。
- 项目 README。
- technical report 或 project brief。
- demo video script。
- 明确的 limitations。

## 参考材料

- 本地规划文档：`AI-FMS项目定位和规划.md`。
- Ronnie 留学规划 PDF：`Ronnie留学规划_学校留学辅导老师同步版_2026-05-19.pdf`。
- MediaPipe Pose Landmarker Python guide:
  `https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/python`。
- Ultralytics YOLO Pose documentation: `https://docs.ultralytics.com/tasks/pose`。
- MMPose/OpenMMLab overview: `https://mmpose.com/`。
