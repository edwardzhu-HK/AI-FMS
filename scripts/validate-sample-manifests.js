import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateManifest } from "./validate-manifest.js";

const SAMPLE_ROOT = "Eval_Videos/Sample videos";
const MANIFEST_DIR = "Eval_Videos/Sample videos/manifests";

function parseArgs(argv) {
  const args = {
    dir: SAMPLE_ROOT,
    manifestDir: MANIFEST_DIR,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];

    if (token === "--dir" && argv[i + 1]) {
      args.dir = argv[i + 1];
      i += 1;
      continue;
    }

    if (token === "--manifest-dir" && argv[i + 1]) {
      args.manifestDir = argv[i + 1];
      i += 1;
    }
  }

  return args;
}

export function validateSampleManifests({
  dir = SAMPLE_ROOT,
  manifestDir = MANIFEST_DIR,
  logger = console,
} = {}) {
  const resolvedManifestDir = path.resolve(process.cwd(), manifestDir);

  if (!fs.existsSync(resolvedManifestDir)) {
    logger.error(
      `ERROR: sample manifest dir not found: ${resolvedManifestDir}`,
    );
    return 1;
  }

  const manifests = fs
    .readdirSync(resolvedManifestDir)
    .filter((fileName) => fileName.endsWith(".sample-manifest.csv"))
    .sort();

  if (manifests.length === 0) {
    logger.error(`ERROR: no sample manifests found in ${resolvedManifestDir}`);
    return 1;
  }

  let failures = 0;
  for (const fileName of manifests) {
    const manifest = path.join(manifestDir, fileName);
    const exitCode = validateManifest({
      dir,
      manifest,
      logger,
    });

    if (exitCode !== 0) {
      failures += 1;
    }
  }

  logger.log("Sample manifest validation summary:");
  logger.log(`- manifests checked: ${manifests.length}`);
  logger.log(`- failures: ${failures}`);

  return failures > 0 ? 1 : 0;
}

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
const currentPath = fileURLToPath(import.meta.url);

if (entryPath === currentPath) {
  const args = parseArgs(process.argv.slice(2));
  process.exitCode = validateSampleManifests(args);
}
