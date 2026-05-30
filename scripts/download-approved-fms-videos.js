import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ACTION_DEFINITIONS,
  buildYtDlpArgs,
  collectDownloadedFiles,
  selectApprovedCandidates,
} from "./online-video-candidates.js";

const DEFAULT_REGISTRY =
  "Eval_Videos/online-candidates/fms-video-candidates.json";
const DEFAULT_OUTPUT_ROOT = "Eval_Videos/Online Candidates";

function parseArgs(argv) {
  const args = {
    registry: DEFAULT_REGISTRY,
    outputRoot: DEFAULT_OUTPUT_ROOT,
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];

    if (token === "--registry" && argv[i + 1]) {
      args.registry = argv[i + 1];
      i += 1;
      continue;
    }

    if (token === "--output-root" && argv[i + 1]) {
      args.outputRoot = argv[i + 1];
      i += 1;
      continue;
    }

    if (token === "--dry-run") {
      args.dryRun = true;
    }
  }

  return args;
}

function readRegistry(registryPath) {
  const resolvedPath = path.resolve(process.cwd(), registryPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`candidate registry not found: ${resolvedPath}`);
  }

  return JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
}

function assertYtDlpAvailable() {
  const result = spawnSync("yt-dlp", ["--version"], {
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(
      "yt-dlp is not available. Install it separately, then rerun the download command.",
    );
  }
}

function getCandidateOutputDir(candidate, outputRoot) {
  const actionDir =
    ACTION_DEFINITIONS[candidate.actionType]?.canonicalDir ??
    candidate.actionType;
  return path.resolve(process.cwd(), outputRoot, actionDir);
}

function writeRegistry(registryPath, registry) {
  fs.writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
}

function downloadApprovedFmsVideos(args) {
  const registry = readRegistry(args.registry);
  const approvedCandidates = selectApprovedCandidates(registry);

  if (approvedCandidates.length === 0) {
    console.log(
      "No approved candidates to download. Set approvedForDownload=true and a confirmed rightsStatus first.",
    );
    return {
      downloaded: 0,
      skipped: registry.candidates.length,
    };
  }

  if (!args.dryRun) {
    assertYtDlpAvailable();
  }

  let downloaded = 0;
  for (const candidate of approvedCandidates) {
    const outputDir = getCandidateOutputDir(candidate, args.outputRoot);
    const ytDlpArgs = buildYtDlpArgs(candidate, outputDir);

    if (args.dryRun) {
      console.log(`DRY RUN: yt-dlp ${ytDlpArgs.join(" ")}`);
      continue;
    }

    fs.mkdirSync(outputDir, { recursive: true });
    execFileSync("yt-dlp", ytDlpArgs, { stdio: "inherit" });
    candidate.download = {
      status: "downloaded",
      downloadedAt: new Date().toISOString(),
      outputDir: path.relative(process.cwd(), outputDir),
      files: collectDownloadedFiles(candidate, outputDir),
    };
    downloaded += 1;
  }

  if (!args.dryRun) {
    writeRegistry(args.registry, registry);
  }

  return {
    downloaded,
    skipped: registry.candidates.length - approvedCandidates.length,
  };
}

export {
  downloadApprovedFmsVideos,
  getCandidateOutputDir,
  parseArgs,
  readRegistry,
};

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
const currentPath = fileURLToPath(import.meta.url);

if (entryPath === currentPath) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const result = downloadApprovedFmsVideos(args);
    console.log(`Downloaded: ${result.downloaded}`);
    console.log(`Skipped: ${result.skipped}`);
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exitCode = 1;
  }
}
