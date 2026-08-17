# AI-FMS Application Video Asset and Shot Plan

状态：READY FOR PREPRODUCTION

版本：v1.0

更新日期：2026-08-17

对应脚本：`docs/demo_walkthrough_script_ai_fms_v1_5.md` v2.0

## 1. 制作原则

1. **Ronnie 是主角**：项目界面、证书和研究图表都服务于 Ronnie 的叙事，不取代本人表达。
2. **优先自有素材**：真人和 FMS 动作优先重新拍摄，不使用来源不清的网络视频。
3. **一套母版，多种输出**：先完成 4:15-4:30 Master，再剪 3 分钟版和 60 秒版。
4. **事实与画面对齐**：说到认证就显示证书，说到实践就显示 Ronnie 评估，说到结果就
   显示冻结数字，不使用纯装饰画面。
5. **公开与私有分开**：证书原图、consent、raw A-roll 和原始工程文件留在 private
   production archive；Git 只保存计划、公开成品和经批准的衍生图。

素材来源优先级：

1. Ronnie 与取得同意的 participant 新拍 footage；
2. AI-FMS 本地应用和现有研究资产生成的画面；
3. 从已确认权利的证书、照片或项目材料制作的 graphics；
4. 外部素材只在有明确 license、source log 和必要性时使用。

## 2. Master 素材总表

