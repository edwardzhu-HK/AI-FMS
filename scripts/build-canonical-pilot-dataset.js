import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_VERSION = "canonical-pilot-builder-v1";
const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".m4v", ".avi", ".mkv"]);
const ACTION_ORDER = [
  "deep_squat",
  "hurdle_step",
  "active_straight_leg_raise",
  "rotary_stability",
];

const ACTION_ASSET_MARKERS = {
  deep_squat: ["/sample videos/1-squat/", "/01-deep squat/"],
  hurdle_step: ["/sample videos/2-hurdle step/", "/02-hurdle step/"],
  active_straight_leg_raise: [
    "/sample videos/5-aslr/",
    "/05-active straight leg raise/",
  ],
  rotary_stability: [
    "/sample videos/7-rotatory stability/",
    "/07-rotary stability/",
  ],
};

function parseArgs(argv) {
  const args = {
    inputRoot: "Ingested-data",
    assetRoot: "Eval_Videos",
    outputDir: "research/pilot-v1/generated",
    configPath: "research/pilot-v1/pilot-config.json",
    hashAssets: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const value = argv[index + 1];

    if (token === "--input-root" && value) {
      args.inputRoot = value;
      index += 1;
    } else if (token === "--asset-root" && value) {
      args.assetRoot = value;
      index += 1;
    } else if (token === "--output-dir" && value) {
      args.outputDir = value;
      index += 1;
    } else if (token === "--config" && value) {
      args.configPath = value;
      index += 1;
    } else if (token === "--no-hash-assets") {
      args.hashAssets = false;
    }
  }

  return args;
}

function listFiles(root, predicate = () => true) {
  const files = [];

  function walk(currentPath) {
    for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) {
        continue;
      }

      const entryPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath);
      } else if (predicate(entryPath)) {
        files.push(entryPath);
      }
    }
  }

  if (fs.existsSync(root)) {
    walk(root);
  }

  return files.sort((left, right) => left.localeCompare(right));
}

function stableValue(value) {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stableValue(value[key])]),
    );
  }

  return value;
}

function stableStringify(value) {
  return JSON.stringify(stableValue(value));
}

function shortHash(value, length = 12) {
  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex")
    .slice(0, length);
}

async function hashFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

function toRepoPath(repoRoot, filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join("/");
}

