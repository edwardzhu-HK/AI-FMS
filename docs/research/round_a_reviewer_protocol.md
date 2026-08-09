# AI-FMS Round A 独立盲评 Protocol

## 1. 状态与范围

- Study：四动作 Core N=32。
- Round：`round_a`。
- Reviewer：`Ronnie`、`Other Reviewer`。
- 目标：记录不受历史标签、AI evidence 或另一位 reviewer 影响的独立 FMS RAW SCORE。
- 正式入口：`http://127.0.0.1:5173/study.html?round=a`。

Round A 的两位 reviewer 不讨论具体案例，不查看另一人的进度、分数或备注。页面保持静音，不显示源文件名、历史人工分数或 AI suggestion。

## 2. 每个 Rep 的记录

| 字段        | 填写口径                                                               |
| ----------- | ---------------------------------------------------------------------- |
| RAW SCORE   | 按当前 FMS rubric 选择 0、1、2 或 3                                    |
| Confidence  | `低`：证据不足；`中`：可以判断但存在不确定性；`高`：动作与评分依据清晰 |
| Camera view | manifest 会预填 `Front`、`Side` 或 `Mixed`；只在画面与预填不一致时修改 |
| Side        | manifest 会预填侧别；非侧别动作使用 `N/A`，无法判断时使用 `Unknown`    |
| QA flags    | 动作不可见、边界需调整或出现分数提示时勾选                             |
| Review note | 记录影响评分的可观察理由；出现 QA 问题或低 confidence 时应简要说明     |

页面计时器记录当前 rep 在前台可见状态下的审核时间。切换标签页或窗口到后台时暂停累计；重新打开当前 rep 会形成新的 review event，不覆盖旧事件。

## 3. 保存与续做

1. 选择自己的 Reviewer 身份后开始。
2. 每个 rep 点击“保存并继续”，暂时无法判断时点击“稍后处理”。
3. 页面刷新后会从该 Reviewer、该 Round 的独立本地记录恢复。
4. 每次 session 结束时都生成一次阶段导出包。

浏览器存储只是续做缓存，不是正式数据库。正式证据以导出的 append-only event log 为准。

## 4. 导出与交付

点击“生成导出包”后，页面显示当前状态：

- `x/32 Partial`：允许作为阶段备份，但不能冻结为正式 Round A 结果。
- `32/32 Complete`：全部 rep 已有最终 scored event，且没有 deferred 或缺失项。

随后分别下载：

- `*.json`：完整 review export。
- `*.json.sha256`：对应 JSON 的 SHA-256。

两份文件必须一起交付。Codex 使用以下命令验证正式导出：

```bash
npm run study:reviews:validate -- /absolute/path/to/review.json
```

阶段性备份可使用：

```bash
npm run study:reviews:validate -- --allow-partial /absolute/path/to/review.json
```

## 5. 停止条件

出现以下情况时先勾选 QA flag、填写 note，并暂停对该 rep 作强行解释：

- 画面直接显示 0–3 分或等价答案；
- 目标人物或完整动作不可见；
- 当前时间边界截断动作；
- 无法确认动作侧别或 camera view。

Round A 完成后不向 reviewer 展示双方差异。两份完整导出冻结并校验后，保留至少 48–72 小时间隔，再进入重新随机的 Round B。
