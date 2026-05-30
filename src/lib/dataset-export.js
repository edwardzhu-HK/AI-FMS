import { adjudicateScores } from "./adjudication.js";
import {
  SCORE_BASIS_SCORESHEET_RAW,
  SCORE_SCOPE_REP_RAW,
  getActionRepPolicy,
  getActionRubricCriteria,
  normalizeClearingFindings,
  normalizeScoreForAction,
} from "../constants/scoring.js";
import {
  evaluateMovementEvidenceGate,
  getMovementCapabilities,
  getMovementCapability,
} from "./movement-adapters.js";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function toScoreSnapshot(score, actionType) {
  return score ? clone(normalizeScoreForAction(score, actionType)) : null;
}

function toReviewerScoreSnapshot(score, actionType) {
  const snapshot = toScoreSnapshot(score, actionType);

  if (!snapshot) {
    return null;
  }

  return {
    ...snapshot,
    scoreScope: snapshot.scoreScope ?? SCORE_SCOPE_REP_RAW,
    scoreBasis: snapshot.scoreBasis ?? SCORE_BASIS_SCORESHEET_RAW,
    usesCriteriaScores: snapshot.usesCriteriaScores ?? false,
  };
}

function toCapabilitySnapshot(actionType) {
  const capability = getMovementCapability(actionType);

  if (!capability) {
    return null;
  }

  return {
    posePipelineStatus: capability.posePipelineStatus,
    aiScoringStatus: capability.aiScoringStatus,
    supportsPoseTiming: capability.supportsPoseTiming,
    supportsPoseFeatures: capability.supportsPoseFeatures,
    supportsPoseSuggestion: capability.supportsPoseSuggestion,
    supportsAiDraftTiming: capability.supportsAiDraftTiming,
  };
}

function simplifyEvidenceGate(gate) {
  if (!gate) {
    return null;
  }

  return {
    status: gate.status,
    reasonCode: gate.reasonCode,
    canUsePoseEvidence: gate.canUsePoseEvidence,
    canShowPoseSuggestion: gate.canShowPoseSuggestion,
    timingStatus: gate.timingStatus,
    featureStatus: gate.featureStatus,
    suggestionStatus: gate.suggestionStatus,
  };
}

export function buildDatasetExport(video, segments) {
  const generatedAt = new Date().toISOString();

  return {
    schemaVersion: "ai_fms_dataset_v1_5_draft",
    generatedAt,
    video: {
      videoId: video.videoId,
      actionType: video.actionType,
      fileName: video.fileName,
      startSecond: video.startSecond,
      endSecond: video.endSecond,
      expectedReps: video.expectedReps ?? null,
      notes: video.notes ?? "",
      scoreScope: SCORE_SCOPE_REP_RAW,
      repPolicy: getActionRepPolicy(video.actionType),
      rubricCriteria: getActionRubricCriteria(video.actionType),
      movementCapability: toCapabilitySnapshot(video.actionType),
    },
    records: segments.map((segment) => {
      const aiScore = normalizeScoreForAction(
        segment.aiScore,
        segment.actionType,
      );
      const reviewerA = normalizeScoreForAction(
        segment.reviewerScores.reviewer_a,
        segment.actionType,
      );
      const reviewerB = normalizeScoreForAction(
        segment.reviewerScores.reviewer_b,
        segment.actionType,
      );
      const adjudication = adjudicateScores(aiScore, reviewerA, reviewerB);

      return {
        segmentId: segment.segmentId,
        videoId: segment.videoId,
        actionType: segment.actionType,
        repetitionIndex: segment.repetitionIndex,
        scoreScope: SCORE_SCOPE_REP_RAW,
        scoreAggregation: "none",
        repPolicy: getActionRepPolicy(segment.actionType),
        movementCapability: toCapabilitySnapshot(segment.actionType),
        cameraView: segment.cameraView,
        side: segment.side ?? "none",
        sideSource:
          segment.side && segment.side !== "none" && segment.side !== "unknown"
            ? "reviewer_or_metadata"
            : "unconfirmed",
        startSecond: segment.startSecond,
        endSecond: segment.endSecond,
        originalStartSecond: segment.originalStartSecond ?? segment.startSecond,
        originalEndSecond: segment.originalEndSecond ?? segment.endSecond,
        segmentSource: segment.segmentSource ?? "suggested",
        painFlag: Boolean(segment.painFlag),
        clearingTest: segment.clearingTest ?? "not_applicable",
        clearingFindings: normalizeClearingFindings(
          segment.actionType,
          segment.clearingFindings,
          segment.clearingTest,
        ),
        rubricVersion: segment.rubricVersion ?? "fms_v1.0",
        rubricCriteria: getActionRubricCriteria(segment.actionType),
        aiSuggestion: toScoreSnapshot(aiScore, segment.actionType),
        aiSideSuggestion: null,
        reviewerA: toReviewerScoreSnapshot(reviewerA, segment.actionType),
        reviewerB: toReviewerScoreSnapshot(reviewerB, segment.actionType),
        finalLabel: adjudication.finalScore,
        labelStatus: adjudication.labelStatus,
        adjudicationSource: adjudication.labelSource,
        reviewStatus: segment.reviewStatus,
      };
    }),
  };
}

