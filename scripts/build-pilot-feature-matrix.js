import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getMovementAdapter } from "../src/lib/movement-adapters.js";

const BUILDER_VERSION = "pilot-feature-matrix-builder-v1";

function parseArgs(argv) {
  const args = {
    canonicalPath: "research/pilot-v1/generated/canonical-pilot.json",
    assetManifestPath: "research/pilot-v1/generated/asset-manifest.json",
    contractPath: "research/pilot-v1/feature-contract.json",
    outputDir: "research/pilot-v1/generated",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const value = argv[index + 1];
    if (token === "--canonical" && value) {
      args.canonicalPath = value;
      index += 1;
    } else if (token === "--asset-manifest" && value) {
      args.assetManifestPath = value;
      index += 1;
    } else if (token === "--contract" && value) {
      args.contractPath = value;
      index += 1;
    } else if (token === "--output-dir" && value) {
      args.outputDir = value;
      index += 1;
    }
  }
  return args;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function round(value, digits = 6) {
  return typeof value === "number" && Number.isFinite(value)
    ? Number(value.toFixed(digits))
    : (value ?? null);
}

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function validateFeatureContract(contract) {
  if (!contract?.contractVersion || !contract?.actions) {
    throw new Error(
      "Feature contract must define contractVersion and actions.",
    );
  }
  for (const [actionType, action] of Object.entries(contract.actions)) {
    const names = action.features?.map((feature) => feature.name) ?? [];
    if (names.length === 0 || new Set(names).size !== names.length) {
      throw new Error(`${actionType} must define unique feature names.`);
    }
    for (const feature of action.features) {
      if (!feature.unit || !feature.direction) {
        throw new Error(
          `${actionType}.${feature.name} is missing unit or direction.`,
        );
      }
    }
  }
}

export function sanitizePosePayload(posePayload, ingestId) {
  return {
    ...posePayload,
    sourceVideo: {
      ...posePayload.sourceVideo,
      videoId: `canonical_ingest_${ingestId}`,
      path: null,
      fileName: null,
    },
  };
}

function buildSegment(repetition) {
  return {
    segmentId: repetition.repetitionId,
    repetitionIndex: repetition.repetitionIndex,
    actionType: repetition.actionType,
    startSecond: repetition.startSecond,
    endSecond: repetition.endSecond,
    cameraView: repetition.cameraView ?? "unknown",
    side: repetition.side ?? "unknown",
    metadata: {
      attemptCondition: repetition.attemptCondition ?? null,
    },
  };
}

function buildQuality({ posePayload, timingItem, featureItem, contract }) {
  const reasons = [];
  const poseQuality = posePayload.quality ?? {};
  if (
    (poseQuality.avgVisibility ?? 0) <
    contract.qualityPolicy.minimumPoseAverageVisibility
  ) {
    reasons.push("low_pose_average_visibility");
  }
  if (
    (poseQuality.missingFramesRatio ?? 1) >
    contract.qualityPolicy.maximumPoseMissingFramesRatio
  ) {
    reasons.push("high_pose_missing_frames_ratio");
  }
  if (timingItem?.status !== "good") {
    reasons.push(`timing_${timingItem?.status ?? "missing"}`);
  }
  if (featureItem?.status !== "ok") {
    reasons.push(`feature_${featureItem?.status ?? "missing"}`);
  }

  return {
    analysisReadiness: reasons.length === 0 ? "ready" : "limited",
    reasons,
    poseAverageVisibility: round(poseQuality.avgVisibility),
    poseMissingFramesRatio: round(poseQuality.missingFramesRatio),
    poseFramesRatio: round(poseQuality.poseFramesRatio),
    timingStatus: timingItem?.status ?? "missing",
    timingIssues: (timingItem?.issues ?? []).map((issue) => issue.code),
    timingCoverageRatio: round(timingItem?.metrics?.coverageRatio),
    timingAverageVisibility: round(timingItem?.metrics?.avgVisibility),
    featureStatus: featureItem?.status ?? "missing",
  };
}

function buildFeatureValues(actionContract, featureItem) {
  return Object.fromEntries(
    actionContract.features.map((feature) => [
      feature.name,
      round(featureItem?.metrics?.[feature.name]),
    ]),
  );
}

function buildQualifierValues(actionContract, featureItem) {
  return Object.fromEntries(
    (actionContract.qualifiers ?? []).map((name) => [
      name,
      featureItem?.metrics?.[name] ?? null,
    ]),
  );
}

function summarizeRows(rows) {
  const byAction = Object.fromEntries(
    [...new Set(rows.map((row) => row.actionType))].sort().map((actionType) => {
      const actionRows = rows.filter((row) => row.actionType === actionType);
      return [
        actionType,
        {
          total: actionRows.length,
          ready: actionRows.filter(
            (row) => row.quality.analysisReadiness === "ready",
          ).length,
          limited: actionRows.filter(
            (row) => row.quality.analysisReadiness === "limited",
          ).length,
        },
      ];
    }),
  );
  return {
    total: rows.length,
    ready: rows.filter((row) => row.quality.analysisReadiness === "ready")
      .length,
    limited: rows.filter((row) => row.quality.analysisReadiness === "limited")
      .length,
    byAction,
  };
}

export function buildPilotFeatureMatrix({
  canonical,
  assetManifest,
  contract,
  repoRoot = process.cwd(),
}) {
  validateFeatureContract(contract);
  const assetsByIngestId = new Map(
    assetManifest.items.map((item) => [item.ingestId, item]),
  );
  const repetitionsByIngestId = new Map();
  for (const repetition of canonical.repetitions) {
    if (!repetitionsByIngestId.has(repetition.ingestId)) {
      repetitionsByIngestId.set(repetition.ingestId, []);
    }
    repetitionsByIngestId.get(repetition.ingestId).push(repetition);
  }

  const rows = [];
  for (const ingest of canonical.ingests) {
    const repetitions = (repetitionsByIngestId.get(ingest.ingestId) ?? []).sort(
      (left, right) => left.repetitionIndex - right.repetitionIndex,
    );
    if (repetitions.length === 0) {
      continue;
    }
    const actionContract = contract.actions[ingest.actionType];
    const adapter = getMovementAdapter(ingest.actionType);
    const asset = assetsByIngestId.get(ingest.ingestId);
    if (!actionContract || !adapter || asset?.pose?.status !== "found") {
      throw new Error(
        `Missing feature contract, adapter, or pose for ${ingest.ingestId}.`,
      );
    }

    const rawPosePayload = readJson(
      path.resolve(repoRoot, asset.pose.relativePath),
    );
    const posePayload = sanitizePosePayload(rawPosePayload, ingest.ingestId);
    const segments = repetitions.map(buildSegment);
    const timingReport = adapter.buildTimingReport({ posePayload, segments });
    const featureReport = adapter.buildFeatureReport({
      posePayload,
      timingReport,
    });
    const timingBySegment = new Map(
      (timingReport?.items ?? []).map((item) => [item.segmentId, item]),
    );
    const featuresBySegment = new Map(
      (featureReport?.items ?? []).map((item) => [item.segmentId, item]),
    );

    for (const repetition of repetitions) {
      const timingItem = timingBySegment.get(repetition.repetitionId) ?? null;
      const featureItem =
        featuresBySegment.get(repetition.repetitionId) ?? null;
      rows.push({
        repetitionId: repetition.repetitionId,
        ingestId: repetition.ingestId,
        videoId: repetition.videoId,
        actionType: repetition.actionType,
        repetitionIndex: repetition.repetitionIndex,
        cameraView: repetition.cameraView ?? "unknown",
        side: repetition.side ?? "unknown",
        startSecond: repetition.startSecond,
        endSecond: repetition.endSecond,
        poseSha256: asset.pose.sha256,
        poseModel: {
          name: rawPosePayload.poseModel?.name ?? null,
          modelVariant: rawPosePayload.poseModel?.modelVariant ?? null,
          mediapipeVersion: rawPosePayload.poseModel?.mediapipeVersion ?? null,
        },
        featureContractVersion: contract.contractVersion,
        featureSourceSecond: round(featureItem?.sourceSecond),
        features: buildFeatureValues(actionContract, featureItem),
        qualifiers: buildQualifierValues(actionContract, featureItem),
        ratings: Object.fromEntries(
          Object.entries(featureItem?.ratings ?? {}).map(([name, rating]) => [
            name,
            rating.status,
          ]),
        ),
        quality: buildQuality({
          posePayload,
          timingItem,
          featureItem,
          contract,
        }),
      });
    }
  }

  rows.sort((left, right) =>
    left.repetitionId.localeCompare(right.repetitionId),
  );
  if (rows.length !== canonical.repetitions.length) {
    throw new Error(
      `Feature row count ${rows.length} does not match canonical rep count ${canonical.repetitions.length}.`,
    );
  }
  const matrixFingerprint = sha256(JSON.stringify(rows));
  return {
    schemaVersion: "ai_fms_quantitative_feature_matrix_v1",
    builderVersion: BUILDER_VERSION,
    pilotId: canonical.pilotId,
    sourceSnapshotDate: canonical.snapshotSourceDate,
    generatedAt: new Date().toISOString(),
    featureContractVersion: contract.contractVersion,
    leakagePolicy: {
      sourceFileNameAvailableToExtractor: false,
      sourceAbsolutePathAvailableToExtractor: false,
      historicalHumanScoresAvailableToExtractor: false,
      legacyAiSuggestionsAvailableToExtractor: false,
      curatedFilenameTimingTemplatesEnabled: false,
    },
    matrixFingerprint,
    summary: summarizeRows(rows),
    rows,
  };
}

export function buildWideCsv(matrix, contract) {
  const featureColumns = [
    ...new Set(
      Object.values(contract.actions).flatMap((action) =>
        action.features.map((feature) => feature.name),
      ),
    ),
  ].sort();
  const headers = [
    "repetition_id",
    "ingest_id",
    "video_id",
    "action_type",
    "repetition_index",
    "camera_view",
    "side",
    "start_second",
    "end_second",
    "analysis_readiness",
    "quality_reasons",
    "timing_status",
    "feature_status",
    "pose_average_visibility",
    "pose_missing_frames_ratio",
    "pose_sha256",
    ...featureColumns.map((name) => `feature_${name}`),
  ];
  const rows = matrix.rows.map((row) => [
    row.repetitionId,
    row.ingestId,
    row.videoId,
    row.actionType,
    row.repetitionIndex,
    row.cameraView,
    row.side,
    row.startSecond,
    row.endSecond,
    row.quality.analysisReadiness,
    row.quality.reasons.join("|"),
    row.quality.timingStatus,
    row.quality.featureStatus,
    row.quality.poseAverageVisibility,
    row.quality.poseMissingFramesRatio,
    row.poseSha256,
    ...featureColumns.map((name) => row.features[name]),
  ]);
  return `${[headers, ...rows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n")}\n`;
}

function buildReport(matrix) {
  const lines = [
    "# Quantitative Feature Matrix QA",
    "",
    `- Generated: ${matrix.generatedAt}`,
    `- Contract: ${matrix.featureContractVersion}`,
    `- Matrix fingerprint: ${matrix.matrixFingerprint}`,
    `- Total reps: ${matrix.summary.total}`,
    `- Ready: ${matrix.summary.ready}`,
    `- Limited: ${matrix.summary.limited}`,
    "",
    "| Action | Total | Ready | Limited |",
    "| --- | ---: | ---: | ---: |",
  ];
  for (const [actionType, summary] of Object.entries(matrix.summary.byAction)) {
    lines.push(
      `| ${actionType} | ${summary.total} | ${summary.ready} | ${summary.limited} |`,
    );
  }
  lines.push(
    "",
    "Limited rows remain in the matrix with explicit quality reasons and must not be silently treated as valid measurements.",
    "",
  );
  return lines.join("\n");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = process.cwd();
  const canonical = readJson(path.resolve(repoRoot, args.canonicalPath));
  const assetManifest = readJson(
    path.resolve(repoRoot, args.assetManifestPath),
  );
  const contract = readJson(path.resolve(repoRoot, args.contractPath));
  const matrix = buildPilotFeatureMatrix({
    canonical,
    assetManifest,
    contract,
    repoRoot,
  });
  const outputDir = path.resolve(repoRoot, args.outputDir);
  fs.mkdirSync(outputDir, { recursive: true });
  const jsonText = `${JSON.stringify(matrix, null, 2)}\n`;
  const csvText = buildWideCsv(matrix, contract);
  fs.writeFileSync(
    path.join(outputDir, "quantitative-feature-matrix.json"),
    jsonText,
  );
  fs.writeFileSync(
    path.join(outputDir, "quantitative-feature-matrix.csv"),
    csvText,
  );
  fs.writeFileSync(
    path.join(outputDir, "feature-matrix-qa-report.md"),
    buildReport(matrix),
  );
  fs.writeFileSync(
    path.join(outputDir, "feature-matrix-SHA256SUMS"),
    `${sha256(jsonText)}  quantitative-feature-matrix.json\n${sha256(
      csvText,
    )}  quantitative-feature-matrix.csv\n`,
  );
  process.stdout.write(`${JSON.stringify(matrix.summary, null, 2)}\n`);
}

const isMainModule =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(fileURLToPath(import.meta.url));

if (isMainModule) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  }
}