| ID  | 时间      | 内容                                 | 画面形式                            | 素材来源与制作方法                                                                 | 需要你们完成                                             | 验收要求                                                      |
| --- | --------- | ------------------------------------ | ----------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------- |
| A01 | 0:00-0:18 | Ronnie、游泳与研究兴趣               | A-roll，Ronnie 正面出镜             | 新拍；medium close-up，眼平镜头，FMS/运动环境作轻背景                              | Ronnie 录 3 个完整 take；确认正式英文姓名与发音          | 1080p 以上；清晰收音；直视镜头；前后各留 5 秒                 |
| B01 | 0:18-0:24 | FMS 全称与简要定义                   | A-roll 转 B-roll                    | A01 同场补拍一句；叠加简洁标题 `Functional Movement Screen`                        | Ronnie 录 pickup line                                    | 不用网络宣传片；标题不遮脸                                    |
| B02 | 0:24-0:42 | 七个 FMS 动作                        | 七动作 montage + 名称               | 优先新拍 Ronnie 或 consented participant 各动作；固定机位，每动作取 1.5-2 秒       | 准备 FMS kit、场地和 participant；按 protocol 拍完整动作 | 全身完整入镜；不切掉手脚/器材；动作名称准确                   |
| C01 | 0:42-0:52 | Level 1 certification                | 证书 still + Ronnie 画外音          | 使用证书原图制作 16:9 card；保留姓名、课程 title、level、date                      | 提供高分辨率原件和准确 title/date                        | 遮挡证书编号、QR、email 等 identifier；文字可读               |
| C02 | 0:52-1:02 | Level 2 certification                | 证书 still + Ronnie 画外音          | 与 C01 使用同一模板和缩放                                                          | 提供高分辨率原件和准确 title/date                        | 两张证书风格一致；不做夸张动画                                |
| D01 | 1:02-1:24 | FMS 实践与发现问题                   | Evaluator B-roll                    | 新拍 Ronnie 设置 kit、说明动作、观察 participant、记录 score、回看视频             | 安排 consented participant 和 camera operator            | 每个 shot 5-8 秒；不显示健康信息或未经同意人物                |
| A02 | 1:24-1:30 | “These problems became...”           | Ronnie 中段出镜                     | 与 A01 同场或 FMS 场地新拍，直接对镜头完成转折句                                   | Ronnie 录 3 个短 take                                    | 结尾视线稳定；方便硬切进入 Workbench                          |
| S01 | 1:30-1:50 | 七动作系统范围                       | Workbench screen recording          | 本地启动 AI-FMS；使用 publication demo；展开 action selector 后回到 Deep Squat     | 无需真人拍摄；由技术侧生成                               | 2560x1440 或 1920x1080；无通知、路径、private ID              |
| S02 | 1:50-2:18 | Rep、loop、timing、pose              | Workbench screen recording          | 真实横屏 Deep Squat 与真实 pose；播放、暂停最低位、切换相邻 reps                   | 确认使用的视频帧可以公开                                 | Skeleton 对齐；鼠标慢；不出现 filename score cue              |
| S03 | 2:18-2:42 | Features、AI、protocol、human review | Workbench screen recording          | 同一 session 显示 feature panel、AI explanation、protocol condition、reviewer form | 无需真人拍摄；由技术侧生成                               | 不快速滚动；每个信息区至少停 3 秒；generic reviewer ID        |
| S04 | 2:42-3:02 | Blind Study Mode                     | Study Mode dry-run screen recording | 使用 dry-run manifest 和匿名动作视频；只展示 reviewer 可见控件                     | 确认动作帧公开权利                                       | 不显示 AI、pose、历史分数、source filename 或另一 reviewer    |
| G01 | 3:02-3:28 | Phase I 核心数字                     | 新制 results card + 轻动画          | 从冻结 release manifest 制作 16:9 graphic；数字逐组出现                            | 人工确认最终数字和措辞                                   | 只用 `110/28`、`32`、`26/26`、`16/25`、`23/25`；不写 accuracy |
| G02 | 3:28-3:33 | Deep Squat finding                   | Existing SVG 转 16:9                | 使用 `deep-squat-strategy-continuum.svg`，加轻微 pan/zoom                          | 无                                                       | 不改数据、轴或注释；正文可读                                  |
| G03 | 3:33-3:38 | ASLR finding                         | Existing SVG 转 16:9                | 使用 `aslr-bilateral-repeatability.svg`                                            | 无                                                       | 不把单一来源包装成 general validation                         |
| G04 | 3:38-3:43 | Hurdle finding                       | Existing SVG 转 16:9                | 使用 `hurdle-score2-pathways.svg`                                                  | 无                                                       | 保留 blind-review pathway 定位                                |
| G05 | 3:43-3:50 | Rotary finding                       | Existing SVG 转 16:9                | 使用 `rotary-cycle-event-matrix.svg`                                               | 无                                                       | 强调 full-cycle evidence，不显示未验证诊断结论                |
| A03 | 3:50-4:24 | 角色、反思、未来                     | A-roll，Ronnie 正面出镜             | 新拍；与 opening 保持造型和光线一致，可换更紧构图                                  | Ronnie 录 3 个完整 take + 关键句 pickup                  | 语速自然；直接看镜头；结尾留 5 秒                             |
| G06 | 4:24-4:28 | 项目结束                             | End card                            | 新制 16:9 card；AI-FMS、Ronnie 正式姓名、3 个关键词、最终链接                      | 确认姓名和最终可用链接                                   | 无 placeholder；不写 submitted/published；停留至少 4 秒       |

## 3. 你们需要新拍的真人素材

### 3.1 A-roll：开头、中段、结尾

建议一次完成，预留 60-75 分钟。

**构图与设备**：

- 横屏 16:9；4K/30fps 优先，最低 1080p/30fps。
- 镜头与眼睛同高，medium close-up，胸口以上入镜。
- 使用 tripod；不要手持自拍，不使用过度人像虚化。
- 曝光、white balance 和 focus 锁定，避免录制中亮度跳动。
- 背景简洁，可自然放置 FMS kit 或运动元素，但不要出现杂物、证书墙或无关品牌。
- 服装使用无密集图案的纯色 polo、T-shirt 或轻运动上衣；避免明显学校/team logo，除非
  已确认可以公开。

**声音**：

