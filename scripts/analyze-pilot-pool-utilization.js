import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { summarizePilotPoolUtilization } from "../src/lib/pilot-pool-analysis.js";
import {
  DEFAULT_PILOT_POOL_PATHS,
  loadPilotPoolSources,
  pilotPoolSnapshotId,
  sourceMetadata,
} from "./lib/pilot-pool-sources.js";

const DEFAULT_OUTPUT_DIR = "research/pilot-v1/generated/full-pool-utilization";

const ACTION_LABELS = {
  active_straight_leg_raise: "Active Straight Leg Raise",
  deep_squat: "Deep Squat",
  hurdle_step: "Hurdle Step",
  rotary_stability: "Rotary Stability",
};

const TIER_LABELS = {
  gold_consensus: "Round A gold consensus",
  formal_non_consensus: "Formal protocol/scoreability evidence",
  expansion_candidate: "Existing blinded-review expansion candidate",
  feature_ready_not_blindable: "Label-free quantitative evidence",
  blindable_feature_limited: "Blindable but feature recovery needed",
  not_blindable_feature_limited: "Quality/collection-gap evidence",
};

const USE_LABELS = {
  score_linked_gold_analysis: "正式 score-linked 分析",
  scoreability_and_protocol_analysis: "可评分性与 protocol 分析",
  future_blinded_review_and_profile_expansion: "后续盲评与 profile 扩展",
  label_free_quantitative_analysis_only: "仅用于 label-free 定量分析",
  human_review_or_feature_recovery: "人工审核或 feature 修复",
  quality_failure_and_collection_gap_analysis: "质量失败与采集缺口分析",
};

const NEXT_ACTION_LABELS = {
  analyze_existing_pool_first: "先分析现有数据池",
  expand_review_with_existing_pool_first: "优先扩展现有样本的人工审核",
  pose_recovery_then_targeted_collection_if_gap_remains:
    "先修复 pose；仍有缺口时再定向采集",
  repair_timing_before_targeted_collection: "先修复 timing，再决定是否采集",
  review_small_existing_pool_then_reassess: "先审核少量现有候选，再复评缺口",
};

