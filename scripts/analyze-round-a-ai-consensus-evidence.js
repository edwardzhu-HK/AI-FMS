import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildLeakageFreeAiSuggestions,
  summarizeAiConsensusEvidence,
} from "../src/lib/round-a-ai-consensus-analysis.js";

const DEFAULTS = {
  agreementPath:
    "research/pilot-v1/generated/round-a-agreement/round-a-agreement.json",
  agreementChecksumsPath:
    "research/pilot-v1/generated/round-a-agreement/round-a-agreement-SHA256SUMS",
  featureMatrixPath:
    "research/pilot-v1/generated/camera-audited-features/camera-audited-feature-matrix.json",
  featureChecksumsPath:
    "research/pilot-v1/generated/camera-audited-features/SHA256SUMS",
  canonicalPath: "research/pilot-v1/generated/canonical-pilot.json",
  canonicalChecksumsPath: "research/pilot-v1/generated/SHA256SUMS",
  outputDir: "research/pilot-v1/generated/round-a-ai-evidence",
};

const RULE_FILES = [
  "src/constants/scoring.js",
  "src/lib/movement-adapters.js",
  "src/lib/deep-squat-suggestion.js",
  "src/lib/deep-squat-attempt-condition.js",
  "src/lib/deep-squat-board-detector.js",
  "src/lib/aslr-suggestion.js",
  "src/lib/hurdle-step-suggestion.js",
];

function parseArgs(argv) {
  const options = { ...DEFAULTS };
  const map = {
    "--agreement": "agreementPath",
    "--agreement-checksums": "agreementChecksumsPath",
    "--feature-matrix": "featureMatrixPath",
    "--feature-checksums": "featureChecksumsPath",
    "--canonical": "canonicalPath",
    "--canonical-checksums": "canonicalChecksumsPath",
    "--output-dir": "outputDir",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const key = map[argv[index]];
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

function readChecksums(filePath) {
  return new Map(
    fs
      .readFileSync(filePath, "utf8")
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const match = line.match(/^([a-f0-9]{64})\s+\*?(.+)$/i);
        if (!match) throw new Error(`Invalid checksum line: ${line}`);
        return [match[2].trim(), match[1].toLowerCase()];
      }),
  );
}

function readVerifiedJson(filePath, checksumPath) {
  const raw = fs.readFileSync(filePath);
  const expected = readChecksums(checksumPath).get(path.basename(filePath));
  const actual = sha256(raw);
  if (!expected || expected !== actual) {
    throw new Error(`SHA-256 verification failed for ${filePath}`);
  }
  return { payload: JSON.parse(raw.toString("utf8")), sha256: actual };
}

