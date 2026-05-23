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
  if (activeItem.ratings.hipFlexion) {
    return [
      {
        label: t("hipFlexion"),
        rating: activeItem.ratings.hipFlexion,
        detail: `ankle-hip ${formatNumber(activeItem.metrics.ankleAboveHip, 3)} · side ${activeItem.metrics.side ?? "N/A"}`,
      },
      {
        label: t("kneeExtension"),
        rating: activeItem.ratings.kneeExtension,
        detail: `${formatNumber(activeItem.metrics.kneeAngleDegrees, 1)}deg knee`,
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
