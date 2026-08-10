import assert from "node:assert/strict";
import test from "node:test";

import { getMovementAdapter } from "../src/lib/movement-adapters.js";
import { buildRotaryStabilityCycleEvidence } from "../src/lib/rotary-stability-cycle-evidence.js";
import { getRotaryStabilityExperimentalAdapter } from "../src/lib/rotary-stability-experimental-adapter.js";
import { buildRotaryStabilityExperimentalSuggestion } from "../src/lib/rotary-stability-suggestion.js";

function landmark(name, x, y, visibility = 0.96) {
  return { name, x, y, z: 0, visibility, presence: 0.99 };
}

const SETUP = {
  left_shoulder: [0.4, 0.35],
  right_shoulder: [0.6, 0.35],
  left_hip: [0.42, 0.55],
  right_hip: [0.58, 0.55],
  left_elbow: [0.4, 0.47],
  right_elbow: [0.6, 0.47],
  left_wrist: [0.4, 0.6],
  right_wrist: [0.6, 0.6],
  left_knee: [0.42, 0.7],
  right_knee: [0.58, 0.7],
  left_ankle: [0.42, 0.85],
  right_ankle: [0.58, 0.85],
};

const TOUCH = {
  ...SETUP,
  left_elbow: [0.42, 0.64],
  left_wrist: [0.43, 0.82],
  left_knee: [0.42, 0.82],
  left_ankle: [0.42, 0.85],
};

const EXTENSION = {
  ...SETUP,
  left_elbow: [0.4, 0.25],
  left_wrist: [0.4, 0.15],
  left_knee: [0.42, 0.75],
  left_ankle: [0.42, 0.95],
};

function interpolate(start, end, ratio) {
  return Object.fromEntries(
    Object.keys(start).map((name) => [
      name,
      [
        start[name][0] + (end[name][0] - start[name][0]) * ratio,
        start[name][1] + (end[name][1] - start[name][1]) * ratio,
      ],
    ]),
  );
}

function frame(second, points) {
  return {
    second,
    timestampMs: second * 1000,
    poses: [
      {
        landmarks: Object.entries(points).map(([name, [x, y]]) =>
          landmark(name, x, y),
        ),
      },
    ],
  };
}

function buildPosePayload({ delayedKnee = false, incomplete = false } = {}) {
  const frames = [];
  for (let index = 0; index <= 24; index += 1) {
    const second = index / 10;
    let points = SETUP;
    if (second >= 0.5 && second < 1) {
      const ratio = Math.min(1, (second - 0.5) / 0.3);
      points = interpolate(SETUP, TOUCH, ratio);
      if (delayedKnee && second < 0.7) {
        points = {
          ...points,
          left_knee: SETUP.left_knee,
          left_ankle: SETUP.left_ankle,
        };
      }
    } else if (second >= 1 && second < 1.4) {
      points = incomplete
        ? {
            ...EXTENSION,
            left_wrist: [0.4, 0.05],
            left_elbow: [0.38, 0.42],
            left_knee: [0.5, 0.7],
            left_ankle: [0.64, 0.82],
          }
        : EXTENSION;
    } else if (second >= 1.4 && second < 1.8) {
      points = TOUCH;
    } else if (second >= 1.8) {
      points = incomplete
        ? { ...SETUP, left_wrist: [0.22, 0.55], left_knee: [0.5, 0.62] }
        : SETUP;
    }
    frames.push(frame(second, points));
  }
  return { frames };
}

function timingReport(manualScoreOverride = null) {
  return {
    items: [
      {
        segmentId: "rotary_rep",
        repetitionIndex: 1,
        cameraView: "front",
        side: "left",
        currentStartSecond: 0,
        currentEndSecond: 2.4,
        cycle: {
          startSecond: 0,
          extensionSecond: 1,
          endSecond: 2.4,
          manualScoreOverride,
          manualScoreReason: "must not enter the AI rule",
        },
      },
    ],
  };
}

const SEGMENTS = [
  {
    segmentId: "rotary_rep",
    repetitionIndex: 1,
    actionType: "rotary_stability",
    cameraView: "front",
    side: "left",
    startSecond: 0,
    endSecond: 2.4,
    metadata: { painFlag: false, clearingTest: "negative" },
  },
];

