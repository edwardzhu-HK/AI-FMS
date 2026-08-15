import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { format } from "prettier";

const DEFAULT_CONFIG = "research/pilot-v1/phase-i-case-study-portfolio.json";

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(
      `${label} drift: expected ${expected}, received ${actual}.`,
    );
  }
}

function assertPublicSafeText(value, label) {
  if (/(?:\/Users\/|\/Volumes\/|file:\/\/)/.test(value)) {
    throw new Error(`${label} contains a local absolute path.`);
  }
}

function round(value, decimals = 4) {
  if (!Number.isFinite(value)) return null;
  return Number(value.toFixed(decimals));
}

function mean(values) {
  const finite = values.filter(Number.isFinite);
  return finite.length
    ? finite.reduce((sum, value) => sum + value, 0) / finite.length
    : null;
}

function median(values) {
  const finite = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!finite.length) return null;
  const midpoint = Math.floor(finite.length / 2);
  return finite.length % 2
    ? finite[midpoint]
    : (finite[midpoint - 1] + finite[midpoint]) / 2;
}

function rank(values) {
  const sorted = values
    .map((value, index) => ({ value, index }))
    .sort((left, right) => left.value - right.value);
  const ranks = Array(values.length);
  for (let start = 0; start < sorted.length; ) {
    let end = start;
    while (
      end + 1 < sorted.length &&
      sorted[end + 1].value === sorted[start].value
    ) {
      end += 1;
    }
    const averageRank = (start + end + 2) / 2;
    for (let index = start; index <= end; index += 1) {
      ranks[sorted[index].index] = averageRank;
    }
    start = end + 1;
  }
  return ranks;
}

function pearson(left, right) {
  if (left.length !== right.length || left.length < 2) return null;
  const leftMean = mean(left);
  const rightMean = mean(right);
  let numerator = 0;
  let leftSquares = 0;
  let rightSquares = 0;
  for (let index = 0; index < left.length; index += 1) {
    const leftDelta = left[index] - leftMean;
    const rightDelta = right[index] - rightMean;
    numerator += leftDelta * rightDelta;
    leftSquares += leftDelta ** 2;
    rightSquares += rightDelta ** 2;
  }
  const denominator = Math.sqrt(leftSquares * rightSquares);
  return denominator ? numerator / denominator : null;
}

function spearman(left, right) {
  return pearson(rank(left), rank(right));
}

function summarizeRange(values) {
  const finite = values.filter(Number.isFinite);
  if (!finite.length) {
    return { count: 0, min: null, median: null, max: null, maxMinRatio: null };
  }
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  return {
    count: finite.length,
    min: round(min),
    median: round(median(finite)),
    max: round(max),
    maxMinRatio: min > 0 ? round(max / min, 2) : null,
  };
}

function getFeatureRow(rowsById, repetitionId, actionType) {
  const row = rowsById.get(repetitionId);
  if (!row) throw new Error(`Missing feature row for ${repetitionId}.`);
  if (row.actionType !== actionType) {
    throw new Error(`Action mismatch for ${repetitionId}.`);
  }
  if (row.quality?.analysisReadiness !== "ready") {
    throw new Error(`Feature row is not ready for ${repetitionId}.`);
  }
  return row;
}

function buildDeepSquatCase(config, featureMatrix) {
  const rows = featureMatrix.rows.filter(
    (row) =>
      row.actionType === "deep_squat" &&
      row.quality?.analysisReadiness === "ready" &&
      row.cameraView === config.cameraView,
  );
  assertEqual(rows.length, config.expectedRepetitions, "Deep Squat rows");
  const sourceVideos = new Set(rows.map((row) => row.videoId));
  assertEqual(
    sourceVideos.size,
    config.expectedSourceVideos,
    "Deep Squat source videos",
  );

  const allFeatures = [config.referenceFeature, ...config.features];
  for (const row of rows) {
    for (const feature of allFeatures) {
      if (!Number.isFinite(row.features?.[feature])) {
        throw new Error(
          `Missing Deep Squat ${feature} for ${row.repetitionId}.`,
        );
      }
    }
  }

  const sourceMedianRows = [...sourceVideos].map((videoId) => {
    const sourceRows = rows.filter((row) => row.videoId === videoId);
    return {
      videoId,
      repetitionCount: sourceRows.length,
      features: Object.fromEntries(
        allFeatures.map((feature) => [
          feature,
          median(sourceRows.map((row) => row.features[feature])),
        ]),
      ),
    };
  });
  const referenceValues = rows.map(
    (row) => row.features[config.referenceFeature],
  );
  const sourceReferenceValues = sourceMedianRows.map(
    (row) => row.features[config.referenceFeature],
  );

  return {
    caseId: config.caseId,
    status: config.status,
    role: "group_level_strategy_continuum",
    method: "side_view_rank_correlation_with_source_median_sensitivity",
    repetitionCount: rows.length,
    sourceVideoCount: sourceVideos.size,
    cameraView: config.cameraView,
    referenceFeature: config.referenceFeature,
    featureRanges: Object.fromEntries(
      allFeatures.map((feature) => [
        feature,
        summarizeRange(rows.map((row) => row.features[feature])),
      ]),
    ),
    correlations: config.features.map((feature) => ({
      feature,
      repetitionLevelSpearman: round(
        spearman(
          referenceValues,
          rows.map((row) => row.features[feature]),
        ),
        3,
      ),
      sourceMedianSpearman: round(
        spearman(
          sourceReferenceValues,
          sourceMedianRows.map((row) => row.features[feature]),
        ),
        3,
      ),
    })),
    rows: rows.map((row) => ({
      repetitionId: row.repetitionId,
      videoId: row.videoId,
      features: Object.fromEntries(
        allFeatures.map((feature) => [feature, row.features[feature]]),
      ),
    })),
    interpretation:
      "Depth covaries with hip and knee flexion, while ankle, trunk, and alignment evidence remain partly independent movement-strategy dimensions.",
  };
}