function readHistoryFiles(inputRoot, repoRoot) {
  const files = listFiles(inputRoot, (filePath) =>
    filePath.toLowerCase().endsWith(".json"),
  );
  const occurrences = [];
  const issues = [];
  let latestExportedAt = null;

  for (const filePath of files) {
    let payload;
    try {
      payload = JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (error) {
      issues.push({
        code: "invalid_json",
        sourceFile: toRepoPath(repoRoot, filePath),
        message: error.message,
      });
      continue;
    }

    if (!Array.isArray(payload.entries)) {
      issues.push({
        code: "missing_entries",
        sourceFile: toRepoPath(repoRoot, filePath),
        message: "History export does not contain an entries array.",
      });
      continue;
    }

    if (
      payload.exportedAt &&
      (!latestExportedAt || payload.exportedAt > latestExportedAt)
    ) {
      latestExportedAt = payload.exportedAt;
    }

    for (const entry of payload.entries) {
      occurrences.push({
        entry,
        sourceFile: toRepoPath(repoRoot, filePath),
        contentHash: shortHash(stableStringify(entry), 24),
      });
    }
  }

  return { files, occurrences, issues, latestExportedAt };
}

export function deduplicateHistoryEntries(occurrences) {
  const grouped = new Map();

  for (const occurrence of occurrences) {
    const entryId = occurrence.entry?.id;
    if (!entryId) {
      throw new Error(`History entry in ${occurrence.sourceFile} has no id.`);
    }

    const current = grouped.get(entryId) ?? [];
    current.push(occurrence);
    grouped.set(entryId, current);
  }

  const conflicts = [];
  const entries = [];

  for (const [entryId, group] of grouped.entries()) {
    const contentHashes = [...new Set(group.map((item) => item.contentHash))];
    if (contentHashes.length > 1) {
      conflicts.push({
        entryId,
        contentHashes,
        sourceFiles: [...new Set(group.map((item) => item.sourceFile))].sort(),
      });
    }

    entries.push({
      entry: group[0].entry,
      contentHash: group[0].contentHash,
      sourceFiles: [...new Set(group.map((item) => item.sourceFile))].sort(),
      occurrenceCount: group.length,
    });
  }

  entries.sort((left, right) => {
    const leftDate = left.entry.savedAt ?? left.entry.id;
    const rightDate = right.entry.savedAt ?? right.entry.id;
    return leftDate.localeCompare(rightDate);
  });

  return { entries, conflicts };
}

function normalizeAssetPath(filePath) {
  return filePath.split(path.sep).join("/").toLowerCase();
}

function scoreAssetCandidate(filePath, actionType, assetKind) {
  const normalized = normalizeAssetPath(filePath);
  const markers = ACTION_ASSET_MARKERS[actionType] ?? [];
  let score = markers.some((marker) => normalized.includes(marker)) ? 100 : 0;

  if (normalized.includes("/sample videos/")) {
    score += 20;
  }
  if (assetKind === "pose" && normalized.includes("/pose/")) {
    score += 10;
  }

  return score;
}

function resolveAsset({ files, fileName, actionType, assetKind, repoRoot }) {
  if (!fileName) {
    return {
      status: "not_referenced",
      requestedFileName: null,
      relativePath: null,
      candidatePaths: [],
    };
  }

  const matches = files.filter(
    (filePath) =>
      path.basename(filePath).toLowerCase() === fileName.toLowerCase(),
  );
  const ranked = matches
    .map((filePath) => ({
      filePath,
      score: scoreAssetCandidate(filePath, actionType, assetKind),
    }))
    .sort(
      (left, right) =>
        right.score - left.score || left.filePath.localeCompare(right.filePath),
    );
  const best = ranked[0];

  if (!best || best.score === 0) {
    return {
      status: "missing",
      requestedFileName: fileName,
      relativePath: null,
      candidatePaths: ranked.map((item) => toRepoPath(repoRoot, item.filePath)),
    };
  }

  const equallyRanked = ranked.filter((item) => item.score === best.score);
  return {
    status: equallyRanked.length > 1 ? "ambiguous" : "found",
    requestedFileName: fileName,
    relativePath: toRepoPath(repoRoot, best.filePath),
    absolutePath: best.filePath,
    candidatePaths: equallyRanked.map((item) =>
      toRepoPath(repoRoot, item.filePath),
    ),
  };
}

function probeVideoDuration(filePath) {
  if (!filePath) {
    return null;
  }

  try {
    const output = execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        filePath,
      ],
      { encoding: "utf8" },
    );
    const duration = Number(output.trim());
    return Number.isFinite(duration) ? Number(duration.toFixed(3)) : null;
  } catch {
    return null;
  }
}

function normalizeReview(score, role) {
  if (!score) {
    return null;
  }

  return {
    reviewerRole: role,
    reviewerId: score.reviewerId ?? "",
    totalScore: Number.isFinite(score.totalScore) ? score.totalScore : null,
    scoringStatus:
      score.scoringStatus ??
      (Number.isFinite(score.totalScore) ? "scored" : "not_scored"),
    scoreScope: score.scoreScope ?? null,
    scoreBasis: score.scoreBasis ?? null,
    usesCriteriaScores: score.usesCriteriaScores ?? null,
    comment: score.comment ?? "",
  };
}

function parseOptionalNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function buildHumanReviewSummary(reviews) {
  const numericScores = reviews
    .map((review) => review?.totalScore)
    .filter(Number.isFinite);

  return {
    numericReviewCount: numericScores.length,
    consensusScore:
      numericScores.length === 2 && numericScores[0] === numericScores[1]
        ? numericScores[0]
        : null,
    reviewerAgreement:
      numericScores.length === 2 ? numericScores[0] === numericScores[1] : null,
  };
}

