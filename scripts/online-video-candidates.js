import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".m4v", ".avi", ".mkv"]);

const ACTION_DEFINITIONS = {
  deep_squat: {
    displayName: "Deep Squat",
    canonicalDir: "01-Deep Squat",
    sampleFolder: "1-Squat",
    queries: [
      "Functional Movement Screen Deep Squat test",
      "FMS Deep Squat score demonstration",
    ],
  },
  hurdle_step: {
    displayName: "Hurdle Step",
    canonicalDir: "02-Hurdle Step",
    sampleFolder: "2-Hurdle step",
    queries: [
      "Functional Movement Screen Hurdle Step test",
      "FMS Hurdle Step score demonstration",
    ],
  },
  in_line_lunge: {
    displayName: "In-Line Lunge",
    canonicalDir: "03-In-Line Lunge",
    sampleFolder: "3-Inline Lunge",
    queries: [
      "Functional Movement Screen In-Line Lunge test",
      "FMS Inline Lunge score demonstration",
    ],
  },
  shoulder_mobility: {
    displayName: "Shoulder Mobility",
    canonicalDir: "04-Shoulder Mobility",
    sampleFolder: "4-shoulder mobility",
    queries: [
      "Functional Movement Screen Shoulder Mobility test",
      "FMS Shoulder Mobility score demonstration",
    ],
  },
  active_straight_leg_raise: {
    displayName: "Active Straight Leg Raise",
    canonicalDir: "05-Active Straight Leg Raise",
    sampleFolder: "5-ASLR",
    queries: [
      "Functional Movement Screen Active Straight Leg Raise test",
      "FMS ASLR score demonstration",
    ],
  },
  trunk_stability_push_up: {
    displayName: "Trunk Stability Push-Up",
    canonicalDir: "06-Trunk Stability Push-Up",
    sampleFolder: "6-trunk stability push up",
    queries: [
      "Functional Movement Screen Trunk Stability Push Up test",
      "FMS Trunk Stability Push-Up score demonstration",
    ],
  },
  rotary_stability: {
    displayName: "Rotary Stability",
    canonicalDir: "07-Rotary Stability",
    sampleFolder: "7-rotatory stability",
    queries: [
      "Functional Movement Screen Rotary Stability test",
      "FMS Rotary Stability score demonstration",
      "FMS rotatory stability assessment",
    ],
  },
};

const ACTION_ORDER = Object.keys(ACTION_DEFINITIONS);

const DOWNLOADABLE_RIGHTS = new Set([
  "permission_confirmed",
  "owned_by_project",
  "creative_commons_confirmed",
  "public_domain_confirmed",
  "platform_download_permitted",
]);

const DUPLICATE_SCORE_DELTA = {
  new_candidate: 18,
  possible_duplicate: -12,
  likely_duplicate: -28,
};

const FLAG_SCORE_DELTA = {
  reference_or_instruction_candidate: -14,
  long_reference_video: -10,
  missing_duration: -8,
  too_short: -20,
  fms_reference: 4,
};

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&amp;/g, "and")
    .replace(/\bfunctional movement screen\b/g, "fms")
    .replace(/\bfunction movement screen\b/g, "fms")
    .replace(/\bassessment\b/g, "test")
    .replace(/\bpush-up\b/g, "push up")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeFileTitle(fileName) {
  return normalizeText(path.basename(fileName, path.extname(fileName)))
    .replace(/\bvideoplayback\b/g, "")
    .replace(/\s+\d+$/g, "")
    .trim();
}

function parseIsoDuration(value) {
  if (!value) {
    return null;
  }

  const match = String(value).match(
    /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/,
  );

  if (!match) {
    return null;
  }

  const [, days, hours, minutes, seconds] = match;
  const total =
    Number(days ?? 0) * 86400 +
    Number(hours ?? 0) * 3600 +
    Number(minutes ?? 0) * 60 +
    Number(seconds ?? 0);

  return Number.isFinite(total) ? Number(total.toFixed(2)) : null;
}

function roundNumber(value, digits = 2) {
  if (!Number.isFinite(value)) {
    return null;
  }

  return Number(value.toFixed(digits));
}

function getActionTypes(action) {
  if (action === "all") {
    return ACTION_ORDER;
  }

  if (!ACTION_DEFINITIONS[action]) {
    throw new Error(`unknown action type: ${action}`);
  }

  return [action];
}

