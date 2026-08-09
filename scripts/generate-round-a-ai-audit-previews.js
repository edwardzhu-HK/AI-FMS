import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULTS = {
  analysisPath:
    "research/pilot-v1/generated/round-a-ai-evidence/round-a-ai-consensus-analysis.json",
  manifestPath: "research/pilot-v1/generated/blindability-manifest.json",
  outputDir: "research/pilot-v1/generated/round-a-ai-audit-previews",
  frameCount: 5,
  force: false,
};

function parseArgs(argv) {
  const options = { ...DEFAULTS };
  const argumentMap = {
    "--analysis": "analysisPath",
    "--manifest": "manifestPath",
    "--output-dir": "outputDir",
    "--frame-count": "frameCount",
  };

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--force") {
      options.force = true;
      continue;
    }
    const key = argumentMap[argv[index]];
    if (!key || !argv[index + 1]) {
      throw new Error(`Unknown or incomplete argument: ${argv[index]}`);
    }
    options[key] =
      key === "frameCount" ? Number(argv[index + 1]) : argv[index + 1];
    index += 1;
  }

  if (!Number.isInteger(options.frameCount) || options.frameCount < 3) {
    throw new Error("frame-count must be an integer of at least 3");
  }
  return options;
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `${command} failed (${result.status}): ${result.stderr || result.stdout}`,
    );
  }
}

export function sampleTimes(startSecond, endSecond, frameCount) {
  const duration = endSecond - startSecond;
  const inset = Math.min(0.2, Math.max(0.04, duration * 0.04));
  const usableStart = startSecond + inset;
  const usableEnd = endSecond - inset;
  return Array.from({ length: frameCount }, (_value, index) =>
    Number(
      (
        usableStart +
        ((usableEnd - usableStart) * index) / Math.max(1, frameCount - 1)
      ).toFixed(3),
    ),
  );
}

function buildStrip({ videoPath, times, outputPath, repoRoot }) {
  const inputArgs = times.flatMap((second) => [
    "-ss",
    String(second),
    "-i",
    videoPath,
  ]);
  const panels = times.map(
    (_second, index) =>
      `[${index}:v]scale=480:360:force_original_aspect_ratio=decrease,pad=480:360:(ow-iw)/2:(oh-ih)/2:black[v${index}]`,
  );
  const streams = times.map((_second, index) => `[v${index}]`).join("");
  const filter = `${panels.join(";")};${streams}hstack=inputs=${times.length}[out]`;
  run(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      ...inputArgs,
      "-filter_complex",
      filter,
      "-map",
      "[out]",
      "-frames:v",
      "1",
      "-q:v",
      "2",
      outputPath,
    ],
    repoRoot,
  );
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const repoRoot = process.cwd();
  const analysis = JSON.parse(
    fs.readFileSync(path.resolve(repoRoot, options.analysisPath), "utf8"),
  );
  const manifest = JSON.parse(
    fs.readFileSync(path.resolve(repoRoot, options.manifestPath), "utf8"),
  );
  const manifestByRepetition = new Map(
    manifest.items.map((item) => [item.repetitionId, item]),
  );
  const outputDir = path.resolve(repoRoot, options.outputDir);
  fs.mkdirSync(outputDir, { recursive: true });

  const followUps = analysis.analysis.followUpQueue.filter(
    (row) => row.priority !== "expected_boundary",
  );
  const rows = followUps.map((followUp, index) => {
    const item = manifestByRepetition.get(followUp.repetitionId);
    if (!item) {
      throw new Error(`Manifest item is missing ${followUp.repetitionId}`);
    }
    const times = sampleTimes(
      item.clip.startSecond,
      item.clip.endSecond,
      options.frameCount,
    );
    const imageName = `${String(index + 1).padStart(2, "0")}-${followUp.repetitionId}.jpg`;
    const outputPath = path.join(outputDir, imageName);
    if (options.force || !fs.existsSync(outputPath)) {
      buildStrip({
        videoPath: path.resolve(repoRoot, item.clip.videoRelativePath),
        times,
        outputPath,
        repoRoot,
      });
    }
    process.stdout.write(`[${index + 1}/${followUps.length}] ${imageName}\n`);
    return {
      ...followUp,
      studyItemId: item.studyItemId,
      sampledSeconds: times,
      imagePath: imageName,
      poseAvailable: Boolean(item.pose?.relativePath),
    };
  });

  const indexPayload = {
    schemaVersion: "ai_fms_round_a_ai_audit_previews_v1",
    generatedAt: new Date().toISOString(),
    sourceAnalysisPath: options.analysisPath,
    sourceManifestPath: options.manifestPath,
    frameCount: options.frameCount,
    rows,
  };
  fs.writeFileSync(
    path.join(outputDir, "index.json"),
    `${JSON.stringify(indexPayload, null, 2)}\n`,
  );
  process.stdout.write(
    `${JSON.stringify({ outputDir, repetitions: rows.length }, null, 2)}\n`,
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
