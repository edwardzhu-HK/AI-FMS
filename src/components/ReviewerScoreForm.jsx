import { SCORE_VALUES } from "../constants/scoring.js";

const NOT_SCORED_VALUE = "not_scored";

function formatClearingContext(context, t) {
  const findings = context?.clearingFindings ?? [];

  if (findings.length === 0) {
    return context?.clearingTest ?? "not_applicable";
  }

  return findings
    .map(
      (finding) => `${finding.label}: ${t(`clearingResult_${finding.result}`)}`,
    )
    .join(" · ");
}

function hasPositiveClearingOrPain(context) {
  return (
    Boolean(context?.painFlag) ||
    (context?.clearingFindings ?? []).some(
      (finding) =>
        finding.resultType === "positive_negative_pain" &&
        finding.result === "positive",
    )
  );
}

function isNotScored(value) {
  return (
    value?.scoringStatus === NOT_SCORED_VALUE ||
    value?.totalScore === null ||
    value?.totalScore === undefined
  );
}

export default function ReviewerScoreForm({
  title,
  value,
  onChange,
  onSave,
  context,
  disabled,
  t = (key) => key,
}) {
  const shouldWarnScoreZero =
    !isNotScored(value) &&
    hasPositiveClearingOrPain(context) &&
    Number(value.totalScore) !== 0;
  const selectedScoreValue = isNotScored(value)
    ? NOT_SCORED_VALUE
    : String(value.totalScore);

  return (
    <section className="reviewer-form card">
      <h3>{title}</h3>

      {context ? (
        <div className="reviewer-context">
          <div>
            <strong>{t("reviewerScoreScope")}</strong>
            <span>{t("reviewerScoreScopeValue")}</span>
          </div>
          <div>
            <strong>{t("reviewerContextAction")}</strong>
            <span>{context.actionLabel}</span>
          </div>
          <div>
            <strong>{t("side")}</strong>
            <span>{context.side ?? "none"}</span>
          </div>
          <div>
            <strong>{t("clearingTest")}</strong>
            <span>{formatClearingContext(context, t)}</span>
          </div>
          <div>
            <strong>{t("painFlag")}</strong>
            <span>{context.painFlag ? t("yes") : t("no")}</span>
          </div>
        </div>
      ) : null}

      {shouldWarnScoreZero ? (
        <p className="reviewer-warning">{t("positiveClearingScoreWarning")}</p>
      ) : null}

      <label>
        {t("reviewerId")}
        <input
          type="text"
          value={value.reviewerId}
          onChange={(event) =>
            onChange({
              ...value,
              reviewerId: event.target.value,
            })
          }
          placeholder="coach_xxx"
          disabled={disabled}
        />
      </label>

      <label>
        {t("totalScore")}
        <select
          value={selectedScoreValue}
          onChange={(event) => {
            const nextValue = event.target.value;
            if (nextValue === NOT_SCORED_VALUE) {
              onChange({
                ...value,
                totalScore: null,
                scoringStatus: NOT_SCORED_VALUE,
              });
              return;
            }

            onChange({
              ...value,
              totalScore: Number(nextValue),
              scoringStatus: "scored",
            });
          }}
          disabled={disabled}
        >
          <option value={NOT_SCORED_VALUE}>{t("scoreNotScored")}</option>
          {SCORE_VALUES.map((score) => (
            <option key={score} value={score}>
              {score}
            </option>
          ))}
        </select>
      </label>

      <label>
        {t("comment")}
        <textarea
          value={value.comment}
          onChange={(event) =>
            onChange({
              ...value,
              comment: event.target.value,
            })
          }
          rows={2}
          disabled={disabled}
        />
      </label>

      <button
        type="button"
        className="button-secondary"
        disabled={disabled || !value.reviewerId.trim()}
        onClick={onSave}
      >
        {t("save")} {title}
      </button>
    </section>
  );
}
