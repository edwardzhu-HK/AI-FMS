import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  buildRotaryStabilityFrameFeatures,
  evaluateRotaryStabilitySegmentsTiming,
} from "../src/lib/rotary-stability-timing.js";

function landmark(name, x, y, visibility = 0.95) {
  return {
    name,
    x,
    y,
    z: 0,
    visibility,
    presence: 0.98,
  };
}

function frame(second, reach = 0.04) {
  return {
    second,
    timestampMs: second * 1000,
    poses: [
      {
        landmarks: [
          landmark("left_shoulder", 0.42, 0.32),
          landmark("right_shoulder", 0.58, 0.32),
          landmark("left_hip", 0.43, 0.58),
          landmark("right_hip", 0.57, 0.58),
          landmark("left_wrist", 0.42 - reach, 0.33),
          landmark("right_wrist", 0.58 + reach * 0.15, 0.34),
          landmark("left_ankle", 0.43 - reach * 0.1, 0.72),
          landmark("right_ankle", 0.57 + reach, 0.72),
        ],
      },
    ],
  };
}

function createPayload() {
  return {
    frames: [frame(0, 0.04), frame(1, 0.2), frame(2, 0.06)],
  };
}

function loadRotaryReviewPayload() {
  return JSON.parse(
    fs.readFileSync(
      "Eval_Videos/Sample videos/7-rotatory stability/pose/rotary-review.pose.json",
      "utf8",
    ),
  );
}

function loadRotaryInstructionsPayload() {
  return JSON.parse(
    fs.readFileSync(
      "Eval_Videos/Sample videos/7-rotatory stability/pose/rotary-stability-test-instructions.pose.json",
      "utf8",
    ),
  );
}

function loadRotaryScoreOnePayload() {
  return JSON.parse(
    fs.readFileSync(
      "Eval_Videos/Sample videos/7-rotatory stability/pose/videoplayback-22.pose.json",
      "utf8",
    ),
  );
}

test("buildRotaryStabilityFrameFeatures extracts rotary reach evidence", () => {
  const features = buildRotaryStabilityFrameFeatures(createPayload());

  assert.equal(features.length, 3);
  assert.equal(features[1].side, "right");
  assert.equal(features[1].pattern, "left_arm_right_leg");
  assert.ok(features[1].rotaryReachScore > features[0].rotaryReachScore);
});

test("evaluateRotaryStabilitySegmentsTiming detects best rotary frame", () => {
  const report = evaluateRotaryStabilitySegmentsTiming({
    posePayload: createPayload(),
    segments: [
      {
        segmentId: "seg_1",
        repetitionIndex: 1,
        actionType: "rotary_stability",
        cameraView: "front",
        startSecond: 0,
        endSecond: 2,
      },
    ],
    options: {
      minRotaryFrames: 1,
    },
  });

  assert.equal(report.status, "good");
  assert.equal(report.summary.detectedCycles, 1);
  assert.equal(report.items[0].cycle.bestReachSecond, 1);
  assert.equal(report.items[0].cycle.side, "right");
});

test("evaluateRotaryStabilitySegmentsTiming reports insufficient pose", () => {
  const report = evaluateRotaryStabilitySegmentsTiming({
    posePayload: { frames: [] },
    segments: [
      {
        segmentId: "seg_1",
        repetitionIndex: 1,
        actionType: "rotary_stability",
        cameraView: "front",
        startSecond: 0,
        endSecond: 2,
      },
    ],
  });

  assert.equal(report.status, "needs_adjustment");
  assert.equal(report.items[0].status, "insufficient_pose");
  assert.equal(report.items[0].issues[0].code, "insufficient_rotary_frames");
});

test(
  "evaluateRotaryStabilitySegmentsTiming keeps rotary review demo to full FMS cycles",
  {
    skip: fs.existsSync(
      "Eval_Videos/Sample videos/7-rotatory stability/pose/rotary-review.pose.json",
    )
      ? false
      : "Requires private research pose data",
  },
  () => {
    const posePayload = loadRotaryReviewPayload();
    const report = evaluateRotaryStabilitySegmentsTiming({
      posePayload,
      segments: [
        {
          segmentId: "seg_1",
          repetitionIndex: 1,
          actionType: "rotary_stability",
          cameraView: "side",
          side: "unknown",
          startSecond: 46,
          endSecond: 80.5,
        },
        {
          segmentId: "seg_2",
          repetitionIndex: 2,
          actionType: "rotary_stability",
          cameraView: "side",
          side: "unknown",
          startSecond: 77.5,
          endSecond: 112,
        },
      ],
    });

    assert.equal(report.status, "good");
    assert.equal(report.summary.detectedCycles, 2);
    assert.deepEqual(
      report.cycles.map((cycle) => [
        cycle.side,
        cycle.startSecond,
        cycle.firstTouchSecond,
        cycle.bestReachSecond,
        cycle.secondTouchSecond,
        cycle.endSecond,
        cycle.timingSource,
      ]),
      [
        [
          "unknown",
          48.0,
          50.0,
          56.0,
          62.0,
          64.5,
          "curated_fms_full_cycle_timing",
        ],
        [
          "unknown",
          98.0,
          99.5,
          102.5,
          106.0,
          110.5,
          "curated_fms_full_cycle_timing",
        ],
      ],
    );
    assert.ok(report.items.every((item) => item.metrics.coverageRatio >= 0.99));
  },
);

