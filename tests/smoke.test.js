import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

test("config and operational scripts parse without syntax errors", () => {
  const files = [
    "vite.config.js",
    "eslint.config.mjs",
    "server/api-stub.js",
    "scripts/inventory-sample-videos.js",
    "scripts/validate-sample-manifests.js",
  ];
  for (const filePath of files) {
    assert.doesNotThrow(() =>
      execFileSync("node", ["--check", filePath], {
        cwd: process.cwd(),
      }),
    );
  }
});

test("required files exist", () => {
  const requiredFiles = [
    ".env.example",
    "index.html",
    "src/main.jsx",
    "src/App.jsx",
    "src/styles.css",
    "src/api/calibrationApi.js",
    "src/api/mockCalibrationApi.js",
    "src/api/realCalibrationApi.js",
    "src/components/KeypointOverlay.jsx",
    "src/components/DeepSquatFeatureSnapshot.jsx",
    "src/components/SegmentTimingReport.jsx",
    "src/lib/adjudication.js",
    "src/lib/consistency.js",
    "src/lib/segmenting.js",
    "src/lib/ai-scoring.js",
    "src/lib/dataset-csv.js",
    "src/lib/dataset-package.js",
    "src/lib/export-quality.js",
    "src/lib/pose-active-periods.js",
    "src/lib/aslr-features.js",
    "src/lib/deep-squat-features.js",
    "src/lib/deep-squat-suggestion.js",
    "src/lib/deep-squat-timing.js",
    "db/migrations/0001_v0_init.sql",
    "scripts/manifest-utils.js",
    "scripts/seed-stub-from-manifest.js",
    "scripts/generate-consistency-report.js",
    "scripts/inventory-sample-videos.js",
    "scripts/validate-manifest.js",
    "scripts/validate-sample-manifests.js",
    "scripts/extract-pose-landmarks.py",
    "scripts/download-pose-landmarker-model.py",
    "src/lib/pose-landmarks.js",
    "server/api-stub.js",
    "Eval_Videos/01-Deep Squat/Sample-1.mp4",
    "Eval_Videos/01-Deep Squat/front.mp4",
    "Eval_Videos/01-Deep Squat/side.mp4",
    "Eval_Videos/01-Deep Squat/pose/Sample-1.pose.json",
    "Eval_Videos/01-Deep Squat/pose/front.pose.json",
    "Eval_Videos/01-Deep Squat/pose/side.pose.json",
    "test-videos/manifest.template.csv",
    "docs/specs/v0.md",
    "docs/specs/pose_landmarks_schema.md",
    "docs/dataset_card_deep_squat_v1_5_draft.md",
    "docs/demo_dry_run_checklist_ai_fms_v1_5.md",
    "docs/testing_handoff_ai_fms_v1_5.md",
    "docs/sample_video_inventory.md",
    "docs/demo_walkthrough_script_ai_fms_v1_5.md",
    "docs/technical_report_outline_ai_fms_v1_5.md",
    "docs/application_package_notes_ai_fms_v1_5.md",
    "docs/project_page_copy_ai_fms_v1_5.md",
    "docs/backlog.md",
    "docs/process.md",
    "vite.config.js",
  ];
  for (const filePath of requiredFiles) {
    const exists = fs.existsSync(path.resolve(process.cwd(), filePath));
    assert.equal(exists, true, `${filePath} should exist`);
  }
});
