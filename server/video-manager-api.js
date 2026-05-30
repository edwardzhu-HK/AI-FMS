import { spawn, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ACTION_DEFINITIONS,
  ACTION_ORDER,
  buildCandidateMarkdown,
  buildCandidateRegistry,
  buildYtDlpArgs,
  collectDownloadedFiles,
  isDownloadAllowed,
  loadExistingVideoIndex,
  mergeCandidateRegistries,
} from "../scripts/online-video-candidates.js";
import { searchYouTube } from "../scripts/discover-fms-videos.js";
import {
  inferExpectedReps,
  inferScoreHints,
} from "../scripts/inventory-sample-videos.js";

const HOST = process.env.VIDEO_MANAGER_API_HOST ?? "127.0.0.1";
const PORT = Number(process.env.VIDEO_MANAGER_API_PORT ?? 4100);
const REGISTRY_PATH = "Eval_Videos/online-candidates/fms-video-candidates.json";
const REPORT_PATH = "docs/online_fms_video_candidates.md";
const ONLINE_ROOT = "Eval_Videos/Online Candidates";
const SAMPLE_INVENTORY_PATH =
  "Eval_Videos/Sample videos/sample-video-inventory.json";
const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".m4v", ".avi", ".mkv"]);
const jobs = new Map();

function resolveProjectPath(relativePath) {
  return path.resolve(process.cwd(), relativePath);
}

function readJsonIfExists(relativePath, fallback = null) {
  const resolvedPath = resolveProjectPath(relativePath);
  if (!fs.existsSync(resolvedPath)) {
    return fallback;
  }

  return JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
}

function writeJson(relativePath, payload) {
  const resolvedPath = resolveProjectPath(relativePath);
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  fs.writeFileSync(resolvedPath, `${JSON.stringify(payload, null, 2)}\n`);
}

function writeText(relativePath, text) {
  const resolvedPath = resolveProjectPath(relativePath);
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  fs.writeFileSync(resolvedPath, text);
}

function roundNumber(value, digits = 2) {
  if (!Number.isFinite(value)) {
    return null;
  }

  return Number(value.toFixed(digits));
}

function runFfprobe(filePath) {
  const result = spawnSync(
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

  if (result.status !== 0) {
    return {
      probeError: result.stderr || result.error?.message || "ffprobe failed",
    };
  }

  const probe = JSON.parse(result.stdout);
  const videoStream = probe.streams?.find(
    (stream) => stream.codec_type === "video",
  );

  return {
    durationSecond: roundNumber(
      Number(probe.format?.duration) || Number(videoStream?.duration),
    ),
    width: videoStream?.width ?? null,
    height: videoStream?.height ?? null,
    fps: parseFrameRate(videoStream?.avg_frame_rate),
    codec: videoStream?.codec_name ?? null,
    sizeMb: roundNumber(Number(probe.format?.size) / 1024 / 1024),
  };
}

function parseFrameRate(rawValue) {
  if (!rawValue || rawValue === "0/0") {
    return null;
  }

  const [numerator, denominator] = rawValue.split("/").map(Number);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) {
    return null;
  }

  return denominator === 0 ? null : roundNumber(numerator / denominator, 3);
}

function sha256File(filePath) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

function urlPathForFile(relativePath) {
  return `/${relativePath.split(path.sep).map(encodeURIComponent).join("/")}`;
}

function listFiles(rootRelativePath) {
  const root = resolveProjectPath(rootRelativePath);
  if (!fs.existsSync(root)) {
    return [];
  }

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

      files.push(entryPath);
    }
  }

  walk(root);
  return files.sort((left, right) => left.localeCompare(right));
}

function findCandidateByVideoId(registry, sourceVideoId) {
  return registry.candidates?.find(
    (candidate) => candidate.sourceVideoId === sourceVideoId,
  );
}

function buildDownloadedLibraryItems({ actionType, registry }) {
  const definition = ACTION_DEFINITIONS[actionType];
  const root = `${ONLINE_ROOT}/${definition.canonicalDir}`;
  const downloadedCandidates = (registry.candidates ?? []).filter(
    (candidate) =>
      candidate.actionType === actionType &&
      candidate.download?.status === "downloaded" &&
      candidate.managerStatus !== "archived",
  );
  const candidateIdsWithFiles = new Set();
  const items = [];

  for (const candidate of downloadedCandidates) {
    const videoFile = candidate.download.files?.find((file) =>
      VIDEO_EXTENSIONS.has(path.extname(file.path).toLowerCase()),
    );
    if (!videoFile) {
      continue;
    }

    candidateIdsWithFiles.add(candidate.candidateId);
    items.push(
      toLibraryItem({
        kind: "online_download",
        actionType,
        filePath: videoFile.path,
        candidate,
        metadata: videoFile.metadata,
        sizeMb: videoFile.sizeMb,
        sha256: videoFile.sha256,
      }),
    );
  }

  for (const filePath of listFiles(root)) {
    const relativePath = path.relative(process.cwd(), filePath);
    if (!VIDEO_EXTENSIONS.has(path.extname(filePath).toLowerCase())) {
      continue;
    }

    const sourceVideoIdMatch = path
      .basename(filePath)
      .match(/-([A-Za-z0-9_-]{8,})\.[^.]+$/);
    const candidate = sourceVideoIdMatch
      ? findCandidateByVideoId(registry, sourceVideoIdMatch[1])
      : null;

    if (candidate && candidateIdsWithFiles.has(candidate.candidateId)) {
      continue;
    }

    items.push(
      toLibraryItem({
        kind: "online_download",
        actionType,
        filePath: relativePath,
        candidate,
      }),
    );
  }

  return items;
}

