import { getSubscoreItems } from "../constants/scoring.js";

function renderSourceLabel(labelSource, t) {
  if (labelSource === "human_consensus") {
    return t("humanConsensus");
  }

  if (labelSource === "ai_human_match") {
    return t("aiHumanMatch");
  }

  return t("none");
}

function renderConfidenceLabel(poseSuggestion, t) {
  if (!poseSuggestion) {
    return "N/A";
  }

  return `${t(`confidence_${poseSuggestion.confidenceLabel}`)} (${Math.round(
    poseSuggestion.confidence * 100,
  )}%)`;
}

function renderPoseComparison(poseSuggestion, adjudication, t) {
  if (!poseSuggestion || adjudication.finalScore === null) {
    return t("poseVsFinalPending");
  }

  if (poseSuggestion.totalScore === adjudication.finalScore) {
    return t("poseVsFinalMatch");
  }

  return `${t("poseVsFinalDiffers")} (${poseSuggestion.totalScore} vs ${adjudication.finalScore})`;
}

export default function ScoreSummary({
  actionType,
  aiScore,
  adjudication,
  poseSuggestion,
  t = (key) => key,
}) {
  const subscoreItems = getSubscoreItems(actionType);

  return (
    <section className="score-summary card">
      <h3>{t("aiSuggestion")}</h3>
      <p className="score-total">
        {t("total")}: {aiScore.totalScore}
      </p>
      <ul>
        {subscoreItems.map((item) => (
          <li key={item.key}>
            <span>{item.label}</span>
            <strong>{aiScore.subscores[item.key]}</strong>
          </li>
        ))}
      </ul>

      <div className={`adjudication adjudication-${adjudication.labelStatus}`}>
        <span>
          {t("status")}: {adjudication.labelStatus}
        </span>
        <span>
          {t("source")}: {renderSourceLabel(adjudication.labelSource, t)}
        </span>
      </div>

      {poseSuggestion?.status === "suggested" ? (
        <section className="pose-suggestion">
          <header>
            <strong>{t("poseBasedSuggestion")}</strong>
            <span>
              {t("confidence")} {renderConfidenceLabel(poseSuggestion, t)}
            </span>
          </header>
          <p>
            {t("total")}: {poseSuggestion.totalScore}
          </p>
          <p>{renderPoseComparison(poseSuggestion, adjudication, t)}</p>
          <ul>
            {subscoreItems.map((item) => (
              <li key={item.key}>
                <span>{item.label}</span>
                <strong>{poseSuggestion.subscores[item.key]}</strong>
              </li>
            ))}
          </ul>
          <ol>
            {poseSuggestion.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ol>
        </section>
      ) : null}
    </section>
  );
}
