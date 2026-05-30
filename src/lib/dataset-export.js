import { adjudicateScores } from "./adjudication.js";
import { getActionRubricCriteria } from "../constants/scoring.js";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function toScoreSnapshot(score) {
  return score ? clone(score) : null;
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
      rubricCriteria: getActionRubricCriteria(video.actionType),
    },
    records: segments.map((segment) => {
      const adjudication = adjudicateScores(
        segment.aiScore,
        segment.reviewerScores.reviewer_a,
        segment.reviewerScores.reviewer_b,
      );

      return {
        segmentId: segment.segmentId,
        videoId: segment.videoId,
        actionType: segment.actionType,
        repetitionIndex: segment.repetitionIndex,
        cameraView: segment.cameraView,
        side: segment.side ?? "none",
        startSecond: segment.startSecond,
        endSecond: segment.endSecond,
        originalStartSecond: segment.originalStartSecond ?? segment.startSecond,
        originalEndSecond: segment.originalEndSecond ?? segment.endSecond,
        segmentSource: segment.segmentSource ?? "suggested",
        painFlag: Boolean(segment.painFlag),
        clearingTest: segment.clearingTest ?? "not_applicable",
        rubricVersion: segment.rubricVersion ?? "fms_v1.0",
        rubricCriteria: getActionRubricCriteria(segment.actionType),
        aiSuggestion: toScoreSnapshot(segment.aiScore),
        reviewerA: toScoreSnapshot(segment.reviewerScores.reviewer_a),
        reviewerB: toScoreSnapshot(segment.reviewerScores.reviewer_b),
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

function simplifySuggestionItem(item) {
  if (!item) {
    return null;
  }

  return {
    status: item.status,
    totalScore: item.totalScore,
    subscores: clone(item.subscores),
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

  exported.records = exported.records.map((record) => ({
    ...record,
    poseTiming: simplifyTimingItem(timingBySegment.get(record.segmentId)),
    poseFeatures: simplifyFeatureItem(featureBySegment.get(record.segmentId)),
    poseSuggestion: simplifySuggestionItem(
      suggestionBySegment.get(record.segmentId),
    ),
  }));

  return exported;
}
