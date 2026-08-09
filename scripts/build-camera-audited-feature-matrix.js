import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  analyzeLabelFreeProfiles,
  summarizeConsensusOverlay,
} from "../src/lib/label-free-profile-analysis.js";
import {
  buildPilotFeatureMatrix,
  buildWideCsv,
} from "./build-pilot-feature-matrix.js";

const DEFAULTS = {
  canonicalPath: "research/pilot-v1/generated/canonical-pilot.json",
  assetManifestPath: "research/pilot-v1/generated/asset-manifest.json",
  contractPath: "research/pilot-v1/feature-contract.json",
  baseMatrixPath:
    "research/pilot-v1/generated/quantitative-feature-matrix.json",
  baseChecksumsPath: "research/pilot-v1/generated/feature-matrix-SHA256SUMS",
  cameraAuditPath:
    "research/pilot-v1/generated/camera-view-audit/camera-view-audit.json",
  cameraAuditChecksumsPath:
    "research/pilot-v1/generated/camera-view-audit/SHA256SUMS",
  fullPoolPath:
    "research/pilot-v1/generated/full-pool-utilization/full-pool-utilization.json",
  fullPoolChecksumsPath:
    "research/pilot-v1/generated/full-pool-utilization/full-pool-utilization-SHA256SUMS",
  baseProfilesPath:
    "research/pilot-v1/generated/label-free-profiles/label-free-profile-analysis.json",
  baseProfilesChecksumsPath:
    "research/pilot-v1/generated/label-free-profiles/label-free-profile-SHA256SUMS",
  outputDir: "research/pilot-v1/generated/camera-audited-features",
};

function parseArgs(argv) {
  const options = { ...DEFAULTS };
  const argumentMap = {
    "--canonical": "canonicalPath",
    "--asset-manifest": "assetManifestPath",
    "--contract": "contractPath",
    "--base-matrix": "baseMatrixPath",
    "--base-checksums": "baseChecksumsPath",
    "--camera-audit": "cameraAuditPath",
    "--camera-audit-checksums": "cameraAuditChecksumsPath",
    "--full-pool": "fullPoolPath",
    "--full-pool-checksums": "fullPoolChecksumsPath",
    "--base-profiles": "baseProfilesPath",
    "--base-profile-checksums": "baseProfilesChecksumsPath",
    "--output-dir": "outputDir",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argumentMap[argv[index]];
    if (!key || !argv[index + 1]) {
      throw new Error(`Unknown or incomplete argument: ${argv[index]}`);
    }
    options[key] = argv[++index];
  }
  return options;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readChecksums(filePath) {
  return new Map(
    fs
      .readFileSync(filePath, "utf8")
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const match = line.match(/^([a-f0-9]{64})\s+\*?(.+)$/i);
        if (!match) throw new Error(`Invalid checksum line: ${line}`);
        return [match[2].trim(), match[1].toLowerCase()];
      }),
  );
}

function readVerifiedJson(filePath, checksumPath) {
  const raw = fs.readFileSync(filePath);
  const expected = readChecksums(checksumPath).get(path.basename(filePath));
  if (!expected || sha256(raw) !== expected) {
    throw new Error(`SHA-256 verification failed for ${filePath}`);
  }
  return JSON.parse(raw.toString("utf8"));
}

function differenceKeys(before = {}, after = {}) {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    .sort();
}