function buildCsv(repetitions) {
  const columns = [
    "repetition_id",
    "ingest_id",
    "video_id",
    "action_type",
    "video_file_name",
    "repetition_index",
    "start_second",
    "end_second",
    "camera_view",
    "side",
    "review_status",
    "reviewer_a_id",
    "reviewer_a_score",
    "reviewer_b_id",
    "reviewer_b_score",
    "human_consensus_score",
    "legacy_ai_score",
    "legacy_ai_model_version",
    "legacy_ai_accuracy_eligible",
  ];

  function escape(value) {
    if (value === null || value === undefined) {
      return "";
    }
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  }

  const rows = repetitions.map((rep) => {
    const reviewerA = rep.humanReviews.find(
      (review) => review?.reviewerRole === "reviewer_a",
    );
    const reviewerB = rep.humanReviews.find(
      (review) => review?.reviewerRole === "reviewer_b",
    );
    const values = [
      rep.repetitionId,
      rep.ingestId,
      rep.videoId,
      rep.actionType,
      rep.videoFileName,
      rep.repetitionIndex,
      rep.startSecond,
      rep.endSecond,
      rep.cameraView,
      rep.side,
      rep.reviewStatus,
      reviewerA?.reviewerId,
      reviewerA?.totalScore,
      reviewerB?.reviewerId,
      reviewerB?.totalScore,
      rep.humanReviewSummary.consensusScore,
      rep.legacyAiSuggestion.totalScore,
      rep.legacyAiSuggestion.modelVersion,
      rep.legacyAiSuggestion.eligibleForAccuracyAnalysis,
    ];
    return values.map(escape).join(",");
  });

  return `${columns.join(",")}\n${rows.join("\n")}\n`;
}

function countNumericReviews(repetitions, role) {
  return repetitions.filter((rep) =>
    rep.humanReviews.some(
      (review) =>
        review?.reviewerRole === role && Number.isFinite(review.totalScore),
    ),
  ).length;
}

function compareExpected(actual, expected) {
  const failures = [];

  for (const key of [
    "sourceFiles",
    "uniqueIngests",
    "uniqueVideos",
    "repetitions",
  ]) {
    if (expected?.[key] !== undefined && actual[key] !== expected[key]) {
      failures.push(
        `${key}: expected ${expected[key]}, received ${actual[key]}`,
      );
    }
  }

  for (const [actionType, expectedCount] of Object.entries(
    expected?.actions ?? {},
  )) {
    const actualCount = actual.actions[actionType]?.repetitions ?? 0;
    if (actualCount !== expectedCount) {
      failures.push(
        `actions.${actionType}: expected ${expectedCount}, received ${actualCount}`,
      );
    }
  }

  return failures;
}