function toLibraryItem({
  kind,
  actionType,
  filePath,
  candidate = null,
  metadata = null,
  sizeMb = null,
  sha256 = null,
}) {
  const absolutePath = resolveProjectPath(filePath);
  const stat = fs.existsSync(absolutePath) ? fs.statSync(absolutePath) : null;
  const fileName = path.basename(filePath);
  const probedMetadata =
    metadata ??
    (stat && VIDEO_EXTENSIONS.has(path.extname(filePath).toLowerCase())
      ? runFfprobe(absolutePath)
      : {});

  return {
    id: candidate?.candidateId ?? `${kind}:${filePath}`,
    kind,
    actionType,
    title: candidate?.title ?? path.basename(fileName, path.extname(fileName)),
    fileName,
    path: filePath,
    url: urlPathForFile(filePath),
    sourceUrl: candidate?.url ?? null,
    channelTitle: candidate?.channelTitle ?? "",
    durationSecond: probedMetadata?.durationSecond ?? null,
    width: probedMetadata?.width ?? null,
    height: probedMetadata?.height ?? null,
    fps: probedMetadata?.fps ?? null,
    codec: probedMetadata?.codec ?? null,
    sizeMb: sizeMb ?? (stat ? roundNumber(stat.size / 1024 / 1024) : null),
    sha256: sha256 ?? (stat ? sha256File(absolutePath) : null),
    expectedReps: inferExpectedReps(fileName),
    scoreHints: inferScoreHints(fileName),
    duplicateStatus: candidate?.duplicateStatus ?? null,
    downloadStatus:
      candidate?.download?.status ?? (candidate ? "recorded" : null),
    rightsStatus: candidate?.rightsStatus ?? null,
    reviewStatus: candidate?.managerStatus ?? "active",
    needsReview: buildNeedsReviewBadges({ candidate, fileName }),
  };
}

function buildNeedsReviewBadges({ candidate, fileName }) {
  const badges = [];
  if (!inferExpectedReps(fileName)) {
    badges.push("reps unknown");
  }

  if (inferScoreHints(fileName).length === 0) {
    badges.push("score unknown");
  }

  if (!candidate?.rightsStatus?.includes("confirmed")) {
    badges.push("rights review");
  }

  if (
    candidate?.duplicateStatus === "possible_duplicate" ||
    candidate?.duplicateStatus === "likely_duplicate"
  ) {
    badges.push(candidate.duplicateStatus);
  }

  if (
    candidate?.suitabilityFlags?.includes("reference_or_instruction_candidate")
  ) {
    badges.push("instruction-like");
  }

  return badges;
}

function buildReferenceLibraryItems({ actionType }) {
  const inventory = readJsonIfExists(SAMPLE_INVENTORY_PATH, { items: [] });
  const items = [];

  for (const item of inventory.items ?? []) {
    if (item.actionType !== actionType) {
      continue;
    }

    items.push({
      id: `reference:${item.path}`,
      kind: "existing_reference",
      actionType,
      title: item.fileName,
      fileName: item.fileName,
      path: item.path,
      url: urlPathForFile(item.path),
      sourceUrl: null,
      channelTitle: "",
      durationSecond: item.metadata?.durationSecond ?? null,
      width: item.metadata?.width ?? null,
      height: item.metadata?.height ?? null,
      fps: item.metadata?.fps ?? null,
      codec: item.metadata?.codec ?? null,
      sizeMb: item.metadata?.sizeMb ?? null,
      sha256: null,
      expectedReps: item.expectedReps,
      scoreHints: item.scoreHints ?? [],
      duplicateStatus: null,
      downloadStatus: null,
      rightsStatus: null,
      reviewStatus: item.readiness,
      needsReview: item.flags ?? [],
    });
  }

  return items;
}