function csvValue(value) {
  if (value == null) return "";
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

function formatRate(value) {
  return value == null ? "N/A" : `${(value * 100).toFixed(1)}%`;
}

function actionSummaryRows(analysis) {
  return Object.entries(analysis.byAction)
    .map(([actionType, item]) => {
      const metrics = item.metrics;
      return `| ${actionType} | ${item.consensusCount} | ${item.comparisonEligibleCount} | ${metrics.exactCount}/${metrics.comparedCount} | ${formatRate(metrics.withinOneRate)} | ${metrics.meanAbsoluteDifference ?? "N/A"} |`;
    })
    .join("\n");
}

function buildReport(payload) {
  const analysis = payload.analysis;
  const metrics = analysis.metrics;
  return `# Round A AI Evidence 与人工共识比较

## 一句话结论

现有 pose-derived 参数已经能够提供有价值的连续动作证据，但当前规则式 AI 总分尚未达到可替代人工 FMS RAW SCORE 的水平；它应继续作为 reviewer 的解释与提示层。

## 覆盖范围

- Round A 双方同分共识：${analysis.consensusCount} 条，其中 feature-ready ${analysis.featureReadyCount} 条。
- 可生成并比较 AI 总分：${analysis.comparisonEligibleCount} 条。
- 未比较：${analysis.excludedCount} 条，其中 Rotary Stability 继续 feature-only，Deep Squat 缺少结构化 staged-attempt metadata 时按规则拒绝给分。
- 全 110 条中 feature-ready ${payload.suggestionUniverse.summary.featureReady} 条；严格满足质量门槛且可生成总分 ${payload.suggestionUniverse.summary.comparisonEligible} 条。

## 探索性结果

- 完全同分：${metrics.exactCount}/${metrics.comparedCount}（${formatRate(metrics.exactRate)}）。
- 相差不超过 1 分：${metrics.withinOneCount}/${metrics.comparedCount}（${formatRate(metrics.withinOneRate)}）。
- 平均绝对分差：${metrics.meanAbsoluteDifference}。
- Linear / quadratic weighted kappa：${metrics.linearWeightedKappa} / ${metrics.quadraticWeightedKappa}。
- AI 高于人工 ${metrics.aiHigherCount} 条，低于人工 ${metrics.aiLowerCount} 条。总体均值会掩盖动作之间不同方向的偏差。
- 定向复核项：${analysis.actionableFollowUpCount} 条；另有 8 条 Rotary 为预期的 feature-only 边界。

| Action | Consensus | AI-comparable | Exact | Within 1 | MAE |
| --- | ---: | ---: | ---: | ---: | ---: |
${actionSummaryRows(analysis)}

## 最有价值的发现

1. **ASLR 出现两条 2 分级低估。**人工均为 3 分，但 AI 给出 1 分，主要由 stationary-leg control proxy 触发。这是最高优先级的阈值/动作定义复核项。
2. **Hurdle Step 对人工 2 分有偏高倾向。**4 条人工 2 分中只有 1 条完全一致，3 条被 AI 判为 3；说明现有几何 proxy 尚未覆盖人工看到的全部定性扣分依据。
3. **Deep Squat 的主要障碍是 protocol metadata。**两条共识 rep 因系统不知道它属于 floor 还是 heels-elevated/FMS board attempt 而主动拒绝给最终分；另有 1 条可比较 rep 比人工高 1 分。这些都应进入复核，metadata 不应靠文件名补回。
4. **Rotary Stability 保持 feature-only 是正确的边界。**8 条共识 rep 均没有生成未经验证的 AI 总分。

## 解释边界

这些数字是小样本、来源视频不独立条件下的 exploratory concordance，不是模型准确率声明。虽然运行时没有把人工标签传入建议生成器，但现有规则的早期开发可能接触过同一批公开视频，因此这也不是独立 held-out validation。负的 weighted kappa 说明当前规则总分不能被描述为可靠评分器；同时，连续角度、距离和动作 profile 的研究价值并不因此消失。下一步应优先修复明确的数据与规则问题，再决定是否定向补采独立视频。

AI 建议先对全部 110 条审计后 feature rows 独立生成，再连接 Round A 人工共识。生成器收到的 notes 和 fileName 均为空，历史人工分数、legacy AI score 和 reviewer comment 均不进入建议计算。

## 复现

- 命令：\`npm run study:ai-evidence:round-a\`
- Rule fingerprint：\`${payload.ruleFingerprint}\`
- Audited feature matrix fingerprint：\`${payload.sources.featureMatrix.matrixFingerprint}\`
`;
}

function comparisonCsv(rows) {
  const columns = [
    "repetitionId",
    "videoId",
    "actionType",
    "cameraView",
    "side",
    "startSecond",
    "endSecond",
    "humanConsensusScore",
    "aiSuggestedScore",
    "rawPoseScore",
    "suggestionStatus",
    "comparisonEligible",
    "exclusionReason",
    "signedDifference",
    "absoluteDifference",
    "exactMatch",
    "withinOnePoint",
    "confidence",
    "confidenceLabel",
    "modelVersion",
  ];
  return toCsv(rows, columns);
}

function followUpCsv(rows) {
  return toCsv(rows, [
    "priority",
    "followUpReason",
    "repetitionId",
    "videoId",
    "actionType",
    "humanConsensusScore",
    "aiSuggestedScore",
    "signedDifference",
    "cameraView",
    "startSecond",
    "endSecond",
  ]);
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const root = process.cwd();
  const resolve = (value) => path.resolve(root, value);
  const agreement = readVerifiedJson(
    resolve(options.agreementPath),
    resolve(options.agreementChecksumsPath),
  );
  const featureMatrix = readVerifiedJson(
    resolve(options.featureMatrixPath),
    resolve(options.featureChecksumsPath),
  );
  const canonical = readVerifiedJson(
    resolve(options.canonicalPath),
    resolve(options.canonicalChecksumsPath),
  );
  const ruleFiles = RULE_FILES.map((rulePath) => ({
    path: rulePath,
    sha256: sha256(fs.readFileSync(resolve(rulePath))),
  }));
  const ruleFingerprint = sha256(
    ruleFiles.map((row) => `${row.path}:${row.sha256}`).join("\n"),
  );
  const suggestionUniverse = buildLeakageFreeAiSuggestions({
    featureMatrix: featureMatrix.payload,
    canonical: canonical.payload,
  });
  const analysis = summarizeAiConsensusEvidence({
    agreement: agreement.payload,
    suggestions: suggestionUniverse,
  });
  const payload = {
    schemaVersion: "ai_fms_round_a_ai_consensus_evidence_v1",
    generatedAt: new Date().toISOString(),
    sources: {
      agreement: { path: options.agreementPath, sha256: agreement.sha256 },
      featureMatrix: {
        path: options.featureMatrixPath,
        sha256: featureMatrix.sha256,
        matrixFingerprint: featureMatrix.payload.matrixFingerprint,
        sourceFeatureMatrixFingerprint:
          featureMatrix.payload.sourceFeatureMatrixFingerprint,
      },
      canonical: { path: options.canonicalPath, sha256: canonical.sha256 },
      ruleFiles,
    },
    ruleFingerprint,
    analysisPolicy: {
      suggestionsGeneratedBeforeHumanScoreJoin: true,
      notesPassedToSuggestionBuilder: false,
      fileNamePassedToSuggestionBuilder: false,
      historicalHumanScoresAvailableToSuggestionBuilder: false,
      legacyAiScoresAvailableToSuggestionBuilder: false,
      reviewerCommentsAvailableToSuggestionBuilder: false,
      runtimeLabelLeakageControlled: true,
      independentHeldOutValidation: false,
      ruleDevelopmentSetOverlapPossible: true,
      featureReadyRequiredForComparison: true,
      rotaryStabilityPolicy: "feature_only",
      interpretation: "exploratory_concordance_not_validation",
      roundBIncluded: false,
    },
    suggestionUniverse,
    analysis,
  };
  const outputDir = resolve(options.outputDir);
  fs.mkdirSync(outputDir, { recursive: true });
  const outputs = {
    "round-a-ai-consensus-analysis.json": `${JSON.stringify(payload, null, 2)}\n`,
    "round-a-ai-consensus-comparison.csv": comparisonCsv(analysis.rows),
    "round-a-ai-follow-up-queue.csv": followUpCsv(analysis.followUpQueue),
    "round-a-ai-consensus-report.md": buildReport(payload),
  };
  for (const [name, content] of Object.entries(outputs)) {
    fs.writeFileSync(path.join(outputDir, name), content);
  }
  fs.writeFileSync(
    path.join(outputDir, "round-a-ai-consensus-SHA256SUMS"),
    `${Object.entries(outputs)
      .map(([name, content]) => `${sha256(content)}  ${name}`)
      .join("\n")}\n`,
  );
  process.stdout.write(
    `${JSON.stringify(
      {
        outputDir,
        consensusCount: analysis.consensusCount,
        comparisonEligibleCount: analysis.comparisonEligibleCount,
        exactRate: analysis.metrics.exactRate,
        withinOneRate: analysis.metrics.withinOneRate,
        meanAbsoluteDifference: analysis.metrics.meanAbsoluteDifference,
        linearWeightedKappa: analysis.metrics.linearWeightedKappa,
        quadraticWeightedKappa: analysis.metrics.quadraticWeightedKappa,
        actionableFollowUpCount: analysis.actionableFollowUpCount,
        followUpCount: analysis.followUpQueue.length,
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
