function statusClassName(reviewStatus) {
  if (reviewStatus === "completed") {
    return "status-completed";
  }

  if (reviewStatus === "partial") {
    return "status-partial";
  }

  if (reviewStatus === "protocol_evidence") {
    return "status-protocol-evidence";
  }

  return "status-pending";
}

function formatSeconds(seconds) {
  return `${seconds.toFixed(1)}s`;
}

function formatPercent(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "N/A";
  }

  return `${(value * 100).toFixed(0)}%`;
}

function issueSummary(item, t) {
  if (!item) {
    return "N/A";
  }

  if (item.status === "good") {
    return t("ok");
  }

  const blockingIssue = item.issues.find((issue) => issue.severity === "error");
  const fallbackIssue = item.issues[0];

  return getIssueLabel(blockingIssue ?? fallbackIssue, t, {
    short: true,
  });
}

function getIssueLabel(issue, t, options = {}) {
  if (!issue) {
    return t("ok");
  }

  const keyPrefix = options.short ? "timingIssueShort" : "timingIssue";
  const label = t(`${keyPrefix}_${issue.code}`);

  return label === `${keyPrefix}_${issue.code}` ? issue.message : label;
}

function buildTimingWarnings(timingReport, segments, canApplyTiming, t) {
  if (!timingReport) {
    return [];
  }

  const segmentCount = segments.length;
  const assignedCycleCount = timingReport.summary.detectedCycles ?? 0;
  const candidateCycleCount =
    timingReport.summary.candidateCyclesTotal ??
    timingReport.quality?.candidateCyclesTotal;
  const issueCounts = timingReport.summary.issueCounts ?? {};
  const warnings = [];

  if (assignedCycleCount < segmentCount) {
    warnings.push(
      `${t("timingAssignedCycleShortfall")}: ${assignedCycleCount}/${segmentCount}. ${t(
        "timingAssignedCycleShortfallDetail",
      )}`,
    );
  }

  if (
    typeof candidateCycleCount === "number" &&
    Number.isFinite(candidateCycleCount) &&
    candidateCycleCount > assignedCycleCount
  ) {
    warnings.push(
      `${t("timingExtraCandidateCycles")}: ${candidateCycleCount} ${t(
        "candidateCycles",
      )} / ${assignedCycleCount} ${t("assignedCycles")}. ${t(
        "timingExtraCandidateCyclesDetail",
      )}`,
    );
  }

  if (issueCounts.no_unique_cycle_assignment > 0) {
    warnings.push(
      `${issueCounts.no_unique_cycle_assignment} ${t(
        "segmentsNeedUniqueCycleReview",
      )}`,
    );
  }

  if (issueCounts.duplicate_cycle_assignment > 0) {
    warnings.push(
      `${issueCounts.duplicate_cycle_assignment} ${t(
        "segmentsNeedDuplicateCycleReview",
      )}`,
    );
  }

  const autoApplicableCount = (timingReport.items ?? []).filter(
    (item) =>
      item.cycle &&
      !item.issues?.some((issue) =>
        ["duplicate_cycle_assignment", "no_unique_cycle_assignment"].includes(
          issue.code,
        ),
      ),
  ).length;

  if (
    canApplyTiming &&
    autoApplicableCount > 0 &&
    autoApplicableCount < segmentCount
  ) {
    warnings.push(
      `${t("aiDraftPartialApply")}: ${autoApplicableCount}/${segmentCount}. ${t(
        "aiDraftPartialApplyDetail",
      )}`,
    );
  }

  return warnings;
}

function reviewStatusLabel(reviewStatus, t) {
  if (reviewStatus === "completed") {
    return t("completed");
  }

  if (reviewStatus === "partial") {
    return t("partial");
  }

  if (reviewStatus === "protocol_evidence") {
    return t("protocolEvidence");
  }

  if (reviewStatus === "pending") {
    return t("pending");
  }

  return reviewStatus;
}

function timingClassName(item) {
  if (!item) {
    return "";
  }

  if (item.status === "good") {
    return "segment-item-timing-good";
  }

  if (item.status === "needs_adjustment") {
    return "segment-item-timing-warning";
  }

  return "";
}

export default function SegmentList({
  segments,
  activeSegmentId,
  timingReport,
  onApplyAllTiming,
  onSelect,
  disabled,
  t = (key) => key,
}) {
  const timingItemsBySegmentId = new Map(
    (timingReport?.items ?? []).map((item) => [item.segmentId, item]),
  );
  const hasTimingReport = Boolean(timingReport?.items?.length);
  const canApplyTiming = typeof onApplyAllTiming === "function";
  const hasTimingSuggestions = canApplyTiming
    ? (timingReport?.items ?? []).some((item) => item.cycle)
    : false;
  const timingWarnings = buildTimingWarnings(
    timingReport,
    segments,
    canApplyTiming,
    t,
  );

  return (
    <section className="segment-list card">
      <header>
        <div>
          <h3>{t("segments")}</h3>
          <span>
            {segments.length} {t("clips")}
            {timingReport ? (
              <>
                {" "}
                · {t("timingQa")}: {timingReport.summary.goodCount}/
                {timingReport.summary.segmentsTotal} OK ·{" "}
                {timingReport.summary.detectedCycles} {t("cycles")}
              </>
            ) : null}
          </span>
        </div>
        {timingReport && canApplyTiming ? (
          <button
            type="button"
            className="button-secondary"
            onClick={onApplyAllTiming}
            disabled={disabled || !hasTimingSuggestions}
          >
            {t("rebuildAiDraftTiming")}
          </button>
        ) : null}
      </header>

      {timingWarnings.length > 0 ? (
        <div className="timing-risk-panel">
          <strong>{t("timingNeedsReview")}</strong>
          <ul>
            {timingWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <ul>
        {hasTimingReport ? (
          <li className="segment-list-grid-header" aria-hidden="true">
            <span>#</span>
            <span>{t("view")}</span>
            <span>{t("segmentTiming")}</span>
            <span>{t("coverage")}</span>
            <span>{t("timingStatus")}</span>
            <span>{t("reviewStatus")}</span>
          </li>
        ) : null}
        {segments.map((segment) => (
          <li key={segment.segmentId}>
            <button
              type="button"
              className={
                activeSegmentId === segment.segmentId
                  ? `segment-item segment-item-active ${timingClassName(
                      timingItemsBySegmentId.get(segment.segmentId),
                    )}`
                  : `segment-item ${timingClassName(
                      timingItemsBySegmentId.get(segment.segmentId),
                    )}`
              }
              onClick={() => onSelect(segment.segmentId)}
              disabled={disabled}
            >
              <span>#{segment.repetitionIndex}</span>
              <span>{segment.cameraView}</span>
              <span>
                {formatSeconds(segment.startSecond)} -
                {formatSeconds(segment.endSecond)}
              </span>
              {hasTimingReport ? (
                <>
                  <span>
                    {formatPercent(
                      timingItemsBySegmentId.get(segment.segmentId)?.metrics
                        ?.coverageRatio,
                    )}
                  </span>
                  <span>
                    {issueSummary(
                      timingItemsBySegmentId.get(segment.segmentId),
                      t,
                    )}
                  </span>
                </>
              ) : null}
              <span className={statusClassName(segment.reviewStatus)}>
                {reviewStatusLabel(segment.reviewStatus, t)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
