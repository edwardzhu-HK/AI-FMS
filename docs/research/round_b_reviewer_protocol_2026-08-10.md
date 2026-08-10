# AI-FMS Round B Reviewer Protocol

版本：v1.0
日期：2026-08-10
状态：READY FOR REVIEW

## 1. 目的

Round B 用同一组冻结的 32 个 rep，观察 pose-derived quantitative evidence 是否会
帮助 reviewer 调整 RAW SCORE、confidence 或可评分性判断。它是 evidence-assisted
review，不是第二次盲评，也不是 AI 自动诊断或临床有效性验证。

正式入口：`http://127.0.0.1:5173/study.html?round=b`

## 2. 开始条件

- 与 Round A 保持至少 48-72 小时间隔。
- Ronnie 与 Other Reviewer 分别独立完成，不查看对方的 Round B 结果。
- 开始前运行 `npm run study:evidence:round-b`，并确认页面显示 32 条队列。
- 不修改 formal rep ID、ASLR/Hurdle threshold 或 AI v1.0 rule fingerprint。

## 3. 页面证据

每条记录均显示视频、pose-derived features、timing/visibility 质量信息和冻结版本。
证据分为三种主要状态：

| 状态                         | Reviewer 看到的内容                         |
| ---------------------------- | ------------------------------------------- |
| `ai_score_available`         | 定量特征、质量信息、AI v1.0 RAW SCORE 建议  |
| `features_only`              | 定量特征和质量信息，不显示 AI RAW SCORE     |
| `protocol_metadata_required` | 定量特征；因协议条件不足不显示 AI RAW SCORE |

Rotary Stability 的正式 8 条均为 `features_only`。Deep Squat 中缺少完整
attempt-condition metadata 的记录也不显示 AI RAW SCORE。不要根据文件名、历史人工分数
或另一位 reviewer 的结果补齐答案。

## 4. 每条记录怎么填

1. 循环观看完整 rep，先按 FMS 规则形成自己的判断。
2. 阅读 pose-derived evidence；把它作为人工观察的定量补充。
3. 填写 RAW SCORE `0/1/2/3`，或选择“无法独立评分”。
4. 填写 Confidence：低 / 中 / 高。
5. 必填 Evidence usefulness：
   - **有帮助**：证据帮助确认、修改或解释了判断；
   - **未改变判断**：证据可读，但没有改变原判断；
   - **证据不足**：证据质量、协议条件或特征覆盖不足以提供帮助。
6. Camera view 和 Side 默认来自冻结 manifest；只有明显不正确时才调整。
7. 如选择“无法独立评分”，必须选择原因并写简短 note。

RAW SCORE 0 只用于已经观察或报告疼痛；缺少参照物、协议条件或画面不足应记为
`unscorable`，不能用 0 代替。

## 5. 保存、续做与导出

- “保存并继续”写入 append-only event；修改旧结果会生成 superseding event。
- “稍后处理”不计入完成，最后必须回到该条并形成 scored 或 unscorable 终态。
- 浏览器刷新可继续，但 localStorage 仅是本机 resume cache，不是最终数据库。
- 完成 32/32 后生成 JSON 与 SHA-256 两个文件，并保持文件名不变。

校验和入库：

```bash
npm run study:reviews:validate -- /absolute/path/to/round-b-review.json
npm run study:reviews:ingest -- /absolute/path/to/round-b-review.json
```

两条命令会自动读取冻结 Round B evidence package，校验其 SHA-256，并逐条核对
manifest fingerprint、item fingerprint、evidence status 和 AI suggestion exposure。

## 6. 分析边界

AI v1.0 已在 Round B 人评前冻结：32 条均有定量特征，其中 18 条有可比较 AI RAW
SCORE、8 条 Rotary 为 feature-only、6 条 Deep Squat 因协议条件不足不显示总分。
两位 reviewer 完成后，才运行 Round B agreement、A/B change 和 AI-vs-human
comparison。报告必须把 coverage 与 agreement 分开，并继续表述为 exploratory
concordance，而不是模型准确率或临床验证。

完成后的统一分析命令：

```bash
npm run study:closeout:round-b -- \
  /absolute/path/to/round-a-reviewer-1.json \
  /absolute/path/to/round-a-reviewer-2.json \
  /absolute/path/to/round-b-reviewer-1.json \
  /absolute/path/to/round-b-reviewer-2.json
```
