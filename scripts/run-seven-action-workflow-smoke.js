import { basename } from "node:path";
import { readFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import {
  checkVideoReadiness,
  exportVideoDataset,
  getAnalysisJob,
  getVideoConsistency,
  getVideoSegments,
  ingestVideo,
  saveSegmentReview,
  updateSegmentMetadata,
  uploadVideoAndCreateAnalysisJob,
} from "../src/api/mockCalibrationApi.js";
import { ACTIONS, getActionRepPolicy } from "../src/constants/scoring.js";
import {
  attachPoseEvidenceToDataset,
  buildDatasetExport,
} from "../src/lib/dataset-export.js";
import { buildDatasetCsv } from "../src/lib/dataset-csv.js";
import { buildDatasetPackageFiles } from "../src/lib/dataset-package.js";
import {
  summarizeExportQuality,
  summarizeTimingReadiness,
} from "../src/lib/export-quality.js";
import {
  getImplementedPoseActionTypes,
  getMovementAdapter,
} from "../src/lib/movement-adapters.js";
import { summarizePoseLandmarks } from "../src/lib/pose-landmarks.js";

const AI_DRAFT_TIMING_BUFFER_SECOND = 0.2;

const DEMO_CASES = [
  {
    label: "Sample-1 mixed views",
    actionType: "deep_squat",
    fileName: "Sample-1.mp4",
    expectedReps: 7,
    startSecond: 1,
    endSecond: 45,
    notes: "前三个正面，后四个侧面。前六个3分，最后一个2分",
    posePath: "Eval_Videos/01-Deep Squat/pose/Sample-1.pose.json",
    expected: {
      records: 7,
      featureUsable: 7,
      suggestionReady: true,
    },
  },
  {
    label: "Hurdle score-3 sample",
    actionType: "hurdle_step",
    fileName: "7 reps score 3.mp4",
    expectedReps: 7,
    startSecond: 17,
    endSecond: 55.6,
    notes: "都是正面。Hurdle Step 7 reps，默认范围已避开开头准备时间。",
    posePath:
      "Eval_Videos/Sample videos/2-Hurdle step/pose/7-reps-score-3.pose.json",
    expected: {
      records: 7,
      featureUsable: 7,
      suggestionReady: true,
    },
  },
  {
    label: "In-Line Lunge score-3 sample",
    actionType: "in_line_lunge",
    fileName: "6 reps score 3.mp4",
    expectedReps: 6,
    startSecond: 0,
    endSecond: 60.3,
    notes:
      "In-Line Lunge 6 reps score-3 sample。当前支持 timing/features 与 first-pass pose-based AI suggestion。",
    posePath:
      "Eval_Videos/Sample videos/3-Inline Lunge/pose/6-reps-score-3.pose.json",
    expected: {
      records: 6,
      featureUsable: 6,
      suggestionReady: true,
    },
  },
  {
    label: "Shoulder score-2 sample",
    actionType: "shoulder_mobility",
    fileName: "2 reps score 2.mp4",
    expectedReps: 2,
    startSecond: 0,
    endSecond: 22.1,
    notes: "都是正面。两个动作，score 2 sample",
    posePath:
      "Eval_Videos/Sample videos/4-shoulder mobility/pose/2-reps-score-2.pose.json",
    expected: {
      records: 2,
      featureUsable: 2,
      suggestionReady: true,
    },
  },
  {
    label: "ASLR score-3 sample",
    actionType: "active_straight_leg_raise",
    fileName: "2 reps score 3.mp4",
    expectedReps: 2,
    startSecond: 0,
    endSecond: 23.8,
    notes: "都是正面。两个动作，right + left。score 3 sample",
    posePath: "Eval_Videos/Sample videos/5-ASLR/pose/2-reps-score-3.pose.json",
    expected: {
      records: 2,
      featureUsable: 2,
      suggestionReady: true,
    },
  },
  {
    label: "Trunk Stability Push-Up score-3 sample",
    actionType: "trunk_stability_push_up",
    fileName: "1 rep score 3.mp4",
    expectedReps: 1,
    startSecond: 0,
    endSecond: 33.5,
    notes:
      "Trunk Stability Push-Up 1 rep score-3 sample。当前支持 first-pass timing/features 与 pose-based AI suggestion；extension clearing/pain 仍需人工确认。",
    posePath:
      "Eval_Videos/Sample videos/6-trunk stability push up/pose/1-rep-score-3.pose.json",
    expected: {
      records: 1,
      featureUsable: 1,
      suggestionReady: true,
    },
  },
  {
    label: "Rotary Stability first-pass AI sample",
    actionType: "rotary_stability",
    fileName: "videoplayback (21).mp4",
    expectedReps: 2,
    startSecond: 46,
    endSecond: 112,
    notes:
      "Rotary Stability first-pass sample。系统使用完整动作周期生成保守、可拒判的 AI RAW SCORE；flexion clearing/pain 仍需人工确认。",
    posePath:
      "Eval_Videos/Sample videos/7-rotatory stability/pose/rotary-review.pose.json",
    expected: {
      records: 2,
      featureUsable: 2,
      suggestionReady: true,
      aiSideSuggestionReady: true,
      poseSuggestionReady: true,
    },
  },
];

function loadPose(path) {
  if (!path) {
    return null;
  }

  return JSON.parse(readFileSync(path, "utf8"));
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

function hasBlockingCycleIssue(item) {
  return item?.issues?.some((issue) =>
    ["duplicate_cycle_assignment", "no_unique_cycle_assignment"].includes(
      issue.code,
    ),
  );
}

function reviewerScoreFromSegment(segment, reviewerId) {
  const aiScore = Number.isInteger(segment.aiScore?.totalScore)
    ? segment.aiScore.totalScore
    : 2;
  return {
    reviewerId,
    totalScore: aiScore,
    subscores: segment.aiScore?.subscores ?? [],
    comment: "seven-action workflow smoke manual consensus label",
  };
}

function confirmedClearingFindingsForAction(actionType) {
  return getActionRepPolicy(actionType).clearingTests.map((test) => ({
    key: test.key,
    result: test.resultType === "red_yellow_green" ? "green" : "negative",
  }));
}

async function waitForSucceededJob(analysisJobId) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const job = await getAnalysisJob(analysisJobId);

    if (job.status === "succeeded") {
      return job;
    }

    if (job.status === "failed") {
      throw new Error(`analysis job failed: ${analysisJobId}`);
    }

    await delay(250);
  }

  throw new Error(`analysis job timed out: ${analysisJobId}`);
}