export function summarizeCameraAuditedFeatureSensitivity({
  baseMatrix,
  auditedMatrix,
}) {
  const baseRows = new Map(
    baseMatrix.rows.map((row) => [row.repetitionId, row]),
  );
  const changedRows = auditedMatrix.rows
    .map((row) => {
      const base = baseRows.get(row.repetitionId);
      if (!base)
        throw new Error(`Missing base feature row: ${row.repetitionId}`);
      const featureChanges = differenceKeys(base.features, row.features);
      const ratingChanges = differenceKeys(base.ratings, row.ratings);
      const qualifierChanges = differenceKeys(base.qualifiers, row.qualifiers);
      const qualityChanged =
        JSON.stringify(base.quality) !== JSON.stringify(row.quality);
      const cameraViewChanged = base.cameraView !== row.cameraView;
      if (
        !cameraViewChanged &&
        featureChanges.length === 0 &&
        ratingChanges.length === 0 &&
        qualifierChanges.length === 0 &&
        !qualityChanged
      ) {
        return null;
      }
      return {
        repetitionId: row.repetitionId,
        actionType: row.actionType,
        originalCameraView: base.cameraView,
        auditedCameraView: row.cameraView,
        featureChanges,
        ratingChanges,
        qualifierChanges,
        qualityChanged,
        readinessBefore: base.quality.analysisReadiness,
        readinessAfter: row.quality.analysisReadiness,
      };
    })
    .filter(Boolean);

  const actionTypes = [
    ...new Set(auditedMatrix.rows.map((row) => row.actionType)),
  ].sort();
  return {
    baseMatrixFingerprint: baseMatrix.matrixFingerprint,
    auditedMatrixFingerprint: auditedMatrix.matrixFingerprint,
    totalRows: auditedMatrix.rows.length,
    cameraViewChanges: changedRows.filter(
      (row) => row.originalCameraView !== row.auditedCameraView,
    ).length,
    rowsWithAnyChange: changedRows.length,
    rowsWithFeatureChanges: changedRows.filter(
      (row) => row.featureChanges.length > 0,
    ).length,
    rowsWithRatingChanges: changedRows.filter(
      (row) => row.ratingChanges.length > 0,
    ).length,
    rowsWithQualifierChanges: changedRows.filter(
      (row) => row.qualifierChanges.length > 0,
    ).length,
    rowsWithQualityChanges: changedRows.filter((row) => row.qualityChanged)
      .length,
    rowsWithReadinessChanges: changedRows.filter(
      (row) => row.readinessBefore !== row.readinessAfter,
    ).length,
    baseSummary: baseMatrix.summary,
    auditedSummary: auditedMatrix.summary,
    byAction: Object.fromEntries(
      actionTypes.map((actionType) => {
        const rows = changedRows.filter((row) => row.actionType === actionType);
        return [
          actionType,
          {
            cameraViewChanges: rows.filter(
              (row) => row.originalCameraView !== row.auditedCameraView,
            ).length,
            featureChanges: rows.filter((row) => row.featureChanges.length > 0)
              .length,
            ratingChanges: rows.filter((row) => row.ratingChanges.length > 0)
              .length,
            readinessChanges: rows.filter(
              (row) => row.readinessBefore !== row.readinessAfter,
            ).length,
          },
        ];
      }),
    ),
    changedRows,
  };
}

function buildAuditedPoolRows(fullPoolRows, auditedMatrix) {
  const auditedRows = new Map(
    auditedMatrix.rows.map((row) => [row.repetitionId, row]),
  );
  return fullPoolRows.map((row) => {
    const audited = auditedRows.get(row.repetitionId);
    if (!audited)
      throw new Error(`Missing audited feature row: ${row.repetitionId}`);
    return {
      ...row,
      cameraView: audited.cameraView,
      featureReadiness: audited.quality.analysisReadiness,
      featureReasons: audited.quality.reasons,
      featureReady: audited.quality.analysisReadiness === "ready",
      features: audited.features,
    };
  });
}

