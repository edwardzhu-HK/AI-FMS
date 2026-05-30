import { useEffect, useState } from "react";
import { CLEARING_TEST_OPTIONS, SEGMENT_SIDES } from "../constants/scoring.js";

function toFormValue(segment) {
  return {
    startSecond: segment?.startSecond ?? 0,
    endSecond: segment?.endSecond ?? 0,
    side: segment?.side ?? "none",
    painFlag: Boolean(segment?.painFlag),
    clearingTest: segment?.clearingTest ?? "not_applicable",
    rubricVersion: segment?.rubricVersion ?? "fms_v1.0",
  };
}

function formatSeconds(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "N/A";
  }

  return `${value.toFixed(2)}s`;
}

function formatPercent(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "N/A";
  }

  return `${(value * 100).toFixed(0)}%`;
}

function timingClassName(status) {
  if (status === "good") {
    return "timing-suggestion timing-suggestion-good";
  }

  if (status === "needs_adjustment") {
    return "timing-suggestion timing-suggestion-warning";
  }

  return "timing-suggestion";
}

function getIssueLabel(issue, t) {
  if (!issue) {
    return t("ok");
  }

  const label = t(`timingIssue_${issue.code}`);

  return label === `timingIssue_${issue.code}` ? issue.message : label;
}

export default function SegmentEditor({
  segment,
  disabled,
  timingSuggestion,
  onSave,
  t = (key) => key,
}) {
  const [formValue, setFormValue] = useState(toFormValue(segment));

  useEffect(() => {
    setFormValue(toFormValue(segment));
  }, [segment]);

  if (!segment) {
    return null;
  }

  function updateField(field, value) {
    setFormValue((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSave({
      segmentId: segment.segmentId,
      startSecond: Number(formValue.startSecond),
      endSecond: Number(formValue.endSecond),
      side: formValue.side,
      painFlag: formValue.painFlag,
      clearingTest: formValue.clearingTest,
      rubricVersion: formValue.rubricVersion.trim(),
    });
  }

  function restoreAiDraftTiming() {
    const range = timingSuggestion?.aiDraftRange ?? timingSuggestion?.cycle;

    if (!range) {
      return;
    }

    setFormValue((previous) => ({
      ...previous,
      startSecond: range.startSecond,
      endSecond: range.endSecond,
    }));
  }

  return (
    <section className="segment-editor card">
      <header>
        <h3>{t("segmentMetadata")}</h3>
        <span>#{segment.repetitionIndex}</span>
      </header>

      <form onSubmit={handleSubmit}>
        <div className="row-inputs">
          <label>
            {t("startSecond")}
            <input
              type="number"
              min="0"
              step="0.01"
              value={formValue.startSecond}
              onChange={(event) =>
                updateField("startSecond", event.target.value)
              }
              disabled={disabled}
            />
          </label>

          <label>
            {t("endSecond")}
            <input
              type="number"
              min="0"
              step="0.01"
              value={formValue.endSecond}
              onChange={(event) => updateField("endSecond", event.target.value)}
              disabled={disabled}
            />
          </label>
        </div>

        {timingSuggestion ? (
          <section className={timingClassName(timingSuggestion.status)}>
            <header>
              <strong>{t("aiTimingEvidence")}</strong>
              {timingSuggestion.cycle ? (
                <span>
                  {t("aiDraftTiming")}{" "}
                  {formatSeconds(
                    timingSuggestion.aiDraftRange?.startSecond ??
                      timingSuggestion.cycle.startSecond,
                  )}{" "}
                  -{" "}
                  {formatSeconds(
                    timingSuggestion.aiDraftRange?.endSecond ??
                      timingSuggestion.cycle.endSecond,
                  )}
                </span>
              ) : (
                <span>{t("noUniqueCycleForSegment")}</span>
              )}
            </header>
            {timingSuggestion.cycle ? (
              <p>
                {t("detectedCycle")}{" "}
                {formatSeconds(timingSuggestion.cycle.startSecond)} -{" "}
                {formatSeconds(timingSuggestion.cycle.endSecond)} ·{" "}
                {t("lowest")}{" "}
                {formatSeconds(timingSuggestion.cycle.lowestPointSecond)} ·{" "}
                {t("coverage")}{" "}
                {formatPercent(timingSuggestion.metrics.coverageRatio)} ·{" "}
                {t("visibility")}{" "}
                {formatPercent(timingSuggestion.metrics.avgVisibility)}
              </p>
            ) : (
              <p>{t("noUniqueCycleForSegmentDetail")}</p>
            )}
            {timingSuggestion.issues.length > 0 ? (
              <ul>
                {timingSuggestion.issues.map((issue) => (
                  <li key={issue.code}>{getIssueLabel(issue, t)}</li>
                ))}
              </ul>
            ) : (
              <p>{t("segmentCoversCycle")}</p>
            )}
            {timingSuggestion.cycle ? (
              <button
                type="button"
                className="button-secondary"
                onClick={restoreAiDraftTiming}
                disabled={disabled}
              >
                {t("restoreAiDraftTiming")}
              </button>
            ) : null}
          </section>
        ) : null}

        <div className="metadata-grid">
          <label>
            {t("side")}
            <select
              value={formValue.side}
              onChange={(event) => updateField("side", event.target.value)}
              disabled={disabled}
            >
              {SEGMENT_SIDES.map((side) => (
                <option key={side} value={side}>
                  {side}
                </option>
              ))}
            </select>
          </label>

          <label>
            {t("clearingTest")}
            <select
              value={formValue.clearingTest}
              onChange={(event) =>
                updateField("clearingTest", event.target.value)
              }
              disabled={disabled}
            >
              {CLEARING_TEST_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label>
            {t("rubricVersion")}
            <input
              type="text"
              value={formValue.rubricVersion}
              onChange={(event) =>
                updateField("rubricVersion", event.target.value)
              }
              disabled={disabled}
            />
          </label>
        </div>

        <label className="inline-toggle pain-toggle">
          <input
            type="checkbox"
            checked={formValue.painFlag}
            onChange={(event) => updateField("painFlag", event.target.checked)}
            disabled={disabled}
          />
          {t("painFlag")}
        </label>

        <button type="submit" className="button-secondary" disabled={disabled}>
          {t("saveSegmentMetadata")}
        </button>
      </form>
    </section>
  );
}
