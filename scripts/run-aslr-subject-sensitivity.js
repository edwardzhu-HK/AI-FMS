import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { summarizeAslrSegmentPeakEvidence } from "../src/lib/aslr-timing.js";

const DEFAULT_CONFIG = "research/pilot-v1/aslr-subject-sensitivity.json";

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function countBy(values) {
  return values.reduce((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function parseArgs(argv) {
  const options = {
    configPath: DEFAULT_CONFIG,
    execute: false,
    force: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--config" && argv[index + 1]) {
      options.configPath = argv[++index];
    } else if (token === "--execute") {
      options.execute = true;
    } else if (token === "--force") {
      options.force = true;
    } else {
      throw new Error(`Unknown or incomplete argument: ${token}`);
    }
  }

  return options;
}

function assertUnique(items, key, label) {
  const values = items.map((item) => item[key]);
  if (new Set(values).size !== values.length) {
    throw new Error(`${label} must be unique by ${key}.`);
  }
}

function poseEvidenceFingerprint(payload) {
  return sha256(
    JSON.stringify({
      sourceVideo: {
        videoId: payload.sourceVideo?.videoId,
        actionType: payload.sourceVideo?.actionType,
        processedStartSecond: payload.sourceVideo?.processedStartSecond,
        processedEndSecond: payload.sourceVideo?.processedEndSecond,
      },
      poseModel: {
        name: payload.poseModel?.name,
        modelVariant: payload.poseModel?.modelVariant,
        numPoses: payload.poseModel?.numPoses,
      },
      subjectSelection: payload.subjectSelection,
      sampling: payload.sampling,
      frames: payload.frames,
    }),
  );
}

function buildExtractionCommand(config, extraction) {
  const args = [
    "scripts/extract-pose-landmarks.py",
    "--video",
    extraction.videoPath,
    "--model",
    config.modelPath,
    "--output",
    extraction.outputPath,
    "--video-id",
    extraction.videoId,
    "--action-type",
    "active_straight_leg_raise",
    "--start-second",
    String(extraction.startSecond),
    "--end-second",
    String(extraction.endSecond),
    "--target-fps",
    String(extraction.targetFps),
    "--num-poses",
    String(extraction.numPoses),
    "--primary-pose-selection",
    extraction.primaryPoseSelection,
  ];

  if (extraction.subjectRoi) {
    args.push("--subject-roi", extraction.subjectRoi);
  }
  if (extraction.inferenceRoi) {
    args.push("--inference-roi", extraction.inferenceRoi);
  }

  return { executable: config.pythonExecutable, args };
}

function validatePosePayload(payload, extraction) {
  if (payload.sourceVideo?.videoId !== extraction.videoId) {
    throw new Error(`Pose videoId mismatch for ${extraction.extractionId}.`);
  }
  if (payload.sourceVideo?.actionType !== "active_straight_leg_raise") {
    throw new Error(`Pose action mismatch for ${extraction.extractionId}.`);
  }
  if (
    payload.sourceVideo?.processedStartSecond > extraction.startSecond ||
    payload.sourceVideo?.processedEndSecond < extraction.endSecond
  ) {
    throw new Error(
      `Pose time range is incomplete for ${extraction.extractionId}.`,
    );
  }
}

export function buildAslrSubjectSensitivity({
  config,
  baselineAudit,
  posePayloadsByExtractionId,
  sourceChecksumsByExtractionId = new Map(),
  modelSha256 = null,
}) {
  assertUnique(config.extractions, "extractionId", "Extractions");
  assertUnique(
    config.reextractedWindows,
    "repetitionId",
    "Sensitivity windows",
  );
  assertUnique(
    config.manualWatchReviews,
    "repetitionId",
    "Manual watch reviews",
  );

  const baselineByRep = new Map(
    baselineAudit.rows.map((row) => [row.repetitionId, row]),
  );
  const extractionsById = new Map(
    config.extractions.map((item) => [item.extractionId, item]),
  );
  const evidenceByExtractionId = {};

  for (const extraction of config.extractions) {
    const payload = posePayloadsByExtractionId.get(extraction.extractionId);
    if (!payload) {
      throw new Error(`Missing pose payload for ${extraction.extractionId}.`);
    }
    validatePosePayload(payload, extraction);
    const sourceChecksum = sourceChecksumsByExtractionId.get(
      extraction.extractionId,
    );
    if (
      sourceChecksum != null &&
      sourceChecksum !== extraction.sourceVideoSha256
    ) {
      throw new Error(
        `Source video checksum mismatch for ${extraction.extractionId}.`,
      );
    }
    evidenceByExtractionId[extraction.extractionId] = {
      videoId: extraction.videoId,
      sourceVideoSha256: extraction.sourceVideoSha256,
      poseEvidenceFingerprint: poseEvidenceFingerprint(payload),
      modelSha256,
      processedFrames: payload.quality?.processedFrames ?? null,
      framesWithPose: payload.quality?.framesWithPose ?? null,
      missingFramesRatio: payload.quality?.missingFramesRatio ?? null,
      subjectSelection: payload.subjectSelection,
      sourceChecksumVerified:
        sourceChecksum == null
          ? null
          : sourceChecksum === extraction.sourceVideoSha256,
    };
  }

  const rows = config.reextractedWindows.map((window) => {
    const baseline = baselineByRep.get(window.repetitionId);
    if (!baseline) {
      throw new Error(`Missing baseline row for ${window.repetitionId}.`);
    }
    if (baseline.status !== "limited") {
      throw new Error(
        `Sensitivity source is not limited: ${window.repetitionId}.`,
      );
    }
    const extraction = extractionsById.get(window.extractionId);
    if (!extraction) {
      throw new Error(`Unknown extraction: ${window.extractionId}.`);
    }
    const posePayload = posePayloadsByExtractionId.get(window.extractionId);
    const sensitivity = summarizeAslrSegmentPeakEvidence({
      posePayload,
      segment: {
        startSecond: window.startSecond,
        endSecond: window.endSecond,
        side: window.segmentSide,
      },
    });

    return {
      repetitionId: window.repetitionId,
      videoId: baseline.videoId,
      extractionId: window.extractionId,
      startSecond: window.startSecond,
      endSecond: window.endSecond,
      baseline: {
        status: baseline.status,
        reasons: baseline.reasons,
        metrics: baseline.metrics,
      },
      sensitivity,
      transition: `${baseline.status}_to_${sensitivity.status}`,
    };
  });

  const manualWatchReviews = config.manualWatchReviews.map((review) => {
    const baseline = baselineByRep.get(review.repetitionId);
    if (!baseline) {
      throw new Error(`Missing watch row for ${review.repetitionId}.`);
    }
    if (baseline.status !== "watch") {
      throw new Error(
        `Manual review source is not watch: ${review.repetitionId}.`,
      );
    }
    return {
      ...review,
      baselineStatus: baseline.status,
      baselineReasons: baseline.reasons,
      peakSecond: baseline.metrics?.peakSecond ?? null,
      peakPoseSide: baseline.metrics?.peakPoseSide ?? null,
      segmentSide: baseline.metrics?.segmentSide ?? null,
    };
  });

  const sensitivityStatuses = rows.map((row) => row.sensitivity.status);
  return {
    schemaVersion: "ai_fms_aslr_subject_sensitivity_v1",
    sensitivityId: config.sensitivityId,
    baseline: {
      auditVersion: baselineAudit.auditVersion,
      rowsFingerprint: baselineAudit.rowsFingerprint,
      uniqueWindowStatus: baselineAudit.summary.byUniqueWindowStatus,
    },
    policy: config.policy,
    summary: {
      reextractedUniqueWindows: rows.length,
      baselineLimitedWindows: rows.filter(
        (row) => row.baseline.status === "limited",
      ).length,
      sensitivityStatus: countBy(sensitivityStatuses),
      noLongerLimited: rows.filter(
        (row) => row.sensitivity.status !== "limited",
      ).length,
      manualWatchReviews: manualWatchReviews.length,
      scoringThresholdsChanged: false,
      frozenEvidenceChanged: false,
    },
    evidenceByExtractionId,
    rows,
    manualWatchReviews,
    rowsFingerprint: sha256(JSON.stringify(rows)),
  };
}

function buildCsv(result) {
  const headers = [
    "repetition_id",
    "video_id",
    "extraction_id",
    "baseline_status",
    "sensitivity_status",
    "transition",
    "sensitivity_reasons",
    "dominant_pose_side",
    "segment_side_agreement",
    "strong_frame_count",
    "dominant_side_ratio",
    "side_switch_rate",
  ];
  const rows = result.rows.map((row) => [
    row.repetitionId,
    row.videoId,
    row.extractionId,
    row.baseline.status,
    row.sensitivity.status,
    row.transition,
    row.sensitivity.reasons.join("|"),
    row.sensitivity.metrics?.dominantPoseSide,
    row.sensitivity.metrics?.segmentSideAgreement,
    row.sensitivity.metrics?.strongFrameCount,
    row.sensitivity.metrics?.dominantSideRatio,
    row.sensitivity.metrics?.sideSwitchRate,
  ]);
  return `${[headers, ...rows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n")}\n`;
}

function buildReport(result) {
  const statuses = result.summary.sensitivityStatus;
  const lines = [
    "# ASLR Subject-Aware Pose Sensitivity",
    "",
    `- Sensitivity ID: \`${result.sensitivityId}\``,
    `- Re-extracted windows: ${result.summary.reextractedUniqueWindows}`,
    `- Baseline limited windows: ${result.summary.baselineLimitedWindows}`,
    `- Sensitivity good / watch / limited: ${statuses.good ?? 0} / ${statuses.watch ?? 0} / ${statuses.limited ?? 0}`,
    `- Manual review of existing watch windows: ${result.summary.manualWatchReviews}`,
    `- Rows fingerprint: \`${result.rowsFingerprint}\``,
    "",
    "## Boundary",
    "",
    "本结果是独立 sensitivity layer。它不覆盖 Round A、Round B、原始 pose、",
    "feature matrix 或 AI v1.0 evidence，也不读取历史分数或 reviewer score 来选择",
    "受试者。ROI 只根据画面中的受试者位置和遮挡关系确定。",
    "",
    "## Re-extracted Windows",
    "",
    "| Rep | Baseline | Sensitivity | Pose side / segment | Strong frames | Dominance | Switch rate | Reasons |",
    "| --- | --- | --- | --- | ---: | ---: | ---: | --- |",
  ];

  for (const row of result.rows) {
    const metrics = row.sensitivity.metrics ?? {};
    lines.push(
      `| \`${row.repetitionId}\` | ${row.baseline.status} | ${row.sensitivity.status} | ${metrics.dominantPoseSide ?? "N/A"} / ${metrics.segmentSide ?? "N/A"} | ${metrics.strongFrameCount ?? 0} | ${metrics.dominantSideRatio ?? "N/A"} | ${metrics.sideSwitchRate ?? "N/A"} | ${row.sensitivity.reasons.join(", ") || "none"} |`,
    );
  }

  lines.push(
    "",
    "## Existing Watch Windows",
    "",
    "| Rep | Disposition | Visual QA | Eligible use |",
    "| --- | --- | --- | --- |",
  );
  for (const review of result.manualWatchReviews) {
    lines.push(
      `| \`${review.repetitionId}\` | ${review.disposition} | ${review.visualFinding} | ${review.eligibleUse} |`,
    );
  }
  lines.push(
    "",
    "## Interpretation",
    "",
    "- 三个原 `limited` 窗口均不再处于 `limited`，说明主要问题来自 subject selection / crop，而不是动作完全没有 pose 信号。",
    "- `watch` 仍表示需要保留质量标志；本结果不能用来调分或回写冻结 evidence。",
    "- 下一步只有在独立视频上验证稳定后，才考虑把 subject-aware extraction 纳入未来 feature pipeline。",
    "",
  );
  return lines.join("\n");
}

function executeExtractions(config, repoRoot, force) {
  for (const [index, extraction] of config.extractions.entries()) {
    const outputPath = path.resolve(repoRoot, extraction.outputPath);
    if (fs.existsSync(outputPath) && !force) {
      process.stdout.write(
        `[${index + 1}/${config.extractions.length}] reuse ${extraction.extractionId}\n`,
      );
      continue;
    }
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    const command = buildExtractionCommand(config, extraction);
    process.stdout.write(
      `[${index + 1}/${config.extractions.length}] extract ${extraction.extractionId}\n`,
    );
    const result = spawnSync(command.executable, command.args, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: "inherit",
    });
    if (result.error) {
      throw result.error;
    }
    if (result.status !== 0) {
      throw new Error(
        `Pose extraction failed for ${extraction.extractionId} with exit code ${result.status}.`,
      );
    }
  }
}

function sourceChecksum(extraction, repoRoot) {
  const raw = fs.readFileSync(path.resolve(repoRoot, extraction.videoPath));
  return sha256(raw);
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const repoRoot = process.cwd();
  const configRaw = fs.readFileSync(path.resolve(repoRoot, options.configPath));
  const config = JSON.parse(configRaw.toString("utf8"));
  const baselineRaw = fs.readFileSync(
    path.resolve(repoRoot, config.baselineAuditPath),
  );
  const baselineAudit = JSON.parse(baselineRaw.toString("utf8"));

  if (options.execute) {
    executeExtractions(config, repoRoot, options.force);
  }

  const posePayloadsByExtractionId = new Map();
  const sourceChecksumsByExtractionId = new Map();
  for (const extraction of config.extractions) {
    const posePath = path.resolve(repoRoot, extraction.outputPath);
    if (!fs.existsSync(posePath)) {
      throw new Error(
        `Missing ${extraction.outputPath}. Run with --execute first.`,
      );
    }
    posePayloadsByExtractionId.set(extraction.extractionId, readJson(posePath));
    sourceChecksumsByExtractionId.set(
      extraction.extractionId,
      sourceChecksum(extraction, repoRoot),
    );
  }
  const modelRaw = fs.readFileSync(path.resolve(repoRoot, config.modelPath));
  const modelSha256 = sha256(modelRaw);
  if (config.modelSha256 && config.modelSha256 !== modelSha256) {
    throw new Error(
      `Pose model checksum mismatch: expected ${config.modelSha256}, received ${modelSha256}.`,
    );
  }
  const result = buildAslrSubjectSensitivity({
    config,
    baselineAudit,
    posePayloadsByExtractionId,
    sourceChecksumsByExtractionId,
    modelSha256,
  });
  result.inputs = {
    config: { path: options.configPath, sha256: sha256(configRaw) },
    baselineAudit: {
      path: config.baselineAuditPath,
      sha256: sha256(baselineRaw),
    },
    model: { path: config.modelPath, sha256: modelSha256 },
  };

  const outputDir = path.resolve(repoRoot, config.outputDir);
  fs.mkdirSync(outputDir, { recursive: true });
  const outputs = {
    "aslr-subject-sensitivity.json": `${JSON.stringify(result, null, 2)}\n`,
    "aslr-subject-sensitivity.csv": buildCsv(result),
    "aslr-subject-sensitivity-report.md": buildReport(result),
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
    `${JSON.stringify({ outputDir, summary: result.summary }, null, 2)}\n`,
  );
  return result;
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
