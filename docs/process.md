# Development Process

## 1. Scope Guard

- 新需求先进 backlog，不直接开发。
- 先定义 V0 必要能力，非必要项放 P1/P2。
- 每次迭代先更新文档（`spec + backlog + adr`）再开始开发。

## 2. Work Unit

每个任务必须包含:

- 目标
- 验收标准
- 风险点
- 测试点

## 3. Definition of Done

- 功能与规格一致
- `npm run check` 通过
- 文档回写（至少 backlog 状态）
- 无阻断缺陷
- 与评分裁决规则一致（`A/B/AI` 三评分与有效标签判定）

## 4. Sprint Rhythm (1 week)

- 周初: 选定本周任务
- 周中: 风险同步与调整
- 周末: 演示 + 复盘

## 5. Documentation Policy

- 规格变更必须先改 `docs/specs/v0.md`。
- 技术方案或关键规则变化必须新增或更新 `docs/adr/*.md`。
- 当需求口径变化时，同步更新 `docs/backlog.md` 的优先级与任务定义。

## 6. Quality Gate Policy

- 每个工作单元完成后必须执行 `npm run check`。
- `check` 未通过时不得标记任务完成。
- 验收记录要写入 `docs/backlog.md`。