- 优先 lavalier microphone；次选离人物 40-70 cm 的 directional microphone。
- 单独录 10 秒 room tone。
- 每个 take 开头拍手一次用于同步；拍手后停 2 秒再开始说。
- 每段录 3 个完整 take，再补录容易出错的关键句。

**表演**：

- 使用关键词提词，不建议眼睛持续扫 teleprompter。
- 开头略慢，结尾更平静；技术主体可以由画外音承载。
- 每个 take 前后各保持安静和姿势 5 秒，方便剪辑。
- 中段转折句必须对镜头说完：`Those problems became the starting point for AI-FMS.`

### 3.2 七动作 montage

优先拍摄自己的素材。可以由 Ronnie 演示，也可以由 consented participant 完成、Ronnie
在旁执行 setup。每个动作拍 2 个完整 take，不只拍最终姿势。

| 动作                      | 建议画面                        | 最低素材                 |
| ------------------------- | ------------------------------- | ------------------------ |
| Deep Squat                | 正面或 45°，完整身体和 dowel    | 2 次完整动作             |
| Hurdle Step               | 正面或 45°，hurdle kit 完整入镜 | 左右各 1 次              |
| In-Line Lunge             | 45°或侧面，板与 dowel 可见      | 左右各 1 次              |
| Shoulder Mobility         | 背面或 45°背面，双手位置清楚    | 左右各 1 次              |
| Active Straight Leg Raise | 正侧面，头到脚完整入镜          | 左右各 1 次              |
| Trunk Stability Push-Up   | 侧面，全身和手位可见            | 2 次完整动作             |
| Rotary Stability          | 45°或侧面，手、膝、踝与回位可见 | 左右或同/对侧模式各 1 次 |

拍摄遵循 Ronnie 已学习的 FMS protocol，不能为了画面漂亮改变 setup。Final montage 只取
每段 1.5-2 秒，但 raw clip 应保留完整动作。

### 3.3 FMS 实践 B-roll

目标是证明“Ronnie 实际进行过评估”，不是拍教学广告。建议拍：

1. Wide shot：Ronnie 与 participant、FMS kit 和完整场地。
2. Medium shot：Ronnie 说明一个动作的 setup。
3. Close-up：dowel、board、hurdle height 或测量操作。
4. Over-the-shoulder：Ronnie 观察 participant 完成动作。
5. Close-up：只拍手和 generic score sheet，不出现姓名、健康信息或真实研究答案。
6. Over-the-shoulder：Ronnie 在 laptop 上回看动作视频，但屏幕使用 demo，不显示 raw
   participant data。
7. Reaction shot：Ronnie 停顿、回看、做 protocol note，用于“发现问题”旁白。

每个 shot 拍 5-8 秒稳定画面，前后各留 2 秒。Participant 必须明确同意申请视频用途；
如 participant 是未成年人，应取得监护人书面同意。

## 4. 证书素材要求

你们需要提供 Level 1 和 Level 2 certificate 的原始 PDF、scan 或正面照片。

**优先格式**：

- PDF 原件，或 300 dpi scan；
- 没有 scan 时，用 12MP 以上相机正对拍摄，四边完整、无透视、无反光；
- 不要通过微信压缩后再作为唯一原件。

**需要确认的文字**：

- Ronnie 的正式英文姓名；
- certificate 上的课程完整 title；
- Level；
- issue/completion date；
- issuing organization。

**公开版处理**：

- 保留姓名、title、level、date 和 issuer；
- 遮挡 certificate ID、verification code、QR、email、address、signature number 等不必要
  identifier；
- 原件存入 private production folder，公开版另存，不覆盖原件；
- 两张证书使用同一 16:9 模板，避免旋转、漂浮、光效或“获奖”风格动画。

## 5. Screen Recording 制作要求

Screen recording 由现有本地系统生成，不需要你们重新拍真人。

### Workbench

