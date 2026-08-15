import assert from "node:assert/strict";
import test from "node:test";
import { buildPhaseICaseStudyPortfolio } from "../scripts/build-phase-i-application-figures.js";

const CONFIG = {
  portfolioId: "test-portfolio-v2",
  sources: {
    featureMatrixFingerprint: "matrix-fingerprint",
    aslrAuditFingerprint: "aslr-fingerprint",
  },
  analyses: {
    deepSquat: {
      caseId: "deep-continuum",
      status: "supported",
      cameraView: "side",
      expectedRepetitions: 3,
      expectedSourceVideos: 2,
      referenceFeature: "peakDepthRatio",
      features: ["kneeAngleDegrees", "trunkLeanDegrees"],
    },
    aslr: {
      caseId: "aslr-series",
      status: "supported",
      videoId: "aslr-video",
      includedRepetitionIds: ["aslr-a", "aslr-b", "aslr-c", "aslr-d"],
      excludedWatchRepetitionIds: ["aslr-watch"],
      expectedHistoricalScore: 3,
      expectedBlindScoreCount: 3,
      features: [
        "ankleAboveHip",
        "peakElevation",
        "stationaryKneeAngleDegrees",
        "stationaryAnkleDrift",
        "hipHeightGap",
      ],
    },
    hurdle: {
      caseId: "hurdle-pathways",
      status: "supported",
      humanRawScore: 2,
      expectedRepetitions: 2,
      expectedSourceVideos: 2,
      pathways: [
        {
          repetitionId: "hurdle-a",
          pathway: "alignment",
          label: "Alignment",
          themes: ["alignment"],
        },
        {
          repetitionId: "hurdle-b",
          pathway: "dowel",
          label: "Dowel",
          themes: ["dowel_control"],
        },
      ],
      features: ["peakClearance", "trunkCenterOffset"],
    },
    rotary: {
      caseId: "rotary-matrix",
      status: "supported",
      expectedRepetitions: 2,
      expectedHumanScoreCounts: { 1: 1, 2: 1 },
      criteria: ["firstAnkleTouch", "returnControl"],
    },
  },
  publicationBoundary: {
    rawMediaIncluded: false,
    diagnosticClaimsAllowed: false,
  },
};

function featureRow({
  repetitionId,
  actionType,
  videoId,
  cameraView = "side",
  side = "left",
  repetitionIndex = 1,
  features,
}) {
  return {
    repetitionId,
    actionType,
    videoId,
    cameraView,
    side,
    repetitionIndex,
    features,
    quality: { analysisReadiness: "ready" },
  };
}

function aslrFeatures(seed) {
  return {
    ankleAboveHip: 0.25 + seed,
    peakElevation: 0.3 + seed,
    stationaryKneeAngleDegrees: 160 + seed * 10,
    stationaryAnkleDrift: 0.01 + seed,
    hipHeightGap: 0.02 + seed,
  };
}

