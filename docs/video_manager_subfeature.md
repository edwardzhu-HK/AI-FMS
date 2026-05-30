# Video Manager 子功能说明

## 定位

Video Manager 是 AI-FMS 主项目里的辅助子功能，不是独立产品。它服务于
FMS sample video 的发现、去重、候选下载和人工复核，帮助后续动作扩展、
dataset card、demo video 和 application package 准备更可靠的视频素材。

主界面左侧底部提供 `Video Manager` 入口。点击后打开独立页面
`/video-manager.html`，这样视频管理工作不会干扰 Workbench 里的 segment
annotation、pose overlay、AI suggestion、reviewer scoring 和 ingest 状态。

## 当前功能边界

- 按 7 个 FMS actions 展示本地视频库，包括已有 reference samples 和
  `Online Candidates` 下载候选。
- 通过本地 API 搜索在线视频候选，目前优先使用 official YouTube Data API。
- 对候选视频做标题、时长、动作相关性和本地重复线索的 recommendation ranking。
- 下载前必须由人确认，不自动绕过 source rights 或平台规则。
- 新下载视频先进入 `Eval_Videos/Online Candidates/`，不能直接写入 canonical
  movement manifest。
- 后续是否进入正式 manifest，需要人工确认 action type、side、reps、quality、
  score notes 和 rights status。

## 非目标

- Video Manager 不负责 FMS scoring，也不替代 Workbench 的人工复核流程。
- Video Manager 不直接生成最终 dataset label。
- Video Manager 不声称判断版权或授权状态，只记录 reviewer 已确认的信息。
- Video Manager 不应该修改 pose feature、AI scoring 或 reviewer schema 的核心逻辑。

## 本地运行

```bash
npm run api:video-manager
npm run dev
```

然后打开 `http://127.0.0.1:5173/video-manager.html`，或从主 Workbench 左侧底部
点击 `Video Manager`。

如果只想打开 manager 页面，也可以运行：

```bash
npm run dev:manager
```

## 后续开发注意事项

Video Manager 后续可以在单独对话里继续开发，但建议使用独立 branch 或
worktree，并尽量只改以下范围：

- `video-manager.html`
- `src/video-manager/`
- `server/video-manager-api.js`
- `scripts/online-video-candidates.js`
- `tests/video-manager-api.test.js`
- `tests/online-video-candidates.test.js`
- 与 Video Manager 入口或说明直接相关的 README/backlog/docs

如果后续需求需要改 Workbench 主流程、评分 schema、manifest schema 或导出结构，
应先回到 AI-FMS 主线讨论，避免两个开发方向互相覆盖。
