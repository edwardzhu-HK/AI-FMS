import http from "node:http";
import { URL } from "node:url";
import {
  getSegmentReviewStatus,
  summarizeIngest,
} from "../src/lib/adjudication.js";
import {
  ACTIONS,
  createDefaultSegmentMetadata,
} from "../src/constants/scoring.js";
import { summarizeConsistency } from "../src/lib/consistency.js";
import { createAIScoreForSegment } from "../src/lib/ai-scoring.js";
import { buildSegmentsFromCycle } from "../src/lib/segmenting.js";
import { buildDatasetExport } from "../src/lib/dataset-export.js";

const HOST = process.env.CALIB_API_HOST ?? "127.0.0.1";
const PORT = Number(process.env.CALIB_API_PORT ?? 4000);

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

function createId(prefix, sequence) {
  return `${prefix}_${String(sequence).padStart(4, "0")}`;
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
  });
  response.end(JSON.stringify(payload));
}

function sendError(response, statusCode, message, code = "BAD_REQUEST") {
  sendJson(response, statusCode, {
    error: {
      code,
      message,
      details: {},
    },
  });
}

function parseMultipartBody(contentType, rawBody) {
  const boundaryToken = contentType
    .split(";")
    .map((token) => token.trim())
    .find((token) => token.startsWith("boundary="));

  if (!boundaryToken) {
    return { fields: {}, files: {} };
  }

  const boundary = `--${boundaryToken.replace("boundary=", "")}`;
  const bodyText = rawBody.toString("utf8");
  const parts = bodyText.split(boundary).filter((part) => {
    const trimmed = part.trim();
    return trimmed && trimmed !== "--";
  });

  const fields = {};
  const files = {};

  for (const part of parts) {
    const [rawHeaders, ...bodyParts] = part.split("\r\n\r\n");
    if (!rawHeaders || bodyParts.length === 0) {
      continue;
    }

    const headerLines = rawHeaders
      .split("\r\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const disposition = headerLines.find((line) =>
      line.toLowerCase().startsWith("content-disposition:"),
    );

    if (!disposition) {
      continue;
    }

    const nameMatch = disposition.match(/name="([^"]+)"/);
    const fileNameMatch = disposition.match(/filename="([^"]*)"/);
    const fieldName = nameMatch?.[1];

    if (!fieldName) {
      continue;
    }

    const value = bodyParts
      .join("\r\n\r\n")
      .replace(/\r\n--$/, "")
      .trim();

    if (fileNameMatch && fileNameMatch[1]) {
      files[fieldName] = {
        filename: fileNameMatch[1],
      };
      continue;
    }

    fields[fieldName] = value;
  }

  return { fields, files };
}