function inferActionFromPath(filePath) {
  const normalizedPath = filePath.split(path.sep).join("/");

  for (const [actionType, definition] of Object.entries(ACTION_DEFINITIONS)) {
    if (
      normalizedPath.includes(`/${definition.canonicalDir}/`) ||
      normalizedPath.includes(`/${definition.sampleFolder}/`)
    ) {
      return actionType;
    }
  }

  return "unknown";
}

function walkVideoFiles(root) {
  const resolvedRoot = path.resolve(process.cwd(), root);
  if (!fs.existsSync(resolvedRoot)) {
    return [];
  }

  const files = [];

  function walk(currentDir) {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || entry.name === "pose") {
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

function readJsonIfExists(filePath) {
  const resolvedPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolvedPath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
}

function loadExistingVideoIndex({
  evalRoot = "Eval_Videos",
  sampleInventoryPath = "Eval_Videos/Sample videos/sample-video-inventory.json",
  sampleInventory = null,
} = {}) {
  const itemsByPath = new Map();
  const inventory = sampleInventory ?? readJsonIfExists(sampleInventoryPath);

  for (const item of inventory?.items ?? []) {
    itemsByPath.set(item.path, {
      path: item.path,
      fileName: item.fileName,
      actionType: item.actionType,
      titleKey: normalizeFileTitle(item.fileName),
      durationSecond: item.metadata?.durationSecond ?? null,
      source: "sample_inventory",
    });
  }

  for (const filePath of walkVideoFiles(evalRoot)) {
    const relativePath = path.relative(process.cwd(), filePath);
    if (relativePath.includes("Online Candidates")) {
      continue;
    }

    if (!itemsByPath.has(relativePath)) {
      itemsByPath.set(relativePath, {
        path: relativePath,
        fileName: path.basename(filePath),
        actionType: inferActionFromPath(filePath),
        titleKey: normalizeFileTitle(filePath),
        durationSecond: null,
        source: "local_video_file",
      });
    }
  }

  return [...itemsByPath.values()].filter((item) => item.titleKey.length > 0);
}

function titleLooksSimilar(leftKey, rightKey) {
  if (!leftKey || !rightKey) {
    return false;
  }

  if (leftKey === rightKey) {
    return true;
  }

  const shorter = leftKey.length < rightKey.length ? leftKey : rightKey;
  const longer = leftKey.length < rightKey.length ? rightKey : leftKey;

  return shorter.length >= 10 && longer.includes(shorter);
}

function durationLooksSimilar(left, right) {
  if (!Number.isFinite(left) || !Number.isFinite(right)) {
    return false;
  }

  return Math.abs(left - right) <= 3;
}

function evaluateDuplicateStatus(candidate, existingIndex) {
  const matches = [];

  for (const existing of existingIndex) {
    if (
      existing.actionType !== "unknown" &&
      existing.actionType !== candidate.actionType
    ) {
      continue;
    }

    if (!titleLooksSimilar(candidate.titleKey, existing.titleKey)) {
      continue;
    }

    const durationMatch = durationLooksSimilar(
      candidate.durationSecond,
      existing.durationSecond,
    );

    matches.push({
      path: existing.path,
      actionType: existing.actionType,
      matchType: durationMatch ? "title_and_duration" : "title",
      durationSecond: existing.durationSecond,
    });
  }

  const hasStrongMatch = matches.some(
    (match) => match.matchType === "title_and_duration",
  );

  return {
    duplicateStatus:
      matches.length === 0
        ? "new_candidate"
        : hasStrongMatch
          ? "likely_duplicate"
          : "possible_duplicate",
    duplicateMatches: matches.slice(0, 5),
  };
}

function inferSuitabilityFlags(candidate) {
  const flags = [];
  const key = normalizeText(
    `${candidate.title} ${candidate.description} ${candidate.channelTitle}`,
  );

  if (!candidate.durationSecond) {
    flags.push("missing_duration");
  } else if (candidate.durationSecond < 3) {
    flags.push("too_short");
  } else if (candidate.durationSecond > 600) {
    flags.push("long_reference_video");
  }

  if (
    /\b(instruction|instructions|explained|webinar|course|lecture|podcast|interview|discussion|break down|breaking down)\b/.test(
      key,
    )
  ) {
    flags.push("reference_or_instruction_candidate");
  }

  if (/\bfunctionalmovement|functional movement systems|fms\b/.test(key)) {
    flags.push("fms_reference");
  }

  for (const [actionType, definition] of Object.entries(ACTION_DEFINITIONS)) {
    if (actionType === candidate.actionType) {
      continue;
    }

    const actionKey = normalizeText(definition.displayName);
    if (actionKey && key.includes(actionKey)) {
      flags.push(`possible_action_mismatch:${actionType}`);
      break;
    }
  }

  return [...new Set(flags)];
}

function inferRightsStatus(videoDetail = {}) {
  if (videoDetail.status?.license === "creativeCommon") {
    return "creative_commons_review";
  }

  return "needs_rights_review";
}

function getThumbnail(snippet = {}) {
  const thumbnails = snippet.thumbnails ?? {};
  return (
    thumbnails.maxres?.url ??
    thumbnails.standard?.url ??
    thumbnails.high?.url ??
    thumbnails.medium?.url ??
    thumbnails.default?.url ??
    null
  );
}

function buildCandidate({ actionType, searchItem, videoDetail = {} }) {
  const videoId =
    searchItem.id?.videoId ?? searchItem.videoId ?? videoDetail.id ?? null;
  const snippet = videoDetail.snippet ?? searchItem.snippet ?? {};
  const durationSecond =
    videoDetail.durationSecond ??
    parseIsoDuration(videoDetail.contentDetails?.duration);
  const title = snippet.title ?? "";

  return {
    candidateId: `youtube_${actionType}_${videoId}`,
    sourcePlatform: "youtube",
    sourceVideoId: videoId,
    actionType,
    actionDisplayName: ACTION_DEFINITIONS[actionType].displayName,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    title,
    titleKey: normalizeText(title),
    description: snippet.description ?? "",
    channelTitle: snippet.channelTitle ?? "",
    channelId: snippet.channelId ?? "",
    publishedAt: snippet.publishedAt ?? null,
    thumbnail: getThumbnail(snippet),
    durationSecond,
    definition: videoDetail.contentDetails?.definition ?? null,
    viewCount: videoDetail.statistics?.viewCount
      ? Number(videoDetail.statistics.viewCount)
      : null,
    likeCount: videoDetail.statistics?.likeCount
      ? Number(videoDetail.statistics.likeCount)
      : null,
    rightsStatus: inferRightsStatus(videoDetail),
    approvedForDownload: false,
    reviewerNotes: "",
  };
}

function scoreCandidateRecommendation(candidate) {
  const reasons = [];
  let score = 50;
  const actionLabel = normalizeText(
    ACTION_DEFINITIONS[candidate.actionType]?.displayName ?? "",
  );
  const titleKey = normalizeText(candidate.title);

  if (actionLabel && titleKey.includes(actionLabel)) {
    score += 18;
    reasons.push("Title names the selected FMS movement.");
  } else {
    reasons.push("Title does not exactly name the selected movement.");
  }

  const duplicateDelta = DUPLICATE_SCORE_DELTA[candidate.duplicateStatus] ?? 0;
  score += duplicateDelta;
  reasons.push(
    candidate.duplicateStatus === "new_candidate"
      ? "No local duplicate detected."
      : `Duplicate risk: ${candidate.duplicateStatus}.`,
  );

  if (Number.isFinite(candidate.durationSecond)) {
    if (candidate.durationSecond >= 8 && candidate.durationSecond <= 180) {
      score += 12;
      reasons.push("Duration looks suitable for a raw movement sample.");
    } else if (candidate.durationSecond > 180 && candidate.durationSecond <= 600) {
      score -= 4;
      reasons.push("Longer video; likely needs manual trimming.");
    } else {
      score -= 12;
      reasons.push("Duration is outside the ideal sample range.");
    }
  } else {
    score -= 8;
    reasons.push("Duration metadata is missing.");
  }

  if (candidate.definition === "hd") {
    score += 8;
    reasons.push("YouTube metadata reports HD video.");
  }

  for (const flag of candidate.suitabilityFlags ?? []) {
    if (flag.startsWith("possible_action_mismatch")) {
      score -= 22;
      reasons.push("May mention a different FMS movement.");
      continue;
    }

    score += FLAG_SCORE_DELTA[flag] ?? -2;
    if (flag === "reference_or_instruction_candidate") {
      reasons.push("Looks more like instruction/reference than a raw sample.");
    } else if (flag === "fms_reference") {
      reasons.push("FMS-specific source/title language.");
    } else {
      reasons.push(`Flagged: ${flag}.`);
    }
  }

  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));
  return {
    score: normalizedScore,
    label:
      normalizedScore >= 75
        ? "high"
        : normalizedScore >= 55
          ? "medium"
          : "low",
    reasons: [...new Set(reasons)].slice(0, 5),
  };
}

