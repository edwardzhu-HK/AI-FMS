import * as mockApi from "./mockCalibrationApi.js";
import * as realApi from "./realCalibrationApi.js";
import {
  normalizeClearingFindings,
  normalizeScoreForAction,
} from "../constants/scoring.js";

const API_MODE = import.meta.env.VITE_CALIB_API_MODE ?? "mock";

const impl = API_MODE === "real" ? realApi : mockApi;

function fromSnakeCriteriaScores(criteriaScores = []) {
  return criteriaScores.map((criterion) => ({
    genericKey: criterion.generic_key ?? criterion.genericKey,
    criterionKey: criterion.criterion_key ?? criterion.criterionKey,
    label: criterion.label,
    score: criterion.score,
  }));
}

function fromSnakeScore(score, actionType) {
  if (!score) {
    return null;
  }

  return normalizeScoreForAction(
    {
      reviewerId: score.reviewer_id ?? score.reviewerId ?? "",
      totalScore: score.total_score ?? score.totalScore,
      subscores: score.subscores
        ? {
            depth: score.subscores.depth,
            kneeAlignment:
              score.subscores.knee_alignment ?? score.subscores.kneeAlignment,
            torsoControl:
              score.subscores.torso_control ?? score.subscores.torsoControl,
          }
        : null,
      criteriaScores: fromSnakeCriteriaScores(
        score.criteria_scores ?? score.criteriaScores ?? [],
      ),
      comment: score.comment ?? "",
      scoreScope: score.score_scope ?? score.scoreScope,
      scoreBasis: score.score_basis ?? score.scoreBasis,
      usesCriteriaScores:
        score.uses_criteria_scores ?? score.usesCriteriaScores,
      scoringStatus: score.scoring_status ?? score.scoringStatus,
      modelVersion: score.model_version ?? score.modelVersion,
    },
    actionType,
  );
}

function toCamelSegment(rawSegment) {
  const actionType =
    rawSegment.action_type ?? rawSegment.actionType ?? "deep_squat";

  return {
    segmentId: rawSegment.segment_id ?? rawSegment.segmentId,
    videoId: rawSegment.video_id ?? rawSegment.videoId,
    actionType,
    repetitionIndex: rawSegment.repetition_index ?? rawSegment.repetitionIndex,
    startSecond: rawSegment.start_second ?? rawSegment.startSecond,
    endSecond: rawSegment.end_second ?? rawSegment.endSecond,
    originalStartSecond:
      rawSegment.original_start_second ??
      rawSegment.originalStartSecond ??
      rawSegment.start_second ??
      rawSegment.startSecond,
    originalEndSecond:
      rawSegment.original_end_second ??
      rawSegment.originalEndSecond ??
      rawSegment.end_second ??
      rawSegment.endSecond,
    segmentSource:
      rawSegment.segment_source ?? rawSegment.segmentSource ?? "suggested",
    cameraView: rawSegment.camera_view ?? rawSegment.cameraView,
    side: rawSegment.side ?? "none",
    painFlag: rawSegment.pain_flag ?? rawSegment.painFlag ?? false,
    clearingTest:
      rawSegment.clearing_test ?? rawSegment.clearingTest ?? "not_applicable",
    clearingFindings: normalizeClearingFindings(
      actionType,
      rawSegment.clearing_findings ?? rawSegment.clearingFindings ?? [],
      rawSegment.clearing_test ?? rawSegment.clearingTest ?? "not_applicable",
    ),
    rubricVersion:
      rawSegment.rubric_version ?? rawSegment.rubricVersion ?? "fms_v1.0",
    aiScore: fromSnakeScore(
      rawSegment.ai_score ?? rawSegment.aiScore,
      actionType,
    ),
    reviewerScores: {
      reviewer_a: fromSnakeScore(
        rawSegment.reviewer_a_score ?? rawSegment.reviewerScores?.reviewer_a,
        actionType,
      ),
      reviewer_b: fromSnakeScore(
        rawSegment.reviewer_b_score ?? rawSegment.reviewerScores?.reviewer_b,
        actionType,
      ),
    },
    reviewStatus:
      rawSegment.segment_review_status ??
      rawSegment.segmentReviewStatus ??
      rawSegment.reviewStatus ??
      "pending",
  };
}

function toCamelReadiness(payload) {
  return {
    videoId: payload.video_id ?? payload.videoId,
    allSegmentsCount: payload.all_segments_count ?? payload.allSegmentsCount,
    completedSegmentsCount:
      payload.completed_segments_count ?? payload.completedSegmentsCount,
    scoreableCompletedSegmentsCount:
      payload.scoreable_completed_segments_count ??
      payload.scoreableCompletedSegmentsCount,
    protocolEvidenceSegmentsCount:
      payload.protocol_evidence_segments_count ??
      payload.protocolEvidenceSegmentsCount,
    clearingReadyForIngest:
      payload.clearing_ready_for_ingest ?? payload.clearingReadyForIngest,
    clearingBlockerCount:
      payload.clearing_blocker_count ?? payload.clearingBlockerCount,
    clearingRequiredSegmentsCount:
      payload.clearing_required_segments_count ??
      payload.clearingRequiredSegmentsCount,
    clearingConfirmedSegmentsCount:
      payload.clearing_confirmed_segments_count ??
      payload.clearingConfirmedSegmentsCount,
    readyForIngest: payload.ready_for_ingest ?? payload.readyForIngest,
    blockingReasons: payload.blocking_reasons ?? payload.blockingReasons ?? [],
  };
}

