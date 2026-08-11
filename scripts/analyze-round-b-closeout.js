import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applyLegacyRoundABlindAttestation } from "../src/lib/legacy-round-a-blind-attestation.js";
import { summarizeRoundBCloseout } from "../src/lib/round-b-closeout-analysis.js";
import { validateStudyReviewExport } from "../src/lib/study-review.js";
import { readVerifiedRoundBEvidence } from "./lib/round-b-evidence-source.js";

const DEFAULT_MANIFEST =
  "research/pilot-v1/generated/formal-study-manifest.json";
const DEFAULT_EVIDENCE =
  "research/pilot-v1/generated/round-b-evidence-manifest.json";
const DEFAULT_OUTPUT = "research/pilot-v1/generated/round-b-closeout";
const DEFAULT_FINAL_AI =
  "research/pilot-v1/generated/final-ai-v1-1/final-ai-v1-1-predictions.json";
const DEFAULT_ROUND_A_ATTESTATION =
  "research/pilot-v1/round-a-legacy-blind-attestation.json";

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function parseArgs(argv) {
  const options = {
    manifestPath: DEFAULT_MANIFEST,
    evidencePath: DEFAULT_EVIDENCE,
    outputDir: DEFAULT_OUTPUT,
    finalAiPath: DEFAULT_FINAL_AI,
    roundAAttestationPath: DEFAULT_ROUND_A_ATTESTATION,
    reviewPaths: [],
  };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--manifest") {
      options.manifestPath = argv[++index];
    } else if (argv[index] === "--evidence") {
      options.evidencePath = argv[++index];
    } else if (argv[index] === "--output-dir") {
      options.outputDir = argv[++index];
    } else if (argv[index] === "--final-ai") {
      options.finalAiPath = argv[++index];
    } else if (argv[index] === "--round-a-attestation") {
      options.roundAAttestationPath = argv[++index];
    } else {
      options.reviewPaths.push(argv[index]);
    }
  }
  if (options.reviewPaths.length !== 4) {
    throw new Error(
      "Usage: npm run study:closeout:round-b -- round-a-reviewer-1.json round-a-reviewer-2.json round-b-reviewer-1.json round-b-reviewer-2.json",
    );
  }
  return options;
}

function readChecksummedOutput(filePath) {
  const resolvedPath = path.resolve(filePath);
  const raw = fs.readFileSync(resolvedPath);
  const actual = sha256(raw);
  const checksums = fs.readFileSync(
    path.join(path.dirname(resolvedPath), "SHA256SUMS"),
    "utf8",
  );
  const expected = checksums
    .split("\n")
    .map((line) => line.match(/^([a-f0-9]{64})\s+\*?(.+)$/i))
    .find((match) => match?.[2]?.trim() === path.basename(resolvedPath))?.[1]
    ?.toLowerCase();
  if (!expected || expected !== actual) {
    throw new Error(`SHA-256 mismatch for ${filePath}`);
  }
  return { payload: JSON.parse(raw.toString("utf8")), sha256: actual };
}

function readSignedJson(filePath, checksumPath = `${filePath}.sha256`) {
  const raw = fs.readFileSync(path.resolve(filePath));
  const actual = sha256(raw);
  const checksum = fs.readFileSync(path.resolve(checksumPath), "utf8");
  const expected = checksum.match(/^([a-f0-9]{64})/i)?.[1]?.toLowerCase();
  if (!expected || expected !== actual) {
    throw new Error(`SHA-256 mismatch for ${filePath}`);
  }
  return { payload: JSON.parse(raw.toString("utf8")), sha256: actual };
}

function percent(value) {
  return value == null ? "N/A" : `${(value * 100).toFixed(1)}%`;
}

