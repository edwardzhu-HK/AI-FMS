# ADR 0002: Calibration System Architecture (Option A)

## Status

Accepted

## Context

项目目标是把 FMS 标定流程做成可持续迭代的工程系统。核心约束:

- 需要 CV 算法能力（片段切分、机位识别、评分规则）
- 需要可扩展到 7 动作
- 需要强审计与数据追溯能力
- 需要前后端可持续开发与质量门禁

## Decision

采用分层架构（方案 A）:

- 前端: `React + Vite`（当前 JS 代码，后续可迁移 TS）
- API: `NestJS/Fastify`
- CV/算法: `Python + OpenCV + MediaPipe`
- 数据: `PostgreSQL` + `S3/MinIO`
- 异步编排: `Redis + Queue`

## Consequences

优点:

- Python CV 生态成熟，算法落地风险更低
- 前后端与算法职责边界清晰
- 易于扩展新动作与模型版本管理

代价:

- 多语言栈带来部署和联调复杂度
- 需要明确 API 合约与任务状态机

## Guardrails

- 任何涉及架构边界的变化必须更新本 ADR。
- 当前阶段已扩展到 7 动作基线，优先保持统一数据结构与可追溯性，不做动作专属后端分叉。