function toCamelIngest(payload) {
  return {
    ingestBatchId: payload.ingest_batch_id ?? payload.ingestBatchId,
    videoId: payload.video_id ?? payload.videoId,
    requestedBy: payload.requested_by ?? payload.requestedBy,
    segmentsTotal: payload.segments_total ?? payload.segmentsTotal,
    segmentsValid: payload.segments_valid ?? payload.segmentsValid,
    segmentsInvalid: payload.segments_invalid ?? payload.segmentsInvalid,
    segmentsProtocolEvidence:
      payload.segments_protocol_evidence ?? payload.segmentsProtocolEvidence,
    status: payload.status,
    createdAt: payload.created_at ?? payload.createdAt,
  };
}

function toCamelConsistencyMetrics(metrics) {
  if (!metrics) {
    return null;
  }

  return {
    segmentsTotal: metrics.segments_total ?? metrics.segmentsTotal ?? 0,
    validCount: metrics.valid_count ?? metrics.validCount ?? 0,
    invalidCount: metrics.invalid_count ?? metrics.invalidCount ?? 0,
    pendingCount: metrics.pending_count ?? metrics.pendingCount ?? 0,
    aiMatchesFinalCount:
      metrics.ai_matches_final_count ?? metrics.aiMatchesFinalCount ?? 0,
    aiDiffersFromFinalCount:
      metrics.ai_differs_from_final_count ??
      metrics.aiDiffersFromFinalCount ??
      0,
    reviewerConsensusCount:
      metrics.reviewer_consensus_count ?? metrics.reviewerConsensusCount ?? 0,
    reviewerDisagreementCount:
      metrics.reviewer_disagreement_count ??
      metrics.reviewerDisagreementCount ??
      0,
    aiMatchesFinalRate:
      metrics.ai_matches_final_rate ?? metrics.aiMatchesFinalRate ?? null,
  };
}

export async function listActions() {
  const result = await impl.listActions();
  return {
    items: (result.items ?? []).map((action) => ({
      id: action.id,
      displayName: action.display_name ?? action.displayName,
      enabled: action.enabled,
      phase: action.phase,
    })),
  };
}

export async function uploadVideoAndCreateAnalysisJob(payload) {
  const result = await impl.uploadVideoAndCreateAnalysisJob(payload);

  return {
    videoId: result.video_id ?? result.videoId,
    analysisJobId: result.analysis_job_id ?? result.analysisJobId,
    status: result.status,
  };
}

export async function getAnalysisJob(analysisJobId) {
  const result = await impl.getAnalysisJob(analysisJobId);

  return {
    analysisJobId: result.analysis_job_id ?? result.analysisJobId,
    videoId: result.video_id ?? result.videoId,
    status: result.status,
    progress: result.progress,
    message: result.message,
    error: result.error,
  };
}

export async function getVideoSegments(videoId) {
  const result = await impl.getVideoSegments(videoId);

  return {
    videoId: result.video_id ?? result.videoId,
    actionType: result.action_type ?? result.actionType ?? null,
    items: (result.items ?? []).map(toCamelSegment),
  };
}

export async function saveSegmentReview(payload) {
  const result = await impl.saveSegmentReview(payload);

  return {
    segmentId: result.segment_id ?? result.segmentId,
    reviewerRole: result.reviewer_role ?? result.reviewerRole,
    saved: result.saved,
    reviewStatus: result.segment_review_status ?? result.reviewStatus,
    adjudication: result.adjudication,
  };
}

export async function updateSegmentMetadata(payload) {
  const result = await impl.updateSegmentMetadata(payload);

  return {
    segmentId: result.segment_id ?? result.segmentId,
    saved: result.saved,
    segment: result.segment ? toCamelSegment(result.segment) : null,
  };
}

export async function checkVideoReadiness(videoId) {
  const result = await impl.checkVideoReadiness(videoId);
  return toCamelReadiness(result);
}

export async function ingestVideo(videoId, requestedBy) {
  const result = await impl.ingestVideo(videoId, requestedBy);
  return toCamelIngest(result);
}

export async function getIngestBatch(ingestBatchId) {
  const result = await impl.getIngestBatch(ingestBatchId);
  return toCamelIngest(result);
}

export async function getVideoConsistency(videoId) {
  const result = await impl.getVideoConsistency(videoId);

  return {
    videoId: result.video_id ?? result.videoId,
    generatedAt: result.generated_at ?? result.generatedAt,
    metrics: toCamelConsistencyMetrics(result.metrics),
  };
}

export async function exportVideoDataset(videoId) {
  return impl.exportVideoDataset(videoId);
}

export const buildDefaultReviewerScore = impl.buildDefaultReviewerScore;
export const calibrationApiMode = API_MODE;
