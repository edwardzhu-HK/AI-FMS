import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  analyzeLabelFreeProfiles,
  summarizeConsensusOverlay,
} from "../src/lib/label-free-profile-analysis.js";
import { summarizePilotPoolUtilization } from "../src/lib/pilot-pool-analysis.js";
import {
  DEFAULT_PILOT_POOL_PATHS,
  loadPilotPoolSources,
  pilotPoolSnapshotId,
  sourceMetadata,
} from "./lib/pilot-pool-sources.js";

const DEFAULT_OUTPUT_DIR = "research/pilot-v1/generated/label-free-profiles";

const ACTION_LABELS = {
  active_straight_leg_raise: "Active Straight Leg Raise",
  deep_squat: "Deep Squat",
  hurdle_step: "Hurdle Step",
  rotary_stability: "Rotary Stability",
};

const CLUSTER_QUALITY_LABELS = {
  strong_separation_exploratory: "探索性分离较强",
  moderate_separation_exploratory: "探索性分离中等",
  weak_separation_do_not_name_as_discrete_phenotypes:
    "分离较弱，不应命名为离散表型",
  not_estimable: "无法估计",
};

const SOURCE_EFFECT_LABELS = {
  strong_source_video_signature: "强 source-video signature",
  moderate_source_video_signature: "中等 source-video signature",
  weak_source_video_signature: "弱 source-video signature",
  not_estimable: "无法估计",
};

const STABILITY_LABELS = {
  high_leave_one_video_out_agreement: "高",
  moderate_leave_one_video_out_agreement: "中等",
  low_leave_one_video_out_agreement: "低，单一来源敏感",
  not_estimable_fewer_than_three_source_videos: "源视频不足，无法估计",
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

function formatNumber(value, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits) : "N/A";
}

function assignmentsCsv(analysis) {
  const rows = Object.values(analysis.actions).flatMap((action) =>
    action.assignments.map((assignment) => ({
      actionType: action.actionType,
      repetitionId: assignment.repetitionId,
      videoId: assignment.videoId,
      researchTier: assignment.researchTier,
      profileGroup: assignment.profileGroup,
      medoidId: assignment.medoidId,
      distanceToMedoid: assignment.distanceToMedoid,
      silhouette: assignment.silhouette,
      outlierScore: assignment.outlierScore,
      outlierRank: assignment.outlierRank,
      features: assignment.features,
      robustZScores: assignment.zScores,
    })),
  );
  return toCsv(rows, [
    "actionType",
    "repetitionId",
    "videoId",
    "researchTier",
    "profileGroup",
    "medoidId",
    "distanceToMedoid",
    "silhouette",
    "outlierScore",
    "outlierRank",
    "features",
    "robustZScores",
  ]);
}

function consensusOverlayCsv(overlay) {
  return toCsv(overlay.rows, [
    "actionType",
    "repetitionId",
    "videoId",
    "consensusScore",
    "profileGroup",
    "profileGroupSourceConcentrated",
    "outlierScore",
    "outlierRank",
  ]);
}