function buildVideoLibrary(actionType) {
  const registry = readJsonIfExists(REGISTRY_PATH, {
    candidates: [],
  });
  const downloads = buildDownloadedLibraryItems({ actionType, registry });
  const references = buildReferenceLibraryItems({ actionType });
  const allItems = [...downloads, ...references];

  return {
    actionType,
    displayName: ACTION_DEFINITIONS[actionType].displayName,
    counts: {
      downloaded: downloads.length,
      references: references.length,
      total: allItems.length,
    },
    items: allItems,
  };
}

function buildActionsPayload() {
  const libraries = Object.fromEntries(
    ACTION_ORDER.map((actionType) => [
      actionType,
      buildVideoLibrary(actionType),
    ]),
  );

  return {
    items: ACTION_ORDER.map((actionType) => ({
      id: actionType,
      displayName: ACTION_DEFINITIONS[actionType].displayName,
      counts: libraries[actionType].counts,
    })),
  };
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  });
  response.end(JSON.stringify(payload));
}

function sendError(response, statusCode, message, code = "BAD_REQUEST") {
  sendJson(response, statusCode, {
    error: {
      code,
      message,
    },
  });
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");
  return rawBody ? JSON.parse(rawBody) : {};
}

function createJob(candidateIds) {
  const jobId = `dl_${Date.now()}_${String(jobs.size + 1).padStart(3, "0")}`;
  const job = {
    jobId,
    status: "queued",
    candidateIds,
    progress: 0,
    logs: [],
    startedAt: null,
    completedAt: null,
    error: null,
  };
  jobs.set(jobId, job);
  return job;
}

function appendJobLog(job, line) {
  job.logs.push(line);
  if (job.logs.length > 200) {
    job.logs = job.logs.slice(-200);
  }
}

function runFakeDownload({ job, candidate, outputDir }) {
  fs.mkdirSync(outputDir, { recursive: true });
  const baseName = `${candidate.title.replace(/[/\\?%*:|"<>]/g, "-")}-${candidate.sourceVideoId}`;
  const fakePath = path.join(outputDir, `${baseName}.mp4`);
  fs.writeFileSync(fakePath, "fake video manager download\n");
  appendJobLog(job, `FAKE download written: ${fakePath}`);
}

async function runYtDlp({ job, candidate, outputDir }) {
  await new Promise((resolve, reject) => {
    const child = spawn("yt-dlp", buildYtDlpArgs(candidate, outputDir), {
      stdio: ["ignore", "pipe", "pipe"],
    });

    child.stdout.on("data", (chunk) => appendJobLog(job, chunk.toString()));
    child.stderr.on("data", (chunk) => appendJobLog(job, chunk.toString()));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`yt-dlp exited with code ${code}`));
      }
    });
  });
}

async function processDownloadJob(job) {
  job.status = "running";
  job.startedAt = new Date().toISOString();
  const registry = readJsonIfExists(REGISTRY_PATH, { candidates: [] });

  try {
    let done = 0;
    for (const candidateId of job.candidateIds) {
      const candidate = registry.candidates.find(
        (item) => item.candidateId === candidateId,
      );

      if (!candidate || !isDownloadAllowed(candidate)) {
        appendJobLog(job, `Skipped ${candidateId}: not approved.`);
        done += 1;
        job.progress = done / job.candidateIds.length;
        continue;
      }

      const outputDir = resolveProjectPath(
        `${ONLINE_ROOT}/${ACTION_DEFINITIONS[candidate.actionType].canonicalDir}`,
      );
      fs.mkdirSync(outputDir, { recursive: true });
      appendJobLog(job, `Downloading ${candidate.title}`);

      if (process.env.VIDEO_MANAGER_FAKE_DOWNLOAD === "1") {
        runFakeDownload({ job, candidate, outputDir });
      } else {
        await runYtDlp({ job, candidate, outputDir });
      }

      candidate.download = {
        status: "downloaded",
        downloadedAt: new Date().toISOString(),
        outputDir: path.relative(process.cwd(), outputDir),
        files: collectDownloadedFiles(candidate, outputDir),
      };
      done += 1;
      job.progress = done / job.candidateIds.length;
      writeJson(REGISTRY_PATH, registry);
      writeText(REPORT_PATH, buildCandidateMarkdown(registry));
    }

    job.status = "succeeded";
  } catch (error) {
    job.status = "failed";
    job.error = error.message;
    appendJobLog(job, `ERROR: ${error.message}`);
  } finally {
    job.completedAt = new Date().toISOString();
  }
}

