# AI-FMS Phase I 多渠道发表路线

状态：ACTIVE - 三套材料等待作者审核

最近更新：2026-10-03

英文版：`README.md`

## 当前发表决定

项目现在同时准备三个定位不同、但证据一致的公开输出：

1. **Zenodo preprint**：完整保存系统开发、Phase I 方法、结果、限制和 Human-AI Collaboration，并获得 DOI。
2. **OpenAI Developer Community**：用真实工程案例讲 Codex 加速了什么，以及哪些判断必须由人承担。
3. **ACM IUI 2027 Demo**：以 intelligent interface 为主，提交 4 页论文和不超过 5 分钟的系统演示视频。

三份材料使用同一套经过核对的事实，但不复制同一篇文章。以前的 NHSJS 文件继续作为历史准备材料保留，不再作为当前主线，原因是其 author-only prose policy 不适合本项目希望透明呈现的 AI-positive collaboration 故事。

## 已确认标题

- **Zenodo：** _AI-FMS: System Development, Phase I Evaluation, and Human-AI Collaboration in FMS Video Review_
- **OpenAI Community：** _Building AI-FMS with Codex: What AI Automated and What Human Judgment Had to Own_
- **ACM IUI 2027 Demo：** _AI-FMS: An Explainable Human-in-the-Loop Interface for Functional Movement Screen Video Review_

## 统一证据和主张边界

- 产品范围覆盖全部 7 个 FMS 动作。
- Phase I 重点研究 Deep Squat、Hurdle Step、ASLR 和 Rotary Stability 四个动作。
- Corpus：28 个独立源视频、29 条 ingest、110 个 canonical reps。
- Formal audit：32 reps，每动作 8 条，来自 21 个源视频；2 位 reviewer；2 轮盲评。
- Round B：两位 reviewer 在本样本中达到 32/32 status agreement 和 26/26 numeric exact agreement。
- Locked AI：28/32 coverage；4 条 protocol-aware abstention；25 条可比较；exact 16/25；within one 23/25；MAE 0.44；linear weighted kappa 0.4917。
- 这些是 internal Phase I post-audit feasibility evidence，不是 held-out、external 或 clinical validation。
- AI-FMS 用于 movement screening 和 human review，不诊断伤病、疼痛或功能障碍，也不替代认证专业人员。

## 当前准备程度

| 组成部分              | 状态                 | 证据或缺口                                                 |
| --------------------- | -------------------- | ---------------------------------------------------------- |
| 三篇英文稿            | 等待作者审核         | Zenodo、OpenAI Community、ACM IUI 内容均完整               |
| Zenodo DOCX/PDF       | 等待作者审核         | 15 页、7 张图、已经完整渲染检查                            |
| Zenodo 中文翻译稿     | 等待内部审核         | 完整中文 Markdown 与排版 Word；英文稿仍为 canonical        |
| ACM IUI paper         | 等待作者审核         | 官方 ACM Word 模板、总计 4 页                              |
| OpenAI Community post | 等待 Ronnie 语气审核 | Markdown、排版 Word、图片、tags、launch copy、操作指引齐全 |
| 发布指引              | 已准备               | 每个 folder 内都有中文步骤                                 |
| 文件校验和 ZIP        | 已准备               | 52 文件 manifest、SHA-256 和 3 个测试通过的 ZIP            |
| 作者、单位、ORCID     | 待人工确认           | 稿件中的黄色位置必须填写或删除                             |
| 图片、视频和隐私权利  | 部分完成             | 界面图使用自采授权素材；其他媒体默认不公开                 |
| GitHub 转移           | 待完成               | 完整审计 history 和公开边界后转给 Haoran Zhu               |
| Public demo URL       | 待完成               | 使用 sanitized demo data 和授权视频                        |
| Zenodo DOI            | 待完成               | 建立 draft 后预留，再写入最终 PDF                          |
| ACM preprint 政策     | 已核对               | 允许非同行评审预印本；询问 chairs 为可选核实               |
| IUI 现场参加和成本    | 待确认               | 录用后至少一位作者需要到 Helsinki                          |

## 统一发布包

`../../output/publication/ai-fms-multichannel-release-2026-08-25/`

主要入口：

- `README.md`：三条渠道的关系和发布顺序。
- `publication-review-order.zh-CN.md`：逐轮审核顺序。
- `00-release-control/author-rights-and-claims-checklist.md`：发布阻断项。
- `01-zenodo-preprint/`：完整 preprint、metadata、disclosure、图和操作指引。
- `02-openai-developer-community/`：开发者文章、图片、launch copy 和操作指引。
- `03-acm-iui-2027-demo/`：4 页论文、demo runbook、视频方案、PCS metadata、询问信和操作指引。
- `release-archives/`：每个渠道一个经过解压验证的 ZIP。
- `release-manifest.json` 与 `SHA256SUMS`：完整性记录。

## 必须人工确认的事项

1. 作者名单、顺序、单位、邮箱、ORCID 和 corresponding contact。
2. 每一句英文、每张图、每个数字、每条 reference 和 AI-use disclosure。
3. 每个公开图片、视频、音乐和 GitHub asset 的权利。
4. Zenodo 公开前判断是否可能申请专利。
5. IUI 稿引用并披露 Zenodo 预印本；询问 chairs 为可选核实，不作为 Zenodo 发布前置条件。
6. 提供 Haoran Zhu 的 GitHub username，批准 repository transfer 和公开发布。
7. 录用后至少一位作者可以前往 Helsinki。

## 对外状态表述

只能使用已经真实发生的状态：

- `draft in author review`
- `Zenodo preprint`
- `submitted to ACM IUI 2027 Demos`
- `under peer review`
- `accepted`
- `published in the ACM IUI companion proceedings`

Zenodo 和 Developer Community 都是公开输出，但都不是 peer reviewed。

## 2026-10-03 作者审核进展

Zenodo 已确认唯一作者 Haoran ZHU、学校与申请邮箱、无利益冲突、无外部资金、
删除致谢、当前图片公开授权及 CC BY 4.0 论文许可。方法中已补充其 FMS Level 1
和 Level 2 认证。DOI 尚未分配，Zenodo 尚未发布。用户已要求开放现有 GitHub，
正在处理旧媒体历史的公开边界。

政策依据：[ACM Policy on Authorship](https://www.acm.org/publications/policies/new-acm-policy-on-authorship)。
