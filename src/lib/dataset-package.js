import { buildDatasetCsv } from "./dataset-csv.js";

const CRC32_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;

  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }

  return value >>> 0;
});

function crc32(bytes) {
  let value = 0xffffffff;

  for (const byte of bytes) {
    value = CRC32_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8);
  }

  return (value ^ 0xffffffff) >>> 0;
}

function writeUint16(view, offset, value) {
  view.setUint16(offset, value, true);
}

function writeUint32(view, offset, value) {
  view.setUint32(offset, value, true);
}

function concatUint8Arrays(chunks) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }

  return output;
}

function encodeFile(fileName, contents) {
  const encoder = new TextEncoder();

  return {
    fileName,
    nameBytes: encoder.encode(fileName),
    dataBytes: encoder.encode(contents),
  };
}

function buildLocalFileHeader(file) {
  const header = new Uint8Array(30);
  const view = new DataView(header.buffer);
  const checksum = crc32(file.dataBytes);

  writeUint32(view, 0, 0x04034b50);
  writeUint16(view, 4, 20);
  writeUint16(view, 6, 0x0800);
  writeUint16(view, 8, 0);
  writeUint16(view, 10, 0);
  writeUint16(view, 12, 0);
  writeUint32(view, 14, checksum);
  writeUint32(view, 18, file.dataBytes.length);
  writeUint32(view, 22, file.dataBytes.length);
  writeUint16(view, 26, file.nameBytes.length);
  writeUint16(view, 28, 0);

  return { header, checksum };
}

function buildCentralDirectoryHeader(file, checksum, localOffset) {
  const header = new Uint8Array(46);
  const view = new DataView(header.buffer);

  writeUint32(view, 0, 0x02014b50);
  writeUint16(view, 4, 20);
  writeUint16(view, 6, 20);
  writeUint16(view, 8, 0x0800);
  writeUint16(view, 10, 0);
  writeUint16(view, 12, 0);
  writeUint16(view, 14, 0);
  writeUint32(view, 16, checksum);
  writeUint32(view, 20, file.dataBytes.length);
  writeUint32(view, 24, file.dataBytes.length);
  writeUint16(view, 28, file.nameBytes.length);
  writeUint16(view, 30, 0);
  writeUint16(view, 32, 0);
  writeUint16(view, 34, 0);
  writeUint16(view, 36, 0);
  writeUint32(view, 38, 0);
  writeUint32(view, 42, localOffset);

  return header;
}

function buildEndOfCentralDirectory(fileCount, centralSize, centralOffset) {
  const header = new Uint8Array(22);
  const view = new DataView(header.buffer);

  writeUint32(view, 0, 0x06054b50);
  writeUint16(view, 4, 0);
  writeUint16(view, 6, 0);
  writeUint16(view, 8, fileCount);
  writeUint16(view, 10, fileCount);
  writeUint32(view, 12, centralSize);
  writeUint32(view, 16, centralOffset);
  writeUint16(view, 20, 0);

  return header;
}

export function buildStoredZipBytes(files) {
  const encodedFiles = files.map((file) =>
    encodeFile(file.fileName, file.contents),
  );
  const localChunks = [];
  const centralChunks = [];
  let localOffset = 0;

  for (const file of encodedFiles) {
    const { header, checksum } = buildLocalFileHeader(file);
    localChunks.push(header, file.nameBytes, file.dataBytes);
    centralChunks.push(
      buildCentralDirectoryHeader(file, checksum, localOffset),
      file.nameBytes,
    );
    localOffset +=
      header.length + file.nameBytes.length + file.dataBytes.length;
  }

  const centralOffset = localOffset;
  const centralDirectory = concatUint8Arrays(centralChunks);
  const endHeader = buildEndOfCentralDirectory(
    encodedFiles.length,
    centralDirectory.length,
    centralOffset,
  );

  return concatUint8Arrays([...localChunks, centralDirectory, endHeader]);
}

function formatOptionalRate(rate) {
  if (typeof rate !== "number" || !Number.isFinite(rate)) {
    return "N/A";
  }

  return `${(rate * 100).toFixed(1)}%`;
}

