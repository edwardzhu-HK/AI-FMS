import { findNearestPoseFrame } from "./pose-landmarks.js";

function average(values) {
  const validValues = values.filter(
    (value) => typeof value === "number" && Number.isFinite(value),
  );

  if (validValues.length === 0) {
    return null;
  }

  return (
    validValues.reduce((sum, value) => sum + value, 0) / validValues.length
  );
}

function toFixedNumber(value, digits = 4) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Number(value.toFixed(digits));
}

function getLandmarkMap(frame) {
  return Object.fromEntries(
    (frame?.poses?.[0]?.landmarks ?? []).map((landmark) => [
      landmark.name,
      landmark,
    ]),
  );
}

function angleBetweenPoints(start, vertex, end) {
  if (!start || !vertex || !end) {
    return null;
  }

  const first = {
    x: start.x - vertex.x,
    y: start.y - vertex.y,
  };
  const second = {
    x: end.x - vertex.x,
    y: end.y - vertex.y,
  };
  const firstMagnitude = Math.hypot(first.x, first.y);
  const secondMagnitude = Math.hypot(second.x, second.y);

  if (firstMagnitude === 0 || secondMagnitude === 0) {
    return null;
  }

  const cosine =
    (first.x * second.x + first.y * second.y) /
    (firstMagnitude * secondMagnitude);
  const clampedCosine = Math.max(-1, Math.min(1, cosine));
  return (Math.acos(clampedCosine) * 180) / Math.PI;
}

function classifyHipFlexion(ankleAboveHip) {
  if (ankleAboveHip === null) {
    return {
      status: "not_applicable",
      label: "missing landmarks",
    };
  }

  if (ankleAboveHip >= 0.16) {
    return {
      status: "good",
      label: "leg reaches high",
    };
  }

  if (ankleAboveHip >= 0.06) {
    return {
      status: "watch",
      label: "moderate leg raise",
    };
  }

  return {
    status: "limited",
    label: "limited leg raise",
  };
}

function classifyActiveLegRaise(ankleAboveHip) {
  if (ankleAboveHip === null) {
    return {
      status: "not_applicable",
      label: "missing landmarks",
    };
  }

  if (ankleAboveHip >= 0.16) {
    return {
      status: "good",
      label: "score 3 raise zone",
    };
  }

  if (ankleAboveHip >= 0.06) {
    return {
      status: "watch",
      label: "score 2 raise zone",
    };
  }

  return {
    status: "limited",
    label: "score 1 raise zone",
  };
}

function classifyKneeExtension(kneeAngleDegrees) {
  if (kneeAngleDegrees === null) {
    return {
      status: "not_applicable",
      label: "missing landmarks",
    };
  }

  if (kneeAngleDegrees >= 160) {
    return {
      status: "good",
      label: "straight leg line",
    };
  }

  if (kneeAngleDegrees >= 140) {
    return {
      status: "watch",
      label: "mild knee bend",
    };
  }

  return {
    status: "limited",
    label: "bent knee watch",
  };
}

function classifyStationaryLegControl({ kneeAngleDegrees, ankleDrift }) {
  if (kneeAngleDegrees === null && ankleDrift === null) {
    return {
      status: "not_applicable",
      label: "missing landmarks",
    };
  }

  if (
    (kneeAngleDegrees === null || kneeAngleDegrees >= 160) &&
    (ankleDrift === null || ankleDrift <= 0.05)
  ) {
    return {
      status: "good",
      label: "stable down leg",
    };
  }

  if (
    (kneeAngleDegrees === null || kneeAngleDegrees >= 145) &&
    (ankleDrift === null || ankleDrift <= 0.09)
  ) {
    return {
      status: "watch",
      label: "down leg control watch",
    };
  }

  return {
    status: "limited",
    label: "down leg compensation watch",
  };
}

function classifyPelvicStability(hipHeightGap) {
  if (hipHeightGap === null) {
    return {
      status: "not_applicable",
      label: "missing landmarks",
    };
  }

  if (hipHeightGap <= 0.06) {
    return {
      status: "good",
      label: "stable pelvis proxy",
    };
  }

  if (hipHeightGap <= 0.1) {
    return {
      status: "watch",
      label: "pelvic shift watch",
    };
  }

  return {
    status: "limited",
    label: "pelvic compensation watch",
  };
}

function classifySideConfidence(side, visibility) {
  if (side !== "left" && side !== "right") {
    return {
      status: "not_applicable",
      label: "side not detected",
    };
  }

  if (visibility !== null && visibility < 0.45) {
    return {
      status: "watch",
      label: `${side} side low visibility`,
    };
  }

  return {
    status: "good",
    label: `${side} side detected`,
  };
}

function oppositeSide(side) {
  if (side === "left") {
    return "right";
  }

  if (side === "right") {
    return "left";
  }

  return null;
}

function pointDistance(first, second) {
  if (!first || !second) {
    return null;
  }

  return Math.hypot(first.x - second.x, first.y - second.y);
}