function buildAslrCase(
  config,
  rowsById,
  aslrAudit,
  canonicalPilot,
  roundBCloseout,
) {
  const auditById = new Map(
    aslrAudit.rows.map((row) => [row.repetitionId, row]),
  );
  const canonicalById = new Map(
    canonicalPilot.repetitions.map((row) => [row.repetitionId, row]),
  );
  const roundBById = new Map(
    roundBCloseout.roundBAgreement.comparisonRows.map((row) => [
      row.repetitionId,
      row,
    ]),
  );

  const rows = config.includedRepetitionIds.map((repetitionId) => {
    const row = getFeatureRow(
      rowsById,
      repetitionId,
      "active_straight_leg_raise",
    );
    assertEqual(row.videoId, config.videoId, `ASLR video ${repetitionId}`);
    const audit = auditById.get(repetitionId);
    assertEqual(audit?.status, "good", `ASLR audit ${repetitionId}`);
    const canonical = canonicalById.get(repetitionId);
    const historicalScore =
      canonical?.humanReviewSummary?.consensusScore ?? null;
    assertEqual(
      historicalScore,
      config.expectedHistoricalScore,
      `ASLR historical score ${repetitionId}`,
    );
    const roundB = roundBById.get(repetitionId);
    const blindConsensusScore =
      roundB?.leftStatus === "scored" &&
      roundB?.rightStatus === "scored" &&
      roundB.leftScore === roundB.rightScore
        ? roundB.leftScore
        : null;
    return {
      repetitionId,
      repetitionIndex: row.repetitionIndex,
      side: row.side,
      historicalScore,
      blindConsensusScore,
      evidenceTier: Number.isInteger(blindConsensusScore)
        ? "stable_blind_consensus"
        : "historical_weak_label",
      auditStatus: audit.status,
      features: Object.fromEntries(
        config.features.map((feature) => [feature, row.features[feature]]),
      ),
    };
  });

  const blindScoreCount = rows.filter((row) =>
    Number.isInteger(row.blindConsensusScore),
  ).length;
  assertEqual(
    blindScoreCount,
    config.expectedBlindScoreCount,
    "ASLR blind score count",
  );
  for (const repetitionId of config.excludedWatchRepetitionIds) {
    assertEqual(
      auditById.get(repetitionId)?.status,
      "watch",
      `ASLR excluded watch ${repetitionId}`,
    );
  }

  const sideSummaries = ["left", "right"].map((side) => {
    const sideRows = rows.filter((row) => row.side === side);
    return {
      side,
      repetitionCount: sideRows.length,
      featureMeans: Object.fromEntries(
        config.features.map((feature) => [
          feature,
          round(mean(sideRows.map((row) => row.features[feature]))),
        ]),
      ),
    };
  });

  return {
    caseId: config.caseId,
    status: config.status,
    role: "within_source_bilateral_repeatability",
    method: "four_repetition_bilateral_series_with_evidence_tiers",
    videoId: config.videoId,
    repetitionCount: rows.length,
    blindConsensusCount: blindScoreCount,
    historicalWeakLabelOnlyCount: rows.length - blindScoreCount,
    excludedWatchCount: config.excludedWatchRepetitionIds.length,
    rows,
    sideSummaries,
    featureRanges: Object.fromEntries(
      config.features.map((feature) => [
        feature,
        summarizeRange(rows.map((row) => row.features[feature])),
      ]),
    ),
    interpretation:
      "A similar active-leg result can coexist with larger side-to-side and repetition-to-repetition changes in stationary-leg and pelvic control.",
  };
}

function buildHurdleCase(config, rowsById, roundBCloseout) {
  const scoredRows = roundBCloseout.roundBAgreement.comparisonRows.filter(
    (row) =>
      row.actionType === "hurdle_step" &&
      row.leftStatus === "scored" &&
      row.rightStatus === "scored" &&
      row.leftScore === config.humanRawScore &&
      row.rightScore === config.humanRawScore,
  );
  assertEqual(scoredRows.length, config.expectedRepetitions, "Hurdle rows");
  const scoredIds = new Set(scoredRows.map((row) => row.repetitionId));
  const codedIds = new Set(config.pathways.map((row) => row.repetitionId));
  assertEqual(codedIds.size, config.pathways.length, "Hurdle coding IDs");
  for (const repetitionId of scoredIds) {
    if (!codedIds.has(repetitionId)) {
      throw new Error(`Missing Hurdle pathway coding for ${repetitionId}.`);
    }
  }

  const rows = config.pathways.map((coding) => {
    if (!scoredIds.has(coding.repetitionId)) {
      throw new Error(
        `Hurdle coding is not a blind score-2 row: ${coding.repetitionId}.`,
      );
    }
    const row = getFeatureRow(rowsById, coding.repetitionId, "hurdle_step");
    return {
      repetitionId: coding.repetitionId,
      videoId: row.videoId,
      cameraView: row.cameraView,
      pathway: coding.pathway,
      label: coding.label,
      themes: coding.themes,
      features: Object.fromEntries(
        config.features.map((feature) => [
          feature,
          row.features?.[feature] ?? null,
        ]),
      ),
    };
  });
  const sourceVideoCount = new Set(rows.map((row) => row.videoId)).size;
  assertEqual(
    sourceVideoCount,
    config.expectedSourceVideos,
    "Hurdle source videos",
  );
  const pathways = [...new Set(rows.map((row) => row.pathway))].map(
    (pathway) => {
      const pathwayRows = rows.filter((row) => row.pathway === pathway);
      return {
        pathway,
        label: pathwayRows[0].label,
        count: pathwayRows.length,
        repetitionIds: pathwayRows.map((row) => row.repetitionId),
      };
    },
  );

  return {
    caseId: config.caseId,
    status: config.status,
    role: "same_score_failure_pathway_taxonomy",
    method: "blind_reviewer_thematic_coding_plus_quantitative_ranges",
    humanRawScore: config.humanRawScore,
    repetitionCount: rows.length,
    sourceVideoCount,
    pathwayCount: pathways.length,
    pathways,
    rows,
    featureRanges: Object.fromEntries(
      config.features.map((feature) => [
        feature,
        summarizeRange(rows.map((row) => row.features[feature])),
      ]),
    ),
    interpretation:
      "The same score-2 endpoint represents different review pathways: multi-domain control, distal alignment, return-phase alignment, or dowel control.",
  };
}

