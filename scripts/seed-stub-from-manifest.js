import path from "node:path";
import fs from "node:fs/promises";
import { validateManifest } from "./validate-manifest.js";
import { parseManifestFile, parseManifestRecord } from "./manifest-utils.js";

function parseArgs(argv) {
  const args = {
    dir: "Eval_Videos/01-Deep Squat",
    manifest: "Eval_Videos/01-Deep Squat/manifest.csv",
    apiBase: "http://127.0.0.1:4000",
    actionType: "deep_squat",
    output: "Eval_Videos/01-Deep Squat/import-report.json",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];

    if (token === "--dir" && argv[i + 1]) {
      args.dir = argv[i + 1];
      i += 1;
      continue;
    }

    if (token === "--manifest" && argv[i + 1]) {
      args.manifest = argv[i + 1];
      i += 1;
      continue;
    }

    if (token === "--api-base" && argv[i + 1]) {
      args.apiBase = argv[i + 1];
      i += 1;
      continue;
    }

    if (token === "--action-type" && argv[i + 1]) {
      args.actionType = argv[i + 1];
      i += 1;
      continue;
    }

    if (token === "--output" && argv[i + 1]) {
      args.output = argv[i + 1];
      i += 1;
    }
  }

  return args;
}

async function httpJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload?.error?.message ??
      payload?.message ??
      `request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

async function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForAnalysisSuccess(apiBase, analysisJobId) {
  const maxPolls = 30;

  for (let i = 0; i < maxPolls; i += 1) {
    const job = await httpJson(
      `${apiBase}/api/v0/analysis-jobs/${analysisJobId}`,
    );

    if (job.status === "succeeded") {
      return job;
    }

    if (job.status === "failed") {
      throw new Error(`analysis job failed: ${analysisJobId}`);
    }

    await wait(220);
  }

  throw new Error(`analysis job timeout: ${analysisJobId}`);
}

async function seedFromManifest(args) {
  const manifestExitCode = validateManifest({
    dir: args.dir,
    manifest: args.manifest,
  });

  if (manifestExitCode !== 0) {
    throw new Error("manifest validation failed, aborting seed");
  }

  const parsed = parseManifestFile(args.manifest);
  const rows = parsed.rows.map(parseManifestRecord);

  const reportRows = [];

  for (const row of rows) {
    const created = await httpJson(`${args.apiBase}/api/v0/videos`, {
      method: "POST",
      body: JSON.stringify({
        action_type: args.actionType,
        file_name: row.fileName,
        start_second: row.startSecond,
        end_second: row.endSecond,
        expected_reps: row.expectedReps,
        notes: row.notes,
      }),
    });

    await waitForAnalysisSuccess(args.apiBase, created.analysis_job_id);

    const segments = await httpJson(
      `${args.apiBase}/api/v0/videos/${created.video_id}/segments`,
    );

    reportRows.push({
      file_name: row.fileName,
      video_id: created.video_id,
      analysis_job_id: created.analysis_job_id,
      expected_reps: row.expectedReps,
      generated_segments: segments.items.length,
      notes: row.notes,
    });

    console.log(
      `seeded ${row.fileName}: video=${created.video_id}, segments=${segments.items.length}`,
    );
  }

  const report = {
    generated_at: new Date().toISOString(),
    manifest: path.resolve(process.cwd(), args.manifest),
    api_base: args.apiBase,
    action_type: args.actionType,
    rows: reportRows,
  };

  const outputPath = path.resolve(process.cwd(), args.output);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(report, null, 2));

  console.log("Seed complete:");
  console.log(`- rows: ${reportRows.length}`);
  console.log(`- report: ${outputPath}`);
}

const args = parseArgs(process.argv.slice(2));

seedFromManifest(args).catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 1;
});