function buildCaseReviewQueue({ analysis, consensusOverlay, canonical }) {
  const overlayIndex = new Map(
    consensusOverlay.rows.map((row) => [row.repetitionId, row]),
  );
  const stratumIndex = new Map(
    consensusOverlay.scoreStrata.map((stratum) => [
      `${stratum.actionType}:${stratum.consensusScore}`,
      stratum,
    ]),
  );
  const repetitionIndex = new Map(
    canonical.repetitions.map((row) => [row.repetitionId, row]),
  );
  const videoIndex = new Map(canonical.videos.map((row) => [row.videoId, row]));
  return Object.values(analysis.actions)
    .flatMap((action) =>
      action.outlierCandidates.map((candidate) => {
        const assignment = action.assignments.find(
          (row) => row.repetitionId === candidate.repetitionId,
        );
        const overlay = overlayIndex.get(candidate.repetitionId);
        const stratum = overlay
          ? stratumIndex.get(`${overlay.actionType}:${overlay.consensusScore}`)
          : null;
        const repetition = repetitionIndex.get(candidate.repetitionId);
        const video = videoIndex.get(candidate.videoId);
        const reliableCrossProfileCase =
          stratum?.spansMultipleProfiles &&
          action.sourceVideoCount >= 3 &&
          action.sourceVideoEffect.heuristicFlag ===
            "weak_source_video_signature";
        const sourceLimitedCrossProfileCase =
          stratum?.spansMultipleProfiles && action.sourceVideoCount >= 3;
        const reviewReason = stratum?.spansMultipleProfiles
          ? "gold_consensus_same_score_profile_boundary_outlier"
          : overlay
            ? "gold_consensus_outlier"
            : "label_free_outlier";
        return {
          priorityBand: reliableCrossProfileCase
            ? 1
            : sourceLimitedCrossProfileCase
              ? 2
              : stratum?.spansMultipleProfiles
                ? 3
                : overlay
                  ? 4
                  : 5,
          reviewReason,
          actionType: action.actionType,
          repetitionId: candidate.repetitionId,
          videoId: candidate.videoId,
          profileGroup: assignment.profileGroup,
          outlierScore: candidate.outlierScore,
          roundAConsensusScore: overlay?.consensusScore ?? null,
          researchTier: assignment.researchTier,
          videoFileName: video?.fileName ?? repetition?.videoFileName ?? null,
          videoRelativePath: video?.relativePath ?? null,
          startSecond: repetition?.startSecond ?? null,
          endSecond: repetition?.endSecond ?? null,
          cameraView: repetition?.cameraView ?? null,
          side: repetition?.side ?? null,
        };
      }),
    )
    .sort(
      (left, right) =>
        left.priorityBand - right.priorityBand ||
        right.outlierScore - left.outlierScore ||
        left.repetitionId.localeCompare(right.repetitionId),
    )
    .map((row, index) => {
      const reviewRow = { ...row };
      delete reviewRow.priorityBand;
      return {
        reviewPriority: index + 1,
        ...reviewRow,
      };
    });
}

function caseReviewQueueCsv(rows) {
  return toCsv(rows, [
    "reviewPriority",
    "reviewReason",
    "actionType",
    "repetitionId",
    "videoId",
    "profileGroup",
    "outlierScore",
    "roundAConsensusScore",
    "researchTier",
    "videoFileName",
    "videoRelativePath",
    "startSecond",
    "endSecond",
    "cameraView",
    "side",
  ]);
}

function groupsCsv(analysis) {
  const rows = Object.values(analysis.actions).flatMap((action) =>
    Object.entries(action.groups).map(([profileGroup, group]) => ({
      actionType: action.actionType,
      profileGroup,
      count: group.count,
      sourceVideoCount: group.sourceVideoCount,
      maxVideoShare: group.maxVideoShare,
      sourceConcentrationFlag: group.sourceConcentrationFlag,
      medoidId: group.medoidId,
      characteristicFeatures: group.characteristicFeatures,
      videoCounts: group.videoCounts,
    })),
  );
  return toCsv(rows, [
    "actionType",
    "profileGroup",
    "count",
    "sourceVideoCount",
    "maxVideoShare",
    "sourceConcentrationFlag",
    "medoidId",
    "characteristicFeatures",
    "videoCounts",
  ]);
}

function outliersCsv(analysis) {
  const rows = Object.values(analysis.actions).flatMap((action) =>
    action.outlierCandidates.map((candidate, index) => ({
      actionType: action.actionType,
      rank: index + 1,
      repetitionId: candidate.repetitionId,
      videoId: candidate.videoId,
      outlierScore: candidate.outlierScore,
      largestFeatureDeviations: candidate.largestFeatureDeviations,
    })),
  );
  return toCsv(rows, [
    "actionType",
    "rank",
    "repetitionId",
    "videoId",
    "outlierScore",
    "largestFeatureDeviations",
  ]);
}

