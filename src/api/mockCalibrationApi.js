import {
  ACTIONS,
  createDefaultSegmentMetadata,
  createEmptyScore,
} from "../constants/scoring.js";
import {
  adjudicateScores,
  getSegmentReviewStatus,
  summarizeIngest,
} from "../lib/adjudication.js";
import { summarizeConsistency } from "../lib/consistency.js";
import { createAIScoreForSegment } from "../lib/ai-scoring.js";
import { buildSegmentsFromCycle } from "../lib/segmenting.js";
import { buildDatasetExport } from "../lib/dataset-export.js";

const MOCK_DELAY_MS = 260;

const store = {
  videoSeq: 1,
  jobSeq: 1,
  ingestSeq: 1,
  segmentSeq: 1,
  videos: new Map(),
  jobs: new Map(),
  segmentsByVideo: new Map(),
  ingests: new Map(),
};

function wait(value) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), MOCK_DELAY_MS);
  });
}

function createId(prefix, sequence) {
  return `${prefix}_${String(sequence).padStart(4, "0")}`;
}

function createSegments(
  actionType,
  videoId,
  startSecond,
  endSecond,
  expectedReps,
  notes,
  fileName,
) {
  const windows = buildSegmentsFromCycle({
    startSecond,
    endSecond,
    expectedReps,
    notes,
    fileName,
  });

  return windows.map((window, index) => {
    const segmentId = createId("seg", store.segmentSeq);
    store.segmentSeq += 1;
    const repetitionCount = windows.length;
    const aiScore = createAIScoreForSegment(actionType, {
      cameraView: window.cameraView,
      fileName,
      notes,
      repetitionIndex: window.repetitionIndex,
      repetitionCount,
      segmentIndex: index,
    });

    return {
      segmentId,
      videoId,
      actionType,
      repetitionIndex: window.repetitionIndex,
      startSecond: window.startSecond,
      endSecond: window.endSecond,
      originalStartSecond: window.startSecond,
      originalEndSecond: window.endSecond,
      segmentSource: "suggested",
      cameraView: window.cameraView,
      ...createDefaultSegmentMetadata(),
      aiScore,
      reviewerScores: {
        reviewer_a: null,
        reviewer_b: null,
      },
      reviewStatus: "pending",
    };
  });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export async function listActions() {
  return wait({ items: ACTIONS });
}

export async function uploadVideoAndCreateAnalysisJob(payload) {
  const {
    actionType,
    fileName,
    startSecond,
    endSecond,
    expectedReps,
    notes = "",
  } = payload;

  const videoId = createId("vid", store.videoSeq);
  store.videoSeq += 1;

  const analysisJobId = createId("job", store.jobSeq);
  store.jobSeq += 1;

  store.videos.set(videoId, {
    videoId,
    actionType,
    fileName,
    startSecond,
    endSecond,
    expectedReps,
    notes,
  });

  store.jobs.set(analysisJobId, {
    analysisJobId,
    videoId,
    status: "queued",
    progress: 0,
    message: "queued",
    error: null,
  });

  const segments = createSegments(
    actionType,
    videoId,
    startSecond,
    endSecond,
    expectedReps,
    notes,
    fileName,
  );
  store.segmentsByVideo.set(videoId, segments);

  setTimeout(() => {
    const runningJob = store.jobs.get(analysisJobId);
    if (!runningJob) {
      return;
    }

    runningJob.status = "processing";
    runningJob.progress = 60;
    runningJob.message = "segmenting video";
  }, 300);

  setTimeout(() => {
    const runningJob = store.jobs.get(analysisJobId);
    if (!runningJob) {
      return;
    }

    runningJob.status = "succeeded";
    runningJob.progress = 100;
    runningJob.message = "analysis done";
  }, 900);

  return wait({
    videoId,
    analysisJobId,
    status: "queued",
  });
}

export async function getAnalysisJob(analysisJobId) {
  const job = store.jobs.get(analysisJobId);

  if (!job) {
    throw new Error("analysis job not found");
  }

  return wait(clone(job));
}

export async function getVideoSegments(videoId) {
  const segments = store.segmentsByVideo.get(videoId);

  if (!segments) {
    throw new Error("segments not found");
  }

  return wait({
    videoId,
    actionType: segments[0]?.actionType ?? null,
    items: clone(segments),
  });
}

export async function saveSegmentReview(payload) {
  const { segmentId, reviewerRole, reviewerId, score } = payload;

  let targetSegment = null;

  for (const segments of store.segmentsByVideo.values()) {
    const found = segments.find((segment) => segment.segmentId === segmentId);
    if (found) {
      targetSegment = found;
      break;
    }
  }

  if (!targetSegment) {
    throw new Error("segment not found");
  }

  const normalizedScore = {
    reviewerId,
    totalScore: score.totalScore,
    subscores: score.subscores,
    comment: score.comment,
    savedAt: new Date().toISOString(),
  };

  targetSegment.reviewerScores[reviewerRole] = normalizedScore;
  targetSegment.reviewStatus = getSegmentReviewStatus(targetSegment);

  const adjudication = adjudicateScores(
    targetSegment.aiScore,
    targetSegment.reviewerScores.reviewer_a,
    targetSegment.reviewerScores.reviewer_b,
  );

  return wait({
    segmentId,
    reviewerRole,
    saved: true,
    reviewStatus: targetSegment.reviewStatus,
    adjudication,
  });
}

export async function updateSegmentMetadata(payload) {
  const {
    segmentId,
    startSecond,
    endSecond,
    side,
    painFlag,
    clearingTest,
    rubricVersion,
    segmentSource = "manual_adjusted",
  } = payload;
  const parsedStartSecond = Number(startSecond);
  const parsedEndSecond = Number(endSecond);

  let targetSegment = null;
  let targetVideo = null;

  for (const [videoId, segments] of store.segmentsByVideo.entries()) {
    const found = segments.find((segment) => segment.segmentId === segmentId);
    if (found) {
      targetSegment = found;
      targetVideo = store.videos.get(videoId);
      break;
    }
  }

  if (!targetSegment || !targetVideo) {
    throw new Error("segment not found");
  }

  if (
    Number.isNaN(parsedStartSecond) ||
    Number.isNaN(parsedEndSecond) ||
    parsedStartSecond < targetVideo.startSecond ||
    parsedEndSecond > targetVideo.endSecond ||
    parsedEndSecond <= parsedStartSecond
  ) {
    throw new Error("segment start/end is invalid");
  }

  targetSegment.startSecond = Number(parsedStartSecond.toFixed(2));
  targetSegment.endSecond = Number(parsedEndSecond.toFixed(2));
  targetSegment.side = side;
  targetSegment.painFlag = Boolean(painFlag);
  targetSegment.clearingTest = clearingTest;
  targetSegment.rubricVersion = rubricVersion || "fms_v1.0";
  targetSegment.segmentSource = segmentSource;
  targetSegment.updatedAt = new Date().toISOString();

  return wait({
    segmentId,
    saved: true,
    segment: clone(targetSegment),
  });
}

export async function checkVideoReadiness(videoId) {
  const segments = store.segmentsByVideo.get(videoId);

  if (!segments) {
    throw new Error("segments not found");
  }

  const allSegmentsCount = segments.length;
  const completedSegmentsCount = segments.filter(
    (segment) => getSegmentReviewStatus(segment) === "completed",
  ).length;

  const readyForIngest =
    allSegmentsCount > 0 && allSegmentsCount === completedSegmentsCount;

  const blockingReasons = [];

  if (!readyForIngest) {
    blockingReasons.push("some segments are still pending reviewer scores");
  }

  return wait({
    videoId,
    allSegmentsCount,
    completedSegmentsCount,
    readyForIngest,
    blockingReasons,
  });
}

export async function ingestVideo(videoId, requestedBy) {
  const readiness = await checkVideoReadiness(videoId);

  if (!readiness.readyForIngest) {
    throw new Error("video is not ready for ingest");
  }

  const segments = store.segmentsByVideo.get(videoId);
  const summary = summarizeIngest(segments);

  const ingestBatchId = createId("ing", store.ingestSeq);
  store.ingestSeq += 1;

  const ingestRecord = {
    ingestBatchId,
    videoId,
    requestedBy,
    segmentsTotal: summary.segmentsTotal,
    segmentsValid: summary.segmentsValid,
    segmentsInvalid: summary.segmentsInvalid,
    status: "succeeded",
    createdAt: new Date().toISOString(),
  };

  store.ingests.set(ingestBatchId, ingestRecord);

  return wait(clone(ingestRecord));
}

export async function getIngestBatch(ingestBatchId) {
  const ingestRecord = store.ingests.get(ingestBatchId);

  if (!ingestRecord) {
    throw new Error("ingest batch not found");
  }

  return wait(clone(ingestRecord));
}

export async function getVideoConsistency(videoId) {
  const segments = store.segmentsByVideo.get(videoId);

  if (!segments) {
    throw new Error("segments not found");
  }

  const metrics = summarizeConsistency(segments);

  return wait({
    videoId,
    metrics,
    generatedAt: new Date().toISOString(),
  });
}

export async function exportVideoDataset(videoId) {
  const video = store.videos.get(videoId);
  const segments = store.segmentsByVideo.get(videoId);

  if (!video || !segments) {
    throw new Error("video export not found");
  }

  return wait(buildDatasetExport(video, segments));
}

export function buildDefaultReviewerScore() {
  const base = createEmptyScore();
  return {
    reviewerId: "",
    totalScore: base.totalScore,
    subscores: base.subscores,
    comment: base.comment,
  };
}