export function validateCanonicalPilot(canonical) {
  const issues = [];
  const videoIds = new Set();
  const ingestIds = new Set();
  const repetitionIds = new Set();

  if (canonical.schemaVersion !== "ai_fms_canonical_pilot_v1") {
    issues.push("schemaVersion must be ai_fms_canonical_pilot_v1");
  }

  for (const video of canonical.videos ?? []) {
    if (videoIds.has(video.videoId)) {
      issues.push(`duplicate videoId: ${video.videoId}`);
    }
    videoIds.add(video.videoId);

    if (!ACTION_ORDER.includes(video.actionType)) {
      issues.push(`unsupported video actionType: ${video.actionType}`);
    }
    if (video.relativePath && path.isAbsolute(video.relativePath)) {
      issues.push(`video path must be relative: ${video.relativePath}`);
    }
  }

  for (const ingest of canonical.ingests ?? []) {
    if (ingestIds.has(ingest.ingestId)) {
      issues.push(`duplicate ingestId: ${ingest.ingestId}`);
    }
    ingestIds.add(ingest.ingestId);

    if (!videoIds.has(ingest.videoId)) {
      issues.push(`ingest references unknown videoId: ${ingest.videoId}`);
    }
    if (!ACTION_ORDER.includes(ingest.actionType)) {
      issues.push(`unsupported ingest actionType: ${ingest.actionType}`);
    }
  }

  for (const repetition of canonical.repetitions ?? []) {
    if (repetitionIds.has(repetition.repetitionId)) {
      issues.push(`duplicate repetitionId: ${repetition.repetitionId}`);
    }
    repetitionIds.add(repetition.repetitionId);

    if (!ingestIds.has(repetition.ingestId)) {
      issues.push(
        `repetition references unknown ingestId: ${repetition.ingestId}`,
      );
    }
    if (!videoIds.has(repetition.videoId)) {
      issues.push(
        `repetition references unknown videoId: ${repetition.videoId}`,
      );
    }
    if (
      !Number.isFinite(repetition.startSecond) ||
      !Number.isFinite(repetition.endSecond) ||
      repetition.startSecond < 0 ||
      repetition.endSecond <= repetition.startSecond
    ) {
      issues.push(`invalid repetition time range: ${repetition.repetitionId}`);
    }
    if (!ACTION_ORDER.includes(repetition.actionType)) {
      issues.push(
        `unsupported repetition actionType: ${repetition.actionType}`,
      );
    }
    if (
      repetition.legacyAiSuggestion?.provenanceStatus !==
        "label_leakage_confirmed" ||
      repetition.legacyAiSuggestion?.eligibleForAccuracyAnalysis !== false
    ) {
      issues.push(
        `legacy AI provenance boundary missing: ${repetition.repetitionId}`,
      );
    }
  }

  for (const sourceFile of canonical.sourceFiles ?? []) {
    if (path.isAbsolute(sourceFile)) {
      issues.push(`source path must be relative: ${sourceFile}`);
    }
  }

  return issues;
}

function buildQaMarkdown(summary, manifest) {
  const actionRows = ACTION_ORDER.map((actionType) => {
    const item = summary.actions[actionType] ?? { ingests: 0, repetitions: 0 };
    return `| ${actionType} | ${item.ingests} | ${item.repetitions} |`;
  });
  const missingPose = manifest.items.filter(
    (item) => item.pose.status !== "found",
  );

  return [
    "# AI-FMS Canonical Pilot QA",
    "",
    `- Snapshot source date: ${summary.snapshotSourceDate ?? "unknown"}`,
    `- Source history files: ${summary.sourceFiles}`,
    `- Entry occurrences: ${summary.entryOccurrences}`,
    `- Unique ingests: ${summary.uniqueIngests}`,
    `- Duplicate occurrences removed: ${summary.duplicateOccurrencesRemoved}`,
    `- Unique videos: ${summary.uniqueVideos}`,
    `- Canonical repetitions: ${summary.repetitions}`,
    `- Resolved video references: ${summary.videoAssetsFound}/${summary.uniqueIngests}`,
    `- Resolved pose references: ${summary.poseAssetsFound}/${summary.uniqueIngests}`,
    `- Legacy numeric AI suggestions marked ineligible: ${summary.legacyNumericAiSuggestions}`,
    `- Conflicting duplicate ingest IDs: ${summary.conflictingIngestIds}`,
    "",
    "| Action | Ingests | Repetitions |",
    "| --- | ---: | ---: |",
    ...actionRows,
    "",
    "## Human Review Coverage",
    "",
    `- Reviewer A numeric scores: ${summary.reviewerANumericScores}`,
    `- Reviewer B numeric scores: ${summary.reviewerBNumericScores}`,
    `- Two-reviewer numeric agreement pairs: ${summary.numericReviewerPairs}`,
    `- Two-reviewer matching pairs: ${summary.numericReviewerMatches}`,
    "",
    "## Missing Or Ambiguous Pose References",
    "",
    ...(missingPose.length > 0
      ? missingPose.map(
          (item) =>
            `- ${item.actionType} / ${item.video.requestedFileName}: ${item.pose.requestedFileName ?? "not referenced"} (${item.pose.status})`,
        )
      : ["- None"]),
    "",
    "## Interpretation Boundary",
    "",
    "Legacy AI scores were created by a workflow that could read score-bearing file names or notes. They are retained only for provenance and are not eligible for accuracy, agreement, or validation claims.",
    "",
  ].join("\n");
}