- 浏览器 viewport：优先 2560x1440，最低 1920x1080。
- Browser zoom：100%，必要时只调整应用自身布局，不使用系统放大镜。
- 使用 `Deep Squat full-width demo` 和真实 MediaPipe pose。
- Reviewer 使用 generic ID；移除 source filename、score-bearing note 和 private path。
- 录制一条 45-60 秒连续 master：加载完成状态、展开七动作、播放/暂停、rep navigation、
  skeleton、feature/AI/protocol/reviewer panel。
- 鼠标移动慢而有目的；点击后停 2-3 秒，不来回寻找控件。

### Study Mode

- 使用 `study.html?mode=dry-run`，不使用 Ronnie/Other Reviewer 的真实 localStorage。
- 只显示匿名 queue、动作视频、RAW SCORE、unscorable、confidence、camera/side、QA 和 note。
- 不得通过开发者工具、overlay 或剪辑暴露 AI/pose/history/source filename。
- 录制 20-30 秒 master，最终使用约 20 秒。

### 技术设置

- 录制 30fps 或 60fps；final timeline 使用 30fps。
- 隐藏 desktop、dock、bookmarks、notifications、clock 和其他 browser tabs。
- 录制前关闭消息和系统通知，清空无关下载提示。
- Screen audio 不使用；全部由 Ronnie narration 和后期声音承担。

## 6. Graphics 与现有资产

### 6.1 Results Card

从冻结 Phase I evidence 生成，不直接截取论文表格。建议按顺序显示：

1. `28 source videos · 110 repetitions`
2. `32 repetitions · 4 movements · 2 blind rounds`
3. `Human Round B: 26/26 exact among jointly scorable reps`
4. `Locked AI: 16/25 exact · 23/25 within one`
5. `Internal benchmark · Not clinical validation`

不转成百分比，不使用 `accuracy`，不把 110 写成 participants。

### 6.2 Four Research Figures

Source-of-truth：

- `docs/assets/phase-i-case-studies/deep-squat-strategy-continuum.svg`
- `docs/assets/phase-i-case-studies/aslr-bilateral-repeatability.svg`
- `docs/assets/phase-i-case-studies/hurdle-score2-pathways.svg`
- `docs/assets/phase-i-case-studies/rotary-cycle-event-matrix.svg`

制作时导出为至少 1920x1080 的无损 PNG 或直接使用 SVG。只允许轻微 pan/zoom 和当前
旁白对应区域的高亮，不重画数据、不改轴、不删除限制说明。

### 6.3 End Card 与 Lower Third

End card 最少包含：

- `AI-FMS`
- `Ronnie [正式英文姓名]`
- `Human Movement Science · Responsible AI · Movement Evidence`
- 最终有效 project URL 或 GitHub URL

在 Ronnie GitHub transfer 和 project page 完成前，先生成无 URL internal version，不显示
placeholder。

Lower third 只在第一次出镜使用：姓名 + `FMS Level 1 & Level 2 Certified`。不要添加
`expert`、`clinician`、`medical` 或未经确认的学校/职位 title。

## 7. 建议拍摄日安排

总计预留 2.5-3 小时，不包括场地移动。

| 顺序 | 内容                                    |   预计时间 |
| ---- | --------------------------------------- | ---------: |
| 1    | 场地、相机、灯光、收音和 white balance  |    20 分钟 |
| 2    | Opening A-roll 三个 take + pickup       |    25 分钟 |
| 3    | Closing A-roll 三个 take + pickup       |    30 分钟 |
| 4    | 中段 transition A-roll                  |    10 分钟 |
| 5    | 七动作 montage raw footage              | 45-60 分钟 |
| 6    | Evaluator practice B-roll               | 30-40 分钟 |
| 7    | Room tone、证书/kit stills、遗漏 pickup |    15 分钟 |

先拍 A-roll，再拍需要体力和 participant 的动作素材。Closing 不要留到所有人疲劳后再拍。