function summarizeProfileSensitivity({
  baseProfiles,
  auditedAnalysis,
  auditedOverlay,
}) {
  const assignmentChanges = [];
  const actionChanges = {};
  for (const [actionType, auditedAction] of Object.entries(
    auditedAnalysis.actions,
  )) {
    const baseAction = baseProfiles.analysis.actions[actionType];
    const baseAssignments = new Map(
      baseAction.assignments.map((row) => [row.repetitionId, row]),
    );
    for (const row of auditedAction.assignments) {
      const before = baseAssignments.get(row.repetitionId);
      if (!before) throw new Error(`Missing base profile: ${row.repetitionId}`);
      if (
        before.profileGroup !== row.profileGroup ||
        before.outlierRank !== row.outlierRank
      ) {
        assignmentChanges.push({
          actionType,
          repetitionId: row.repetitionId,
          profileGroupBefore: before.profileGroup,
          profileGroupAfter: row.profileGroup,
          outlierRankBefore: before.outlierRank,
          outlierRankAfter: row.outlierRank,
        });
      }
    }
    actionChanges[actionType] = {
      profileGroupChanges: assignmentChanges.filter(
        (row) =>
          row.actionType === actionType &&
          row.profileGroupBefore !== row.profileGroupAfter,
      ).length,
      outlierRankChanges: assignmentChanges.filter(
        (row) =>
          row.actionType === actionType &&
          row.outlierRankBefore !== row.outlierRankAfter,
      ).length,
      sourceEffectChanged:
        baseAction.sourceVideoEffect.heuristicFlag !==
        auditedAction.sourceVideoEffect.heuristicFlag,
      stabilityStatusChanged:
        baseAction.leaveOneVideoOut.status !==
        auditedAction.leaveOneVideoOut.status,
    };
  }
  return {
    featureReadyCount: auditedAnalysis.featureReadyCount,
    profileGroupChanges: assignmentChanges.filter(
      (row) => row.profileGroupBefore !== row.profileGroupAfter,
    ).length,
    outlierRankChanges: assignmentChanges.filter(
      (row) => row.outlierRankBefore !== row.outlierRankAfter,
    ).length,
    scoreStrataChanged:
      JSON.stringify(baseProfiles.consensusOverlay.scoreStrata) !==
      JSON.stringify(auditedOverlay.scoreStrata),
    sourceEffectFlagChanges: Object.values(actionChanges).filter(
      (row) => row.sourceEffectChanged,
    ).length,
    stabilityStatusChanges: Object.values(actionChanges).filter(
      (row) => row.stabilityStatusChanged,
    ).length,
    byAction: actionChanges,
    assignmentChanges,
  };
}

