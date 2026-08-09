import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { summarizeMovementProfiles } from "../src/lib/movement-profile-analysis.js";

const DEFAULT_AGREEMENT =
  "research/pilot-v1/generated/round-a-agreement/round-a-agreement.json";
const DEFAULT_AGREEMENT_CHECKSUMS =
  "research/pilot-v1/generated/round-a-agreement/round-a-agreement-SHA256SUMS";
const DEFAULT_FEATURE_MATRIX =
  "research/pilot-v1/generated/quantitative-feature-matrix.json";
const DEFAULT_FEATURE_CHECKSUMS =
  "research/pilot-v1/generated/feature-matrix-SHA256SUMS";
const DEFAULT_FEATURE_CONTRACT = "research/pilot-v1/feature-contract.json";
const DEFAULT_OUTPUT_DIR =
  "research/pilot-v1/generated/round-a-movement-profiles";

const ACTION_LABELS = {
  active_straight_leg_raise: "Active Straight Leg Raise",
  deep_squat: "Deep Squat",
  hurdle_step: "Hurdle Step",
  rotary_stability: "Rotary Stability",
};

function parseArgs(argv) {
  const options = {
    agreementPath: DEFAULT_AGREEMENT,
    agreementChecksumsPath: DEFAULT_AGREEMENT_CHECKSUMS,
    featureMatrixPath: DEFAULT_FEATURE_MATRIX,
    featureChecksumsPath: DEFAULT_FEATURE_CHECKSUMS,
    featureContractPath: DEFAULT_FEATURE_CONTRACT,
    outputDir: DEFAULT_OUTPUT_DIR,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--agreement") {
      options.agreementPath = argv[++index];
    } else if (argument === "--agreement-checksums") {
      options.agreementChecksumsPath = argv[++index];
    } else if (argument === "--feature-matrix") {
      options.featureMatrixPath = argv[++index];
    } else if (argument === "--feature-checksums") {
      options.featureChecksumsPath = argv[++index];
    } else if (argument === "--feature-contract") {
      options.featureContractPath = argv[++index];
    } else if (argument === "--output-dir") {
      options.outputDir = argv[++index];
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return options;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function readChecksumFile(checksumPath) {
  return new Map(
    fs
      .readFileSync(checksumPath, "utf8")
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const match = line.match(/^([a-f0-9]{64})\s+(.+)$/i);
        if (!match) {
          throw new Error(`Invalid checksum line in ${checksumPath}: ${line}`);
        }
        return [match[2].trim(), match[1].toLowerCase()];
      }),
  );
}

function readVerifiedJson(filePath, checksumPath) {
  const resolvedPath = path.resolve(filePath);
  const raw = fs.readFileSync(resolvedPath);
  const checksums = readChecksumFile(path.resolve(checksumPath));
  const expected = checksums.get(path.basename(resolvedPath));
  const actual = sha256(raw);
  if (!expected) {
    throw new Error(`No checksum entry found for ${resolvedPath}.`);
  }
  if (expected !== actual) {
    throw new Error(`SHA-256 mismatch for ${resolvedPath}.`);
  }
  return {
    path: path.relative(process.cwd(), resolvedPath),
    sha256: actual,
    payload: JSON.parse(raw.toString("utf8")),
  };
}

