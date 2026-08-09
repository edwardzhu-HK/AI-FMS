import { QUALITY_FEATURE_NAMES } from "./movement-profile-analysis.js";

const MAX_ROBUST_Z = 4;

function round(value, digits = 4) {
  return Number.isFinite(value) ? Number(value.toFixed(digits)) : null;
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values) {
  if (!values.length) {
    return null;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function standardDeviation(values) {
  if (values.length < 2) {
    return null;
  }
  const average = mean(values);
  return Math.sqrt(
    values.reduce((sum, value) => sum + (value - average) ** 2, 0) /
      (values.length - 1),
  );
}

function featureDefinitions(featureContract, actionType) {
  const action = featureContract.actions?.[actionType];
  if (!action) {
    throw new Error(`feature contract is missing ${actionType}.`);
  }
  return Object.fromEntries(
    action.features
      .filter((feature) => !QUALITY_FEATURE_NAMES.has(feature.name))
      .map((feature) => [
        feature.name,
        {
          unit: feature.unit,
          direction: feature.direction,
        },
      ]),
  );
}

function buildStandardization(rows, featureNames) {
  return Object.fromEntries(
    featureNames.map((featureName) => {
      const values = rows
        .map((row) => row.features[featureName])
        .filter(Number.isFinite);
      const center = median(values);
      const absoluteDeviations = values.map((value) =>
        Math.abs(value - center),
      );
      const robustScale = median(absoluteDeviations) * 1.4826;
      const fallbackScale = standardDeviation(values);
      const scale = robustScale > 0 ? robustScale : fallbackScale;
      return [
        featureName,
        {
          center: round(center, 6),
          scale: scale > 0 ? round(scale, 6) : null,
          method: robustScale > 0 ? "median_mad" : "median_sd_fallback",
          availableCount: values.length,
          missingCount: rows.length - values.length,
        },
      ];
    }),
  );
}

function buildVector(row, featureNames, standardization) {
  return Object.fromEntries(
    featureNames.map((featureName) => {
      const value = row.features[featureName];
      const rule = standardization[featureName];
      if (!Number.isFinite(value) || !rule.scale) {
        return [featureName, null];
      }
      const robustZ = (value - rule.center) / rule.scale;
      return [
        featureName,
        round(Math.max(-MAX_ROBUST_Z, Math.min(MAX_ROBUST_Z, robustZ))),
      ];
    }),
  );
}

function vectorDistance(left, right, minimumSharedFeatures) {
  const differences = Object.keys(left).flatMap((featureName) => {
    const leftValue = left[featureName];
    const rightValue = right[featureName];
    return Number.isFinite(leftValue) && Number.isFinite(rightValue)
      ? [(leftValue - rightValue) ** 2]
      : [];
  });
  if (differences.length < minimumSharedFeatures) {
    return null;
  }
  return Math.sqrt(mean(differences));
}

function chooseGroupCount(rowCount) {
  if (rowCount >= 24) {
    return 3;
  }
  return rowCount >= 6 ? 2 : 1;
}

function distanceLookup(rows, minimumSharedFeatures) {
  const lookup = new Map();
  for (const left of rows) {
    const distances = new Map();
    for (const right of rows) {
      distances.set(
        right.repetitionId,
        left.repetitionId === right.repetitionId
          ? 0
          : vectorDistance(left.zScores, right.zScores, minimumSharedFeatures),
      );
    }
    lookup.set(left.repetitionId, distances);
  }
  return lookup;
}

function distanceBetween(lookup, leftId, rightId) {
  return lookup.get(leftId)?.get(rightId) ?? null;
}

function totalDistance(candidate, rows, lookup) {
  const distances = rows
    .map((row) =>
      distanceBetween(lookup, candidate.repetitionId, row.repetitionId),
    )
    .filter(Number.isFinite);
  return distances.length ? mean(distances) : Number.POSITIVE_INFINITY;
}

function initializeMedoids(rows, groupCount, lookup) {
  const sortedRows = [...rows].sort((left, right) =>
    left.repetitionId.localeCompare(right.repetitionId),
  );
  const first = sortedRows.reduce((best, candidate) => {
    const candidateDistance = totalDistance(candidate, rows, lookup);
    const bestDistance = totalDistance(best, rows, lookup);
    return candidateDistance < bestDistance ? candidate : best;
  });
  const medoids = [first];
  while (medoids.length < groupCount) {
    const candidates = sortedRows.filter(
      (row) =>
        !medoids.some((medoid) => medoid.repetitionId === row.repetitionId),
    );
    const next = candidates.reduce((best, candidate) => {
      const candidateMinimum = Math.min(
        ...medoids
          .map((medoid) =>
            distanceBetween(
              lookup,
              candidate.repetitionId,
              medoid.repetitionId,
            ),
          )
          .filter(Number.isFinite),
      );
      const bestMinimum = Math.min(
        ...medoids
          .map((medoid) =>
            distanceBetween(lookup, best.repetitionId, medoid.repetitionId),
          )
          .filter(Number.isFinite),
      );
      return candidateMinimum > bestMinimum ? candidate : best;
    });
    medoids.push(next);
  }
  return medoids;
}

function assignRows(rows, medoids, lookup) {
  return rows.map((row) => {
    const candidates = medoids
      .map((medoid) => ({
        medoid,
        distance: distanceBetween(
          lookup,
          row.repetitionId,
          medoid.repetitionId,
        ),
      }))
      .filter((candidate) => Number.isFinite(candidate.distance))
      .sort(
        (left, right) =>
          left.distance - right.distance ||
          left.medoid.repetitionId.localeCompare(right.medoid.repetitionId),
      );
    if (!candidates.length) {
      throw new Error(`No comparable medoid for ${row.repetitionId}.`);
    }
    return {
      ...row,
      medoidId: candidates[0].medoid.repetitionId,
      distanceToMedoid: round(candidates[0].distance),
    };
  });
}

function updateMedoids(assignments, medoids, lookup) {
  return medoids.map((medoid) => {
    const clusterRows = assignments.filter(
      (row) => row.medoidId === medoid.repetitionId,
    );
    if (!clusterRows.length) {
      return medoid;
    }
    return [...clusterRows]
      .sort((left, right) =>
        left.repetitionId.localeCompare(right.repetitionId),
      )
      .reduce((best, candidate) =>
        totalDistance(candidate, clusterRows, lookup) <
        totalDistance(best, clusterRows, lookup)
          ? candidate
          : best,
      );
  });
}

function deterministicKMedoids(rows, groupCount, lookup) {
  let medoids = initializeMedoids(rows, groupCount, lookup);
  for (let iteration = 0; iteration < 20; iteration += 1) {
    const assignments = assignRows(rows, medoids, lookup);
    const nextMedoids = updateMedoids(assignments, medoids, lookup);
    if (
      nextMedoids.every(
        (medoid, index) => medoid.repetitionId === medoids[index].repetitionId,
      )
    ) {
      medoids = nextMedoids;
      break;
    }
    medoids = nextMedoids;
  }
  const orderedMedoids = [...medoids].sort((left, right) =>
    left.repetitionId.localeCompare(right.repetitionId),
  );
  const groupByMedoid = new Map(
    orderedMedoids.map((medoid, index) => [
      medoid.repetitionId,
      `profile_${index + 1}`,
    ]),
  );
  return assignRows(rows, orderedMedoids, lookup).map((row) => ({
    ...row,
    profileGroup: groupByMedoid.get(row.medoidId),
  }));
}

function silhouetteForRow(row, assignments, lookup) {
  const sameGroup = assignments.filter(
    (candidate) =>
      candidate.profileGroup === row.profileGroup &&
      candidate.repetitionId !== row.repetitionId,
  );
  if (!sameGroup.length) {
    return null;
  }
  const within = sameGroup
    .map((candidate) =>
      distanceBetween(lookup, row.repetitionId, candidate.repetitionId),
    )
    .filter(Number.isFinite);
  const otherGroups = Object.values(
    Object.groupBy(
      assignments.filter(
        (candidate) => candidate.profileGroup !== row.profileGroup,
      ),
      (candidate) => candidate.profileGroup,
    ),
  );
  const between = otherGroups
    .map((groupRows) =>
      groupRows
        .map((candidate) =>
          distanceBetween(lookup, row.repetitionId, candidate.repetitionId),
        )
        .filter(Number.isFinite),
    )
    .filter((distances) => distances.length)
    .map(mean);
  if (!within.length || !between.length) {
    return null;
  }
  const a = mean(within);
  const b = Math.min(...between);
  return Math.max(a, b) > 0 ? round((b - a) / Math.max(a, b)) : 0;
}

function characterizeGroups(assignments, featureNames) {
  return Object.fromEntries(
    Object.entries(Object.groupBy(assignments, (row) => row.profileGroup)).map(
      ([profileGroup, rows]) => {
        const videoCounts = Object.fromEntries(
          Object.entries(Object.groupBy(rows, (row) => row.videoId)).map(
            ([videoId, videoRows]) => [videoId, videoRows.length],
          ),
        );
        const maxVideoShare =
          Math.max(...Object.values(videoCounts)) / rows.length;
        const featureSignals = featureNames
          .map((featureName) => ({
            featureName,
            medianRobustZ: round(
              median(
                rows
                  .map((row) => row.zScores[featureName])
                  .filter(Number.isFinite),
              ),
            ),
          }))
          .filter((feature) => Number.isFinite(feature.medianRobustZ))
          .sort(
            (left, right) =>
              Math.abs(right.medianRobustZ) - Math.abs(left.medianRobustZ),
          );
        return [
          profileGroup,
          {
            count: rows.length,
            sourceVideoCount: Object.keys(videoCounts).length,
            videoCounts,
            maxVideoShare: round(maxVideoShare),
            sourceConcentrationFlag:
              Object.keys(videoCounts).length === 1 || maxVideoShare >= 0.75,
            medoidId: rows[0].medoidId,
            characteristicFeatures: featureSignals.slice(0, 3),
          },
        ];
      },
    ),
  );
}

function describeDistances(values) {
  if (!values.length) {
    return { count: 0, mean: null, median: null, min: null, max: null };
  }
  return {
    count: values.length,
    mean: round(mean(values)),
    median: round(median(values)),
    min: round(Math.min(...values)),
    max: round(Math.max(...values)),
  };
}

function sourceVideoEffect(rows, lookup) {
  const within = [];
  const between = [];
  for (let leftIndex = 0; leftIndex < rows.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < rows.length;
      rightIndex += 1
    ) {
      const distance = distanceBetween(
        lookup,
        rows[leftIndex].repetitionId,
        rows[rightIndex].repetitionId,
      );
      if (!Number.isFinite(distance)) {
        continue;
      }
      if (rows[leftIndex].videoId === rows[rightIndex].videoId) {
        within.push(distance);
      } else {
        between.push(distance);
      }
    }
  }
  const withinSummary = describeDistances(within);
  const betweenSummary = describeDistances(between);
  const medianRatio =
    Number.isFinite(withinSummary.median) && betweenSummary.median > 0
      ? round(withinSummary.median / betweenSummary.median)
      : null;
  let flag = "not_estimable";
  if (Number.isFinite(medianRatio)) {
    flag =
      medianRatio < 0.6
        ? "strong_source_video_signature"
        : medianRatio < 0.85
          ? "moderate_source_video_signature"
          : "weak_source_video_signature";
  }
  return {
    withinVideo: withinSummary,
    betweenVideo: betweenSummary,
    withinToBetweenMedianRatio: medianRatio,
    heuristicFlag: flag,
  };
}

function outlierScore(row) {
  const values = Object.values(row.zScores).filter(Number.isFinite);
  return values.length
    ? round(Math.sqrt(mean(values.map((value) => value ** 2))))
    : null;
}

function clusterQuality(meanSilhouette) {
  if (!Number.isFinite(meanSilhouette)) {
    return "not_estimable";
  }
  if (meanSilhouette >= 0.5) {
    return "strong_separation_exploratory";
  }
  if (meanSilhouette >= 0.25) {
    return "moderate_separation_exploratory";
  }
  return "weak_separation_do_not_name_as_discrete_phenotypes";
}

function prepareRows(sourceRows, actionType, featureNames, standardization) {
  return sourceRows.map((row) => ({
    repetitionId: row.repetitionId,
    videoId: row.videoId,
    actionType,
    researchTier: row.researchTier,
    features: Object.fromEntries(
      featureNames.map((featureName) => [
        featureName,
        row.features[featureName] ?? null,
      ]),
    ),
    zScores: buildVector(row, featureNames, standardization),
  }));
}

function coassignmentAgreement(fullAssignments, rerunAssignments) {
  const fullById = new Map(
    fullAssignments.map((row) => [row.repetitionId, row.profileGroup]),
  );
  let comparisons = 0;
  let matches = 0;
  for (let leftIndex = 0; leftIndex < rerunAssignments.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < rerunAssignments.length;
      rightIndex += 1
    ) {
      const left = rerunAssignments[leftIndex];
      const right = rerunAssignments[rightIndex];
      const fullSame =
        fullById.get(left.repetitionId) === fullById.get(right.repetitionId);
      const rerunSame = left.profileGroup === right.profileGroup;
      comparisons += 1;
      if (fullSame === rerunSame) {
        matches += 1;
      }
    }
  }
  return comparisons ? matches / comparisons : null;
}

