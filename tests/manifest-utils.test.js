import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  parseManifestFile,
  parseManifestRecord,
} from "../scripts/manifest-utils.js";

function createTempWorkspace() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "fms-manifest-utils-"));
}

test("parseManifestFile reads rows and parseManifestRecord converts number fields", () => {
  const workspace = createTempWorkspace();
  const manifestPath = path.join(workspace, "manifest.csv");

  fs.writeFileSync(
    manifestPath,
    [
      "file_name,start_second,end_second,expected_reps,notes",
      "sample.mp4,1.5,20,4,mixed view",
    ].join("\n"),
  );

  const parsed = parseManifestFile(manifestPath);
  assert.equal(parsed.rows.length, 1);

  const row = parseManifestRecord(parsed.rows[0]);
  assert.equal(row.fileName, "sample.mp4");
  assert.equal(row.startSecond, 1.5);
  assert.equal(row.endSecond, 20);
  assert.equal(row.expectedReps, 4);
});

test("parseManifestFile throws when required columns are missing", () => {
  const workspace = createTempWorkspace();
  const manifestPath = path.join(workspace, "manifest.csv");

  fs.writeFileSync(
    manifestPath,
    [
      "file_name,start_second,end_second,notes",
      "sample.mp4,0,8,missing reps",
    ].join("\n"),
  );

  assert.throws(() => parseManifestFile(manifestPath), /missing columns/i);
});