function buildReport(analysis) {
  const roundA = analysis.roundAAgreement.overall;
  const roundB = analysis.roundBAgreement.overall;
  const actionRows = Object.entries(analysis.roundBAgreement.byAction)
    .map(
      ([actionType, item]) =>
        `| ${actionType} | ${item.statusAgreementCount}/${item.expectedCount} | ${item.bothScoredCount} | ${item.exactScoreAgreementCount}/${item.bothScoredCount} | ${item.linearWeightedKappa ?? "N/A"} |`,
    )
    .join("\n");
  const changes = analysis.reviewerChanges
    .map(
      (item) =>
        `| ${item.reviewerId} | ${item.summary.statusChangedCount} | ${item.summary.scoreChangedCount}/${item.summary.scoreComparableCount} | ${percent(item.summary.scoreChangeRate)} | ${item.summary.confidenceIncreasedCount}/${item.summary.confidenceDecreasedCount} | ${item.summary.meanConfidenceDelta ?? "N/A"} | ${Math.round(item.summary.medianReviewDurationDeltaMs / 1000)} s |`,
    )
    .join("\n");
  const aiA = analysis.aiComparison.roundAConsensus;
  const aiB = analysis.aiComparison.roundBConsensus;
  const finalAi = analysis.aiComparison.finalV11;
  const finalSection = finalAi
    ? `\n## Final AI v1.1 Post-audit Internal Comparison\n\n| Human reference | Comparable | Exact | Within one | MAE | Linear kappa |\n| --- | ---: | ---: | ---: | ---: | ---: |\n| Round A consensus | ${finalAi.roundAConsensus.metrics.comparedCount} | ${finalAi.roundAConsensus.metrics.exactCount} (${percent(finalAi.roundAConsensus.metrics.exactRate)}) | ${finalAi.roundAConsensus.metrics.withinOneCount} (${percent(finalAi.roundAConsensus.metrics.withinOneRate)}) | ${finalAi.roundAConsensus.metrics.meanAbsoluteDifference ?? "N/A"} | ${finalAi.roundAConsensus.metrics.linearWeightedKappa ?? "N/A"} |\n| Round B consensus | ${finalAi.roundBConsensus.metrics.comparedCount} | ${finalAi.roundBConsensus.metrics.exactCount} (${percent(finalAi.roundBConsensus.metrics.exactRate)}) | ${finalAi.roundBConsensus.metrics.withinOneCount} (${percent(finalAi.roundBConsensus.metrics.withinOneRate)}) | ${finalAi.roundBConsensus.metrics.meanAbsoluteDifference ?? "N/A"} | ${finalAi.roundBConsensus.metrics.linearWeightedKappa ?? "N/A"} |\n\n### v1.1 vs Round B by action\n\n| Action | Comparable | Exact | Within one | MAE |\n| --- | ---: | ---: | ---: | ---: |\n${Object.entries(
        finalAi.roundBConsensus.byAction,
      )
        .map(
          ([actionType, item]) =>
            `| ${actionType} | ${item.comparedCount} | ${item.exactCount} (${percent(item.exactRate)}) | ${item.withinOneCount} (${percent(item.withinOneRate)}) | ${item.meanAbsoluteDifference ?? "N/A"} |`,
        )
        .join(
          "\n",
        )}\n\nPackage fingerprint: \`${finalAi.packageFingerprint}\`. This is a post-audit internal benchmark, not held-out validation.\n`
    : "";
  return `# AI-FMS Round B Closeout Analysis

- Pilot: \`${analysis.pilotId}\`
- Post-review AI benchmark freeze: \`${analysis.aiBenchmarkFreeze.freezeId}\`
- AI rule fingerprint: \`${analysis.aiBenchmarkFreeze.ruleFingerprint}\`
- Round A legacy blind attestation: **${analysis.roundALegacyBlindAttestation.appliedCount}/2 exports normalized in memory**

The signed Round A files predate the explicit current-evidence exposure fields.
Their original SHA-256 files remain unchanged; compatibility is limited to the
two checksum-pinned exports in the attestation. Round B uses the complete current
blind-event contract without compatibility normalization.

## Human Agreement

| Round | Status agreement | Both scored | Exact score agreement | Linear weighted kappa | Unscorable-reason agreement |
| --- | ---: | ---: | ---: | ---: | ---: |
| Round A | ${roundA.statusAgreementCount}/${roundA.expectedCount} (${percent(roundA.statusAgreementRate)}) | ${roundA.bothScoredCount} | ${roundA.exactScoreAgreementCount}/${roundA.bothScoredCount} (${percent(roundA.rawScoreAgreementRate)}) | ${roundA.linearWeightedKappa ?? "N/A"} | ${roundA.unscorableReasonAgreementCount}/${roundA.bothUnscorableCount} (${percent(roundA.unscorableReasonAgreementRate)}) |
| Round B | ${roundB.statusAgreementCount}/${roundB.expectedCount} (${percent(roundB.statusAgreementRate)}) | ${roundB.bothScoredCount} | ${roundB.exactScoreAgreementCount}/${roundB.bothScoredCount} (${percent(roundB.rawScoreAgreementRate)}) | ${roundB.linearWeightedKappa ?? "N/A"} | ${roundB.unscorableReasonAgreementCount}/${roundB.bothUnscorableCount} (${percent(roundB.unscorableReasonAgreementRate)}) |

### Round B by action

| Action | Status agreement | Both scored | Exact score agreement | Linear weighted kappa |
| --- | ---: | ---: | ---: | ---: |
${actionRows}

## Reviewer Change

| Reviewer | Status changes | Score changes | Rate | Confidence +/− | Mean confidence delta | Median time delta |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
${changes}

Review-time deltas are descriptive only. Round A contains large timing outliers,
so the median is reported and no causal efficiency claim is made.

## Frozen AI v1.0 Comparison

| Human reference | Comparable | Exact | Within one | MAE | Linear kappa |
| --- | ---: | ---: | ---: | ---: | ---: |
| Round A consensus | ${aiA.metrics.comparedCount} | ${aiA.metrics.exactCount} (${percent(aiA.metrics.exactRate)}) | ${aiA.metrics.withinOneCount} (${percent(aiA.metrics.withinOneRate)}) | ${aiA.metrics.meanAbsoluteDifference ?? "N/A"} | ${aiA.metrics.linearWeightedKappa ?? "N/A"} |
| Round B consensus | ${aiB.metrics.comparedCount} | ${aiB.metrics.exactCount} (${percent(aiB.metrics.exactRate)}) | ${aiB.metrics.withinOneCount} (${percent(aiB.metrics.withinOneRate)}) | ${aiB.metrics.meanAbsoluteDifference ?? "N/A"} | ${aiB.metrics.linearWeightedKappa ?? "N/A"} |

Coverage and agreement are reported separately. Round B reviewers were blind
to AI scores and pose-derived evidence. The frozen AI package was loaded only
after the signed human exports, so this is an AI-human concordance benchmark,
not an independent held-out validation or clinical accuracy estimate.
${finalSection}
`;
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const manifest = JSON.parse(
    fs.readFileSync(path.resolve(options.manifestPath), "utf8"),
  );
  const evidence = readVerifiedRoundBEvidence({
    evidencePath: options.evidencePath,
    pilot: manifest,
  });
  const finalAi = readChecksummedOutput(options.finalAiPath);
  const roundAAttestationRaw = fs.readFileSync(
    path.resolve(options.roundAAttestationPath),
  );
  const roundAAttestation = JSON.parse(roundAAttestationRaw.toString("utf8"));
  const roundAAttestationSha256 = sha256(roundAAttestationRaw);
  if (
    finalAi.payload.evaluationBoundary?.humanLabelsLoaded !== false ||
    finalAi.payload.evaluationBoundary?.roundBStudyModeLoaded !== false
  ) {
    throw new Error("Final AI package is not isolated from human review data");
  }
  const reviews = options.reviewPaths.map((reviewPath) => {
    const source = readSignedJson(reviewPath);
    const normalized = applyLegacyRoundABlindAttestation({
      payload: source.payload,
      sha256: source.sha256,
      attestation: roundAAttestation,
    });
    const validation = validateStudyReviewExport(normalized.payload, {
      pilot: manifest,
      requireComplete: true,
    });
    if (!validation.valid) {
      throw new Error(
        `Review validation failed for ${reviewPath}: ${validation.errors.join(" ")}`,
      );
    }
    return {
      path: reviewPath,
      ...source,
      payload: normalized.payload,
      legacyRoundAAttestationApplied: normalized.applied,
    };
  });
  const roundAExports = reviews.slice(0, 2).map((source) => source.payload);
  const roundBExports = reviews.slice(2).map((source) => source.payload);
  if (
    roundAExports.some((payload) => payload.studyRound !== "round_a") ||
    roundBExports.some((payload) => payload.studyRound !== "round_b")
  ) {
    throw new Error(
      "Review files must be ordered as two Round A then two Round B exports.",
    );
  }
  const analysis = summarizeRoundBCloseout({
    roundAExports,
    roundBExports,
    evidence: evidence.payload,
    finalPredictions: finalAi.payload,
  });
  const payload = {
    ...analysis,
    generatedAt: new Date().toISOString(),
    roundALegacyBlindAttestation: {
      path: options.roundAAttestationPath,
      sha256: roundAAttestationSha256,
      appliedCount: reviews.filter(
        (source) => source.legacyRoundAAttestationApplied,
      ).length,
      originalArtifactsModified: false,
      interpretation:
        "checksum_pinned_legacy_metadata_compatibility_not_direct_exposure_telemetry",
    },
    sources: {
      evidence: { path: options.evidencePath, sha256: evidence.sha256 },
      finalAi: { path: options.finalAiPath, sha256: finalAi.sha256 },
      reviews: reviews.map((source) => ({
        path: source.path,
        sha256: source.sha256,
        legacyRoundAAttestationApplied: source.legacyRoundAAttestationApplied,
      })),
    },
  };
  const outputDir = path.resolve(options.outputDir);
  fs.mkdirSync(outputDir, { recursive: true });
  const outputs = {
    "round-b-closeout-analysis.json": `${JSON.stringify(payload, null, 2)}\n`,
    "round-b-closeout-report.md": buildReport(payload),
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
  process.stdout.write(
    `${JSON.stringify(
      {
        outputDir,
        roundBAgreement: payload.roundBAgreement.overall,
        reviewerChanges: payload.reviewerChanges.map((item) => item.summary),
        aiComparison: payload.aiComparison,
      },
      null,
      2,
    )}\n`,
  );
  return payload;
}

const isMainModule =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainModule) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  }
}
