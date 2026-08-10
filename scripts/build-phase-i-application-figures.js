import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { format } from "prettier";

const DEFAULT_CONFIG = "research/pilot-v1/phase-i-case-study-portfolio.json";

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(
      `${label} drift: expected ${expected}, received ${actual}.`,
    );
  }
}

function assertPublicSafeText(value, label) {
  if (/(?:\/Users\/|\/Volumes\/|file:\/\/)/.test(value)) {
    throw new Error(`${label} contains a local absolute path.`);
  }
}

function getFeatureRow(rowsById, repetitionId, actionType) {
  const row = rowsById.get(repetitionId);
  if (!row) {
    throw new Error(`Missing feature row for ${repetitionId}.`);
  }
  if (row.actionType !== actionType) {
    throw new Error(`Action mismatch for ${repetitionId}.`);
  }
  return row;
}

function buildPairCase({ config, rowsById, actionType }) {
  const left = getFeatureRow(rowsById, config.leftRepetitionId, actionType);
  const right = getFeatureRow(rowsById, config.rightRepetitionId, actionType);
  return {
    caseId: config.caseId,
    status: config.status,
    humanRawScore: config.humanRawScore,
    sourceRelation:
      left.videoId === right.videoId ? "same_video" : "different_video",
    left: {
      repetitionId: left.repetitionId,
      videoId: left.videoId,
      auditedCameraView: left.cameraView,
    },
    right: {
      repetitionId: right.repetitionId,
      videoId: right.videoId,
      auditedCameraView: right.cameraView,
    },
  };
}

