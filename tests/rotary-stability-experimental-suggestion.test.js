import assert from "node:assert/strict";
import test from "node:test";

import { getMovementAdapter } from "../src/lib/movement-adapters.js";
import { buildRotaryStabilityCycleEvidence } from "../src/lib/rotary-stability-cycle-evidence.js";
import { getRotaryStabilityExperimentalAdapter } from "../src/lib/rotary-stability-experimental-adapter.js";
import { buildRotaryStabilityExperimentalSuggestion } from "../src/lib/rotary-stability-suggestion.js";
import { sanitizeRotaryLabelFreeRows } from "../scripts/analyze-rotary-v1-1-internal.js";

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

function frame(second, points, hiddenLandmarks = []) {
  return {
    second,
    timestampMs: second * 1000,
    poses: [
      {
        landmarks: Object.entries(points).map(([name, [x, y]]) =>
          landmark(name, x, y, hiddenLandmarks.includes(name) ? 0.2 : 0.96),
        ),
      },
    ],
  };
}

function buildPosePayload({
  delayedKnee = false,
  incomplete = false,
  hiddenLandmarks = [],
} = {}) {
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
    frames.push(frame(second, points, hiddenLandmarks));
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

test("Rotary is a standard first-pass Workbench capability while frozen study evidence remains isolated", () => {
  const defaultAdapter = getMovementAdapter("rotary_stability");
  const experimentalAdapter = getRotaryStabilityExperimentalAdapter();
  const productSuggestion = defaultAdapter.buildSuggestionReport({
    posePayload: buildPosePayload(),
    timingReport: timingReport(),
    segments: SEGMENTS,
  });

  assert.equal(productSuggestion.status, "ok");
  assert.equal(productSuggestion.experimental, false);
  assert.equal(productSuggestion.productStatus, "first_pass");
  assert.equal(
    productSuggestion.modelVersion,
    "pose-cycle-rules-v1.0-rotary-first-pass",
  );
  assert.equal(
    productSuggestion.evaluationClass,
    "first_pass_reviewer_support",
  );
  assert.equal(productSuggestion.items[0].experimental, false);
  assert.equal(
    productSuggestion.items[0].evidenceVersion,
    "pose-cycle-evidence-v1.0-rotary",
  );
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

test("Rotary v1.1 keeps a cycle when only the support-side elbow is occluded", () => {
  const { evidence, suggestion } = buildSuggestion(
    buildPosePayload({ hiddenLandmarks: ["right_elbow"] }),
  );

  assert.equal(evidence.items[0].status, "ok");
  assert.equal(evidence.items[0].metrics.usableFrameRatio, 1);
  assert.equal(evidence.items[0].metrics.movingElbowUsableFrameRatio, 1);
  assert.equal(suggestion.items[0].rawPoseScore, 2);
});

test("Rotary v1.1 uses visible finger landmarks for the malleolus touch criterion", () => {
  const payload = buildPosePayload();
  for (const currentFrame of payload.frames) {
    const landmarks = currentFrame.poses[0].landmarks;
    const wrist = landmarks.find((item) => item.name === "left_wrist");
    const ankle = landmarks.find((item) => item.name === "left_ankle");
    const inSecondTouch =
      currentFrame.second >= 1.4 && currentFrame.second < 1.8;
    landmarks.push(
      landmark(
        "left_index",
        inSecondTouch ? ankle.x : wrist.x,
        inSecondTouch ? ankle.y : wrist.y,
      ),
    );
    if (inSecondTouch) {
      wrist.x = 0.2;
      wrist.y = 0.6;
    }
  }

  const { evidence } = buildSuggestion(payload);

  assert.equal(evidence.items[0].criteria.secondAnkleTouch.status, "pass");
});

test("Rotary v1.1 marks moving-elbow extension unknown instead of trusting an occluded landmark", () => {
  const { evidence, suggestion } = buildSuggestion(
    buildPosePayload({ hiddenLandmarks: ["left_elbow"] }),
  );

  assert.equal(evidence.items[0].status, "ok");
  assert.equal(evidence.items[0].criteria.elbowExtension.status, "unknown");
  assert.equal(evidence.items[0].metrics.movingElbowUsableFrameRatio, 0);
  assert.equal(suggestion.items[0].status, "needs_manual_review");
  assert.equal(suggestion.items[0].rawPoseScore, 2);
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

test("Rotary label-free export strips human labels and source paths", () => {
  const [row] = sanitizeRotaryLabelFreeRows([
    {
      repetitionId: "rep_rotary",
      suggestionStatus: "suggested",
      aiScore: 2,
      rawPoseScore: 2,
      scoreSource: "pose_cycle_rule_conservative_cap",
      confidence: 0.84,
      confidenceLabel: "high",
      modelVersion: "pose-cycle-rules-v1.1-rotary-experimental",
      evidenceStatus: "ok",
      poseSide: "left",
      criteria: {},
      metrics: {},
      abstentionReasons: [],
      humanConsensusScore: 2,
      posePath: "/private/source.pose.json",
      ingestId: "ing_private",
    },
  ]);

  assert.equal(row.aiSuggestedScore, 2);
  assert.equal(row.comparisonEligible, true);
  assert.equal("humanConsensusScore" in row, false);
  assert.equal("posePath" in row, false);
  assert.equal("ingestId" in row, false);
});
