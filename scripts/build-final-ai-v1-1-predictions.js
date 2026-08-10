import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildLeakageFreeAiSuggestions } from "../src/lib/round-a-ai-consensus-analysis.js";

const DEFAULT_SPEC = "research/pilot-v1/final-ai-v1-1-spec.json";
const VALID_ATTEMPT_CONDITIONS = new Set(["floor", "heels_elevated_board"]);

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sha256File(filePath) {
  return sha256(fs.readFileSync(filePath));
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
  const expected = readChecksums(checksumPath).get(path.basename(filePath));
  const actual = sha256File(filePath);
  if (!expected || expected !== actual) {
    throw new Error(`SHA-256 verification failed for ${filePath}`);
  }
  return { payload: readJson(filePath), sha256: actual };
}

function verifyPinnedJson(filePath, expectedSha256) {
  const actual = sha256File(filePath);
  if (actual !== expectedSha256) {
    throw new Error(`Pinned SHA-256 changed for ${filePath}`);
  }
  return { payload: readJson(filePath), sha256: actual };
}

function validateProtocolAudit(audit, formalItems) {
  const formalDeepSquatIds = new Set(
    formalItems
      .filter((item) => item.actionType === "deep_squat")
      .map((item) => item.repetitionId),
  );
  if (audit.policy?.humanScoresUsed !== false) {
    throw new Error("Protocol audit must explicitly exclude human scores");
  }
  if (audit.rows?.length !== formalDeepSquatIds.size) {
    throw new Error("Protocol audit must cover every formal Deep Squat rep");
  }
  const seen = new Set();
  for (const row of audit.rows) {
    if (!formalDeepSquatIds.has(row.repetitionId)) {
      throw new Error(
        `Protocol audit has a non-formal rep ${row.repetitionId}`,
      );
    }
    if (seen.has(row.repetitionId)) {
      throw new Error(`Duplicate protocol audit rep ${row.repetitionId}`);
    }
    if (!VALID_ATTEMPT_CONDITIONS.has(row.protocolMetadata?.attemptCondition)) {
      throw new Error(`Invalid attempt condition for ${row.repetitionId}`);
    }
    seen.add(row.repetitionId);
  }
}

function sanitizeBaseRow(row) {
  return {
    repetitionId: row.repetitionId,
    actionType: row.actionType,
    suggestionStatus: row.suggestionStatus,
    scoringStatus: row.scoringStatus,
    scoreSource: row.scoreSource,
    aiSuggestedScore: row.aiSuggestedScore,
    rawPoseScore: row.rawPoseScore,
    confidence: row.confidence,
    confidenceLabel: row.confidenceLabel,
    modelVersion: row.modelVersion,
    comparisonEligible: row.comparisonEligible,
    exclusionReason: row.exclusionReason,
    protocolMetadataSource: row.protocolMetadataSource,
    attemptCondition: row.attemptCondition,
  };
}

function countByAction(rows) {
  return Object.fromEntries(
    [...new Set(rows.map((row) => row.actionType))].sort().map((actionType) => {
      const actionRows = rows.filter((row) => row.actionType === actionType);
      return [
        actionType,
        {
          total: actionRows.length,
          scoreAvailable: actionRows.filter((row) => row.comparisonEligible)
            .length,
          abstained: actionRows.filter((row) => !row.comparisonEligible).length,
        },
      ];
    }),
  );
}

function validateNoLabelLeakage(rows) {
  const forbidden = /human|reviewer|file(name)?|path|legacy/i;
  for (const row of rows) {
    const stack = [row];
    while (stack.length) {
      const value = stack.pop();
      if (!value || typeof value !== "object") continue;
      for (const [key, child] of Object.entries(value)) {
        if (forbidden.test(key)) {
          throw new Error(`Forbidden prediction key: ${key}`);
        }
        if (child && typeof child === "object") stack.push(child);
      }
    }
  }
}

function validateExpected(summary, expected) {
  for (const key of ["formalItems", "scoreAvailable", "abstained"]) {
    if (summary[key] !== expected[key]) {
      throw new Error(
        `Expected ${key}=${expected[key]}, found ${summary[key]}`,
      );
    }
  }
  for (const [actionType, expectedAction] of Object.entries(
    expected.byAction,
  )) {
    const actual = summary.byAction[actionType];
    if (
      !actual ||
      actual.total !== expectedAction.total ||
      actual.scoreAvailable !== expectedAction.scoreAvailable
    ) {
      throw new Error(`Unexpected action summary for ${actionType}`);
    }
  }
}

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function buildCsv(rows) {
  const columns = [
    "repetitionId",
    "actionType",
    "aiSuggestedScore",
    "rawPoseScore",
    "suggestionStatus",
    "scoringStatus",
    "comparisonEligible",
    "exclusionReason",
    "confidence",
    "confidenceLabel",
    "scoreSource",
    "modelVersion",
    "attemptCondition",
  ];
  return `${[
    columns,
    ...rows.map((row) => columns.map((column) => row[column])),
  ]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n")}\n`;
}

