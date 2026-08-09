import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { summarizeAslrSegmentPeakEvidence } from "../src/lib/aslr-timing.js";
import { sanitizePosePayload } from "./build-pilot-feature-matrix.js";

const DEFAULTS = {
  canonicalPath: "research/pilot-v1/generated/canonical-pilot.json",
  assetManifestPath: "research/pilot-v1/generated/asset-manifest.json",
  outputDir: "research/pilot-v1/generated/aslr-side-peak-audit",
};

function parseArgs(argv) {
  const options = { ...DEFAULTS };
  const argumentMap = {
    "--canonical": "canonicalPath",
    "--asset-manifest": "assetManifestPath",
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

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function countBy(values) {
  return values.reduce((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function summarizeRows(rows) {
  const uniqueWindows = [
    ...new Map(
      rows.map((row) => [
        `${row.videoId}:${row.startSecond}:${row.endSecond}`,
        row,
      ]),
    ).values(),
  ];

  return {
    repetitions: rows.length,
    uniqueVideos: new Set(rows.map((row) => row.videoId)).size,
    uniqueIngests: new Set(rows.map((row) => row.ingestId)).size,
    uniqueEvidenceWindows: uniqueWindows.length,
    duplicatedEvidenceRows: rows.length - uniqueWindows.length,
    byStatus: countBy(rows.map((row) => row.status)),
    byUniqueWindowStatus: countBy(uniqueWindows.map((row) => row.status)),
    bySegmentSideAgreement: countBy(
      rows.map((row) => row.metrics?.segmentSideAgreement ?? "unavailable"),
    ),
    reasonCounts: countBy(rows.flatMap((row) => row.reasons)),
    uniqueWindowReasonCounts: countBy(
      uniqueWindows.flatMap((row) => row.reasons),
    ),
  };
}

export function buildAslrSidePeakAudit({
  canonical,
  assetManifest,
  repoRoot = process.cwd(),
}) {
  const assetsByIngestId = new Map(
    assetManifest.items.map((item) => [item.ingestId, item]),
  );
  const rows = canonical.repetitions
    .filter(
      (repetition) => repetition.actionType === "active_straight_leg_raise",
    )
    .map((repetition) => {
      const asset = assetsByIngestId.get(repetition.ingestId);
      if (asset?.pose?.status !== "found") {
        throw new Error(`Missing ASLR pose asset for ${repetition.ingestId}`);
      }
      const rawPosePayload = JSON.parse(
        fs.readFileSync(
          path.resolve(repoRoot, asset.pose.relativePath),
          "utf8",
        ),
      );
      const posePayload = sanitizePosePayload(
        rawPosePayload,
        repetition.ingestId,
      );
      const evidence = summarizeAslrSegmentPeakEvidence({
        posePayload,
        segment: {
          startSecond: repetition.startSecond,
          endSecond: repetition.endSecond,
          side: repetition.side ?? "unknown",
        },
      });

      return {
        repetitionId: repetition.repetitionId,
        ingestId: repetition.ingestId,
        videoId: repetition.videoId,
        repetitionIndex: repetition.repetitionIndex,
        startSecond: repetition.startSecond,
        endSecond: repetition.endSecond,
        poseSha256: asset.pose.sha256,
        status: evidence.status,
        reasons: evidence.reasons,
        metrics: evidence.metrics,
        thresholds: evidence.thresholds,
      };
    })
    .sort((left, right) => left.repetitionId.localeCompare(right.repetitionId));

  return {
    schemaVersion: "ai_fms_aslr_side_peak_audit_v1",
    auditVersion: "aslr-side-peak-evidence-v1.0.0",
    pilotId: canonical.pilotId,
    sourceSnapshotDate: canonical.snapshotSourceDate,
    leakagePolicy: {
      sourceFileNameUsed: false,
      historicalScoreUsed: false,
      reviewerResultUsed: false,
      segmentTimingUsed: true,
      segmentSideUsedForAgreementOnly: true,
    },
    interpretationPolicy: {
      changesFrozenRoundABaseline: false,
      changesScoringThresholds: false,
      limitedRowsEligibleForAiScoreComparison: false,
      watchRowsRequireHumanReview: true,
    },
    summary: summarizeRows(rows),
    rowsFingerprint: sha256(JSON.stringify(rows)),
    rows,
  };
}

function buildCsv(audit) {
  const headers = [
    "repetition_id",
    "ingest_id",
    "video_id",
    "repetition_index",
    "start_second",
    "end_second",
    "status",
    "reasons",
    "segment_side",
    "dominant_pose_side",
    "segment_side_agreement",
    "peak_second",
    "peak_pose_side",
    "peak_ankle_above_hip",
    "strong_frame_count",
    "strong_frame_ratio",
    "dominant_side_ratio",
    "side_switch_count",
    "side_switch_rate",
    "pose_sha256",
  ];
  const rows = audit.rows.map((row) => [
    row.repetitionId,
    row.ingestId,
    row.videoId,
    row.repetitionIndex,
    row.startSecond,
    row.endSecond,
    row.status,
    row.reasons.join("|"),
    row.metrics?.segmentSide,
    row.metrics?.dominantPoseSide,
    row.metrics?.segmentSideAgreement,
    row.metrics?.peakSecond,
    row.metrics?.peakPoseSide,
    row.metrics?.peakAnkleAboveHip,
    row.metrics?.strongFrameCount,
    row.metrics?.strongFrameRatio,
    row.metrics?.dominantSideRatio,
    row.metrics?.sideSwitchCount,
    row.metrics?.sideSwitchRate,
    row.poseSha256,
  ]);

  return `${[headers, ...rows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n")}\n`;
}

function buildReport(audit) {
  const status = audit.summary.byUniqueWindowStatus;
  const lines = [
    "# ASLR Active-Side / Peak Evidence Audit",
    "",
    `- Pilot: \`${audit.pilotId}\``,
    `- Repetitions: ${audit.summary.repetitions}`,
    `- Unique videos: ${audit.summary.uniqueVideos}`,
    `- Unique evidence windows: ${audit.summary.uniqueEvidenceWindows}`,
    `- Duplicate evidence rows: ${audit.summary.duplicatedEvidenceRows}`,
    `- Unique-window good / watch / limited: ${status.good ?? 0} / ${status.watch ?? 0} / ${status.limited ?? 0}`,
    `- Rows fingerprint: \`${audit.rowsFingerprint}\``,
    "",
    "## Boundary",
    "",
    "本审计只使用匿名 segment 时间窗、rep-level side metadata 和 pose landmarks。",
    "Source filename、历史分数和 reviewer 结果不进入计算。它不修改 Round A 冻结",
    "baseline，也不移动 ASLR score thresholds。`limited` 表示当前 pose 不能可靠支撑",
    "自动总分比较；`watch` 表示需要人工复核 side/peak evidence。",
    "",
    "## Results",
    "",
    "| Rep | Video | Status | Segment / Pose side | Peak s | Peak raise | Strong frames | Dominance | Switch rate | Reasons |",
    "| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |",
  ];

  for (const row of audit.rows) {
    const metrics = row.metrics ?? {};
    lines.push(
      `| \`${row.repetitionId}\` | \`${row.videoId}\` | ${row.status} | ${metrics.segmentSide ?? "N/A"} / ${metrics.dominantPoseSide ?? "N/A"} | ${metrics.peakSecond ?? "N/A"} | ${metrics.peakAnkleAboveHip ?? "N/A"} | ${metrics.strongFrameCount ?? 0} | ${metrics.dominantSideRatio ?? "N/A"} | ${metrics.sideSwitchRate ?? "N/A"} | ${row.reasons.join(", ") || "none"} |`,
    );
  }

  lines.push(
    "",
    "## Interpretation",
    "",
    "- `sparse_strong_raise_signal`：画面可能清楚，但 target pose 没有形成连续抬腿轨迹；visibility 不能替代 identity/trajectory QA。",
    "- `ambiguous_dominant_pose_side` 或 `unstable_pose_side_labels`：左右 landmark 在关键窗口内不稳定，不应据此自动确定 active side。",
    "- `pose_side_dominance_watch` 或 `pose_side_switch_watch`：仍有可用峰值，但 side evidence 需要 reviewer 确认。",
    "- `segment_side_pose_mismatch`：只有在 pose side 足够稳定时才报告；不自动覆盖人工 metadata。",
    "",
  );
  return lines.join("\n");
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const repoRoot = process.cwd();
  const canonicalRaw = fs.readFileSync(
    path.resolve(repoRoot, options.canonicalPath),
  );
  const assetManifestRaw = fs.readFileSync(
    path.resolve(repoRoot, options.assetManifestPath),
  );
  const audit = buildAslrSidePeakAudit({
    canonical: JSON.parse(canonicalRaw.toString("utf8")),
    assetManifest: JSON.parse(assetManifestRaw.toString("utf8")),
    repoRoot,
  });
  audit.inputs = {
    canonical: {
      path: options.canonicalPath,
      sha256: sha256(canonicalRaw),
    },
    assetManifest: {
      path: options.assetManifestPath,
      sha256: sha256(assetManifestRaw),
    },
  };
  const outputDir = path.resolve(repoRoot, options.outputDir);
  fs.mkdirSync(outputDir, { recursive: true });
  const outputs = {
    "aslr-side-peak-audit.json": `${JSON.stringify(audit, null, 2)}\n`,
    "aslr-side-peak-audit.csv": buildCsv(audit),
    "aslr-side-peak-audit-report.md": buildReport(audit),
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
    `${JSON.stringify({ outputDir, summary: audit.summary }, null, 2)}\n`,
  );
  return audit;
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