function countStatuses(rows, criterion) {
  const counts = { pass: 0, watch: 0, fail: 0, unknown: 0 };
  for (const row of rows) {
    const status = row.criteria?.[criterion]?.status ?? "unknown";
    if (!(status in counts))
      throw new Error(`Unknown criterion status ${status}.`);
    counts[status] += 1;
  }
  return counts;
}

function buildRotaryCase(config, rowsById, rotaryBenchmark) {
  const rows = rotaryBenchmark.rows;
  assertEqual(rows.length, config.expectedRepetitions, "Rotary rows");
  const scoreGroups = Object.entries(config.expectedHumanScoreCounts).map(
    ([scoreText, expectedCount]) => {
      const score = Number(scoreText);
      const scoreRows = rows.filter((row) => row.humanConsensusScore === score);
      assertEqual(scoreRows.length, expectedCount, `Rotary score ${score}`);
      return {
        humanScore: score,
        repetitionCount: scoreRows.length,
        criterionStatusCounts: Object.fromEntries(
          config.criteria.map((criterion) => [
            criterion,
            countStatuses(scoreRows, criterion),
          ]),
        ),
        aiScoreCounts: Object.fromEntries(
          [1, 2, 3].map((aiScore) => [
            aiScore,
            scoreRows.filter((row) => row.aiScore === aiScore).length,
          ]),
        ),
      };
    },
  );

  return {
    caseId: config.caseId,
    status: config.status,
    role: "temporal_cycle_event_matrix",
    method: "eight_repetition_event_matrix_by_blind_human_score",
    repetitionCount: rows.length,
    sourceVideoCount: new Set(
      rows.map((row) => rowsById.get(row.repetitionId)?.videoId),
    ).size,
    exactAiCount: rows.filter((row) => row.aiScore === row.humanConsensusScore)
      .length,
    scoreGroups,
    criteria: config.criteria,
    rows: rows.map((row) => ({
      repetitionId: row.repetitionId,
      humanConsensusScore: row.humanConsensusScore,
      aiScore: row.aiScore,
      criteria: Object.fromEntries(
        config.criteria.map((criterion) => [
          criterion,
          row.criteria?.[criterion]?.status ?? "unknown",
        ]),
      ),
    })),
    interpretation:
      "Cycle events separate score-1 incompletion from score-2 sequencing and boundary cases, while preserving two conservative AI review flags.",
  };
}