function stabilityFlag(meanAgreement, minimumAgreement) {
  if (!Number.isFinite(meanAgreement) || !Number.isFinite(minimumAgreement)) {
    return "not_estimable";
  }
  if (meanAgreement >= 0.8 && minimumAgreement >= 0.75) {
    return "high_leave_one_video_out_agreement";
  }
  if (meanAgreement >= 0.65 && minimumAgreement >= 0.65) {
    return "moderate_leave_one_video_out_agreement";
  }
  return "low_leave_one_video_out_agreement";
}

function leaveOneVideoOutStability({
  sourceRows,
  actionType,
  featureNames,
  groupCount,
  fullAssignments,
  minimumSharedFeatures,
}) {
  const videoIds = [...new Set(sourceRows.map((row) => row.videoId))].sort();
  if (videoIds.length < 3) {
    return {
      status: "not_estimable_fewer_than_three_source_videos",
      meanCoassignmentAgreement: null,
      minimumCoassignmentAgreement: null,
      maximumCoassignmentAgreement: null,
      runs: [],
    };
  }
  const runs = videoIds.flatMap((excludedVideoId) => {
    const remaining = sourceRows.filter(
      (row) => row.videoId !== excludedVideoId,
    );
    if (remaining.length < groupCount * 2) {
      return [];
    }
    const standardization = buildStandardization(remaining, featureNames);
    const prepared = prepareRows(
      remaining,
      actionType,
      featureNames,
      standardization,
    );
    const lookup = distanceLookup(prepared, minimumSharedFeatures);
    const rerunAssignments = deterministicKMedoids(
      prepared,
      groupCount,
      lookup,
    );
    return [
      {
        excludedVideoId,
        remainingReps: remaining.length,
        coassignmentAgreement: round(
          coassignmentAgreement(fullAssignments, rerunAssignments),
        ),
      },
    ];
  });
  const agreements = runs
    .map((run) => run.coassignmentAgreement)
    .filter(Number.isFinite);
  const average = agreements.length ? round(mean(agreements)) : null;
  const minimum = agreements.length ? round(Math.min(...agreements)) : null;
  return {
    status: stabilityFlag(average, minimum),
    meanCoassignmentAgreement: average,
    minimumCoassignmentAgreement: minimum,
    maximumCoassignmentAgreement: agreements.length
      ? round(Math.max(...agreements))
      : null,
    runs,
  };
}

