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
  targetedAuditPath: "research/pilot-v1/round-a-targeted-ai-audit.json",
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
    "--targeted-audit": "targetedAuditPath",
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
  const sensitivity = payload.protocolSensitivity.analysis;
  const sensitivityMetrics = sensitivity.metrics;
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

## 九条定向复核后的敏感性结果

- 原始基线保持不变：${metrics.exactCount}/${metrics.comparedCount} 完全同分，不用复核结果反向改写已冻结数字。
- 补入视觉与双 reviewer 一致确认的 Deep Squat protocol metadata 后，可比较条目为 ${sensitivity.comparisonEligibleCount} 条；完全同分 ${sensitivityMetrics.exactCount}/${sensitivityMetrics.comparedCount}（${formatRate(sensitivityMetrics.exactRate)}），相差不超过 1 分 ${sensitivityMetrics.withinOneCount}/${sensitivityMetrics.comparedCount}（${formatRate(sensitivityMetrics.withinOneRate)}）。
- 两条 heels-elevated/FMS board 条目由现有 staged-attempt 规则正确得到 2 分；一条 floor attempt 保留为人工 3、AI raw 2 的真实待研究差异。
- 这一段属于 post-audit protocol sensitivity，不是独立模型验证，也不用于宣称准确率。

九条复核可归成四类：2 条 Deep Squat protocol metadata 已解决；2 条 ASLR 暴露 active-side/pose tracking 或器材摆放问题；4 条 Hurdle 主要缺少全动作轨迹、dowel 方向和可靠机位信息；1 条 Deep Squat floor attempt 保留为 depth proxy 差异。本轮没有据此修改任何评分阈值。

## 最有价值的发现

1. **ASLR 两条低估不是同一种阈值问题。**一条存在 active-side/peak evidence 冲突；另一条同时存在器材摆放错误、reviewer low confidence 和 pose tracking 疑点。它们应先进入 timing/pose QA。
2. **Hurdle Step 缺的是全周期证据。**人工扣分主要来自恢复阶段的膝踝轨迹、动态躯干控制和 dowel 方向；当前 peak-frame proxy 没有完整表达这些信息。
3. **Deep Squat protocol metadata 可以解释两条差异。**两条 heels-elevated/FMS board attempt 在字段补齐后由现有 staged rule 正确得到 2 分；floor attempt 的 raw pose 2 与人工 3 继续保留为研究差异。
4. **Rotary Stability 保持 feature-only 是正确的边界。**8 条共识 rep 均没有生成未经验证的 AI 总分。

## 解释边界

这些数字是小样本、来源视频不独立条件下的 exploratory concordance，不是模型准确率声明。虽然运行时没有把人工标签传入建议生成器，但现有规则的早期开发可能接触过同一批公开视频，因此这也不是独立 held-out validation。负的 weighted kappa 说明当前规则总分不能被描述为可靠评分器；同时，连续角度、距离和动作 profile 的研究价值并不因此消失。下一步应优先修复明确的数据与规则问题，再决定是否定向补采独立视频。

AI 建议先对全部 110 条审计后 feature rows 独立生成，再连接 Round A 人工共识。生成器收到的 notes 和 fileName 均为空，历史人工分数、legacy AI score 和 reviewer comment 均不进入建议计算。

## 复现

