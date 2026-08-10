import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getRotaryStabilityExperimentalAdapter } from "../src/lib/rotary-stability-experimental-adapter.js";
import { weightedCohenKappa } from "../src/lib/study-review-agreement.js";

const DEFAULT_SPEC = "research/pilot-v1/rotary-v1-1-experimental.json";

function parseArgs(argv) {
  const options = {
    specPath: DEFAULT_SPEC,
    outputDir: null,
    poseOverrides: {},
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const value = argv[index + 1];
    if (token === "--spec" && value) {
      options.specPath = value;
      index += 1;
    } else if (token === "--output-dir" && value) {
      options.outputDir = value;
      index += 1;
    } else if (token === "--pose-override" && value) {
      const separator = value.indexOf("=");
      if (separator <= 0)
        throw new Error("pose override must be ingestId=path");
      options.poseOverrides[value.slice(0, separator)] = value.slice(
        separator + 1,
      );
      index += 1;
    } else {
      throw new Error(`Unknown or incomplete argument: ${token}`);
    }
  }
  return options;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sha256File(filePath) {
  return sha256(fs.readFileSync(filePath));
}

function round(value, digits = 4) {
  return Number.isFinite(value) ? Number(value.toFixed(digits)) : null;
}

function rate(numerator, denominator) {
  return denominator ? round(numerator / denominator) : null;
}

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function buildSegment(repetition) {
  return {
    segmentId: repetition.repetitionId,
    repetitionIndex: repetition.repetitionIndex,
    actionType: repetition.actionType,
    cameraView: repetition.cameraView ?? "unknown",
    side: repetition.side ?? "unknown",
    startSecond: repetition.startSecond,
    endSecond: repetition.endSecond,
    metadata: {
      painFlag: repetition.painFlag ?? null,
      clearingTest: repetition.clearingTest ?? null,
      clearingFindings: repetition.clearingFindings ?? [],
    },
  };
}

export function buildRotaryLabelFreeRows({
  canonical,
  assets,
  formalItems,
  poseOverrides,
  repoRoot,
}) {
  const adapter = getRotaryStabilityExperimentalAdapter();
  const formalIds = new Set(formalItems.map((item) => item.repetitionId));
  const formalIngestIds = new Set(formalItems.map((item) => item.ingestId));
  const rows = [];

  for (const ingestId of formalIngestIds) {
    const asset = assets.items.find((item) => item.ingestId === ingestId);
    if (!asset || asset.pose?.status !== "found") {
      throw new Error(`No pose asset for ${ingestId}`);
    }
    const posePath = path.resolve(
      repoRoot,
      poseOverrides[ingestId] ?? asset.pose.relativePath,
    );
    const posePayload = readJson(posePath);
    const repetitions = canonical.repetitions
      .filter((item) => item.ingestId === ingestId)
      .sort((left, right) => left.repetitionIndex - right.repetitionIndex);
    const segments = repetitions.map(buildSegment);
    const timingReport = adapter.buildTimingReport({ posePayload, segments });
    const cycleEvidenceReport = adapter.buildCycleEvidenceReport({
      posePayload,
      timingReport,
      segments,
    });
    const suggestionReport = adapter.buildSuggestionReport({
      cycleEvidenceReport,
    });
    const evidenceById = new Map(
      cycleEvidenceReport.items.map((item) => [item.segmentId, item]),
    );
    const suggestionsById = new Map(
      suggestionReport.items.map((item) => [item.segmentId, item]),
    );

    for (const repetition of repetitions.filter((item) =>
      formalIds.has(item.repetitionId),
    )) {
      const evidence = evidenceById.get(repetition.repetitionId);
      const suggestion = suggestionsById.get(repetition.repetitionId);
      rows.push({
        repetitionId: repetition.repetitionId,
        ingestId,
        repetitionIndex: repetition.repetitionIndex,
        cameraView: repetition.cameraView,
        side: repetition.side,
        posePath: path.relative(repoRoot, posePath),
        poseSha256: sha256File(posePath),
        evidenceStatus: evidence?.status ?? "missing",
        suggestionStatus: suggestion?.status ?? "missing",
        aiScore: Number.isInteger(suggestion?.totalScore)
          ? suggestion.totalScore
          : null,
        rawPoseScore: suggestion?.rawPoseScore ?? null,
        confidence: suggestion?.confidence ?? 0,
        confidenceLabel: suggestion?.confidenceLabel ?? "low",
        scoreSource: suggestion?.scoreSource ?? null,
        modelVersion: suggestion?.modelVersion ?? null,
        poseSide: evidence?.poseSide ?? null,
        phases: evidence?.phases ?? {},
        criteria: evidence?.criteria ?? {},
        metrics: evidence?.metrics ?? {},
        abstentionReasons: suggestion?.reasons ?? evidence?.issues ?? [],
      });
    }
  }
  return rows.sort((left, right) =>
    left.repetitionId.localeCompare(right.repetitionId),
  );
}

export function sanitizeRotaryLabelFreeRows(rows) {
  return rows.map((row) => ({
    repetitionId: row.repetitionId,
    actionType: "rotary_stability",
    suggestionStatus: row.suggestionStatus,
    scoringStatus: Number.isInteger(row.aiScore)
      ? "score_available"
      : "abstained",
    scoreSource: row.scoreSource,
    aiSuggestedScore: row.aiScore,
    rawPoseScore: row.rawPoseScore,
    confidence: row.confidence,
    confidenceLabel: row.confidenceLabel,
    modelVersion: row.modelVersion,
    comparisonEligible: Number.isInteger(row.aiScore),
    exclusionReason: Number.isInteger(row.aiScore)
      ? null
      : row.suggestionStatus,
    evidenceStatus: row.evidenceStatus,
    poseSide: row.poseSide,
    criteria: row.criteria,
    metrics: row.metrics,
    reasons: row.abstentionReasons,
  }));
}

function addHumanConsensus(labelFreeRows, agreement) {
  const consensusById = new Map(
    agreement.analysis.comparisonRows
      .filter(
        (row) =>
          row.actionType === "rotary_stability" &&
          row.leftStatus === "scored" &&
          row.rightStatus === "scored" &&
          row.leftScore === row.rightScore,
      )
      .map((row) => [row.repetitionId, row.leftScore]),
  );
  return labelFreeRows.map((row) => ({
    ...row,
    humanConsensusScore: consensusById.get(row.repetitionId) ?? null,
    absoluteDifference:
      Number.isInteger(row.aiScore) &&
      Number.isInteger(consensusById.get(row.repetitionId))
        ? Math.abs(row.aiScore - consensusById.get(row.repetitionId))
        : null,
  }));
}

export function summarizeRotaryInternalRows(rows) {
  const comparable = rows.filter(
    (row) =>
      Number.isInteger(row.aiScore) &&
      Number.isInteger(row.humanConsensusScore),
  );
  const scorePairs = comparable.map((row) => ({
    leftScore: row.aiScore,
    rightScore: row.humanConsensusScore,
  }));
  const exactCount = comparable.filter(
    (row) => row.absoluteDifference === 0,
  ).length;
  const withinOneCount = comparable.filter(
    (row) => row.absoluteDifference <= 1,
  ).length;
  return {
    formalItems: rows.length,
    evidenceReady: rows.filter((row) => row.evidenceStatus === "ok").length,
    scoredItems: comparable.length,
    acceptedSuggestions: rows.filter(
      (row) => row.suggestionStatus === "suggested",
    ).length,
    manualReviewItems: rows.filter(
      (row) => row.suggestionStatus === "needs_manual_review",
    ).length,
    abstainedItems: rows.filter(
      (row) => row.suggestionStatus === "insufficient_evidence",
    ).length,
    coverage: rate(comparable.length, rows.length),
    exactCount,
    exactAgreement: rate(exactCount, comparable.length),
    withinOneCount,
    withinOneAgreement: rate(withinOneCount, comparable.length),
    meanAbsoluteError: comparable.length
      ? round(
          comparable.reduce((sum, row) => sum + row.absoluteDifference, 0) /
            comparable.length,
        )
      : null,
    linearWeightedKappa: weightedCohenKappa(scorePairs, "linear"),
    quadraticWeightedKappa: weightedCohenKappa(scorePairs, "quadratic"),
    byHumanScore: Object.fromEntries(
      [0, 1, 2, 3].map((score) => {
        const scoreRows = rows.filter(
          (row) => row.humanConsensusScore === score,
        );
        return [
          score,
          {
            total: scoreRows.length,
            scored: scoreRows.filter((row) => Number.isInteger(row.aiScore))
              .length,
            exact: scoreRows.filter((row) => row.absoluteDifference === 0)
              .length,
          },
        ];
      }),
    ),
  };
}

function buildCsv(rows) {
  const headers = [
    "repetition_id",
    "ingest_id",
    "repetition_index",
    "human_consensus_score",
    "ai_score",
    "suggestion_status",
    "confidence",
    "evidence_status",
    "pose_side",
    "usable_frame_ratio",
    "first_touch_distance",
    "second_touch_distance",
    "elbow_extension_degrees",
    "knee_extension_degrees",
    "lift_delta_second",
    "return_error",
    "absolute_difference",
  ];
  const body = rows.map((row) =>
    [
      row.repetitionId,
      row.ingestId,
      row.repetitionIndex,
      row.humanConsensusScore,
      row.aiScore,
      row.suggestionStatus,
      row.confidence,
      row.evidenceStatus,
      row.poseSide,
      row.metrics.usableFrameRatio,
      row.metrics.firstAnkleTouchDistance,
      row.metrics.secondAnkleTouchDistance,
      row.metrics.elbowExtensionDegrees,
      row.metrics.kneeExtensionDegrees,
      row.metrics.liftDeltaSecond,
      row.metrics.returnError,
      row.absoluteDifference,
    ]
      .map(csvEscape)
      .join(","),
  );
  return `${headers.join(",")}\n${body.join("\n")}\n`;
}

function buildReport(payload) {
  const metrics = payload.metrics;
  const rowTable = payload.rows
    .map(
      (row) =>
        `| \`${row.repetitionId}\` | ${row.humanConsensusScore ?? "N/A"} | ${row.aiScore ?? "ABSTAIN"} | ${row.suggestionStatus} | ${row.confidence} | ${row.metrics.usableFrameRatio ?? "N/A"} |`,
    )
    .join("\n");
  return `# Rotary Stability AI v1.1 Internal Benchmark

- Model: \`${payload.modelVersion}\`
- Status: \`${payload.status}\`
- Generated: ${payload.generatedAt}
- Blind Round B isolation: **PASS**

## 结论

这是 post-audit internal benchmark，不是 held-out validation。AI 建议在载入 Round A 人工共识前已经生成；比较阶段才加入人工分数。

- 正式 Rotary reps：${metrics.formalItems}
- 有 AI 分数：${metrics.scoredItems}，coverage ${metrics.coverage}
- 拒判：${metrics.abstainedItems}
- Exact agreement：${metrics.exactCount}/${metrics.scoredItems} (${metrics.exactAgreement ?? "N/A"})
- Within-one：${metrics.withinOneCount}/${metrics.scoredItems} (${metrics.withinOneAgreement ?? "N/A"})
- MAE：${metrics.meanAbsoluteError ?? "N/A"}
- Linear / quadratic weighted kappa：${metrics.linearWeightedKappa ?? "N/A"} / ${metrics.quadraticWeightedKappa ?? "N/A"}

coverage 与 agreement 必须分开阅读。低 pose phase coverage 时拒判属于设计行为，不应通过降低 visibility gate 强行补齐。

## Rep-level audit

| Rep | Human consensus | AI | Status | Confidence | Usable pose ratio |
| --- | ---: | ---: | --- | ---: | ---: |
${rowTable}

## 边界

- 分数 0 只由人工 pain / flexion clearing metadata 触发，pose 不推断疼痛。
- 分数 3 要求完整周期、同时离地和 board alignment 均有证据；没有 board evidence 时最多给保守的 2 分建议。
- 本结果与 blind Round B reviewer path 完全隔离，仅在签名人评导出完成后作内部比较。
`;
}

export function runRotaryInternalBenchmark({
  specPath,
  outputDir,
  poseOverrides = {},
  repoRoot = process.cwd(),
}) {
  const spec = readJson(path.resolve(repoRoot, specPath));
  const resolvedOutputDir = path.resolve(
    repoRoot,
    outputDir ?? spec.defaultOutputDir,
  );
  const frozenAiPath = path.resolve(
    repoRoot,
    spec.roundBIsolation.frozenAiPath,
  );
  const frozenAiSha256 = sha256File(frozenAiPath);
  if (frozenAiSha256 !== spec.roundBIsolation.expectedSha256) {
    throw new Error("Frozen Round B AI v1.0 fingerprint changed");
  }
  if (spec.roundBIsolation.exposeExperimentalScore !== false) {
    throw new Error(
      "Experimental Rotary score must remain hidden from Round B",
    );
  }

  const canonical = readJson(path.resolve(repoRoot, spec.inputs.canonicalPath));
  const assets = readJson(
    path.resolve(repoRoot, spec.inputs.assetManifestPath),
  );
  const formal = readJson(
    path.resolve(repoRoot, spec.inputs.formalManifestPath),
  );
  const formalItems = formal.items.filter(
    (item) => item.actionType === "rotary_stability",
  );
  if (formalItems.length !== spec.expectedFormalRotaryItems) {
    throw new Error(
      `Expected ${spec.expectedFormalRotaryItems} formal Rotary items, found ${formalItems.length}`,
    );
  }

  // Human labels are intentionally unavailable during suggestion generation.
  const labelFreeRows = buildRotaryLabelFreeRows({
    canonical,
    assets,
    formalItems,
    poseOverrides,
    repoRoot,
  });
  const agreement = readJson(path.resolve(repoRoot, spec.inputs.agreementPath));
  const rows = addHumanConsensus(labelFreeRows, agreement);
  const labelFreePayload = {
    schemaVersion: "ai-fms-rotary-v1.1-label-free-suggestions-v1",
    modelVersion: spec.modelVersion,
    generatedAt: new Date().toISOString(),
    evaluationBoundary: {
      humanLabelsLoaded: false,
      reviewerExposure: "none",
      roundBStudyModeLoaded: false,
      claimsAllowed: "post_audit_internal_predictions_only",
    },
    summary: {
      formalItems: labelFreeRows.length,
      scoreAvailable: labelFreeRows.filter((row) =>
        Number.isInteger(row.aiScore),
      ).length,
      abstained: labelFreeRows.filter((row) => !Number.isInteger(row.aiScore))
        .length,
    },
    rows: sanitizeRotaryLabelFreeRows(labelFreeRows),
  };
  const payload = {
    schemaVersion: "ai-fms-rotary-v1.1-internal-benchmark-v1",
    modelVersion: spec.modelVersion,
    status: spec.status,
    generatedAt: new Date().toISOString(),
    evaluationBoundary: {
      labelFreeSuggestionGeneration: true,
      heldOutValidation: false,
      sourceVideoIndependent: false,
      claimsAllowed: "post_audit_internal_benchmark_only",
    },
    roundBIsolation: {
      frozenAiPath: spec.roundBIsolation.frozenAiPath,
      frozenAiSha256,
      experimentalScoreExposed: false,
    },
    poseOverrides,
    sourceFingerprints: {
      spec: sha256File(path.resolve(repoRoot, specPath)),
      canonical: sha256File(path.resolve(repoRoot, spec.inputs.canonicalPath)),
      assets: sha256File(path.resolve(repoRoot, spec.inputs.assetManifestPath)),
      formal: sha256File(
        path.resolve(repoRoot, spec.inputs.formalManifestPath),
      ),
      agreement: sha256File(path.resolve(repoRoot, spec.inputs.agreementPath)),
      algorithm: Object.fromEntries(
        spec.algorithmSourcePaths.map((sourcePath) => [
          sourcePath,
          sha256File(path.resolve(repoRoot, sourcePath)),
        ]),
      ),
    },
    metrics: summarizeRotaryInternalRows(rows),
    rows,
  };
  const outputs = {
    "rotary-v1-1-label-free-suggestions.json": `${JSON.stringify(labelFreePayload, null, 2)}\n`,
    "rotary-v1-1-internal-benchmark.json": `${JSON.stringify(payload, null, 2)}\n`,
    "rotary-v1-1-internal-benchmark.csv": buildCsv(rows),
    "rotary-v1-1-internal-benchmark-report.md": buildReport(payload),
  };
  fs.mkdirSync(resolvedOutputDir, { recursive: true });
  for (const [fileName, contents] of Object.entries(outputs)) {
    fs.writeFileSync(path.join(resolvedOutputDir, fileName), contents);
  }
  const checksums = Object.keys(outputs)
    .sort()
    .map((fileName) => `${sha256(outputs[fileName])}  ${fileName}`)
    .join("\n");
  fs.writeFileSync(
    path.join(resolvedOutputDir, "SHA256SUMS"),
    `${checksums}\n`,
  );
  return { payload, outputDir: path.relative(repoRoot, resolvedOutputDir) };
}

const isCli =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isCli) {
  const options = parseArgs(process.argv.slice(2));
  const result = runRotaryInternalBenchmark({
    specPath: options.specPath,
    outputDir: options.outputDir,
    poseOverrides: options.poseOverrides,
  });
  console.log(JSON.stringify(result.payload.metrics, null, 2));
  console.log(`Wrote ${result.outputDir}`);
}
