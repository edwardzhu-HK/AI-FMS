# AI-FMS 公开展示与 IUI 材料交付记录

日期：2026-10-03。

## 实际完成状态

| 事项                   | 状态               | 入口或证据                                       |
| ---------------------- | ------------------ | ------------------------------------------------ |
| 作者审阅和 Zenodo 发表 | 已完成             | https://zenodo.org/records/23118144              |
| 公开展示页             | 已部署             | https://edwardzhu-hk.github.io/AI-FMS/           |
| 系统演示与字幕         | 已公开             | 展示页播放器、MP4、英文 SRT/VTT 和 transcript    |
| OpenAI Community 文章  | 已备齐，未发帖     | Markdown 和七页 Word；等待浩然账号登录           |
| IUI 论文               | 已备齐，未投稿     | ACM 单栏 Word/PDF；四页，含参考文献              |
| IUI 视频               | 已备齐，未上传 PCS | 155.871 秒，1080p、30 fps、H.264/AAC；无烧录字幕 |
| PCS 表单               | 待账号登录         | 未创建 submission ID；到场和费用承诺待本人确认   |

## 展示页与视频

页面复用既有项目文案和授权截图，托管在原公开 GitHub 仓库的 Pages。
提供七动作工作流、四动作 Phase I 研究、功能和研究边界、作者背景、Zenodo 与代码链接。
这里是录播展示入口；可操作工作台仍在本地运行，研究媒体和数据保持私有。

系统视频从既有无字幕、无音乐的干净片段重新剪接，使用原英文旁白。
已删除旧剪辑转场导致的极短重复字幕，最终 25 条字幕有序且不重叠。
没有重写或覆盖原 4:30 申请影片。

- 视频：`docs/showcase/media/AI-FMS_System_Demo.mp4`。
- 字幕：同目录 `.en.srt` 和 `.en.vtt`。
- 大小：18,788,621 bytes。
- SHA-256：`d55013c3cb2b0a3164c4c25933da48e54866d851ae6dce54935b6154b31acbd2`。
- 发布提交：`2682e90`。
- GitHub Pages 部署：https://github.com/edwardzhu-HK/AI-FMS/actions/runs/37115245064 ，success。
- 页面、CSS、文字稿、两张图片、MP4、SRT、VTT 匿名请求全部 HTTP 200；公开媒体哈希与本地一致。
- 浏览器已实际播放，英文字幕可开启；390 px 手机宽度无横向溢出。

## 论文与发布材料

IUI 作者统一为 Haoran ZHU，学校和申请邮箱已填写，未提供 ORCID 因而省略。
保留两位 reviewer 的研究事实，只对 Haoran 说明 FMS 资质，不推定另一人资历。
无致谢、无外部资金、无利益冲突；GenAI disclosure 独立置于参考文献前。
引用 Zenodo v1.0，明确与完整预印本的关系。总计四页 PDF，可提取文字、带标签。
官方模板字体应使用渲染器默认 bundled fonts；不要给英文 ACM 模板套用仅含 macOS 字体的中文 fontconfig。

Community 文章已补齐 Zenodo、GitHub 和展示页链接。独立 `Post.forum-ready.md` 将本地图片路径替换为公开图像 URL，适合登录后粘贴。

两个 Word 文件均已渲染并逐页检查；可访问性自动检查均为 high/medium/low 0 项。
原研究工作区 `npm run check` 通过，341 tests、0 failures；发布的 Zenodo PDF SHA-256 保持不变。

## 尚需完成的外部操作

1. 以浩然申请邮箱登录 OpenAI Developer Community。发布完成后保存真实文章 URL；现在没有。
2. 登录 PCS；查看 IUI 2027 Demos track，填表和上传文件。
3. 本人确认录用后的赫尔辛基到场及注册／差旅／可能的出版费用安排，再完成所需声明和最终提交。
4. 保存 PCS submission ID 与回执后，才能表述“已投稿”。

当前不把上述账号或提交步骤记为完成，也不把准备好的 IUI 材料表述为录用成果。