function inputs(overrides = {}) {
  const rows = [
    featureRow({
      repetitionId: "deep-a",
      actionType: "deep_squat",
      videoId: "deep-video-a",
      features: {
        peakDepthRatio: 0.6,
        kneeAngleDegrees: 90,
        trunkLeanDegrees: 10,
      },
    }),
    featureRow({
      repetitionId: "deep-b",
      actionType: "deep_squat",
      videoId: "deep-video-a",
      repetitionIndex: 2,
      features: {
        peakDepthRatio: 0.7,
        kneeAngleDegrees: 70,
        trunkLeanDegrees: 20,
      },
    }),
    featureRow({
      repetitionId: "deep-c",
      actionType: "deep_squat",
      videoId: "deep-video-b",
      features: {
        peakDepthRatio: 0.8,
        kneeAngleDegrees: 50,
        trunkLeanDegrees: 15,
      },
    }),
    ...["aslr-a", "aslr-b", "aslr-c", "aslr-d"].map((repetitionId, index) =>
      featureRow({
        repetitionId,
        actionType: "active_straight_leg_raise",
        videoId: "aslr-video",
        side: index < 2 ? "left" : "right",
        repetitionIndex: index + 1,
        features: aslrFeatures(index * 0.01),
      }),
    ),
    featureRow({
      repetitionId: "hurdle-a",
      actionType: "hurdle_step",
      videoId: "hurdle-video-a",
      cameraView: "front",
      features: { peakClearance: 0.2, trunkCenterOffset: 0.01 },
    }),
    featureRow({
      repetitionId: "hurdle-b",
      actionType: "hurdle_step",
      videoId: "hurdle-video-b",
      cameraView: "mixed",
      features: { peakClearance: 0.3, trunkCenterOffset: 0.02 },
    }),
    featureRow({
      repetitionId: "rotary-a",
      actionType: "rotary_stability",
      videoId: "rotary-video-a",
      cameraView: "front",
      features: {},
    }),
    featureRow({
      repetitionId: "rotary-b",
      actionType: "rotary_stability",
      videoId: "rotary-video-b",
      cameraView: "front",
      features: {},
    }),
  ];
  return {
    config: CONFIG,
    featureMatrix: {
      matrixFingerprint: "matrix-fingerprint",
      summary: { total: 20, ready: 11 },
      rows,
    },
    aslrAudit: {
      rowsFingerprint: "aslr-fingerprint",
      rows: [
        ...["aslr-a", "aslr-b", "aslr-c", "aslr-d"].map((repetitionId) => ({
          repetitionId,
          status: "good",
        })),
        { repetitionId: "aslr-watch", status: "watch" },
      ],
    },
    canonicalPilot: {
      repetitions: ["aslr-a", "aslr-b", "aslr-c", "aslr-d"].map(
        (repetitionId) => ({
          repetitionId,
          humanReviewSummary: { consensusScore: 3 },
        }),
      ),
    },
    roundBCloseout: {
      roundBAgreement: {
        comparisonRows: [
          ...["aslr-a", "aslr-b", "aslr-c"].map((repetitionId) => ({
            repetitionId,
            actionType: "active_straight_leg_raise",
            leftStatus: "scored",
            rightStatus: "scored",
            leftScore: 3,
            rightScore: 3,
          })),
          ...["hurdle-a", "hurdle-b"].map((repetitionId) => ({
            repetitionId,
            actionType: "hurdle_step",
            leftStatus: "scored",
            rightStatus: "scored",
            leftScore: 2,
            rightScore: 2,
          })),
        ],
      },
    },
    rotaryBenchmark: {
      modelVersion: "rotary-test",
      rows: [
        {
          repetitionId: "rotary-a",
          humanConsensusScore: 1,
          aiScore: 1,
          criteria: {
            firstAnkleTouch: { status: "fail" },
            returnControl: { status: "fail" },
          },
        },
        {
          repetitionId: "rotary-b",
          humanConsensusScore: 2,
          aiScore: 2,
          criteria: {
            firstAnkleTouch: { status: "pass" },
            returnControl: { status: "watch" },
          },
        },
      ],
    },
    ...overrides,
  };
}

test("builds four differentiated analyses from pinned evidence", () => {
  const portfolio = buildPhaseICaseStudyPortfolio(inputs());
  assert.equal(portfolio.summary.selectedAnalyses, 4);
  assert.equal(portfolio.summary.applicationFigures, 4);
  assert.equal(portfolio.cases.deepSquat.repetitionCount, 3);
  assert.equal(
    portfolio.cases.deepSquat.correlations[0].repetitionLevelSpearman,
    -1,
  );
  assert.equal(portfolio.cases.aslr.blindConsensusCount, 3);
  assert.equal(portfolio.cases.hurdle.pathwayCount, 2);
  assert.equal(portfolio.cases.rotary.exactAiCount, 2);
  assert.equal(portfolio.publicationBoundary.rawMediaIncluded, false);
});

test("fails closed when a pinned source fingerprint drifts", () => {
  assert.throws(
    () =>
      buildPhaseICaseStudyPortfolio(
        inputs({
          featureMatrix: {
            matrixFingerprint: "different-fingerprint",
            summary: { total: 0, ready: 0 },
            rows: [],
          },
        }),
      ),
    /fingerprint.*drift/i,
  );
});
