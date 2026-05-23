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

export default function SegmentList({
  segments,
  activeSegmentId,
  onSelect,
  disabled,
  t = (key) => key,
}) {
  return (
    <section className="segment-list card">
      <header>
        <h3>{t("segments")}</h3>
        <span>
          {segments.length} {t("clips")}
        </span>
      </header>

      <ul>
        {segments.map((segment) => (
          <li key={segment.segmentId}>
            <button
              type="button"
              className={
                activeSegmentId === segment.segmentId
                  ? "segment-item segment-item-active"
                  : "segment-item"
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
              <span className={statusClassName(segment.reviewStatus)}>
                {segment.reviewStatus}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
