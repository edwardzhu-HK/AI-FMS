import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const args = {
    manifestPath: "research/pilot-v1/generated/asset-manifest.json",
    overridesPath: "research/pilot-v1/pose-extraction-overrides.json",
    outputPath: "research/pilot-v1/generated/pose-extraction-plan.json",
    execute: false,
    includeSubjectQa: false,
    force: false,
    actions: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const value = argv[index + 1];

    if (token === "--manifest" && value) {
      args.manifestPath = value;
      index += 1;
    } else if (token === "--overrides" && value) {
      args.overridesPath = value;
      index += 1;
    } else if (token === "--output" && value) {
      args.outputPath = value;
      index += 1;
    } else if (token === "--actions" && value) {
      args.actions = new Set(value.split(",").filter(Boolean));
      index += 1;
    } else if (token === "--execute") {
      args.execute = true;
    } else if (token === "--include-subject-qa") {
      args.includeSubjectQa = true;
    } else if (token === "--force") {
      args.force = true;
    }
  }

  return args;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function buildSettings(item, overrides) {
  return {
    ...overrides.defaults,
    ...(overrides.actionDefaults?.[item.actionType] ?? {}),
    ...(overrides.poseFileOverrides?.[item.pose.requestedFileName] ?? {}),
  };
}

function buildCommand(item) {
  const args = [
    "scripts/extract-pose-landmarks.py",
    "--video",
    item.videoPath,
    "--model",
    "models/pose_landmarker_lite.task",
    "--output",
    item.outputPath,
    "--video-id",
    item.videoId,
    "--action-type",
    item.actionType,
    "--start-second",
    String(item.startSecond),
    "--end-second",
    String(item.endSecond),
    "--target-fps",
    String(item.targetFps),
    "--delegate",
    item.delegate,
    "--num-poses",
    String(item.numPoses),
    "--primary-pose-selection",
    item.primaryPoseSelection,
  ];

  if (item.subjectRoi) {
    args.push("--subject-roi", item.subjectRoi);
  }
  if (item.inferenceRoi) {
    args.push("--inference-roi", item.inferenceRoi);
  }

  return {
    executable: ".venv/bin/python",
    args,
  };
}

export function createPoseExtractionPlan({ manifest, overrides, repoRoot }) {
  const grouped = new Map();

  for (const sourceItem of manifest.items ?? []) {
    if (
      sourceItem.pose.status === "found" ||
      !sourceItem.pose.requestedFileName
    ) {
      continue;
    }

    const outputPath = sourceItem.pose.expectedRelativePath;
    if (!outputPath || !sourceItem.video.relativePath) {
      continue;
    }

    const existing = grouped.get(outputPath);
    if (existing) {
      existing.sourceIngestIds.push(sourceItem.ingestId);
      continue;
    }

    const settings = buildSettings(sourceItem, overrides);
    const startSecond =
      settings.startSecond ?? sourceItem.analysisRange.startSecond;
    const endSecond = settings.endSecond ?? sourceItem.analysisRange.endSecond;
    const absoluteOutputPath = path.resolve(repoRoot, outputPath);
    const item = {
      planId: `pose_${sourceItem.ingestId}`,
      sourceIngestIds: [sourceItem.ingestId],
      actionType: sourceItem.actionType,
      videoId: `pilot-${sourceItem.ingestId}`,
      videoPath: sourceItem.video.relativePath,
      outputPath,
      poseFileName: sourceItem.pose.requestedFileName,
      startSecond,
      endSecond,
      targetFps: settings.targetFps,
      delegate: settings.delegate,
      numPoses: settings.numPoses,
      primaryPoseSelection: settings.primaryPoseSelection,
      subjectRoi: settings.subjectRoi ?? null,
      inferenceRoi: settings.inferenceRoi ?? null,
      subjectQaRequired: Boolean(settings.subjectQaRequired),
      subjectQaNote: settings.subjectQaNote ?? null,
      status: fs.existsSync(absoluteOutputPath) ? "already_exists" : "planned",
    };
    item.command = buildCommand(item);
    grouped.set(outputPath, item);
  }

  const items = [...grouped.values()].sort(
    (left, right) =>
      left.actionType.localeCompare(right.actionType) ||
      left.outputPath.localeCompare(right.outputPath),
  );

  return {
    schemaVersion: "ai_fms_pose_extraction_plan_v1",
    pilotId: manifest.pilotId,
    snapshotSourceDate: manifest.snapshotSourceDate,
    summary: {
      uniqueMissingPoseFiles: items.length,
      autoApproved: items.filter((item) => !item.subjectQaRequired).length,
      subjectQaRequired: items.filter((item) => item.subjectQaRequired).length,
      alreadyExists: items.filter((item) => item.status === "already_exists")
        .length,
    },
    items,
  };
}

function executePlan(plan, args, repoRoot) {
  const selected = plan.items.filter((item) => {
    if (args.actions && !args.actions.has(item.actionType)) {
      return false;
    }
    if (item.subjectQaRequired && !args.includeSubjectQa) {
      return false;
    }
    if (item.status === "already_exists" && !args.force) {
      return false;
    }
    return true;
  });

  for (const [index, item] of selected.entries()) {
    const outputPath = path.resolve(repoRoot, item.outputPath);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    process.stdout.write(
      `[${index + 1}/${selected.length}] ${item.actionType}: ${item.poseFileName}\n`,
    );
    const result = spawnSync(item.command.executable, item.command.args, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: "inherit",
    });

    if (result.error) {
      throw result.error;
    }
    if (result.status !== 0) {
      throw new Error(
        `Pose extraction failed for ${item.poseFileName} with exit code ${result.status}.`,
      );
    }
  }

  return selected.length;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = process.cwd();
  const manifest = readJson(path.resolve(repoRoot, args.manifestPath));
  const overrides = readJson(path.resolve(repoRoot, args.overridesPath));
  const plan = createPoseExtractionPlan({ manifest, overrides, repoRoot });
  const outputPath = path.resolve(repoRoot, args.outputPath);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(plan, null, 2)}\n`);

  let executed = 0;
  if (args.execute) {
    executed = executePlan(plan, args, repoRoot);
  }

  process.stdout.write(
    `${JSON.stringify({ ...plan.summary, executed }, null, 2)}\n`,
  );
}

main();