function analyzeAction(actionType, sourceRows, featureContract) {
  const definitions = featureDefinitions(featureContract, actionType);
  const featureNames = Object.keys(definitions);
  const standardization = buildStandardization(sourceRows, featureNames);
  const rows = prepareRows(
    sourceRows,
    actionType,
    featureNames,
    standardization,
  );
  const minimumSharedFeatures = Math.max(2, Math.ceil(featureNames.length / 2));
  const lookup = distanceLookup(rows, minimumSharedFeatures);
  const groupCount = chooseGroupCount(rows.length);
  let assignments = deterministicKMedoids(rows, groupCount, lookup).map(
    (row) => ({
      ...row,
      outlierScore: outlierScore(row),
    }),
  );
  const rankedOutliers = [...assignments].sort(
    (left, right) =>
      right.outlierScore - left.outlierScore ||
      left.repetitionId.localeCompare(right.repetitionId),
  );
  const outlierRank = new Map(
    rankedOutliers.map((row, index) => [row.repetitionId, index + 1]),
  );
  assignments = assignments.map((row) => ({
    ...row,
    outlierRank: outlierRank.get(row.repetitionId),
    silhouette: silhouetteForRow(row, assignments, lookup),
  }));
  const silhouetteValues = assignments
    .map((row) => row.silhouette)
    .filter(Number.isFinite);
  const meanSilhouette = silhouetteValues.length
    ? round(mean(silhouetteValues))
    : null;
  const leaveOneVideoOut = leaveOneVideoOutStability({
    sourceRows,
    actionType,
    featureNames,
    groupCount,
    fullAssignments: assignments,
    minimumSharedFeatures,
  });
  return {
    actionType,
    count: rows.length,
    sourceVideoCount: new Set(rows.map((row) => row.videoId)).size,
    featureDefinitions: definitions,
    featureNames,
    standardization,
    minimumSharedFeatures,
    groupCount,
    meanSilhouette,
    clusterQuality: clusterQuality(meanSilhouette),
    groups: characterizeGroups(assignments, featureNames),
    sourceVideoEffect: sourceVideoEffect(rows, lookup),
    leaveOneVideoOut,
    outlierCandidates: rankedOutliers.slice(0, 2).map((row) => ({
      repetitionId: row.repetitionId,
      videoId: row.videoId,
      outlierScore: row.outlierScore,
      largestFeatureDeviations: Object.entries(row.zScores)
        .filter(([, value]) => Number.isFinite(value))
        .sort(([, left], [, right]) => Math.abs(right) - Math.abs(left))
        .slice(0, 3)
        .map(([featureName, robustZ]) => ({ featureName, robustZ })),
    })),
    assignments,
  };
}

