import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BUILDER_VERSION = "formal-study-manifest-builder-v1";

function parseArgs(argv) {
  const args = {
    blindabilityPath: "research/pilot-v1/generated/blindability-manifest.json",
    featureMatrixPath:
      "research/pilot-v1/generated/quantitative-feature-matrix.json",
    selectionPath: "research/pilot-v1/formal-study-selection.json",
    outputDir: "research/pilot-v1/generated",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const value = argv[index + 1];
    if (token === "--blindability" && value) {
      args.blindabilityPath = value;
      index += 1;
    } else if (token === "--feature-matrix" && value) {
      args.featureMatrixPath = value;
      index += 1;
    } else if (token === "--selection" && value) {
      args.selectionPath = value;
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

function stableTieBreak(seed, item) {
  return sha256(`${seed}:${item.actionType}:${item.repetitionId}`);
}

function scoreBucket(item) {
  return item.internalStratification.historicalConsensusScore == null
    ? "unlabeled"
    : String(item.internalStratification.historicalConsensusScore);
}

function deduplicateExactClips(candidates, seed) {
  const byClip = new Map();
  for (const item of candidates) {
    const key = [item.videoId, item.clip.startSecond, item.clip.endSecond].join(
      ":",
    );
    const existing = byClip.get(key);
    if (
      !existing ||
      stableTieBreak(seed, item).localeCompare(stableTieBreak(seed, existing)) <
        0
    ) {
      byClip.set(key, item);
    }
  }
  return [...byClip.values()];
}

function chooseBalancedItems(candidates, target, seed) {
  const selected = [];
  const remaining = new Map(
    candidates.map((item) => [item.repetitionId, item]),
  );
  const scoreCounts = new Map();
  const videoCounts = new Map();

  while (selected.length < target && remaining.size > 0) {
    const ranked = [...remaining.values()].sort((left, right) => {
      const leftScoreCount = scoreCounts.get(scoreBucket(left)) ?? 0;
      const rightScoreCount = scoreCounts.get(scoreBucket(right)) ?? 0;
      const leftVideoCount = videoCounts.get(left.videoId) ?? 0;
      const rightVideoCount = videoCounts.get(right.videoId) ?? 0;

      return (
        Number(leftScoreCount > 0) - Number(rightScoreCount > 0) ||
        Number(leftVideoCount > 0) - Number(rightVideoCount > 0) ||
        leftVideoCount - rightVideoCount ||
        leftScoreCount - rightScoreCount ||
        stableTieBreak(seed, left).localeCompare(stableTieBreak(seed, right))
      );
    });
    const next = ranked[0];
    selected.push(next);
    remaining.delete(next.repetitionId);
    scoreCounts.set(
      scoreBucket(next),
      (scoreCounts.get(scoreBucket(next)) ?? 0) + 1,
    );
    videoCounts.set(next.videoId, (videoCounts.get(next.videoId) ?? 0) + 1);
  }

  if (selected.length !== target) {
    throw new Error(
      `Only ${selected.length} eligible reps are available for target ${target}.`,
    );
  }
  return selected;
}

function assertFrozenSelection(selection, blindability, featureMatrix) {
  if (selection.status !== "frozen") {
    throw new Error("Formal selection status must be frozen.");
  }
  if (selection.sourcePoolFingerprint !== blindability.poolFingerprint) {
    throw new Error(
      "Blindability pool fingerprint does not match the frozen selection.",
    );
  }
  if (
    selection.sourceFeatureMatrixFingerprint !== featureMatrix.matrixFingerprint
  ) {
    throw new Error(
      "Feature matrix fingerprint does not match the frozen selection.",
    );
  }
}

export function buildFormalStudyManifest({
  blindability,
  featureMatrix,
  selection,
}) {
  assertFrozenSelection(selection, blindability, featureMatrix);
  const featureRowsByRepetitionId = new Map(
    featureMatrix.rows.map((row) => [row.repetitionId, row]),
  );
  const selected = [];

  for (const [actionType, target] of Object.entries(selection.actionTargets)) {
    const candidates = deduplicateExactClips(
      blindability.items.filter(
        (item) =>
          item.actionType === actionType &&
          item.blindability.status === "eligible" &&
          featureRowsByRepetitionId.get(item.repetitionId)?.quality
            .analysisReadiness === "ready",
      ),
      `${selection.seed}:${actionType}:exact-clip-dedupe`,
    );
    selected.push(
      ...chooseBalancedItems(
        candidates,
        target,
        `${selection.seed}:${actionType}`,
      ),
    );
  }

  const selectedIds = selected.map((item) => item.repetitionId).sort();
  const expectedIds = [
    ...(selection.expectedSelectedRepetitionIds ?? []),
  ].sort();
  if (
    expectedIds.length > 0 &&
    JSON.stringify(selectedIds) !== JSON.stringify(expectedIds)
  ) {
    throw new Error(
      "Deterministic selection changed from the frozen repetition IDs.",
    );
  }

  const videoAliases = new Map();
  for (const item of selected) {
    if (!videoAliases.has(item.videoId)) {
      const extension = path.extname(item.clip.videoRelativePath) || ".mp4";
      videoAliases.set(
        item.videoId,
        `research/pilot-v1/generated/study-media/media_${sha256(
          `${selection.studyId}:${item.videoId}`,
        ).slice(0, 16)}${extension.toLowerCase()}`,
      );
    }
  }

  const items = selected
    .map((item) => ({
      studyItemId: item.studyItemId,
      repetitionId: item.repetitionId,
      ingestId: item.ingestId,
      actionType: item.actionType,
      startSecond: item.clip.startSecond,
      endSecond: item.clip.endSecond,
      cameraView: item.internalStratification.cameraView,
      side: item.internalStratification.side,
      videoPath: videoAliases.get(item.videoId),
      sourceCorrelationGroup: item.sourceCorrelationGroup,
    }))
    .sort(
      (left, right) =>
        left.actionType.localeCompare(right.actionType) ||
        left.repetitionId.localeCompare(right.repetitionId),
    );

  const actionSummary = Object.fromEntries(
    Object.keys(selection.actionTargets)
      .sort()
      .map((actionType) => {
        const actionItems = selected.filter(
          (item) => item.actionType === actionType,
        );
        return [
          actionType,
          {
            reps: actionItems.length,
            sourceVideos: new Set(actionItems.map((item) => item.videoId)).size,
            historicalScoreBucketsInternal: Object.fromEntries(
              [...new Set(actionItems.map(scoreBucket))]
                .sort()
                .map((bucket) => [
                  bucket,
                  actionItems.filter((item) => scoreBucket(item) === bucket)
                    .length,
                ]),
            ),
          },
        ];
      }),
  );

  return {
    schemaVersion: "ai_fms_formal_study_manifest_v1",
    builderVersion: BUILDER_VERSION,
    pilotId: selection.studyId,
    sourcePilotId: blindability.pilotId,
    sourceSnapshotDate: blindability.snapshotSourceDate,
    sourcePoolFingerprint: blindability.poolFingerprint,
    sourceFeatureMatrixFingerprint: featureMatrix.matrixFingerprint,
    frozenAt: selection.frozenAt,
    formalSampleSize: items.length,
    reviewEventTarget: items.length * 2 * 2,
    blindingPolicy: {
      audio: "forced_muted",
      sourceFileNameVisible: false,
      historicalHumanScoresVisible: false,
      legacyAiSuggestionsVisible: false,
      excludedVisualScoringGuidance: true,
      requiresFeatureMatrixReady: true,
    },
    selectionPolicy: {
      seed: selection.seed,
      actionTargets: selection.actionTargets,
      method: selection.selectionMethod,
      rationale: selection.decisionRationale,
    },
    actionSummary,
    items,
    internalMediaSources: Object.fromEntries(
      selected.map((item) => [
        videoAliases.get(item.videoId),
        item.clip.videoRelativePath,
      ]),
    ),
  };
}

export function buildDryRunStudyManifest({
  blindability,
  featureMatrix,
  formalManifest,
  selection,
}) {
  const formalIds = new Set(
    formalManifest.items.map((item) => item.repetitionId),
  );
  const featureRowsByRepetitionId = new Map(
    featureMatrix.rows.map((row) => [row.repetitionId, row]),
  );
  const selected = [];

  for (const actionType of Object.keys(selection.actionTargets)) {
    const candidates = deduplicateExactClips(
      blindability.items.filter(
        (item) =>
          item.actionType === actionType &&
          item.blindability.status === "eligible" &&
          !formalIds.has(item.repetitionId),
      ),
      `${selection.seed}:${actionType}:dry-run-dedupe`,
    ).sort((left, right) => {
      const leftReady =
        featureRowsByRepetitionId.get(left.repetitionId)?.quality
          .analysisReadiness === "ready";
      const rightReady =
        featureRowsByRepetitionId.get(right.repetitionId)?.quality
          .analysisReadiness === "ready";
      return (
        Number(rightReady) - Number(leftReady) ||
        stableTieBreak(`${selection.seed}:dry-run`, left).localeCompare(
          stableTieBreak(`${selection.seed}:dry-run`, right),
        )
      );
    });
    if (candidates.length === 0) {
      throw new Error(`No non-formal dry-run candidate for ${actionType}.`);
    }
    selected.push(candidates[0]);
  }

  const pilotId = `${selection.studyId}-dry-run-v1`;
  const internalMediaSources = {};
  const items = selected.map((item) => {
    const extension = path.extname(item.clip.videoRelativePath) || ".mp4";
    const videoPath = `research/pilot-v1/generated/study-dry-run-media/dry_${sha256(
      `${pilotId}:${item.videoId}`,
    ).slice(0, 16)}${extension.toLowerCase()}`;
    internalMediaSources[videoPath] = item.clip.videoRelativePath;
    return {
      studyItemId: item.studyItemId,
      repetitionId: item.repetitionId,
      ingestId: item.ingestId,
      actionType: item.actionType,
      startSecond: item.clip.startSecond,
      endSecond: item.clip.endSecond,
      cameraView: item.internalStratification.cameraView,
      side: item.internalStratification.side,
      videoPath,
    };
  });

  return {
    schemaVersion: "ai_fms_dry_run_study_manifest_v1",
    builderVersion: BUILDER_VERSION,
    pilotId,
    sourcePilotId: blindability.pilotId,
    sourceSnapshotDate: blindability.snapshotSourceDate,
    sourcePoolFingerprint: blindability.poolFingerprint,
    sourceFeatureMatrixFingerprint: featureMatrix.matrixFingerprint,
    purpose: "workflow_dry_run_not_formal_analysis",
    formalSampleSize: items.length,
    blindingPolicy: {
      audio: "forced_muted",
      sourceFileNameVisible: false,
      historicalHumanScoresVisible: false,
      legacyAiSuggestionsVisible: false,
    },
    items,
    internalMediaSources,
  };
}

function materializeMediaAliases(repoRoot, manifests) {
  const sourcesByDirectory = new Map();
  for (const manifest of manifests) {
    for (const [aliasPath, sourcePath] of Object.entries(
      manifest.internalMediaSources,
    )) {
      const directory = path.dirname(aliasPath);
      if (!sourcesByDirectory.has(directory)) {
        sourcesByDirectory.set(directory, new Map());
      }
      sourcesByDirectory
        .get(directory)
        .set(path.basename(aliasPath), sourcePath);
    }
  }

  for (const [directory, sources] of sourcesByDirectory) {
    const mediaDir = path.resolve(repoRoot, directory);
    fs.mkdirSync(mediaDir, { recursive: true });
    for (const fileName of fs.readdirSync(mediaDir)) {
      if (!sources.has(fileName)) {
        fs.unlinkSync(path.join(mediaDir, fileName));
      }
    }
    for (const [fileName, sourcePath] of sources) {
      const aliasAbsolute = path.join(mediaDir, fileName);
      if (!fs.existsSync(aliasAbsolute)) {
        fs.linkSync(path.resolve(repoRoot, sourcePath), aliasAbsolute);
      }
    }
  }
}

function buildReport(manifest) {
  const lines = [
    "# Frozen Formal Study Manifest",
    "",
    `- Study ID: ${manifest.pilotId}`,
    `- Frozen at: ${manifest.frozenAt}`,
    `- Formal sample size: ${manifest.formalSampleSize}`,
    `- Two-reviewer, two-round event target: ${manifest.reviewEventTarget}`,
    `- Source pool fingerprint: ${manifest.sourcePoolFingerprint}`,
    `- Feature matrix fingerprint: ${manifest.sourceFeatureMatrixFingerprint}`,
    "",
    "| Action | Reps | Source videos | Historical score buckets (internal) |",
    "| --- | ---: | ---: | --- |",
  ];
  for (const [actionType, summary] of Object.entries(manifest.actionSummary)) {
    lines.push(
      `| ${actionType} | ${summary.reps} | ${summary.sourceVideos} | ${Object.entries(
        summary.historicalScoreBucketsInternal,
      )
        .map(([score, count]) => `${score}:${count}`)
        .join(", ")} |`,
    );
  }
  lines.push("", manifest.selectionPolicy.rationale, "");
  return lines.join("\n");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = process.cwd();
  const outputDir = path.resolve(repoRoot, args.outputDir);
  const blindability = readJson(path.resolve(repoRoot, args.blindabilityPath));
  const featureMatrix = readJson(
    path.resolve(repoRoot, args.featureMatrixPath),
  );
  const selection = readJson(path.resolve(repoRoot, args.selectionPath));
  const manifest = buildFormalStudyManifest({
    blindability,
    featureMatrix,
    selection,
  });
  const dryRunManifest = buildDryRunStudyManifest({
    blindability,
    featureMatrix,
    formalManifest: manifest,
    selection,
  });

  fs.mkdirSync(outputDir, { recursive: true });
  materializeMediaAliases(repoRoot, [manifest, dryRunManifest]);

  const internalManifest = { ...manifest };
  const reviewerManifest = {
    ...manifest,
    selectionPolicy: {
      actionTargets: manifest.selectionPolicy.actionTargets,
    },
    actionSummary: Object.fromEntries(
      Object.entries(manifest.actionSummary).map(([actionType, summary]) => [
        actionType,
        { reps: summary.reps, sourceVideos: summary.sourceVideos },
      ]),
    ),
    items: manifest.items.map((item) => {
      const reviewerItem = { ...item };
      delete reviewerItem.sourceCorrelationGroup;
      return reviewerItem;
    }),
  };
  delete reviewerManifest.internalMediaSources;
  const manifestText = `${JSON.stringify(reviewerManifest, null, 2)}\n`;
  const internalManifestText = `${JSON.stringify(internalManifest, null, 2)}\n`;
  const dryRunReviewerManifest = { ...dryRunManifest };
  delete dryRunReviewerManifest.internalMediaSources;
  const dryRunManifestText = `${JSON.stringify(
    dryRunReviewerManifest,
    null,
    2,
  )}\n`;
  fs.writeFileSync(
    path.join(outputDir, "formal-study-manifest.json"),
    manifestText,
  );
  fs.writeFileSync(
    path.join(outputDir, "formal-study-internal-manifest.json"),
    internalManifestText,
  );
  fs.writeFileSync(
    path.join(outputDir, "dry-run-study-manifest.json"),
    dryRunManifestText,
  );
  fs.writeFileSync(
    path.join(outputDir, "formal-study-report.md"),
    buildReport(manifest),
  );
  fs.writeFileSync(
    path.join(outputDir, "dry-run-study-SHA256SUMS"),
    `${sha256(dryRunManifestText)}  dry-run-study-manifest.json\n`,
  );
  fs.writeFileSync(
    path.join(outputDir, "formal-study-SHA256SUMS"),
    `${sha256(manifestText)}  formal-study-manifest.json\n${sha256(
      internalManifestText,
    )}  formal-study-internal-manifest.json\n`,
  );
  process.stdout.write(
    `${JSON.stringify(
      {
        poolFingerprint: manifest.sourcePoolFingerprint,
        featureMatrixFingerprint: manifest.sourceFeatureMatrixFingerprint,
        formalSampleSize: manifest.formalSampleSize,
        actionSummary: manifest.actionSummary,
        selectedRepetitionIds: manifest.items
          .map((item) => item.repetitionId)
          .sort(),
        dryRunRepetitionIds: dryRunManifest.items
          .map((item) => item.repetitionId)
          .sort(),
      },
      null,
      2,
    )}\n`,
  );
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
