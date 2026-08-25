# Zenodo 发布操作指引

## 发布前

1. 完成根目录 `00-release-control/author-rights-and-claims-checklist.md`。
2. Ronnie 逐句确认英文稿，所有作者确认作者顺序、单位、ORCID、贡献和联系方式。
3. 确认每张图和每段视频的公开权利。不要上传原始受试者视频、数据库、pose JSON、reviewer comments 或本机路径清单。
4. 如果可能申请专利，先完成专利判断，再公开技术细节。

## 建立草稿并预留 DOI

1. 登录 [Zenodo](https://zenodo.org/)。
2. 点击页面顶部 `+`，选择 `New upload`。
3. 在 DOI 项选择“没有已有 DOI”，点击 `Get a DOI now!`。
4. 保存预留 DOI。不要删除草稿，删除会使该预留 DOI 失效。
5. 把 DOI 填入英文稿首页，重新生成最终 PDF 和校验值。

## 填写资料

1. Resource type 选择 `Publication`，子类型选择 `Preprint`。
2. 标题、摘要、关键词、作者顺序直接使用 `zenodo-metadata-draft.md`。
3. Creators 只填真正作者；导师、reviewer、contact 等使用 Contributors，并选择合适角色。
4. 默认建议 `CC BY 4.0`，但必须先通过图像和视频版权确认。
5. Files visibility 选择 Public；如果权利还没解决，只保存 draft，不要靠 Restricted 来掩盖未完成的权利判断。

## 上传文件

主文件：

- `AI-FMS_System_Development_Phase_I_Evaluation_Preprint.pdf`

建议同时上传：

- DOCX；
- Markdown source；
- release `README.md`；
- `SHA256SUMS`；
- 经过许可的补充图或视频。

文件超过 20 个时再打 ZIP；ZIP 内不要包含 `.DS_Store`、`__MACOSX` 或私密文件。PDF 设置为默认预览文件。

## 发布检查

1. 点击 `Save draft`，解决所有 metadata 错误。
2. 点击 `Preview`，逐项检查作者姓名、顺序、摘要、许可、日期和文件。
3. 下载一次将要发布的 PDF，核对首页 DOI 和最终校验值。
4. 确认首页包含 `Preprint. Not peer reviewed.`。
5. 点击 `Publish`。Zenodo 发布后会正式注册 DOI。

## 发布后

1. 把 DOI 写回项目 README、OpenAI Community 文章和 ACM IUI related work。
2. 小范围 metadata 可直接修改；显著文件更新使用 `New version`，不要静默替换研究结果。
3. 保存 Zenodo record URL、版本 DOI、concept DOI、发布日期和最终文件校验值。

官方操作依据：

- [Create new upload](https://help.zenodo.org/docs/deposit/create-new-upload/)
- [Reserve DOI](https://help.zenodo.org/docs/deposit/describe-records/reserve-doi/)
- [Licenses and rights](https://help.zenodo.org/docs/deposit/describe-records/licenses/)
- [Manage versions](https://help.zenodo.org/docs/deposit/manage-versions/)