function buildReport(sensitivity) {
  const actionRows = Object.entries(sensitivity.byAction)
    .map(
      ([actionType, row]) =>
        `| ${actionType} | ${row.cameraViewChanges} | ${row.featureChanges} | ${row.ratingChanges} | ${row.readinessChanges} |`,
    )
    .join("\n");
  return `# Camera-Audited Feature Matrix Sensitivity

## 结论

- 保留冻结的原始 feature matrix，不覆盖 Round A formal manifest fingerprint。
- 110 条 rep 使用 \`auditedCameraView\` 重建；${sensitivity.cameraViewChanges} 条机位发生变化。
- 数值 feature 变化：${sensitivity.rowsWithFeatureChanges} 条；rating 变化：${sensitivity.rowsWithRatingChanges} 条。
- Feature readiness 变化：${sensitivity.rowsWithReadinessChanges} 条；ready/limited 总数保持 ${sensitivity.auditedSummary.ready}/${sensitivity.auditedSummary.limited}。
- Label-free profile group 变化：${sensitivity.profileSensitivity.profileGroupChanges} 条；score strata 是否变化：${sensitivity.profileSensitivity.scoreStrataChanged ? "是" : "否"}。
- Outlier rank 变化：${sensitivity.profileSensitivity.outlierRankChanges} 条；source-effect/stability 状态变化：${sensitivity.profileSensitivity.sourceEffectFlagChanges}/${sensitivity.profileSensitivity.stabilityStatusChanges}。
- 这是一项 camera-metadata sensitivity analysis，不是新的正式 study 冻结包。

| Action | View changes | Numeric feature changes | Rating changes | Readiness changes |
| ------ | -----------: | ----------------------: | -------------: | ----------------: |
${actionRows}

## 使用规则

- Round A 审核 lineage 继续引用原始 matrix fingerprint。
- 新的 AI evidence、机位分层和 application case table 应使用本审计 matrix。
- 若某条 rep 为 \`mixed\` 或 \`unknown\`，不得把 front-only Hurdle stance 指标当成可靠证据。
- 所有输出仍为 pose-derived proxy，不是医疗诊断或临床量角器测量。
`;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const root = process.cwd();
  const resolve = (value) => path.resolve(root, value);
  const canonical = readJson(resolve(options.canonicalPath));
  const assetManifest = readJson(resolve(options.assetManifestPath));
  const contract = readJson(resolve(options.contractPath));
  const baseMatrix = readVerifiedJson(
    resolve(options.baseMatrixPath),
    resolve(options.baseChecksumsPath),
  );
  const cameraAudit = readVerifiedJson(
    resolve(options.cameraAuditPath),
    resolve(options.cameraAuditChecksumsPath),
  );
  const fullPool = readVerifiedJson(
    resolve(options.fullPoolPath),
    resolve(options.fullPoolChecksumsPath),
  );
  const baseProfiles = readVerifiedJson(
    resolve(options.baseProfilesPath),
    resolve(options.baseProfilesChecksumsPath),
  );

  const auditedViews = new Map(
    cameraAudit.rows.map((row) => [row.repetitionId, row.auditedCameraView]),
  );
  if (
    auditedViews.size !== canonical.repetitions.length ||
    cameraAudit.summary.repetitions !== canonical.repetitions.length
  ) {
    throw new Error("Camera-view audit does not cover the canonical pilot");
  }
  const auditedCanonical = {
    ...canonical,
    repetitions: canonical.repetitions.map((repetition) => {
      const cameraView = auditedViews.get(repetition.repetitionId);
      if (!cameraView) {
        throw new Error(`Missing audited view: ${repetition.repetitionId}`);
      }
      return { ...repetition, cameraView };
    }),
  };
  const matrix = buildPilotFeatureMatrix({
    canonical: auditedCanonical,
    assetManifest,
    contract,
    repoRoot: root,
  });
  const auditedMatrix = {
    ...matrix,
    schemaVersion: "ai_fms_quantitative_feature_matrix_camera_audited_v1",
    sourceFeatureMatrixFingerprint: baseMatrix.matrixFingerprint,
    cameraViewAudit: {
      schemaVersion: cameraAudit.schemaVersion,
      sourcePath: options.cameraAuditPath,
      sourceSha256: sha256(fs.readFileSync(resolve(options.cameraAuditPath))),
      correctedRepetitions: cameraAudit.summary.corrected,
    },
  };
  const sensitivity = summarizeCameraAuditedFeatureSensitivity({
    baseMatrix,
    auditedMatrix,
  });
  const auditedPoolRows = buildAuditedPoolRows(
    fullPool.analysis.rows,
    auditedMatrix,
  );
  const auditedAnalysis = analyzeLabelFreeProfiles({
    rows: auditedPoolRows,
    featureContract: contract,
  });
  const comparisonRows = baseProfiles.consensusOverlay.rows.map((row) => ({
    repetitionId: row.repetitionId,
    leftStatus: "scored",
    rightStatus: "scored",
    leftScore: row.consensusScore,
    rightScore: row.consensusScore,
  }));
  const auditedOverlay = summarizeConsensusOverlay({
    analysis: auditedAnalysis,
    comparisonRows,
  });
  sensitivity.profileSensitivity = summarizeProfileSensitivity({
    baseProfiles,
    auditedAnalysis,
    auditedOverlay,
  });

  const outputDir = resolve(options.outputDir);
  fs.mkdirSync(outputDir, { recursive: true });
  const outputs = {
    "camera-audited-feature-matrix.json": `${JSON.stringify(auditedMatrix, null, 2)}\n`,
    "camera-audited-feature-matrix.csv": buildWideCsv(auditedMatrix, contract),
    "camera-audited-feature-sensitivity.json": `${JSON.stringify(sensitivity, null, 2)}\n`,
    "camera-audited-feature-sensitivity-report.md": buildReport(sensitivity),
  };
  for (const [name, content] of Object.entries(outputs)) {
    fs.writeFileSync(path.join(outputDir, name), content);
  }
  fs.writeFileSync(
    path.join(outputDir, "SHA256SUMS"),
    `${Object.entries(outputs)
      .map(([name, content]) => `${sha256(content)}  ${name}`)
      .join("\n")}\n`,
  );
  const consoleSummary = structuredClone(sensitivity);
  delete consoleSummary.changedRows;
  delete consoleSummary.profileSensitivity.assignmentChanges;
  process.stdout.write(`${JSON.stringify(consoleSummary, null, 2)}\n`);
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
