import { SCORE_VALUES } from "../constants/scoring.js";

export default function ReviewerScoreForm({
  title,
  value,
  onChange,
  onSave,
  disabled,
  t = (key) => key,
}) {
  return (
    <section className="reviewer-form card">
      <h3>{title}</h3>

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
          value={value.totalScore}
          onChange={(event) =>
            onChange({
              ...value,
              totalScore: Number(event.target.value),
            })
          }
          disabled={disabled}
        >
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
