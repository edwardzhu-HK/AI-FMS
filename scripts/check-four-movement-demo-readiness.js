import { readFileSync } from "node:fs";
import { buildSegmentsFromCycle } from "../src/lib/segmenting.js";
import { getMovementAdapter } from "../src/lib/movement-adapters.js";
import { summarizePoseLandmarks } from "../src/lib/pose-landmarks.js";
import { summarizeTimingReadiness } from "../src/lib/export-quality.js";

const AI_DRAFT_TIMING_BUFFER_SECOND = 0.2;

const DEMO_CASES = [
  {
    label: "Sample-1 mixed views",
    actionType: "deep_squat",
    expectedReps: 7,
    startSecond: 1,
    endSecond: 45,
    notes: "前三个正面，后四个侧面。前六个3分，最后一个2分",
    posePath: "Eval_Videos/01-Deep Squat/pose/Sample-1.pose.json",
    expected: {
      timingGood: 7,
      featureUsable: 7,
      suggestionReady: true,
    },
  },
  {
    label: "ASLR score-3 sample",
    actionType: "active_straight_leg_raise",
    expectedReps: 2,
    startSecond: 0,
    endSecond: 23.8,
    notes: "都是正面。两个动作，right + left。score 3 sample",
    posePath: "Eval_Videos/Sample videos/5-ASLR/pose/2-reps-score-3.pose.json",
    expected: {
      timingGood: 2,
      featureUsable: 2,
      suggestionReady: true,
    },
  },
  {
    label: "Shoulder score-2 sample",
    actionType: "shoulder_mobility",
    expectedReps: 2,
    startSecond: 0,
    endSecond: 22.1,
    notes: "都是正面。两个动作，score 2 sample",
    posePath:
      "Eval_Videos/Sample videos/4-shoulder mobility/pose/2-reps-score-2.pose.json",
    expected: {
      timingGood: 2,
      featureUsable: 2,
      suggestionReady: false,
    },
  },
  {
    label: "Hurdle score-3 sample",
    actionType: "hurdle_step",
    expectedReps: 7,
    startSecond: 17,
    endSecond: 55.6,
    notes: "都是正面。Hurdle Step 7 reps，默认范围已避开开头准备时间。",
    posePath:
      "Eval_Videos/Sample videos/2-Hurdle step/pose/7-reps-score-3.pose.json",
    expected: {
      timingGood: 7,
      featureUsable: 7,
      suggestionReady: true,
    },
  },
];

function loadPose(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function buildSegments(demoCase) {
  return buildSegmentsFromCycle({
    startSecond: demoCase.startSecond,
    endSecond: demoCase.endSecond,
    expectedReps: demoCase.expectedReps,
    notes: demoCase.notes,
    fileName: demoCase.label,
  }).map((segment, index) => ({
    ...segment,
    segmentId: `seg_${index + 1}`,
    actionType: demoCase.actionType,
  }));
}

function buildAiDraftRange(cycle, demoCase) {
  if (!cycle) {
    return null;
  }

  return {
    startSecond: Number(
      Math.max(
        demoCase.startSecond,
        cycle.startSecond - AI_DRAFT_TIMING_BUFFER_SECOND,
      ).toFixed(2),
    ),
    endSecond: Number(
      Math.min(
        demoCase.endSecond,
        cycle.endSecond + AI_DRAFT_TIMING_BUFFER_SECOND,
      ).toFixed(2),
    ),
  };
}

function applyAiDraftTiming({ demoCase, timingReport, segments }) {
  const timingBySegmentId = new Map(
    timingReport.items.map((item) => [item.segmentId, item]),
  );

  return segments.map((segment) => {
    const item = timingBySegmentId.get(segment.segmentId);
    const hasBlockingIssue = item?.issues?.some((issue) =>
      ["duplicate_cycle_assignment", "no_unique_cycle_assignment"].includes(
        issue.code,
      ),
    );
    const range = hasBlockingIssue
      ? null
      : buildAiDraftRange(item?.cycle, demoCase);

    if (!range) {
      return segment;
    }

    return {
      ...segment,
      startSecond: range.startSecond,
      endSecond: range.endSecond,
      segmentSource: "ai_draft",
    };
  });
}

function statusLabel(condition) {
  return condition ? "PASS" : "FAIL";
}

function evaluateDemoCase(demoCase) {
  const adapter = getMovementAdapter(demoCase.actionType);
  const posePayload = loadPose(demoCase.posePath);
  const poseSummary = summarizePoseLandmarks(posePayload);
  let segments = buildSegments(demoCase);
  let timingReport = adapter.buildTimingReport({ posePayload, segments });

  if (adapter.supportsAiDraftTiming) {
    segments = applyAiDraftTiming({ demoCase, timingReport, segments });
    timingReport = adapter.buildTimingReport({ posePayload, segments });
  }

  const timingReadiness = summarizeTimingReadiness(timingReport);
  const featureReport = adapter.buildFeatureReport({
    posePayload,
    timingReport,
  });
  const suggestionReport = adapter.buildSuggestionReport({
    featureReport,
    timingReport,
  });
  const featureUsable = featureReport?.summary?.usableRepetitions ?? 0;
  const suggestionReady =
    (suggestionReport?.summary?.suggestedCount ??
      suggestionReport?.items?.filter((item) => item.status === "suggested")
        .length ??
      0) > 0;
  const timingPass =
    timingReport.summary.goodCount === demoCase.expected.timingGood &&
    timingReadiness.readyForIngest;
  const featurePass = featureUsable === demoCase.expected.featureUsable;
  const suggestionPass = suggestionReady === demoCase.expected.suggestionReady;

  return {
    label: demoCase.label,
    actionType: demoCase.actionType,
    pipeline: adapter.posePipelineStatus,
    poseFrames: `${poseSummary.framesWithPose}/${poseSummary.framesTotal}`,
    timing: `${timingReport.summary.goodCount}/${timingReport.summary.segmentsTotal}`,
    timingReady: timingReadiness.readyForIngest,
    features: `${featureUsable}/${featureReport?.summary?.repetitionsTotal ?? 0}`,
    suggestion: suggestionReady ? "available" : "not_applicable",
    status: statusLabel(timingPass && featurePass && suggestionPass),
  };
}

const rows = DEMO_CASES.map(evaluateDemoCase);
const failedRows = rows.filter((row) => row.status !== "PASS");

console.table(rows);

if (failedRows.length > 0) {
  console.error(
    `Four-movement demo readiness failed for: ${failedRows
      .map((row) => row.label)
      .join(", ")}`,
  );
  process.exitCode = 1;
}