## 8. 人员分工

| 人员                       | 责任                                                                           |
| -------------------------- | ------------------------------------------------------------------------------ |
| Ronnie                     | 全部 narration、A-roll、认证事实确认、FMS protocol、可选动作示范、最终内容批准 |
| Camera operator            | 构图、focus/exposure、audio monitoring、take log 和备份                        |
| Consented participant      | 按 Ronnie 指导完成 FMS 动作，确认公开用途                                      |
| Parent/Other Reviewer      | Consent 与 rights log、现场连续性、文案事实复核                                |
| Codex/technical production | Screen recording、results card、figure export、end card、字幕初稿和技术 QA     |
| Editor                     | Assembly、audio mix、color consistency、subtitles、Master 和 cutdowns export   |

一个人可以承担多个 production role，但 Ronnie 不能同时在 A-roll 时检查 focus 和 audio。

## 9. 私有制作目录与命名

建议在 Git ignored 的目录中建立：

```text
Ingested-data/application-video-production/
  00-admin/
  01-a-roll/
  02-fms-practice/
  03-certificates-private/
  04-screen-recordings/
  05-graphics/
  06-audio/
  07-edit-project/
  08-exports/
```

文件命名：

```text
A01_opening_take01_4k.mov
A02_transition_take02_4k.mov
A03_closing_take01_4k.mov
B02_deep-squat_take01_wide.mov
D01_evaluator-observation_take01.mov
C01_level1_original.pdf
C01_level1_public-redacted.png
S02_workbench_pose_master.mov
G01_phase-i-results-card_v01.png
```

禁止使用 `final-final2.mov`、聊天软件自动文件名或只靠 Finder 缩略图管理版本。

## 10. 交付给技术侧前的清单

| 需要你们提供                             | 格式与要求                                                   | 用途                                  |
| ---------------------------------------- | ------------------------------------------------------------ | ------------------------------------- |
| Ronnie 正式英文姓名与发音                | 文字 + 一段语音                                              | Lower third、证书核对、end card、字幕 |
| Level 1 / Level 2 certificate originals  | PDF/300 dpi scan/无反光高分辨率照片                          | Certificate cards 与事实核对          |
| 两项证书的 exact title/date/issuer       | 按原件逐字抄录                                               | Narration、caption、claim control     |
| Opening/transition/closing A-roll        | 原始 4K/1080p 横屏文件，不经微信压缩                         | Master applicant narrative            |
| 七动作 montage footage                   | 每动作 2 个完整 take                                         | FMS introduction                      |
| Evaluator practice B-roll                | 5-8 秒稳定 clips，多景别                                     | Practice-to-problem transition        |
| Participant consent confirmation         | 书面记录，private 保存                                       | Public-use gate                       |
| 证书与场地 rights confirmation           | 书面记录                                                     | Public-use gate                       |
| Ronnie future-direction wording approval | 确认 Human Movement Science/biomechanics/responsible AI 表述 | Closing narration                     |
| 现有相机、麦克风、灯光清单               | 型号或手机名称即可                                           | 决定具体拍摄设置                      |

## 11. Final Review Gates

1. **Content Gate**：顺序、旁白、数字和 Ronnie 角色准确。
2. **Applicant Gate**：本人形象、表达、眼神、语速和反思足够自然。
3. **FMS Gate**：动作 setup、认证 title 和 protocol 表述准确。
4. **Research Gate**：blind-review 和 internal-benchmark 边界保留。
5. **Rights Gate**：证书、participant、场地、视频帧和音乐均有明确使用依据。
6. **Technical Gate**：1080p+、清晰 audio、无错位 skeleton、无 private UI、字幕准确。
7. **Delivery Gate**：4:30 Master、3 分钟版、60 秒版、SRT、thumbnail 和 rights log 齐全。

任何 gate 未通过时只修对应问题，不重新改写已经认可的研究结论。