function buildFeatureItem({ posePayload, timingItem }) {
  if (!timingItem?.cycle) {
    return {
      segmentId: timingItem?.segmentId ?? null,
      repetitionIndex: timingItem?.repetitionIndex ?? null,
      cameraView: timingItem?.cameraView ?? null,
      status: "no_cycle",
      ratings: {},
      metrics: {},
    };
  }

  const frame = findNearestPoseFrame(
    posePayload,
    timingItem.cycle.peakSecond ?? timingItem.cycle.lowestPointSecond,
  );
  const startFrame = findNearestPoseFrame(
    posePayload,
    timingItem.cycle.startSecond,
  );
  const landmarks = getLandmarkMap(frame);
  const startLandmarks = getLandmarkMap(startFrame);
  const side = timingItem.cycle.side;
  const stationarySide = oppositeSide(side);
  const hip = landmarks[`${side}_hip`];
  const knee = landmarks[`${side}_knee`];
  const ankle = landmarks[`${side}_ankle`];
  const foot = landmarks[`${side}_foot_index`];
  const stationaryHip = landmarks[`${stationarySide}_hip`];
  const stationaryKnee = landmarks[`${stationarySide}_knee`];
  const stationaryAnkle = landmarks[`${stationarySide}_ankle`];
  const stationaryStartAnkle = startLandmarks[`${stationarySide}_ankle`];
  const leftHip = landmarks.left_hip;
  const rightHip = landmarks.right_hip;
  const ankleAboveHip = hip && ankle ? hip.y - ankle.y : null;
  const kneeAngleDegrees = angleBetweenPoints(hip, knee, ankle);
  const stationaryKneeAngleDegrees = angleBetweenPoints(
    stationaryHip,
    stationaryKnee,
    stationaryAnkle,
  );
  const stationaryAnkleDrift = pointDistance(
    stationaryAnkle,
    stationaryStartAnkle,
  );
  const footHipGap = hip && foot ? hip.y - foot.y : null;
  const hipHeightGap =
    leftHip && rightHip ? Math.abs(leftHip.y - rightHip.y) : null;
  const sideVisibility = average([
    hip?.visibility,
    knee?.visibility,
    ankle?.visibility,
    foot?.visibility,
  ]);

  return {
    segmentId: timingItem.segmentId,
    repetitionIndex: timingItem.repetitionIndex,
    cameraView: timingItem.cameraView,
    status: "ok",
    sourceSecond: frame?.second ?? null,
    suggestedWindow: {
      startSecond: timingItem.cycle.startSecond,
      endSecond: timingItem.cycle.endSecond,
      peakSecond: timingItem.cycle.peakSecond,
    },
    manualScoreOverride: timingItem.cycle.manualScoreOverride ?? null,
    manualScoreSource: timingItem.cycle.manualScoreSource ?? null,
    manualScoreReason: timingItem.cycle.manualScoreReason ?? null,
    ratings: {
      activeLegRaise: classifyActiveLegRaise(ankleAboveHip),
      hipFlexion: classifyHipFlexion(ankleAboveHip),
      kneeExtension: classifyKneeExtension(kneeAngleDegrees),
      stationaryLegControl: classifyStationaryLegControl({
        kneeAngleDegrees: stationaryKneeAngleDegrees,
        ankleDrift: stationaryAnkleDrift,
      }),
      pelvicStability: classifyPelvicStability(hipHeightGap),
      sideConfidence: classifySideConfidence(side, sideVisibility),
    },
    metrics: {
      side,
      stationarySide,
      ankleAboveHip: toFixedNumber(ankleAboveHip),
      footAboveHip: toFixedNumber(footHipGap),
      kneeAngleDegrees: toFixedNumber(kneeAngleDegrees, 1),
      stationaryKneeAngleDegrees: toFixedNumber(stationaryKneeAngleDegrees, 1),
      stationaryAnkleDrift: toFixedNumber(stationaryAnkleDrift, 3),
      hipHeightGap: toFixedNumber(hipHeightGap),
      peakElevation: toFixedNumber(timingItem.cycle.peakElevation),
      avgVisibility: toFixedNumber(timingItem.metrics?.avgVisibility, 3),
      timingCoverageRatio: toFixedNumber(timingItem.metrics?.coverageRatio, 3),
      sideVisibility: toFixedNumber(sideVisibility, 3),
    },
  };
}

function summarizeFeatureItems(items) {
  const usableItems = items.filter((item) => item.status === "ok");
  const ratingKeys = [
    "activeLegRaise",
    "hipFlexion",
    "kneeExtension",
    "stationaryLegControl",
    "pelvicStability",
    "sideConfidence",
  ];
  const ratingCounts = Object.fromEntries(
    ratingKeys.map((key) => [
      key,
      usableItems.reduce((counts, item) => {
        const status = item.ratings[key]?.status ?? "not_applicable";
        counts[status] = (counts[status] ?? 0) + 1;
        return counts;
      }, {}),
    ]),
  );

  return {
    repetitionsTotal: items.length,
    usableRepetitions: usableItems.length,
    avgAnkleAboveHip: toFixedNumber(
      average(usableItems.map((item) => item.metrics.ankleAboveHip)),
      3,
    ),
    avgVisibility: toFixedNumber(
      average(usableItems.map((item) => item.metrics.avgVisibility)),
      3,
    ),
    ratingCounts,
  };
}

export function summarizeAslrPoseFeatures({ posePayload, timingReport } = {}) {
  if (!posePayload || !timingReport?.items?.length) {
    return null;
  }

  const items = timingReport.items.map((timingItem) =>
    buildFeatureItem({ posePayload, timingItem }),
  );

  return {
    status: "ok",
    source: "pose_timing_report",
    items,
    summary: summarizeFeatureItems(items),
  };
}