- 命令：\`npm run study:ai-evidence:round-a\`
- 视觉复核：\`npm run study:ai-evidence:audit-previews\`
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
    "protocolMetadataSource",
    "attemptCondition",
  ];
  return toCsv(rows, columns);
}

function targetedAuditCsv(rows) {
  return toCsv(
    rows.map((row) => ({
      repetitionId: row.repetitionId,
      actionType: row.actionType,
      humanConsensusScore: row.humanConsensusScore,
      aiSuggestedScore: row.aiSuggestedScore,
      reviewerConfidence: row.reviewerConfidence,
      cameraView: row.cameraView,
      classification: row.classification,
      decision: row.decision,
      attemptCondition: row.protocolMetadata?.attemptCondition ?? null,
      recommendedAction: row.recommendedAction,
    })),
    [
      "repetitionId",
      "actionType",
      "humanConsensusScore",
      "aiSuggestedScore",
      "reviewerConfidence",
      "cameraView",
      "classification",
      "decision",
      "attemptCondition",
      "recommendedAction",
    ],
  );
}

function protocolSensitivitySummary({ baseline, audited }) {
  const baselineRows = new Map(
    baseline.analysis.rows.map((row) => [row.repetitionId, row]),
  );
  const changedRows = audited.analysis.rows
    .map((row) => {
      const before = baselineRows.get(row.repetitionId);
      if (!before) throw new Error(`Missing baseline row ${row.repetitionId}`);
      const changedFields = [
        "aiSuggestedScore",
        "rawPoseScore",
        "suggestionStatus",
        "comparisonEligible",
        "exclusionReason",
        "attemptCondition",
        "protocolMetadataSource",
      ].filter((key) => before[key] !== row[key]);
      return changedFields.length
        ? {
            repetitionId: row.repetitionId,
            actionType: row.actionType,
            changedFields,
            baselineAiSuggestedScore: before.aiSuggestedScore,
            auditedAiSuggestedScore: row.aiSuggestedScore,
            baselineExclusionReason: before.exclusionReason,
            auditedExclusionReason: row.exclusionReason,
            auditedAttemptCondition: row.attemptCondition,
          }
        : null;
    })
    .filter(Boolean);
  return {
    policy: {
      postRoundAAudit: true,
      reviewerProtocolObservationsUsed: true,
      reviewerScoresUsedToTuneThresholds: false,
      baselineAnalysisPreserved: true,
      interpretation: "protocol_metadata_sensitivity_not_validation",
    },
    changedRows,
    suggestionUniverse: audited.suggestionUniverse,
    analysis: audited.analysis,
  };
}

function validateTargetedAudit(targetedAudit, analysis) {
  if (
    targetedAudit.schemaVersion !== "ai_fms_round_a_targeted_ai_audit_v1" ||
    !Array.isArray(targetedAudit.rows)
  ) {
    throw new Error("targeted AI audit schema or rows are invalid");
  }
  const expectedRows = analysis.followUpQueue.filter(
    (row) => row.priority !== "expected_boundary",
  );
  const expected = new Map(expectedRows.map((row) => [row.repetitionId, row]));
  const seen = new Set();
  for (const row of targetedAudit.rows) {
    if (seen.has(row.repetitionId)) {
      throw new Error(`duplicate targeted audit row ${row.repetitionId}`);
    }
    seen.add(row.repetitionId);
    const baseline = expected.get(row.repetitionId);
    if (!baseline) {
      throw new Error(`unexpected targeted audit row ${row.repetitionId}`);
    }
    if (
      row.actionType !== baseline.actionType ||
      row.humanConsensusScore !== baseline.humanConsensusScore ||
      row.aiSuggestedScore !== baseline.aiSuggestedScore
    ) {
      throw new Error(`targeted audit baseline drift ${row.repetitionId}`);
    }
    const attemptCondition = row.protocolMetadata?.attemptCondition;
    if (
      attemptCondition &&
      !["floor", "heels_elevated_board"].includes(attemptCondition)
    ) {
      throw new Error(
        `invalid audited attempt condition ${row.repetitionId}: ${attemptCondition}`,
      );
    }
  }
  if (seen.size !== expected.size) {
    throw new Error(
      `targeted AI audit coverage mismatch: ${seen.size}/${expected.size}`,
    );
  }
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
  const targetedAuditRaw = fs.readFileSync(resolve(options.targetedAuditPath));
  const targetedAudit = JSON.parse(targetedAuditRaw.toString("utf8"));
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
  validateTargetedAudit(targetedAudit, analysis);
  const auditedSuggestionUniverse = buildLeakageFreeAiSuggestions({
    featureMatrix: featureMatrix.payload,
    canonical: canonical.payload,
    protocolMetadataAudit: targetedAudit,
  });
  const auditedAnalysis = summarizeAiConsensusEvidence({
    agreement: agreement.payload,
    suggestions: auditedSuggestionUniverse,
  });
  const protocolSensitivity = protocolSensitivitySummary({
    baseline: { suggestionUniverse, analysis },
    audited: {
      suggestionUniverse: auditedSuggestionUniverse,
      analysis: auditedAnalysis,
    },
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
      targetedAudit: {
        path: options.targetedAuditPath,
        sha256: sha256(targetedAuditRaw),
        schemaVersion: targetedAudit.schemaVersion,
      },
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
    protocolSensitivity,
  };
  const outputDir = resolve(options.outputDir);
  fs.mkdirSync(outputDir, { recursive: true });
  const outputs = {
    "round-a-ai-consensus-analysis.json": `${JSON.stringify(payload, null, 2)}\n`,
    "round-a-ai-consensus-comparison.csv": comparisonCsv(analysis.rows),
    "round-a-ai-follow-up-queue.csv": followUpCsv(analysis.followUpQueue),
    "round-a-ai-targeted-audit.csv": targetedAuditCsv(targetedAudit.rows),
    "round-a-ai-protocol-sensitivity-comparison.csv": comparisonCsv(
      auditedAnalysis.rows,
    ),
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
        protocolSensitivity: {
          changedRows: protocolSensitivity.changedRows.length,
          comparisonEligibleCount: auditedAnalysis.comparisonEligibleCount,
          exactRate: auditedAnalysis.metrics.exactRate,
          withinOneRate: auditedAnalysis.metrics.withinOneRate,
          meanAbsoluteDifference:
            auditedAnalysis.metrics.meanAbsoluteDifference,
        },
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