export function buildPhaseICaseStudyPortfolio({
  config,
  featureMatrix,
  aslrSensitivity,
  roundBEvidence,
}) {
  assertEqual(
    featureMatrix.matrixFingerprint,
    config.sources.featureMatrixFingerprint,
    "Feature matrix fingerprint",
  );
  assertEqual(
    aslrSensitivity.rowsFingerprint,
    config.sources.aslrSensitivityFingerprint,
    "ASLR sensitivity fingerprint",
  );
  assertEqual(
    roundBEvidence.manifestFingerprint,
    config.sources.roundBEvidenceFingerprint,
    "Round B evidence fingerprint",
  );

  const rowsById = new Map(
    featureMatrix.rows.map((row) => [row.repetitionId, row]),
  );
  const deepSquatBase = buildPairCase({
    config: config.cases.deepSquat,
    rowsById,
    actionType: "deep_squat",
  });
  assertEqual(
    deepSquatBase.left.auditedCameraView,
    config.cases.deepSquat.auditedCameraView,
    "Deep Squat left camera view",
  );
  assertEqual(
    deepSquatBase.right.auditedCameraView,
    config.cases.deepSquat.auditedCameraView,
    "Deep Squat right camera view",
  );
  if (deepSquatBase.sourceRelation !== "different_video") {
    throw new Error("Deep Squat application case must use different videos.");
  }
  const deepSquatRows = [
    rowsById.get(config.cases.deepSquat.leftRepetitionId),
    rowsById.get(config.cases.deepSquat.rightRepetitionId),
  ];
  const deepSquatFeatures = config.cases.deepSquat.features.map((feature) => {
    const values = deepSquatRows.map((row) => row.features?.[feature.name]);
    if (!values.every(Number.isFinite)) {
      throw new Error(`Missing Deep Squat feature ${feature.name}.`);
    }
    return { ...feature, leftValue: values[0], rightValue: values[1] };
  });

  const aslrRowsById = new Map(
    aslrSensitivity.rows.map((row) => [row.repetitionId, row]),
  );
  const aslrRows = config.cases.aslr.repetitionIds.map((repetitionId) => {
    const row = aslrRowsById.get(repetitionId);
    if (!row) {
      throw new Error(`Missing ASLR sensitivity row for ${repetitionId}.`);
    }
    if (row.baseline.status !== "limited") {
      throw new Error(`ASLR baseline is not limited for ${repetitionId}.`);
    }
    return {
      repetitionId,
      baselineStatus: row.baseline.status,
      sensitivityStatus: row.sensitivity.status,
      baselineStrongFrames: row.baseline.metrics?.strongFrameCount ?? 0,
      sensitivityStrongFrames: row.sensitivity.metrics?.strongFrameCount ?? 0,
      dominantSideRatio: row.sensitivity.metrics?.dominantSideRatio ?? null,
      sideSwitchRate: row.sensitivity.metrics?.sideSwitchRate ?? null,
      segmentSideAgreement:
        row.sensitivity.metrics?.segmentSideAgreement ?? "unavailable",
    };
  });
  if (aslrRows.some((row) => row.sensitivityStatus === "limited")) {
    throw new Error("ASLR application case cannot claim recovered evidence.");
  }

  const hurdle = buildPairCase({
    config: config.cases.hurdle,
    rowsById,
    actionType: "hurdle_step",
  });
  assertEqual(
    hurdle.left.auditedCameraView,
    config.cases.hurdle.expectedViews[0],
    "Hurdle left camera view",
  );
  assertEqual(
    hurdle.right.auditedCameraView,
    config.cases.hurdle.expectedViews[1],
    "Hurdle right camera view",
  );

  const rotarySummary = roundBEvidence.summary.byAction.rotary_stability;
  const rotaryFeatureOnly = rotarySummary.byEvidenceStatus.features_only ?? 0;
  assertEqual(
    rotarySummary.total,
    config.cases.rotary.expectedFormalItems,
    "Rotary formal item count",
  );
  assertEqual(
    rotarySummary.aiScoreAvailable,
    config.cases.rotary.expectedAiScoreAvailable,
    "Rotary AI score count",
  );
  assertEqual(
    rotaryFeatureOnly,
    config.cases.rotary.expectedFormalItems,
    "Rotary feature-only count",
  );

  const portfolio = {
    schemaVersion: "ai_fms_phase_i_case_study_portfolio_v1",
    portfolioId: config.portfolioId,
    summary: {
      selectedCases: 4,
      applicationFigures: 2,
      rawMediaIncluded: false,
      personImagesIncluded: false,
    },
    sourceFingerprints: {
      featureMatrix: featureMatrix.matrixFingerprint,
      aslrSensitivity: aslrSensitivity.rowsFingerprint,
      roundBEvidence: roundBEvidence.manifestFingerprint,
    },
    cases: {
      deepSquat: {
        ...deepSquatBase,
        role: "primary_movement_profile_case",
        features: deepSquatFeatures,
        interpretation:
          "The same ordinal score preserves different movement depth and joint-strategy profiles.",
      },
      aslr: {
        caseId: config.cases.aslr.caseId,
        status: config.cases.aslr.status,
        role: "supporting_measurement_reliability_case",
        rows: aslrRows,
        interpretation:
          "Subject-aware extraction recovers continuous evidence without changing the frozen scoring result.",
      },
      hurdle: {
        ...hurdle,
        role: "methodological_view_metadata_case",
        interpretation:
          "A mixed-versus-front view prevents a movement-only interpretation and demonstrates the metadata gate.",
      },
      rotary: {
        caseId: config.cases.rotary.caseId,
        status: config.cases.rotary.status,
        role: "conservative_feature_only_boundary",
        formalItems: rotarySummary.total,
        featureOnlyItems: rotaryFeatureOnly,
        aiScoreAvailable: rotarySummary.aiScoreAvailable,
        interpretation:
          "Quantitative features are retained while an unsupported AI total score is withheld.",
      },
    },
    publicationBoundary: config.publicationBoundary,
  };
  portfolio.portfolioFingerprint = sha256(JSON.stringify(portfolio));
  return portfolio;
}

function formatValue(value, decimals) {
  return Number(value).toFixed(decimals);
}

