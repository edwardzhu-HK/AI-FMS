import path from "node:path";
import { fileURLToPath } from "node:url";
import { summarizePilotPoolUtilization } from "../src/lib/pilot-pool-analysis.js";
import {
  ingestPilotPoolSnapshot,
  inspectPilotPoolSnapshot,
} from "./lib/pilot-pool-database.js";
import { DEFAULT_RESEARCH_DB } from "./lib/research-database.js";
import {
  DEFAULT_PILOT_POOL_PATHS,
  loadPilotPoolSources,
} from "./lib/pilot-pool-sources.js";

function parseArgs(argv) {
  const options = {
    ...DEFAULT_PILOT_POOL_PATHS,
    dbPath: DEFAULT_RESEARCH_DB,
    inspectOnly: false,
  };
  const argumentMap = {
    "--db": "dbPath",
    "--canonical": "canonicalPath",
    "--canonical-checksums": "canonicalChecksumsPath",
    "--blindability": "blindabilityPath",
    "--feature-matrix": "featureMatrixPath",
    "--feature-checksums": "featureChecksumsPath",
    "--formal-manifest": "formalManifestPath",
    "--formal-checksums": "formalChecksumsPath",
    "--agreement": "agreementPath",
    "--agreement-checksums": "agreementChecksumsPath",
    "--feature-contract": "featureContractPath",
  };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--inspect") {
      options.inspectOnly = true;
      continue;
    }
    const key = argumentMap[argv[index]];
    if (!key || !argv[index + 1]) {
      throw new Error(`Unknown or incomplete argument: ${argv[index]}`);
    }
    options[key] = argv[++index];
  }
  return options;
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.inspectOnly) {
    const status = inspectPilotPoolSnapshot({ dbPath: options.dbPath });
    process.stdout.write(`${JSON.stringify(status, null, 2)}\n`);
    return status;
  }
  const sourcePaths = { ...options };
  delete sourcePaths.dbPath;
  delete sourcePaths.inspectOnly;
  const { dbPath } = options;
  const sources = loadPilotPoolSources(sourcePaths);
  const analysis = summarizePilotPoolUtilization({
    canonical: sources.canonical.payload,
    blindability: sources.blindability.payload,
    featureMatrix: sources.featureMatrix.payload,
    formalManifest: sources.formalManifest.payload,
    agreement: sources.agreement.payload,
    featureContract: sources.featureContract.payload,
  });
  const result = ingestPilotPoolSnapshot({ dbPath, sources, analysis });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return result;
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