function parseArgs(argv) {
  const options = {
    ...DEFAULT_PILOT_POOL_PATHS,
    outputDir: DEFAULT_OUTPUT_DIR,
  };
  const argumentMap = {
    "--canonical": "canonicalPath",
    "--canonical-checksums": "canonicalChecksumsPath",
    "--blindability": "blindabilityPath",
    "--feature-matrix": "featureMatrixPath",
    "--feature-checksums": "featureChecksumsPath",
    "--formal-manifest": "formalManifestPath",
    "--formal-checksums": "formalChecksumsPath",
    "--agreement": "agreementPath",
    "--agreement-checksums": "agreementChecksumsPath",
    "--feature-contract": "featureContractPath",
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

function csvValue(value) {
  if (value == null) {
    return "";
  }
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(rows, columns) {
  return `${[
    columns,
    ...rows.map((row) => columns.map((column) => row[column])),
  ]
    .map((row) => row.map(csvValue).join(","))
    .join("\n")}\n`;
}

function tierCsv(analysis) {
  return toCsv(analysis.rows, [
    "repetitionId",
    "ingestId",
    "videoId",
    "actionType",
    "repetitionIndex",
    "startSecond",
    "endSecond",
    "cameraView",
    "side",
    "blindabilityStatus",
    "blindabilityReasons",
    "featureReadiness",
    "featureReasons",
    "formalSelected",
    "roundAConsensusScored",
    "historicalConsensusScore",
    "historicalLabelUse",
    "researchTier",
    "recommendedUse",
  ]);
}

function featureSummaryCsv(analysis) {
  const rows = Object.entries(analysis.readyFeatureSummary).flatMap(
    ([actionType, action]) =>
      Object.entries(action.features).map(([featureName, summary]) => ({
        actionType,
        readyRepCount: action.count,
        readySourceVideoCount: action.sourceVideos,
        featureName,
        role: summary.role,
        unit: summary.unit,
        direction: summary.direction,
        count: summary.count,
        missingCount: summary.missingCount,
        min: summary.min,
        q1: summary.q1,
        median: summary.median,
        mean: summary.mean,
        q3: summary.q3,
        max: summary.max,
        standardDeviation: summary.standardDeviation,
      })),
  );
  return toCsv(rows, [
    "actionType",
    "readyRepCount",
    "readySourceVideoCount",
    "featureName",
    "role",
    "unit",
    "direction",
    "count",
    "missingCount",
    "min",
    "q1",
    "median",
    "mean",
    "q3",
    "max",
    "standardDeviation",
  ]);
}

function sourceVideoCsv(analysis) {
  const rows = Object.entries(
    Object.groupBy(analysis.rows, (row) => row.videoId),
  ).map(([videoId, repetitions]) => ({
    videoId,
    actionType: repetitions[0].actionType,
    repetitionCount: repetitions.length,
    featureReadyCount: repetitions.filter((row) => row.featureReady).length,
    blindableCount: repetitions.filter((row) => row.blindable).length,
    formalCount: repetitions.filter((row) => row.formalSelected).length,
    goldConsensusCount: repetitions.filter((row) => row.roundAConsensusScored)
      .length,
    expansionCandidateCount: repetitions.filter(
      (row) => row.researchTier === "expansion_candidate",
    ).length,
  }));
  return toCsv(rows, [
    "videoId",
    "actionType",
    "repetitionCount",
    "featureReadyCount",
    "blindableCount",
    "formalCount",
    "goldConsensusCount",
    "expansionCandidateCount",
  ]);
}

function limitationText(reasons) {
  const entries = Object.entries(reasons);
  return entries.length
    ? entries.map(([reason, count]) => `${reason}: ${count}`).join("; ")
    : "无";
}

function buildReport(payload) {
  const analysis = payload.analysis;
  const tierRows = Object.entries(analysis.tierCounts)
    .map(([tier, count]) => {
      const recommendedUse = analysis.rows.find(
        (row) => row.researchTier === tier,
      )?.recommendedUse;
      return `| ${TIER_LABELS[tier] ?? tier} | ${count} | ${USE_LABELS[recommendedUse] ?? "N/A"} |`;
    })
    .join("\n");
  const actionRows = Object.entries(analysis.byAction)
    .map(([actionType, action]) => {
      const assessment = action.acquisitionAssessment;
      return `| ${ACTION_LABELS[actionType] ?? actionType} | ${action.total} | ${action.sourceVideos} | ${action.featureReady} | ${action.blindAndFeatureReady} | ${action.formalSelected} | ${action.roundAConsensusScored} | ${assessment.existingExpansionCandidateReps} / ${assessment.existingExpansionCandidateVideos} videos | ${NEXT_ACTION_LABELS[assessment.nextAction]} |`;
    })
    .join("\n");
  const limitationRows = Object.entries(analysis.byAction)
    .map(
      ([actionType, action]) =>
        `| ${ACTION_LABELS[actionType] ?? actionType} | ${action.acquisitionAssessment.featureLimitedReps} | ${limitationText(action.acquisitionAssessment.limitationReasons)} |`,
    )
    .join("\n");

  return `# AI-FMS 110-Rep Full-Pool Utilization Report

## 核心结论

本项目不会把研究数据量缩减为 26 条。110 rep 是完整 pilot pool；66 条 feature-ready rep 构成 label-free quantitative profile pool；32 条正式样本用于独立盲评；其中 26 条双方同分 rep 是当前 gold consensus 子集。不同层级承担不同研究问题，任何层级都不会被静默丢弃。

## 全池规模

- Canonical reps：${analysis.fullPool.total}，来自 ${analysis.fullPool.sourceVideos} 个源视频。
- Blindability eligible：${analysis.fullPool.blindable}。
- Feature-ready：${analysis.fullPool.featureReady}。
- 同时 blindable + feature-ready：${analysis.fullPool.blindAndFeatureReady}。
- Formal study：${analysis.fullPool.formalSelected}。
- Round A gold consensus：${analysis.fullPool.roundAConsensusScored}。
- 尚未进入 formal study 的扩展候选：${analysis.expansionPool.reps}，来自 ${analysis.expansionPool.sourceVideos} 个源视频。

## 证据层级

| 层级 | Reps | 推荐用途 |
| --- | ---: | --- |
${tierRows}

Formal 32 是从 58 条同时通过 blindability 与 feature-readiness 的样本中，按四动作平衡、历史分数覆盖和源视频覆盖进行 deterministic selection；它不是从 110 条做 simple random sample。它提供 reviewer reliability 和 gold-label audit evidence，但不自动证明 110 条全部有效。

## 按动作利用情况

| 动作 | 全部 reps | 源视频 | Feature-ready | Blind + ready | Formal | Gold | 额外候选 | 当前优先动作 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
${actionRows}

## Feature-Limited 数据不是废数据

| 动作 | Limited reps | 原因 |
| --- | ---: | --- |
${limitationRows}

全部 limited 原因汇总：${limitationText(analysis.featureLimitationReasons)}。这些记录进入 timing、pose、机位和采集缺口分析；只有在修复仍失败后，才形成定向采集依据。

## 66-Rep Quantitative Profile Pool

\`full-pool-feature-summary.csv\` 对 66 条 feature-ready rep 按动作输出所有 movement/quality feature 的 count、missing、min、quartiles、mean、max 和 standard deviation。该分析不依赖历史分数，也不受 Round B 影响，可以用于 profile 分布、异常点、动作覆盖和后续 clustering。

## 历史标签边界

${analysis.historicalLabelBoundary.available} 条具有历史 consensus score，但目前统一标记为 \`legacy_weak_label_pending_gold_audit\`。它们可以用于分层抽样和 exploratory analysis，不能直接作为 97 条 gold labels。Round B 完成后，必须将 blind consensus 与历史标签按动作、分数和源视频比较，再决定是否将其中一部分升级为 audited weak labels。

## 统计与采集边界

- Rep 是动作片段，不等于独立 participant；主分析必须同时报告 source-video count，并在 bootstrap 或 uncertainty 分析中以视频为单位。
- 32/26 gold subset 用于可靠性与 score-linked analysis；110/66 full pool 用于数据质量与 label-free quantitative analysis。
- 定向采集决定保持 \`not_yet_final\`。优先利用现有扩展候选并修复 timing/pose，之后再根据动作、分数、机位和 profile 缺口决定补采。

## 复现命令

\`npm run data:pilot:utilization\`
`;
}

function writeOutputs(outputDir, payload) {
  fs.mkdirSync(outputDir, { recursive: true });
  const files = {
    "full-pool-utilization.json": `${JSON.stringify(payload, null, 2)}\n`,
    "full-pool-repetition-tiers.csv": tierCsv(payload.analysis),
    "full-pool-feature-summary.csv": featureSummaryCsv(payload.analysis),
    "full-pool-source-video-summary.csv": sourceVideoCsv(payload.analysis),
    "full-pool-utilization-report.md": buildReport(payload),
  };
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(outputDir, name), content);
  }
  fs.writeFileSync(
    path.join(outputDir, "full-pool-utilization-SHA256SUMS"),
    `${Object.entries(files)
      .map(([name, content]) => `${sha256(content)}  ${name}`)
      .join("\n")}\n`,
  );
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const { outputDir, ...sourcePaths } = options;
  const sources = loadPilotPoolSources(sourcePaths);
  const analysis = summarizePilotPoolUtilization({
    canonical: sources.canonical.payload,
    blindability: sources.blindability.payload,
    featureMatrix: sources.featureMatrix.payload,
    formalManifest: sources.formalManifest.payload,
    agreement: sources.agreement.payload,
    featureContract: sources.featureContract.payload,
  });
  const payload = {
    schemaVersion: "ai_fms_full_pool_utilization_v1",
    generatedAt: new Date().toISOString(),
    snapshotId: pilotPoolSnapshotId(sources),
    sources: sourceMetadata(sources),
    formalSelectionPolicy: sources.formalManifest.payload.selectionPolicy,
    analysisPolicy: {
      preserveAllCanonicalRepetitions: true,
      featureReadyAnalysisIsLabelFree: true,
      historicalScoresAreWeakLabels: true,
      goldConsensusRestrictedToBlindedAgreement: true,
      roundBIncluded: false,
      samplingUnitCaution: "repetition_is_not_independent_participant",
    },
    analysis,
  };
  const resolvedOutputDir = path.resolve(outputDir);
  writeOutputs(resolvedOutputDir, payload);
  process.stdout.write(
    `${JSON.stringify(
      {
        outputDir: resolvedOutputDir,
        snapshotId: payload.snapshotId,
        fullPool: analysis.fullPool,
        tiers: analysis.tierCounts,
        expansionPool: analysis.expansionPool,
      },
      null,
      2,
    )}\n`,
  );
  return payload;
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
