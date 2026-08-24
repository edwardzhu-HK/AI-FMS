# AI-FMS Phase I Output Index

状态：ACTIVE - canonical delivery entrypoint

版本：v0.5

更新日期：2026-08-23

## 1. 当前结论

Phase I 的系统、研究数据、双轮人工审核、锁定 AI internal benchmark 和四种动作特异性
分析已经冻结。完整中文论文初稿的框架、标题、摘要、主要结论和整体叙事已通过内部
review，后续修改以细节、语言、授权和目标载体适配为主。

项目当前处于 **G4 closeout and output production**。不再为了改善既有结果继续调参或
临时扩大 Phase I 样本；新的 held-out 数据属于 Phase II confirmation。

## 2. 公开申请输出

| 输出                      | Canonical source                                                           | 当前状态                                     | 主要用途                                         | 下一步                                     |
| ------------------------- | -------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------ | ------------------------------------------ |
| Application writing pack  | `docs/ai_fms_phase_i_application_copy_2026-08-09.md`                       | 当前文案已更新                               | Activities、Additional Information、resume、面试 | Ronnie 确认第一人称贡献与学校字数限制      |
| Claim-control table       | `docs/ai_fms_phase_i_application_evidence_table_2026-08-09.md`             | 数字和禁用主张已冻结                         | 所有公开文案的事实检查                           | 每次发布前逐项检查                         |
| Portfolio project page    | `docs/project_page_copy_ai_fms_v1_5.md`                                    | 当前 copy 已更新，页面待实现                 | 个人网站、补充链接、面试前浏览                   | 完成 rights 审核后制作正式页面             |
| Demo video                | `docs/demo_walkthrough_script_ai_fms_v1_5.md`                              | Master review cut v4 已完成，4:34.8          | Portfolio、推荐人 briefing、面试                 | 人工看片确认 v4；冻结后输出 3min 与 60s    |
| Video asset/shot plan     | `docs/delivery/ai_fms_application_video_asset_and_shot_plan_2026-08-17.md` | V3 精修、数字动画、音乐和 A03 新句序已落实   | 拍摄执行、素材交接、rights 和技术 QA             | 记录 v4 feedback 并冻结 Master             |
| Printable production pack | `output/pdf/ai_fms_application_video_*_print_2026-08-22.pdf`               | 12 页横向 shot plan + 9 页纵向 on-set script | 现场打印、拍摄指导、逐项勾选                     | 拍摄时使用当前日期版本；脚本变更后重新生成 |
| Interface visual package  | `docs/assets/publication/`                                                 | 3 张界面图已改用当天自采、授权素材           | 论文、项目页、demo、简报                         | 随中文 PDF 做一次最终逐页 QA               |
| Movement research figures | `docs/assets/phase-i-case-studies/`                                        | 4 张 checksum-pinned 图已完成                | 论文、项目页、面试                               | 公开前做最后文字与配色复核                 |
| GitHub project            | `README.md` + source tree                                                  | 私有仓库、17/17 RC；迁移待执行               | 工程证明、技术复现、项目归属                     | 先收口 main，再转移到 Ronnie 账户          |

## 3. 论文与研究输出

