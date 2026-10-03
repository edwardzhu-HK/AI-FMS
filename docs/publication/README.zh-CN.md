# AI-FMS Phase I 多渠道发表路线

状态：ACTIVE - Zenodo 已发布；展示页与视频完成；Community／PCS 待登录

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

| 组成部分              | 状态                      | 证据或缺口                                                    |
| --------------------- | ------------------------- | ------------------------------------------------------------- |
| 三篇英文稿            | Zenodo 已发布，其余为草稿 | Community 定稿、IUI 四页稿及视频已备齐，尚未发布／投稿        |
| Zenodo DOCX/PDF       | 已发布                    | 版本 1.0；15 页英文 PDF，含 DOI 与 7 张图                     |
| Zenodo 中文翻译稿     | 已完成作者审阅            | 完整中文 Markdown 与排版 Word；英文稿仍为 canonical           |
| ACM IUI paper         | 稿件已更新                | 官方 ACM Word 模板、总计 4 页、作者与 DOI 已填写              |
| OpenAI Community post | 待账号登录发布            | Markdown、排版 Word、图片、tags、launch copy、操作指引齐全    |
| 发布指引              | 已准备                    | 每个 folder 内都有中文步骤                                    |
| 文件校验和 ZIP        | 已准备                    | 动态 manifest、SHA-256 和 3 个测试通过的 ZIP                  |
| 作者、单位、ORCID     | 三份材料均已填写          | Haoran ZHU；学校和邮箱已填；ORCID 省略                        |
| 图片、视频和隐私权利  | 当前论文图片已确认        | 原始研究媒体保持私有；已补齐 2:36 自采录屏衍生视频            |
| GitHub 公开访问       | 已完成                    | 原地址公开；所有权转移可另行处理                              |
| Public showcase       | 已制作                    | https://edwardzhu-hk.github.io/AI-FMS/ ，含视频、字幕和文字稿 |
| Zenodo DOI            | 已发布                    | 10.5281/zenodo.23118144；版本 1.0，未经同行评审               |
| ACM preprint 政策     | 已核对                    | 允许非同行评审预印本；询问 chairs 为可选核实                  |
| IUI 现场参加和成本    | 待确认                    | 录用后至少一位作者需要到 Helsinki                             |

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

## 后续渠道的剩余事项

1. 登录 OpenAI Community，用已完成正文发布并保存实际 URL。
2. 登录 PCS，确认录用后到场与费用计划，再完成表单、上传和最终提交。
3. IUI 当前稿件已引用 Zenodo；若 Community 先发布，再将真实链接填入 PCS 披露。
4. GitHub 所有权转移可另行处理，不影响当前公开访问。

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

三份材料均已填写唯一作者 Haoran ZHU、学校与申请邮箱、无利益冲突、无外部资金、
删除致谢、当前图片公开授权及 CC BY 4.0 论文许可。方法中已补充其 FMS Level 1
和 Level 2 认证。Zenodo v1.0 已于 2026-10-03 发布，DOI 为
[10.5281/zenodo.23118144](https://doi.org/10.5281/zenodo.23118144)。现有 GitHub 已完成旧媒体历史清理并在原地址公开；旧库及 PR 保留为私有归档。

政策依据：[ACM Policy on Authorship](https://www.acm.org/publications/policies/new-acm-policy-on-authorship)。

## Zenodo 正式记录

- 公开页面：https://zenodo.org/records/23118144
- 版本 DOI：10.5281/zenodo.23118144
- 总版本 DOI：10.5281/zenodo.23118143
- 发布日期：2026-10-03
- 发布文件：最终英文 PDF，15 页，1,219,547 bytes。
- 状态：Preprint. Not peer reviewed.
