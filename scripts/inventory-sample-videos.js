import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SAMPLE_ROOT = "Eval_Videos/Sample videos";
const INVENTORY_JSON = "Eval_Videos/Sample videos/sample-video-inventory.json";
const INVENTORY_MD = "docs/sample_video_inventory.md";
const DRAFT_MANIFEST_DIR = "Eval_Videos/Sample videos/manifests";
const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".m4v", ".avi", ".mkv"]);

const ACTION_FOLDERS = {
  "1-Squat": {
    actionType: "deep_squat",
    displayName: "Deep Squat",
    canonicalDir: "01-Deep Squat",
  },
  "2-Hurdle step": {
    actionType: "hurdle_step",
    displayName: "Hurdle Step",
    canonicalDir: "02-Hurdle Step",
  },
  "3-Inline Lunge": {
    actionType: "in_line_lunge",
    displayName: "In-Line Lunge",
    canonicalDir: "03-In-Line Lunge",
  },
  "4-shoulder mobility": {
    actionType: "shoulder_mobility",
    displayName: "Shoulder Mobility",
    canonicalDir: "04-Shoulder Mobility",
  },
  "5-ASLR": {
    actionType: "active_straight_leg_raise",
    displayName: "Active Straight Leg Raise",
    canonicalDir: "05-Active Straight Leg Raise",
  },
  "6-trunk stability push up": {
    actionType: "trunk_stability_push_up",
    displayName: "Trunk Stability Push-Up",
    canonicalDir: "06-Trunk Stability Push-Up",
  },
  "7-rotatory stability": {
    actionType: "rotary_stability",
    displayName: "Rotary Stability",
    canonicalDir: "07-Rotary Stability",
  },
};

const ACTION_ORDER = Object.values(ACTION_FOLDERS).map(
  (action) => action.actionType,
);

function parseArgs(argv) {
  const args = {
    sourceRoot: SAMPLE_ROOT,
    jsonOutput: INVENTORY_JSON,
    markdownOutput: INVENTORY_MD,
    draftManifestDir: DRAFT_MANIFEST_DIR,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];

    if (token === "--source-root" && argv[i + 1]) {
      args.sourceRoot = argv[i + 1];
      i += 1;
      continue;
    }

    if (token === "--json-output" && argv[i + 1]) {
      args.jsonOutput = argv[i + 1];
      i += 1;
      continue;
    }

    if (token === "--markdown-output" && argv[i + 1]) {
      args.markdownOutput = argv[i + 1];
      i += 1;
      continue;
    }

    if (token === "--draft-manifest-dir" && argv[i + 1]) {
      args.draftManifestDir = argv[i + 1];
      i += 1;
    }
  }

  return args;
}

function listVideoFiles(root) {
  const resolvedRoot = path.resolve(process.cwd(), root);
  const files = [];

  function walk(currentDir) {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) {
        continue;
      }

      const entryPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath);
        continue;
      }

      if (VIDEO_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        files.push(entryPath);
      }
    }
  }

  walk(resolvedRoot);
  return files.sort((a, b) => a.localeCompare(b));
}

function runFfprobe(filePath) {
  try {
    const output = execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-print_format",
        "json",
        "-show_format",
        "-show_streams",
        filePath,
      ],
      { encoding: "utf8" },
    );
    return JSON.parse(output);
  } catch (error) {
    return {
      error: error.message,
    };
  }
}

function parseFrameRate(rawValue) {
  if (!rawValue || rawValue === "0/0") {
    return null;
  }

  const [numerator, denominator] = rawValue.split("/").map(Number);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) {
    return null;
  }

  if (denominator === 0) {
    return null;
  }

  return Number((numerator / denominator).toFixed(3));
}

function roundNumber(value, digits = 2) {
  if (!Number.isFinite(value)) {
    return null;
  }

  return Number(value.toFixed(digits));
}