export function buildPhaseICaseStudyPortfolio({
  config,
  featureMatrix,
  aslrAudit,
  canonicalPilot,
  roundBCloseout,
  rotaryBenchmark,
}) {
  assertEqual(
    featureMatrix.matrixFingerprint,
    config.sources.featureMatrixFingerprint,
    "Feature matrix fingerprint",
  );
  assertEqual(
    aslrAudit.rowsFingerprint,
    config.sources.aslrAuditFingerprint,
    "ASLR audit fingerprint",
  );
  const rowsById = new Map(
    featureMatrix.rows.map((row) => [row.repetitionId, row]),
  );
  const cases = {
    deepSquat: buildDeepSquatCase(config.analyses.deepSquat, featureMatrix),
    aslr: buildAslrCase(
      config.analyses.aslr,
      rowsById,
      aslrAudit,
      canonicalPilot,
      roundBCloseout,
    ),
    hurdle: buildHurdleCase(config.analyses.hurdle, rowsById, roundBCloseout),
    rotary: buildRotaryCase(config.analyses.rotary, rowsById, rotaryBenchmark),
  };
  const portfolio = {
    schemaVersion: "ai_fms_phase_i_case_study_portfolio_v2",
    portfolioId: config.portfolioId,
    summary: {
      canonicalRepetitions: featureMatrix.summary.total,
      featureReadyRepetitions: featureMatrix.summary.ready,
      selectedAnalyses: 4,
      applicationFigures: 4,
      rawMediaIncluded: false,
      personImagesIncluded: false,
    },
    sourceFingerprints: {
      featureMatrix: featureMatrix.matrixFingerprint,
      aslrAudit: aslrAudit.rowsFingerprint,
      rotaryModelVersion: rotaryBenchmark.modelVersion,
    },
    cases,
    synthesis: {
      compressedInformationTypes: [
        "continuous_joint_strategy",
        "bilateral_and_repeatability_variation",
        "different_failure_pathways_within_one_score",
        "temporal_event_order_and_cycle_completion",
      ],
      claim:
        "The ordinal score compresses different kinds of movement information; no single pairwise template can represent all four actions.",
    },
    publicationBoundary: config.publicationBoundary,
  };
  portfolio.portfolioFingerprint = sha256(JSON.stringify(portfolio));
  return portfolio;
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function scale(value, min, max, start, end) {
  if (max === min) return (start + end) / 2;
  return start + ((value - min) / (max - min)) * (end - start);
}

function deepSquatSvg(portfolio) {
  const data = portfolio.cases.deepSquat;
  const rows = data.rows;
  const xValues = rows.map((row) => row.features.peakDepthRatio);
  const yValues = rows.map((row) => row.features.kneeAngleDegrees);
  const xMin = Math.min(...xValues) - 0.02;
  const xMax = Math.max(...xValues) + 0.02;
  const yMin = Math.min(...yValues) - 5;
  const yMax = Math.max(...yValues) + 5;
  const videos = [...new Set(rows.map((row) => row.videoId))];
  const colors = [
    "#0f766e",
    "#d97706",
    "#2563eb",
    "#b42318",
    "#7c3aed",
    "#4d7c0f",
    "#475569",
  ];
  const correlationLabels = {
    hipKneeVerticalGap: "Hip-knee gap",
    hipAngleDegrees: "Hip angle",
    kneeAngleDegrees: "Knee angle",
    ankleShankLeanDegrees: "Shank lean",
    trunkLeanDegrees: "Trunk lean",
    maxKneeAnkleOffset: "Knee-ankle offset",
  };
  const points = rows
    .map((row) => {
      const x = scale(row.features.peakDepthRatio, xMin, xMax, 90, 790);
      const y = scale(row.features.kneeAngleDegrees, yMax, yMin, 650, 170);
      const color = colors[videos.indexOf(row.videoId) % colors.length];
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="${color}" fill-opacity="0.82" stroke="#ffffff" stroke-width="2"/>`;
    })
    .join("\n  ");
  const correlations = data.correlations
    .map(
      (
        row,
        index,
      ) => `<text x="865" y="${225 + index * 46}" font-size="15" fill="#172033">${escapeXml(correlationLabels[row.feature] ?? row.feature)}</text>
  <text x="1125" y="${225 + index * 46}" text-anchor="end" font-size="16" font-weight="700" fill="#172033">ρ ${row.repetitionLevelSpearman.toFixed(2)}</text>`,
    )
    .join("\n  ");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="760" viewBox="0 0 1200 760" role="img" aria-labelledby="title desc">
  <title id="title">Deep Squat side-view strategy continuum</title>
  <desc id="desc">Fifteen side-view repetitions from seven videos show a depth and knee-flexion continuum, while ankle, trunk, and alignment evidence vary more independently.</desc>
  <rect width="1200" height="760" fill="#ffffff"/>
  <rect width="1200" height="8" fill="#172033"/>
  <text x="42" y="58" font-size="32" font-weight="750" fill="#172033">Deep Squat Is a Continuum, Not a Pair</text>
  <text x="42" y="91" font-size="16" fill="#526074">15 audited side-view reps · 7 source videos · label-free movement evidence</text>
  <line x1="90" y1="650" x2="790" y2="650" stroke="#94a3b8"/>
  <line x1="90" y1="170" x2="90" y2="650" stroke="#94a3b8"/>
  <text x="440" y="710" text-anchor="middle" font-size="15" fill="#526074">Peak depth ratio →</text>
  <text x="24" y="410" transform="rotate(-90 24 410)" text-anchor="middle" font-size="15" fill="#526074">Knee angle (smaller = more flexion)</text>
  <text x="90" y="677" font-size="13" fill="#64748b">${xMin.toFixed(2)}</text>
  <text x="790" y="677" text-anchor="end" font-size="13" fill="#64748b">${xMax.toFixed(2)}</text>
  ${points}
  <rect x="835" y="150" width="325" height="390" fill="#f8fafc" stroke="#dbe2ea"/>
  <text x="865" y="188" font-size="18" font-weight="700" fill="#172033">Spearman vs depth</text>
  ${correlations}
  <rect x="835" y="565" width="325" height="85" fill="#eef6f5"/>
  <text x="855" y="596" font-size="15" font-weight="700" fill="#172033">Depth tracks hip/knee flexion.</text>
  <text x="855" y="622" font-size="14" fill="#526074">Ankle, trunk and alignment remain</text>
  <text x="855" y="644" font-size="14" fill="#526074">partly independent strategy dimensions.</text>
  <text x="42" y="742" font-size="12" fill="#64748b">Exploratory 2D pose evidence. Repetitions are nested within source videos; source-median sensitivity is retained in the research artifact.</text>
</svg>\n`;
}

const FEATURE_LABELS = {
  ankleAboveHip: "Active ankle height",
  peakElevation: "Peak elevation",
  stationaryKneeAngleDegrees: "Stationary knee angle",
  stationaryAnkleDrift: "Stationary ankle drift",
  hipHeightGap: "Pelvic height gap",
};

function aslrSvg(portfolio) {
  const data = portfolio.cases.aslr;
  const features = [
    "ankleAboveHip",
    "stationaryKneeAngleDegrees",
    "stationaryAnkleDrift",
    "hipHeightGap",
  ];
  const columns = data.rows
    .map((row, index) => {
      const x = 380 + index * 180;
      return `<text x="${x}" y="160" text-anchor="middle" font-size="17" font-weight="700" fill="#172033">${row.side.toUpperCase()} ${(index % 2) + 1}</text>
  <text x="${x}" y="184" text-anchor="middle" font-size="11" fill="#64748b">${row.evidenceTier === "stable_blind_consensus" ? "blind score 3" : "historical score 3"}</text>`;
    })
    .join("\n  ");
  const metricRows = features
    .map((feature, featureIndex) => {
      const y = 245 + featureIndex * 105;
      const range = data.featureRanges[feature];
      const cells = data.rows
        .map((row, index) => {
          const x = 310 + index * 180;
          const value = row.features[feature];
          const width = scale(value, range.min, range.max, 28, 135);
          const color = row.side === "left" ? "#0f766e" : "#d97706";
          return `<rect x="${x}" y="${y}" width="140" height="18" fill="#e8edf2"/>
  <rect x="${x}" y="${y}" width="${width.toFixed(1)}" height="18" fill="${color}"/>
  <text x="${x + 70}" y="${y + 46}" text-anchor="middle" font-size="15" font-weight="700" fill="#172033">${value.toFixed(feature.includes("Degrees") ? 1 : 4)}</text>`;
        })
        .join("\n  ");
      return `<text x="42" y="${y + 15}" font-size="16" font-weight="700" fill="#172033">${FEATURE_LABELS[feature]}</text>
  <text x="42" y="${y + 39}" font-size="12" fill="#64748b">range ${range.min}–${range.max}</text>
  ${cells}`;
    })
    .join("\n  ");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="760" viewBox="0 0 1200 760" role="img" aria-labelledby="title desc">
  <title id="title">ASLR bilateral repeatability series</title>
  <desc id="desc">Four good-evidence repetitions from one source video show similar active-leg height but larger differences in stationary-leg and pelvic control.</desc>
  <rect width="1200" height="760" fill="#ffffff"/>
  <rect width="1200" height="8" fill="#172033"/>
  <text x="42" y="58" font-size="32" font-weight="750" fill="#172033">ASLR: Result, Side and Repeatability</text>
  <text x="42" y="91" font-size="16" fill="#526074">One source · four good-evidence reps · left and right series</text>
  <circle cx="68" cy="137" r="8" fill="#0f766e"/><text x="84" y="142" font-size="13" fill="#526074">left</text>
  <circle cx="144" cy="137" r="8" fill="#d97706"/><text x="160" y="142" font-size="13" fill="#526074">right</text>
  ${columns}
  ${metricRows}
  <rect x="42" y="665" width="1116" height="58" fill="#eef6f5"/>
  <text x="64" y="692" font-size="16" font-weight="700" fill="#172033">Active height varied modestly; stationary ankle drift varied 4.25× and pelvic gap 2.56×.</text>
  <text x="64" y="714" font-size="12" fill="#526074">Three reps have stable blind consensus; one right rep retains a historical weak label. One watch-quality rep was excluded.</text>
</svg>\n`;
}

const HURDLE_THEMES = [
  ["alignment", "Alignment"],
  ["distal_ankle", "Ankle"],
  ["trunk_control", "Trunk"],
  ["support_stability", "Support"],
  ["dowel_control", "Dowel"],
  ["return_phase", "Return"],
];

function hurdleSvg(portfolio) {
  const data = portfolio.cases.hurdle;
  const headers = HURDLE_THEMES.map(
    ([, label], index) =>
      `<text x="${560 + index * 85}" y="172" text-anchor="middle" font-size="13" font-weight="700" fill="#526074">${label}</text>`,
  ).join("\n  ");
  const rows = data.rows
    .map((row, rowIndex) => {
      const y = 220 + rowIndex * 82;
      const cells = HURDLE_THEMES.map(([theme], index) => {
        const active = row.themes.includes(theme);
        return `<rect x="${538 + index * 85}" y="${y - 22}" width="44" height="44" fill="${active ? "#b42318" : "#eef2f6"}" stroke="${active ? "#8f1d14" : "#dbe2ea"}"/>${active ? `<text x="${560 + index * 85}" y="${y + 7}" text-anchor="middle" font-size="22" font-weight="700" fill="#ffffff">×</text>` : ""}`;
      }).join("\n  ");
      return `<circle cx="62" cy="${y}" r="20" fill="#172033"/><text x="62" y="${y + 7}" text-anchor="middle" font-size="18" font-weight="700" fill="#ffffff">2</text>
  <text x="100" y="${y - 4}" font-size="17" font-weight="700" fill="#172033">${escapeXml(row.label)}</text>
  <text x="100" y="${y + 20}" font-size="12" fill="#64748b">source ${rowIndex + 1} · ${row.cameraView} view</text>
  ${cells}`;
    })
    .join("\n  ");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="760" viewBox="0 0 1200 760" role="img" aria-labelledby="title desc">
  <title id="title">Hurdle Step score-two pathway taxonomy</title>
  <desc id="desc">Five independently blinded score-two repetitions from five videos were assigned to four different review pathways.</desc>
  <rect width="1200" height="760" fill="#ffffff"/>
  <rect width="1200" height="8" fill="#172033"/>
  <text x="42" y="58" font-size="32" font-weight="750" fill="#172033">Five Score-2 Reps, Four Review Pathways</text>
  <text x="42" y="91" font-size="16" fill="#526074">Hurdle Step · five independent videos · Round B blind consensus</text>
  <text x="42" y="132" font-size="15" fill="#172033">One endpoint does not identify why the movement received that endpoint.</text>
  ${headers}
  ${rows}
  <rect x="42" y="650" width="1116" height="72" fill="#f7f2e9"/>
  <text x="64" y="681" font-size="16" font-weight="700" fill="#172033">The follow-up question changes by pathway: alignment, single-leg stability, trunk control, or dowel control.</text>
  <text x="64" y="706" font-size="12" fill="#526074">Themes are structured coding of blinded reviewer observations, combined with pose-derived ranges; they are not diagnoses.</text>
