import fs from "node:fs/promises";
import path from "node:path";
import { summarizeConsistency } from "../src/lib/consistency.js";

function parseArgs(argv) {
  const args = {
    importReport: "Eval_Videos/01-Deep Squat/import-report.json",
    apiBase: "http://127.0.0.1:4000",
    output: "Eval_Videos/01-Deep Squat/consistency-report.json",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];

    if (token === "--import-report" && argv[i + 1]) {
      args.importReport = argv[i + 1];
      i += 1;
      continue;
    }

    if (token === "--api-base" && argv[i + 1]) {
      args.apiBase = argv[i + 1];
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

async function httpJson(url) {
  const response = await fetch(url);

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

function mapScore(rawScore) {
  if (!rawScore) {
    return null;
  }

  return {
    reviewerId: rawScore.reviewer_id ?? "",
    totalScore: rawScore.total_score,
    subscores: rawScore.subscores
      ? {
          depth: rawScore.subscores.depth,
          kneeAlignment: rawScore.subscores.knee_alignment,
          torsoControl: rawScore.subscores.torso_control,
        }
      : null,
    comment: rawScore.comment ?? "",
  };
}

function mapSegment(rawSegment) {
  return {
    segmentId: rawSegment.segment_id,
    aiScore: mapScore(rawSegment.ai_score),
    reviewerScores: {
      reviewer_a: mapScore(rawSegment.reviewer_a_score),
      reviewer_b: mapScore(rawSegment.reviewer_b_score),
    },
  };
}

function mergeMetrics(target, source) {
  target.segmentsTotal += source.segmentsTotal;
  target.validCount += source.validCount;
  target.invalidCount += source.invalidCount;
  target.pendingCount += source.pendingCount;
  target.aiMatchesFinalCount += source.aiMatchesFinalCount;
  target.aiDiffersFromFinalCount += source.aiDiffersFromFinalCount;
  target.reviewerConsensusCount += source.reviewerConsensusCount;
  target.reviewerDisagreementCount += source.reviewerDisagreementCount;
}

function finalizeRates(metrics) {
  if (metrics.validCount === 0) {
    metrics.aiMatchesFinalRate = null;
    return metrics;
  }

  metrics.aiMatchesFinalRate = Number(
    (metrics.aiMatchesFinalCount / metrics.validCount).toFixed(4),
  );
  return metrics;
}

async function generateReport(args) {
  const importReportPath = path.resolve(process.cwd(), args.importReport);
  const outputPath = path.resolve(process.cwd(), args.output);

  const importReport = JSON.parse(await fs.readFile(importReportPath, "utf8"));
  const rows = importReport.rows ?? [];

  const byVideo = [];
  const aggregate = {
    segmentsTotal: 0,
    validCount: 0,
    invalidCount: 0,
    pendingCount: 0,
    aiMatchesFinalCount: 0,
    aiDiffersFromFinalCount: 0,
    reviewerConsensusCount: 0,
    reviewerDisagreementCount: 0,
    aiMatchesFinalRate: null,
  };

  for (const row of rows) {
    const payload = await httpJson(
      `${args.apiBase}/api/v0/videos/${row.video_id}/segments`,
    );

    const segments = (payload.items ?? []).map(mapSegment);
    const metrics = summarizeConsistency(segments);

    byVideo.push({
      fileName: row.file_name,
      videoId: row.video_id,
      expectedReps: row.expected_reps,
      generatedSegments: segments.length,
      metrics,
    });

    mergeMetrics(aggregate, metrics);
  }

  finalizeRates(aggregate);

  const report = {
    generatedAt: new Date().toISOString(),
    sourceImportReport: importReportPath,
    apiBase: args.apiBase,
    videoCount: byVideo.length,
    aggregate,
    byVideo,
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(report, null, 2));

  console.log("Consistency report generated:");
  console.log(`- videos: ${report.videoCount}`);
  console.log(`- valid labels: ${report.aggregate.validCount}`);
  console.log(`- pending labels: ${report.aggregate.pendingCount}`);
  console.log(`- output: ${outputPath}`);
}

const args = parseArgs(process.argv.slice(2));

generateReport(args).catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 1;
});
