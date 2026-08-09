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
    /^(Depth|Knee alignment|Torso control|Hip flexion|Active leg raise|Stationary leg control|Pelvic stability|Leg line|Side confidence|Hurdle clearance|Stance leg control|Pelvis trunk control|Step leg alignment|Step clearance|Stance stability|Trunk control|Lunge depth zone|Trunk pelvis control|Rear leg control|Front knee-foot line|Lunge depth|Trunk alignment|Knee-foot alignment) suggested (\d): (.+?)\./,
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
    "Active leg raise": "activeLegRaise",
    "Stationary leg control": "stationaryLegControl",
    "Pelvic stability": "pelvicStability",
    "Leg line": "legLine",
    "Side confidence": "sideConfidence",
    "Hurdle clearance": "hurdleClearance",
    "Stance leg control": "stanceLegControl",
    "Pelvis trunk control": "pelvisTrunkControl",
    "Step leg alignment": "stepLegAlignment",
    "Step clearance": "stepClearance",
    "Stance stability": "stanceStability",
    "Trunk control": "trunkControl",
    "Lunge depth zone": "lungeDepthZone",
    "Trunk pelvis control": "trunkPelvisControl",
    "Rear leg control": "rearLegControl",
    "Front knee-foot line": "frontKneeFootLine",
    "Lunge depth": "lungeDepth",
    "Trunk alignment": "trunkAlignment",
    "Knee-foot alignment": "kneeFootAlignment",
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
  movementCapability,
  evidenceGate,
  t = (key) => key,
}) {
  const subscoreItems = getSubscoreItems(actionType);
  const canShowPoseSuggestion =
    evidenceGate?.canShowPoseSuggestion &&
    poseSuggestion?.status === "suggested";
  const isAnnotationOnly =
    movementCapability?.posePipelineStatus === "annotation_only" ||
    evidenceGate?.status === "annotation_only";
  const hasFeatureOnlyEvidence =
    movementCapability?.posePipelineStatus === "features_only" &&
    !canShowPoseSuggestion;
  const needsDeepSquatStagedReview =
    poseSuggestion?.status === "needs_heel_elevated_attempt";
  const isPoseAiUnavailable =
    movementCapability?.supportsPoseSuggestion &&
    !canShowPoseSuggestion &&
    evidenceGate;
  const displayedScore = canShowPoseSuggestion ? poseSuggestion : aiScore;
  const displayedCriteriaScores =
    displayedScore?.criteriaScores?.length > 0
      ? displayedScore.criteriaScores.map((criterion) => ({
          key: criterion.criterionKey,
          label: criterion.label,
          score: criterion.score,
        }))
      : subscoreItems.map((item) => ({
          key: item.criterionKey ?? item.key,
          label: item.label,
          score: displayedScore?.subscores?.[item.key],
        }));

  if (isAnnotationOnly) {
    return (
      <section className="score-summary card">
        <h3>{t("annotationOnlyWorkflow")}</h3>
        <p>{t("annotationOnlyWorkflowDetail")}</p>
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

  if (needsDeepSquatStagedReview) {
    return (
      <section className="score-summary card">
        <h3>{t("deepSquatStagedScoring")}</h3>
        <p>{t("deepSquatNeedsBoardAttemptDetail")}</p>
        <div className="pose-suggestion-meta">
          <span>
            {t("attemptCondition")}:{" "}
            {t(`attemptCondition_${poseSuggestion.attemptCondition}`)}
          </span>
          <span>
            {t("rawAttemptEvidence")}: {poseSuggestion.rawAttemptScore ?? "N/A"}
          </span>
          <span>
            {t("confidence")}: {renderConfidenceLabel(poseSuggestion, t)}
          </span>
        </div>
        <ol className="pose-suggestion-reasons">
          {poseSuggestion.reasons.map((reason) => (
            <li key={reason}>{renderDetailedReason(reason, t)}</li>
          ))}
        </ol>
      </section>
    );
  }

  if (isPoseAiUnavailable) {
    return (
      <section className="score-summary card">
        <h3>{t("poseAiNotReady")}</h3>
        <p>{t(`poseEvidenceGate_${evidenceGate.reasonCode}`)}</p>
        <div className="pose-suggestion-meta">
          <span>
            {t("posePipeline")}:{" "}
            {t(`posePipeline_${movementCapability.posePipelineStatus}`)}
          </span>
          <span>
            {t("aiScoring")}:{" "}
            {t(`aiScoring_${movementCapability.aiScoringStatus}`)}
          </span>
        </div>
      </section>
    );
  }

  return (
    <section
      className={
        canShowPoseSuggestion
          ? "score-summary score-summary-pose card"
          : "score-summary card"
      }
    >
      <h3>
        {canShowPoseSuggestion ? t("poseBasedAiSuggestion") : t("aiSuggestion")}
      </h3>
      <p className="score-total">
        {t("totalScore")}: {displayedScore.totalScore}
      </p>
      <ul>
        {displayedCriteriaScores.map((item) => (
          <li key={item.key}>
            <span>{item.label}</span>
            <strong>{item.score ?? "N/A"}</strong>
          </li>
        ))}
      </ul>

      {canShowPoseSuggestion ? (
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
