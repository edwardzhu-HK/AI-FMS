import { findNearestPoseFrame } from "./pose-landmarks.js";

function average(values) {
  const validValues = values.filter(
    (value) => typeof value === "number" && Number.isFinite(value),
  );

  if (validValues.length === 0) {
    return null;
  }

  return (
    validValues.reduce((sum, value) => value + sum, 0) / validValues.length
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

function midpoint(first, second) {
  if (
    !first ||
    !second ||
    typeof first.x !== "number" ||
    typeof first.y !== "number" ||
    typeof second.x !== "number" ||
    typeof second.y !== "number"
  ) {
    return null;
  }

  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  };
}

function inferFrontSide(landmarks) {
  const leftKnee = landmarks.left_knee;
  const rightKnee = landmarks.right_knee;

  if (
    !leftKnee ||
    !rightKnee ||
    typeof leftKnee.y !== "number" ||
    typeof rightKnee.y !== "number"
  ) {
    return "unknown";
  }

  return leftKnee.y >= rightKnee.y ? "left" : "right";
}

function classifyLungeDepth(peakDepthRatio) {
  if (peakDepthRatio === null) {
    return {
      status: "not_applicable",
      label: "missing depth evidence",
    };
  }

  if (peakDepthRatio >= 0.7) {
    return {
      status: "good",
      label: "deep lunge proxy",
    };
  }

  if (peakDepthRatio >= 0.62) {
    return {
      status: "watch",
      label: "moderate lunge depth",
    };
  }

  return {
    status: "limited",
    label: "limited lunge depth",
  };
}

function classifyTrunkAlignment(trunkCenterOffset) {
  if (trunkCenterOffset === null) {
    return {
      status: "not_applicable",
      label: "missing trunk landmarks",
    };
  }

  if (trunkCenterOffset <= 0.04) {
    return {
      status: "good",
      label: "controlled trunk proxy",
    };
  }

  if (trunkCenterOffset <= 0.08) {
    return {
      status: "watch",
      label: "trunk shift watch",
    };
  }

  return {
    status: "limited",
    label: "large trunk shift",
  };
}

function classifyKneeFootAlignment(kneeFootOffset) {
  if (kneeFootOffset === null) {
    return {
      status: "not_applicable",
      label: "missing knee-foot landmarks",
    };
  }

  if (kneeFootOffset <= 0.045) {
    return {
      status: "good",
      label: "knee tracks foot proxy",
    };
  }

  if (kneeFootOffset <= 0.09) {
    return {
      status: "watch",
      label: "knee-foot offset watch",
    };
  }

  return {
    status: "limited",
    label: "large knee-foot offset",
  };
}

function classifySideConfidence(frontSide, visibility) {
  if (frontSide !== "left" && frontSide !== "right") {
    return {
      status: "not_applicable",
      label: "side not detected",
    };
  }

  if (visibility !== null && visibility < 0.45) {
    return {
      status: "watch",
      label: `${frontSide} side low visibility`,
    };
  }

  return {
    status: "good",
    label: `${frontSide} side detected`,
  };
}

function calculateTrunkCenterOffset(landmarks) {
  const shoulderCenter = midpoint(
    landmarks.left_shoulder,
    landmarks.right_shoulder,
  );
  const hipCenter = midpoint(landmarks.left_hip, landmarks.right_hip);

  if (!shoulderCenter || !hipCenter) {
    return null;
  }

  return Math.abs(shoulderCenter.x - hipCenter.x);
}

function calculateKneeFootOffset(landmarks, side) {
  const knee = landmarks[`${side}_knee`];
  const ankle = landmarks[`${side}_ankle`];
  const foot = landmarks[`${side}_foot_index`];
  const footReference = midpoint(ankle, foot) ?? foot ?? ankle;

  if (
    !knee ||
    !footReference ||
    typeof knee.x !== "number" ||
    typeof footReference.x !== "number"
  ) {
    return null;
  }

  return Math.abs(knee.x - footReference.x);
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
  const landmarks = getLandmarkMap(frame);
  const frontSide = inferFrontSide(landmarks);
  const trunkCenterOffset = calculateTrunkCenterOffset(landmarks);
  const kneeFootOffset =
    frontSide === "left" || frontSide === "right"
      ? calculateKneeFootOffset(landmarks, frontSide)
      : null;
  const sideVisibility =
    frontSide === "left" || frontSide === "right"
      ? average([
          landmarks[`${frontSide}_hip`]?.visibility,
          landmarks[`${frontSide}_knee`]?.visibility,
          landmarks[`${frontSide}_ankle`]?.visibility,
          landmarks[`${frontSide}_foot_index`]?.visibility,
        ])
      : null;

  return {
    segmentId: timingItem.segmentId,
    repetitionIndex: timingItem.repetitionIndex,
    cameraView: timingItem.cameraView,
    status: "ok",
    sourceSecond: frame?.second ?? null,
    suggestedWindow: {
      startSecond: timingItem.cycle.startSecond,
      endSecond: timingItem.cycle.endSecond,
      peakSecond:
        timingItem.cycle.peakSecond ?? timingItem.cycle.lowestPointSecond,
    },
    ratings: {
      lungeDepth: classifyLungeDepth(timingItem.cycle.peakDepthRatio),
      trunkAlignment: classifyTrunkAlignment(trunkCenterOffset),
      kneeFootAlignment: classifyKneeFootAlignment(kneeFootOffset),
      sideConfidence: classifySideConfidence(frontSide, sideVisibility),
    },
    metrics: {
      frontSide,
      peakDepthRatio: toFixedNumber(timingItem.cycle.peakDepthRatio),
      baselineDepthRatio: toFixedNumber(timingItem.cycle.baselineDepthRatio),
      trunkCenterOffset: toFixedNumber(trunkCenterOffset),
      kneeFootOffset: toFixedNumber(kneeFootOffset),
      avgVisibility: toFixedNumber(timingItem.metrics?.avgVisibility, 3),
      timingCoverageRatio: toFixedNumber(timingItem.metrics?.coverageRatio, 3),
      sideVisibility: toFixedNumber(sideVisibility, 3),
    },
  };
}

function summarizeFeatureItems(items) {
  const usableItems = items.filter((item) => item.status === "ok");
  const ratingKeys = [
    "lungeDepth",
    "trunkAlignment",
    "kneeFootAlignment",
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
    avgPeakDepthRatio: toFixedNumber(
      average(usableItems.map((item) => item.metrics.peakDepthRatio)),
      3,
    ),
    avgKneeFootOffset: toFixedNumber(
      average(usableItems.map((item) => item.metrics.kneeFootOffset)),
      3,
    ),
    avgVisibility: toFixedNumber(
      average(usableItems.map((item) => item.metrics.avgVisibility)),
      3,
    ),
    ratingCounts,
  };
}

export function summarizeInlineLungePoseFeatures({
  posePayload,
  timingReport,
} = {}) {
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