async function readRequestPayload(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const rawBody = Buffer.concat(chunks);
  const contentType = request.headers["content-type"] ?? "";

  if (contentType.includes("application/json")) {
    const payload =
      rawBody.length > 0 ? JSON.parse(rawBody.toString("utf8")) : {};
    return { fields: payload, files: {} };
  }

  if (contentType.includes("multipart/form-data")) {
    return parseMultipartBody(contentType, rawBody);
  }

  return { fields: {}, files: {} };
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

function toApiSubscores(subscores) {
  return {
    depth: subscores.depth,
    knee_alignment: subscores.kneeAlignment,
    torso_control: subscores.torsoControl,
  };
}

function toApiScore(score) {
  if (!score) {
    return null;
  }

  return {
    reviewer_id: score.reviewerId,
    total_score: score.totalScore,
    subscores: toApiSubscores(score.subscores),
    comment: score.comment ?? "",
    model_version: score.modelVersion,
  };
}

function toApiSegment(segment) {
  return {
    segment_id: segment.segmentId,
    video_id: segment.videoId,
    action_type: segment.actionType,
    repetition_index: segment.repetitionIndex,
    start_second: segment.startSecond,
    end_second: segment.endSecond,
    original_start_second: segment.originalStartSecond ?? segment.startSecond,
    original_end_second: segment.originalEndSecond ?? segment.endSecond,
    segment_source: segment.segmentSource ?? "suggested",
    camera_view: segment.cameraView,
    side: segment.side ?? "none",
    pain_flag: Boolean(segment.painFlag),
    clearing_test: segment.clearingTest ?? "not_applicable",
    rubric_version: segment.rubricVersion ?? "fms_v1.0",
    segment_review_status: segment.reviewStatus,
    ai_score: toApiScore(segment.aiScore),
    reviewer_a_score: toApiScore(segment.reviewerScores.reviewer_a),
    reviewer_b_score: toApiScore(segment.reviewerScores.reviewer_b),
  };
}

function toApiConsistency(metrics) {
  return {
    segments_total: metrics.segmentsTotal,
    valid_count: metrics.validCount,
    invalid_count: metrics.invalidCount,
    pending_count: metrics.pendingCount,
    ai_matches_final_count: metrics.aiMatchesFinalCount,
    ai_differs_from_final_count: metrics.aiDiffersFromFinalCount,
    reviewer_consensus_count: metrics.reviewerConsensusCount,
    reviewer_disagreement_count: metrics.reviewerDisagreementCount,
    ai_matches_final_rate: metrics.aiMatchesFinalRate,
  };
}

function parseRoute(urlPath) {
  const segments = urlPath.split("/").filter(Boolean);
  return segments;
}

async function handleRequest(request, response) {
  if (request.method === "OPTIONS") {
    sendJson(response, 200, { ok: true });
    return;
  }

  const requestUrl = new URL(request.url, `http://${HOST}:${PORT}`);
  const route = parseRoute(requestUrl.pathname);

  if (route[0] !== "api" || route[1] !== "v0") {
    sendError(response, 404, "route not found", "NOT_FOUND");
    return;
  }

  if (request.method === "GET" && route[2] === "actions") {
    sendJson(response, 200, {
      items: ACTIONS.map((action) => ({
        id: action.id,
        display_name: action.displayName,
        enabled: action.enabled,
        phase: action.phase,
      })),
    });
    return;
  }

  if (
    request.method === "POST" &&
    route[2] === "videos" &&
    route.length === 3
  ) {
    const payload = await readRequestPayload(request);
    const actionType = payload.fields.action_type ?? payload.fields.actionType;
    const startSecond = Number(
      payload.fields.start_second ?? payload.fields.startSecond,
    );
    const endSecond = Number(
      payload.fields.end_second ?? payload.fields.endSecond,
    );
    const expectedReps = Number(
      payload.fields.expected_reps ?? payload.fields.expectedReps,
    );
    const notes = payload.fields.notes ?? "";

    if (!actionType) {
      sendError(response, 400, "action_type is required", "INVALID_ARGUMENT");
      return;
    }

    if (
      Number.isNaN(startSecond) ||
      Number.isNaN(endSecond) ||
      endSecond <= startSecond
    ) {
      sendError(response, 400, "invalid start/end seconds", "INVALID_ARGUMENT");
      return;
    }

    const videoId = createId("vid", store.videoSeq);
    store.videoSeq += 1;

    const analysisJobId = createId("job", store.jobSeq);
    store.jobSeq += 1;

    store.videos.set(videoId, {
      videoId,
      actionType,
      fileName:
        payload.files.file?.filename ??
        payload.fields.file_name ??
        "uploaded.mp4",
      startSecond,
      endSecond,
      expectedReps: Number.isInteger(expectedReps) ? expectedReps : null,
      notes: payload.fields.notes ?? "",
    });

    store.jobs.set(analysisJobId, {
      analysisJobId,
      videoId,
      status: "queued",
      progress: 0,
      message: "queued",
      error: null,
    });

    store.segmentsByVideo.set(
      videoId,
      createSegments(
        actionType,
        videoId,
        startSecond,
        endSecond,
        expectedReps,
        notes,
        payload.files.file?.filename ?? payload.fields.file_name ?? "",
      ),
    );

    setTimeout(() => {
      const job = store.jobs.get(analysisJobId);
      if (!job) {
        return;
      }
      job.status = "processing";
      job.progress = 66;
      job.message = "segmenting video";
    }, 250);

    setTimeout(() => {
      const job = store.jobs.get(analysisJobId);
      if (!job) {
        return;
      }
      job.status = "succeeded";
      job.progress = 100;
      job.message = "analysis done";
    }, 850);

    sendJson(response, 201, {
      video_id: videoId,
      analysis_job_id: analysisJobId,
      status: "queued",
    });
    return;
  }

  if (request.method === "GET" && route[2] === "analysis-jobs" && route[3]) {
    const job = store.jobs.get(route[3]);
    if (!job) {
      sendError(response, 404, "analysis job not found", "NOT_FOUND");
      return;
    }

    sendJson(response, 200, {
      analysis_job_id: job.analysisJobId,
      video_id: job.videoId,
      status: job.status,
      progress: job.progress,
      message: job.message,
      error: job.error,
    });
    return;
  }

  if (
    request.method === "GET" &&
    route[2] === "videos" &&
    route[4] === "segments"
  ) {
    const videoId = route[3];
    const items = store.segmentsByVideo.get(videoId);
    if (!items) {
      sendError(response, 404, "segments not found", "NOT_FOUND");
      return;
    }

    sendJson(response, 200, {
      video_id: videoId,
      action_type: items[0]?.actionType ?? null,
      items: items.map(toApiSegment),
    });
    return;
  }

  if (
    request.method === "PUT" &&
    route[2] === "segments" &&
    route[4] === "reviews"
  ) {
    const segmentId = route[3];
    const reviewerRole = route[5];
    if (!["reviewer_a", "reviewer_b"].includes(reviewerRole)) {
      sendError(
        response,
        400,
        "reviewer role must be reviewer_a or reviewer_b",
      );
      return;
    }

    const payload = await readRequestPayload(request);

    let targetSegment = null;
    for (const segments of store.segmentsByVideo.values()) {
      const found = segments.find((segment) => segment.segmentId === segmentId);
      if (found) {
        targetSegment = found;
        break;
      }
    }

    if (!targetSegment) {
      sendError(response, 404, "segment not found", "NOT_FOUND");
      return;
    }

    const subscoresRaw = payload.fields.subscores ?? {};
    const normalizedSubscores = {
      depth: Number(subscoresRaw.depth),
      kneeAlignment: Number(
        subscoresRaw.knee_alignment ?? subscoresRaw.kneeAlignment,
      ),
      torsoControl: Number(
        subscoresRaw.torso_control ?? subscoresRaw.torsoControl,
      ),
    };

    const reviewerScore = {
      reviewerId: payload.fields.reviewer_id ?? payload.fields.reviewerId,
      totalScore: Number(
        payload.fields.total_score ?? payload.fields.totalScore,
      ),
      subscores: normalizedSubscores,
      comment: payload.fields.comment ?? "",
      savedAt: new Date().toISOString(),
    };

    targetSegment.reviewerScores[reviewerRole] = reviewerScore;
    targetSegment.reviewStatus = getSegmentReviewStatus(targetSegment);

    sendJson(response, 200, {
      segment_id: segmentId,
      reviewer_role: reviewerRole,
      saved: true,
      segment_review_status: targetSegment.reviewStatus,
    });
    return;
  }

  if (
    request.method === "PUT" &&
    route[2] === "segments" &&
    route[4] === "metadata"
  ) {
    const segmentId = route[3];
    const payload = await readRequestPayload(request);
    const startSecond = Number(
      payload.fields.start_second ?? payload.fields.startSecond,
    );
    const endSecond = Number(
      payload.fields.end_second ?? payload.fields.endSecond,
    );

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
      sendError(response, 404, "segment not found", "NOT_FOUND");
      return;
    }

    if (
      Number.isNaN(startSecond) ||
      Number.isNaN(endSecond) ||
      startSecond < targetVideo.startSecond ||
      endSecond > targetVideo.endSecond ||
      endSecond <= startSecond
    ) {
      sendError(response, 400, "segment start/end is invalid");
      return;
    }

    targetSegment.startSecond = Number(startSecond.toFixed(2));
    targetSegment.endSecond = Number(endSecond.toFixed(2));
    targetSegment.side = payload.fields.side ?? targetSegment.side ?? "none";
    targetSegment.painFlag = Boolean(
      payload.fields.pain_flag ?? payload.fields.painFlag ?? false,
    );
    targetSegment.clearingTest =
      payload.fields.clearing_test ??
      payload.fields.clearingTest ??
      targetSegment.clearingTest ??
      "not_applicable";
    targetSegment.rubricVersion =
      payload.fields.rubric_version ??
      payload.fields.rubricVersion ??
      targetSegment.rubricVersion ??
      "fms_v1.0";
    targetSegment.segmentSource = "manual_adjusted";
    targetSegment.updatedAt = new Date().toISOString();

    sendJson(response, 200, {
      segment_id: segmentId,
      saved: true,
      segment: toApiSegment(targetSegment),
    });
    return;
  }

  if (
    request.method === "GET" &&
    route[2] === "videos" &&
    route[4] === "readiness"
  ) {
    const videoId = route[3];
    const segments = store.segmentsByVideo.get(videoId);
    if (!segments) {
      sendError(response, 404, "segments not found", "NOT_FOUND");
      return;
    }

    const allSegmentsCount = segments.length;
    const completedSegmentsCount = segments.filter(
      (segment) => getSegmentReviewStatus(segment) === "completed",
    ).length;

    const readyForIngest =
      allSegmentsCount > 0 && allSegmentsCount === completedSegmentsCount;

    sendJson(response, 200, {
      video_id: videoId,
      all_segments_count: allSegmentsCount,
      completed_segments_count: completedSegmentsCount,
      ready_for_ingest: readyForIngest,
      blocking_reasons: readyForIngest
        ? []
        : ["some segments are still pending reviewer scores"],
    });
    return;
  }

  if (
    request.method === "GET" &&
    route[2] === "videos" &&
    route[4] === "consistency"
  ) {
    const videoId = route[3];
    const segments = store.segmentsByVideo.get(videoId);

    if (!segments) {
      sendError(response, 404, "segments not found", "NOT_FOUND");
      return;
    }

    const metrics = summarizeConsistency(segments);
    sendJson(response, 200, {
      video_id: videoId,
      generated_at: new Date().toISOString(),
      metrics: toApiConsistency(metrics),
    });
    return;
  }

  if (
    request.method === "GET" &&
    route[2] === "videos" &&
    route[4] === "dataset-export"
  ) {
    const videoId = route[3];
    const video = store.videos.get(videoId);
    const segments = store.segmentsByVideo.get(videoId);

    if (!video || !segments) {
      sendError(response, 404, "video export not found", "NOT_FOUND");
      return;
    }

    sendJson(response, 200, buildDatasetExport(video, segments));
    return;
  }

  if (
    request.method === "POST" &&
    route[2] === "videos" &&
    route[4] === "ingest"
  ) {
    const videoId = route[3];
    const segments = store.segmentsByVideo.get(videoId);

    if (!segments) {
      sendError(response, 404, "segments not found", "NOT_FOUND");
      return;
    }

    const hasPending = segments.some(
      (segment) => getSegmentReviewStatus(segment) !== "completed",
    );

    if (hasPending) {
      sendError(
        response,
        400,
        "video is not ready for ingest",
        "FAILED_PRECONDITION",
      );
      return;
    }

    const payload = await readRequestPayload(request);
    const ingestBatchId = createId("ing", store.ingestSeq);
    store.ingestSeq += 1;

    const summary = summarizeIngest(segments);
    const record = {
      ingestBatchId,
      videoId,
      requestedBy:
        payload.fields.requested_by ?? payload.fields.requestedBy ?? "unknown",
      segmentsTotal: summary.segmentsTotal,
      segmentsValid: summary.segmentsValid,
      segmentsInvalid: summary.segmentsInvalid,
      status: "succeeded",
      createdAt: new Date().toISOString(),
    };

    store.ingests.set(ingestBatchId, record);

    sendJson(response, 201, {
      ingest_batch_id: record.ingestBatchId,
      video_id: record.videoId,
      requested_by: record.requestedBy,
      segments_total: record.segmentsTotal,
      segments_valid: record.segmentsValid,
      segments_invalid: record.segmentsInvalid,
      status: record.status,
      created_at: record.createdAt,
    });
    return;
  }

  if (request.method === "GET" && route[2] === "ingest-batches" && route[3]) {
    const record = store.ingests.get(route[3]);
    if (!record) {
      sendError(response, 404, "ingest batch not found", "NOT_FOUND");
      return;
    }

    sendJson(response, 200, {
      ingest_batch_id: record.ingestBatchId,
      video_id: record.videoId,
      requested_by: record.requestedBy,
      segments_total: record.segmentsTotal,
      segments_valid: record.segmentsValid,
      segments_invalid: record.segmentsInvalid,
      status: record.status,
      created_at: record.createdAt,
    });
    return;
  }

  sendError(response, 404, "route not found", "NOT_FOUND");
}

const server = http.createServer((request, response) => {
  handleRequest(request, response).catch((error) => {
    sendError(response, 500, error.message, "INTERNAL");
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Calibration API stub running at http://${HOST}:${PORT}`);
});
