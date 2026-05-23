function statusClassName(reviewStatus) {
  if (reviewStatus === "completed") {
    return "status-completed";
  }

  if (reviewStatus === "partial") {
    return "status-partial";
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

  return blockingIssue?.code ?? fallbackIssue?.code ?? t("ok");
}

function reviewStatusLabel(reviewStatus, t) {
  if (reviewStatus === "completed") {
    return t("completed");
  }

  if (reviewStatus === "partial") {
    return t("partial");
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
  const hasTimingSuggestions = (timingReport?.items ?? []).some(
    (item) => item.cycle,
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
        {timingReport ? (
          <button
            type="button"
            className="button-secondary"
            onClick={onApplyAllTiming}
            disabled={disabled || !hasTimingSuggestions}
          >
            {t("applyAllSuggestedTiming")}
          </button>
        ) : null}
      </header>

      <ul>
        {hasTimingReport ? (
          <li className="segment-list-grid-header" aria-hidden="true">
            <span>#</span>
            <span>{t("view")}</span>
            <span>{t("currentSegmentTiming")}</span>
            <span>{t("suggestedTiming")}</span>
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
                    {timingItemsBySegmentId.get(segment.segmentId)?.cycle
                      ? `${formatSeconds(
                          timingItemsBySegmentId.get(segment.segmentId).cycle
                            .startSecond,
                        )} - ${formatSeconds(
                          timingItemsBySegmentId.get(segment.segmentId).cycle
                            .endSecond,
                        )}`
                      : t("noCycle")}
                  </span>
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