test(
  "evaluateRotaryStabilitySegmentsTiming keeps rotary instructions demo to twelve score-3 full cycles",
  {
    skip: !fs.existsSync(
      "Eval_Videos/Sample videos/7-rotatory stability/pose/rotary-stability-test-instructions.pose.json",
    ),
  },
  () => {
    const posePayload = loadRotaryInstructionsPayload();
    const cycleWindows = [
      [5.8, 15.0],
      [17.8, 25.0],
      [31.8, 42.0],
      [41.8, 50.0],
      [49.8, 56.0],
      [55.8, 62.5],
      [64.8, 76.9],
      [79.8, 88.8],
      [93.3, 102.4],
      [102.3, 110.0],
      [109.8, 116.9],
      [116.8, 124.0],
    ];
    const report = evaluateRotaryStabilitySegmentsTiming({
      posePayload,
      segments: cycleWindows.map(([startSecond, endSecond], index) => ({
        segmentId: `seg_${index + 1}`,
        repetitionIndex: index + 1,
        actionType: "rotary_stability",
        cameraView: [1, 2, 7, 8].includes(index + 1) ? "side" : "front",
        side: "unknown",
        startSecond,
        endSecond,
      })),
    });

    assert.equal(report.status, "good");
    assert.equal(report.summary.detectedCycles, 12);
    assert.deepEqual(
      report.cycles.map((cycle) => [
        cycle.side,
        cycle.startSecond,
        cycle.firstTouchSecond,
        cycle.bestReachSecond,
        cycle.secondTouchSecond,
        cycle.endSecond,
        cycle.manualScoreOverride,
        cycle.manualScoreSource,
      ]),
      [
        ["unknown", 6.0, 8.7, 10.8, 12.2, 14.8, 3, "curated_visual_fms_review"],
        [
          "unknown",
          18.0,
          19.4,
          21.0,
          22.4,
          24.8,
          3,
          "curated_visual_fms_review",
        ],
        [
          "unknown",
          32.0,
          36.2,
          38.2,
          40.0,
          41.8,
          3,
          "curated_visual_fms_review",
        ],
        [
          "unknown",
          42.0,
          44.5,
          46.0,
          47.2,
          49.8,
          3,
          "curated_visual_fms_review",
        ],
        [
          "unknown",
          50.0,
          52.0,
          53.0,
          54.0,
          55.8,
          3,
          "curated_visual_fms_review",
        ],
        [
          "unknown",
          56.0,
          58.2,
          59.5,
          60.5,
          62.3,
          3,
          "curated_visual_fms_review",
        ],
        [
          "unknown",
          65.0,
          70.0,
          72.2,
          74.0,
          76.7,
          3,
          "curated_visual_fms_review",
        ],
        [
          "unknown",
          80.0,
          81.5,
          83.0,
          84.8,
          88.6,
          3,
          "curated_visual_fms_review",
        ],
        [
          "unknown",
          93.5,
          97.5,
          99.2,
          100.5,
          102.2,
          3,
          "curated_visual_fms_review",
        ],
        [
          "unknown",
          102.5,
          106.0,
          107.0,
          108.2,
          109.8,
          3,
          "curated_visual_fms_review",
        ],
        [
          "unknown",
          110.0,
          112.5,
          114.0,
          115.0,
          116.7,
          3,
          "curated_visual_fms_review",
        ],
        [
          "unknown",
          117.0,
          120.0,
          121.0,
          122.2,
          124.0,
          3,
          "curated_visual_fms_review",
        ],
      ],
    );
  },
);

test(
  "evaluateRotaryStabilitySegmentsTiming keeps rotary score-1 demo to four FMS full cycles",
  {
    skip: !fs.existsSync(
      "Eval_Videos/Sample videos/7-rotatory stability/pose/videoplayback-22.pose.json",
    ),
  },
  () => {
    const posePayload = loadRotaryScoreOnePayload();
    const cycleWindows = [
      [59.3, 66.2],
      [76.3, 86.2],
      [91.3, 106.2],
      [107.8, 116.7],
    ];
    const report = evaluateRotaryStabilitySegmentsTiming({
      posePayload,
      segments: cycleWindows.map(([startSecond, endSecond], index) => ({
        segmentId: `seg_${index + 1}`,
        repetitionIndex: index + 1,
        actionType: "rotary_stability",
        cameraView: index < 3 ? "side" : "front",
        side: "unknown",
        startSecond,
        endSecond,
      })),
    });

    assert.equal(report.status, "good");
    assert.equal(report.summary.detectedCycles, 4);
    assert.deepEqual(
      report.cycles.map((cycle) => [
        cycle.side,
        cycle.startSecond,
        cycle.firstTouchSecond,
        cycle.bestReachSecond,
        cycle.secondTouchSecond,
        cycle.endSecond,
        cycle.manualScoreOverride,
        cycle.manualScoreSource,
      ]),
      [
        [
          "unknown",
          59.5,
          60.5,
          62.5,
          63.5,
          66.0,
          1,
          "curated_visual_fms_review",
        ],
        [
          "unknown",
          76.5,
          77.0,
          78.2,
          79.8,
          86.0,
          1,
          "curated_visual_fms_review",
        ],
        [
          "unknown",
          91.5,
          96.5,
          100.0,
          101.5,
          106.0,
          1,
          "curated_visual_fms_review",
        ],
        [
          "unknown",
          108.0,
          109.5,
          112.0,
          113.5,
          116.5,
          1,
          "curated_visual_fms_review",
        ],
      ],
    );
    assert.ok(
      report.cycles.every((cycle) =>
        cycle.manualScoreReason.includes("FMS manual score-1 criteria"),
      ),
    );
  },
);
