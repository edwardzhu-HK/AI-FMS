import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { summarizeStudyReviewAgreement } from "../src/lib/study-review-agreement.js";
import { validateStudyReviewExport } from "../src/lib/study-review.js";

const DEFAULT_MANIFEST =
  "research/pilot-v1/generated/formal-study-manifest.json";
const DEFAULT_OUTPUT_DIR = "research/pilot-v1/generated/round-a-agreement";

function parseArgs(argv) {
  const options = {
    manifestPath: DEFAULT_MANIFEST,
    outputDir: DEFAULT_OUTPUT_DIR,
    reviewPaths: [],
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--manifest") {
      options.manifestPath = argv[++index];
    } else if (argument === "--output-dir") {
      options.outputDir = argv[++index];
    } else {
      options.reviewPaths.push(argument);
    }
  }
  if (options.reviewPaths.length !== 2) {
    throw new Error(
      "Usage: npm run study:reviews:agreement -- [--manifest path] [--output-dir path] reviewer-a.json reviewer-b.json",
    );
  }
  return options;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function readSignedReview(reviewPath, manifest) {
  const resolvedPath = path.resolve(reviewPath);
  const raw = fs.readFileSync(resolvedPath);
  const sourceSha256 = sha256(raw);
  const checksumPath = `${resolvedPath}.sha256`;
  const checksumContent = fs.readFileSync(checksumPath, "utf8").trim();
  const expectedSha256 = checksumContent.match(/^([a-f0-9]{64})/i)?.[1];
  if (!expectedSha256 || sourceSha256 !== expectedSha256.toLowerCase()) {
    throw new Error(`SHA-256 mismatch for ${resolvedPath}.`);
  }

  const payload = JSON.parse(raw.toString("utf8"));
  const validation = validateStudyReviewExport(payload, {
    pilot: manifest,
    requireComplete: true,
  });
  if (!validation.valid) {
    throw new Error(
      `Review export validation failed for ${resolvedPath}: ${validation.errors.join(" ")}`,
    );
  }
  return {
    path: path.relative(process.cwd(), resolvedPath),
    sha256: sourceSha256,
    payload,
  };
}

function csvValue(value) {
  if (value == null) {
    return "";
  }
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(rows, columns) {
  return `${[
    columns,
    ...rows.map((row) => columns.map((column) => row[column])),
  ]
    .map((row) => row.map(csvValue).join(","))
    .join("\n")}\n`;
}

function percent(value) {
  return value == null ? "N/A" : `${(value * 100).toFixed(1)}%`;
}

function formatKappa(value) {
  return value == null ? "N/A" : value.toFixed(4);
}

function buildReport(analysis, sources) {
  const overall = analysis.overall;
  const actionRows = Object.entries(analysis.byAction)
    .map(
      ([action, metrics]) =>
        `| ${action} | ${metrics.statusAgreementCount}/${metrics.expectedCount} | ${metrics.bothScoredCount} | ${percent(metrics.rawScoreAgreementRate)} | ${formatKappa(metrics.quadraticWeightedKappa)} |`,
    )
    .join("\n");
  const queueCounts = analysis.disagreementQueue.reduce((counts, row) => {
    counts[row.disagreementType] = (counts[row.disagreementType] ?? 0) + 1;
    return counts;
  }, {});

  return `# AI-FMS Round A Reviewer Agreement

## Scope

- Pilot: \`${analysis.pilotId}\`
- Round: \`${analysis.studyRound}\`
- Reviewers: \`${analysis.reviewers.join("` and `")}\`
- Frozen reps: ${overall.expectedCount}
- Source exports: ${sources.map((source) => `\`${source.path}\` (${source.sha256})`).join("; ")}

## Results