async function attachAssetMetadata(asset, hashAssets) {
  if (!asset.absolutePath) {
    return asset;
  }

  const stats = fs.statSync(asset.absolutePath);
  return {
    ...asset,
    sizeBytes: stats.size,
    sha256: hashAssets ? await hashFile(asset.absolutePath) : null,
  };
}

export async function buildCanonicalPilot({
  repoRoot,
  inputRoot,
  assetRoot,
  hashAssets = true,
}) {
  const history = readHistoryFiles(inputRoot, repoRoot);
  const deduplicated = deduplicateHistoryEntries(history.occurrences);
  const allAssetFiles = listFiles(assetRoot);
  const videoFiles = allAssetFiles.filter((filePath) =>
    VIDEO_EXTENSIONS.has(path.extname(filePath).toLowerCase()),
  );
  const poseFiles = allAssetFiles.filter((filePath) =>
    filePath.toLowerCase().endsWith(".pose.json"),
  );
  const assetHashCache = new Map();
  const durationCache = new Map();
  const manifestItems = [];
  const ingests = [];
  const repetitions = [];
  const videosByKey = new Map();

  async function enrichAsset(asset, kind) {
    if (!asset.absolutePath) {
      return asset;
    }

    let metadata = assetHashCache.get(asset.absolutePath);
    if (!metadata) {
      metadata = await attachAssetMetadata(asset, hashAssets);
      assetHashCache.set(asset.absolutePath, metadata);
    }

    const result = { ...metadata };
    delete result.absolutePath;
    if (kind === "video") {
      if (!durationCache.has(asset.absolutePath)) {
        durationCache.set(
          asset.absolutePath,
          probeVideoDuration(asset.absolutePath),
        );
      }
      result.durationSecond = durationCache.get(asset.absolutePath);
    }
    return result;
  }

  for (const item of deduplicated.entries) {
    const entry = item.entry;
    const actionType =
      entry.workflow?.selectedAction ?? entry.segments?.[0]?.actionType;
    const ingestId = `ing_${shortHash(entry.id)}`;
    const resolvedVideo = resolveAsset({
      files: videoFiles,
      fileName: entry.workflow?.videoFileName,
      actionType,
      assetKind: "video",
      repoRoot,
    });
    const resolvedPose = resolveAsset({
      files: poseFiles,
      fileName: entry.workflow?.poseFileName,
      actionType,
      assetKind: "pose",
      repoRoot,
    });
    const video = await enrichAsset(resolvedVideo, "video");
    const pose = await enrichAsset(resolvedPose, "pose");
    if (!pose.relativePath && pose.requestedFileName && video.relativePath) {
      pose.expectedRelativePath = path.posix.join(
        path.posix.dirname(video.relativePath),
        "pose",
        pose.requestedFileName,
      );
    }
    const analysisRange = {
      startSecond: parseOptionalNumber(entry.workflow?.startSecond),
      endSecond: parseOptionalNumber(entry.workflow?.endSecond),
    };
    const videoKey = `${actionType}|${video.relativePath ?? entry.workflow?.videoFileName}`;
    const videoId = `vid_${shortHash(videoKey)}`;

    if (!videosByKey.has(videoKey)) {
      videosByKey.set(videoKey, {
        videoId,
        actionType,
        fileName: entry.workflow?.videoFileName ?? null,
        relativePath: video.relativePath,
        status: video.status,
        durationSecond: video.durationSecond ?? null,
        sizeBytes: video.sizeBytes ?? null,
        sha256: video.sha256 ?? null,
      });
    }

    manifestItems.push({
      ingestId,
      actionType,
      video,
      pose,
      analysisRange,
      sourceHistoryFiles: item.sourceFiles,
    });

    const entrySegments = Array.isArray(entry.segments) ? entry.segments : [];
    ingests.push({
      ingestId,
      videoId,
      actionType,
      savedAt: entry.savedAt ?? null,
      apiMode: entry.workflow?.apiMode ?? null,
      sourceHistoryFiles: item.sourceFiles,
      sourceOccurrenceCount: item.occurrenceCount,
      originalIds: {
        entryId: entry.id,
        ingestBatchId: entry.ingest?.ingestBatchId ?? null,
        videoId: entry.workflow?.videoId ?? entry.ingest?.videoId ?? null,
      },
      expectedReps: entry.workflow?.expectedReps ?? null,
      analysisRange,
      segmentCount: entrySegments.length,
    });

    entrySegments.forEach((segment, segmentIndex) => {
      const repetitionId = `rep_${shortHash(
        `${ingestId}|${segment.segmentId}|${segmentIndex}|${segment.startSecond}|${segment.endSecond}`,
      )}`;
      const humanReviews = [
        normalizeReview(segment.reviewerScores?.reviewer_a, "reviewer_a"),
        normalizeReview(segment.reviewerScores?.reviewer_b, "reviewer_b"),
      ].filter(Boolean);

      repetitions.push({
        repetitionId,
        ingestId,
        videoId,
        actionType: segment.actionType ?? actionType,
        videoFileName: entry.workflow?.videoFileName ?? null,
        repetitionIndex: segment.repetitionIndex ?? segmentIndex + 1,
        startSecond: segment.startSecond,
        endSecond: segment.endSecond,
        originalStartSecond: segment.originalStartSecond ?? null,
        originalEndSecond: segment.originalEndSecond ?? null,
        segmentSource: segment.segmentSource ?? null,
        cameraView: segment.cameraView ?? "unknown",
        side: segment.side ?? "unknown",
        attemptCondition: segment.attemptCondition ?? null,
        painFlag: Boolean(segment.painFlag),
        clearingTest: segment.clearingTest ?? "not_applicable",
        clearingFindings: segment.clearingFindings ?? [],
        rubricVersion: segment.rubricVersion ?? null,
        reviewStatus: segment.reviewStatus ?? "unknown",
        humanReviews,
        humanReviewSummary: buildHumanReviewSummary(humanReviews),
        legacyAiSuggestion: {
          totalScore: Number.isFinite(segment.aiScore?.totalScore)
            ? segment.aiScore.totalScore
            : null,
          modelVersion: segment.aiScore?.modelVersion ?? null,
          provenanceStatus: "label_leakage_confirmed",
          eligibleForAccuracyAnalysis: false,
        },
        originalIds: {
          segmentId: segment.segmentId ?? null,
          videoId: segment.videoId ?? null,
        },
      });
    });
  }

  const actions = Object.fromEntries(
    ACTION_ORDER.map((actionType) => [
      actionType,
      {
        ingests: ingests.filter((item) => item.actionType === actionType)
          .length,
        repetitions: repetitions.filter(
          (item) => item.actionType === actionType,
        ).length,
      },
    ]),
  );
  const numericPairs = repetitions.filter(
    (rep) => rep.humanReviewSummary.numericReviewCount === 2,
  );
  const summary = {
    snapshotSourceDate: history.latestExportedAt,
    sourceFiles: history.files.length,
    entryOccurrences: history.occurrences.length,
    uniqueIngests: ingests.length,
    duplicateOccurrencesRemoved: history.occurrences.length - ingests.length,
    conflictingIngestIds: deduplicated.conflicts.length,
    uniqueVideos: videosByKey.size,
    repetitions: repetitions.length,
    videoAssetsFound: manifestItems.filter(
      (item) => item.video.status === "found",
    ).length,
    poseAssetsFound: manifestItems.filter(
      (item) => item.pose.status === "found",
    ).length,
    reviewerANumericScores: countNumericReviews(repetitions, "reviewer_a"),
    reviewerBNumericScores: countNumericReviews(repetitions, "reviewer_b"),
    numericReviewerPairs: numericPairs.length,
    numericReviewerMatches: numericPairs.filter(
      (rep) => rep.humanReviewSummary.reviewerAgreement,
    ).length,
    legacyNumericAiSuggestions: repetitions.filter((rep) =>
      Number.isFinite(rep.legacyAiSuggestion.totalScore),
    ).length,
    actions,
  };

  const canonical = {
    schemaVersion: "ai_fms_canonical_pilot_v1",
    pilotId: "four-movement-pilot-v1",
    snapshotSourceDate: history.latestExportedAt,
    builderVersion: SCRIPT_VERSION,
    summary,
    provenancePolicy: {
      rawHistoryMode: "mock",
      legacyAiLabelLeakage: "confirmed",
      legacyAiEligibleForAccuracyAnalysis: false,
      publicReleaseStatus: "private_research_snapshot",
    },
    sourceFiles: history.files.map((filePath) =>
      toRepoPath(repoRoot, filePath),
    ),
    sourceIssues: history.issues,
    duplicateConflicts: deduplicated.conflicts,
    videos: [...videosByKey.values()].sort((left, right) =>
      left.videoId.localeCompare(right.videoId),
    ),
    ingests,
    repetitions,
  };
  const manifest = {
    schemaVersion: "ai_fms_asset_manifest_v1",
    pilotId: canonical.pilotId,
    snapshotSourceDate: canonical.snapshotSourceDate,
    summary: {
      items: manifestItems.length,
      videosFound: summary.videoAssetsFound,
      posesFound: summary.poseAssetsFound,
    },
    items: manifestItems,
  };

  return { canonical, manifest, summary };
}

