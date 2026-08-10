import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { validateRoundBEvidenceManifest } from "../../src/lib/round-b-evidence.js";

export const DEFAULT_ROUND_B_EVIDENCE =
  "research/pilot-v1/generated/round-b-evidence-manifest.json";

export function readVerifiedRoundBEvidence({
  evidencePath = DEFAULT_ROUND_B_EVIDENCE,
  checksumPath = path.join(
    path.dirname(evidencePath),
    "round-b-evidence-SHA256SUMS",
  ),
  pilot = null,
}) {
  const resolvedPath = path.resolve(evidencePath);
  const raw = fs.readFileSync(resolvedPath);
  const actual = crypto.createHash("sha256").update(raw).digest("hex");
  const expected = fs
    .readFileSync(path.resolve(checksumPath), "utf8")
    .split("\n")
    .find((line) => line.endsWith(`  ${path.basename(resolvedPath)}`))
    ?.split(/\s+/)[0];
  if (!expected || expected !== actual) {
    throw new Error(`SHA-256 mismatch for ${resolvedPath}`);
  }
  const payload = JSON.parse(raw.toString("utf8"));
  const validation = validateRoundBEvidenceManifest(payload, { pilot });
  if (!validation.valid) {
    throw new Error(
      `Round B evidence validation failed: ${validation.errors.join(" ")}`,
    );
  }
  return { path: resolvedPath, payload, sha256: actual, validation };
}