function sourceEffectsCsv(analysis) {
  const rows = Object.values(analysis.actions).map((action) => ({
    actionType: action.actionType,
    reps: action.count,
    sourceVideos: action.sourceVideoCount,
    withinPairCount: action.sourceVideoEffect.withinVideo.count,
    withinMedianDistance: action.sourceVideoEffect.withinVideo.median,
    betweenPairCount: action.sourceVideoEffect.betweenVideo.count,
    betweenMedianDistance: action.sourceVideoEffect.betweenVideo.median,
    withinToBetweenMedianRatio:
      action.sourceVideoEffect.withinToBetweenMedianRatio,
    heuristicFlag: action.sourceVideoEffect.heuristicFlag,
    meanSilhouette: action.meanSilhouette,
    clusterQuality: action.clusterQuality,
    sourceConcentratedGroupCount: Object.values(action.groups).filter(
      (group) => group.sourceConcentrationFlag,
    ).length,
    leaveOneVideoOutAgreement:
      action.leaveOneVideoOut.meanCoassignmentAgreement,
    leaveOneVideoOutMinimumAgreement:
      action.leaveOneVideoOut.minimumCoassignmentAgreement,
    leaveOneVideoOutMaximumAgreement:
      action.leaveOneVideoOut.maximumCoassignmentAgreement,
    leaveOneVideoOutStatus: action.leaveOneVideoOut.status,
  }));
  return toCsv(rows, [
    "actionType",
    "reps",
    "sourceVideos",
    "withinPairCount",
    "withinMedianDistance",
    "betweenPairCount",
    "betweenMedianDistance",
    "withinToBetweenMedianRatio",
    "heuristicFlag",
    "meanSilhouette",
    "clusterQuality",
    "sourceConcentratedGroupCount",
    "leaveOneVideoOutAgreement",
    "leaveOneVideoOutMinimumAgreement",
    "leaveOneVideoOutMaximumAgreement",
    "leaveOneVideoOutStatus",
  ]);
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function interpolate(left, right, ratio) {
  return left.map((value, index) =>
    Math.round(value + (right[index] - value) * ratio),
  );
}

function heatColor(value) {
  if (!Number.isFinite(value)) {
    return "rgb(209,213,219)";
  }
  const neutral = [248, 250, 252];
  const endpoint = value < 0 ? [37, 99, 235] : [220, 38, 38];
  const ratio = Math.min(1, Math.abs(value) / 3);
  return `rgb(${interpolate(neutral, endpoint, ratio).join(",")})`;
}

function heatmapSvg(action) {
  const cellWidth = 108;
  const rowHeight = 24;
  const leftMargin = 260;
  const topMargin = 180;
  const rightMargin = 170;
  const bottomMargin = 72;
  const width =
    leftMargin + action.featureNames.length * cellWidth + rightMargin;
  const orderedRows = [...action.assignments].sort(
    (left, right) =>
      left.profileGroup.localeCompare(right.profileGroup) ||
      left.videoId.localeCompare(right.videoId) ||
      left.repetitionId.localeCompare(right.repetitionId),
  );
  const height = topMargin + orderedRows.length * rowHeight + bottomMargin;
  const groupColors = {
    profile_1: "#0f766e",
    profile_2: "#d97706",
    profile_3: "#7c3aed",
  };
  const cells = orderedRows.flatMap((row, rowIndex) => {
    const y = topMargin + rowIndex * rowHeight;
    const label = `${row.repetitionId} · ${row.videoId.slice(-6)}`;
    const rowElements = [
      `<rect x="12" y="${y + 3}" width="6" height="18" fill="${groupColors[row.profileGroup] ?? "#475569"}"/>`,
      `<text x="24" y="${y + 16}" font-size="11" fill="#0f172a">${escapeXml(label)}</text>`,
    ];
    action.featureNames.forEach((featureName, columnIndex) => {
      const value = row.zScores[featureName];
      const x = leftMargin + columnIndex * cellWidth;
      rowElements.push(
        `<rect x="${x}" y="${y + 2}" width="${cellWidth - 3}" height="${rowHeight - 3}" rx="2" fill="${heatColor(value)}"/>`,
        `<text x="${x + (cellWidth - 3) / 2}" y="${y + 16}" text-anchor="middle" font-size="10" fill="${Math.abs(value ?? 0) > 1.8 ? "#ffffff" : "#0f172a"}">${Number.isFinite(value) ? value.toFixed(2) : "NA"}</text>`,
      );
    });
    rowElements.push(
      `<text x="${leftMargin + action.featureNames.length * cellWidth + 12}" y="${y + 16}" font-size="10" fill="#334155">${row.profileGroup} · outlier ${row.outlierScore.toFixed(2)}</text>`,
    );
    return rowElements;
  });
  const headers = action.featureNames.map((featureName, columnIndex) => {
    const x = leftMargin + columnIndex * cellWidth + 12;
    return `<text transform="translate(${x},${topMargin - 12}) rotate(-48)" font-size="11" fill="#0f172a">${escapeXml(featureName)}</text>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <text x="12" y="28" font-size="18" font-weight="700" fill="#0f172a">${escapeXml(ACTION_LABELS[action.actionType] ?? action.actionType)} · Label-Free Profiles</text>
  <text x="12" y="50" font-size="11" fill="#475569">Robust z-score, clipped to ±4. Movement features only; quality fields and historical labels excluded.</text>
  <text x="12" y="68" font-size="11" fill="#475569">Rows are grouped by exploratory k-medoids profile and source video. Group color is descriptive, not a validated phenotype.</text>
  ${headers.join("\n  ")}
  ${cells.join("\n  ")}
  <text x="12" y="${height - 28}" font-size="10" fill="#64748b">Blue = below action median · white = near median · red = above action median · gray = missing</text>
</svg>\n`;
}

function characteristicText(group) {
  return group.characteristicFeatures
    .map(
      (feature) =>
        `\`${feature.featureName}\` z=${formatNumber(feature.medianRobustZ)}`,
    )
    .join(", ");
}

function actionInterpretation(action) {
  const concentratedGroups = Object.values(action.groups).filter(
    (group) => group.sourceConcentrationFlag,
  ).length;
  const smallestGroup = Math.min(
    ...Object.values(action.groups).map((group) => group.count),
  );
  if (smallestGroup < 2) {
    return "分组只隔离出一个 singleton outlier；这是高价值复核案例，但不能视为第二种稳定 profile。";
  }
  if (action.sourceVideoCount < 3) {
    return "源视频少于 3 个，无法把 profile 与来源效应分开；需要增加独立来源后再判断。";
  }
  if (
    action.sourceVideoEffect.heuristicFlag ===
      "strong_source_video_signature" ||
    concentratedGroups === action.groupCount
  ) {
    return "当前分组很可能受到源视频/受试对象构成驱动，优先增加独立来源或做 leave-one-video-out 检查。";
  }
  if (
    action.clusterQuality ===
    "weak_separation_do_not_name_as_discrete_phenotypes"
  ) {
    return "数据更像连续谱而非离散类型，应使用连续参数和 case pairs，不宜强行命名 profile 类别。";
  }
  return "存在可复核的动作内定量差异，可用于候选案例选择，但仍需人工查看视频确认。";
}

function overlayInterpretation(action, stratum) {
  if (!stratum.spansMultipleProfiles) {
    return "同分样本仍在一个粗粒度 group；已知 case-pair 差异应解释为组内连续变化，而不是离散亚型。";
  }
  const smallestGroup = Math.min(
    ...Object.values(stratum.profileGroups).map((group) => group.count),
  );
  if (smallestGroup < 2) {
    return "跨 group，但其中一组只有 1 条；这是同分异常案例，不是稳定亚型。";
  }
  if (action.sourceVideoCount < 3) {
    return "跨 group，但该动作独立源视频不足，暂不能排除来源效应。";
  }
  if (
    action.sourceVideoEffect.heuristicFlag === "strong_source_video_signature"
  ) {
    return "跨 group，但该动作存在强来源效应，只能作为来源敏感的同分异质性候选。";
  }
  return "同分样本跨越多个探索性 group，适合作为定量异质性复核候选。";
}

function buildReport(payload) {
  const actionRows = Object.values(payload.analysis.actions)
    .map((action) => {
      const concentratedGroups = Object.values(action.groups).filter(
        (group) => group.sourceConcentrationFlag,
      ).length;
      const leaveOneVideoOutRange = `${formatNumber(action.leaveOneVideoOut.meanCoassignmentAgreement)} / ${formatNumber(action.leaveOneVideoOut.minimumCoassignmentAgreement)}`;
      return `| ${ACTION_LABELS[action.actionType] ?? action.actionType} | ${action.count} | ${action.sourceVideoCount} | ${action.groupCount} | ${formatNumber(action.meanSilhouette)} | ${CLUSTER_QUALITY_LABELS[action.clusterQuality]} | ${formatNumber(action.sourceVideoEffect.withinToBetweenMedianRatio)} | ${SOURCE_EFFECT_LABELS[action.sourceVideoEffect.heuristicFlag]} | ${leaveOneVideoOutRange} | ${STABILITY_LABELS[action.leaveOneVideoOut.status]} | ${concentratedGroups}/${action.groupCount} |`;
    })
    .join("\n");
  const groupSections = Object.values(payload.analysis.actions)
    .map((action) => {
      const rows = Object.entries(action.groups)
        .map(
          ([profileGroup, group]) =>
            `| ${profileGroup} | ${group.count} | ${group.sourceVideoCount} | ${formatNumber(group.maxVideoShare)} | ${group.sourceConcentrationFlag ? "是" : "否"} | \`${group.medoidId}\` | ${characteristicText(group)} |`,
        )
        .join("\n");
      return `### ${ACTION_LABELS[action.actionType] ?? action.actionType}

![${ACTION_LABELS[action.actionType] ?? action.actionType} heatmap](profile-heatmap-${action.actionType}.svg)

| Group | Reps | 源视频 | 最大单视频占比 | 来源集中 | Medoid | 主要偏离 feature |
| --- | ---: | ---: | ---: | --- | --- | --- |
${rows}

${actionInterpretation(action)}`;
    })
    .join("\n\n");
  const outlierRows = Object.values(payload.analysis.actions)
    .flatMap((action) =>
      action.outlierCandidates.map(
        (candidate, index) =>
          `| ${ACTION_LABELS[action.actionType] ?? action.actionType} | ${index + 1} | \`${candidate.repetitionId}\` | \`${candidate.videoId}\` | ${formatNumber(candidate.outlierScore)} | ${candidate.largestFeatureDeviations.map((feature) => `${feature.featureName} (${formatNumber(feature.robustZ)})`).join("; ")} |`,
      ),
    )
    .join("\n");
  const overlayRows = payload.consensusOverlay.scoreStrata
    .map((stratum) => {
      const action = payload.analysis.actions[stratum.actionType];
      const groups = Object.entries(stratum.profileGroups)
        .map(([profileGroup, group]) => `${profileGroup}: ${group.count}`)
        .join("; ");
      return `| ${ACTION_LABELS[stratum.actionType] ?? stratum.actionType} | ${stratum.consensusScore} | ${stratum.count} | ${stratum.sourceVideoCount} | ${groups} | ${overlayInterpretation(action, stratum)} |`;
    })
    .join("\n");
  const reviewRows = payload.caseReviewQueue
    .slice(0, 5)
    .map(
      (row) =>
        `| ${row.reviewPriority} | ${ACTION_LABELS[row.actionType] ?? row.actionType} | \`${row.repetitionId}\` | ${row.roundAConsensusScore ?? "N/A"} | ${formatNumber(row.outlierScore)} | \`${row.videoFileName}\` | ${formatNumber(row.startSecond)}-${formatNumber(row.endSecond)}s |`,
    )
    .join("\n");

  return `# AI-FMS 66-Rep Label-Free Profile Discovery

## 研究问题

在不使用历史分数、Round A consensus 或 quality features 的前提下，66 条 feature-ready rep 是否呈现可复核的动作内 quantitative profile 差异？这些差异是连续变化、探索性分组，还是主要由源视频构成驱动？

## 输入与边界

- Full pool：${payload.analysis.inputCount} reps。
- Feature-ready input：${payload.analysis.featureReadyCount} reps，来自 ${payload.analysis.sourceVideoCount} 个源视频。
- Historical scores used：No。
- Round A consensus used：No。
- Visibility/timing quality fields used in distance：No。
- 方法：动作内 median/MAD robust z-score、deterministic k-medoids、silhouette、同视频/跨视频 pairwise distance。
- Group count 是预设探索性规则（动作内 n>=24 时 k=3、n>=6 时 k=2），不是经模型选择确认的自然类别数。
- Grouping 只作 exploratory description，不是经过验证的功能障碍分类或医学诊断。

## 总览

| 动作 | Reps | 源视频 | Groups | Mean silhouette | 分离解释 | 同/跨视频距离比 | 来源效应 | Leave-one-video-out mean/min | 稳定性 | 来源集中 groups |
| --- | ---: | ---: | ---: | ---: | --- | ---: | --- | ---: | --- | ---: |
${actionRows}

同/跨视频距离比小于 1 表示同一源视频内的 reps 更相似；该指标是启发式 source signature，不是显著性检验。Leave-one-video-out 每次移除一个源视频、重新标准化并分组，再比较其余 reps 的 pairwise co-assignment；表中同时给出 mean/min，稳定性等级也同时受两者约束，以免平均值掩盖单一高杠杆来源。它仍是未校正机会一致性的探索性检查。

## Profile Groups 与热图

${groupSections}

## Outlier Candidates

Outlier 是相对动作内 robust center 的多特征距离，仅用于优先人工复核。它可能代表稀有动作策略，也可能代表 pose、机位或 timing 问题。

| 动作 | Rank | Repetition | Video | Outlier score | 最大 robust-z 偏离 |
| --- | ---: | --- | --- | ---: | --- |
${outlierRows}

## 冻结分组后的 Round A 叠加

Round A 分数没有参与标准化、距离或分组。只有在 66-rep label-free groups 冻结后，才把 ${payload.consensusOverlay.consensusCount} 条双方同分记录映射回来；因此这是 post-hoc interpretation，不是 label-guided clustering。

- Action-score strata：${payload.consensusOverlay.scoreStrataCount}。
- 跨越多个 exploratory profile 的同分 strata：${payload.consensusOverlay.multiProfileScoreStrataCount}/${payload.consensusOverlay.scoreStrataCount}。

| 动作 | Consensus score | Reps | 源视频 | Profile 分布 | 解释 |
| --- | ---: | ---: | ---: | --- | --- |
${overlayRows}

这组结果支持“同一个 ordinal score 内存在定量异质性”的描述性假设，但不支持把当前 groups 命名为不同功能障碍。Deep Squat 的 2 分和 3 分样本都位于主要 group，说明其已有同分 case-pair 差异更像连续参数变化；ASLR 与 Hurdle 的跨组现象各由 singleton outlier 触发；Rotary 虽在同一 1 分内跨组，但全动作只有 2 个源视频。

## 优先视频复核

完整队列见 \`label-free-profile-review-queue.csv\`。优先级综合考虑 gold consensus、同分 profile 边界和动作内 outlier，而不是把极端值直接当作真实功能模式。

| Priority | 动作 | Repetition | Round A score | Outlier | Video | 时间段 |
| ---: | --- | --- | ---: | ---: | --- | --- |
${reviewRows}

## 当前可报告发现

1. 66 条现有数据足以建立第一版 label-free quantitative map，前期工作没有缩减成 26 条。
2. 是否存在离散 profile 必须同时看 silhouette 和 source concentration；来源驱动的 group 不能解释为人体功能类型。
3. 26 条 gold consensus 映射到冻结分组后，3/7 个 action-score strata 跨越多个 group；但这些跨组现象均有 singleton、来源效应或独立视频不足限制。
4. 当前最稳妥的核心发现是“ordinal score 内存在连续的、多维定量异质性”，而不是已经发现若干离散功能障碍类型。
5. Outlier 与 group medoid 提供了比随机选视频更有效的 case-study 复核入口。
6. 后续采集应优先增加独立源视频和缺失 profile 覆盖，而不是简单增加同一视频中的 rep 数。

## 复现命令

\`npm run data:pilot:profiles:label-free\`
`;
}

function writeOutputs(outputDir, payload) {
  fs.mkdirSync(outputDir, { recursive: true });
  const heatmaps = Object.fromEntries(
    Object.values(payload.analysis.actions).map((action) => [
      `profile-heatmap-${action.actionType}.svg`,
      heatmapSvg(action),
    ]),
  );
  const files = {
    "label-free-profile-analysis.json": `${JSON.stringify(payload, null, 2)}\n`,
    "label-free-profile-assignments.csv": assignmentsCsv(payload.analysis),
    "label-free-profile-groups.csv": groupsCsv(payload.analysis),
    "label-free-profile-outliers.csv": outliersCsv(payload.analysis),
    "label-free-profile-source-effects.csv": sourceEffectsCsv(payload.analysis),
    "label-free-profile-round-a-overlay.csv": consensusOverlayCsv(
      payload.consensusOverlay,
    ),
    "label-free-profile-review-queue.csv": caseReviewQueueCsv(
      payload.caseReviewQueue,
    ),
    "label-free-profile-report.md": buildReport(payload),
    ...heatmaps,
  };
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(outputDir, name), content);
  }
  fs.writeFileSync(
    path.join(outputDir, "label-free-profile-SHA256SUMS"),
    `${Object.entries(files)
      .map(([name, content]) => `${sha256(content)}  ${name}`)
      .join("\n")}\n`,
  );
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const { outputDir, ...sourcePaths } = options;
  const sources = loadPilotPoolSources(sourcePaths);
  const pool = summarizePilotPoolUtilization({
    canonical: sources.canonical.payload,
    blindability: sources.blindability.payload,
    featureMatrix: sources.featureMatrix.payload,
    formalManifest: sources.formalManifest.payload,
    agreement: sources.agreement.payload,
    featureContract: sources.featureContract.payload,
  });
  const analysis = analyzeLabelFreeProfiles({
    rows: pool.rows,
    featureContract: sources.featureContract.payload,
  });
  const consensusOverlay = summarizeConsensusOverlay({
    analysis,
    comparisonRows: sources.agreement.payload.analysis.comparisonRows,
  });
  const caseReviewQueue = buildCaseReviewQueue({
    analysis,
    consensusOverlay,
    canonical: sources.canonical.payload,
  });
  const payload = {
    schemaVersion: "ai_fms_label_free_profile_analysis_v1",
    generatedAt: new Date().toISOString(),
    sourceSnapshotId: pilotPoolSnapshotId(sources),
    sources: sourceMetadata(sources),
    analysisPolicy: {
      labelFree: true,
      historicalScoresExcluded: true,
      roundAConsensusExcluded: true,
      roundAConsensusPosthocOverlay: true,
      qualityFeaturesExcludedFromDistance: true,
      robustZClip: 4,
      grouping: "deterministic_k_medoids_exploratory",
      sourceVideoEffectIsHeuristic: true,
    },
    analysis,
    consensusOverlay,
    caseReviewQueue,
  };
  const resolvedOutputDir = path.resolve(outputDir);
  writeOutputs(resolvedOutputDir, payload);
  process.stdout.write(
    `${JSON.stringify(
      {
        outputDir: resolvedOutputDir,
        featureReadyCount: analysis.featureReadyCount,
        sourceVideoCount: analysis.sourceVideoCount,
        actions: Object.fromEntries(
          Object.entries(analysis.actions).map(([actionType, action]) => [
            actionType,
            {
              reps: action.count,
              videos: action.sourceVideoCount,
              groups: action.groupCount,
              meanSilhouette: action.meanSilhouette,
              clusterQuality: action.clusterQuality,
              sourceVideoEffect: action.sourceVideoEffect,
            },
          ]),
        ),
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