async function writeOutputs({ outputDir, canonical, manifest, summary }) {
  fs.mkdirSync(outputDir, { recursive: true });
  const outputs = {
    "canonical-pilot.json": `${JSON.stringify(canonical, null, 2)}\n`,
    "canonical-repetitions.csv": buildCsv(canonical.repetitions),
    "asset-manifest.json": `${JSON.stringify(manifest, null, 2)}\n`,
    "qa-report.md": buildQaMarkdown(summary, manifest),
  };

  for (const [fileName, contents] of Object.entries(outputs)) {
    fs.writeFileSync(path.join(outputDir, fileName), contents);
  }

  const checksums = [];
  for (const fileName of Object.keys(outputs).sort()) {
    checksums.push(
      `${await hashFile(path.join(outputDir, fileName))}  ${fileName}`,
    );
  }
  fs.writeFileSync(
    path.join(outputDir, "SHA256SUMS"),
    `${checksums.join("\n")}\n`,
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = process.cwd();
  const inputRoot = path.resolve(repoRoot, args.inputRoot);
  const assetRoot = path.resolve(repoRoot, args.assetRoot);
  const outputDir = path.resolve(repoRoot, args.outputDir);
  const config = JSON.parse(
    fs.readFileSync(path.resolve(repoRoot, args.configPath), "utf8"),
  );

  const result = await buildCanonicalPilot({
    repoRoot,
    inputRoot,
    assetRoot,
    hashAssets: args.hashAssets,
  });
  const expectationFailures = compareExpected(result.summary, config.expected);
  const canonicalIssues = validateCanonicalPilot(result.canonical);

  if (result.canonical.sourceIssues.length > 0) {
    throw new Error(
      `Source validation failed: ${JSON.stringify(result.canonical.sourceIssues)}`,
    );
  }
  if (result.canonical.duplicateConflicts.length > 0) {
    throw new Error(
      `Conflicting duplicate ingest IDs: ${JSON.stringify(result.canonical.duplicateConflicts)}`,
    );
  }
  if (expectationFailures.length > 0) {
    throw new Error(
      `Pilot baseline mismatch:\n${expectationFailures.join("\n")}`,
    );
  }
  if (canonicalIssues.length > 0) {
    throw new Error(
      `Canonical validation failed:\n${canonicalIssues.join("\n")}`,
    );
  }

  await writeOutputs({ outputDir, ...result });
  process.stdout.write(`${JSON.stringify(result.summary, null, 2)}\n`);
}

const isMainModule =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(fileURLToPath(import.meta.url));

if (isMainModule) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
