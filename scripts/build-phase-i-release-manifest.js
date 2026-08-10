import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULTS = {
  specPath: "research/pilot-v1/phase-i-release-candidate.json",
  outputDir: "research/pilot-v1/generated/phase-i-release-candidate",
};

function parseArgs(argv) {
  const options = { ...DEFAULTS };
  const argumentMap = {
    "--spec": "specPath",
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

function readVerifiedArtifact(repoRoot, artifact) {
  const artifactPath = path.resolve(repoRoot, artifact.path);
  const checksumPath = path.resolve(repoRoot, artifact.checksumManifest);
  const raw = fs.readFileSync(artifactPath);
  const expected = readChecksums(checksumPath).get(path.basename(artifactPath));
  const actual = sha256(raw);
  if (!expected || expected !== actual) {
    throw new Error(`SHA-256 verification failed for ${artifact.path}`);
  }
  return {
    id: artifact.id,
    path: artifact.path,
    checksumManifest: artifact.checksumManifest,
    sha256: actual,
    bytes: raw.length,
    access: artifact.access,
    payload: JSON.parse(raw.toString("utf8")),
  };
}

export function summarizePhaseIEvidence(artifacts) {
  const byId = new Map(artifacts.map((artifact) => [artifact.id, artifact]));
  const canonical = byId.get("canonical_pilot")?.payload;
  const features = byId.get("camera_audited_features")?.payload;
  const formal = byId.get("formal_study_manifest")?.payload;
  const agreement = byId.get("round_a_agreement")?.payload;
  const profiles = byId.get("round_a_movement_profiles")?.payload;
  const aiEvidence = byId.get("round_a_ai_evidence")?.payload;
  const aslrAudit = byId.get("aslr_side_peak_audit")?.payload;
  const aslrSensitivity = byId.get("aslr_subject_sensitivity")?.payload;
  const roundBAiBenchmark = byId.get("round_b_ai_benchmark")?.payload;
  const rotaryV11 = byId.get("rotary_v1_1_internal")?.payload;
  const finalAiV11 = byId.get("final_ai_v1_1_predictions")?.payload;
  const casePortfolio = byId.get("phase_i_case_study_portfolio")?.payload;
  if (
    !canonical ||
    !features ||
    !formal ||
    !agreement ||
    !profiles ||
    !aiEvidence ||
    !aslrAudit ||
    !aslrSensitivity ||
    !roundBAiBenchmark ||
    !rotaryV11 ||
    !finalAiV11 ||
    !casePortfolio
  ) {
    throw new Error("Phase I release evidence is incomplete");
  }

  return {
    uniqueVideos: canonical.summary.uniqueVideos,
    canonicalRepetitions: canonical.summary.repetitions,
    featureReady: features.summary.ready,
    formalSampleSize: formal.formalSampleSize,
    roundAConsensus: profiles.analysis.consensusCount,
    roundAStatusAgreement: agreement.analysis.overall.statusAgreementCount,
    roundABothScored: agreement.analysis.overall.bothScoredCount,
    roundABothUnscorable: agreement.analysis.overall.bothUnscorableCount,
    roundAScoreabilityMismatch:
      agreement.analysis.overall.scoreabilityMismatchCount,
    roundARawScoreExact: agreement.analysis.overall.exactScoreAgreementCount,
    roundAHumanLinearWeightedKappa:
      agreement.analysis.overall.linearWeightedKappa,
    roundAAiComparable: aiEvidence.analysis.comparisonEligibleCount,
    roundAAiExact: aiEvidence.analysis.metrics.exactCount,
    roundAAiWithinOne: aiEvidence.analysis.metrics.withinOneCount,
    roundAAiMeanAbsoluteDifference:
      aiEvidence.analysis.metrics.meanAbsoluteDifference,
    protocolSensitivityComparable:
      aiEvidence.protocolSensitivity.analysis.comparisonEligibleCount,
    protocolSensitivityExact:
      aiEvidence.protocolSensitivity.analysis.metrics.exactCount,
    protocolSensitivityWithinOne:
      aiEvidence.protocolSensitivity.analysis.metrics.withinOneCount,
    protocolSensitivityMeanAbsoluteDifference:
      aiEvidence.protocolSensitivity.analysis.metrics.meanAbsoluteDifference,
    aslrAuditRepetitions: aslrAudit.summary.repetitions,
    aslrAuditUniqueEvidenceWindows: aslrAudit.summary.uniqueEvidenceWindows,
    aslrAuditGoodWindows: aslrAudit.summary.byUniqueWindowStatus.good ?? 0,
    aslrAuditWatchWindows: aslrAudit.summary.byUniqueWindowStatus.watch ?? 0,
    aslrAuditLimitedWindows:
      aslrAudit.summary.byUniqueWindowStatus.limited ?? 0,
    aslrSensitivityReextractedWindows:
      aslrSensitivity.summary.reextractedUniqueWindows,
    aslrSensitivityNoLongerLimited: aslrSensitivity.summary.noLongerLimited,
    aslrSensitivityGoodWindows:
      aslrSensitivity.summary.sensitivityStatus.good ?? 0,
    aslrSensitivityWatchWindows:
      aslrSensitivity.summary.sensitivityStatus.watch ?? 0,
    aslrSensitivityLimitedWindows:
      aslrSensitivity.summary.sensitivityStatus.limited ?? 0,
    aslrSensitivityManualWatchReviews:
      aslrSensitivity.summary.manualWatchReviews,
    roundBAiBenchmarkItems: roundBAiBenchmark.summary.totalItems,
    roundBAiBenchmarkFeatureReady: roundBAiBenchmark.summary.featureReady,
    roundBAiBenchmarkScoreAvailable: roundBAiBenchmark.summary.aiScoreAvailable,
    roundBAiBenchmarkRotaryFeatureOnly:
      roundBAiBenchmark.summary.byAction.rotary_stability.byEvidenceStatus
        .features_only ?? 0,
    roundBAiBenchmarkProtocolMetadataRequired:
      roundBAiBenchmark.summary.byEvidenceStatus.protocol_metadata_required ??
      0,
    roundBAiBenchmarkRuleFingerprint:
      roundBAiBenchmark.modelFreeze.ruleFingerprint,
    rotaryV11FormalItems: rotaryV11.metrics.formalItems,
    rotaryV11ScoredItems: rotaryV11.metrics.scoredItems,
    rotaryV11AbstainedItems: rotaryV11.metrics.abstainedItems,
    rotaryV11Exact: rotaryV11.metrics.exactCount,
    rotaryV11Coverage: rotaryV11.metrics.coverage,
    rotaryV11RoundBIsolation:
      rotaryV11.roundBIsolation.experimentalScoreExposed === false,
    finalAiV11FormalItems: finalAiV11.summary.formalItems,
    finalAiV11ScoreAvailable: finalAiV11.summary.scoreAvailable,
    finalAiV11Abstained: finalAiV11.summary.abstained,
    finalAiV11RotaryScoreAvailable:
      finalAiV11.summary.byAction.rotary_stability.scoreAvailable,
    finalAiV11DeepSquatScoreAvailable:
      finalAiV11.summary.byAction.deep_squat.scoreAvailable,
    selectedCaseStudies: casePortfolio.summary.selectedCases,
    applicationFigures: casePortfolio.summary.applicationFigures,
  };
}

export function validateExpectedEvidence(summary, expected) {
  for (const [key, value] of Object.entries(expected)) {
    if (summary[key] !== value) {
      throw new Error(
        `Phase I evidence drift for ${key}: expected ${value}, received ${summary[key]}`,
      );
    }
  }
}

export function auditReleaseDocuments(documents) {
  const absolutePathPattern = /(?:\/Users\/|\/Volumes\/|file:\/\/)/g;
  const absolutePathViolations = documents.flatMap((document) =>
    [...document.text.matchAll(absolutePathPattern)].map((match) => ({
      path: document.path,
      match: match[0],
    })),
  );
  const combined = documents.map((document) => document.text).join("\n");
  const requiredBoundaries = {
    roundBPending:
      /Round B pending|Round B.*pending|Round B.*尚未完成|等待 Round B/i.test(
        combined,
      ),
    noDiagnosis:
      /not (?:a )?medical diagnos|不进行医疗诊断|不做 medical diagnosis/i.test(
        combined,
      ),
    noReviewerReplacement:
      /does not replace|不替代|不能替代人工|不足以替代人工/i.test(combined),
    rightsPrivacyGate: /rights.*privacy|授权.*隐私|rights\/privacy/i.test(
      combined,
    ),
  };
  const missingBoundaries = Object.entries(requiredBoundaries)
    .filter(([, found]) => !found)
    .map(([key]) => key);
  if (absolutePathViolations.length || missingBoundaries.length) {
    throw new Error(
      `Release document audit failed: absolutePaths=${absolutePathViolations.length}, missingBoundaries=${missingBoundaries.join(",") || "none"}`,
    );
  }
  return {
    documentsAudited: documents.length,
    absolutePathViolations: 0,
    requiredBoundaries,
    passed: true,
  };
}

function buildReport(manifest) {
  const evidence = Object.entries(manifest.evidenceSummary)
    .map(([key, value]) => `| \`${key}\` | ${value} |`)
    .join("\n");
  const artifacts = manifest.artifacts
    .map(
      (artifact) =>
        `| \`${artifact.id}\` | ${artifact.access} | ${artifact.bytes} | \`${artifact.sha256}\` |`,
    )
    .join("\n");
  const documents = manifest.documents
    .map((document) => `| \`${document.path}\` | \`${document.sha256}\` |`)
    .join("\n");

  return `# AI-FMS Phase I Release Candidate Manifest

- Release: \`${manifest.releaseId}\`
- Release date: ${manifest.releaseDate}
- Status: \`${manifest.status}\`
- Artifact verification: ${manifest.verification.artifactsVerified}/${manifest.verification.artifactsExpected}
- Documents checksummed: ${manifest.verification.documentsChecksummed}
- Document preflight: ${manifest.documentAudit.passed ? "PASS" : "FAIL"}

## Evidence Summary

| Field | Value |
| --- | ---: |
${evidence}

## Private Research Artifacts

| Artifact | Access | Bytes | SHA-256 |
| --- | --- | ---: | --- |
${artifacts}

## Source-Controlled Documents

| Document | SHA-256 |
| --- | --- |
${documents}

## Release Boundary

This is a Round A release candidate manifest. Raw media, raw pose files,
reviewer event exports, comments, and SQLite databases are excluded. Final
public release still requires Round B freeze plus source-rights and privacy
review.
`;
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const repoRoot = process.cwd();
  const specRaw = fs.readFileSync(path.resolve(repoRoot, options.specPath));
  const spec = JSON.parse(specRaw.toString("utf8"));
  const artifacts = spec.artifacts.map((artifact) =>
    readVerifiedArtifact(repoRoot, artifact),
  );
  const evidenceSummary = summarizePhaseIEvidence(artifacts);
  validateExpectedEvidence(evidenceSummary, spec.expectedEvidence);
  const documentSources = spec.documents.map((documentPath) => {
    const raw = fs.readFileSync(path.resolve(repoRoot, documentPath));
    return {
      path: documentPath,
      sha256: sha256(raw),
      bytes: raw.length,
      text: raw.toString("utf8"),
    };
  });
  const documentAudit = auditReleaseDocuments(documentSources);
  const documents = documentSources.map(
    ({ path: documentPath, sha256, bytes }) => ({
      path: documentPath,
      sha256,
      bytes,
    }),
  );
  const manifest = {
    schemaVersion: "ai_fms_phase_i_release_candidate_manifest_v1",
    releaseId: spec.releaseId,
    releaseDate: spec.releaseDate,
    status: spec.status,
    sourceSpec: { path: options.specPath, sha256: sha256(specRaw) },
    artifactPolicy: spec.artifactPolicy,
    evidenceSummary,
    documentAudit,
    verification: {
      artifactsExpected: spec.artifacts.length,
      artifactsVerified: artifacts.length,
      documentsChecksummed: documents.length,
      expectedEvidenceMatched: true,
    },
    artifacts: artifacts.map(
      ({
        id,
        path: artifactPath,
        checksumManifest,
        sha256,
        bytes,
        access,
      }) => ({
        id,
        path: artifactPath,
        checksumManifest,
        sha256,
        bytes,
        access,
      }),
    ),
    documents,
    reproductionCommands: spec.reproductionCommands,
  };
  const outputDir = path.resolve(repoRoot, options.outputDir);
  fs.mkdirSync(outputDir, { recursive: true });
  const outputs = {
    "phase-i-release-candidate-manifest.json": `${JSON.stringify(manifest, null, 2)}\n`,
    "phase-i-release-candidate-report.md": buildReport(manifest),
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
        releaseId: manifest.releaseId,
        evidenceSummary,
        verification: manifest.verification,
      },
      null,
      2,
    )}\n`,
  );
  return manifest;
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
