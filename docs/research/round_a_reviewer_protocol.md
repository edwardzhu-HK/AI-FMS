# AI-FMS Round A 独立盲评 Protocol

## 1. 状态与范围

- Study：四动作 Core N=32。
- Round：`round_a`。
- Reviewer：`Ronnie`、`Other Reviewer`。
- 目标：记录不受历史标签、AI evidence 或另一位 reviewer 影响的独立 FMS RAW SCORE。
- 正式入口：`http://127.0.0.1:5173/study.html?round=a`。

Round A 的两位 reviewer 不讨论具体案例，不查看另一人的进度、分数或备注。页面保持静音，不显示源文件名、历史人工分数或 AI suggestion。

## 2. 每个 Rep 的记录

| 字段        | 填写口径                                                                      |
| ----------- | ----------------------------------------------------------------------------- |
| Review 结果 | 能按 FMS rubric 判断时选择 RAW SCORE；不具备独立评分条件时选择“无法独立评分”  |
| RAW SCORE   | 按当前 FMS rubric 选择 0、1、2 或 3；`0` 只用于已观察或报告疼痛，并需显式确认 |
| Confidence  | `低`：证据不足；`中`：可以判断但存在不确定性；`高`：动作与评分依据清晰        |
| Camera view | manifest 会预填 `Front`、`Side` 或 `Mixed`；只在画面与预填不一致时修改        |
| Side        | manifest 会预填侧别；非侧别动作使用 `N/A`，无法判断时使用 `Unknown`           |
| QA flags    | 动作不可见、边界需调整或出现分数提示时勾选                                    |
| Review note | 记录影响评分的可观察理由；出现 QA 问题或低 confidence 时应简要说明            |

“无法独立评分”不是 `0` 分。Reviewer 必须选择一个原因并填写 note：

- `movement_not_visible`：目标动作或关键身体部位不可见；
- `missing_required_reference`：缺少 FMS 评分所需参照物；
- `missing_required_protocol_condition`：缺少必要的 protocol condition，例如应进入垫跟条件但视频没有提供；
- `timing_invalid`：片段边界不包含可判断的完整动作；
- `other`：其他无法独立评分的原因，必须在 note 中解释。

页面计时器记录当前 rep 在前台可见状态下的审核时间。切换标签页或窗口到后台时暂停累计；重新打开当前 rep 会形成新的 review event，不覆盖旧事件。

## 3. 保存与续做

1. 选择自己的 Reviewer 身份后开始。
2. 能评分时选择 RAW SCORE；符合上述停止条件时选择“无法独立评分”；仍需稍后复核时点击“稍后处理”。
3. 页面刷新后会从该 Reviewer、该 Round 的独立本地记录恢复。
4. 每次 session 结束时都生成一次阶段导出包。

浏览器存储只是续做缓存。正式交付证据是带 SHA-256 的 append-only event
log；通过 validator 的完整导出再进入被 Git 忽略的本地 SQLite 研究数据库。

## 4. 导出与交付

点击“生成导出包”后，页面显示当前状态：

- `x/32 Partial`：允许作为阶段备份，但不能冻结为正式 Round A 结果。
- `32/32 Complete`：全部 rep 已有最终 `scored` 或 `unscorable` event，且没有 deferred 或缺失项。

完成数量和可分析数量必须分开报告。例如 `32 reviewed / 27 scored / 5
unscorable` 表示 reviewer 已完成 32 条，但只有 27 条进入分数分析。

随后分别下载：

- `*.json`：完整 review export。
- `*.json.sha256`：对应 JSON 的 SHA-256。

两份文件必须一起交付。Codex 使用以下命令验证正式导出：

```bash
npm run study:reviews:validate -- /absolute/path/to/review.json
```

验证通过后写入本地研究数据库：

```bash
npm run study:reviews:ingest -- /absolute/path/to/review.json
npm run study:reviews:db:status -- --pilot-id ai-fms-four-movement-core-2026-08-09 --round round_a --reviewer Ronnie
```

导入会校验相邻 `.sha256`、冻结 manifest 和完整性，并按 export hash 幂等执行；
重复导入不会重复创建 event。同一个 `eventId` 若出现不同内容则拒绝写入。

阶段性备份可使用：

```bash
npm run study:reviews:validate -- --allow-partial /absolute/path/to/review.json
```

## 5. 停止条件

出现以下情况时选择“无法独立评分”、填写原因与 note，不把它强行记为某个
RAW SCORE：

- 画面直接显示 0–3 分或等价答案；
- 目标人物或完整动作不可见；
- 当前时间边界截断动作；
- 无法确认动作侧别或 camera view，且该信息是当前评分的必要条件。

Round A 完成后不向 reviewer 展示双方差异。两份完整导出冻结并校验后，保留至少 48–72 小时间隔，再进入重新随机的 Round B。

两份导出均冻结后，由 Codex 运行以下命令生成私有 agreement package：

```bash
npm run study:reviews:agreement -- /absolute/path/to/reviewer-a.json /absolute/path/to/reviewer-b.json
```

可评分性、RAW SCORE 和 unscorable 原因分别统计；不得把 unscorable 转成 0
或其他数值。分析完成不缩短 Round A 与 Round B 之间的 48–72 小时间隔。