function buildReport(payload) {
  const rows = Object.entries(payload.summary.byAction)
    .map(
      ([actionType, item]) =>
        `| ${actionType} | ${item.total} | ${item.scoreAvailable} | ${item.abstained} |`,
    )
    .join("\n");
  return `# Final Locked AI v1.1 Predictions

## 状态

这是供 Round B 完成后进行 AI-human agreement 的锁定预测包。生成过程没有载入 human score、reviewer export 或 Round B Study Mode。

- 正式 reps：${payload.summary.formalItems}
- 有 AI raw score：${payload.summary.scoreAvailable}
- 原则性拒判：${payload.summary.abstained}
- Package fingerprint：\`${payload.packageFingerprint}\`

| Action | Total | Score available | Abstained |
| --- | ---: | ---: | ---: |
${rows}

Deep Squat 的 4 条 floor attempt 因缺少按 FMS staged protocol 要求的 heels-elevated follow-up attempt 而拒判，不应被强行补分。Rotary Stability 使用 experimental cycle-based first-pass，并保留人工 pain / clearing gate。

## 解释边界

本包是 post-audit internal predictions，不是 held-out validation。它可以与完成后的盲评结果比较，但不能据此宣称独立外部准确率。

## 复现

- 命令：\`npm run study:ai:final-v1-1\`
- JSON：\`final-ai-v1-1-predictions.json\`
- CSV：\`final-ai-v1-1-predictions.csv\`
`;
}

export function buildFinalAiV11Predictions({
  specPath = DEFAULT_SPEC,
  outputDir = null,
  repoRoot = process.cwd(),
} = {}) {
  const resolvedSpecPath = path.resolve(repoRoot, specPath);
  const spec = readJson(resolvedSpecPath);
  const resolveInput = (name) => path.resolve(repoRoot, spec.inputs[name]);
  const canonical = readVerifiedJson(
    resolveInput("canonicalPath"),
    resolveInput("canonicalChecksumsPath"),
  );
  const featureMatrix = readVerifiedJson(
    resolveInput("featureMatrixPath"),
    resolveInput("featureChecksumsPath"),
  );
  const formal = verifyPinnedJson(
    resolveInput("formalManifestPath"),
    spec.inputs.formalManifestSha256,
  );
  const protocolAudit = verifyPinnedJson(
    resolveInput("protocolAuditPath"),
    spec.inputs.protocolAuditSha256,
  );
  const rotary = readVerifiedJson(
    resolveInput("rotarySuggestionsPath"),
    resolveInput("rotaryChecksumsPath"),
  );

  validateProtocolAudit(protocolAudit.payload, formal.payload.items);
  if (rotary.payload.evaluationBoundary?.humanLabelsLoaded !== false) {
    throw new Error("Rotary predictions are not label-free");
  }

  const formalIds = new Set(
    formal.payload.items.map((item) => item.repetitionId),
  );
  const base = buildLeakageFreeAiSuggestions({
    featureMatrix: featureMatrix.payload,
    canonical: canonical.payload,
    protocolMetadataAudit: protocolAudit.payload,
  });
  const baseRows = base.rows
    .filter((row) => formalIds.has(row.repetitionId))
    .map(sanitizeBaseRow);
  const baseById = new Map(baseRows.map((row) => [row.repetitionId, row]));
  for (const rotaryRow of rotary.payload.rows) {
    if (!formalIds.has(rotaryRow.repetitionId)) {
      throw new Error(
        `Rotary output has a non-formal rep ${rotaryRow.repetitionId}`,
      );
    }
    baseById.set(rotaryRow.repetitionId, {
      ...rotaryRow,
      protocolMetadataSource: "not_applicable",
      attemptCondition: null,
    });
  }
  const rows = [...baseById.values()].sort((left, right) =>
    left.repetitionId.localeCompare(right.repetitionId),
  );
  if (rows.length !== formalIds.size) {
    throw new Error("Final AI package does not match the formal manifest");
  }
  validateNoLabelLeakage(rows);

  const summary = {
    formalItems: rows.length,
    scoreAvailable: rows.filter((row) => row.comparisonEligible).length,
    abstained: rows.filter((row) => !row.comparisonEligible).length,
    byAction: countByAction(rows),
  };
  validateExpected(summary, spec.expected);

  const sourceFingerprints = {
    spec: sha256File(resolvedSpecPath),
    canonical: canonical.sha256,
    featureMatrix: featureMatrix.sha256,
    formalManifest: formal.sha256,
    protocolAudit: protocolAudit.sha256,
    rotarySuggestions: rotary.sha256,
    algorithm: Object.fromEntries(
      spec.algorithmSourcePaths.map((sourcePath) => [
        sourcePath,
        sha256File(path.resolve(repoRoot, sourcePath)),
      ]),
    ),
  };
  const packageFingerprint = sha256(
    JSON.stringify({ sourceFingerprints, rows }),
  );
  const payload = {
    schemaVersion: "ai_fms_final_ai_v1_1_predictions_v1",
    packageVersion: spec.packageVersion,
    status: spec.status,
    generatedAt: new Date().toISOString(),
    evaluationBoundary: spec.evaluationBoundary,
    packageFingerprint,
    sourceFingerprints,
    summary,
    rows,
  };

  const resolvedOutputDir = path.resolve(
    repoRoot,
    outputDir ?? spec.defaultOutputDir,
  );
  const outputs = {
    "final-ai-v1-1-predictions.json": `${JSON.stringify(payload, null, 2)}\n`,
    "final-ai-v1-1-predictions.csv": buildCsv(rows),
    "final-ai-v1-1-report.md": buildReport(payload),
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
  const result = buildFinalAiV11Predictions();
  console.log(JSON.stringify(result.payload.summary, null, 2));
  console.log(`Wrote ${result.outputDir}`);
}
