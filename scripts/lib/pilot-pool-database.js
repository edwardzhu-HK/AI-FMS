import {
  DEFAULT_RESEARCH_DB,
  openResearchDatabase,
} from "./research-database.js";
import { pilotPoolSnapshotId, sourceMetadata } from "./pilot-pool-sources.js";

function indexByRepetition(rows) {
  return new Map(rows.map((row) => [row.repetitionId, row]));
}

export function ingestPilotPoolSnapshot({
  dbPath = DEFAULT_RESEARCH_DB,
  sources,
  analysis,
  importedAt = new Date(),
}) {
  const snapshotId = pilotPoolSnapshotId(sources);
  const { database, resolvedPath } = openResearchDatabase(dbPath);
  try {
    const existing = database
      .prepare(
        "select snapshot_id from pilot_pool_snapshots where snapshot_id = ?",
      )
      .get(snapshotId);
    if (existing) {
      return {
        alreadyImported: true,
        databasePath: resolvedPath,
        snapshotId,
        summary: inspectPilotPoolSnapshot({ dbPath, snapshotId }),
      };
    }

    const canonicalById = indexByRepetition(
      sources.canonical.payload.repetitions,
    );
    const blindabilityById = indexByRepetition(
      sources.blindability.payload.items,
    );
    const featureById = indexByRepetition(sources.featureMatrix.payload.rows);
    const insertSnapshot = database.prepare(`
      insert into pilot_pool_snapshots (
        snapshot_id, pilot_id, source_snapshot_date, pool_fingerprint,
        feature_matrix_fingerprint, feature_contract_version,
        canonical_sha256, blindability_sha256, feature_matrix_sha256,
        formal_manifest_sha256, agreement_sha256, feature_contract_sha256,
        source_paths_json, repetition_count, source_video_count,
        blindable_count, feature_ready_count, blind_and_ready_count,
        formal_count, gold_consensus_count, imported_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertRepetition = database.prepare(`
      insert into pilot_repetitions (
        snapshot_id, repetition_id, ingest_id, video_id, action_type,
        repetition_index, start_second, end_second, camera_view, side,
        blindability_status, blindability_reasons_json, feature_readiness,
        feature_reasons_json, formal_selected, round_a_consensus_scored,
        historical_consensus_score, historical_label_use, research_tier,
        recommended_use, canonical_json, blindability_json
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertFeatures = database.prepare(`
      insert into pilot_quantitative_features (
        snapshot_id, repetition_id, feature_contract_version, pose_sha256,
        pose_model_json, feature_source_second, features_json, qualifiers_json,
        ratings_json, quality_json, raw_feature_row_json
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    database.exec("begin immediate;");
    try {
      insertSnapshot.run(
        snapshotId,
        analysis.pilotId,
        analysis.sourceSnapshotDate,
        sources.blindability.payload.poolFingerprint,
        sources.featureMatrix.payload.matrixFingerprint,
        sources.featureContract.payload.contractVersion,
        sources.canonical.sha256,
        sources.blindability.sha256,
        sources.featureMatrix.sha256,
        sources.formalManifest.sha256,
        sources.agreement.sha256,
        sources.featureContract.sha256,
        JSON.stringify(sourceMetadata(sources)),
        analysis.fullPool.total,
        analysis.fullPool.sourceVideos,
        analysis.fullPool.blindable,
        analysis.fullPool.featureReady,
        analysis.fullPool.blindAndFeatureReady,
        analysis.fullPool.formalSelected,
        analysis.fullPool.roundAConsensusScored,
        importedAt.toISOString(),
      );
      for (const row of analysis.rows) {
        const canonicalRow = canonicalById.get(row.repetitionId);
        const blindabilityRow = blindabilityById.get(row.repetitionId);
        const featureRow = featureById.get(row.repetitionId);
        if (!canonicalRow || !blindabilityRow || !featureRow) {
          throw new Error(
            `Snapshot source row missing for ${row.repetitionId}.`,
          );
        }
        insertRepetition.run(
          snapshotId,
          row.repetitionId,
          row.ingestId,
          row.videoId,
          row.actionType,
          row.repetitionIndex,
          row.startSecond,
          row.endSecond,
          row.cameraView,
          row.side,
          row.blindabilityStatus,
          JSON.stringify(row.blindabilityReasons),
          row.featureReadiness,
          JSON.stringify(row.featureReasons),
          row.formalSelected ? 1 : 0,
          row.roundAConsensusScored ? 1 : 0,
          row.historicalConsensusScore,
          row.historicalLabelUse,
          row.researchTier,
          row.recommendedUse,
          JSON.stringify(canonicalRow),
          JSON.stringify(blindabilityRow),
        );
        insertFeatures.run(
          snapshotId,
          row.repetitionId,
          featureRow.featureContractVersion,
          featureRow.poseSha256,
          JSON.stringify(featureRow.poseModel ?? {}),
          featureRow.featureSourceSecond,
          JSON.stringify(featureRow.features ?? {}),
          JSON.stringify(featureRow.qualifiers ?? {}),
          JSON.stringify(featureRow.ratings ?? {}),
          JSON.stringify(featureRow.quality ?? {}),
          JSON.stringify(featureRow),
        );
      }
      database.exec("commit;");
    } catch (error) {
      database.exec("rollback;");
      throw error;
    }

    return {
      alreadyImported: false,
      databasePath: resolvedPath,
      snapshotId,
      summary: inspectPilotPoolSnapshot({ dbPath, snapshotId }),
    };
  } finally {
    database.close();
  }
}

export function inspectPilotPoolSnapshot({
  dbPath = DEFAULT_RESEARCH_DB,
  snapshotId,
}) {
  const { database, resolvedPath } = openResearchDatabase(dbPath);
  try {
    const snapshot = snapshotId
      ? database
          .prepare("select * from pilot_pool_snapshots where snapshot_id = ?")
          .get(snapshotId)
      : database
          .prepare(
            "select * from pilot_pool_snapshots order by imported_at desc limit 1",
          )
          .get();
    if (!snapshot) {
      return {
        databasePath: resolvedPath,
        snapshot: null,
        tiers: [],
        actions: [],
        featureRows: 0,
      };
    }
    const tiers = database
      .prepare(
        `select research_tier, count(*) as count
         from pilot_repetitions where snapshot_id = ?
         group by research_tier order by research_tier`,
      )
      .all(snapshot.snapshot_id);
    const actions = database
      .prepare(
        `select action_type, count(*) as total,
          sum(case when feature_readiness = 'ready' then 1 else 0 end) as feature_ready,
          sum(case when blindability_status = 'eligible' then 1 else 0 end) as blindable,
          sum(formal_selected) as formal_selected,
          sum(round_a_consensus_scored) as gold_consensus
         from pilot_repetitions where snapshot_id = ?
         group by action_type order by action_type`,
      )
      .all(snapshot.snapshot_id);
    const featureRows = database
      .prepare(
        "select count(*) as count from pilot_quantitative_features where snapshot_id = ?",
      )
      .get(snapshot.snapshot_id).count;
    return {
      databasePath: resolvedPath,
      snapshot,
      tiers,
      actions,
      featureRows,
    };
  } finally {
    database.close();
  }
}