function buildSuggestion(payload, options = {}) {
  const evidence = buildRotaryStabilityCycleEvidence({
    posePayload: payload,
    timingReport: timingReport(),
    segments: SEGMENTS,
    options: { minUsableFrames: 10, ...options },
  });
  return {
    evidence,
    suggestion: buildRotaryStabilityExperimentalSuggestion({
      cycleEvidenceReport: evidence,
    }),
  };
}

test("experimental Rotary adapter remains isolated from the default and Round B path", () => {
  const defaultAdapter = getMovementAdapter("rotary_stability");
  const experimentalAdapter = getRotaryStabilityExperimentalAdapter();

  assert.equal(defaultAdapter.buildSuggestionReport(), null);
  assert.equal(experimentalAdapter.exposedInDefaultWorkbench, false);
  assert.equal(experimentalAdapter.exposedInFrozenRoundB, false);
});

test("Rotary v1.1 proposes score 3 only with complete pose evidence and confirmed board alignment", () => {
  const { evidence } = buildSuggestion(buildPosePayload());
  const suggestion = buildRotaryStabilityExperimentalSuggestion({
    cycleEvidenceReport: evidence,
    protocolMetadataBySegment: {
      rotary_rep: { rotaryBoardAlignment: "confirmed" },
    },
  });

  assert.equal(evidence.items[0].status, "ok");
  assert.equal(evidence.items[0].criteria.firstAnkleTouch.status, "pass");
  assert.equal(evidence.items[0].criteria.secondAnkleTouch.status, "pass");
  assert.equal(evidence.items[0].criteria.elbowExtension.status, "pass");
  assert.equal(evidence.items[0].criteria.kneeExtension.status, "pass");
  assert.equal(suggestion.items[0].status, "suggested");
  assert.equal(suggestion.items[0].rawPoseScore, 3);
});

test("Rotary v1.1 conservatively caps a complete but non-simultaneous cycle at score 2", () => {
  const { evidence, suggestion } = buildSuggestion(
    buildPosePayload({ delayedKnee: true }),
  );

  assert.notEqual(evidence.items[0].criteria.simultaneousLift.status, "pass");
  assert.equal(suggestion.items[0].status, "suggested");
  assert.equal(suggestion.items[0].rawPoseScore, 2);
  assert.equal(
    suggestion.items[0].scoreSource,
    "pose_cycle_rule_conservative_cap",
  );
});

test("Rotary v1.1 maps explicit incomplete-cycle evidence to score 1", () => {
  const { evidence, suggestion } = buildSuggestion(
    buildPosePayload({ incomplete: true }),
  );

  assert.ok(
    Object.values(evidence.items[0].criteria).some(
      (criterion) => criterion.status === "fail",
    ),
  );
  assert.equal(suggestion.items[0].rawPoseScore, 1);
});

test("Rotary v1.1 does not read curated manual score overrides", () => {
  const posePayload = buildPosePayload({ incomplete: true });
  const scoreOneEvidence = buildRotaryStabilityCycleEvidence({
    posePayload,
    timingReport: timingReport(1),
    segments: SEGMENTS,
    options: { minUsableFrames: 10 },
  });
  const scoreThreeEvidence = buildRotaryStabilityCycleEvidence({
    posePayload,
    timingReport: timingReport(3),
    segments: SEGMENTS,
    options: { minUsableFrames: 10 },
  });

  assert.deepEqual(scoreOneEvidence, scoreThreeEvidence);
});

test("positive human clearing metadata sets final score 0 while preserving the pose raw score", () => {
  const { evidence } = buildSuggestion(buildPosePayload());
  const suggestion = buildRotaryStabilityExperimentalSuggestion({
    cycleEvidenceReport: evidence,
    protocolMetadataBySegment: {
      rotary_rep: {
        rotaryBoardAlignment: "confirmed",
        painFlag: true,
      },
    },
  });

  assert.equal(suggestion.items[0].rawPoseScore, 3);
  assert.equal(suggestion.items[0].totalScore, 0);
});
