# AI-FMS Phase I Application Evidence Table

本表用于简历、项目页、技术报告和面试的 claim control。任何数字变化必须先更新生成证据，
再更新本表；不得从旧草案复制数字。

| 可用主张                 | 当前证据                                                | 建议表述                                                                    | 禁止扩展                                             |
| ------------------------ | ------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------- |
| 建成可运行平台           | Workbench、Study Mode、Video Manager；3 个 Vite entries | Built a human-in-the-loop FMS video annotation and research platform        | 不说 deployed clinical product                       |
| 支持 7 个动作 workflow   | 7-action adapters、UI 和 smoke path                     | Supports annotation workflows for all seven FMS movements                   | 不说 7 个动作都已完成同等 AI 验证                    |
| 四动作 pilot             | 28 videos、110 reps、29 pose references                 | Reconstructed a traceable four-movement pilot with 110 repetitions          | 不说 110 participants                                |
| 数据质量门               | 97 blindable、66 feature-ready、58 双门槛               | Applied visual, pose, timing, and metadata quality gates                    | 不把 limited rows 静默删除                           |
| 正式盲审                 | 32 reps；四动作各 8；两位 reviewer                      | Designed and completed Round A of a balanced blinded reviewer study         | 不说 simple random sample                            |
| 人工一致性               | Status 31/32；共同评分 26/26 exact；kappa 1.0           | The two reviewers assigned identical scores to all 26 jointly scorable reps | 不外推为临床或跨 reviewer population reliability     |
| 定量同分差异             | Deep Squat 同分 pair 与 6 个可比 pose features          | Identical FMS scores can contain different quantitative movement profiles   | 不命名为已验证障碍亚型                               |
| AI baseline              | 9/16 exact、14/16 within one、MAE 0.5625                | Current rules provide partial reviewer support but are not a replacement    | 不称 56.3% accuracy；不是 held-out                   |
| Protocol sensitivity     | 11/17 exact、15/17 within one                           | Correct protocol metadata improved coverage in a post-audit sensitivity     | 不包装成模型训练提升                                 |
| Error analysis           | 9 条逐帧 audit                                          | Identified protocol, pose/timing, view, and trajectory limitations          | 不说所有错误已解决                                   |
| ASLR 证据质量门          | 16 独立窗口：11 good、2 watch、3 limited                | Added a label-free gate for pose-side and peak reliability                  | 不把 high visibility 当作正确主体跟踪证明            |
| ASLR subject sensitivity | 原 3 limited 经 ROI 后为 1 good、2 watch、0 limited     | Re-extracted target-subject windows without changing the scoring thresholds | 独立 sensitivity，不回写冻结 AI 或声称 accuracy 提升 |
| 工程质量                 | 317 tests、lint、format、3-entry build                  | Maintained automated tests and reproducible data/report scripts             | 不把 test count 当研究 validity                      |
| 数据治理                 | Stable IDs、SHA-256、signed exports、SQLite idempotency | Built traceable, checksum-verified research data flows                      | 不说 production multi-user database                  |
| 伦理边界                 | Dataset card、methods/limitations、rights/privacy gate  | Designed the prototype around human oversight and explicit limitations      | 不说 medical diagnosis、pain AI 或 injury prediction |

## 最稳妥的核心句

> AI-FMS does not replace the FMS score or the human reviewer. It adds
> quantitative, traceable movement evidence that can explain how two
> repetitions with the same ordinal score were completed differently.

## 数字口径

- `110`：完整 canonical repetitions。
- `66`：通过 pose/timing feature quality gate。
- `32`：正式双轮 study 样本。
- `26`：Round A 两位 reviewer 均可评分且同分。
- `16`：冻结 AI baseline 中可生成并比较总分。
- `17`：补入 audited Deep Squat protocol metadata 后的 sensitivity 可比较数。

这些数字回答不同问题，不能互相替代，也不能把 32-rep audit 描述为对 110 条 weak
labels 的统计证明。

## 公开前检查

- [ ] Round B metrics 已冻结并引用正确 fingerprint。
- [ ] Demo 画面通过 source-rights、身份和隐私复核。
- [x] 当前 Round A 文案通过 expected-evidence 与 stale-number 自动预检。
- [ ] Round B 后再次运行最终 stale-number scan。
- [x] 当前受控文档不含本地绝对路径。
- [ ] 人工确认最终公开包不含 reviewer raw comments、raw pose 或 SQLite。
- [x] 明确写出 educational/research prototype 与 no-diagnosis boundary。
