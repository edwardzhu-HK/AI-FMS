#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

.venv/bin/python scripts/extract-pose-landmarks.py \
  --video "Eval_Videos/Sample videos/2-Hurdle step/6reps each side, total 12 reps, score 3 for both sides.mp4" \
  --model models/pose_landmarker_lite.task \
  --output "Eval_Videos/Sample videos/2-Hurdle step/pose/6reps-each-side-total-12-reps-score-3-both-sides.pose.json" \
  --video-id hurdle-12reps-score-3-both-sides \
  --action-type hurdle_step \
  --start-second 0 \
  --end-second 127 \
  --target-fps 10 \
  --delegate CPU \
  --num-poses 2 \
  --primary-pose-selection left
