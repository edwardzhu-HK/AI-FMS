function normalizeScore(score) {
  if (!score) {
    return null;
  }

  return {
    totalScore: score.totalScore,
    subscores: score.subscores ?? null,
  };
}

function scoreEqualsByTotal(left, right) {
  const a = normalizeScore(left);
  const b = normalizeScore(right);

  if (!a || !b) {
    return false;
  }

  return a.totalScore === b.totalScore;
}

export function adjudicateScores(aiScore, reviewerAScore, reviewerBScore) {
  const missingReviews = !reviewerAScore || !reviewerBScore;

  if (missingReviews) {
    return {
      labelStatus: "pending",
      labelSource: "none",
      finalScore: null,
    };
  }

  if (scoreEqualsByTotal(reviewerAScore, reviewerBScore)) {
    return {
      labelStatus: "valid",
      labelSource: "human_consensus",
      finalScore: normalizeScore(reviewerAScore),
    };
  }

  if (scoreEqualsByTotal(aiScore, reviewerAScore)) {
    return {
      labelStatus: "valid",
      labelSource: "ai_human_match",
      finalScore: normalizeScore(reviewerAScore),
    };
  }

  if (scoreEqualsByTotal(aiScore, reviewerBScore)) {
    return {
      labelStatus: "valid",
      labelSource: "ai_human_match",
      finalScore: normalizeScore(reviewerBScore),
    };
  }

  return {
    labelStatus: "invalid",
    labelSource: "none",
    finalScore: null,
  };
}

export function getSegmentReviewStatus(segment) {
  const hasA = Boolean(segment.reviewerScores.reviewer_a);
  const hasB = Boolean(segment.reviewerScores.reviewer_b);

  if (hasA && hasB) {
    return "completed";
  }

  if (hasA || hasB) {
    return "partial";
  }

  return "pending";
}

export function summarizeIngest(segments) {
  const summary = {
    segmentsTotal: segments.length,
    segmentsValid: 0,
    segmentsInvalid: 0,
  };

  for (const segment of segments) {
    const result = adjudicateScores(
      segment.aiScore,
      segment.reviewerScores.reviewer_a,
      segment.reviewerScores.reviewer_b,
    );

    if (result.labelStatus === "valid") {
      summary.segmentsValid += 1;
    }

    if (result.labelStatus === "invalid") {
      summary.segmentsInvalid += 1;
    }
  }

  return summary;
}
