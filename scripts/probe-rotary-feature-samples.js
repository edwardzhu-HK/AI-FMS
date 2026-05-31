import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { buildAiSideSuggestion } from "../src/lib/ai-side-suggestion.js";
import { getMovementAdapter } from "../src/lib/movement-adapters.js";
import { summarizePoseLandmarks } from "../src/lib/pose-landmarks.js";

const OUTPUT_PATH = "docs/rotary_feature_probe_report_2026-05-31.md";

const PROBE_CASES = [
  {
    label: "Rotary review sample",
    videoPath:
      "Eval_Videos/Sample videos/7-rotatory stability/videoplayback (21).mp4",
    posePath:
      "Eval_Videos/Sample videos/7-rotatory stability/pose/rotary-review.pose.json",
    notes: "本地 review sample，仅使用前 40 秒。",
    segments: [
      {
        segmentId: "rotary_review_1",
        repetitionIndex: 1,
        actionType: "rotary_stability",
        cameraView: "front",
        side: "unknown",
        startSecond: 0,
        endSecond: 20,
      },
      {
        segmentId: "rotary_review_2",
        repetitionIndex: 2,
        actionType: "rotary_stability",
        cameraView: "front",
        side: "unknown",
        startSecond: 20,
        endSecond: 40,
      },
    ],
  },
  {
    label: "Online Redefined Physiotherapy",
    videoPath:
      "Eval_Videos/Online Candidates/07-Rotary Stability/Rotary stability test (Functional movement screen)-_iOv5nPrVzc.mp4",
    posePath:
      "Eval_Videos/Online Candidates/07-Rotary Stability/pose/redefined-functional-movement-screen.pose.json",
    notes: "已批准下载的 online candidate，46.5 秒。",
    segments: [
      {
        segmentId: "rotary_online_redefined_1",
        repetitionIndex: 1,
        actionType: "rotary_stability",
        cameraView: "front",
        side: "unknown",
        startSecond: 0,
        endSecond: 46.51,
      },
    ],
  },
  {
    label: "Online Capacity Performance",
    videoPath:
      "Eval_Videos/Online Candidates/07-Rotary Stability/Rotatory Stability Test-2uSUaw5gJ_s.mp4",
    posePath:
      "Eval_Videos/Online Candidates/07-Rotary Stability/pose/capacity-rotatory-stability-test.pose.json",
    notes: "已批准下载的 online candidate，40.2 秒。",
    segments: [
      {
        segmentId: "rotary_online_capacity_1",
        repetitionIndex: 1,
        actionType: "rotary_stability",
        cameraView: "front",
        side: "unknown",
        startSecond: 0,
        endSecond: 40.23,
      },
    ],
  },
];

function formatPercent(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "N/A";
  }

  return `${Math.round(value * 100)}%`;
}

function formatNumber(value, digits = 2) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "N/A";
  }

  return value.toFixed(digits);
}

function loadJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function summarizeSides(sideSuggestions) {
  return sideSuggestions.reduce((counts, suggestion) => {
    const side =
      suggestion.status === "suggested" ? suggestion.side : suggestion.status;
    counts[side] = (counts[side] ?? 0) + 1;
    return counts;
  }, {});
}

function summarizeCase(probeCase) {
  if (!existsSync(probeCase.posePath)) {
    return {
      ...probeCase,
      status: "missing_pose",
      poseSummary: null,
      timingReport: null,
      featureReport: null,
      sideSuggestions: [],
      sideCounts: {},
    };
  }

  const adapter = getMovementAdapter("rotary_stability");
  const posePayload = loadJson(probeCase.posePath);
  const poseSummary = summarizePoseLandmarks(posePayload);
  const timingReport = adapter.buildTimingReport({
    posePayload,
    segments: probeCase.segments,
  });
  const featureReport = adapter.buildFeatureReport({
    posePayload,
    timingReport,
  });
  const sideSuggestions = probeCase.segments.map((segment) => {
    const featureItem =
      featureReport?.items?.find(
        (item) => item.segmentId === segment.segmentId,
      ) ?? null;

    return buildAiSideSuggestion({
      actionType: "rotary_stability",
      segment,
      featureItem,
    });
  });

  return {
    ...probeCase,
    status: "ok",
    poseSummary,
    timingReport,
    featureReport,
    sideSuggestions,
    sideCounts: summarizeSides(sideSuggestions),
  };
}