</svg>\n`;
}

function criterionColor(status) {
  if (status === "pass") return "#0f766e";
  if (status === "watch") return "#d97706";
  if (status === "fail") return "#b42318";
  return "#94a3b8";
}

function rotarySvg(portfolio) {
  const data = portfolio.cases.rotary;
  const labels = {
    firstAnkleTouch: "Touch 1",
    secondAnkleTouch: "Touch 2",
    elbowExtension: "Elbow",
    kneeExtension: "Knee",
    returnControl: "Return",
    simultaneousLift: "Lift timing",
  };
  const headers = data.criteria
    .map(
      (criterion, index) =>
        `<text x="${430 + index * 105}" y="175" text-anchor="middle" font-size="13" font-weight="700" fill="#526074">${labels[criterion]}</text>`,
    )
    .join("\n  ");
  const rows = [...data.rows]
    .sort(
      (left, right) =>
        left.humanConsensusScore - right.humanConsensusScore ||
        left.repetitionId.localeCompare(right.repetitionId),
    )
    .map((row, rowIndex) => {
      const y = 220 + rowIndex * 58;
      const cells = data.criteria
        .map((criterion, index) => {
          const status = row.criteria[criterion];
          return `<rect x="${412 + index * 105}" y="${y - 18}" width="36" height="36" fill="${criterionColor(status)}"/><text x="${430 + index * 105}" y="${y + 5}" text-anchor="middle" font-size="12" font-weight="700" fill="#ffffff">${status === "unknown" ? "?" : status[0].toUpperCase()}</text>`;
        })
        .join("\n  ");
      return `<text x="42" y="${y + 5}" font-size="14" font-weight="700" fill="#172033">Rep ${rowIndex + 1}</text>
  <circle cx="180" cy="${y}" r="18" fill="#172033"/><text x="180" y="${y + 6}" text-anchor="middle" font-size="16" font-weight="700" fill="#ffffff">${row.humanConsensusScore}</text>
  <circle cx="270" cy="${y}" r="18" fill="${row.aiScore === row.humanConsensusScore ? "#0f766e" : "#d97706"}"/><text x="270" y="${y + 6}" text-anchor="middle" font-size="16" font-weight="700" fill="#ffffff">${row.aiScore}</text>
  ${cells}`;
    })
    .join("\n  ");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="760" viewBox="0 0 1200 760" role="img" aria-labelledby="title desc">
  <title id="title">Rotary Stability cycle event matrix</title>
  <desc id="desc">Eight blinded repetitions show how first and second touch, extension, return, and lift timing distinguish score-one, score-two, and conservative review flags.</desc>
  <rect width="1200" height="760" fill="#ffffff"/>
  <rect width="1200" height="8" fill="#172033"/>
  <text x="42" y="58" font-size="32" font-weight="750" fill="#172033">Rotary Stability Needs a Timeline</text>
  <text x="42" y="91" font-size="16" fill="#526074">8 blind-reviewed reps · 4 human score 1 · 4 human score 2 · cycle-event evidence</text>
  <text x="180" y="175" text-anchor="middle" font-size="13" font-weight="700" fill="#526074">Human</text>
  <text x="270" y="175" text-anchor="middle" font-size="13" font-weight="700" fill="#526074">AI</text>
  ${headers}
  ${rows}
  <rect x="42" y="684" width="1116" height="42" fill="#eef6f5"/>
  <text x="64" y="710" font-size="15" font-weight="700" fill="#172033">Score 1: second touch and return failed in 4/4. Score 2: two clean cycle patterns and two conservative boundary flags.</text>
  <text x="1000" y="750" font-size="11" fill="#64748b">P pass · W watch · F fail · ? unknown</text>
</svg>\n`;
}

