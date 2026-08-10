import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { summarizeRoundBCloseout } from "../src/lib/round-b-closeout-analysis.js";
import { validateStudyReviewExport } from "../src/lib/study-review.js";
import { readVerifiedRoundBEvidence } from "./lib/round-b-evidence-source.js";

const DEFAULT_MANIFEST =
  "research/pilot-v1/generated/formal-study-manifest.json";
const DEFAULT_EVIDENCE =
  "research/pilot-v1/generated/round-b-evidence-manifest.json";
const DEFAULT_OUTPUT = "research/pilot-v1/generated/round-b-closeout";

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function parseArgs(argv) {
  const options = {
    manifestPath: DEFAULT_MANIFEST,
    evidencePath: DEFAULT_EVIDENCE,
    outputDir: DEFAULT_OUTPUT,
    reviewPaths: [],
  };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--manifest") {
      options.manifestPath = argv[++index];
    } else if (argv[index] === "--evidence") {
      options.evidencePath = argv[++index];
    } else if (argv[index] === "--output-dir") {
      options.outputDir = argv[++index];
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
  const changes = analysis.reviewerChanges
    .map(
      (item) =>
        `| ${item.reviewerId} | ${item.summary.scoreChangedCount}/${item.summary.scoreComparableCount} | ${percent(item.summary.scoreChangeRate)} | ${item.summary.meanConfidenceDelta ?? "N/A"} | ${JSON.stringify(item.summary.evidenceUsefulness)} |`,
    )
    .join("\n");
  const aiA = analysis.aiComparison.roundAConsensus;
  const aiB = analysis.aiComparison.roundBConsensus;
  return `# AI-FMS Round B Closeout Analysis

- Pilot: \`${analysis.pilotId}\`
- Evidence freeze: \`${analysis.evidenceFreeze.freezeId}\`
- AI rule fingerprint: \`${analysis.evidenceFreeze.ruleFingerprint}\`

## Reviewer Change

| Reviewer | Score changes | Rate | Mean confidence delta | Evidence usefulness |
| --- | ---: | ---: | ---: | --- |
${changes}

## Frozen AI v1.0 Comparison

| Human reference | Comparable | Exact | Within one | MAE | Linear kappa |
| --- | ---: | ---: | ---: | ---: | ---: |
| Round A consensus | ${aiA.metrics.comparedCount} | ${aiA.metrics.exactCount} | ${aiA.metrics.withinOneCount} | ${aiA.metrics.meanAbsoluteDifference ?? "N/A"} | ${aiA.metrics.linearWeightedKappa ?? "N/A"} |
| Round B consensus | ${aiB.metrics.comparedCount} | ${aiB.metrics.exactCount} | ${aiB.metrics.withinOneCount} | ${aiB.metrics.meanAbsoluteDifference ?? "N/A"} | ${aiB.metrics.linearWeightedKappa ?? "N/A"} |

Coverage and agreement are reported separately. Round B reviewers saw the
frozen evidence, so the Round B comparison is evidence-assisted concordance,
not an independent model validation or clinical accuracy estimate.
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
  const reviews = options.reviewPaths.map((reviewPath) => {
    const source = readSignedJson(reviewPath);
    const validation = validateStudyReviewExport(source.payload, {
      pilot: manifest,
      requireComplete: true,
      evidenceManifest:
        source.payload.studyRound === "round_b" ? evidence.payload : null,
    });
    if (!validation.valid) {
      throw new Error(
        `Review validation failed for ${reviewPath}: ${validation.errors.join(" ")}`,
      );
    }
    return { path: reviewPath, ...source };
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
  });
  const payload = {
    ...analysis,
    generatedAt: new Date().toISOString(),
    sources: {
      evidence: { path: options.evidencePath, sha256: evidence.sha256 },
      reviews: reviews.map((source) => ({
        path: source.path,
        sha256: source.sha256,
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
