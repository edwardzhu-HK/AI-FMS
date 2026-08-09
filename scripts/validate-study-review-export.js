import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateStudyReviewExport } from "../src/lib/study-review.js";

const DEFAULT_MANIFEST =
  "research/pilot-v1/generated/formal-study-manifest.json";

function parseArgs(argv) {
  const options = {
    allowPartial: false,
    manifestPath: DEFAULT_MANIFEST,
    reviewPaths: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--allow-partial") {
      options.allowPartial = true;
    } else if (argument === "--manifest") {
      options.manifestPath = argv[index + 1];
      index += 1;
    } else {
      options.reviewPaths.push(argument);
    }
  }

  if (!options.manifestPath || options.reviewPaths.length === 0) {
    throw new Error(
      "Usage: npm run study:reviews:validate -- [--allow-partial] [--manifest path] review.json [...review.json]",
    );
  }
  return options;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function validateReviewFile({
  manifest,
  reviewPath,
  allowPartial = false,
}) {
  const raw = fs.readFileSync(reviewPath);
  const payload = JSON.parse(raw.toString("utf8"));
  const validation = validateStudyReviewExport(payload, {
    pilot: manifest,
    requireComplete: !allowPartial,
  });
  return {
    file: reviewPath,
    sha256: crypto.createHash("sha256").update(raw).digest("hex"),
    schemaVersion: payload.schemaVersion ?? null,
    pilotId: payload.pilotId ?? null,
    studyRound: payload.studyRound ?? null,
    reviewerId: payload.reviewerId ?? null,
    valid: validation.valid,
    completion: validation.completion,
    errors: validation.errors,
    warnings: validation.warnings,
  };
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const manifestPath = path.resolve(options.manifestPath);
  const manifest = readJson(manifestPath);
  const results = options.reviewPaths.map((reviewPath) =>
    validateReviewFile({
      manifest,
      reviewPath: path.resolve(reviewPath),
      allowPartial: options.allowPartial,
    }),
  );
  process.stdout.write(
    `${JSON.stringify({ manifestPath, results }, null, 2)}\n`,
  );
  if (results.some((result) => !result.valid)) {
    process.exitCode = 1;
  }
  return results;
}

const isMainModule =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(fileURLToPath(import.meta.url));

if (isMainModule) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  }
}
