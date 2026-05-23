import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { validateManifest } from "../scripts/validate-manifest.js";

const silentLogger = {
  log() {},
  warn() {},
  error() {},
};

function createTempWorkspace() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "fms-manifest-"));
}

test("validateManifest returns 0 for valid manifest", () => {
  const workspace = createTempWorkspace();
  const videosDir = path.join(workspace, "videos");
  fs.mkdirSync(videosDir, { recursive: true });

  fs.writeFileSync(path.join(videosDir, "sample.mp4"), "mock");

  const manifestPath = path.join(workspace, "manifest.csv");
  fs.writeFileSync(
    manifestPath,
    [
      "file_name,start_second,end_second,expected_reps,notes",
      "sample.mp4,0,10,3,baseline",
    ].join("\n"),
  );

  const exitCode = validateManifest({
    dir: videosDir,
    manifest: manifestPath,
    logger: silentLogger,
  });

  assert.equal(exitCode, 0);
});

test("validateManifest returns 1 when file is missing", () => {
  const workspace = createTempWorkspace();
  const videosDir = path.join(workspace, "videos");
  fs.mkdirSync(videosDir, { recursive: true });

  const manifestPath = path.join(workspace, "manifest.csv");
  fs.writeFileSync(
    manifestPath,
    [
      "file_name,start_second,end_second,expected_reps,notes",
      "missing.mp4,0,10,3,baseline",
    ].join("\n"),
  );

  const exitCode = validateManifest({
    dir: videosDir,
    manifest: manifestPath,
    logger: silentLogger,
  });

  assert.equal(exitCode, 1);
});
