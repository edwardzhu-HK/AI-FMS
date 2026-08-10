import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildRoundBEvidenceManifest,
  validateRoundBEvidenceManifest,
} from "../src/lib/round-b-evidence.js";

const DEFAULTS = {
  specPath: "research/pilot-v1/round-b-ai-v1-freeze.json",
  outputDir: "research/pilot-v1/generated",
};

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function parseArgs(argv) {
  const options = { ...DEFAULTS };
  const map = { "--spec": "specPath", "--output-dir": "outputDir" };
  for (let index = 0; index < argv.length; index += 1) {
    const key = map[argv[index]];
    if (!key || !argv[index + 1]) {
      throw new Error(`Unknown or incomplete argument: ${argv[index]}`);
    }
    options[key] = argv[++index];
  }
  return options;
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

function readVerifiedJson(repoRoot, source) {
  const filePath = path.resolve(repoRoot, source.path);
  const raw = fs.readFileSync(filePath);
  const actual = sha256(raw);
  if (source.checksumManifest) {
    const checksumPath = path.resolve(repoRoot, source.checksumManifest);
    const expected = readChecksums(checksumPath).get(path.basename(filePath));
    if (!expected || expected !== actual) {
      throw new Error(`SHA-256 verification failed for ${source.path}`);
    }
  }
  return {
    payload: JSON.parse(raw.toString("utf8")),
    path: source.path,
    sha256: actual,
  };
}

function assertExpectedCoverage(summary, expected) {
  for (const key of ["totalItems", "featureReady", "aiScoreAvailable"]) {
    if (summary[key] !== expected[key]) {
      throw new Error(
        `Round B coverage drift for ${key}: expected ${expected[key]}, received ${summary[key]}`,
      );
    }
  }
  if (
    JSON.stringify(summary.byEvidenceStatus) !==
    JSON.stringify(expected.byEvidenceStatus)
  ) {
    throw new Error("Round B evidence-status coverage has drifted");
  }
}

function buildReport(manifest) {
  const actions = Object.entries(manifest.summary.byAction)
    .map(
      ([actionType, value]) =>
        `| ${actionType} | ${value.total} | ${value.featureReady} | ${value.aiScoreAvailable} | ${Object.entries(
          value.byEvidenceStatus,
        )
          .map(([status, count]) => `${status}: ${count}`)
          .join("; ")} |`,
    )
    .join("\n");
  return `# Round B Reviewer-safe Evidence Freeze

- Freeze: \`${manifest.freezeId}\`
- Manifest fingerprint: \`${manifest.manifestFingerprint}\`
- AI rule fingerprint: \`${manifest.modelFreeze.ruleFingerprint}\`
- Formal items: ${manifest.summary.totalItems}
- Feature-ready: ${manifest.summary.featureReady}
- AI RAW SCORE available: ${manifest.summary.aiScoreAvailable}

| Action | N | Feature-ready | AI score | Evidence status |
| --- | ---: | ---: | ---: | --- |
${actions}

Rotary Stability remains feature-only. Deep Squat records without verified
attempt-condition metadata show quantitative features but no AI RAW SCORE.
The package contains no historical human score, reviewer result, source file
name, or reviewer note.
`;
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const repoRoot = process.cwd();
  const spec = JSON.parse(
    fs.readFileSync(path.resolve(repoRoot, options.specPath), "utf8"),
  );
  const formal = readVerifiedJson(repoRoot, spec.sources.formalStudy);
  const features = readVerifiedJson(
    repoRoot,
    spec.sources.cameraAuditedFeatures,
  );
  const aiEvidence = readVerifiedJson(
    repoRoot,
    spec.sources.aiSuggestionUniverse,
  );
  const featureContract = readVerifiedJson(
    repoRoot,
    spec.sources.featureContract,
  );
  const sourceArtifacts = Object.fromEntries(
    [formal, features, aiEvidence, featureContract].map((source) => [
      source.path,
      source.sha256,
    ]),
  );
  const manifest = buildRoundBEvidenceManifest({
    formalManifest: formal.payload,
    featureMatrix: features.payload,
    aiEvidence: aiEvidence.payload,
    featureContract: featureContract.payload,
    sourceArtifacts,
    freezeId: spec.freezeId,
    frozenAt: spec.frozenAt,
    fingerprint: sha256,
  });
  const validation = validateRoundBEvidenceManifest(manifest, {
    pilot: formal.payload,
  });
  if (!validation.valid) {
    throw new Error(validation.errors.join("\n"));
  }
  assertExpectedCoverage(manifest.summary, spec.expectedCoverage);

  const outputDir = path.resolve(repoRoot, options.outputDir);
  fs.mkdirSync(outputDir, { recursive: true });
  const outputs = {
    "round-b-evidence-manifest.json": `${JSON.stringify(manifest, null, 2)}\n`,
    "round-b-evidence-report.md": buildReport(manifest),
  };
  for (const [name, content] of Object.entries(outputs)) {
    fs.writeFileSync(path.join(outputDir, name), content);
  }
  fs.writeFileSync(
    path.join(outputDir, "round-b-evidence-SHA256SUMS"),
    `${Object.entries(outputs)
      .map(([name, content]) => `${sha256(content)}  ${name}`)
      .join("\n")}\n`,
  );
  process.stdout.write(
    `${JSON.stringify(
      {
        output: path.join(outputDir, "round-b-evidence-manifest.json"),
        manifestFingerprint: manifest.manifestFingerprint,
        summary: manifest.summary,
      },
      null,
      2,
    )}\n`,
  );
  return manifest;
}

const isMainModule =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainModule) {
  main();
}
