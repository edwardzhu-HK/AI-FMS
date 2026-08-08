import assert from "node:assert/strict";
import test from "node:test";
import { buildHurdleStepExplainableSuggestion } from "../src/lib/hurdle-step-suggestion.js";

function rating(status, label) {
  return { status, label };
}

function createFeatureReport() {
  return {
    status: "ok",
    items: [
      {
        segmentId: "seg_1",
        repetitionIndex: 1,
        status: "ok",
        ratings: {
          hurdleClearance: rating("good", "score 3 clearance zone"),
          stanceLegControl: rating("good", "stable stance leg"),
          pelvisTrunkControl: rating("watch", "pelvis trunk shift watch"),
          stepLegAlignment: rating("good", "aligned stepping leg"),
          stepClearance: rating("good", "clear step height proxy"),
          stanceStability: rating("good", "stable stance proxy"),
          trunkControl: rating("watch", "trunk shift watch"),
          sideConfidence: rating("good", "left side detected"),
        },
        metrics: {
          avgVisibility: 0.92,
        },
      },
    ],
  };
}

function createLimitedFeatureReport() {
  return {
    status: "ok",
    items: [
      {
        segmentId: "seg_1",
        repetitionIndex: 1,
        status: "ok",
        ratings: {
          hurdleClearance: rating(
            "limited",
            "low clearance proxy; review hurdle contact or balance loss",
          ),
          stanceLegControl: rating("good", "stable stance leg"),
          pelvisTrunkControl: rating("good", "stable pelvis trunk"),
          stepLegAlignment: rating("good", "aligned stepping leg"),
          stepClearance: rating("limited", "low step clearance watch"),
          stanceStability: rating("good", "stable stance proxy"),
          trunkControl: rating("good", "stable trunk"),
          sideConfidence: rating("good", "right side detected"),
        },
        metrics: {
          avgVisibility: 0.92,
        },
      },
    ],
    summary: {
      repetitionsTotal: 1,
    },
  };
}

function createTimingReport(status = "good") {
  return {
    items: [
      {
        segmentId: "seg_1",
        status,
        metrics: {
          coverageRatio: 1,
        },
      },
    ],
  };
}

test("buildHurdleStepExplainableSuggestion maps Hurdle features to compatible subscores", () => {
  const suggestion = buildHurdleStepExplainableSuggestion({
    featureReport: createFeatureReport(),
    timingReport: createTimingReport(),
  });

  assert.equal(suggestion.status, "ok");
  assert.equal(suggestion.modelVersion, "pose-features-v0.2-hurdle");
  assert.equal(suggestion.summary.scoredSegments, 1);
  assert.equal(suggestion.items[0].totalScore, 2);
  assert.deepEqual(suggestion.items[0].subscores, {
    depth: 3,
    kneeAlignment: 2,
    torsoControl: 3,
  });
  assert.equal(suggestion.items[0].confidenceLabel, "high");
  assert.ok(
    suggestion.items[0].reasons.some((reason) =>
      reason.includes("Hurdle clearance suggested 3"),
    ),
  );
  assert.ok(
    suggestion.items[0].reasons.some((reason) =>
      reason.includes("Pelvis trunk control suggested 2"),
    ),
  );
});

test("buildHurdleStepExplainableSuggestion uses explicit sample metadata before pose proxies", () => {
  const suggestion = buildHurdleStepExplainableSuggestion({
    featureReport: {
      status: "ok",
      items: [1, 2, 3, 4, 5, 6].map((repetitionIndex) => ({
        ...createFeatureReport().items[0],
        segmentId: `seg_${repetitionIndex}`,
        repetitionIndex,
      })),
      summary: {
        repetitionsTotal: 6,
      },
    },
    timingReport: {
      items: [1, 2, 3, 4, 5, 6].map((repetitionIndex) => ({
        segmentId: `seg_${repetitionIndex}`,
        status: "good",
        metrics: {
          coverageRatio: 1,
        },
      })),
    },
    fileName:
      "all the reps are right side. first 3 reps score 3, then 1 rep score 1 and 2 reps score 2.mp4",
  });

  assert.deepEqual(
    suggestion.items.map((item) => item.totalScore),
    [3, 3, 3, 1, 2, 2],
  );
  assert.ok(
    suggestion.items.every(
      (item) => item.scoreSource === "manual_or_sample_metadata",
    ),
  );
});

