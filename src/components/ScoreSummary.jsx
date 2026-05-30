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

function parseSuggestedReason(reason) {
  return reason.match(
    /^(Depth|Knee alignment|Torso control|Hip flexion|Pelvic stability|Leg line|Side confidence|Step clearance|Stance stability|Trunk control) suggested (\d): (.+?)\./,
  );
}

function parseNotScoredReason(reason) {
  return reason.match(
    /^(Depth|Knee alignment|Torso control) was not scored from this camera view \((.+?)\)\./,
  );
}

function reasonFeatureKey(featureLabel) {
  return {
    Depth: "depth",
    "Knee alignment": "kneeAlignment",
    "Torso control": "torsoControl",
    "Hip flexion": "hipFlexion",
    "Pelvic stability": "pelvicStability",
    "Leg line": "legLine",
    "Side confidence": "sideConfidence",
    "Step clearance": "stepClearance",
    "Stance stability": "stanceStability",
    "Trunk control": "trunkControl",
  }[featureLabel];
}

function renderDetailedReason(reason, t) {
  const suggestedMatch = parseSuggestedReason(reason);
  if (suggestedMatch) {
    const [, featureLabel, score, evidence] = suggestedMatch;
    const featureKey = reasonFeatureKey(featureLabel);
    return `${t(`reason_${featureKey}`)}: ${t("suggestedScore")} ${score}. ${t(
      `reason_${featureKey}_${evidence}`,
    )}`;
  }

  const notScoredMatch = parseNotScoredReason(reason);
  if (notScoredMatch) {
    const [, featureLabel, viewReason] = notScoredMatch;
    const featureKey = reasonFeatureKey(featureLabel);
    return `${t(`reason_${featureKey}`)}: ${t("notScoredFromThisView")} ${t(
      `reason_view_${viewReason}`,
    )}`;
  }

  if (reason.includes("Timing QA indicates")) {
    return t("reason_timingNeedsAdjustment");
  }

  return reason;
}

export default function ScoreSummary({
  actionType,
  aiScore,
  adjudication,
  poseSuggestion,
  posePipelineStatus,
  t = (key) => key,
}) {
  const subscoreItems = getSubscoreItems(actionType);
  const hasPoseSuggestion = poseSuggestion?.status === "suggested";
  const hasFeatureOnlyEvidence =
    posePipelineStatus === "features_only" && !hasPoseSuggestion;
  const displayedScore = hasPoseSuggestion ? poseSuggestion : aiScore;

  if (hasFeatureOnlyEvidence) {
    return (
      <section className="score-summary card">
        <h3>{t("poseEvidenceOnly")}</h3>
        <p>{t("poseEvidenceOnlyDetail")}</p>
        <div
          className={`adjudication adjudication-${adjudication.labelStatus}`}
        >
          <span>
            {t("status")}: {adjudication.labelStatus}
          </span>
          <span>
            {t("source")}: {renderSourceLabel(adjudication.labelSource, t)}
          </span>
        </div>
      </section>
    );
  }

  return (
    <section
      className={
        hasPoseSuggestion
          ? "score-summary score-summary-pose card"
          : "score-summary card"
      }
    >
      <h3>
        {hasPoseSuggestion ? t("poseBasedAiSuggestion") : t("aiSuggestion")}
      </h3>
      <p className="score-total">
        {t("totalScore")}: {displayedScore.totalScore}
      </p>
      <ul>
        {subscoreItems.map((item) => (
          <li key={item.key}>
            <span>{item.label}</span>
            <strong>{displayedScore.subscores[item.key]}</strong>
          </li>
        ))}
      </ul>

      {hasPoseSuggestion ? (
        <>
          <div className="pose-suggestion-meta">
            <span>
              {t("confidence")}: {renderConfidenceLabel(poseSuggestion, t)}
            </span>
            <span>{renderPoseComparison(poseSuggestion, adjudication, t)}</span>
          </div>
          <ol className="pose-suggestion-reasons">
            {poseSuggestion.reasons.map((reason) => (
              <li key={reason}>{renderDetailedReason(reason, t)}</li>
            ))}
          </ol>
        </>
      ) : (
        <div
          className={`adjudication adjudication-${adjudication.labelStatus}`}
        >
          <span>
            {t("status")}: {adjudication.labelStatus}
          </span>
          <span>
            {t("source")}: {renderSourceLabel(adjudication.labelSource, t)}
          </span>
        </div>
      )}
    </section>
  );
}