async function applyAiDraftTiming({
  demoCase,
  adapter,
  posePayload,
  segments,
}) {
  if (!adapter?.supportsAiDraftTiming || !posePayload) {
    return segments;
  }

  const timingReport = adapter.buildTimingReport({
    posePayload,
    segments,
  });
  const updates = timingReport.items
    .map((item) => {
      const segment = segments.find(
        (candidate) => candidate.segmentId === item.segmentId,
      );
      const range = hasBlockingCycleIssue(item)
        ? null
        : buildAiDraftRange(item.cycle, demoCase);

      if (!segment || !range) {
        return null;
      }

      return {
        segmentId: segment.segmentId,
        startSecond: range.startSecond,
        endSecond: range.endSecond,
        side: segment.side,
        painFlag: segment.painFlag,
        clearingTest: segment.clearingTest,
        rubricVersion: segment.rubricVersion,
        segmentSource: "ai_draft",
      };
    })
    .filter(Boolean);

  for (const update of updates) {
    await updateSegmentMetadata(update);
  }

  return null;
}

async function confirmClearingMetadata(segments) {
  for (const segment of segments) {
    const clearingFindings = confirmedClearingFindingsForAction(
      segment.actionType,
    );

    if (clearingFindings.length === 0) {
      continue;
    }

    await updateSegmentMetadata({
      segmentId: segment.segmentId,
      startSecond: segment.startSecond,
      endSecond: segment.endSecond,
      side: segment.side,
      painFlag: false,
      clearingFindings,
      rubricVersion: segment.rubricVersion,
      segmentSource: segment.segmentSource,
    });
  }
}

