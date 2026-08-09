import { createScoreFromTotal } from "../constants/scoring.js";

export function createAIScoreForSegment(actionType) {
  return {
    ...createScoreFromTotal(actionType, null),
    scoringStatus: "not_scored",
    scoreBasis: "pose_evidence_required",
    modelVersion: "unscored-segment-v1",
    comment:
      "No AI score is created from file names, notes, or reference labels. Load pose evidence to generate a separate explainable suggestion.",
  };
}