test("buildHurdleStepExplainableSuggestion keeps 12-rep clean subset pose-based", () => {
  const suggestion = buildHurdleStepExplainableSuggestion({
    featureReport: createFeatureReport(),
    timingReport: createTimingReport(),
    fileName: "12 reps score 3.mp4",
    notes:
      "Hurdle Step 12 reps score 3 source video；clean subset for pose-based scoring。只保留纯视角 clean reps：rep 1 front 21.3-28.5, rep 2 side 34.0-38.5, rep 3 side 39.0-43.5, rep 4 front 48.8-52.5。",
  });

  assert.equal(suggestion.items[0].scoreSource, "pose_proxy");
  assert.ok(
    suggestion.items[0].reasons.some((reason) =>
      reason.includes("Hurdle clearance suggested"),
    ),
  );
});

test("buildHurdleStepExplainableSuggestion ignores filename scores when pose-only scoring is requested", () => {
  const suggestion = buildHurdleStepExplainableSuggestion({
    featureReport: {
      ...createFeatureReport(),
      summary: {
        repetitionsTotal: 4,
      },
    },
    timingReport: createTimingReport(),
    fileName: "first 4 reps all score 3.mp4",
    notes:
      "AI suggestion 应基于 pose features 自行判断，不使用文件名分数作为 scoring source。",
  });

  assert.equal(suggestion.items[0].scoreSource, "pose_proxy");
  assert.ok(
    suggestion.items[0].reasons.some((reason) =>
      reason.includes("Hurdle clearance suggested"),
    ),
  );
});

test("buildHurdleStepExplainableSuggestion keeps score-2 six-rep sample pose-based when requested", () => {
  const suggestion = buildHurdleStepExplainableSuggestion({
    featureReport: {
      ...createFeatureReport(),
      summary: {
        repetitionsTotal: 6,
      },
    },
    timingReport: createTimingReport(),
    fileName: "6reps total score 2 fo r both sides.mp4",
    notes:
      "Hurdle Step 6 full-cycle reps；pose-based scoring。AI suggestion 应基于 pose features 自行判断，不使用文件名分数作为 scoring source。",
  });

  assert.equal(suggestion.items[0].scoreSource, "pose_proxy");
  assert.ok(
    suggestion.items[0].reasons.some((reason) =>
      reason.includes("Hurdle clearance suggested"),
    ),
  );
});

test("buildHurdleStepExplainableSuggestion maps limited pose-only Hurdle evidence to score 2", () => {
  const suggestion = buildHurdleStepExplainableSuggestion({
    featureReport: createLimitedFeatureReport(),
    timingReport: createTimingReport(),
  });

  assert.equal(suggestion.items[0].status, "suggested");
  assert.equal(suggestion.items[0].totalScore, 2);
  assert.equal(suggestion.items[0].scoreSource, "pose_proxy");
  assert.ok(
    suggestion.items[0].reasons.some((reason) =>
      reason.includes("Hurdle clearance suggested 2"),
    ),
  );
});

test("buildHurdleStepExplainableSuggestion applies FMS score-1 rule for hurdle contact evidence", () => {
  const featureReport = createFeatureReport();
  featureReport.items[0].metrics.scoreOneEvidence = "hurdle_contact";

  const suggestion = buildHurdleStepExplainableSuggestion({
    featureReport,
    timingReport: createTimingReport(),
    notes: "pose-based scoring。AI suggestion 自行判断，不使用文件名分数。",
    fileName: "6reps total score 2 fo r both sides.mp4",
  });

  assert.equal(suggestion.items[0].status, "suggested");
  assert.equal(suggestion.items[0].totalScore, 1);
  assert.equal(suggestion.items[0].scoreSource, "pose_proxy_fms_manual_rule");
  assert.ok(
    suggestion.items[0].reasons.some((reason) => reason.includes("score 1")),
  );
});

test("buildHurdleStepExplainableSuggestion returns null without features", () => {
  assert.equal(
    buildHurdleStepExplainableSuggestion({
      featureReport: null,
      timingReport: createTimingReport(),
    }),
    null,
  );
});

test("buildHurdleStepExplainableSuggestion reports timing adjustment reason", () => {
  const suggestion = buildHurdleStepExplainableSuggestion({
    featureReport: createFeatureReport(),
    timingReport: createTimingReport("needs_adjustment"),
  });

  assert.ok(
    suggestion.items[0].reasons.some((reason) =>
      reason.includes("Timing QA indicates"),
    ),
  );
});

test("buildHurdleStepExplainableSuggestion reports insufficient evidence", () => {
  const suggestion = buildHurdleStepExplainableSuggestion({
    featureReport: {
      items: [
        {
          segmentId: "seg_1",
          repetitionIndex: 1,
          status: "no_cycle",
          ratings: {},
          metrics: {},
        },
      ],
    },
    timingReport: createTimingReport(),
  });

  assert.equal(suggestion.items[0].status, "insufficient_evidence");
  assert.equal(suggestion.items[0].totalScore, null);
  assert.equal(suggestion.summary.scoredSegments, 0);
});
