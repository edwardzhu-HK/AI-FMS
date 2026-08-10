# AI-FMS Round B Reviewer Protocol

版本：v1.1
日期：2026-08-10
状态：READY FOR BLIND REVIEW

## 1. 目的

Round B 使用同一组冻结的 32 个 rep，在至少 48-72 小时间隔后进行第二次独立
盲评。它用于评估 reviewer 内部稳定性、两位 reviewer 之间的一致性，以及评分、
confidence 和 review time 在两轮之间的变化。

Reviewer 只能看到匿名化视频片段和人工评分表单，看不到：

- Round A 答案或自己的历史答案；
- 另一位 reviewer 的结果；
- AI RAW SCORE、AI confidence 或 AI 解释；
- pose-derived 角度、距离、轨迹、timing 或质量提示；
- 原始文件名、历史教练分数或其他 label cue。

正式入口：`http://127.0.0.1:5173/study.html?round=b`

## 2. 开始条件

- 与 Round A 保持至少 48-72 小时间隔。
- Ronnie 与 Other Reviewer 分别独立完成，不交流具体案例。
- 页面必须显示 `Round B · Blind`，队列必须为 32 条。
- 页面不得出现 `POSE-DERIVED EVIDENCE`、`AI RAW SCORE` 或
  `Evidence usefulness`。
- 不修改 formal rep ID、视频窗口、AI 规则或 AI v1.0 rule fingerprint。

## 3. 每条记录怎么填

1. 循环观看完整 rep，按 FMS 规则独立形成判断。
2. 填写 RAW SCORE `0/1/2/3`，或选择“无法独立评分”。
3. 填写 Confidence：低 / 中 / 高。
4. Camera view 和 Side 默认来自冻结 manifest；只有明显不正确时才调整。
5. 如选择“无法独立评分”，必须选择原因并写简短 note。

RAW SCORE 0 只用于已经观察或报告疼痛；缺少参照物、协议条件或画面不足应记为
`unscorable`，不能用 0 代替。

## 4. 保存、续做与导出

- “保存并继续”写入 append-only event；修改旧结果会生成 superseding event。
- “稍后处理”不计入完成，最后必须回到该条并形成 scored 或 unscorable 终态。
- 浏览器刷新可继续，但 localStorage 仅是本机 resume cache，不是最终数据库。
- 完成 32/32 后生成 JSON 与 SHA-256 两个文件，并保持文件名不变。

校验和入库：

```bash
npm run study:reviews:validate -- /absolute/path/to/round-b-review.json
npm run study:reviews:ingest -- /absolute/path/to/round-b-review.json
```

校验器会拒绝任何包含 `evidenceReview`、current pose evidence 或 current AI suggestion
暴露的 Round B event。

## 5. AI 冻结与评后比较

AI v1.0 在 Round B 人评前冻结，但冻结包不会被 Study Mode 请求或显示。32 条中
18 条有可比较 AI RAW SCORE，8 条 Rotary 在 v1.0 中为 feature-only，6 条
Deep Squat 因协议条件不足不输出总分。

只有在两位 reviewer 完成 Round B、导出、校验并入库后，分析脚本才读取冻结
AI 包，计算：

- Reviewer A vs Reviewer B，Round B；
- 每位 reviewer 的 Round A vs Round B test-retest 变化；
- 冻结 AI vs Round A 人工共识；
- 冻结 AI vs Round B 人工共识。

报告必须把 coverage 与 agreement 分开，并继续表述为 exploratory concordance，
不是临床有效性、诊断准确率或独立 held-out validation。

完成后的统一分析命令：

```bash
npm run study:closeout:round-b -- \
  /absolute/path/to/round-a-reviewer-1.json \
  /absolute/path/to/round-a-reviewer-2.json \
  /absolute/path/to/round-b-reviewer-1.json \
  /absolute/path/to/round-b-reviewer-2.json
```
