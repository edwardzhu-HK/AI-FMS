# Ronnie GitHub Repository Transfer Checklist

状态：WAITING FOR RONNIE ACCOUNT

更新日期：2026-08-17

## 1. 决策

AI-FMS 最终应由 Ronnie 的 GitHub 账户拥有。推荐使用 GitHub 自带的 repository
transfer，而不是创建新仓库后重新上传代码。这样可以保留 commit history、branches、
issues、pull requests、releases 和现有链接重定向。

当前源仓库：`https://github.com/edwardzhu-HK/AI-FMS`

当前状态：

- Visibility：`PRIVATE`
- Default branch：`main`
- 当前 closeout branch：`codex/rotary-final-ai-benchmark`
- Git 当前跟踪 338 个文件；不跟踪 `.mp4` 或 `.sqlite`
- 两张真实视频界面截图已跟踪，但仍需 frame-level rights clearance

## 2. Ronnie 需要先完成

- [ ] 注册 GitHub personal account。
- [ ] 验证邮箱并保存 recovery information；建议启用 two-factor authentication。
- [ ] 把准确的 GitHub username 发给项目维护者。
- [ ] 不要提前创建名为 `AI-FMS` 的 repository。
- [ ] 不要在 Ronnie 账户下 fork 当前 `AI-FMS`；目标账户不能有同名 repository 或同一
      fork network 中的 fork。
- [ ] 确认接收后仓库继续保持 PRIVATE，直到 public-package audit 完成。
- [ ] transfer 发出后在 24 小时内查看邮箱并接受；超时后邀请会失效。

## 3. Transfer 前的项目门槛

- [ ] 工作树 clean，所有 closeout 修改已 commit 并 push。
- [ ] 决定 `codex/rotary-final-ai-benchmark` 如何进入 `main`，并完成最终 merge review。
- [ ] `npm run check` 全部通过。
- [ ] `npm run release:phase-i:manifest` 为 17/17，expected evidence matched。
- [ ] 检查 Git history 和当前 tree 中没有 raw videos、SQLite、review exports、secrets、
      local absolute paths 或 private reviewer comments。
- [ ] 对真实人物界面截图完成 rights/consent 决定；不能公开时在 public release 前替换。
- [ ] 创建明确的 Phase I release tag，并记录 commit SHA、PDF checksum 与 release notes。
- [ ] 记录当前 remote、visibility、default branch、branches、tags 和 collaborators。
- [ ] 确认 Ronnie 的账户套餐不会让需要的 private-repository 功能丢失。

## 4. GitHub 网页操作

由当前 repository admin 执行：

1. 打开 repository 的 `Settings`。
2. 在 `Danger Zone` 选择 `Transfer`。
3. 输入 Ronnie 的准确 username 作为 new owner。
4. 按 GitHub 提示输入 repository name 确认。
5. Ronnie 在确认邮件中接受 transfer。

GitHub 官方说明：

- https://docs.github.com/en/repositories/creating-and-managing-repositories/transferring-a-repository
- https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/repository-access-and-collaboration/permission-levels-for-a-personal-account-repository

根据当前官方规则，个人账户之间 transfer 后，原 owner 和现有 collaborators 会成为
新仓库 collaborators。旧 repository URL 和 Git operations 通常会重定向，但仍应主动
更新本地 remote。不要在旧 owner/name 位置重新创建同名 repository，否则重定向可能
被永久取消。

## 5. Transfer 后验证

- [ ] Ronnie 能打开 `Settings`，确认自己是 owner。
- [ ] 当前维护者仍为 collaborator，具备约定的写入权限。
- [ ] Repository visibility 仍为预期值。
- [ ] `main`、closeout branch、tags、issues、PRs 和 releases 均存在。
- [ ] Branch protection、Actions、Pages、secrets、webhooks 和 deploy keys 按需要复核。
- [ ] 在所有本地 clone 更新 remote：

```bash
git remote set-url origin https://github.com/<RONNIE_USERNAME>/AI-FMS.git
git remote -v
git fetch --all --prune
```

- [ ] 更新 README、project page、论文/data availability、demo description 和申请材料中的
      GitHub URL。
- [ ] 从一个新的临时目录执行 clean clone、install、`npm run check` 和核心 demo smoke。
- [ ] 保存 transfer 完成日期、新 URL、最终 commit 和 release tag。

## 6. 不采用的做法

- 不通过 ZIP 或 Finder 复制建立“无历史新仓库”。
- 不删除当前仓库后再重新上传。
- 不在 transfer 前把 private research archive 推入 Git。
- 不为了让 Ronnie 看起来拥有全部 commits 而修改或伪造历史 author metadata。
- 不在 public rights audit 前把 repository 改成 PUBLIC。

## 7. 完成记录

待 transfer 后填写：

| 字段                      | 值      |
| ------------------------- | ------- |
| Ronnie username           | Pending |
| New repository URL        | Pending |
| Transfer requested at     | Pending |
| Transfer accepted at      | Pending |
| Final pre-transfer commit | Pending |
| Phase I release tag       | Pending |
| Post-transfer clean check | Pending |