function mergeCandidateRegistries(existingRegistry, discoveredRegistry) {
  const merged = new Map();

  for (const candidate of existingRegistry?.candidates ?? []) {
    merged.set(candidate.candidateId, candidate);
  }

  for (const candidate of discoveredRegistry.candidates) {
    const previous = merged.get(candidate.candidateId);
    const mergedCandidate = {
      ...candidate,
      managerStatus: previous?.managerStatus ?? candidate.managerStatus,
      approvedForDownload: previous?.approvedForDownload ?? false,
      rightsStatus: previous?.rightsStatus ?? candidate.rightsStatus,
      reviewerNotes: previous?.reviewerNotes ?? "",
      download: previous?.download,
    };
    mergedCandidate.recommendation =
      scoreCandidateRecommendation(mergedCandidate);
    merged.set(candidate.candidateId, mergedCandidate);
  }

  return {
    ...discoveredRegistry,
    candidates: [...merged.values()].sort((left, right) =>
      left.candidateId.localeCompare(right.candidateId),
    ),
  };
}

function buildCandidateRegistry({
  actionTypes,
  searchItemsByAction,
  videoDetailsById = {},
  existingIndex = [],
  generatedAt = new Date().toISOString(),
}) {
  const candidatesById = new Map();

  for (const actionType of actionTypes) {
    for (const searchItem of searchItemsByAction[actionType] ?? []) {
      const videoId = searchItem.id?.videoId ?? searchItem.videoId;
      if (!videoId) {
        continue;
      }

      const candidate = buildCandidate({
        actionType,
        searchItem,
        videoDetail: videoDetailsById[videoId] ?? {},
      });
      const duplicate = evaluateDuplicateStatus(candidate, existingIndex);
      candidate.duplicateStatus = duplicate.duplicateStatus;
      candidate.duplicateMatches = duplicate.duplicateMatches;
      candidate.suitabilityFlags = inferSuitabilityFlags(candidate);
      candidate.recommendation = scoreCandidateRecommendation(candidate);
      candidatesById.set(candidate.candidateId, candidate);
    }
  }

  return {
    schemaVersion: "ai_fms_online_video_candidates_v1",
    generatedAt,
    discoveryPolicy:
      "Discovery stores metadata and duplicate checks only. Download requires reviewer approval and confirmed rights.",
    candidates: [...candidatesById.values()].sort((left, right) =>
      left.candidateId.localeCompare(right.candidateId),
    ),
  };
}

