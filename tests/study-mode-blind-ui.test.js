import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("src/study/StudyApp.jsx", "utf8");

test("Round B Study Mode has no AI or pose evidence reviewer path", () => {
  assert.match(source, /Round B · Blind/);
  assert.match(source, /evidenceReview: null/);
  assert.doesNotMatch(source, /round-b-evidence-manifest/);
  assert.doesNotMatch(source, /EvidencePanel/);
  assert.doesNotMatch(source, /POSE-DERIVED EVIDENCE/);
  assert.doesNotMatch(source, /Evidence usefulness/);
  assert.doesNotMatch(source, /AI RAW SCORE/);
});