function readJson(filePath) {
  const resolvedPath = path.resolve(filePath);
  const raw = fs.readFileSync(resolvedPath);
  return {
    path: path.relative(process.cwd(), resolvedPath),
    sha256: sha256(raw),
    payload: JSON.parse(raw.toString("utf8")),
  };
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

function formatNumber(value, digits = 3) {
  return Number.isFinite(value) ? value.toFixed(digits) : "N/A";
}

function scoreDistribution(scoreGroups) {
  return Object.entries(scoreGroups)
    .map(([score, group]) => `${score}: ${group.count}`)
    .join("; ");
}

function actionCaution(actionType, action) {
  if (Object.keys(action.scoreGroups).length < 2) {
    return "只有一个 consensus score，不能做跨分数比较。";
  }
  if (action.scoreContrast?.fullyConfoundedByVideo) {
    return "不同分数组没有共同源视频，跨分数差异同时也是跨视频差异。";
  }
  if (action.count < 8) {
    return "样本很小，只能作描述性分析。";
  }
  if (actionType === "hurdle_step") {
    return "部分支撑腿特征受机位限制并存在缺失。";
  }
  return "仅作探索性描述比较。";
}

function strongestContrasts(action) {
  const features = Object.entries(action.scoreContrast?.features ?? {})
    .filter(([, feature]) => Number.isFinite(feature.hedgesG))
    .sort(
      ([, left], [, right]) => Math.abs(right.hedgesG) - Math.abs(left.hedgesG),
    )
    .slice(0, 3);
  return features.length
    ? features
        .map(
          ([name, feature]) =>
            `\`${name}\` g=${formatNumber(feature.hedgesG, 2)}`,
        )
        .join(", ")
    : "无法估计";
}

function candidateSummary(candidate) {
  const differences = candidate.topDifferences
    .map(
      (difference) =>
        `${difference.featureName} (${formatNumber(difference.leftValue)} vs ${formatNumber(difference.rightValue)})`,
    )
    .join("; ");
  const sourceNote = candidate.sameVideoLimitation
    ? "仅同一源视频"
    : "不同源视频";
  return `| ${candidate.score} | \`${candidate.leftRepetitionId}\` / \`${candidate.rightRepetitionId}\` | ${formatNumber(candidate.standardizedDistance, 2)} | ${sourceNote} | ${differences} |`;
}

function buildReport(payload) {
  const analysis = payload.analysis;
  const actionRows = Object.entries(analysis.byAction)
    .map(
      ([actionType, action]) =>
        `| ${ACTION_LABELS[actionType] ?? actionType} | ${action.count} | ${action.videoCount} | ${scoreDistribution(action.scoreGroups)} | ${actionCaution(actionType, action)} |`,
    )
    .join("\n");
  const contrastSections = Object.entries(analysis.byAction)
    .map(([actionType, action]) => {
      if (!action.scoreContrast) {
        return `- **${ACTION_LABELS[actionType] ?? actionType}：**无跨分数比较；${actionCaution(actionType, action)}`;
      }
      return `- **${ACTION_LABELS[actionType] ?? actionType} ${action.scoreContrast.lowerScore} vs ${action.scoreContrast.higherScore}：**绝对值最大的探索性标准化差异为 ${strongestContrasts(action)}。${actionCaution(actionType, action)}`;
    })
    .join("\n");
  const candidateRows = Object.entries(analysis.byAction)
    .flatMap(([actionType, action]) => {
      if (!action.caseStudyCandidates.length) {
        return [];
      }
      return [
        `\n### ${ACTION_LABELS[actionType] ?? actionType}\n\n| Score | Repetitions | Profile distance | 来源关系 | 最大 feature 差异 |\n| ---: | --- | ---: | --- | --- |`,
        ...action.caseStudyCandidates.map(candidateSummary),
      ];
    })
    .join("\n");

  return `# AI-FMS Round A 定量 Movement Profiles

## 分析范围

- Pilot：\`${analysis.pilotId}\`
- Round：\`${analysis.studyRound}\`
- Consensus 定义：两位独立盲评 reviewer 均判为可评分，且给出相同的 FMS RAW SCORE。
- Consensus-scored reps：${analysis.consensusCount} 条，来自 ${analysis.videoCount} 个源视频。
- Feature-ready reps：${analysis.featureReadyCount}/${analysis.consensusCount}。
- Pose/feature contract：\`${payload.featureContractVersion}\`。
- Agreement 输入 SHA-256：\`${payload.sources.agreement.sha256}\`。
- Feature matrix 输入 SHA-256：\`${payload.sources.featureMatrix.sha256}\`。

## 数据覆盖

| 动作 | Reps | 源视频 | Consensus score 分布 | 主要限制 |
| --- | ---: | ---: | --- | --- |
${actionRows}

## 探索性跨分数比较

Hedges' g 仅对 movement features 计算，方向为高分组减低分组。这些数值只用于描述和选择 case study，不是经过验证的效应，也不能解释为因果关系。

${contrastSections}

## 同分不同 Profile 候选

Profile distance 是动作内标准化 movement features 差异的均方根。可见度、timing coverage 等 quality features 不进入距离；在同分组允许时优先选择不同源视频。
${candidateRows}

## 解释边界

结果把本项目的核心研究假设转成了可审阅证据：相同的 FMS ordinal score 内部，可以存在不同的 pose-derived movement profiles。候选配对适合继续由人复核，并用于申请材料中的 case study；但它们目前不能直接对应某一种功能限制、代偿机制、受伤风险或医学诊断。建立这种关联仍需要领域专家复核、更明确的标签和更大的独立样本。

本分析有意不使用 Round B。Round B 完成后可以重新生成扩展结果，而不会改写冻结的 Round A 证据。历史上带分数的文件名、legacy AI score 和 reviewer comment 均不进入定量计算。

## 复现命令

\`npm run study:profiles:round-a\`
`;
}

function consensusCsv(analysis) {
  const featureNames = [
    ...new Set(analysis.rows.flatMap((row) => Object.keys(row.features))),
  ].sort();
  const rows = analysis.rows.map((row) => ({
    repetitionId: row.repetitionId,
    ingestId: row.ingestId,
    videoId: row.videoId,
    actionType: row.actionType,
    consensusScore: row.consensusScore,
    leftReviewerId: row.reviewerEvidence.leftReviewerId,
    leftConfidence: row.reviewerEvidence.leftConfidence,
    rightReviewerId: row.reviewerEvidence.rightReviewerId,
    rightConfidence: row.reviewerEvidence.rightConfidence,
    cameraView: row.cameraView,
    side: row.side,
    startSecond: row.startSecond,
    endSecond: row.endSecond,
    analysisReadiness: row.quality?.analysisReadiness,
    ...Object.fromEntries(
      featureNames.map((featureName) => [
        featureName,
        row.features[featureName] ?? null,
      ]),
    ),
  }));
  return toCsv(rows, [
    "repetitionId",
    "ingestId",
    "videoId",
    "actionType",
    "consensusScore",
    "leftReviewerId",
    "leftConfidence",
    "rightReviewerId",
    "rightConfidence",
    "cameraView",
    "side",
    "startSecond",
    "endSecond",
    "analysisReadiness",
    ...featureNames,
  ]);
}

function featureSummaryCsv(analysis) {
  const rows = Object.entries(analysis.byAction).flatMap(
    ([actionType, action]) =>
      Object.entries(action.scoreGroups).flatMap(([score, group]) =>
        Object.entries(group.featureStatistics).map(
          ([featureName, statistics]) => ({
            actionType,
            score,
            featureName,
            role: statistics.role,
            unit: statistics.unit,
            direction: statistics.direction,
            count: statistics.count,
            missingCount: statistics.missingCount,
            min: statistics.min,
            q1: statistics.q1,
            median: statistics.median,
            mean: statistics.mean,
            q3: statistics.q3,
            max: statistics.max,
            standardDeviation: statistics.standardDeviation,
          }),
        ),
      ),
  );
  return toCsv(rows, [
    "actionType",
    "score",
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

function candidateCsv(analysis) {
  const rows = Object.entries(analysis.byAction).flatMap(
    ([actionType, action]) =>
      action.caseStudyCandidates.map((candidate) => ({
        actionType,
        score: candidate.score,
        leftRepetitionId: candidate.leftRepetitionId,
        leftVideoId: candidate.leftVideoId,
        rightRepetitionId: candidate.rightRepetitionId,
        rightVideoId: candidate.rightVideoId,
        crossVideoPreferred: candidate.crossVideoPreferred,
        sameVideoLimitation: candidate.sameVideoLimitation,
        sharedFeatureCount: candidate.sharedFeatureCount,
        standardizedDistance: candidate.standardizedDistance,
        topDifferences: candidate.topDifferences,
      })),
  );
  return toCsv(rows, [
    "actionType",
    "score",
    "leftRepetitionId",
    "leftVideoId",
    "rightRepetitionId",
    "rightVideoId",
    "crossVideoPreferred",
    "sameVideoLimitation",
    "sharedFeatureCount",
    "standardizedDistance",
    "topDifferences",
  ]);
}

function writeOutputs(outputDir, payload) {
  fs.mkdirSync(outputDir, { recursive: true });
  const files = {
    "round-a-movement-profiles.json": `${JSON.stringify(payload, null, 2)}\n`,
    "round-a-consensus-features.csv": consensusCsv(payload.analysis),
    "round-a-feature-summary.csv": featureSummaryCsv(payload.analysis),
    "round-a-case-study-candidates.csv": candidateCsv(payload.analysis),
    "round-a-movement-profile-report.md": buildReport(payload),
  };
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(outputDir, name), content);
  }
  fs.writeFileSync(
    path.join(outputDir, "round-a-movement-profiles-SHA256SUMS"),
    `${Object.entries(files)
      .map(([name, content]) => `${sha256(content)}  ${name}`)
      .join("\n")}\n`,
  );
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const agreement = readVerifiedJson(
    options.agreementPath,
    options.agreementChecksumsPath,
  );
  const featureMatrix = readVerifiedJson(
    options.featureMatrixPath,
    options.featureChecksumsPath,
  );
  const featureContract = readJson(options.featureContractPath);
  const analysis = summarizeMovementProfiles({
    agreement: agreement.payload,
    featureMatrix: featureMatrix.payload,
    featureContract: featureContract.payload,
  });
  const payload = {
    schemaVersion: "ai_fms_round_a_movement_profiles_v1",
    generatedAt: new Date().toISOString(),
    sources: {
      agreement: { path: agreement.path, sha256: agreement.sha256 },
      featureMatrix: {
        path: featureMatrix.path,
        sha256: featureMatrix.sha256,
        matrixFingerprint: featureMatrix.payload.matrixFingerprint,
      },
      featureContract: {
        path: featureContract.path,
        sha256: featureContract.sha256,
      },
    },
    featureContractVersion: featureContract.payload.contractVersion,
    analysisPolicy: {
      consensusOnly: true,
      legacyAiExcluded: true,
      reviewerCommentsExcluded: true,
      qualityFeaturesExcludedFromProfileDistance: true,
      scoreContrasts: "exploratory_descriptive_only",
      roundBIncluded: false,
    },
    analysis,
  };
  const outputDir = path.resolve(options.outputDir);
  writeOutputs(outputDir, payload);
  process.stdout.write(
    `${JSON.stringify(
      {
        outputDir,
        consensusCount: analysis.consensusCount,
        videoCount: analysis.videoCount,
        featureReadyCount: analysis.featureReadyCount,
        actionCounts: Object.fromEntries(
          Object.entries(analysis.byAction).map(([action, summary]) => [
            action,
            summary.count,
          ]),
        ),
        candidateCount: Object.values(analysis.byAction).reduce(
          (sum, summary) => sum + summary.caseStudyCandidates.length,
          0,
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