function summarizeRegistry(registry) {
  const summary = {};

  for (const actionType of ACTION_ORDER) {
    summary[actionType] = {
      actionType,
      displayName: ACTION_DEFINITIONS[actionType].displayName,
      total: 0,
      newCandidates: 0,
      possibleDuplicates: 0,
      likelyDuplicates: 0,
      approvedForDownload: 0,
    };
  }

  for (const candidate of registry.candidates) {
    const item =
      summary[candidate.actionType] ??
      (summary[candidate.actionType] = {
        actionType: candidate.actionType,
        displayName: candidate.actionType,
        total: 0,
        newCandidates: 0,
        possibleDuplicates: 0,
        likelyDuplicates: 0,
        approvedForDownload: 0,
      });

    item.total += 1;
    if (candidate.duplicateStatus === "new_candidate") {
      item.newCandidates += 1;
    } else if (candidate.duplicateStatus === "possible_duplicate") {
      item.possibleDuplicates += 1;
    } else if (candidate.duplicateStatus === "likely_duplicate") {
      item.likelyDuplicates += 1;
    }

    if (candidate.approvedForDownload) {
      item.approvedForDownload += 1;
    }
  }

  return Object.values(summary).filter((item) => item.total > 0);
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) {
    return "-";
  }

  return `${roundNumber(seconds, 1)}s`;
}

function formatList(values) {
  if (!values || values.length === 0) {
    return "-";
  }

  return values.join("; ");
}