- Review outcome agreement: ${overall.statusAgreementCount}/${overall.expectedCount} (${percent(overall.statusAgreementRate)}).
- Both reviewers scored: ${overall.bothScoredCount}; both marked unscorable: ${overall.bothUnscorableCount}.
- Exact RAW SCORE agreement on jointly scored reps: ${overall.exactScoreAgreementCount}/${overall.bothScoredCount} (${percent(overall.rawScoreAgreementRate)}).
- Linear weighted Cohen's kappa: ${formatKappa(overall.linearWeightedKappa)}.
- Quadratic weighted Cohen's kappa: ${formatKappa(overall.quadraticWeightedKappa)}.
- Mean absolute score difference: ${overall.meanAbsoluteScoreDifference ?? "N/A"}.
- Unscorable-reason agreement: ${overall.unscorableReasonAgreementCount}/${overall.bothUnscorableCount} (${percent(overall.unscorableReasonAgreementRate)}).

## By Action

| Action | Outcome agreement | Jointly scored | Exact score agreement | Quadratic kappa |
| --- | ---: | ---: | ---: | ---: |
${actionRows}

An action-level kappa is reported as N/A when its jointly scored pairs have no
marginal score variation; exact agreement remains reportable in that case.

## Adjudication Queue

- Scoreability mismatches: ${queueCounts.scoreability_mismatch ?? 0}.
- RAW SCORE disagreements: ${queueCounts.score_disagreement ?? 0}.
- Unscorable-reason taxonomy disagreements: ${queueCounts.unscorable_reason_disagreement ?? 0}.

See \`round-a-adjudication-queue.csv\` for the private rep-level queue.

## Interpretation Boundary

Agreement metrics use only the two blinded Round A human exports. Legacy AI suggestions and historical labels are excluded. RAW SCORE agreement and kappa use only reps scored by both reviewers; unscorable cases are reported separately and are not converted to numeric scores. This pilot does not establish clinical validity, diagnostic performance, or generalization beyond the frozen sample.
`;
}

function writeOutputs(outputDir, payload) {
  fs.mkdirSync(outputDir, { recursive: true });
  const comparisonColumns = [
    "repetitionId",
    "ingestId",
    "actionType",
    "leftReviewerId",
    "leftStatus",
    "leftScore",
    "leftConfidence",
    "leftUnscorableReason",
    "leftComment",
    "rightReviewerId",
    "rightStatus",
    "rightScore",
    "rightConfidence",
    "rightUnscorableReason",
    "rightComment",
  ];
  const queueColumns = ["disagreementType", ...comparisonColumns];
  const files = {
    "round-a-agreement.json": `${JSON.stringify(payload, null, 2)}\n`,
    "round-a-reviewer-comparison.csv": toCsv(
      payload.analysis.comparisonRows,
      comparisonColumns,
    ),
    "round-a-adjudication-queue.csv": toCsv(
      payload.analysis.disagreementQueue,
      queueColumns,
    ),
    "round-a-agreement-report.md": buildReport(
      payload.analysis,
      payload.sourceExports,
    ),
  };
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(outputDir, name), content);
  }
  const checksumLines = Object.entries(files).map(
    ([name, content]) => `${sha256(content)}  ${name}`,
  );
  fs.writeFileSync(
    path.join(outputDir, "round-a-agreement-SHA256SUMS"),
    `${checksumLines.join("\n")}\n`,
  );
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const manifest = JSON.parse(
    fs.readFileSync(path.resolve(options.manifestPath), "utf8"),
  );
  const sources = options.reviewPaths.map((reviewPath) =>
    readSignedReview(reviewPath, manifest),
  );
  const analysis = summarizeStudyReviewAgreement(
    sources[0].payload,
    sources[1].payload,
  );
  const payload = {
    schemaVersion: "ai_fms_study_review_agreement_v1",
    generatedAt: new Date().toISOString(),
    sourceManifest: path.relative(
      process.cwd(),
      path.resolve(options.manifestPath),
    ),
    sourceExports: sources.map(({ path: sourcePath, sha256: sourceSha }) => ({
      path: sourcePath,
      sha256: sourceSha,
    })),
    analysis,
  };
  const outputDir = path.resolve(options.outputDir);
  writeOutputs(outputDir, payload);
  process.stdout.write(
    `${JSON.stringify(
      {
        outputDir,
        overall: analysis.overall,
        disagreementCount: analysis.disagreementQueue.length,
      },
      null,
      2,
    )}\n`,
  );
  return payload;
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