function mapBySegmentId(items = []) {
  return new Map(
    items
      .filter((item) => item?.segmentId)
      .map((item) => [item.segmentId, clone(item)]),
  );
}

function simplifyTimingItem(item) {
  if (!item) {
    return null;
  }

  return {
    status: item.status,
    label: item.label,
    currentStartSecond: item.currentStartSecond,
    currentEndSecond: item.currentEndSecond,
    suggestedStartSecond: item.cycle?.startSecond ?? null,
    suggestedEndSecond: item.cycle?.endSecond ?? null,
    lowestPointSecond: item.cycle?.lowestPointSecond ?? null,
    issues: clone(item.issues ?? []),
    metrics: clone(item.metrics ?? null),
  };
}

function simplifyFeatureItem(item) {
  if (!item) {
    return null;
  }

  return {
    status: item.status,
    sourceSecond: item.sourceSecond ?? null,
    ratings: clone(item.ratings ?? {}),
    metrics: clone(item.metrics ?? {}),
  };
}

function simplifySideSuggestion(item) {
  if (!item) {
    return null;
  }

  const side = item.metrics?.side ?? item.metrics?.frontSide ?? null;
  const rating = item.ratings?.sideConfidence ?? item.ratings?.sideContext;

  if (!side && !rating) {
    return null;
  }

  return {
    source: "pose_features",
    side,
    status: rating?.status ?? null,
    label: rating?.label ?? null,
    sourceSecond: item.sourceSecond ?? null,
  };
}

function simplifySuggestionItem(item) {
  if (!item) {
    return null;
  }

  return {
    status: item.status,
    totalScore: item.totalScore,
    subscores: clone(item.subscores),
    criteriaScores: clone(item.criteriaScores ?? []),
    confidence: item.confidence,
    confidenceLabel: item.confidenceLabel,
    reasons: clone(item.reasons ?? []),
    modelVersion: item.modelVersion ?? null,
  };
}

export function attachPoseEvidenceToDataset(dataset, options = {}) {
  const {
    poseFileName = "",
    poseSummary = null,
    timingReport = null,
    featureReport = null,
    suggestionReport = null,
    implementedPoseActionTypes = ["deep_squat"],
    movementCapabilities = getMovementCapabilities(),
    plannedActionTypes = [],
  } = options;

  const timingBySegment = mapBySegmentId(timingReport?.items);
  const featureBySegment = mapBySegmentId(featureReport?.items);
  const suggestionBySegment = mapBySegmentId(suggestionReport?.items);
  const hasPoseEvidence =
    poseSummary ||
    timingBySegment.size > 0 ||
    featureBySegment.size > 0 ||
    suggestionBySegment.size > 0;

  if (!hasPoseEvidence) {
    return clone(dataset);
  }

  const exported = clone(dataset);
  exported.poseEvidence = {
    schemaVersion: "ai_fms_pose_evidence_v1_draft",
    source: "client_uploaded_pose_json",
    poseFileName,
    poseSummary: poseSummary ? clone(poseSummary) : null,
    implementedPoseActionTypes,
    movementCapabilities: clone(movementCapabilities),
    plannedActionTypes,
    reports: {
      timingSummary: timingReport?.summary ? clone(timingReport.summary) : null,
      featureSummary: featureReport?.summary
        ? clone(featureReport.summary)
        : null,
      suggestionSummary: suggestionReport?.summary
        ? clone(suggestionReport.summary)
        : null,
    },
    limitations:
      "Raw landmark frames are not embedded. This export stores traceable pose-derived evidence for reviewer inspection and future dataset training.",
  };

  exported.records = exported.records.map((record) => {
    const aiSideSuggestion = simplifySideSuggestion(
      featureBySegment.get(record.segmentId),
    );
    const evidenceGate = evaluateMovementEvidenceGate({
      actionType: record.actionType,
      segmentId: record.segmentId,
      poseSummary,
      timingReport,
      featureReport,
      suggestionReport,
    });

    return {
      ...record,
      sideSource:
        record.sideSource === "unconfirmed" && aiSideSuggestion?.side
          ? "ai_suggested"
          : record.sideSource,
      poseTiming: simplifyTimingItem(timingBySegment.get(record.segmentId)),
      poseFeatures: simplifyFeatureItem(featureBySegment.get(record.segmentId)),
      aiSideSuggestion,
      poseSuggestion: simplifySuggestionItem(
        suggestionBySegment.get(record.segmentId),
      ),
      poseEvidenceGate: simplifyEvidenceGate(evidenceGate),
    };
  });

  return exported;
}