function compactJson(value) {
  return JSON.stringify(value ?? {}, null, 0);
}

function renderMarkdown(results) {
  const generatedAt = new Date().toISOString();
  const rows = results.map((result) => {
    const timingSummary = result.timingReport?.summary;
    const featureSummary = result.featureReport?.summary;
    const poseSummary = result.poseSummary;

    return [
      result.label,
      result.status,
      poseSummary
        ? `${poseSummary.framesWithPose}/${poseSummary.framesTotal}`
        : "N/A",
      poseSummary ? formatPercent(1 - poseSummary.missingFramesRatio) : "N/A",
      timingSummary
        ? `${timingSummary.goodCount}/${timingSummary.segmentsTotal}`
        : "N/A",
      featureSummary
        ? `${featureSummary.usableRepetitions}/${featureSummary.repetitionsTotal}`
        : "N/A",
      compactJson(result.sideCounts),
      result.notes,
    ];
  });

  const detailSections = results
    .map((result) => {
      const featureItems = result.featureReport?.items ?? [];
      const detailRows = featureItems.map((item, index) => {
        const sideSuggestion = result.sideSuggestions[index];

        return `| ${item.repetitionIndex ?? index + 1} | ${item.status} | ${
          sideSuggestion?.status ?? "N/A"
        } | ${sideSuggestion?.side ?? "N/A"} | ${formatNumber(
          sideSuggestion?.confidence,
          2,
        )} | ${item.metrics?.pattern ?? "N/A"} | ${formatNumber(
          item.metrics?.rotaryReachScore,
          3,
        )} | ${formatNumber(item.metrics?.trunkTwistDegrees, 1)} | ${
          item.ratings?.balanceStability?.label ?? "N/A"
        } |`;
      });

      return `### ${result.label}

- 视频：\`${result.videoPath}\`
- Pose：\`${result.posePath}\`
- 状态：\`${result.status}\`

| Rep | Feature status | AI side status | AI side | Confidence | Pattern | Reach | Trunk twist | Balance |
| ---: | --- | --- | --- | ---: | --- | ---: | ---: | --- |
${detailRows.length ? detailRows.join("\n") : "| - | - | - | - | - | - | - | - | - |"}
`;
    })
    .join("\n");

  return `# Rotary Stability Feature Probe Report

日期：2026-05-31

生成时间：${generatedAt}

本文档用于记录 Rotary Stability 当前 feature-only pose probe 在多个样本上的稳定性。它不是 AI RAW SCORE，也不应作为 FMS 最终评分依据。

## 总览

| Sample | Status | Pose frames | Pose coverage | Timing | Features | AI side counts | Notes |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- |
${rows.map((row) => `| ${row.join(" | ")} |`).join("\n")}

## 观察结论

- 当前 probe 能在 3 个已有 pose 的样本上输出 segment-level feature evidence 和 AI side suggestion。
- 两个 online candidate 的 pose coverage 较好；本地 review sample 前 40 秒 coverage 约 77%，更适合当作测试样本，不适合作为稳定 demo 样本。
- 不同样本的 side suggestion 会出现 left/right，说明 side 语义需要 Ronnie 结合动作标准校准，不能直接当作评分结论。
- Rotary Stability 仍保持 feature-only：可以辅助 reviewer 看 pose evidence，但不输出 AI RAW SCORE。
- 后续要校准的核心不是 UI，而是动作 phase、side 语义、以及哪些 proxy 可以进入评分解释。

## 样本细节

${detailSections}
`;
}

const results = PROBE_CASES.map(summarizeCase);
const markdown = renderMarkdown(results);

mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
writeFileSync(OUTPUT_PATH, markdown);

console.table(
  results.map((result) => ({
    label: result.label,
    status: result.status,
    pose:
      result.poseSummary &&
      `${result.poseSummary.framesWithPose}/${result.poseSummary.framesTotal}`,
    timing:
      result.timingReport &&
      `${result.timingReport.summary.goodCount}/${result.timingReport.summary.segmentsTotal}`,
    features:
      result.featureReport &&
      `${result.featureReport.summary.usableRepetitions}/${result.featureReport.summary.repetitionsTotal}`,
    sideCounts: compactJson(result.sideCounts),
  })),
);
console.log(`Wrote ${OUTPUT_PATH}`);