function getVideoMetadata(filePath) {
  const probe = runFfprobe(filePath);

  if (probe.error) {
    return {
      probeError: probe.error,
    };
  }

  const videoStream = probe.streams?.find(
    (stream) => stream.codec_type === "video",
  );
  const duration =
    Number(probe.format?.duration) || Number(videoStream?.duration) || null;
  const stats = fs.statSync(filePath);

  return {
    durationSecond: roundNumber(duration, 2),
    width: videoStream?.width ?? null,
    height: videoStream?.height ?? null,
    fps: parseFrameRate(videoStream?.avg_frame_rate),
    codec: videoStream?.codec_name ?? null,
    sizeMb: roundNumber(stats.size / 1024 / 1024, 2),
  };
}

function inferExpectedReps(fileName) {
  const totalMatch = fileName.match(/\btotal\s*(\d+)\s*reps?\b/i);
  if (totalMatch) {
    return Number(totalMatch[1]);
  }

  const matches = [
    ...fileName.matchAll(/\b(\d+)\s*(?:\([^)]+\)\s*)?reps?\b/gi),
  ];

  if (matches.length === 0) {
    return null;
  }

  if (matches.length > 1 && /\b(first|then|last|second)\b/i.test(fileName)) {
    return matches.reduce((total, match) => total + Number(match[1]), 0);
  }

  return Number(matches[0][1]);
}

function inferScoreHints(fileName) {
  return [...fileName.matchAll(/\bscore\s*(\d)\b/gi)].map((match) =>
    Number(match[1]),
  );
}

function inferSideHints(fileName) {
  const normalized = fileName.toLowerCase();
  const hints = [];

  if (normalized.includes("left")) {
    hints.push("left");
  }

  if (normalized.includes("right")) {
    hints.push("right");
  }

  if (normalized.includes("both side") || normalized.includes("each side")) {
    hints.push("bilateral");
  }

  return [...new Set(hints)];
}

function inferActionFromFileName(fileName) {
  const normalized = fileName.toLowerCase();

  if (normalized.includes("squat")) {
    return "deep_squat";
  }

  if (normalized.includes("hurdle")) {
    return "hurdle_step";
  }

  if (normalized.includes("lunge")) {
    return "in_line_lunge";
  }

  if (normalized.includes("shoulder")) {
    return "shoulder_mobility";
  }

  if (
    normalized.includes("aslr") ||
    normalized.includes("straight leg raise") ||
    normalized.includes("slr")
  ) {
    return "active_straight_leg_raise";
  }

  if (
    normalized.includes("trunk stability") ||
    normalized.includes("torso stability") ||
    normalized.includes("push up") ||
    normalized.includes("push-up")
  ) {
    return "trunk_stability_push_up";
  }

  if (
    normalized.includes("rotary stability") ||
    normalized.includes("rotatory stability")
  ) {
    return "rotary_stability";
  }

  return null;
}

function inferQualityFlags({ fileName, folderAction, metadata }) {
  const flags = [];
  const normalized = fileName.toLowerCase();
  const inferredAction = inferActionFromFileName(fileName);
  const expectedReps = inferExpectedReps(fileName);
  const scoreHints = inferScoreHints(fileName);

  if (inferredAction && inferredAction !== folderAction) {
    flags.push(`filename_action_mismatch:${inferredAction}`);
  }

  if (
    normalized.includes("videoplayback") ||
    normalized.includes("instruction") ||
    normalized.includes("demonstrates") ||
    /^fms\s/i.test(fileName)
  ) {
    flags.push("external_or_instruction_candidate");
  }

  if (!expectedReps) {
    flags.push("missing_reps_hint");
  }

  if (scoreHints.length === 0) {
    flags.push("missing_score_hint");
  }

  if (metadata.probeError) {
    flags.push("ffprobe_error");
  }

  if (metadata.durationSecond !== null && metadata.durationSecond < 2) {
    flags.push("too_short");
  }

  if (metadata.width !== null && metadata.width < 640) {
    flags.push("low_resolution");
  }

  return flags;
}

