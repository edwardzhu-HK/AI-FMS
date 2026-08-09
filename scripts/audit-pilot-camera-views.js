import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const DEFAULTS = {
  canonicalPath: "research/pilot-v1/generated/canonical-pilot.json",
  previewIndexPath:
    "research/pilot-v1/generated/blindability-previews/index.json",
  overridesPath: "research/pilot-v1/camera-view-overrides.json",
  databasePath: "Ingested-data/ai-fms-study-reviews.sqlite",
  outputDir: "research/pilot-v1/generated/camera-view-audit",
};

const CAMERA_VIEWS = new Set(["front", "side", "mixed"]);

function parseArgs(argv) {
  const options = { ...DEFAULTS };
  const argumentMap = {
    "--canonical": "canonicalPath",
    "--preview-index": "previewIndexPath",
    "--overrides": "overridesPath",
    "--database": "databasePath",
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

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function sourceRecord(root, sourcePath) {
  const resolvedPath = path.resolve(root, sourcePath);
  return {
    path: sourcePath,
    sha256: sha256(fs.readFileSync(resolvedPath)),
  };
}

function csvValue(value) {
  if (value == null) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(rows, columns) {
  return `${[columns, ...rows.map((row) => columns.map((key) => row[key]))]
    .map((row) => row.map(csvValue).join(","))
    .join("\n")}\n`;
}

function loadRoundAEvidence(databasePath) {
  if (!fs.existsSync(databasePath)) return new Map();
  const query = `
    with ranked as (
      select repetition_id, reviewer_id, camera_view,
             row_number() over (
               partition by study_round, reviewer_id, repetition_id
               order by created_at desc, rowid desc
             ) as row_rank
      from study_review_events
      where study_round = 'round_a'
        and reviewer_id in ('Ronnie', 'Other Reviewer')
    )
    select repetition_id, reviewer_id, camera_view
    from ranked
    where row_rank = 1
    order by repetition_id, reviewer_id;
  `;
  const result = spawnSync("sqlite3", ["-json", databasePath, query], {
    encoding: "utf8",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(result.stderr || "Unable to read Round A camera views");
  }
  const evidence = new Map();
  for (const row of JSON.parse(result.stdout || "[]")) {
    const reviewers = evidence.get(row.repetition_id) ?? {};
    reviewers[row.reviewer_id] = row.camera_view;
    evidence.set(row.repetition_id, reviewers);
  }
  return evidence;
}

function buildPreviewIndex(previewPayload) {
  const rows = previewPayload.pages.flatMap((page) =>
    page.rows.map((row) => ({ ...row, previewPage: page.pageNumber })),
  );
  const index = new Map();
  for (const row of rows) {
    if (index.has(row.repetitionId)) {
      throw new Error(`Duplicate preview row: ${row.repetitionId}`);
    }
    index.set(row.repetitionId, row);
  }
  return index;
}

function roundAEvidenceStatus(reviewers, auditedView) {
  const ronnie = reviewers?.Ronnie ?? null;
  const other = reviewers?.["Other Reviewer"] ?? null;
  if (!ronnie || !other) return "not_reviewed";
  if (ronnie !== other) return "reviewer_disagreement_visual_resolution";
  return ronnie === auditedView
    ? "reviewer_agreement_match"
    : "reviewer_agreement_mismatch";
}

function groupCounts(rows, key) {
  return Object.fromEntries(
    [...new Set(rows.map((row) => row[key]))]
      .sort()
      .map((value) => [value, rows.filter((row) => row[key] === value).length]),
  );
}

function actionSummary(rows) {
  return [...new Set(rows.map((row) => row.actionType))]
    .sort()
    .map((actionType) => {
      const actionRows = rows.filter((row) => row.actionType === actionType);
      return {
        actionType,
        repetitions: actionRows.length,
        corrected: actionRows.filter((row) => row.auditStatus === "corrected")
          .length,
        views: groupCounts(actionRows, "auditedCameraView"),
      };
    });
}

function buildReport(payload) {
  const actionRows = payload.summary.actions
    .map(
      (row) =>
        `| ${row.actionType} | ${row.repetitions} | ${row.corrected} | ${row.views.front ?? 0} | ${row.views.side ?? 0} | ${row.views.mixed ?? 0} |`,
    )
    .join("\n");
  const review = payload.summary.roundA;
  const roundASection = review.databaseAvailable
    ? `- 正式样本有机位证据：${review.reviewedRepetitions} / 32。
- 两位 reviewer 对机位一致：${review.reviewerAgreements} / ${review.reviewedRepetitions}。
- 双人一致且与本次审计相符：${review.agreementMatches}。
- 双人一致但与本次审计冲突：${review.agreementMismatches}。
- 双人不一致、由 contact sheet 复核解决：${review.reviewerDisagreements}。`
    : "- 本地 Round A 研究数据库不可用；本次运行未执行 reviewer event 交叉检查。";
  return `# AI-FMS Camera View Metadata Audit

生成时间：${payload.generatedAt}

## 结论

- 28 个源视频、110 个 rep 均有 start/middle/end 三帧 contact-sheet 视觉复核。
- 65 条历史机位记录得到确认，45 条建立了可追溯校正；原始 canonical 字段未被覆盖。
- 校正后全池为 front ${payload.summary.auditedViews.front ?? 0}、side ${payload.summary.auditedViews.side ?? 0}、mixed ${payload.summary.auditedViews.mixed ?? 0}。
- 下游若按机位分层，应使用本输出的 \`auditedCameraView\`，同时保留 \`originalCameraView\` 做 lineage。

## 按动作汇总

| Action | Reps | Corrected | Front | Side | Mixed |
| ------ | ---: | --------: | ----: | ---: | ----: |
${actionRows}

## Round A 交叉检查

${roundASection}

## 使用边界

- 这是人工 metadata QA，不是自动 camera-view classifier 的准确率验证。
- \`mixed\` 表示片段存在实质切镜头或斜侧构图，不应硬当成单一 front/side 证据。
- Contact sheet 只抽取三帧；若某个 case study 对机位高度敏感，仍需回看完整 rep 视频。
- 本审计不改变人工 RAW SCORE，也不把 pose 参数解释成医疗诊断或功能障碍确诊。
`;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const root = process.cwd();
  const canonical = readJson(path.resolve(root, options.canonicalPath));
  const previewPayload = readJson(path.resolve(root, options.previewIndexPath));
  const overrides = readJson(path.resolve(root, options.overridesPath));
  const databasePath = path.resolve(root, options.databasePath);
  const outputDir = path.resolve(root, options.outputDir);

  if (overrides.schemaVersion !== "ai_fms_camera_view_overrides_v1") {
    throw new Error(`Unsupported overrides schema: ${overrides.schemaVersion}`);
  }

  const previewIndex = buildPreviewIndex(previewPayload);
  const repetitionIndex = new Map(
    canonical.repetitions.map((row) => [row.repetitionId, row]),
  );
  if (previewIndex.size !== canonical.repetitions.length) {
    throw new Error(
      `Preview coverage mismatch: ${previewIndex.size}/${canonical.repetitions.length}`,
    );
  }
  if (
    overrides.scope.repetitions !== canonical.repetitions.length ||
    overrides.scope.sourceVideos !== canonical.videos.length ||
    overrides.scope.previewPages !== previewPayload.pages.length
  ) {
    throw new Error("Camera-view audit scope no longer matches source data");
  }
  for (const repetition of canonical.repetitions) {
    if (!previewIndex.has(repetition.repetitionId)) {
      throw new Error(`Missing preview: ${repetition.repetitionId}`);
    }
  }

  for (const [repetitionId, correction] of Object.entries(
    overrides.corrections,
  )) {
    const repetition = repetitionIndex.get(repetitionId);
    if (!repetition) throw new Error(`Unknown correction: ${repetitionId}`);
    if (!CAMERA_VIEWS.has(correction.cameraView)) {
      throw new Error(`Invalid camera view for ${repetitionId}`);
    }
    if (correction.cameraView === repetition.cameraView) {
      throw new Error(`Correction does not change ${repetitionId}`);
    }
    if (correction.previewPage !== previewIndex.get(repetitionId).previewPage) {
      throw new Error(`Preview page mismatch for ${repetitionId}`);
    }
  }

  const roundAEvidence = loadRoundAEvidence(databasePath);
  const rows = canonical.repetitions.map((repetition) => {
    const correction = overrides.corrections[repetition.repetitionId] ?? null;
    const reviewers = roundAEvidence.get(repetition.repetitionId);
    const auditedCameraView = correction?.cameraView ?? repetition.cameraView;
    return {
      repetitionId: repetition.repetitionId,
      actionType: repetition.actionType,
      videoId: repetition.videoId,
      repetitionIndex: repetition.repetitionIndex,
      originalCameraView: repetition.cameraView,
      auditedCameraView,
      auditStatus: correction ? "corrected" : "confirmed",
      auditEvidence: correction?.evidence ?? overrides.defaultDecision.evidence,
      previewPage: previewIndex.get(repetition.repetitionId).previewPage,
      roundARonnieView: reviewers?.Ronnie ?? null,
      roundAOtherReviewerView: reviewers?.["Other Reviewer"] ?? null,
      roundAEvidenceStatus: roundAEvidenceStatus(reviewers, auditedCameraView),
    };
  });

  const reviewedRows = rows.filter(
    (row) => row.roundAEvidenceStatus !== "not_reviewed",
  );
  if (fs.existsSync(databasePath) && reviewedRows.length !== 32) {
    throw new Error(
      `Round A camera-view coverage is ${reviewedRows.length}/32`,
    );
  }
  const summary = {
    repetitions: rows.length,
    sourceVideos: new Set(rows.map((row) => row.videoId)).size,
    previewPages: previewPayload.pages.length,
    confirmed: rows.filter((row) => row.auditStatus === "confirmed").length,
    corrected: rows.filter((row) => row.auditStatus === "corrected").length,
    originalViews: groupCounts(rows, "originalCameraView"),
    auditedViews: groupCounts(rows, "auditedCameraView"),
    actions: actionSummary(rows),
    roundA: {
      databaseAvailable: fs.existsSync(databasePath),
      reviewedRepetitions: reviewedRows.length,
      reviewerAgreements: reviewedRows.filter(
        (row) => row.roundARonnieView === row.roundAOtherReviewerView,
      ).length,
      reviewerDisagreements: reviewedRows.filter(
        (row) => row.roundARonnieView !== row.roundAOtherReviewerView,
      ).length,
      agreementMatches: reviewedRows.filter(
        (row) => row.roundAEvidenceStatus === "reviewer_agreement_match",
      ).length,
      agreementMismatches: reviewedRows.filter(
        (row) => row.roundAEvidenceStatus === "reviewer_agreement_mismatch",
      ).length,
    },
  };
  if (summary.roundA.agreementMismatches > 0) {
    throw new Error("Audited views conflict with Round A reviewer consensus");
  }

  const payload = {
    schemaVersion: "ai_fms_camera_view_audit_v1",
    generatedAt: new Date().toISOString(),
    source: {
      canonical: sourceRecord(root, options.canonicalPath),
      previewIndex: sourceRecord(root, options.previewIndexPath),
      overrides: sourceRecord(root, options.overridesPath),
      database: fs.existsSync(databasePath)
        ? sourceRecord(root, options.databasePath)
        : null,
    },
    summary,
    rows,
  };

  fs.mkdirSync(outputDir, { recursive: true });
  const outputs = {
    "camera-view-audit.json": `${JSON.stringify(payload, null, 2)}\n`,
    "camera-view-audit.csv": toCsv(rows, [
      "repetitionId",
      "actionType",
      "videoId",
      "repetitionIndex",
      "originalCameraView",
      "auditedCameraView",
      "auditStatus",
      "auditEvidence",
      "previewPage",
      "roundARonnieView",
      "roundAOtherReviewerView",
      "roundAEvidenceStatus",
    ]),
    "camera-view-audit-report.md": buildReport(payload),
  };
  for (const [name, content] of Object.entries(outputs)) {
    fs.writeFileSync(path.join(outputDir, name), content);
  }
  const checksums = Object.entries(outputs)
    .map(([name, content]) => `${sha256(content)}  ${name}`)
    .join("\n");
  fs.writeFileSync(path.join(outputDir, "SHA256SUMS"), `${checksums}\n`);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
}
