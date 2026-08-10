import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { validateStudyReviewExport } from "../../src/lib/study-review.js";
import {
  DEFAULT_RESEARCH_DB,
  openResearchDatabase,
} from "./research-database.js";

export const DEFAULT_STUDY_REVIEW_DB = DEFAULT_RESEARCH_DB;

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function readExpectedChecksum(checksumPath) {
  const content = fs.readFileSync(checksumPath, "utf8").trim();
  const match = content.match(/^([a-f0-9]{64})(?:\s+\*?.+)?$/i);
  if (!match) {
    throw new Error(`Invalid SHA-256 file: ${checksumPath}`);
  }
  return match[1].toLowerCase();
}

function eventValues(event, eventHash) {
  return [
    event.eventId,
    eventHash,
    event.schemaVersion,
    event.pilotId,
    event.studyRound,
    event.reviewerId,
    event.repetitionId,
    event.ingestId,
    event.actionType,
    event.status,
    event.score,
    event.confidence,
    event.unscorableReason ?? null,
    event.scoreZeroReason ?? null,
    event.cameraView,
    event.side,
    event.comment,
    JSON.stringify(event.qualityFlags),
    JSON.stringify(event.blindReview),
    event.blindReview.eligibleForBlindAnalysis ? 1 : 0,
    event.rubricVersion,
    event.reviewStartedAt,
    event.reviewDurationMs,
    event.supersedesEventId,
    event.createdAt,
    JSON.stringify(event),
  ];
}