async function saveConsensusReviews(segments) {
  for (const segment of segments) {
    await saveSegmentReview({
      segmentId: segment.segmentId,
      reviewerRole: "reviewer_a",
      reviewerId: "Workflow_Smoke_A",
      score: reviewerScoreFromSegment(segment, "Workflow_Smoke_A"),
    });
    await saveSegmentReview({
      segmentId: segment.segmentId,
      reviewerRole: "reviewer_b",
      reviewerId: "Workflow_Smoke_B",
      score: reviewerScoreFromSegment(segment, "Workflow_Smoke_B"),
    });
  }
}

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function buildPoseReports({ adapter, posePayload, segments }) {
  if (!adapter || !posePayload) {
    return {
      poseSummary: null,
      timingReport: null,
      timingReadiness: summarizeTimingReadiness(null),
      featureReport: null,
      suggestionReport: null,
    };
  }

  const poseSummary = summarizePoseLandmarks(posePayload);
  const timingReport = adapter.buildTimingReport({
    posePayload,
    segments,
  });
  const timingReadiness = summarizeTimingReadiness(timingReport);
  const featureReport = adapter.buildFeatureReport({
    posePayload,
    timingReport,
  });
  const suggestionReport = adapter.buildSuggestionReport({
    posePayload,
    segments,
    featureReport,
    timingReport,
  });

  return {
    poseSummary,
    timingReport,
    timingReadiness,
    featureReport,
    suggestionReport,
  };
}