export function analyzeLabelFreeProfiles({ rows, featureContract }) {
  if (!Array.isArray(rows)) {
    throw new Error("pilot pool rows are required.");
  }
  if (!featureContract?.actions) {
    throw new Error("feature contract actions are required.");
  }
  const readyRows = rows.filter((row) => row.featureReady);
  const actions = Object.fromEntries(
    Object.entries(Object.groupBy(readyRows, (row) => row.actionType))
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([actionType, actionRows]) => [
        actionType,
        analyzeAction(actionType, actionRows, featureContract),
      ]),
  );
  return {
    analysisMode: "label_free_exploratory_profiles",
    inputCount: rows.length,
    featureReadyCount: readyRows.length,
    sourceVideoCount: new Set(readyRows.map((row) => row.videoId)).size,
    historicalScoresUsed: false,
    roundAConsensusUsed: false,
    qualityFeaturesUsedInDistance: false,
    actions,
  };
}

export function summarizeConsensusOverlay({ analysis, comparisonRows }) {
  if (!analysis?.actions) {
    throw new Error("label-free profile analysis is required.");
  }
  if (!Array.isArray(comparisonRows)) {
    throw new Error("review comparison rows are required.");
  }
  const assignmentIndex = new Map(
    Object.values(analysis.actions).flatMap((action) =>
      action.assignments.map((assignment) => [
        assignment.repetitionId,
        { assignment, action },
      ]),
    ),
  );
  const rows = comparisonRows
    .filter(
      (row) =>
        row.leftStatus === "scored" &&
        row.rightStatus === "scored" &&
        row.leftScore === row.rightScore,
    )
    .map((row) => {
      const match = assignmentIndex.get(row.repetitionId);
      if (!match) {
        throw new Error(
          `consensus overlay is missing a profile assignment for ${row.repetitionId}.`,
        );
      }
      const group = match.action.groups[match.assignment.profileGroup];
      return {
        actionType: match.assignment.actionType,
        repetitionId: row.repetitionId,
        videoId: match.assignment.videoId,
        consensusScore: row.leftScore,
        profileGroup: match.assignment.profileGroup,
        profileGroupSourceConcentrated: group.sourceConcentrationFlag,
        outlierScore: match.assignment.outlierScore,
        outlierRank: match.assignment.outlierRank,
      };
    })
    .sort(
      (left, right) =>
        left.actionType.localeCompare(right.actionType) ||
        left.consensusScore - right.consensusScore ||
        left.repetitionId.localeCompare(right.repetitionId),
    );
  const scoreStrata = Object.entries(
    Object.groupBy(rows, (row) => `${row.actionType}:${row.consensusScore}`),
  ).map(([, stratumRows]) => {
    const profileGroups = Object.fromEntries(
      Object.entries(Object.groupBy(stratumRows, (row) => row.profileGroup))
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([profileGroup, groupRows]) => [
          profileGroup,
          {
            count: groupRows.length,
            sourceVideoCount: new Set(groupRows.map((row) => row.videoId)).size,
            sourceConcentrated: groupRows[0].profileGroupSourceConcentrated,
          },
        ]),
    );
    return {
      actionType: stratumRows[0].actionType,
      consensusScore: stratumRows[0].consensusScore,
      count: stratumRows.length,
      sourceVideoCount: new Set(stratumRows.map((row) => row.videoId)).size,
      profileGroupCount: Object.keys(profileGroups).length,
      spansMultipleProfiles: Object.keys(profileGroups).length > 1,
      profileGroups,
    };
  });
  return {
    overlayMode: "posthoc_round_a_consensus_on_frozen_label_free_groups",
    groupingUsedConsensusScores: false,
    consensusCount: rows.length,
    scoreStrataCount: scoreStrata.length,
    multiProfileScoreStrataCount: scoreStrata.filter(
      (stratum) => stratum.spansMultipleProfiles,
    ).length,
    scoreStrata,
    rows,
  };
}