export function ingestStudyReviewExport({
  dbPath = DEFAULT_STUDY_REVIEW_DB,
  manifest,
  reviewPath,
  checksumPath = `${reviewPath}.sha256`,
  evidenceManifest = null,
  importedAt = new Date(),
}) {
  const resolvedReviewPath = path.resolve(reviewPath);
  const resolvedChecksumPath = path.resolve(checksumPath);
  const raw = fs.readFileSync(resolvedReviewPath);
  const sourceSha256 = sha256(raw);
  const expectedChecksum = readExpectedChecksum(resolvedChecksumPath);
  if (sourceSha256 !== expectedChecksum) {
    throw new Error(
      `SHA-256 mismatch for ${resolvedReviewPath}: expected ${expectedChecksum}, received ${sourceSha256}.`,
    );
  }

  const payload = JSON.parse(raw.toString("utf8"));
  if (payload.studyRound === "round_b" && !evidenceManifest) {
    throw new Error("A verified Round B evidence manifest is required.");
  }
  const validation = validateStudyReviewExport(payload, {
    pilot: manifest,
    requireComplete: true,
    evidenceManifest,
  });
  if (!validation.valid) {
    throw new Error(
      `Review export validation failed: ${validation.errors.join(" ")}`,
    );
  }

  const { database, resolvedPath } = openResearchDatabase(dbPath);
  try {
    const existingExport = database
      .prepare("select export_id from study_review_exports where export_id = ?")
      .get(sourceSha256);
    if (existingExport) {
      return {
        alreadyImported: true,
        databasePath: resolvedPath,
        exportId: sourceSha256,
        validation,
      };
    }

    const insertExport = database.prepare(`
      insert into study_review_exports (
        export_id, source_sha256, source_path, schema_version, pilot_id,
        study_round, reviewer_id, exported_at, imported_at,
        source_snapshot_date, source_pool_fingerprint,
        source_feature_matrix_fingerprint, expected_repetition_ids_json,
        event_count, resolved_count, scored_count, unscorable_count,
        deferred_count, analysis_excluded_count, complete, payload_json
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertEvent = database.prepare(`
      insert into study_review_events (
        event_id, event_sha256, schema_version, pilot_id, study_round,
        reviewer_id, repetition_id, ingest_id, action_type, status, score,
        confidence, unscorable_reason, score_zero_reason, camera_view, side,
        comment, quality_flags_json, blind_review_json,
        eligible_for_blind_analysis, rubric_version, review_started_at,
        review_duration_ms, supersedes_event_id, created_at, raw_event_json
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertExportEvent = database.prepare(`
      insert into study_review_export_events (export_id, event_id, event_ordinal)
      values (?, ?, ?)
    `);
    const insertEvidenceReview = database.prepare(`
      insert or ignore into study_review_evidence_reviews (
        event_id, manifest_fingerprint, item_fingerprint, evidence_status,
        ai_suggestion_shown, usefulness
      ) values (?, ?, ?, ?, ?, ?)
    `);
    const findEvent = database.prepare(
      "select event_sha256 from study_review_events where event_id = ?",
    );

    database.exec("begin immediate;");
    try {
      insertExport.run(
        sourceSha256,
        sourceSha256,
        resolvedReviewPath,
        payload.schemaVersion,
        payload.pilotId,
        payload.studyRound,
        payload.reviewerId,
        payload.exportedAt,
        importedAt.toISOString(),
        payload.sourceSnapshotDate,
        payload.sourcePoolFingerprint,
        payload.sourceFeatureMatrixFingerprint,
        JSON.stringify(payload.expectedRepetitionIds),
        payload.eventCount,
        validation.completion.resolvedCount,
        validation.completion.scoredCount,
        validation.completion.unscorableCount,
        validation.completion.deferredCount,
        validation.completion.analysisExcludedCount,
        validation.completion.complete ? 1 : 0,
        raw.toString("utf8"),
      );

      payload.events.forEach((event, index) => {
        const eventHash = sha256(JSON.stringify(event));
        const existingEvent = findEvent.get(event.eventId);
        if (existingEvent && existingEvent.event_sha256 !== eventHash) {
          throw new Error(
            `Immutable event conflict for eventId ${event.eventId}.`,
          );
        }
        if (!existingEvent) {
          insertEvent.run(...eventValues(event, eventHash));
        }
        if (event.evidenceReview) {
          insertEvidenceReview.run(
            event.eventId,
            event.evidenceReview.manifestFingerprint,
            event.evidenceReview.itemFingerprint,
            event.evidenceReview.evidenceStatus,
            event.evidenceReview.aiSuggestionShown ? 1 : 0,
            event.evidenceReview.usefulness,
          );
        }
        insertExportEvent.run(sourceSha256, event.eventId, index);
      });
      database.exec("commit;");
    } catch (error) {
      database.exec("rollback;");
      throw error;
    }

    return {
      alreadyImported: false,
      databasePath: resolvedPath,
      exportId: sourceSha256,
      validation,
    };
  } finally {
    database.close();
  }
}

export function inspectStudyReviewDatabase({
  dbPath = DEFAULT_STUDY_REVIEW_DB,
  pilotId,
  studyRound,
  reviewerId,
}) {
  const resolvedPath = path.resolve(dbPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Study review database not found: ${resolvedPath}`);
  }
  const { database } = openResearchDatabase(resolvedPath);
  try {
    const filters = [];
    const values = [];
    for (const [column, value] of [
      ["pilot_id", pilotId],
      ["study_round", studyRound],
      ["reviewer_id", reviewerId],
    ]) {
      if (value) {
        filters.push(`${column} = ?`);
        values.push(value);
      }
    }
    const where = filters.length ? `where ${filters.join(" and ")}` : "";
    const latestCte = `
      with ranked as (
        select *, row_number() over (
          partition by pilot_id, study_round, reviewer_id, repetition_id
          order by created_at desc, event_id desc
        ) as event_rank
        from study_review_events
        ${where}
      )
    `;
    const summary = database
      .prepare(
        `${latestCte}
        select
          count(*) as latest_review_count,
          sum(case when status in ('scored', 'unscorable') then 1 else 0 end) as resolved_count,
          sum(case when status = 'scored' then 1 else 0 end) as scored_count,
          sum(case when status = 'unscorable' then 1 else 0 end) as unscorable_count,
          sum(case when status = 'deferred' then 1 else 0 end) as deferred_count,
          sum(case
            when study_round = 'round_b' and (
              status = 'unscorable' or
              json_extract(blind_review_json, '$.labelCueDetected') = 1
            ) then 1
            when study_round != 'round_b' and eligible_for_blind_analysis = 0 then 1
            else 0
          end) as analysis_excluded_count,
          sum(case when evidence.event_id is not null then 1 else 0 end) as evidence_review_count,
          sum(case when evidence.ai_suggestion_shown = 1 then 1 else 0 end) as ai_suggestion_shown_count,
          sum(case when evidence.usefulness = 'helpful' then 1 else 0 end) as evidence_helpful_count,
          sum(case when evidence.usefulness = 'no_change' then 1 else 0 end) as evidence_no_change_count,
          sum(case when evidence.usefulness = 'insufficient' then 1 else 0 end) as evidence_insufficient_count
        from ranked
        left join study_review_evidence_reviews evidence using (event_id)
        where event_rank = 1
      `,
      )
      .get(...values);
    const actions = database
      .prepare(
        `${latestCte}
        select action_type, status, count(*) as count
        from ranked where event_rank = 1
        group by action_type, status
        order by action_type, status
      `,
      )
      .all(...values);
    const evidence = database
      .prepare(
        `${latestCte}
        select evidence.evidence_status, evidence.usefulness,
          evidence.ai_suggestion_shown, count(*) as count
        from ranked
        join study_review_evidence_reviews evidence using (event_id)
        where event_rank = 1
        group by evidence.evidence_status, evidence.usefulness,
          evidence.ai_suggestion_shown
        order by evidence.evidence_status, evidence.usefulness
      `,
      )
      .all(...values);
    const exports = database
      .prepare(
        `
        select export_id, pilot_id, study_round, reviewer_id, exported_at,
          imported_at, event_count, resolved_count, scored_count,
          unscorable_count, deferred_count, analysis_excluded_count, complete
        from study_review_exports
        ${where}
        order by imported_at desc
      `,
      )
      .all(...values);
    const totalEvents = database
      .prepare(`select count(*) as count from study_review_events ${where}`)
      .get(...values).count;

    return {
      databasePath: resolvedPath,
      exports,
      totalEvents,
      latest: summary,
      actions,
      evidence,
    };
  } finally {
    database.close();
  }
}
