import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseManifestFile, parseManifestRecord } from "./manifest-utils.js";

function parseArgs(argv) {
  const args = {
    dir: "test-videos",
    manifest: "test-videos/manifest.csv",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--dir" && argv[i + 1]) {
      args.dir = argv[i + 1];
      i += 1;
      continue;
    }

    if (token === "--manifest" && argv[i + 1]) {
      args.manifest = argv[i + 1];
      i += 1;
    }
  }

  return args;
}

function fail(logger, message) {
  logger.error(`ERROR: ${message}`);
}

function warn(logger, message) {
  logger.warn(`WARN: ${message}`);
}

export function validateManifest({ dir, manifest, logger = console }) {
  const manifestPath = path.resolve(process.cwd(), manifest);
  const videosDir = path.resolve(process.cwd(), dir);

  if (!fs.existsSync(manifestPath)) {
    fail(logger, `manifest not found: ${manifestPath}`);
    return 1;
  }

  if (!fs.existsSync(videosDir)) {
    fail(logger, `videos directory not found: ${videosDir}`);
    return 1;
  }

  let parsedManifest;
  try {
    parsedManifest = parseManifestFile(manifestPath);
  } catch (error) {
    fail(logger, error.message);
    return 1;
  }

  const seenNames = new Set();
  let errors = 0;
  let warnings = 0;

  for (const rawRow of parsedManifest.rows) {
    const row = parseManifestRecord(rawRow);
    const rowNumber = row.rowNumber;
    const fileName = row.fileName;
    const notes = row.notes;

    if (!fileName) {
      fail(logger, `row ${rowNumber}: file_name is empty`);
      errors += 1;
      continue;
    }

    if (seenNames.has(fileName)) {
      fail(logger, `row ${rowNumber}: duplicate file_name ${fileName}`);
      errors += 1;
    }
    seenNames.add(fileName);

    const filePath = path.join(videosDir, fileName);
    if (!fs.existsSync(filePath)) {
      fail(logger, `row ${rowNumber}: file not found ${filePath}`);
      errors += 1;
    }

    if (Number.isNaN(row.startSecond) || row.startSecond < 0) {
      fail(logger, `row ${rowNumber}: start_second must be >= 0`);
      errors += 1;
    }

    if (Number.isNaN(row.endSecond) || row.endSecond <= row.startSecond) {
      fail(logger, `row ${rowNumber}: end_second must be > start_second`);
      errors += 1;
    }

    if (!Number.isInteger(row.expectedReps) || row.expectedReps <= 0) {
      fail(logger, `row ${rowNumber}: expected_reps must be positive integer`);
      errors += 1;
    }

    if (!notes) {
      warn(logger, `row ${rowNumber}: notes is empty`);
      warnings += 1;
    }
  }

  logger.log("Manifest validation summary:");
  logger.log(`- manifest: ${manifestPath}`);
  logger.log(`- videos dir: ${videosDir}`);
  logger.log(`- rows checked: ${parsedManifest.rows.length}`);
  logger.log(`- errors: ${errors}`);
  logger.log(`- warnings: ${warnings}`);

  return errors > 0 ? 1 : 0;
}

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
const currentPath = fileURLToPath(import.meta.url);

if (entryPath === currentPath) {
  const args = parseArgs(process.argv.slice(2));
  const exitCode = validateManifest(args);
  process.exitCode = exitCode;
}