function formatValue(value, decimals = 3) {
  return Number.isFinite(value) ? value.toFixed(decimals) : "N/A";
}

function buildReport(portfolio) {
  const deep = portfolio.cases.deepSquat;
  const aslr = portfolio.cases.aslr;
  const hurdle = portfolio.cases.hurdle;
  const rotary = portfolio.cases.rotary;
  const deepRows = deep.correlations
    .map(
      (row) =>
        `| \`${row.feature}\` | ${formatValue(row.repetitionLevelSpearman, 3)} | ${formatValue(row.sourceMedianSpearman, 3)} |`,
    )
    .join("\n");
  const aslrRows = aslr.rows
    .map(
      (row) =>
        `| ${row.side} ${row.repetitionIndex} | ${formatValue(row.features.ankleAboveHip, 4)} | ${formatValue(row.features.stationaryKneeAngleDegrees, 1)} | ${formatValue(row.features.stationaryAnkleDrift, 4)} | ${formatValue(row.features.hipHeightGap, 4)} | ${row.evidenceTier} |`,
    )
    .join("\n");
  const hurdleRows = hurdle.rows
    .map(
      (row) =>
        `| ${row.label} | ${row.cameraView} | ${formatValue(row.features.peakClearance, 4)} | ${formatValue(row.features.trunkCenterOffset, 4)} | ${row.themes.join(", ")} |`,
    )
    .join("\n");
  const rotaryRows = rotary.scoreGroups
    .map((group) => {
      const touchTwo = group.criterionStatusCounts.secondAnkleTouch;
      const returnControl = group.criterionStatusCounts.returnControl;
      return `| ${group.humanScore} | ${group.repetitionCount} | ${touchTwo.pass}/${touchTwo.watch}/${touchTwo.fail}/${touchTwo.unknown} | ${returnControl.pass}/${returnControl.watch}/${returnControl.fail}/${returnControl.unknown} | ${group.aiScoreCounts[1]}/${group.aiScoreCounts[2]}/${group.aiScoreCounts[3]} |`;
    })
    .join("\n");
  return `# AI-FMS Phase I 案例组合

初始日期：2026-08-10

最近更新：2026-08-15

状态：application candidate；Round A/B complete

## 组合原则

本组合不再把四个动作机械地写成“两条同分 rep 的参数对比”。分析从完整的 110-rep
canonical pool 出发，再依据动作特性、质量门和证据等级选择不同方法：

| 动作 | 研究问题 | 方法 | 分析单位 |
| --- | --- | --- | --- |
| Deep Squat | 深度是否决定完整动作策略？ | 侧视连续谱与 rank correlation | ${deep.repetitionCount} reps / ${deep.sourceVideoCount} videos |
| ASLR | 同一结果在左右侧和重复动作中是否稳定？ | 同源 bilateral repeatability series | ${aslr.repetitionCount} good reps |
| Hurdle Step | 同为 2 分是否因为同一种问题？ | blind reviewer thematic coding + quantitative ranges | ${hurdle.repetitionCount} reps / ${hurdle.sourceVideoCount} videos |
| Rotary Stability | 单帧参数能否表达复杂动作顺序？ | full-cycle event matrix | ${rotary.repetitionCount} blind-reviewed reps |

四种方法共同研究“0-3 分压缩了什么信息”，但不预设四个动作必须产生同一种案例形式。

## 1. Deep Squat：15 条侧视 rep 的动作策略连续谱

从 31 条 feature-ready Deep Squat 中保留 ${deep.repetitionCount} 条审计后 side-view rep，
覆盖 ${deep.sourceVideoCount} 个源视频。分析不使用人工分数，以 \`peakDepthRatio\` 为连续
参考轴：

| Feature vs depth | Rep-level Spearman ρ | Source-median sensitivity ρ |
| --- | ---: | ---: |
${deepRows}

深度与膝、髋屈曲及 hip-knee gap 呈较强方向关系，但与 ankle-shank lean、trunk lean 和
knee-ankle offset 的关系较弱。这意味着“蹲得更深”主要描述一个深度/髋膝屈曲轴，不能
代表踝策略、躯干策略和对线控制也完全相同。

![Deep Squat strategy continuum](../assets/phase-i-case-studies/deep-squat-strategy-continuum.svg)

## 2. ASLR：同一来源的左右侧与重复性

一个五-rep 源视频中有四条通过 \`good\` side/peak gate，另有一条 \`watch\` 被排除。
四条 good rep 均保留历史 3 分；其中两条左侧和一条右侧 rep 另有稳定 blind consensus，
剩余一条右侧只保留 historical weak-label evidence：

| Rep | Active height | Stationary knee | Stationary ankle drift | Pelvic gap | Label evidence |
| --- | ---: | ---: | ---: | ---: | --- |
${aslrRows}

active ankle height 仅跨 ${formatValue(aslr.featureRanges.ankleAboveHip.min, 4)}–${formatValue(aslr.featureRanges.ankleAboveHip.max, 4)}，
而 stationary ankle drift 跨 ${aslr.featureRanges.stationaryAnkleDrift.maxMinRatio} 倍，
pelvic gap 跨 ${aslr.featureRanges.hipHeightGap.maxMinRatio} 倍。这个 case series 研究的不是
“哪一条更好”，而是同一结果下的左右侧差异与 repeatability。

![ASLR bilateral repeatability](../assets/phase-i-case-studies/aslr-bilateral-repeatability.svg)

## 3. Hurdle Step：五条 2 分对应四种 review pathway

Round B 中有 ${hurdle.repetitionCount} 条来自 ${hurdle.sourceVideoCount} 个不同视频的
Hurdle rep 被两位 reviewer 一致判为 2 分。对 blind comments 做结构化主题编码后，
它们不是一个统一类型：

| Pathway | View | Peak clearance | Trunk offset | Coded themes |
| --- | --- | ---: | ---: | --- |
${hurdleRows}

五条动作形成 ${hurdle.pathwayCount} 种路径：多领域控制问题、远端对线、回收阶段对线，
以及单独的 dowel control。相同的 2 分因此不能直接回答“应优先复核哪里”；人工观察理由
与连续参数共同保留后，后续检查方向才会不同。

![Hurdle score-two pathways](../assets/phase-i-case-studies/hurdle-score2-pathways.svg)

## 4. Rotary Stability：八条 rep 的动作周期事件矩阵

Rotary 不是峰值姿势问题，而是 setup、触踝、伸展、第二次触踝、回位和离地时序组成的
完整事件链。八条 blind-reviewed rep 的摘要如下，事件列顺序为 pass/watch/fail/unknown：

| Human score | Reps | Second touch P/W/F/? | Return P/W/F/? | AI score 1/2/3 |
| ---: | ---: | --- | --- | --- |
${rotaryRows}

人工 1 分的四条中，第二次触踝与回位均为 4/4 fail；人工 2 分的四条中，第一次触踝和
肘膝伸展均保留，但两条仍在第二次触踝/回位出现边界证据，AI 因而保守提示 1 分。这个
case series 的价值是说明 temporal order 和 cycle completion 不能被单帧角度替代。

![Rotary cycle event matrix](../assets/phase-i-case-studies/rotary-cycle-event-matrix.svg)

## 跨案例综合

四个动作显示，FMS ordinal score 压缩的不只是“更多参数”，而是四类不同信息：

1. Deep Squat：连续的关节贡献与动作策略。
2. ASLR：左右侧差异和重复动作稳定性。
3. Hurdle Step：到达同一分数的不同扣分路径。
4. Rotary Stability：事件顺序、周期完整度与边界证据。

这些结果可以提出 mobility、stability、coordination、repeatability 和 compensation 的
定向复核假设，但不能命名为诊断、病因、伤病风险或 validated impairment subtype。

## 方法与质量控制补充材料

- ASLR subject-aware sensitivity、Hurdle camera-view gate 和 pose/timing limitations
  继续作为 measurement QA，不与动作科学发现混在一起。
- Deep Squat rep 嵌套于源视频；同时报告 source-median sensitivity，不能把 ${deep.repetitionCount}
  条当作 ${deep.repetitionCount} 个独立参与者。
- ASLR 剩余一条右侧 rep 尚不是 blind gold label；它用于同源 hypothesis generation。
- Hurdle pathway 来自结构化人工编码，不是自动诊断标签。
- Rotary 只有两个源视频，事件频率不能外推到总体人群。

## 发布边界

- 四张图均为无人物、数据驱动的 application candidate。
- 人物或源视频画面公开前仍需 rights/privacy audit。
- 不声称医学诊断、临床验证、伤病预测或 validated impairment subtype。
`;
}