function classifyReadiness(flags, expectedReps, scoreHints) {
  if (
    flags.some(
      (flag) =>
        flag.startsWith("filename_action_mismatch") ||
        flag === "external_or_instruction_candidate" ||
        flag === "ffprobe_error",
    )
  ) {
    return "review_only";
  }

  if (expectedReps && scoreHints.length > 0) {
    return "manifest_candidate";
  }

  if (expectedReps) {
    return "needs_score_review";
  }

  return "needs_manual_review";
}

function buildInventory(sourceRoot) {
  const resolvedRoot = path.resolve(process.cwd(), sourceRoot);
  const items = listVideoFiles(sourceRoot).map((filePath) => {
    const relativePath = path.relative(process.cwd(), filePath);
    const relativeToRoot = path.relative(resolvedRoot, filePath);
    const [folderName] = relativeToRoot.split(path.sep);
    const folderConfig = ACTION_FOLDERS[folderName] ?? {
      actionType: "unknown",
      displayName: folderName,
      canonicalDir: "",
    };
    const fileName = path.basename(filePath);
    const metadata = getVideoMetadata(filePath);
    const expectedReps = inferExpectedReps(fileName);
    const scoreHints = inferScoreHints(fileName);
    const flags = inferQualityFlags({
      fileName,
      folderAction: folderConfig.actionType,
      metadata,
    });

    return {
      path: relativePath,
      sourceRelativePath: relativeToRoot.split(path.sep).join("/"),
      folderName,
      actionType: folderConfig.actionType,
      displayName: folderConfig.displayName,
      canonicalDir: folderConfig.canonicalDir,
      fileName,
      expectedReps,
      scoreHints,
      sideHints: inferSideHints(fileName),
      readiness: classifyReadiness(flags, expectedReps, scoreHints),
      flags,
      metadata,
    };
  });

  const actionSummaries = {};
  for (const item of items) {
    const key = item.actionType;
    actionSummaries[key] = actionSummaries[key] ?? {
      actionType: item.actionType,
      displayName: item.displayName,
      canonicalDir: item.canonicalDir,
      totalVideos: 0,
      manifestCandidates: 0,
      needsReview: 0,
      reviewOnly: 0,
      totalDurationSecond: 0,
    };

    const summary = actionSummaries[key];
    summary.totalVideos += 1;
    summary.totalDurationSecond += item.metadata.durationSecond ?? 0;

    if (item.readiness === "manifest_candidate") {
      summary.manifestCandidates += 1;
    } else if (item.readiness === "review_only") {
      summary.reviewOnly += 1;
    } else {
      summary.needsReview += 1;
    }
  }

  for (const summary of Object.values(actionSummaries)) {
    summary.totalDurationSecond = roundNumber(summary.totalDurationSecond, 2);
  }

  return {
    generatedAt: new Date().toISOString(),
    sourceRoot,
    totalVideos: items.length,
    actionSummaries,
    draftManifestPolicy:
      "Includes manifest_candidate and needs_score_review samples with inferred expected reps. Excludes review_only and needs_manual_review samples.",
    items,
  };
}

function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) {
    return "N/A";
  }

  return `${seconds.toFixed(1)}s`;
}

function formatResolution(metadata) {
  if (!metadata.width || !metadata.height) {
    return "N/A";
  }

  return `${metadata.width}x${metadata.height}`;
}

function formatList(values) {
  if (!values || values.length === 0) {
    return "-";
  }

  return values.join("; ");
}

