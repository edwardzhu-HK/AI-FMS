# ASLR 侧别与峰值证据质量审计

日期：2026-08-09
状态：Phase I G3 方法审计完成；不修改冻结 Round A baseline

## 结论

ASLR 当前最需要解决的不是“把评分阈值调得更接近人工”，而是先确认 pose 是否在正确的
时间窗里持续跟踪了正确的人、正确的腿和正确的抬腿峰值。

对 canonical pilot 的全部 17 条 ASLR 记录运行 label-free 审计后，得到 7 个视频、
16 个独立证据窗口；其中 11 个 `good`、2 个 `watch`、3 个 `limited`。一条窗口因不同
ingest lineage 对应两条 rep 记录，因此不能重复当作独立证据。

| 质量层    | 独立窗口 | 使用规则                                        |
| --------- | -------: | ----------------------------------------------- |
| `good`    |       11 | 可进入当前 pose evidence 描述                   |
| `watch`   |        2 | 峰值可用，但侧别稳定性需人工复核                |
| `limited` |        3 | 不进入自动总分比较，保留为 pose/subject QA 案例 |

## 方法边界

审计只读取匿名 segment 时间窗、rep-level side metadata 和脱敏后的 MediaPipe pose
landmarks。Source filename、历史分数、legacy AI 和 reviewer 结果不进入质量判定。
Segment side 只用于稳定证据形成后的 agreement 检查，不用于决定 pose 的活动侧。

每帧分别计算左右脚踝相对髋部的抬升量，在可见度门槛内选取更强的一侧，再检查峰值附近
连续强信号的数量、dominant side 比例和左右切换率。`visibility` 只说明 landmark 检测
置信度，不能证明模型一直跟踪的是目标人物，也不能替代 trajectory 稳定性。

## 重点发现

### 1. `rep_6830e0689f85`：证据不足，不宜自动修正侧别

- 片段中 137 帧有可见下肢 landmark，但峰值附近只有 3 个连续强信号帧。
- Pose dominant side 为 right，但比例仅 0.667，关键帧左右切换率为 0.500。
- Canonical side 为 left，两位 blind reviewers 认为活动侧为 right。

画面本身可供人观察，但教学者与受试者同时出现且有重叠。现有 pose extraction 使用
single-pose `first` selection，没有 subject ROI；因此较高的平均 visibility 仍可能来自
错误主体或不连续轨迹。结论应是 `limited`，不能自动用 pose 覆盖人工 side metadata。

### 2. `rep_8333424d5d28`：峰值存在，但单帧几何不稳定

- Peak 在 9.426 秒，右腿抬升 proxy 为 0.3026。
- 41 个强信号帧中 dominant right 比例为 0.829，切换率为 0.050，标记为 `watch`。
- 相邻时刻的 stationary-knee angle 波动明显，说明单帧 knee geometry 容易受遮挡和
  landmark jitter 影响。

这里不应据一帧 knee angle 调整总分规则。下一版应在 peak window 内使用 robust
aggregation，并保留 reviewer 对杆侧和协议条件的判断。

### 3. 额外发现

ASLR `4 reps score 2` 来源视频的前两个片段也出现较高侧别切换率，形成两个 `limited`
窗口。这说明审计不只是解释 Round A 已知差异，也发现了全 17-rep pool 中原先未被人工
分歧触发的 pose 稳定性问题。

## 决策

1. 不修改冻结 AI baseline，不依据 Round A 结果移动 ASLR thresholds。
2. `limited` 窗口不进入后续自动总分比较；`watch` 窗口保留并要求人工复核。
3. 对多人教学视频优先用 multi-pose、subject-aware selection 或显式 ROI 重新提取。
4. 将 stationary-leg geometry 从单一峰值帧升级为 peak-window robust aggregation。
5. 新算法结果作为独立 sensitivity，不能覆盖 Round A 原始 feature row。

## 复现

```bash
npm run study:aslr:side-peak-audit
cd research/pilot-v1/generated/aslr-side-peak-audit
shasum -c SHA256SUMS
```

私有生成目录包含 JSON、CSV、逐 rep Markdown 报告和 `SHA256SUMS`。生成物不进入 Git；
本报告只保留聚合结论、稳定 ID 和研究边界。
