function formatNumber(value, digits = 2) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "N/A";
  }

  return value.toFixed(digits);
}

function formatPercent(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "N/A";
  }

  return `${(value * 100).toFixed(0)}%`;
}

function statusClassName(status) {
  return `feature-status feature-status-${status ?? "not_applicable"}`;
}

function FeatureRow({ label, rating, detail }) {
  return (
    <li>
      <span>{label}</span>
      <strong className={statusClassName(rating?.status)}>
        {rating?.label ?? "N/A"}
      </strong>
      <span>{detail}</span>
    </li>
  );
}

function getFeatureRows(activeItem, t) {
  if (activeItem.ratings.reachDistance) {
    return [
      {
        label: t("reachDistance"),
        rating: activeItem.ratings.reachDistance,
        detail: `wrist ratio ${formatNumber(activeItem.metrics.wristDistanceRatio, 3)} · side ${activeItem.metrics.side ?? "N/A"}`,
      },
      {
        label: t("handVisibility"),
        rating: activeItem.ratings.handVisibility,
        detail: formatPercent(activeItem.metrics.handVisibility),
      },
      {
        label: t("shoulderReference"),
        rating: activeItem.ratings.shoulderReference,
        detail: `torso ${formatNumber(activeItem.metrics.torsoLength, 3)} · shoulder ${formatNumber(activeItem.metrics.shoulderWidth, 3)}`,
      },
      {
        label: t("sideContext"),
        rating: activeItem.ratings.sideContext,
        detail: activeItem.metrics.side ?? "N/A",
      },
    ];
  }

  if (activeItem.ratings.hipFlexion) {
    return [
      {
        label: t("activeLegRaise"),
        rating:
          activeItem.ratings.activeLegRaise ?? activeItem.ratings.hipFlexion,
        detail: `ankle-hip ${formatNumber(activeItem.metrics.ankleAboveHip, 3)} · side ${activeItem.metrics.side ?? "N/A"}`,
      },
      {
        label: t("kneeExtension"),
        rating: activeItem.ratings.kneeExtension,
        detail: `${formatNumber(activeItem.metrics.kneeAngleDegrees, 1)}deg knee`,
      },
      {
        label: t("stationaryLegControl"),
        rating: activeItem.ratings.stationaryLegControl,
        detail: `down knee ${formatNumber(activeItem.metrics.stationaryKneeAngleDegrees, 1)}deg · drift ${formatNumber(activeItem.metrics.stationaryAnkleDrift, 3)}`,
      },
      {
        label: t("pelvicStability"),
        rating: activeItem.ratings.pelvicStability,
        detail: `hip gap ${formatNumber(activeItem.metrics.hipHeightGap, 3)}`,
      },
      {
        label: t("sideConfidence"),
        rating: activeItem.ratings.sideConfidence,
        detail: `${formatPercent(activeItem.metrics.sideVisibility)} side visibility`,
      },
    ];
  }

  if (activeItem.ratings.stepClearance) {
    return [
      {
        label: t("stepClearance"),
        rating: activeItem.ratings.stepClearance,
        detail: `clearance ${formatNumber(activeItem.metrics.peakClearance, 3)} · side ${activeItem.metrics.side ?? "N/A"}`,
      },
      {
        label: t("stanceStability"),
        rating: activeItem.ratings.stanceStability,
        detail: `stance drift ${formatNumber(activeItem.metrics.stanceAnkleDrift, 3)} · stance ${activeItem.metrics.stanceSide ?? "N/A"}`,
      },
      {
        label: t("trunkControl"),
        rating: activeItem.ratings.trunkControl,
        detail: `center offset ${formatNumber(activeItem.metrics.trunkCenterOffset, 3)}`,
      },
      {
        label: t("sideConfidence"),
        rating: activeItem.ratings.sideConfidence,
        detail: `${formatPercent(activeItem.metrics.sideVisibility)} side visibility`,
      },
    ];
  }

  if (activeItem.ratings.lungeDepth) {
    return [
      {
        label: t("lungeDepth"),
        rating: activeItem.ratings.lungeDepth,
        detail: `peak ratio ${formatNumber(activeItem.metrics.peakDepthRatio, 3)} · side ${activeItem.metrics.frontSide ?? "N/A"}`,
      },
      {
        label: t("trunkAlignment"),
        rating: activeItem.ratings.trunkAlignment,
        detail: `center offset ${formatNumber(activeItem.metrics.trunkCenterOffset, 3)}`,
      },
      {
        label: t("kneeFootAlignment"),
        rating: activeItem.ratings.kneeFootAlignment,
        detail: `knee-foot ${formatNumber(activeItem.metrics.kneeFootOffset, 3)}`,
      },
      {
        label: t("sideConfidence"),
        rating: activeItem.ratings.sideConfidence,
        detail: `${formatPercent(activeItem.metrics.sideVisibility)} side visibility`,
      },
    ];
  }

  return [
    {
      label: t("depth"),
      rating: activeItem.ratings.depth,
      detail: `ratio ${formatNumber(activeItem.metrics.peakDepthRatio)} · hip-knee ${formatNumber(activeItem.metrics.hipKneeVerticalGap, 3)}`,
    },
    {
      label: t("torso"),
      rating: activeItem.ratings.torsoControl,
      detail: `${formatNumber(activeItem.metrics.trunkLeanDegrees, 1)}deg lean`,
    },
    {
      label: t("knee"),
      rating: activeItem.ratings.kneeAlignment,
      detail: `max offset ${formatNumber(activeItem.metrics.maxKneeAnkleOffset, 3)}`,
    },
    {
      label: t("hipAngle"),
      rating: activeItem.ratings.hipAngle,
      detail: `${formatNumber(activeItem.metrics.hipAngleDegrees, 1)}deg`,
    },
    {
      label: t("kneeAngle"),
      rating: activeItem.ratings.kneeAngle,
      detail: `${formatNumber(activeItem.metrics.kneeAngleDegrees, 1)}deg`,
    },
    {
      label: t("ankleProxy"),
      rating: activeItem.ratings.ankleAngle,
      detail: `shank ${formatNumber(activeItem.metrics.ankleShankLeanDegrees, 1)}deg`,
    },
  ];
}

export default function DeepSquatFeatureSnapshot({
  report,
  activeSegmentId,
  titleKey = "deepSquatFeatures",
  t = (key) => key,
}) {
  if (!report?.items?.length) {
    return null;
  }

  const activeItem =
    report.items.find((item) => item.segmentId === activeSegmentId) ??
    report.items[0];

  if (!activeItem || activeItem.status !== "ok") {
    return null;
  }

  return (
    <section className="deep-squat-features card">
      <header>
        <h3>{t(titleKey)}</h3>
        <span>
          {report.summary.usableRepetitions}/{report.summary.repetitionsTotal}{" "}
          {t("usable")} · {t("visibility")}{" "}
          {formatPercent(report.summary.avgVisibility)}
        </span>
      </header>

      <ul>
        {getFeatureRows(activeItem, t).map((row) => (
          <FeatureRow
            key={row.label}
            label={row.label}
            rating={row.rating}
            detail={row.detail}
          />
        ))}
      </ul>
    </section>
  );
}
