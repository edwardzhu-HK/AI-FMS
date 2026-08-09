import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_STUDY_REVIEW_DB,
  inspectStudyReviewDatabase,
} from "./lib/study-review-database.js";

function parseArgs(argv) {
  const options = { dbPath: DEFAULT_STUDY_REVIEW_DB };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--db") {
      options.dbPath = argv[++index];
    } else if (argument === "--pilot-id") {
      options.pilotId = argv[++index];
    } else if (argument === "--round") {
      options.studyRound = argv[++index];
    } else if (argument === "--reviewer") {
      options.reviewerId = argv[++index];
    } else {
      throw new Error(`Unexpected argument: ${argument}`);
    }
  }
  return options;
}

export function main(argv = process.argv.slice(2)) {
  const status = inspectStudyReviewDatabase(parseArgs(argv));
  process.stdout.write(`${JSON.stringify(status, null, 2)}\n`);
  return status;
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
