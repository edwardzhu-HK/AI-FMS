import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BUILDER_VERSION = "blindability-manifest-builder-v1";
const QA_VALUES = {
  visualLabelCue: new Set(["pending", "none", "present"]),
  instructionalVisualCue: new Set([
    "pending",
    "none",
    "movement_title_only",
    "scoring_guidance",
  ]),
  targetSubject: new Set(["pending", "clear", "ambiguous"]),
  timing: new Set(["pending", "complete", "needs_adjustment"]),
  movementVisibility: new Set(["pending", "adequate", "inadequate"]),
};

function parseArgs(argv) {
  const args = {
    canonicalPath: "research/pilot-v1/generated/canonical-pilot.json",
    assetManifestPath: "research/pilot-v1/generated/asset-manifest.json",
    overridesPath: "research/pilot-v1/blindability-overrides.json",
    outputDir: "research/pilot-v1/generated",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const value = argv[index + 1];
    if (token === "--canonical" && value) {
      args.canonicalPath = value;
      index += 1;
    } else if (token === "--asset-manifest" && value) {
      args.assetManifestPath = value;
      index += 1;
    } else if (token === "--overrides" && value) {
      args.overridesPath = value;
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

function shortHash(value, length = 12) {
  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex")
    .slice(0, length);
}

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function containsScoreCue(fileName) {
  return /(?:score|评分|得分)[\s_-]*[0-3]\b/i.test(fileName ?? "");
}

function resolveBlindabilityStatus(blindability, structuralIssues) {
  const exclusionReasons = [...structuralIssues];

  if (blindability.visualLabelCue === "present") {
    exclusionReasons.push("visible_label_cue");
  }
  if (blindability.instructionalVisualCue === "scoring_guidance") {
    exclusionReasons.push("visible_scoring_guidance");
  }
  if (blindability.targetSubject === "ambiguous") {
    exclusionReasons.push("target_subject_ambiguous");
  }
  if (blindability.timing === "needs_adjustment") {
    exclusionReasons.push("timing_needs_adjustment");
  }
  if (blindability.movementVisibility === "inadequate") {
    exclusionReasons.push("movement_visibility_inadequate");
  }

  const uniqueReasons = [...new Set(exclusionReasons)].sort();
  if (uniqueReasons.length > 0) {
    return { status: "excluded", exclusionReasons: uniqueReasons };
  }

  const pendingFields = [
    ["visualLabelCue", blindability.visualLabelCue],
    ["instructionalVisualCue", blindability.instructionalVisualCue],
    ["targetSubject", blindability.targetSubject],
    ["timing", blindability.timing],
    ["movementVisibility", blindability.movementVisibility],
  ]
    .filter(([, value]) => value === "pending")
    .map(([field]) => field);

  if (pendingFields.length > 0) {
    return {
      status: "pending_visual_qa",
      exclusionReasons: [],
      pendingFields,
    };
  }

  return { status: "eligible", exclusionReasons: [], pendingFields: [] };
}

function buildQa(overrides, videoId, repetitionId) {
  const qa = {
    ...overrides.defaults,
    ...overrides.review,
    ...(overrides.videoOverrides?.[videoId] ?? {}),
    ...(overrides.repetitionOverrides?.[repetitionId] ?? {}),
  };
  for (const [field, values] of Object.entries(QA_VALUES)) {
    if (!values.has(qa[field])) {
      throw new Error(
        `Invalid ${field} value for ${repetitionId}: ${String(qa[field])}`,
      );
    }
  }
  return qa;
}

function buildStructuralIssues(repetition, video, assetItem) {
  const issues = [];
  if (!video || video.status !== "found" || !video.relativePath) {
    issues.push("video_asset_missing");
  }
  if (!assetItem || assetItem.pose?.status !== "found") {
    issues.push("pose_asset_missing");
  }
  if (
    !Number.isFinite(repetition.startSecond) ||
    !Number.isFinite(repetition.endSecond) ||
    repetition.endSecond <= repetition.startSecond
  ) {
    issues.push("invalid_clip_range");
  }
  if (
    video?.durationSecond &&
    repetition.endSecond > video.durationSecond + 0.25
  ) {
    issues.push("clip_exceeds_video_duration");
  }
  return issues;
}

export function buildBlindabilityManifest({
  canonical,
  assetManifest,
  overrides,
}) {
  const videosById = new Map(
    (canonical.videos ?? []).map((video) => [video.videoId, video]),
  );
  const assetsByIngestId = new Map(
    (assetManifest.items ?? []).map((item) => [item.ingestId, item]),
  );
  const videoRepCounts = new Map();
  for (const repetition of canonical.repetitions ?? []) {
    videoRepCounts.set(
      repetition.videoId,
      (videoRepCounts.get(repetition.videoId) ?? 0) + 1,
    );
  }

  const items = (canonical.repetitions ?? []).map((repetition) => {
    const video = videosById.get(repetition.videoId);
    const assetItem = assetsByIngestId.get(repetition.ingestId);
    const blindability = buildQa(
      overrides,
      repetition.videoId,
      repetition.repetitionId,
    );
    const structuralIssues = buildStructuralIssues(
      repetition,
      video,
      assetItem,
    );
    const decision = resolveBlindabilityStatus(blindability, structuralIssues);
    const studyItemId = `study_${shortHash(
      `${canonical.pilotId}:${repetition.repetitionId}`,
    )}`;

    return {
      studyItemId,
      repetitionId: repetition.repetitionId,
      ingestId: repetition.ingestId,
      videoId: repetition.videoId,
      sourceCorrelationGroup: repetition.videoId,
      actionType: repetition.actionType,
      clip: {
        startSecond: repetition.startSecond,
        endSecond: repetition.endSecond,
        durationSecond: Number(
          (repetition.endSecond - repetition.startSecond).toFixed(3),
        ),
        videoRelativePath: video?.relativePath ?? null,
        videoSha256: video?.sha256 ?? null,
      },
      pose: {
        relativePath: assetItem?.pose?.relativePath ?? null,
        sha256: assetItem?.pose?.sha256 ?? null,
      },
      blindability: {
        visualLabelCue: blindability.visualLabelCue,
        instructionalVisualCue: blindability.instructionalVisualCue,
        targetSubject: blindability.targetSubject,
        timing: blindability.timing,
        movementVisibility: blindability.movementVisibility,
        audioPolicy: blindability.audioPolicy ?? "forced_muted",
        reviewedBy: blindability.reviewedBy ?? null,
        reviewedAt: blindability.reviewedAt ?? null,
        qaMethod: blindability.qaMethod ?? null,
        note: blindability.note ?? "",
        ...decision,
      },
      internalStratification: {
        historicalConsensusScore:
          repetition.humanReviewSummary?.consensusScore ?? null,
        historicalReviewerAgreement:
          repetition.humanReviewSummary?.reviewerAgreement ?? null,
        cameraView: repetition.cameraView ?? "unknown",
        side: repetition.side ?? "unknown",
        sourceVideoRepCount: videoRepCounts.get(repetition.videoId) ?? 0,
        sourceFileNameContainsScoreCue: containsScoreCue(video?.fileName ?? ""),
      },
      blindedReviewItem: {
        studyItemId,
        repetitionId: repetition.repetitionId,
        actionType: repetition.actionType,
        videoPath: video?.relativePath ?? null,
        startSecond: repetition.startSecond,
        endSecond: repetition.endSecond,
        cameraView: repetition.cameraView ?? "unknown",
        side: repetition.side ?? "unknown",
      },
    };
  });

  const actionSummary = Object.fromEntries(
    [...new Set(items.map((item) => item.actionType))]
      .sort()
      .map((actionType) => {
        const actionItems = items.filter(
          (item) => item.actionType === actionType,
        );
        return [
          actionType,
          {
            total: actionItems.length,
            eligible: actionItems.filter(
              (item) => item.blindability.status === "eligible",
            ).length,
            pending: actionItems.filter(
              (item) => item.blindability.status === "pending_visual_qa",
            ).length,
            excluded: actionItems.filter(
              (item) => item.blindability.status === "excluded",
            ).length,
          },
        ];
      }),
  );

  const poolFingerprint = crypto
    .createHash("sha256")
    .update(
      JSON.stringify(
        items.map((item) => ({
          repetitionId: item.repetitionId,
          videoId: item.videoId,
          actionType: item.actionType,
          startSecond: item.clip.startSecond,
          endSecond: item.clip.endSecond,
          videoSha256: item.clip.videoSha256,
          poseSha256: item.pose.sha256,
          status: item.blindability.status,
          exclusionReasons: item.blindability.exclusionReasons,
        })),
      ),
    )
    .digest("hex");

  return {
    schemaVersion: "ai_fms_blindability_manifest_v1",
    builderVersion: BUILDER_VERSION,
    pilotId: canonical.pilotId,
    snapshotSourceDate: canonical.snapshotSourceDate,
    poolFingerprint,
    generatedAt: new Date().toISOString(),
    policy: {
      audio: "forced_muted",
      sourceFileNameVisibleToReviewer: false,
      historicalHumanScoresVisibleToReviewer: false,
      legacyAiSuggestionsVisibleToReviewer: false,
      formalSampleSizeStatus: "not_frozen",
    },
    summary: {
      total: items.length,
      eligible: items.filter((item) => item.blindability.status === "eligible")
        .length,
      pendingVisualQa: items.filter(
        (item) => item.blindability.status === "pending_visual_qa",
      ).length,
      excluded: items.filter((item) => item.blindability.status === "excluded")
        .length,
      actionSummary,
    },
    items,
  };
}

function buildCsv(manifest) {
  const headers = [
    "study_item_id",
    "repetition_id",
    "action_type",
    "video_id",
    "start_second",
    "end_second",
    "status",
    "visual_label_cue",
    "instructional_visual_cue",
    "target_subject",
    "timing",
    "movement_visibility",
    "pending_fields",
    "exclusion_reasons",
    "historical_consensus_score_internal",
    "source_video_rep_count",
    "source_filename_score_cue_internal",
  ];
  const rows = manifest.items.map((item) => [
    item.studyItemId,
    item.repetitionId,
    item.actionType,
    item.videoId,
    item.clip.startSecond,
    item.clip.endSecond,
    item.blindability.status,
    item.blindability.visualLabelCue,
    item.blindability.instructionalVisualCue,
    item.blindability.targetSubject,
    item.blindability.timing,
    item.blindability.movementVisibility,
    (item.blindability.pendingFields ?? []).join("|"),
    item.blindability.exclusionReasons.join("|"),
    item.internalStratification.historicalConsensusScore,
    item.internalStratification.sourceVideoRepCount,
    item.internalStratification.sourceFileNameContainsScoreCue,
  ]);
  return `${[headers, ...rows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n")}\n`;
}

function buildQaReport(manifest) {
  const lines = [
    "# Blindability QA Report",
    "",
    `Generated: ${manifest.generatedAt}`,
    "",
    "## Summary",
    "",
    `- Total reps: ${manifest.summary.total}`,
    `- Eligible: ${manifest.summary.eligible}`,
    `- Pending visual QA: ${manifest.summary.pendingVisualQa}`,
    `- Excluded: ${manifest.summary.excluded}`,
    "",
    "## Actions",
    "",
    "| Action | Total | Eligible | Pending | Excluded |",
    "| --- | ---: | ---: | ---: | ---: |",
  ];

  for (const [actionType, summary] of Object.entries(
    manifest.summary.actionSummary,
  )) {
    lines.push(
      `| ${actionType} | ${summary.total} | ${summary.eligible} | ${summary.pending} | ${summary.excluded} |`,
    );
  }

  lines.push(
    "",
    "Formal study sample size remains unfrozen until pending visual QA reaches zero and action/video balance is reviewed.",
    "",
  );
  return lines.join("\n");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = process.cwd();
  const canonical = readJson(path.resolve(repoRoot, args.canonicalPath));
  const assetManifest = readJson(
    path.resolve(repoRoot, args.assetManifestPath),
  );
  const overrides = readJson(path.resolve(repoRoot, args.overridesPath));
  const outputDir = path.resolve(repoRoot, args.outputDir);
  const manifest = buildBlindabilityManifest({
    canonical,
    assetManifest,
    overrides,
  });

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(
    path.join(outputDir, "blindability-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(outputDir, "blindability-candidates.csv"),
    buildCsv(manifest),
  );
  fs.writeFileSync(
    path.join(outputDir, "blindability-qa-report.md"),
    buildQaReport(manifest),
  );
  process.stdout.write(`${JSON.stringify(manifest.summary, null, 2)}\n`);
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
