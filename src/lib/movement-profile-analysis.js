const QUALITY_FEATURE_NAMES = new Set([
  "avgVisibility",
  "timingCoverageRatio",
  "sideVisibility",
  "sideConfidence",
  "timingVisibility",
]);

function round(value, digits = 6) {
  return Number.isFinite(value) ? Number(value.toFixed(digits)) : null;
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function quantile(sortedValues, probability) {
  if (!sortedValues.length) {
    return null;
  }
  const position = (sortedValues.length - 1) * probability;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  if (lowerIndex === upperIndex) {
    return sortedValues[lowerIndex];
  }
  const weight = position - lowerIndex;
  return (
    sortedValues[lowerIndex] * (1 - weight) + sortedValues[upperIndex] * weight
  );
}

function describeFeature(rows, featureName) {
  const values = rows
    .map((row) => row.features[featureName])
    .filter(Number.isFinite)
    .sort((left, right) => left - right);
  if (!values.length) {
    return {
      count: 0,
      missingCount: rows.length,
      min: null,
      q1: null,
      median: null,
      mean: null,
      q3: null,
      max: null,
      standardDeviation: null,
    };
  }
  const average = mean(values);
  const variance =
    values.length > 1
      ? values.reduce((sum, value) => sum + (value - average) ** 2, 0) /
        (values.length - 1)
      : null;
  return {
    count: values.length,
    missingCount: rows.length - values.length,
    min: round(values[0]),
    q1: round(quantile(values, 0.25)),
    median: round(quantile(values, 0.5)),
    mean: round(average),
    q3: round(quantile(values, 0.75)),
    max: round(values.at(-1)),
    standardDeviation: variance == null ? null : round(Math.sqrt(variance)),
  };
}

function featureDefinitions(featureContract, actionType) {
  const action = featureContract.actions?.[actionType];
  if (!action) {
    throw new Error(`feature contract is missing ${actionType}.`);
  }
  return Object.fromEntries(
    action.features.map((feature) => [
      feature.name,
      {
        unit: feature.unit,
        direction: feature.direction,
        role: QUALITY_FEATURE_NAMES.has(feature.name) ? "quality" : "movement",
      },
    ]),
  );
}

function latestConsensusRows(agreement, featureMatrix, featureContract) {
  const matrixByRepetition = new Map(
    featureMatrix.rows.map((row) => [row.repetitionId, row]),
  );
  return agreement.analysis.comparisonRows
    .filter(
      (row) =>
        row.leftStatus === "scored" &&
        row.rightStatus === "scored" &&
        row.leftScore === row.rightScore,
    )
    .map((reviewRow) => {
      const featureRow = matrixByRepetition.get(reviewRow.repetitionId);
      if (!featureRow) {
        throw new Error(`feature matrix is missing ${reviewRow.repetitionId}.`);
      }
      if (featureRow.actionType !== reviewRow.actionType) {
        throw new Error(
          `action mismatch for ${reviewRow.repetitionId}: ${reviewRow.actionType} versus ${featureRow.actionType}.`,
        );
      }
      featureDefinitions(featureContract, featureRow.actionType);
      return {
        repetitionId: reviewRow.repetitionId,
        ingestId: reviewRow.ingestId,
        videoId: featureRow.videoId,
        actionType: reviewRow.actionType,
        consensusScore: reviewRow.leftScore,
        reviewerEvidence: {
          leftReviewerId: reviewRow.leftReviewerId,
          leftConfidence: reviewRow.leftConfidence,
          rightReviewerId: reviewRow.rightReviewerId,
          rightConfidence: reviewRow.rightConfidence,
        },
        repetitionIndex: featureRow.repetitionIndex,
        cameraView: featureRow.cameraView,
        side: featureRow.side,
        startSecond: featureRow.startSecond,
        endSecond: featureRow.endSecond,
        poseSha256: featureRow.poseSha256,
        poseModel: featureRow.poseModel,
        featureContractVersion: featureRow.featureContractVersion,
        featureSourceSecond: featureRow.featureSourceSecond,
        features: featureRow.features,
        qualifiers: featureRow.qualifiers,
        ratings: featureRow.ratings,
        quality: featureRow.quality,
      };
    });
}

function featureStatistics(rows, definitions) {
  return Object.fromEntries(
    Object.entries(definitions).map(([featureName, definition]) => [
      featureName,
      {
        ...definition,
        ...describeFeature(rows, featureName),
      },
    ]),
  );
}

function scoreGroupSummary(rows, definitions) {
  const groups = Object.groupBy(rows, (row) => row.consensusScore);
  return Object.fromEntries(
    Object.entries(groups)
      .sort(([left], [right]) => Number(left) - Number(right))
      .map(([score, scoreRows]) => [
        score,
        {
          count: scoreRows.length,
          videoCount: new Set(scoreRows.map((row) => row.videoId)).size,
          featureStatistics: featureStatistics(scoreRows, definitions),
        },
      ]),
  );
}

function pooledHedgesG(leftValues, rightValues) {
  if (leftValues.length < 2 || rightValues.length < 2) {
    return null;
  }
  const leftMean = mean(leftValues);
  const rightMean = mean(rightValues);
  const leftVariance =
    leftValues.reduce((sum, value) => sum + (value - leftMean) ** 2, 0) /
    (leftValues.length - 1);
  const rightVariance =
    rightValues.reduce((sum, value) => sum + (value - rightMean) ** 2, 0) /
    (rightValues.length - 1);
  const degreesOfFreedom = leftValues.length + rightValues.length - 2;
  const pooledVariance =
    ((leftValues.length - 1) * leftVariance +
      (rightValues.length - 1) * rightVariance) /
    degreesOfFreedom;
  if (pooledVariance <= 0) {
    return null;
  }
  const correction = 1 - 3 / (4 * (leftValues.length + rightValues.length) - 9);
  return round(
    correction * ((rightMean - leftMean) / Math.sqrt(pooledVariance)),
    4,
  );
}

function buildScoreContrasts(rows, definitions) {
  const scoreGroups = Object.groupBy(rows, (row) => row.consensusScore);
  const scores = Object.keys(scoreGroups)
    .map(Number)
    .sort((left, right) => left - right);
  if (scores.length !== 2) {
    return null;
  }
  const [lowerScore, higherScore] = scores;
  const lowerRows = scoreGroups[lowerScore];
  const higherRows = scoreGroups[higherScore];
  const lowerVideos = new Set(lowerRows.map((row) => row.videoId));
  const higherVideos = new Set(higherRows.map((row) => row.videoId));
  const fullyConfoundedByVideo = [...lowerVideos].every(
    (videoId) => !higherVideos.has(videoId),
  );
  const features = Object.fromEntries(
    Object.entries(definitions)
      .filter(([, definition]) => definition.role === "movement")
      .map(([featureName, definition]) => {
        const lowerValues = lowerRows
          .map((row) => row.features[featureName])
          .filter(Number.isFinite);
        const higherValues = higherRows
          .map((row) => row.features[featureName])
          .filter(Number.isFinite);
        return [
          featureName,
          {
            ...definition,
            lowerScoreMean: lowerValues.length
              ? round(mean(lowerValues))
              : null,
            higherScoreMean: higherValues.length
              ? round(mean(higherValues))
              : null,
            meanDifference:
              lowerValues.length && higherValues.length
                ? round(mean(higherValues) - mean(lowerValues))
                : null,
            hedgesG: pooledHedgesG(lowerValues, higherValues),
          },
        ];
      }),
  );
  return {
    lowerScore,
    higherScore,
    lowerCount: lowerRows.length,
    higherCount: higherRows.length,
    lowerVideoCount: lowerVideos.size,
    higherVideoCount: higherVideos.size,
    fullyConfoundedByVideo,
    interpretation: "exploratory_descriptive_only",
    features,
  };
}

function standardizationByFeature(rows, definitions) {
  return Object.fromEntries(
    Object.entries(definitions)
      .filter(([, definition]) => definition.role === "movement")
      .map(([featureName]) => {
        const values = rows
          .map((row) => row.features[featureName])
          .filter(Number.isFinite);
        if (values.length < 2) {
          return [featureName, null];
        }
        const average = mean(values);
        const variance =
          values.reduce((sum, value) => sum + (value - average) ** 2, 0) /
          (values.length - 1);
        return [
          featureName,
          variance > 0
            ? { mean: average, standardDeviation: Math.sqrt(variance) }
            : null,
        ];
      }),
  );
}

function comparePair(left, right, definitions, standardization) {
  const differences = Object.entries(definitions)
    .filter(([, definition]) => definition.role === "movement")
    .flatMap(([featureName, definition]) => {
      const leftValue = left.features[featureName];
      const rightValue = right.features[featureName];
      const scale = standardization[featureName];
      if (
        !Number.isFinite(leftValue) ||
        !Number.isFinite(rightValue) ||
        !scale
      ) {
        return [];
      }
      const standardizedDifference =
        Math.abs(leftValue - rightValue) / scale.standardDeviation;
      return [
        {
          featureName,
          unit: definition.unit,
          direction: definition.direction,
          leftValue,
          rightValue,
          standardizedDifference: round(standardizedDifference, 4),
        },
      ];
    })
    .sort(
      (leftDifference, rightDifference) =>
        rightDifference.standardizedDifference -
        leftDifference.standardizedDifference,
    );
  if (differences.length < 2) {
    return null;
  }
  const distance = Math.sqrt(
    differences.reduce(
      (sum, difference) => sum + difference.standardizedDifference ** 2,
      0,
    ) / differences.length,
  );
  return {
    left,
    right,
    crossVideo: left.videoId !== right.videoId,
    sharedFeatureCount: differences.length,
    standardizedDistance: round(distance, 4),
    topDifferences: differences.slice(0, 3),
  };
}

function buildCaseStudyCandidates(rows, definitions) {
  const standardization = standardizationByFeature(rows, definitions);
  const scoreGroups = Object.groupBy(rows, (row) => row.consensusScore);
  return Object.entries(scoreGroups)
    .sort(([left], [right]) => Number(left) - Number(right))
    .flatMap(([score, scoreRows]) => {
      const pairs = [];
      for (let leftIndex = 0; leftIndex < scoreRows.length; leftIndex += 1) {
        for (
          let rightIndex = leftIndex + 1;
          rightIndex < scoreRows.length;
          rightIndex += 1
        ) {
          const pair = comparePair(
            scoreRows[leftIndex],
            scoreRows[rightIndex],
            definitions,
            standardization,
          );
          if (pair) {
            pairs.push(pair);
          }
        }
      }
      if (!pairs.length) {
        return [];
      }
      const crossVideoPairs = pairs.filter((pair) => pair.crossVideo);
      const eligiblePairs = crossVideoPairs.length ? crossVideoPairs : pairs;
      const selected = eligiblePairs.sort(
        (leftPair, rightPair) =>
          rightPair.standardizedDistance - leftPair.standardizedDistance,
      )[0];
      return [
        {
          score: Number(score),
          crossVideoPreferred: crossVideoPairs.length > 0,
          sameVideoLimitation: !selected.crossVideo,
          leftRepetitionId: selected.left.repetitionId,
          leftVideoId: selected.left.videoId,
          rightRepetitionId: selected.right.repetitionId,
          rightVideoId: selected.right.videoId,
          sharedFeatureCount: selected.sharedFeatureCount,
          standardizedDistance: selected.standardizedDistance,
          topDifferences: selected.topDifferences,
        },
      ];
    });
}

function validateInputs(agreement, featureMatrix, featureContract) {
  if (!Array.isArray(agreement?.analysis?.comparisonRows)) {
    throw new Error("agreement comparison rows are required.");
  }
  if (!Array.isArray(featureMatrix?.rows)) {
    throw new Error("feature matrix rows are required.");
  }
  if (!featureContract?.actions) {
    throw new Error("feature contract actions are required.");
  }
}

export function summarizeMovementProfiles({
  agreement,
  featureMatrix,
  featureContract,
}) {
  validateInputs(agreement, featureMatrix, featureContract);
  const rows = latestConsensusRows(agreement, featureMatrix, featureContract);
  const actionTypes = [...new Set(rows.map((row) => row.actionType))].sort();
  const byAction = Object.fromEntries(
    actionTypes.map((actionType) => {
      const actionRows = rows.filter((row) => row.actionType === actionType);
      const definitions = featureDefinitions(featureContract, actionType);
      return [
        actionType,
        {
          count: actionRows.length,
          videoCount: new Set(actionRows.map((row) => row.videoId)).size,
          readyCount: actionRows.filter(
            (row) => row.quality?.analysisReadiness === "ready",
          ).length,
          featureDefinitions: definitions,
          featureStatistics: featureStatistics(actionRows, definitions),
          scoreGroups: scoreGroupSummary(actionRows, definitions),
          scoreContrast: buildScoreContrasts(actionRows, definitions),
          caseStudyCandidates: buildCaseStudyCandidates(
            actionRows,
            definitions,
          ),
        },
      ];
    }),
  );
  return {
    pilotId: agreement.analysis.pilotId,
    studyRound: agreement.analysis.studyRound,
    reviewers: agreement.analysis.reviewers,
    consensusDefinition:
      "both_reviewers_scored_and_assigned_identical_raw_score",
    consensusCount: rows.length,
    videoCount: new Set(rows.map((row) => row.videoId)).size,
    featureReadyCount: rows.filter(
      (row) => row.quality?.analysisReadiness === "ready",
    ).length,
    rows,
    byAction,
  };
}

export { QUALITY_FEATURE_NAMES };
