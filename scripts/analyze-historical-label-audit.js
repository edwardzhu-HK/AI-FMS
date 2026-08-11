import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { auditHistoricalLabels } from "../src/lib/historical-label-audit.js";

const DEFAULT_CANONICAL = "research/pilot-v1/generated/canonical-pilot.json";
const DEFAULT_CLOSEOUT =
  "research/pilot-v1/generated/round-b-closeout/round-b-closeout-analysis.json";
const DEFAULT_OUTPUT = "research/pilot-v1/generated/historical-label-audit";

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function readVerifiedJson(filePath) {
  const resolved = path.resolve(filePath);
  const raw = fs.readFileSync(resolved);
  const checksums = fs.readFileSync(
    path.join(path.dirname(resolved), "SHA256SUMS"),
    "utf8",
  );
  const expected = checksums
    .split("\n")
    .map((line) => line.match(/^([a-f0-9]{64})\s+\*?(.+)$/i))
    .find((match) => match?.[2]?.trim() === path.basename(resolved))?.[1]
    ?.toLowerCase();
  const actual = sha256(raw);
  if (!expected || expected !== actual) {
    throw new Error(`SHA-256 mismatch for ${filePath}`);
  }
  return { payload: JSON.parse(raw.toString("utf8")), sha256: actual };
}

function percent(value) {
  return value == null ? "N/A" : `${(value * 100).toFixed(1)}%`;
}

function buildReport(audit) {
  const summary = audit.summary;
  const actions = Object.entries(audit.byAction)
    .map(
      ([actionType, item]) =>
        `| ${actionType} | ${item.roundBHistoricalComparableCount} | ${item.roundBHistoricalExactCount} (${percent(item.roundBHistoricalExactRate)}) | ${item.roundBHistoricalWithinOneCount} (${percent(item.roundBHistoricalWithinOneRate)}) | ${item.confirmedAuditedWeakLabelCount} | ${item.stableBlindHistoricalDisagreementCount} |`,
    )
    .join("\n");
  return `# Phase I Historical Label Audit

## 结论

正式 32-rep 样本用于审计相同 repetition ID 的历史人工标签，不用于证明未抽中标签全部正确。

- 两轮都形成稳定数值共识：${summary.stableBlindConsensusCount}/32
- 满足“两轮稳定盲评共识 = 历史标签”的 audited weak labels：${summary.confirmedAuditedWeakLabelCount}
- 稳定盲评共识与历史标签不一致：${summary.stableBlindHistoricalDisagreementCount}
- 历史标签缺失：${summary.stableBlindHistoricalMissingCount}
- Round A/B 共识发生变化：${summary.blindConsensusChangedCount}
- 两轮没有完整数值共识：${summary.noNumericConsensusBothRoundsCount}

Round B 与历史标签可比较 ${summary.roundBHistoricalComparableCount} 条：exact ${summary.roundBHistoricalExactCount}（${percent(summary.roundBHistoricalExactRate)}），within one ${summary.roundBHistoricalWithinOneCount}（${percent(summary.roundBHistoricalWithinOneRate)}），MAE ${summary.roundBHistoricalMeanAbsoluteDifference}。

| Action | Comparable | Exact | Within one | Confirmed audited weak labels | Stable disagreements |
| --- | ---: | ---: | ---: | ---: | ---: |
${actions}

## 使用边界

这次抽检支持“历史标签总体具有一定序数参考价值”，但不支持把剩余 110-rep pool 的全部历史标签升级为 gold labels。只有本报告中 ${summary.confirmedAuditedWeakLabelCount} 条精确匹配记录可标记为 audited weak labels；其余仍保留原 provenance。
`;
}

export function main({
  canonicalPath = DEFAULT_CANONICAL,
  closeoutPath = DEFAULT_CLOSEOUT,
  outputDir = DEFAULT_OUTPUT,
} = {}) {
  const canonical = readVerifiedJson(canonicalPath);
  const closeout = readVerifiedJson(closeoutPath);
  const analysis = auditHistoricalLabels({
    canonical: canonical.payload,
    closeout: closeout.payload,
  });
  const payload = {
    ...analysis,
    generatedAt: new Date().toISOString(),
    sources: {
      canonical: { path: canonicalPath, sha256: canonical.sha256 },
      roundBCloseout: { path: closeoutPath, sha256: closeout.sha256 },
    },
  };
  const outputs = {
    "historical-label-audit.json": `${JSON.stringify(payload, null, 2)}\n`,
    "historical-label-audit-report.md": buildReport(payload),
  };
  const resolvedOutput = path.resolve(outputDir);
  fs.mkdirSync(resolvedOutput, { recursive: true });
  for (const [name, content] of Object.entries(outputs)) {
    fs.writeFileSync(path.join(resolvedOutput, name), content);
  }
  fs.writeFileSync(
    path.join(resolvedOutput, "SHA256SUMS"),
    `${Object.entries(outputs)
      .map(([name, content]) => `${sha256(content)}  ${name}`)
      .join("\n")}\n`,
  );
  process.stdout.write(
    `${JSON.stringify({ outputDir: resolvedOutput, summary: payload.summary }, null, 2)}\n`,
  );
  return payload;
}

const isMainModule =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainModule) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  }
}