function buildMarkdown(inventory) {
  const orderedSummaries = Object.values(inventory.actionSummaries).sort(
    (left, right) => {
      const leftIndex = ACTION_ORDER.indexOf(left.actionType);
      const rightIndex = ACTION_ORDER.indexOf(right.actionType);
      return leftIndex - rightIndex;
    },
  );
  const flaggedItems = inventory.items.filter((item) => item.flags.length > 0);
  const rows = [
    "# AI-FMS Sample Video Inventory",
    "",
    `日期：${inventory.generatedAt.slice(0, 10)}`,
    "",
    "用途：这份库存记录浩然目前收集到的 7 个 FMS 动作 sample videos，用于后续 manifest 接入、demo 测试、pose pipeline 试跑和样本质量评估。它不是最终 dataset card，也不代表所有视频已经可用于训练。",
    "",
    "## 总览",
    "",
    `- Source root: \`${inventory.sourceRoot}\``,
    `- Total videos: ${inventory.totalVideos}`,
    "- Readiness 解释：`manifest_candidate` 表示文件名里已有 reps 和 score 线索，可优先进入 manifest 草稿；`needs_score_review` / `needs_manual_review` 需要人工补评分、次数或视角；`review_only` 更像教程/外部参考或疑似放错动作目录，暂不建议直接进正式 manifest。",
    "",
    "| Action | Videos | Manifest candidates | Needs review | Review only | Total duration |",
    "| --- | ---: | ---: | ---: | ---: | ---: |",
    ...orderedSummaries.map(
      (summary) =>
        `| ${summary.displayName} | ${summary.totalVideos} | ${summary.manifestCandidates} | ${summary.needsReview} | ${summary.reviewOnly} | ${formatDuration(summary.totalDurationSecond)} |`,
    ),
    "",
    "## 需要人工注意的样本",
    "",
  ];

  if (flaggedItems.length === 0) {
    rows.push("- 暂无自动检测到的明显问题。");
  } else {
    for (const item of flaggedItems) {
      rows.push(
        `- \`${item.path}\`: ${formatList(item.flags)}; readiness=${item.readiness}`,
      );
    }
  }

  rows.push(
    "",
    "## Draft Manifests",
    "",
    "库存脚本会在 `Eval_Videos/Sample videos/manifests/` 生成每个动作的草稿 manifest。草稿只纳入 `manifest_candidate` 和 `needs_score_review` 样本；`review_only` 和缺 reps 的样本暂不进入。",
    "",
    "| Action | Draft rows | Draft manifest |",
    "| --- | ---: | --- |",
    ...orderedSummaries.map((summary) => {
      const draftRows = inventory.items.filter(
        (item) =>
          item.actionType === summary.actionType &&
          isDraftManifestRowCandidate(item),
      );
      const manifestPath =
        draftRows.length > 0
          ? `Eval_Videos/Sample videos/manifests/${summary.actionType}.sample-manifest.csv`
          : "-";
      return `| ${summary.displayName} | ${draftRows.length} | ${manifestPath === "-" ? "-" : `\`${manifestPath}\``} |`;
    }),
    "",
    "## 明细",
    "",
    "| Action | File | Reps | Score hints | Side hints | Duration | Resolution | FPS | Readiness | Flags |",
    "| --- | --- | ---: | --- | --- | ---: | --- | ---: | --- | --- |",
  );

  for (const item of inventory.items) {
    rows.push(
      `| ${item.displayName} | \`${item.fileName}\` | ${item.expectedReps ?? "-"} | ${formatList(item.scoreHints)} | ${formatList(item.sideHints)} | ${formatDuration(item.metadata.durationSecond)} | ${formatResolution(item.metadata)} | ${item.metadata.fps ?? "-"} | ${item.readiness} | ${formatList(item.flags)} |`,
    );
  }

  rows.push(
    "",
    "## 下一步建议",
    "",
    "1. 先从每个动作挑 2-3 个 `manifest_candidate` 或 `needs_score_review` 样本做正式 manifest 草稿。",
    "2. 对 `review_only` 样本做人工判断：教程型视频可以做参考，不直接进入 Ronnie 的 small dataset。",
    "3. Shoulder Mobility 目录中出现 Active SLR 文件名线索的样本，需要人工确认是否放错目录。",
    "4. 接入正式 manifest 前，补齐 camera view、side、expected reps、score notes 和 consent/privacy 状态。",
    "5. Deep Squat 之外的动作先用于 annotation workflow 测试；pose features 只在视频视角质量足够时逐步扩展。",
    "",
  );

  return `${rows.join("\n")}\n`;
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

function isDraftManifestRowCandidate(item) {
  return (
    (item.readiness === "manifest_candidate" ||
      item.readiness === "needs_score_review") &&
    Number.isInteger(item.expectedReps) &&
    item.expectedReps > 0
  );
}

function buildManifestNotes(item) {
  const parts = [
    `inventory_readiness=${item.readiness}`,
    `source=${item.fileName}`,
  ];

  if (item.scoreHints.length > 0) {
    parts.push(`score_hints=${item.scoreHints.join("/")}`);
  }

  if (item.sideHints.length > 0) {
    parts.push(`side_hints=${item.sideHints.join("/")}`);
  }

  if (item.flags.length > 0) {
    parts.push(`flags=${item.flags.join("/")}`);
  }

  return parts.join("; ");
}

function buildDraftManifestRows(inventory) {
  const rowsByAction = {};

  for (const item of inventory.items) {
    if (!isDraftManifestRowCandidate(item)) {
      continue;
    }

    rowsByAction[item.actionType] = rowsByAction[item.actionType] ?? [];
    rowsByAction[item.actionType].push({
      fileName: item.sourceRelativePath,
      startSecond: 0,
      endSecond: item.metadata.durationSecond,
      expectedReps: item.expectedReps,
      notes: buildManifestNotes(item),
    });
  }

  return rowsByAction;
}

function writeDraftManifests(inventory, draftManifestDir) {
  const rowsByAction = buildDraftManifestRows(inventory);
  const outputDir = path.resolve(process.cwd(), draftManifestDir);
  fs.mkdirSync(outputDir, { recursive: true });

  for (const [actionType, rows] of Object.entries(rowsByAction)) {
    if (rows.length === 0) {
      continue;
    }

    const lines = [
      "file_name,start_second,end_second,expected_reps,notes",
      ...rows.map((row) =>
        [
          row.fileName,
          row.startSecond,
          row.endSecond,
          row.expectedReps,
          row.notes,
        ]
          .map(csvEscape)
          .join(","),
      ),
    ];
    fs.writeFileSync(
      path.join(outputDir, `${actionType}.sample-manifest.csv`),
      `${lines.join("\n")}\n`,
    );
  }
}

function writeInventory({
  inventory,
  jsonOutput,
  markdownOutput,
  draftManifestDir,
}) {
  fs.mkdirSync(path.dirname(path.resolve(process.cwd(), jsonOutput)), {
    recursive: true,
  });
  fs.mkdirSync(path.dirname(path.resolve(process.cwd(), markdownOutput)), {
    recursive: true,
  });

  fs.writeFileSync(jsonOutput, `${JSON.stringify(inventory, null, 2)}\n`);
  fs.writeFileSync(markdownOutput, buildMarkdown(inventory));
  writeDraftManifests(inventory, draftManifestDir);
}

export {
  buildInventory,
  buildMarkdown,
  classifyReadiness,
  buildDraftManifestRows,
  inferExpectedReps,
  inferQualityFlags,
  inferScoreHints,
};

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
const currentPath = fileURLToPath(import.meta.url);

if (entryPath === currentPath) {
  const args = parseArgs(process.argv.slice(2));
  const inventory = buildInventory(args.sourceRoot);
  writeInventory({
    inventory,
    jsonOutput: args.jsonOutput,
    markdownOutput: args.markdownOutput,
    draftManifestDir: args.draftManifestDir,
  });
  console.log(`Inventory written: ${args.jsonOutput}`);
  console.log(`Report written: ${args.markdownOutput}`);
  console.log(`Draft manifests written: ${args.draftManifestDir}`);
}
