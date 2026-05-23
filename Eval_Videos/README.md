# Eval Videos (FMS 7 Actions)

每个动作使用独立目录，目录内至少包含:

- `manifest.csv`
- 视频文件（文件名需与 manifest 一致）

目录与动作映射:

1. `01-Deep Squat` -> `deep_squat`
2. `02-Hurdle Step` -> `hurdle_step`
3. `03-In-Line Lunge` -> `in_line_lunge`
4. `04-Shoulder Mobility` -> `shoulder_mobility`
5. `05-Active Straight Leg Raise` -> `active_straight_leg_raise`
6. `06-Trunk Stability Push-Up` -> `trunk_stability_push_up`
7. `07-Rotary Stability` -> `rotary_stability`

manifest 列定义:

- `file_name`: 视频文件名
- `start_second`, `end_second`: 分析区间（在这个区间内识别动作，不强制作为首尾 segment 边界）
- `expected_reps`: 预期动作次数（建议填写，减少过切）
- `notes`: 机位/评分提示（例如 `前三个正面，后四个侧面；前六个3分，最后一个2分`）
