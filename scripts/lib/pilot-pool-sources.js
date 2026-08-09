import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const DEFAULT_PILOT_POOL_PATHS = {
  canonicalPath: "research/pilot-v1/generated/canonical-pilot.json",
  canonicalChecksumsPath: "research/pilot-v1/generated/SHA256SUMS",
  blindabilityPath: "research/pilot-v1/generated/blindability-manifest.json",
  featureMatrixPath:
    "research/pilot-v1/generated/quantitative-feature-matrix.json",
  featureChecksumsPath: "research/pilot-v1/generated/feature-matrix-SHA256SUMS",
  formalManifestPath:
    "research/pilot-v1/generated/formal-study-internal-manifest.json",
  formalChecksumsPath: "research/pilot-v1/generated/formal-study-SHA256SUMS",
  agreementPath:
    "research/pilot-v1/generated/round-a-agreement/round-a-agreement.json",
  agreementChecksumsPath:
    "research/pilot-v1/generated/round-a-agreement/round-a-agreement-SHA256SUMS",
  featureContractPath: "research/pilot-v1/feature-contract.json",
};

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function readChecksumMap(checksumPath) {
  return new Map(
    fs
      .readFileSync(checksumPath, "utf8")
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const match = line.match(/^([a-f0-9]{64})\s+\*?(.+)$/i);
        if (!match) {
          throw new Error(`Invalid checksum line in ${checksumPath}: ${line}`);
        }
        return [match[2].trim(), match[1].toLowerCase()];
      }),
  );
}

function readJson(filePath) {
  const resolvedPath = path.resolve(filePath);
  const raw = fs.readFileSync(resolvedPath);
  return {
    path: path.relative(process.cwd(), resolvedPath),
    sha256: sha256(raw),
    payload: JSON.parse(raw.toString("utf8")),
  };
}

function readVerifiedJson(filePath, checksumPath) {
  const source = readJson(filePath);
  const checksums = readChecksumMap(path.resolve(checksumPath));
  const expected = checksums.get(path.basename(source.path));
  if (!expected) {
    throw new Error(`No checksum entry found for ${source.path}.`);
  }
  if (source.sha256 !== expected) {
    throw new Error(`SHA-256 mismatch for ${source.path}.`);
  }
  return { ...source, checksumVerified: true };
}

function validateCrossSourceContracts(sources) {
  const {
    canonical,
    blindability,
    featureMatrix,
    formalManifest,
    agreement,
    featureContract,
  } = sources;
  if (
    canonical.payload.pilotId !== blindability.payload.pilotId ||
    canonical.payload.pilotId !== featureMatrix.payload.pilotId
  ) {
    throw new Error("pilot pool artifacts do not share one pilotId.");
  }
  if (
    blindability.payload.poolFingerprint !==
    formalManifest.payload.sourcePoolFingerprint
  ) {
    throw new Error(
      "blindability pool fingerprint does not match formal manifest.",
    );
  }
  if (
    featureMatrix.payload.matrixFingerprint !==
    formalManifest.payload.sourceFeatureMatrixFingerprint
  ) {
    throw new Error(
      "feature matrix fingerprint does not match formal manifest.",
    );
  }
  if (agreement.payload.analysis.pilotId !== formalManifest.payload.pilotId) {
    throw new Error("agreement pilotId does not match formal manifest.");
  }
  if (
    featureMatrix.payload.featureContractVersion !==
    featureContract.payload.contractVersion
  ) {
    throw new Error("feature matrix does not match feature contract version.");
  }
  if (
    agreement.payload.sourceManifest !==
    "research/pilot-v1/generated/formal-study-manifest.json"
  ) {
    throw new Error("agreement does not reference the formal study manifest.");
  }
}

export function loadPilotPoolSources(options = {}) {
  const paths = { ...DEFAULT_PILOT_POOL_PATHS, ...options };
  const sources = {
    canonical: readVerifiedJson(
      paths.canonicalPath,
      paths.canonicalChecksumsPath,
    ),
    blindability: {
      ...readJson(paths.blindabilityPath),
      checksumVerified: false,
      integrityVerifiedBy: "formal_manifest_pool_fingerprint",
    },
    featureMatrix: readVerifiedJson(
      paths.featureMatrixPath,
      paths.featureChecksumsPath,
    ),
    formalManifest: readVerifiedJson(
      paths.formalManifestPath,
      paths.formalChecksumsPath,
    ),
    agreement: readVerifiedJson(
      paths.agreementPath,
      paths.agreementChecksumsPath,
    ),
    featureContract: {
      ...readJson(paths.featureContractPath),
      checksumVerified: false,
      integrityVerifiedBy: "feature_contract_version",
    },
  };
  validateCrossSourceContracts(sources);
  return sources;
}

export function sourceMetadata(sources) {
  return Object.fromEntries(
    Object.entries(sources).map(([name, source]) => [
      name,
      {
        path: source.path,
        sha256: source.sha256,
        checksumVerified: source.checksumVerified,
        integrityVerifiedBy: source.integrityVerifiedBy ?? "sha256_checksum",
      },
    ]),
  );
}

export function pilotPoolSnapshotId(sources) {
  return sha256(
    [
      sources.canonical.sha256,
      sources.blindability.sha256,
      sources.featureMatrix.sha256,
      sources.formalManifest.sha256,
      sources.agreement.sha256,
      sources.featureContract.sha256,
    ].join(":"),
  );
}
