import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import test from "node:test";

import { summarizeRotaryInternalRows } from "../scripts/analyze-rotary-v1-1-internal.js";

test("Rotary internal metrics keep coverage separate from agreement", () => {
  const metrics = summarizeRotaryInternalRows([
    {
      aiScore: 1,
      humanConsensusScore: 1,
      absoluteDifference: 0,
      evidenceStatus: "ok",
      suggestionStatus: "suggested",
    },
    {
      aiScore: 2,
      humanConsensusScore: 3,
      absoluteDifference: 1,
      evidenceStatus: "ok",
      suggestionStatus: "suggested",
    },
    {
      aiScore: null,
      humanConsensusScore: 2,
      absoluteDifference: null,
      evidenceStatus: "insufficient_evidence",
      suggestionStatus: "insufficient_evidence",
    },
  ]);

  assert.equal(metrics.coverage, 0.6667);
  assert.equal(metrics.exactAgreement, 0.5);
  assert.equal(metrics.withinOneAgreement, 1);
  assert.equal(metrics.meanAbsoluteError, 0.5);
  assert.equal(metrics.abstainedItems, 1);
});

test("Rotary experimental spec pins the frozen Round B AI v1.0", () => {
  const spec = JSON.parse(
    fs.readFileSync("research/pilot-v1/rotary-v1-1-experimental.json", "utf8"),
  );
  const actual = crypto
    .createHash("sha256")
    .update(fs.readFileSync(spec.roundBIsolation.frozenAiPath))
    .digest("hex");

  assert.equal(spec.roundBIsolation.exposeExperimentalScore, false);
  assert.equal(actual, spec.roundBIsolation.expectedSha256);
});
