# ADR 0001: Frontend Stack

## Status

Accepted

## Context

Calibration 需要复杂交互与状态管理，包括:

- 视频上传与分析区间配置
- 片段列表导航与播放器循环播放
- 片段级三评分录入与状态追踪
- 后续从 Deep Squat 快速扩展到 7 动作

## Decision

V0 使用 `React + Vite`。

## Consequences

优点:

- 组件化和状态管理更清晰
- 开发体验好，热更新快
- 便于构建可复用的片段工作台组件

代价:

- 工程复杂度高于原生模板
- 依赖管理和构建流程更多

## Rejected Alternative

- 原生 `HTML/CSS/JS` 模板未采用。原因是跨页面状态管理和复杂交互维护成本更高，不利于后续动作扩展。
