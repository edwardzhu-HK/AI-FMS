import { useEffect, useState } from "react";
import {
  CLEARING_RESULT_OPTIONS,
  deriveClearingTestFromFindings,
  getActionRepPolicy,
  normalizeClearingFindings,
} from "../constants/scoring.js";

function toFormValue(segment) {
  const actionType = segment?.actionType ?? "deep_squat";
  const repPolicy = getActionRepPolicy(actionType);
  const rawSide = segment?.side ?? repPolicy.defaultSide;
  const side =
    repPolicy.expectedSideValues.length > 0 &&
    rawSide !== "unknown" &&
    !repPolicy.expectedSideValues.includes(rawSide)
      ? "unknown"
      : rawSide;

  return {
    startSecond: segment?.startSecond ?? 0,
    endSecond: segment?.endSecond ?? 0,
    side,
    painFlag: Boolean(segment?.painFlag),
    clearingTest: segment?.clearingTest ?? "not_applicable",
    clearingFindings: normalizeClearingFindings(
      actionType,
      segment?.clearingFindings,
      segment?.clearingTest,
    ),
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

function getTranslatedLabel(key, fallback, t) {
  const translated = t(key);

  return translated === key ? fallback : translated;
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

  const repPolicy = getActionRepPolicy(segment.actionType);
  const sideOptions =
    repPolicy.expectedSideValues.length > 0
      ? ["unknown", ...repPolicy.expectedSideValues]
      : [];
  const visibleSideOptions =
    sideOptions.length > 0 ? sideOptions : [repPolicy.defaultSide];
  const hasSideOptions = sideOptions.length > 0;
  const hasClearingFindings = formValue.clearingFindings.length > 0;

  function updateField(field, value) {
    setFormValue((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function updateClearingFinding(findingKey, result) {
    setFormValue((previous) => ({
      ...previous,
      clearingFindings: previous.clearingFindings.map((finding) =>
        finding.key === findingKey ? { ...finding, result } : finding,
      ),
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const clearingTest = deriveClearingTestFromFindings(
      segment.actionType,
      formValue.clearingFindings,
      formValue.clearingTest,
    );

    onSave({
      segmentId: segment.segmentId,
      startSecond: Number(formValue.startSecond),
      endSecond: Number(formValue.endSecond),
      side: sideOptions.length > 0 ? formValue.side : repPolicy.defaultSide,
      painFlag: formValue.painFlag,
      clearingTest,
      clearingFindings: formValue.clearingFindings,
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
          <label className={!hasSideOptions ? "metadata-field-disabled" : ""}>
            {t("side")}
            <select
              value={hasSideOptions ? formValue.side : repPolicy.defaultSide}
              onChange={(event) => updateField("side", event.target.value)}
              disabled={disabled || !hasSideOptions}
            >
              {visibleSideOptions.map((side) => (
                <option key={side} value={side}>
                  {getTranslatedLabel(`sideOption_${side}`, side, t)}
                </option>
              ))}
            </select>
          </label>

          {hasClearingFindings ? (
            formValue.clearingFindings.map((finding) => (
              <label key={finding.key}>
                {getTranslatedLabel(
                  `clearingFinding_${finding.key}`,
                  finding.label,
                  t,
                )}
                <select
                  value={finding.result}
                  onChange={(event) =>
                    updateClearingFinding(finding.key, event.target.value)
                  }
                  disabled={disabled}
                >
                  {(CLEARING_RESULT_OPTIONS[finding.resultType] ?? []).map(
                    (option) => (
                      <option key={option} value={option}>
                        {getTranslatedLabel(
                          `clearingResult_${option}`,
                          option,
                          t,
                        )}
                      </option>
                    ),
                  )}
                </select>
              </label>
            ))
          ) : (
            <label className="metadata-field-disabled">
              {t("clearingTest")}
              <select
                value="not_applicable"
                disabled
                aria-label={t("clearingTest")}
              >
                <option value="not_applicable">
                  {getTranslatedLabel(
                    "clearingResult_not_applicable",
                    "not_applicable",
                    t,
                  )}
                </option>
              </select>
            </label>
          )}

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