function deepSquatSvg(portfolio) {
  const features = portfolio.cases.deepSquat.features;
  const caseA = "#0f766e";
  const caseB = "#d97706";
  const rowHeight = 78;
  const startY = 205;
  const rows = features.map((feature, index) => {
    const y = startY + index * rowHeight;
    const maxAbs = Math.max(
      Math.abs(feature.leftValue),
      Math.abs(feature.rightValue),
      0.0001,
    );
    const leftWidth = Math.max(4, (Math.abs(feature.leftValue) / maxAbs) * 260);
    const rightWidth = Math.max(
      4,
      (Math.abs(feature.rightValue) / maxAbs) * 260,
    );
    return `
  <text x="42" y="${y + 15}" font-size="16" font-weight="650" fill="#172033">${escapeXml(feature.label)}</text>
  <text x="42" y="${y + 37}" font-size="12" fill="#64748b">${escapeXml(feature.unit)}</text>
  <rect x="325" y="${y}" width="260" height="16" rx="3" fill="#dbe7e5"/>
  <rect x="325" y="${y}" width="${leftWidth.toFixed(1)}" height="16" rx="3" fill="${caseA}"/>
  <text x="600" y="${y + 13}" font-size="14" font-weight="650" fill="#172033">${formatValue(feature.leftValue, feature.decimals)}</text>
  <rect x="760" y="${y}" width="260" height="16" rx="3" fill="#f4e5cd"/>
  <rect x="760" y="${y}" width="${rightWidth.toFixed(1)}" height="16" rx="3" fill="${caseB}"/>
  <text x="1035" y="${y + 13}" font-size="14" font-weight="650" fill="#172033">${formatValue(feature.rightValue, feature.decimals)}</text>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="760" viewBox="0 0 1200 760" role="img" aria-labelledby="title desc">
  <title id="title">Same FMS score, different Deep Squat movement profile</title>
  <desc id="desc">Two side-view Deep Squat repetitions both received human score 2 but show different pose-derived depth, hip, knee, ankle, and alignment features.</desc>
  <rect width="1200" height="760" fill="#ffffff"/>
  <rect x="0" y="0" width="1200" height="8" fill="#172033"/>
  <text x="42" y="60" font-size="34" font-weight="750" fill="#172033">Same FMS Score, Different Movement Profile</text>
  <text x="42" y="91" font-size="16" fill="#526074">Deep Squat · two different source videos · audited side view · human RAW SCORE 2</text>
  <circle cx="341" cy="137" r="18" fill="${caseA}"/>
  <text x="341" y="143" text-anchor="middle" font-size="17" font-weight="700" fill="#ffffff">2</text>
  <text x="370" y="143" font-size="17" font-weight="700" fill="${caseA}">Case A · shallower / uncertain depth</text>
  <circle cx="776" cy="137" r="18" fill="${caseB}"/>
  <text x="776" y="143" text-anchor="middle" font-size="17" font-weight="700" fill="#ffffff">2</text>
  <text x="805" y="143" font-size="17" font-weight="700" fill="${caseB}">Case B · deeper movement</text>
  <line x1="42" y1="169" x2="1158" y2="169" stroke="#dbe2ea"/>
  ${rows.join("\n  ")}
  <rect x="0" y="680" width="1200" height="80" fill="#eef6f5"/>
  <text x="42" y="712" font-size="18" font-weight="700" fill="#172033">The ordinal score is preserved; the quantitative profile adds how the movement was completed.</text>
  <text x="42" y="739" font-size="13" fill="#526074">Pose-derived 2D proxies, not clinical goniometry or a diagnosis. Bar length is scaled within each feature row; numeric values are authoritative.</text>
</svg>\n`;
}

function statusColor(status) {
  if (status === "good") return "#0f766e";
  if (status === "watch") return "#d97706";
  return "#b42318";
}

function aslrSvg(portfolio) {
  const rows = portfolio.cases.aslr.rows;
  const maxFrames = Math.max(
    ...rows.flatMap((row) => [
      row.baselineStrongFrames,
      row.sensitivityStrongFrames,
    ]),
  );
  const rowBlocks = rows.map((row, index) => {
    const top = 190 + index * 142;
    const baselineWidth = Math.max(
      4,
      (row.baselineStrongFrames / maxFrames) * 660,
    );
    const sensitivityWidth = Math.max(
      4,
      (row.sensitivityStrongFrames / maxFrames) * 660,
    );
    const color = statusColor(row.sensitivityStatus);
    return `
  <text x="42" y="${top}" font-size="15" font-weight="700" fill="#172033">Window ${index + 1}</text>
  <text x="42" y="${top + 25}" font-size="12" fill="#64748b">${escapeXml(row.repetitionId)}</text>
  <text x="190" y="${top + 4}" font-size="12" font-weight="700" fill="#b42318">BASELINE · LIMITED</text>
  <rect x="190" y="${top + 16}" width="660" height="18" rx="3" fill="#f4d8d5"/>
  <rect x="190" y="${top + 16}" width="${baselineWidth.toFixed(1)}" height="18" rx="3" fill="#b42318"/>
  <text x="866" y="${top + 31}" font-size="14" font-weight="700" fill="#172033">${row.baselineStrongFrames} strong frames</text>
  <text x="190" y="${top + 69}" font-size="12" font-weight="700" fill="${color}">SUBJECT-AWARE · ${escapeXml(row.sensitivityStatus.toUpperCase())}</text>
  <rect x="190" y="${top + 81}" width="660" height="18" rx="3" fill="#e4e8ed"/>
  <rect x="190" y="${top + 81}" width="${sensitivityWidth.toFixed(1)}" height="18" rx="3" fill="${color}"/>
  <text x="866" y="${top + 96}" font-size="14" font-weight="700" fill="#172033">${row.sensitivityStrongFrames} strong frames</text>
  <text x="866" y="${top + 119}" font-size="12" fill="#526074">dominance ${row.dominantSideRatio?.toFixed(3) ?? "NA"} · switch ${row.sideSwitchRate?.toFixed(3) ?? "NA"}</text>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720" role="img" aria-labelledby="title desc">
  <title id="title">ASLR subject-aware extraction evidence quality</title>
  <desc id="desc">Three ASLR windows changed from baseline limited to one good and two watch after target-subject ROI or crop, without changing scoring thresholds or frozen evidence.</desc>
  <rect width="1200" height="720" fill="#ffffff"/>
  <rect x="0" y="0" width="1200" height="8" fill="#172033"/>
  <text x="42" y="60" font-size="34" font-weight="750" fill="#172033">When AI Watches the Wrong Person</text>
  <text x="42" y="91" font-size="16" fill="#526074">ASLR measurement reliability · same model and quality gate · target-subject ROI sensitivity</text>
  <rect x="42" y="116" width="1116" height="48" rx="4" fill="#eef6f5"/>
  <text x="64" y="146" font-size="19" font-weight="700" fill="#172033">3 limited windows → 1 good + 2 watch · 0 remain limited</text>
  ${rowBlocks.join("\n  ")}
  <rect x="0" y="656" width="1200" height="64" fill="#f7f2e9"/>
  <text x="42" y="684" font-size="17" font-weight="700" fill="#172033">Human-in-the-loop also means checking subject identity, framing, and protocol quality.</text>
  <text x="42" y="707" font-size="12" fill="#526074">Sensitivity only: frozen Round A / Round B evidence and ASLR scoring thresholds were not changed.</text>
</svg>\n`;
}

function buildReport(portfolio) {
  const deep = portfolio.cases.deepSquat;
  const aslr = portfolio.cases.aslr;
  const hurdle = portfolio.cases.hurdle;
  const rotary = portfolio.cases.rotary;
  const featureRows = deep.features
    .map(
      (feature) =>
        `| \`${feature.name}\` | ${formatValue(feature.leftValue, feature.decimals)} | ${formatValue(feature.rightValue, feature.decimals)} | ${feature.unit} |`,
    )
    .join("\n");
  const aslrRows = aslr.rows
    .map(
      (row) =>
        `| \`${row.repetitionId}\` | ${row.baselineStatus} | ${row.sensitivityStatus} | ${row.baselineStrongFrames} → ${row.sensitivityStrongFrames} |`,
    )
    .join("\n");
  return `# AI-FMS Phase I 案例组合

日期：2026-08-10

状态：application candidate；Round B pending

## 组合原则

本组合不挑选四个都“证明 AI 有效”的案例，而是分别展示项目的发现、质量控制和边界：

1. Deep Squat：同分背后的连续 movement-profile 差异。
2. ASLR：subject selection 如何影响 pose evidence reliability。
3. Hurdle Step：camera-view metadata 如何限制解释。
4. Rotary Stability：证据不足时为什么只显示 features、不硬给 AI 总分。

所有图均不包含人物截图、源文件名、绝对路径或诊断性结论。

## 1. Deep Squat 主案例

两条来自不同源视频、审计后均为 side view 的 Deep Squat rep，由两位 reviewer 在
Round A 均判为 RAW SCORE 2。分数相同，但定量参数不同：

| Feature | Case A | Case B | Unit |
| --- | ---: | ---: | --- |
${featureRows}

可报告结论：FMS ordinal score 保留规则结果；AI-FMS quantitative profile 进一步记录
动作完成程度和策略。它不把参数差异命名为功能障碍。

![Deep Squat same-score movement profile](../assets/phase-i-case-studies/deep-squat-same-score.svg)

## 2. ASLR 测量可靠性案例

三个原 \`limited\` 窗口经 target-subject ROI / crop 后均不再 limited：

| Rep | Baseline | Sensitivity | Strong frames |
| --- | --- | --- | ---: |
${aslrRows}

可报告结论：部分失败来自 AI 跟错主体或画面裁剪，而不是视频中完全没有动作信号。
该结果不覆盖冻结 evidence，也不构成 score accuracy improvement。

![ASLR subject-aware evidence quality](../assets/phase-i-case-studies/aslr-subject-aware-qa.svg)

## 3. Hurdle Step 方法案例

两条 RAW SCORE ${hurdle.humanRawScore} 的 rep 来自不同视频，但审计机位分别为
\`${hurdle.left.auditedCameraView}\` 与 \`${hurdle.right.auditedCameraView}\`。因此参数
差异不能全部归因于动作本身。它展示了 view-aware feature gate 和 metadata lineage 的
必要性，不作为同机位 movement-profile 主证据。

## 4. Rotary Stability 边界案例

正式样本中的 ${rotary.formalItems} 条 Rotary Stability rep 全部保留定量 features，
但 AI RAW SCORE coverage 为 ${rotary.aiScoreAvailable}/${rotary.formalItems}。这不是功能
缺失的掩饰，而是项目的 fail-closed 原则：当前规则证据不足时，宁可展示可追溯特征，
也不输出未经验证的综合分数。

## 申请展示顺序

1. 先用 Deep Squat 图解释项目的科学价值。
2. 再用 ASLR 图解释 human-in-the-loop 和工程严谨性。
3. 口头补充 Hurdle 与 Rotary，说明系统知道自己的边界。

## 发布边界

- 当前图表可作为无人物媒体的 application candidate。
- 仍需完成最终文案、学校平台尺寸和无障碍替代文本检查。
- 不声称医学诊断、临床验证、伤病预测或 validated impairment subtype。
- Round B 完成后只更新 study 结果，不事后改写这些案例的数据来源和质量边界。
`;
}

function parseArgs(argv) {
  const options = { configPath: DEFAULT_CONFIG };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--config" && argv[index + 1]) {
      options.configPath = argv[++index];
    } else {
      throw new Error(`Unknown or incomplete argument: ${argv[index]}`);
    }
  }
  return options;
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const repoRoot = process.cwd();
  const configRaw = fs.readFileSync(path.resolve(repoRoot, options.configPath));
  const config = JSON.parse(configRaw.toString("utf8"));
  const featureMatrix = readJson(
    path.resolve(repoRoot, config.sources.featureMatrixPath),
  );
  const aslrSensitivity = readJson(
    path.resolve(repoRoot, config.sources.aslrSensitivityPath),
  );
  const roundBEvidence = readJson(
    path.resolve(repoRoot, config.sources.roundBEvidencePath),
  );
  const portfolio = buildPhaseICaseStudyPortfolio({
    config,
    featureMatrix,
    aslrSensitivity,
    roundBEvidence,
  });
  portfolio.inputs = {
    config: { path: options.configPath, sha256: sha256(configRaw) },
  };

  const outputs = {
    "case-study-portfolio.json": `${JSON.stringify(portfolio, null, 2)}\n`,
    "deep-squat-same-score.svg": deepSquatSvg(portfolio),
    "aslr-subject-aware-qa.svg": aslrSvg(portfolio),
  };
  for (const [name, content] of Object.entries(outputs)) {
    assertPublicSafeText(content, name);
  }
  const outputDir = path.resolve(repoRoot, config.outputDir);
  fs.mkdirSync(outputDir, { recursive: true });
  for (const [name, content] of Object.entries(outputs)) {
    fs.writeFileSync(path.join(outputDir, name), content);
  }
  fs.writeFileSync(
    path.join(outputDir, "SHA256SUMS"),
    `${Object.entries(outputs)
      .map(([name, content]) => `${sha256(content)}  ${name}`)
      .join("\n")}\n`,
  );

  const report = await format(buildReport(portfolio), { parser: "markdown" });
  assertPublicSafeText(report, config.reportPath);
  const reportPath = path.resolve(repoRoot, config.reportPath);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, report);

  process.stdout.write(
    `${JSON.stringify({ outputDir, reportPath, summary: portfolio.summary }, null, 2)}\n`,
  );
  return portfolio;
}

const isMainModule =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(fileURLToPath(import.meta.url));

if (isMainModule) {
  try {
    await main();
  } catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  }
}
