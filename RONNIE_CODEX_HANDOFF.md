# Ronnie Codex 接手说明

日期：2026-05-23

这份文档用于把 AI-FMS 项目从 Edward 当前电脑移交到 Ronnie 电脑上的
Codex 继续开发。目标不是只运行 demo，而是让 Ronnie 的 Codex 能理解项目定位、
当前状态、验证方式和下一步开发方向。

## 1. 移交方式

推荐线下拷贝整个项目目录：

```text
/Volumes/SamsungSSD990-4TB/CodeX-Projects/03-FMS-Calib
```

拷到 Ronnie 电脑后可以重命名为：

```text
AI-FMS
```

这次是给 Ronnie 的 Codex 继续开发，所以建议保留：

- `.git`
- `AGENTS.md`
- `README.md`
- `docs/`
- `src/`
- `tests/`
- `server/`
- `scripts/`
- `Eval_Videos/`
- `test-videos/`
- `package.json`
- `package-lock.json`

可以不拷或拷过去后删除：

- `node_modules/`
- `dist/`
- `.cache/`
- `.venv/`

`node_modules` 不建议跨电脑复用，Ronnie 电脑上重新 `npm install` 更干净。

## 2. Ronnie 电脑环境

Ronnie 电脑需要：

- Node.js 20+，Node 22 也可以
- npm
- Git
- Codex desktop app

检查命令：

```bash
node -v
npm -v
git --version
```

## 3. 首次启动

在 Ronnie 电脑上进入项目目录：

```bash
cd /path/to/AI-FMS
npm install
npm run check
npm run dev
```

浏览器打开：

```text
http://localhost:5173/
```

如果端口 5173 被占用，Vite 会提示另一个端口，按终端输出打开即可。

## 4. 必须确认的 demo assets

当前 Deep Squat flagship demo 依赖这些文件：

```text
Eval_Videos/01-Deep Squat/Sample-1.mp4
Eval_Videos/01-Deep Squat/front.mp4
Eval_Videos/01-Deep Squat/side.mp4
Eval_Videos/01-Deep Squat/pose/Sample-1.pose.json
Eval_Videos/01-Deep Squat/pose/front.pose.json
Eval_Videos/01-Deep Squat/pose/side.pose.json
```

如果这些文件缺失，页面仍可能运行，但 demo video、骨骼 overlay、Deep Squat
features 和基于 Pose 的 AI 建议会不完整。

## 5. Ronnie 在 Codex 中打开项目后，第一条提示词

建议 Ronnie 在 Codex 里打开 `AI-FMS` 项目目录后，直接输入：

```text
请先阅读 AGENTS.md、README.md、docs/backlog.md、
docs/specs/v1_5_scope_and_roadmap.md、RONNIE_CODEX_HANDOFF.md，
然后检查当前项目状态。不要重写项目，优先复用现有 React/Vite workbench、
mock API、pose pipeline、dataset export 和测试。请告诉我当前能运行什么、
如何测试、下一步最适合做什么。
```

如果他准备继续开发，可以接着说：

```text
沿着 backlog 继续推进。每次改动后运行 npm run check，
并在本地 Git 里做小步 commit。文档和面向人的说明请以中文为主。
```

## 6. 当前项目定位

AI-FMS 是一个 AI-assisted, human-in-the-loop FMS video annotation 和
movement-quality dataset platform。

它不是医疗诊断工具，也不是替代 certified FMS professional 的自动评分系统。

当前应强调：

- movement screening
- human reviewer workflow
- pose-based evidence
- explainable AI suggestion
- traceable dataset export
- application-facing project narrative

## 7. 当前已完成能力

当前 V1.5 demo 已能完成：

- 7 个 FMS movement 的 workflow-level action selector。
- Deep Squat demo preset：`Sample-1 mixed views`、`Front only`、`Side only`。
- 上传/加载视频和 pose JSON。
- 根据视频长度和 demo preset 填入 Start/End。
- Deep Squat segment 生成。
- 单一 `分段`列表，显示：
  - 当前 segment timing
  - 建议 timing
  - coverage
  - Timing QA
  - Review 状态
- 播放区预览 suggested timing，预览不会自动覆盖 metadata。
- 应用 suggested timing 后，可保存 Segment metadata。
- 真实 MediaPipe pose skeleton overlay。
- Deep Squat pose features：
  - Depth
  - Torso
  - Knee alignment
  - Hip angle
  - Knee angle
  - Ankle proxy
- 单一“基于 Pose 的 AI 建议”卡片。
- Reviewer A / Reviewer B 人工评分。
- adjudication / consistency snapshot。
- JSON / CSV dataset export。
- local mock ingest readiness workflow。
- 中英文 UI 切换；7 个 FMS movement 名称保留英文。

## 8. 当前测试路径

推荐 Ronnie 首次测试：

1. 打开 `http://localhost:5173/`。
2. 切到中文。
3. `Deep Squat Demo` 选择 `Sample-1 mixed views`。
4. 点击 `加载 Demo`。
5. 点击 `开始分析`。
6. 确认任务显示 `succeeded (100%)`。
7. 确认播放区显示 `显示骨骼`，骨骼 overlay 与视频基本对齐。
8. 确认 `分段`列表显示 7 段和 Timing QA。
9. 点击 `预览建议 timing`，确认只是预览，不修改 Segment metadata。
10. 点击 `应用建议 timing`，再点击 `保存 Segment 元数据`。
11. 查看 Deep Squat Features。
12. 查看右侧“基于 Pose 的 AI 建议”。
13. 保存 Reviewer A / Reviewer B。
14. 测试 `检查准备状态`、`导出 JSON`、`导出 CSV`。

## 9. 当前本地 Git checkpoint

移交时本地 Git 应至少包含这些 checkpoint：

```text
99a468f Rename pose overlay toggle to skeleton
1ecf65c Unify pose-based AI suggestion card
38b6b4a Merge segment timing QA into segment list
794a9ae Move timing preview control to player
46317e3 Initial AI-FMS V1.5 checkpoint
```

如果 Ronnie 电脑上运行：

```bash
git log --oneline -5
```

能看到类似记录，说明本地 Git 历史也移交成功。

## 10. 下一步建议

Ronnie 接手后的合理下一步不是重做 UI，而是小步增强：

1. 跑完整 reviewer/data export 闭环。
2. 检查 JSON/CSV export 是否适合做 dataset package。
3. 整理 demo video script 和 project page copy。
4. 决定是否把项目推到 private GitHub。
5. 再考虑扩展其他 FMS movements。

优先级建议：

- 先稳住 Deep Squat flagship demo。
- 再完善 dataset/export 叙事。
- 最后扩展其他动作。

## 11. 注意事项

- 不要把系统描述成 medical diagnosis。
- 不要把 AI 建议说成最终结论。
- Deep Squat 是当前 AI pipeline 的重点，其他 6 个动作目前主要是
  annotation workflow 框架。
- 修改代码后运行：

```bash
npm run check
```

- 改动后用 Git 小步提交，方便回滚。
