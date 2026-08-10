import assert from "node:assert/strict";
import test from "node:test";
import { buildPhaseICaseStudyPortfolio } from "../scripts/build-phase-i-application-figures.js";

const CONFIG = {
  portfolioId: "test-portfolio",
  sources: {
    featureMatrixFingerprint: "matrix-fingerprint",
    aslrSensitivityFingerprint: "aslr-fingerprint",
    roundBEvidenceFingerprint: "round-b-fingerprint",
  },
  cases: {
    deepSquat: {
      caseId: "deep",
      status: "supported",
      humanRawScore: 2,
      auditedCameraView: "side",
      leftRepetitionId: "deep-a",
      rightRepetitionId: "deep-b",
      features: [
        {
          name: "peakDepthRatio",
          label: "Depth",
          unit: "ratio",
          decimals: 2,
        },
      ],
    },
    aslr: {
      caseId: "aslr",
      status: "sensitivity",
      repetitionIds: ["aslr-a"],
    },
    hurdle: {
      caseId: "hurdle",
      status: "view-confounded",
      humanRawScore: 2,
      leftRepetitionId: "hurdle-a",
      rightRepetitionId: "hurdle-b",
      expectedViews: ["mixed", "front"],
    },
    rotary: {
      caseId: "rotary",
      status: "feature-only",
      expectedFormalItems: 8,
      expectedAiScoreAvailable: 0,
    },
  },
  publicationBoundary: {
    rawMediaIncluded: false,
    diagnosticClaimsAllowed: false,
  },
};

function row(repetitionId, actionType, videoId, cameraView, features = {}) {
  return { repetitionId, actionType, videoId, cameraView, features };
}

function inputs(overrides = {}) {
  return {
    config: CONFIG,
    featureMatrix: {
      matrixFingerprint: "matrix-fingerprint",
      rows: [
        row("deep-a", "deep_squat", "video-a", "side", {
          peakDepthRatio: 0.6,
        }),
        row("deep-b", "deep_squat", "video-b", "side", {
          peakDepthRatio: 0.8,
        }),
        row("hurdle-a", "hurdle_step", "video-c", "mixed"),
        row("hurdle-b", "hurdle_step", "video-d", "front"),
      ],
    },
    aslrSensitivity: {
      rowsFingerprint: "aslr-fingerprint",
      rows: [
        {
          repetitionId: "aslr-a",
          baseline: {
            status: "limited",
            metrics: { strongFrameCount: 3 },
          },
          sensitivity: {
            status: "good",
            metrics: {
              strongFrameCount: 30,
              dominantSideRatio: 0.95,
              sideSwitchRate: 0.04,
              segmentSideAgreement: "match",
            },
          },
        },
      ],
    },
    roundBEvidence: {
      manifestFingerprint: "round-b-fingerprint",
      summary: {
        byAction: {
          rotary_stability: {
            total: 8,
            aiScoreAvailable: 0,
            byEvidenceStatus: { features_only: 8 },
          },
        },
      },
    },
    ...overrides,
  };
}

test("builds a four-case application portfolio from frozen sources", () => {
  const portfolio = buildPhaseICaseStudyPortfolio(inputs());
  assert.equal(portfolio.summary.selectedCases, 4);
  assert.equal(portfolio.summary.applicationFigures, 2);
  assert.equal(portfolio.cases.deepSquat.humanRawScore, 2);
  assert.equal(portfolio.cases.deepSquat.features[0].leftValue, 0.6);
  assert.equal(portfolio.cases.aslr.rows[0].sensitivityStatus, "good");
  assert.equal(portfolio.cases.rotary.featureOnlyItems, 8);
  assert.equal(portfolio.publicationBoundary.rawMediaIncluded, false);
});

test("fails closed when a frozen source fingerprint drifts", () => {
  assert.throws(
    () =>
      buildPhaseICaseStudyPortfolio(
        inputs({
          featureMatrix: {
            matrixFingerprint: "different-fingerprint",
            rows: [],
          },
        }),
      ),
    /fingerprint.*drift/i,
  );
});
