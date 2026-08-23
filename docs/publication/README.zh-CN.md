# AI-FMS Phase I 论文发表路线

状态：ACTIVE - 投稿前资格确认

最近更新：2026-08-23

英文原版：`README.md`

内部 review 记录：中文版的整体结构、系统开发主线、标题、摘要方向和主要结论已经认可。
剩余工作是细节编辑、人工信息确认、rights/ethics 审核和目标格式适配。

## 发表决定

主路线：

1. 为 National High School Journal of Science（NHSJS）准备一篇原创研究论文。
2. 只有在期刊确认本项目已披露的 AI-assisted workflow、既有视频二次分析以及伦理/授权
   材料符合投稿资格后，才申请加急审稿。
3. 只有在 NHSJS 书面确认预印本不会导致稿件失去资格，也不算作既往发表后，才在
   Zenodo 发布 preprint。

Phase I 的交付目标是形成完整、可以提交的论文包；如果投稿前问题获得解决，则完成正式
投稿。期刊接受和正式发表的日期由期刊控制，不作为 Phase I 完成条件。

## 为什么选择 NHSJS

NHSJS 接受高中生原创研究，并说明采用同行与专业人员审稿流程。当前官方要求包括：

- 200-250 词的英文摘要；
- 按顺序包含 Title、Authors and affiliations、Abstract、Introduction、Methods、
  Results、Discussion、Acknowledgments 和 References；
- 全文包括图表不超过 20 页，12 号字体，单倍行距；
- Research Article 至少包含 5 个 figures 或 tables；
- 使用 Word 投稿时，需要一份匿名的标准引用版和一份单独的 online-citation 版；使用
  LaTeX 投稿时需要三个文件；
- 明确说明研究方法、样本、数据分析、限制和伦理考虑。

官方资料：

- 投稿要求：https://nhsjs.com/submission-guidelines/
- 稿件类型：https://nhsjs.com/submit-your-work/submission-types/
- 审稿时间：https://nhsjs.com/about/peer-review-process/
- 联系邮箱：submissions@nhsjs.com

当前加急选项费用为 280 美元，承诺约两周给出首次决定。它不保证接受或正式发表；如果
需要修改，修改稿仍回到常规审稿周期。

## 当前准备程度

| 组成部分                    | 状态             | 现有证据或缺口                                                        |
| --------------------------- | ---------------- | --------------------------------------------------------------------- |
| 研究问题与范围              | 已准备           | 四动作探索性 pilot；七动作产品范围只作系统背景                        |
| 冻结的定量结果              | 已准备           | Phase I release candidate 与 checksum-protected 生成证据              |
| 人工一致性结果              | 已准备           | Round A/B 签名导出和 closeout                                         |
| AI-human internal benchmark | 已准备           | 最终锁定 prediction package；不是 held-out validation                 |
| 动作特异性分析              | 已准备           | 四种差异化分析与四张生成图                                            |
| 文献综述                    | 已有初稿         | 已列入 11 条起始参考文献；仍需人工作者逐篇阅读和核实                  |
| Ethics/SRC/IRB 判定         | 待确认           | 既有视频二次分析和未来采集均需明确要求                                |
| 媒体与 protocol 权利        | 部分完成         | 两张界面图已改用 2026-08-23 项目自采授权素材；其他源媒体保持私有/待审 |
| AI 使用资格                 | 等待期刊回复     | 必须完整披露，不能自行假定符合政策                                    |
| 作者与成人 advisor          | 待确认           | 目标是 Ronnie 第一作者；需确定成人通信联系人                          |
| NHSJS Word 两个版本         | 待完成           | 只在资格与论文文字获批后制作                                          |
| Zenodo 发布                 | 被期刊政策阻断   | 获得书面 preprint 许可前不发布                                        |
| GitHub 所有权               | 等待 Ronnie 账户 | main/release 与公开边界审计后转移完整 repository                      |

## 对外状态表述

只能使用已经真实发生的状态：

- `manuscript in preparation`：论文准备中；
- `manuscript submitted`：已经提交；
- `under peer review`：正在同行评审；
- `accepted for publication`：已经正式接受；
- `published`：已经正式发表。

工作稿、投稿回执或 Zenodo preprint 均不能表述为 `peer reviewed`、`accepted` 或
`published`。

## 文件清单

- `nhsjs_presubmission_inquiry_2026-08-17.md`：英文投稿前询问信草稿。
- `nhsjs_presubmission_inquiry_2026-08-17.zh-CN.md`：询问信中文对照版。
- `ai_fms_manuscript_evidence_map_2026-08-17.md`：英文论文证据地图。
- `ai_fms_manuscript_evidence_map_2026-08-17.zh-CN.md`：论文证据地图中文版。
- `publication_human_input_form_2026-08-17.md`：英文人工确认表。
- `publication_human_input_form_2026-08-17.zh-CN.md`：人工确认表中文版。
- `ai_fms_phase_i_full_manuscript_draft_zh-CN_2026-08-17.html`：完整中文内部审阅稿的
  可维护源文件。
- `../../output/pdf/ai_fms_phase_i_chinese_manuscript_draft_2026-08-17.pdf`：24 页 A4
  v0.3 中文论文整体审阅 PDF，包含 7 张编号图、12 张编号表、参考文献和 4 个附录。
  正式 NHSJS 英文稿会把详细案例表、Study Mode 图与附录移入 supporting material，
  以满足 12 号字体、20 页正文限制。
- `../../scripts/capture-ai-fms-publication-screenshots.mjs`：运行真实 Demo 和 Study Mode
  dry-run，定位到固定动作帧，移除源文件名与带分数暗示的 metadata，生成三张可复现界面图。
- `../assets/publication/ai-fms-workbench-overview-real-video.png`：包含真实动作视频与 pose
  overlay 的完整 Workbench 总览。
- `../assets/publication/ai-fms-study-mode-blind-review-real-video.png`：显示匿名动作视频的
  盲评 workflow 图。
- `../assets/publication/ai-fms-workbench-quantitative-evidence.png`：项目页或 supplement
  使用的参数近景图。
- `../delivery/ai_fms_phase_i_output_index_2026-08-17.md`：跨输出的统一状态与交付入口。
- `../delivery/ronnie_github_repository_transfer_2026-08-17.md`：GitHub 所有权迁移门槛与
  验证清单。

## 需要人工决定的事项

发送询问信之前需要：

1. 确认 Ronnie 当前年级和学校；正式英文作者姓名已确认为 `Haoran Zhu`。
2. 确定成人 advisor 或通信联系人。
3. 使用类似 CRediT 的贡献说明，确认每位人类参与者的真实角色。
4. 确认其余非界面源视频和聚合图中哪些可以被描述或公开。
5. 批准完整的 AI-use disclosure，不淡化 Codex 的作用。
6. Ronnie 注册账户后提供准确的 GitHub username。

两张含真实人物帧的界面图已于 2026-08-23 替换为项目自采并取得同意的固定画面。Raw
video、raw pose 与其他可识别源帧继续保持私有，除非另行完成授权。
