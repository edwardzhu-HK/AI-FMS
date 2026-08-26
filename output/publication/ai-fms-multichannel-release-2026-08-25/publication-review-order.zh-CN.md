# 三套发布材料的审核顺序

建议不要三篇交叉着改。按下面顺序审核，能明显减少重复返工。

## 第一轮：共同事实

先看：

1. `00-release-control/source-of-truth-evidence.md`
2. `00-release-control/author-rights-and-claims-checklist.md`
3. 三篇文章的 abstract、数字表和 limitation

这一轮只确认事实、作者、权利和 claim boundary，不调整文风。

## 第二轮：Zenodo 完整稿

可以先使用 `01-zenodo-preprint/AI-FMS_System_Development_Phase_I_Evaluation_Preprint.zh-CN.docx`
理解和讨论全文，再回到英文 canonical manuscript 逐句确认。中文稿是翻译审阅稿，不替代英文原稿。

依次检查：

1. 标题和摘要是否准确代表整个项目；
2. 七动作产品与四动作 Phase I 的关系；
3. Methods 与 Results 数字；
4. 四个 movement cases 是否有足够差异；
5. Discussion、Limitations 和结论；
6. 每位作者的 contribution 和 disclosure；
7. PDF 的图、表、页码和 reference。

Zenodo 是事实底稿。这里定稿后，另外两个渠道不能出现与它矛盾的数字或说法。

## 第三轮：OpenAI Developer Community

重点不是逐句学术化，而是确认：

- 第一人称是否像 Ronnie 本人；
- 四个工程教训是否真实；
- Codex 的帮助有没有夸大或贬低人的工作；
- 是否愿意公开这些开发过程；
- 结尾问题是否真的想邀请社区讨论。

## 第四轮：ACM IUI 2027 Demo

重点检查：

- 是否把 interface contribution 放在最前面；
- evidence、reviewer control、abstention、blind Study Mode 是否讲清楚；
- 正文严格不超过 4 页；
- demo runbook 是否能现场无网络完成；
- GenAI 与 related work disclosure 是否完整；
- 至少一位作者是否能现场去 Helsinki。

## 第五轮：跨渠道一致性

最后只做一次跨渠道对照：

- 标题不同但项目身份一致；
- 所有数字一致；
- OpenAI 帖不复制完整方法；
- IUI paper 引用并区分 Zenodo；
- 所有 public URLs、DOI、作者顺序和日期一致。