function parseArgs(argv) {
  const options = { configPath: DEFAULT_CONFIG };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--config" && argv[index + 1]) {
      options.configPath = argv[++index];
    } else {
      throw new Error(`Unknown or incomplete argument: ${argv[index]}`);
    }
  }
  return options;
}

function loadPinnedJson(repoRoot, sourcePath, expectedSha256, label) {
  const absolutePath = path.resolve(repoRoot, sourcePath);
  const raw = fs.readFileSync(absolutePath);
  assertEqual(sha256(raw), expectedSha256, `${label} SHA-256`);
  return { payload: JSON.parse(raw.toString("utf8")), raw };
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const repoRoot = process.cwd();
  const configRaw = fs.readFileSync(path.resolve(repoRoot, options.configPath));
  const config = JSON.parse(configRaw.toString("utf8"));
  const featureMatrix = loadPinnedJson(
    repoRoot,
    config.sources.featureMatrixPath,
    config.sources.featureMatrixSha256,
    "Feature matrix",
  );
  const aslrAudit = loadPinnedJson(
    repoRoot,
    config.sources.aslrAuditPath,
    config.sources.aslrAuditSha256,
    "ASLR audit",
  );
  const canonicalPilot = loadPinnedJson(
    repoRoot,
    config.sources.canonicalPilotPath,
    config.sources.canonicalPilotSha256,
    "Canonical pilot",
  );
  const roundBCloseout = loadPinnedJson(
    repoRoot,
    config.sources.roundBCloseoutPath,
    config.sources.roundBCloseoutSha256,
    "Round B closeout",
  );
  const rotaryBenchmark = loadPinnedJson(
    repoRoot,
    config.sources.rotaryBenchmarkPath,
    config.sources.rotaryBenchmarkSha256,
    "Rotary benchmark",
  );
  const portfolio = buildPhaseICaseStudyPortfolio({
    config,
    featureMatrix: featureMatrix.payload,
    aslrAudit: aslrAudit.payload,
    canonicalPilot: canonicalPilot.payload,
    roundBCloseout: roundBCloseout.payload,
    rotaryBenchmark: rotaryBenchmark.payload,
  });
  portfolio.inputs = {
    config: { path: options.configPath, sha256: sha256(configRaw) },
    featureMatrix: { sha256: sha256(featureMatrix.raw) },
    aslrAudit: { sha256: sha256(aslrAudit.raw) },
    canonicalPilot: { sha256: sha256(canonicalPilot.raw) },
    roundBCloseout: { sha256: sha256(roundBCloseout.raw) },
    rotaryBenchmark: { sha256: sha256(rotaryBenchmark.raw) },
  };

  const portfolioJson = await format(JSON.stringify(portfolio), {
    parser: "json",
  });
  const outputs = {
    "case-study-portfolio.json": portfolioJson,
    "deep-squat-strategy-continuum.svg": deepSquatSvg(portfolio),
    "aslr-bilateral-repeatability.svg": aslrSvg(portfolio),
    "hurdle-score2-pathways.svg": hurdleSvg(portfolio),
    "rotary-cycle-event-matrix.svg": rotarySvg(portfolio),
  };
  for (const [name, content] of Object.entries(outputs)) {
    assertPublicSafeText(content, name);
  }
  const outputDir = path.resolve(repoRoot, config.outputDir);
  fs.mkdirSync(outputDir, { recursive: true });
  for (const [name, content] of Object.entries(outputs)) {
    fs.writeFileSync(path.join(outputDir, name), content);
  }
  fs.writeFileSync(
    path.join(outputDir, "SHA256SUMS"),
    `${Object.entries(outputs)
      .map(([name, content]) => `${sha256(content)}  ${name}`)
      .join("\n")}\n`,
  );

  const report = await format(buildReport(portfolio), { parser: "markdown" });
  assertPublicSafeText(report, config.reportPath);
  const reportPath = path.resolve(repoRoot, config.reportPath);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, report);

  process.stdout.write(
    `${JSON.stringify({ outputDir, reportPath, summary: portfolio.summary }, null, 2)}\n`,
  );
  return portfolio;
}

const isMainModule =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(fileURLToPath(import.meta.url));

if (isMainModule) {
  try {
    await main();
  } catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  }
}