async function handleSearch(body) {
  const actionType = body.actionType;
  if (!ACTION_DEFINITIONS[actionType]) {
    throw new Error("actionType is required");
  }

  const sourceData = await searchYouTube({
    actionTypes: [actionType],
    maxResults: Number(body.maxResults) || 10,
    apiKey: body.apiKey || process.env.YOUTUBE_API_KEY || "",
  });
  const discoveredRegistry = buildCandidateRegistry({
    actionTypes: [actionType],
    searchItemsByAction: sourceData.searchItemsByAction ?? {},
    videoDetailsById: sourceData.videoDetailsById ?? {},
    existingIndex: loadExistingVideoIndex(),
  });
  const existingRegistry = readJsonIfExists(REGISTRY_PATH, { candidates: [] });
  const registry = mergeCandidateRegistries(
    existingRegistry,
    discoveredRegistry,
  );

  writeJson(REGISTRY_PATH, registry);
  writeText(REPORT_PATH, buildCandidateMarkdown(registry));

  const candidates = registry.candidates
    .filter((candidate) => candidate.actionType === actionType)
    .sort(
      (left, right) =>
        (right.recommendation?.score ?? 0) - (left.recommendation?.score ?? 0),
    );

  return {
    actionType,
    candidates,
  };
}

function handleDownloadRequest(body) {
  const registry = readJsonIfExists(REGISTRY_PATH, { candidates: [] });
  const candidateIds = body.candidateIds ?? [];
  const reviewerNotes = body.reviewerNotes ?? "";
  const confirmLikelyDuplicates = Boolean(body.confirmLikelyDuplicates);

  for (const candidateId of candidateIds) {
    const candidate = registry.candidates.find(
      (item) => item.candidateId === candidateId,
    );
    if (!candidate) {
      throw new Error(`candidate not found: ${candidateId}`);
    }

    if (
      candidate.duplicateStatus === "likely_duplicate" &&
      !confirmLikelyDuplicates
    ) {
      throw new Error(`${candidate.title} is a likely duplicate`);
    }

    candidate.rightsStatus = "permission_confirmed";
    candidate.approvedForDownload = true;
    candidate.reviewerNotes = reviewerNotes;
  }

  writeJson(REGISTRY_PATH, registry);
  writeText(REPORT_PATH, buildCandidateMarkdown(registry));

  const job = createJob(candidateIds);
  setTimeout(() => {
    processDownloadJob(job);
  }, 0);

  return job;
}

async function handleRequest(request, response) {
  if (request.method === "OPTIONS") {
    sendJson(response, 200, { ok: true });
    return;
  }

  const requestUrl = new URL(request.url, `http://${HOST}:${PORT}`);
  const route = requestUrl.pathname.split("/").filter(Boolean);

  if (route[0] !== "api" || route[1] !== "video-manager") {
    sendError(response, 404, "route not found", "NOT_FOUND");
    return;
  }

  try {
    if (request.method === "GET" && route[2] === "actions") {
      sendJson(response, 200, buildActionsPayload());
      return;
    }

    if (request.method === "GET" && route[2] === "library") {
      const actionType = requestUrl.searchParams.get("actionType");
      if (!ACTION_DEFINITIONS[actionType]) {
        sendError(response, 400, "invalid actionType", "INVALID_ARGUMENT");
        return;
      }

      sendJson(response, 200, buildVideoLibrary(actionType));
      return;
    }

    if (request.method === "GET" && route[2] === "status") {
      sendJson(response, 200, {
        apiKeyConfigured: Boolean(process.env.YOUTUBE_API_KEY),
        ytDlpAvailable: spawnSync("yt-dlp", ["--version"]).status === 0,
      });
      return;
    }

    if (request.method === "POST" && route[2] === "search") {
      sendJson(response, 200, await handleSearch(await readJsonBody(request)));
      return;
    }

    if (request.method === "POST" && route[2] === "downloads") {
      sendJson(
        response,
        202,
        handleDownloadRequest(await readJsonBody(request)),
      );
      return;
    }

    if (request.method === "GET" && route[2] === "downloads" && route[3]) {
      const job = jobs.get(route[3]);
      if (!job) {
        sendError(response, 404, "download job not found", "NOT_FOUND");
        return;
      }

      sendJson(response, 200, job);
      return;
    }

    if (request.method === "POST" && route[2] === "refresh") {
      sendJson(response, 200, buildActionsPayload());
      return;
    }

    sendError(response, 404, "route not found", "NOT_FOUND");
  } catch (error) {
    sendError(response, 500, error.message, "INTERNAL");
  }
}

function createVideoManagerServer() {
  return http.createServer(handleRequest);
}

export {
  buildActionsPayload,
  buildVideoLibrary,
  createVideoManagerServer,
  handleDownloadRequest,
  handleSearch,
};

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
const currentPath = fileURLToPath(import.meta.url);

if (entryPath === currentPath) {
  createVideoManagerServer().listen(PORT, HOST, () => {
    console.log(`FMS Video Manager API listening on http://${HOST}:${PORT}`);
  });
}