async function runDemoWorkflow(demoCase) {
  const adapter = getMovementAdapter(demoCase.actionType);
  const posePayload = loadPose(demoCase.posePath);
  const created = await uploadVideoAndCreateAnalysisJob({
    actionType: demoCase.actionType,
    fileName: demoCase.fileName,
    startSecond: demoCase.startSecond,
    endSecond: demoCase.endSecond,
    expectedReps: demoCase.expectedReps,
    notes: demoCase.notes,
  });

  await waitForSucceededJob(created.analysisJobId);

  let segments = (await getVideoSegments(created.videoId)).items;
  await applyAiDraftTiming({ demoCase, adapter, posePayload, segments });
  segments = (await getVideoSegments(created.videoId)).items;
  await confirmClearingMetadata(segments);
  segments = (await getVideoSegments(created.videoId)).items;

  const {
    poseSummary,
    timingReport,
    timingReadiness,
    featureReport,
    suggestionReport,
  } = buildPoseReports({ adapter, posePayload, segments });
  const featureUsable = featureReport?.summary?.usableRepetitions ?? 0;
  const suggestionReady =
    (suggestionReport?.summary?.scoredSegments ??
      suggestionReport?.items?.filter((item) => item.status === "suggested")
        .length ??
      0) > 0;

  assertCondition(
    segments.length === demoCase.expected.records,
    `${demoCase.label}: expected ${demoCase.expected.records} segments, got ${segments.length}`,
  );
  assertCondition(
    timingReadiness.readyForIngest,
    `${demoCase.label}: timing readiness is blocked`,
  );
  assertCondition(
    featureUsable === demoCase.expected.featureUsable,
    `${demoCase.label}: expected ${demoCase.expected.featureUsable} usable features, got ${featureUsable}`,
  );
  assertCondition(
    suggestionReady === demoCase.expected.suggestionReady,
    `${demoCase.label}: suggestion readiness mismatch`,
  );

  await saveConsensusReviews(segments);
  segments = (await getVideoSegments(created.videoId)).items;

  const readiness = await checkVideoReadiness(created.videoId);
  assertCondition(
    readiness.readyForIngest,
    `${demoCase.label}: reviewer readiness did not pass`,
  );

  const ingest = await ingestVideo(created.videoId, "workflow_smoke");
  assertCondition(
    ingest.status === "succeeded",
    `${demoCase.label}: ingest failed`,
  );

  const consistency = await getVideoConsistency(created.videoId);
  const dataset = attachPoseEvidenceToDataset(
    buildDatasetExport(
      {
        videoId: created.videoId,
        actionType: demoCase.actionType,
        fileName: demoCase.fileName,
        startSecond: demoCase.startSecond,
        endSecond: demoCase.endSecond,
        expectedReps: demoCase.expectedReps,
        notes: demoCase.notes,
      },
      segments,
    ),
    {
      poseFileName: demoCase.posePath ? basename(demoCase.posePath) : "",
      poseSummary,
      timingReport,
      featureReport,
      suggestionReport,
      implementedPoseActionTypes: getImplementedPoseActionTypes(),
      plannedActionTypes: ACTIONS.map((action) => action.id),
    },
  );
  const qualitySummary = summarizeExportQuality({
    segments,
    consistencyMetrics: consistency.metrics,
    poseSummary,
    timingReport,
    featureReport,
    suggestionReport,
  });
  const csv = buildDatasetCsv(dataset);
  const packageFiles = buildDatasetPackageFiles({
    dataset,
    qualitySummary,
  });
  const serverDataset = await exportVideoDataset(created.videoId);
  const aiSideSuggestedCount = dataset.records.filter(
    (record) => record.aiSideSuggestion?.status === "suggested",
  ).length;

  assertCondition(
    dataset.records.length === demoCase.expected.records,
    `${demoCase.label}: dataset record count mismatch`,
  );
  assertCondition(
    serverDataset.records.length === dataset.records.length,
    `${demoCase.label}: server export record count mismatch`,
  );
  assertCondition(
    qualitySummary.validLabels === demoCase.expected.records,
    `${demoCase.label}: expected all final labels valid`,
  );
  assertCondition(
    csv.split("\n").length === demoCase.expected.records + 1,
    `${demoCase.label}: CSV row count mismatch`,
  );
  assertCondition(
    packageFiles.length >= 4,
    `${demoCase.label}: dataset package is incomplete`,
  );
  if (demoCase.expected.aiSideSuggestionReady) {
    assertCondition(
      dataset.records.some(
        (record) => record.aiSideSuggestion?.status === "suggested",
      ),
      `${demoCase.label}: expected at least one AI side suggestion`,
    );
  }
  if (demoCase.expected.poseSuggestionReady) {
    assertCondition(
      dataset.records.some((record) => record.poseSuggestion !== null),
      `${demoCase.label}: expected a first-pass pose score suggestion`,
    );
  }

  return {
    label: demoCase.label,
    actionType: demoCase.actionType,
    pipeline: adapter?.posePipelineStatus ?? "annotation_only",
    records: dataset.records.length,
    validLabels: qualitySummary.validLabels,
    timing: timingReport
      ? `${timingReport.summary.goodCount}/${timingReport.summary.segmentsTotal}`
      : "N/A",
    features: featureReport
      ? `${featureUsable}/${featureReport.summary.repetitionsTotal}`
      : "N/A",
    suggestion: suggestionReady ? "available" : "not_applicable",
    aiSide: `${aiSideSuggestedCount}/${dataset.records.length}`,
    poseEvidence: qualitySummary.poseEvidenceAttached ? "yes" : "no",
    ingest: ingest.status,
    exports: packageFiles.length,
    status: "PASS",
  };
}

const rows = [];

try {
  for (const demoCase of DEMO_CASES) {
    rows.push(await runDemoWorkflow(demoCase));
  }

  console.table(rows);
} catch (error) {
  console.table(rows);
  console.error(error.message);
  process.exitCode = 1;
}
