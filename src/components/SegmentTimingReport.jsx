function formatSeconds(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "N/A";
  }

  return `${value.toFixed(1)}s`;
}

function formatPercent(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "N/A";
  }

  return `${(value * 100).toFixed(0)}%`;
}

function itemClassName(item, isActive) {
  const classes = ["timing-report-item"];

  if (item.status === "good") {
    classes.push("timing-report-item-good");
  }

  if (item.status === "needs_adjustment") {
    classes.push("timing-report-item-warning");
  }

  if (isActive) {
    classes.push("timing-report-item-active");
  }

  return classes.join(" ");
}

function issueSummary(item) {
  if (item.status === "good") {
    return "ok";
  }

  const blockingIssue = item.issues.find((issue) => issue.severity === "error");
  const fallbackIssue = item.issues[0];

  return blockingIssue?.code ?? fallbackIssue?.code ?? "ok";
}

export default function SegmentTimingReport({
  report,
  activeSegmentId,
  previewSegmentId = "",
  onSelect,
  onPreview,
  onApplyAll,
  disabled = false,
  t = (key) => key,
}) {
  if (!report || report.items.length === 0) {
    return null;
  }

  const hasSuggestions = report.items.some((item) => item.cycle);

  return (
    <section className="segment-timing-report card">
      <header>
        <h3>{t("segmentTimingQa")}</h3>
        <div className="timing-report-actions">
          <span>
            {report.summary.goodCount}/{report.summary.segmentsTotal} OK ·{" "}
            {report.summary.detectedCycles} {t("cycles")}
          </span>
          <button
            type="button"
            className="button-secondary"
            onClick={onApplyAll}
            disabled={disabled || !hasSuggestions}
          >
            {t("applyAllSuggestedTiming")}
          </button>
        </div>
      </header>

      <ul>
        {report.items.map((item) => (
          <li key={item.segmentId}>
            <div
              className={itemClassName(
                item,
                activeSegmentId === item.segmentId,
              )}
            >
              <button
                type="button"
                className="timing-report-select"
                onClick={() => onSelect(item.segmentId)}
              >
                <span>#{item.repetitionIndex}</span>
                <span>
                  {formatSeconds(item.currentStartSecond)}-
                  {formatSeconds(item.currentEndSecond)}
                </span>
                <span>
                  {item.cycle
                    ? `${formatSeconds(item.cycle.startSecond)}-${formatSeconds(
                        item.cycle.endSecond,
                      )}`
                    : t("noCycle")}
                </span>
                <span>{formatPercent(item.metrics?.coverageRatio)}</span>
                <span>{issueSummary(item)}</span>
              </button>
              <button
                type="button"
                className={
                  previewSegmentId === item.segmentId
                    ? "timing-preview-button timing-preview-button-active"
                    : "timing-preview-button"
                }
                onClick={() => onPreview(item)}
                disabled={disabled || !item.cycle}
                title={t("previewSuggestedTiming")}
              >
                {previewSegmentId === item.segmentId
                  ? t("previewingSuggestedTiming")
                  : t("previewSuggestedTiming")}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