| 输出                               | Canonical source                                                                             | 当前状态                                                   | 主要用途                           | 下一步                                       |
| ---------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------- | -------------------------------------------- |
| Chinese manuscript                 | `docs/publication/ai_fms_phase_i_full_manuscript_draft_zh-CN_2026-08-17.html`                | 24 页完整内部稿，整体框架已认可                            | 内部讨论、英文稿母版               | 细节 polish、作者信息与 rights/ethics        |
| Chinese manuscript PDF             | `output/pdf/ai_fms_phase_i_chinese_manuscript_draft_2026-08-17.pdf`                          | 已逐页视觉检查                                             | 内部审阅和阶段总结                 | 不作为 submitted/peer-reviewed 成果表述      |
| NHSJS English authoring manuscript | `output/publication/nhsjs/AI-FMS_NHSJS_English_Authoring_Manuscript_Standard_Citations.docx` | 官方 Standard 模板、11 页、4 表 6 图、盲审 metadata 已清理 | Ronnie 独立英文写作与逐段确认      | 删除黄色 prompts；正文全部由 Ronnie 独立写成 |
| English authoring guide            | `docs/publication/ai_fms_nhsjs_english_authoring_guide_2026-08-23.md`                        | 字数、证据、引用与禁用主张已映射                           | Ronnie 写作核对与合规控制          | 每段完成后逐项核对                           |
| NHSJS publication track            | `docs/publication/README.md`                                                                 | 路线和询问信已准备                                         | 期刊资格确认与投稿管理             | 发送 presubmission inquiry                   |
| Presubmission inquiry              | `docs/publication/nhsjs_presubmission_inquiry_2026-08-17.md`                                 | 草稿完成                                                   | 确认 AI、ethics、advisor、preprint | 人工确认后发送并归档回复                     |
| Technical report                   | `docs/reports/ai_fms_phase_i_technical_report_2026-08-09.md`                                 | Markdown 内容完成                                          | 老师、研究导师、技术深讲           | 根据论文最终细节统一一次并导出 PDF           |
| Dataset card                       | `docs/research/ai_fms_phase_i_dataset_card_2026-08-09.md`                                    | 内容完成                                                   | 数据范围、标签和发布边界           | rights/privacy 最终审计                      |
| Methods/limitations/ethics         | `docs/research/ai_fms_phase_i_methods_limitations_ethics_2026-08-09.md`                      | 内容完成                                                   | 论文 supplement、技术审阅          | 与期刊书面回复同步                           |
| Data dictionary                    | `docs/research/pilot_v1_data_dictionary.md`                                                  | 内容完成                                                   | 研究复现与交接                     | 随 final release 冻结版本号                  |

## 4. 私有研究与复现输出

以下材料不进入公开 GitHub 或申请附件：

- raw videos 和未获授权的可识别帧；
- 未脱敏的 Level 1/Level 2 certificate originals；
- raw pose landmark files；
- Reviewer A/B 原始 comments 和签名 review exports；
- `ai-fms-study-reviews.sqlite` 与本地 Ingested-data；
- 含本地绝对路径的 manifest 或 QA logs；
- 任何尚未通过 rights、PII 或 source-license 审计的媒体。

公开仓库当前未跟踪 `.mp4` 或 `.sqlite` 文件。Workbench 与 Study Mode 固定界面帧已于
2026-08-23 改用项目自采素材并完成申请/portfolio/论文 Demo 使用确认；raw video、raw pose
和其他可识别源帧仍保持私有。

## 5. GitHub 所有权

当前仓库：`edwardzhu-HK/AI-FMS`，PRIVATE，默认分支为 `main`。

决定：Ronnie 注册个人 GitHub 账户后，使用 GitHub repository transfer 将仓库所有权
迁移给 Ronnie，不重新创建一个丢失历史的平行仓库。具体门槛与步骤见：

`docs/delivery/ronnie_github_repository_transfer_2026-08-17.md`

迁移前必须完成：

1. 当前 closeout 分支合并或收口到 `main`；
2. 确认目标用户名，且 Ronnie 名下不存在同名仓库或同一网络的 fork；
3. 完成公开媒体、PII、secret 和大文件审计；
4. 生成 final public manifest、release tag 和恢复说明；
5. Ronnie 准备在收到邮件后 24 小时内接受 transfer。

## 6. 当前执行顺序

1. **已完成**：统一申请文案、project-page copy、demo script、README、plan 和 backlog。
2. **已完成**：证书原件、A-roll、七动作、实践 B-roll、旁白、participant/场地授权与
   `Haoran Zhu` 正式姓名确认；原始文件无需重命名。
3. **现在并行**：Ronnie 按 NHSJS author-only prose policy 在官方格式 Word 中独立完成
   英文正文；团队 review music-free Master v1，反馈节奏、结尾、字幕和音乐；技术侧据此
   输出 Master v2、3min 与 60s，并继续实现 project page 和 technical-report PDF。
4. **发表路径**：发送 NHSJS 询问信，按书面回复准备英文 Word 与 supplement。
5. **最后收口**：clean rebuild、public manifest、main merge、release、GitHub transfer。

## 7. 状态用语

当前可以使用：

- `Phase I research prototype completed`
- `manuscript in preparation`
- `internal benchmark`
- `two-round blinded reviewer study`

当前不能使用：

- `peer reviewed`
- `accepted` 或 `published`
- `clinically validated`
- `diagnostic accuracy`
- `110 participants`
