import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_STUDY_REVIEW_DB,
  ingestStudyReviewExport,
  inspectStudyReviewDatabase,
} from "./lib/study-review-database.js";
import {
  DEFAULT_ROUND_B_EVIDENCE,
  readVerifiedRoundBEvidence,
} from "./lib/round-b-evidence-source.js";

const DEFAULT_MANIFEST =
  "research/pilot-v1/generated/formal-study-manifest.json";

function parseArgs(argv) {
  const options = {
    dbPath: DEFAULT_STUDY_REVIEW_DB,
    manifestPath: DEFAULT_MANIFEST,
    checksumPath: null,
    evidencePath: DEFAULT_ROUND_B_EVIDENCE,
    reviewPath: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--db") {
      options.dbPath = argv[++index];
    } else if (argument === "--manifest") {
      options.manifestPath = argv[++index];
    } else if (argument === "--checksum") {
      options.checksumPath = argv[++index];
    } else if (argument === "--evidence") {
      options.evidencePath = argv[++index];
    } else if (!options.reviewPath) {
      options.reviewPath = argument;
    } else {
      throw new Error(`Unexpected argument: ${argument}`);
    }
  }
  if (!options.reviewPath) {
    throw new Error(
      "Usage: npm run study:reviews:ingest -- [--db path] [--manifest path] [--evidence path] [--checksum path] review.json",
    );
  }
  return options;
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const manifest = JSON.parse(
    fs.readFileSync(path.resolve(options.manifestPath), "utf8"),
  );
  const payload = JSON.parse(
    fs.readFileSync(path.resolve(options.reviewPath), "utf8"),
  );
  const evidence =
    payload.studyRound === "round_b"
      ? readVerifiedRoundBEvidence({
          evidencePath: options.evidencePath,
          pilot: manifest,
        })
      : null;
  const result = ingestStudyReviewExport({
    dbPath: options.dbPath,
    manifest,
    reviewPath: options.reviewPath,
    ...(options.checksumPath ? { checksumPath: options.checksumPath } : {}),
    evidenceManifest: evidence?.payload ?? null,
  });
  const status = inspectStudyReviewDatabase({
    dbPath: options.dbPath,
    pilotId: payload.pilotId,
    studyRound: payload.studyRound,
    reviewerId: payload.reviewerId,
  });
  process.stdout.write(`${JSON.stringify({ result, status }, null, 2)}\n`);
  return { result, status };
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