function buildCandidateMarkdown(registry) {
  const rows = [
    "# AI-FMS Online Video Candidates",
    "",
    `日期：${registry.generatedAt.slice(0, 10)}`,
    "",
    "用途：这份清单只记录 online FMS video 候选、来源元数据、与本地已有视频的重复检查和人工审核状态。它不是正式 dataset，也不会自动进入 movement manifest。",
    "",
    "## 使用边界",
    "",
    "- 默认只保存 URL 和元数据，不下载视频文件。",
    "- 只有 `approvedForDownload=true` 且 `rightsStatus` 为已确认可下载状态时，下载脚本才会处理。",
    "- 下载后的文件先进入 `Eval_Videos/Online Candidates/` 隔离区，仍需人工确认质量、授权、动作、评分和次数后才能写入 canonical manifest。",
    "",
    "## 总览",
    "",
    "| Action | Candidates | New | Possible duplicate | Likely duplicate | Approved |",
    "| --- | ---: | ---: | ---: | ---: | ---: |",
    ...summarizeRegistry(registry).map(
      (item) =>
        `| ${item.displayName} | ${item.total} | ${item.newCandidates} | ${item.possibleDuplicates} | ${item.likelyDuplicates} | ${item.approvedForDownload} |`,
    ),
    "",
    "## 明细",
    "",
    "| Action | Title | Channel | Duration | Duplicate | Rights | Approved | Flags | URL |",
    "| --- | --- | --- | ---: | --- | --- | --- | --- | --- |",
  ];

  for (const candidate of registry.candidates) {
    rows.push(
      `| ${candidate.actionDisplayName} | ${candidate.title.replaceAll("|", "\\|")} | ${candidate.channelTitle.replaceAll("|", "\\|")} | ${formatDuration(candidate.durationSecond)} | ${candidate.duplicateStatus} | ${candidate.rightsStatus} | ${candidate.approvedForDownload ? "yes" : "no"} | ${formatList(candidate.suitabilityFlags)} | ${candidate.url} |`,
    );
  }

  rows.push(
    "",
    "## 审核说明",
    "",
    "1. 优先看 `new_candidate`，再人工判断是否确实是单人 FMS movement sample，而不是教程/课程/讨论视频。",
    "2. `likely_duplicate` 默认不要下载；`possible_duplicate` 需要和本地视频画面核对。",
    "3. 如确认可以下载，把 JSON 中该条候选改为 `approvedForDownload: true`，并把 `rightsStatus` 改成 `permission_confirmed`、`owned_by_project`、`creative_commons_confirmed`、`public_domain_confirmed` 或 `platform_download_permitted`。",
    "4. 下载完成后仍需跑本地 inventory/manifest 校验，再决定是否进入正式 movement manifest。",
    "",
  );

  return `${rows.join("\n")}\n`;
}

function isDownloadAllowed(candidate) {
  return (
    candidate.approvedForDownload === true &&
    DOWNLOADABLE_RIGHTS.has(candidate.rightsStatus)
  );
}

function selectApprovedCandidates(registry) {
  return registry.candidates.filter(isDownloadAllowed);
}

function buildYtDlpArgs(candidate, outputDir) {
  return [
    "--no-playlist",
    "--write-info-json",
    "--write-thumbnail",
    "--convert-thumbnails",
    "jpg",
    "--merge-output-format",
    "mp4",
    "-P",
    outputDir,
    "-o",
    "%(title).180B-%(id)s.%(ext)s",
    candidate.url,
  ];
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
    const probe = JSON.parse(output);
    const videoStream = probe.streams?.find(
      (stream) => stream.codec_type === "video",
    );
    return {
      durationSecond: roundNumber(
        Number(probe.format?.duration) || Number(videoStream?.duration),
      ),
      width: videoStream?.width ?? null,
      height: videoStream?.height ?? null,
      codec: videoStream?.codec_name ?? null,
    };
  } catch (error) {
    return {
      probeError: error.message,
    };
  }
}

function sha256File(filePath) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

function collectDownloadedFiles(candidate, outputDir) {
  if (!fs.existsSync(outputDir)) {
    return [];
  }

  return fs
    .readdirSync(outputDir)
    .filter((fileName) => fileName.includes(candidate.sourceVideoId))
    .sort()
    .map((fileName) => {
      const filePath = path.join(outputDir, fileName);
      const stat = fs.statSync(filePath);
      const ext = path.extname(fileName).toLowerCase();
      return {
        path: path.relative(process.cwd(), filePath),
        sizeMb: roundNumber(stat.size / 1024 / 1024),
        sha256: stat.isFile() ? sha256File(filePath) : null,
        metadata: VIDEO_EXTENSIONS.has(ext) ? runFfprobe(filePath) : null,
      };
    });
}

export {
  ACTION_DEFINITIONS,
  ACTION_ORDER,
  DOWNLOADABLE_RIGHTS,
  buildCandidateMarkdown,
  buildCandidateRegistry,
  buildYtDlpArgs,
  collectDownloadedFiles,
  getActionTypes,
  isDownloadAllowed,
  loadExistingVideoIndex,
  mergeCandidateRegistries,
  normalizeText,
  parseIsoDuration,
  scoreCandidateRecommendation,
  selectApprovedCandidates,
  summarizeRegistry,
};