function buildDatasetCard(dataset, qualitySummary) {
  const video = dataset.video;
  const repPolicy = video.repPolicy ?? {};
  const movementCapability = video.movementCapability ?? {};
  const rubricCriteria = (video.rubricCriteria ?? [])
    .map(
      (criterion) =>
        `- ${criterion.genericKey}: ${criterion.label} (${criterion.criterionKey})`,
    )
    .join("\n");

  return `# AI-FMS Dataset Card

## 数据集用途

本导出包来自 AI-FMS workbench，用于支持 human-in-the-loop FMS video
annotation、movement-quality review 和后续可追溯数据集建设。它不是医疗诊断结果，
也不替代 certified FMS professional。

## 视频与动作

- Video ID: ${video.videoId}
- File name: ${video.fileName}
- Action type: ${video.actionType}
- Analysis range: ${video.startSecond}s - ${video.endSecond}s
- Expected reps: ${video.expectedReps ?? "N/A"}
- Pose pipeline status: ${movementCapability.posePipelineStatus ?? "unknown"}
- AI scoring status: ${movementCapability.aiScoringStatus ?? "unknown"}

## Score Scope

- Score scope: ${video.scoreScope ?? "rep_raw_score"}
- Scoring unit: ${repPolicy.scoringUnit ?? "rep"}
- Person-level final score aggregation: not included in this export
- Side policy: ${repPolicy.sidePolicy ?? "N/A"}
- Clearing policy: ${repPolicy.clearingPolicy ?? "N/A"}
- Pain policy: ${repPolicy.painPolicy ?? "N/A"}

每条 record 代表当前视频中的一次 rep/segment 的 RAW SCORE。当前阶段不把左右两侧
或多个动作综合成一个人的 FMS FINAL SCORE；如需 person-level 汇总，应在后续独立流程
中根据 FMS rules 从 rep-level labels 计算。

Human reviewer scores use a scoresheet-like basis: one overall RAW SCORE plus
comment/reason and rep metadata. Reviewer criteriaScores are compatibility
snapshots, not forced per-criterion human scoring.

## Rubric Criteria

The workbench keeps three compatible subscore fields for cross-movement export,
but each movement maps those fields to movement-specific reviewer criteria:

${rubricCriteria || "- N/A"}

## 标注记录

- Records: ${qualitySummary.recordsTotal}
- Valid labels: ${qualitySummary.validLabels}
- Pending labels: ${qualitySummary.pendingLabels}
- Invalid labels: ${qualitySummary.invalidLabels}
- Reviewer agreement: ${formatOptionalRate(qualitySummary.reviewerAgreementRate)}
- AI-final agreement: ${formatOptionalRate(qualitySummary.aiMatchesFinalRate)}

## Pose Evidence

- Pose evidence attached: ${qualitySummary.poseEvidenceAttached ? "Yes" : "No"}
- Pose frames: ${qualitySummary.pose.framesWithPose}/${qualitySummary.pose.framesTotal}
- Timing QA: ${qualitySummary.pose.timingGood}/${qualitySummary.pose.timingTotal}
- Cycle count QA: ${qualitySummary.pose.cycleCountQaStatus} (${qualitySummary.pose.expectedSegments ?? "N/A"} expected / ${qualitySummary.pose.candidateCycles ?? "N/A"} candidate / ${qualitySummary.pose.assignedCycles ?? "N/A"} assigned)
- Feature coverage: ${qualitySummary.pose.featureUsable}/${qualitySummary.pose.featureTotal}
- AI suggestion coverage: ${qualitySummary.pose.suggestionReady}/${qualitySummary.pose.suggestionTotal}

## Movement Capability Framework

每个 action 都有独立的 movement capability 状态。implemented 表示已有
pose timing、features 和 pose-based AI suggestion；features_only 表示只展示
reviewer-readable pose evidence；annotation_only 表示当前只做人工切片、评分、
仲裁和导出。导出中的 poseEvidenceGate 会记录每个 segment 是否达到显示
pose-based AI suggestion 的 evidence gate。

## 限制

- 当前 Deep Squat、Active Straight Leg Raise、Hurdle Step、In-Line Lunge、
  Shoulder Mobility 和 Trunk Stability Push-Up 有 first-pass pose-based AI
  suggestion。
- Rotary Stability 目前是 feature-only：可导出 pose evidence，但不显示 AI RAW
  SCORE。
- Raw video clips 和完整 per-frame landmarks 不嵌入本包；segment 通过原视频文件名和
  start/end timestamp 追溯。
- AI suggestion 是 reviewer decision support，不是最终自动评分。
`;
}

function buildExportReadme(dataset, files) {
  return `# AI-FMS Export Package

Generated at: ${dataset.generatedAt}

## Files

${files.map((file) => `- \`${file.fileName}\``).join("\n")}

## How to read this package

- \`dataset.json\`: 完整结构化 dataset records，包含 segment timing、reviewer
  labels、rep-level raw score scope、side/clearing/pain metadata、adjudication、
  movement capability、pose timing、pose features、pose evidence gate 和 pose
  suggestion。
- \`dataset.csv\`: 适合 spreadsheet 快速查看的扁平表格。
- \`dataset_card.md\`: 面向人阅读的数据集说明、用途和限制。
- \`run_summary.json\`: 本次导出的质量摘要和覆盖率。

本导出包不包含 raw video clip 文件。每条 record 通过 \`fileName\`、
\`startSecond\` 和 \`endSecond\` 追溯到原视频中的 segment。
`;
}

export function buildDatasetPackageFiles({ dataset, qualitySummary }) {
  const csv = buildDatasetCsv(dataset);
  const runSummary = {
    schemaVersion: "ai_fms_export_package_v1",
    generatedAt: dataset.generatedAt,
    video: dataset.video,
    qualitySummary,
    packageNotes: [
      "Raw video clips are not embedded.",
      "Raw per-frame pose landmarks are not embedded.",
      "Segment records remain traceable through video file name and timestamps.",
    ],
  };
  const initialFiles = [
    {
      fileName: "dataset.json",
      contents: JSON.stringify(dataset, null, 2),
    },
    {
      fileName: "dataset.csv",
      contents: csv,
    },
    {
      fileName: "dataset_card.md",
      contents: buildDatasetCard(dataset, qualitySummary),
    },
    {
      fileName: "run_summary.json",
      contents: JSON.stringify(runSummary, null, 2),
    },
  ];

  return [
    ...initialFiles,
    {
      fileName: "README_export.md",
      contents: buildExportReadme(dataset, initialFiles),
    },
  ];
}

export function buildDatasetPackageZip({ dataset, qualitySummary }) {
  const files = buildDatasetPackageFiles({ dataset, qualitySummary });
  const bytes = buildStoredZipBytes(files);

  return new Blob([bytes], { type: "application/zip" });
}
