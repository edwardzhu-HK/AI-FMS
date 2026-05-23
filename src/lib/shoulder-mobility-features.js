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

function distance(first, second) {
  if (!first || !second) {
    return null;
  }

  return Math.hypot(first.x - second.x, first.y - second.y);
}

function classifyReachDistance(ratio) {
  if (ratio === null) {
    return {
      status: "not_applicable",
      label: "missing hand landmarks",
    };
  }

  if (ratio <= 0.18) {
    return {
      status: "good",
      label: "hands close proxy",
    };
  }

  if (ratio <= 0.42) {
    return {
      status: "watch",
      label: "moderate hand gap",
    };
  }

  return {
    status: "limited",
    label: "large hand gap",
  };
}

function classifyHandVisibility(visibility) {
  if (visibility === null) {
    return {
      status: "not_applicable",
      label: "missing hand visibility",
    };
  }

  if (visibility >= 0.65) {
    return {
      status: "good",
      label: "hands visible",
    };
  }

  if (visibility >= 0.45) {
    return {
      status: "watch",
      label: "hands partially visible",
    };
  }

  return {
    status: "limited",
    label: "hands low visibility",
  };
}

function classifyShoulderReference(referenceLength) {
  if (referenceLength === null) {
    return {
      status: "not_applicable",
      label: "missing shoulder reference",
    };
  }

  if (referenceLength >= 0.1) {
    return {
      status: "good",
      label: "body reference available",
    };
  }

  return {
    status: "watch",
    label: "small body reference",
  };
}

function classifySideContext(side) {
  if (side === "left" || side === "right" || side === "bilateral") {
    return {
      status: "good",
      label: `${side} side context`,
    };
  }

  return {
    status: "watch",
    label: "side needs reviewer metadata",
  };
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
    timingItem.cycle.bestReachSecond ?? timingItem.cycle.lowestPointSecond,
  );
  const landmarks = getLandmarkMap(frame);
  const leftWrist = landmarks.left_wrist;
  const rightWrist = landmarks.right_wrist;
  const leftIndex = landmarks.left_index;
  const rightIndex = landmarks.right_index;
  const leftShoulder = landmarks.left_shoulder;
  const rightShoulder = landmarks.right_shoulder;
  const leftHip = landmarks.left_hip;
  const rightHip = landmarks.right_hip;
  const shoulderWidth = distance(leftShoulder, rightShoulder);
  const torsoLength = average([
    distance(leftShoulder, leftHip),
    distance(rightShoulder, rightHip),
  ]);
  const referenceLength = torsoLength ?? shoulderWidth;
  const wristDistance = distance(leftWrist, rightWrist);
  const indexDistance = distance(leftIndex, rightIndex);
  const wristDistanceRatio =
    wristDistance !== null && referenceLength
      ? wristDistance / Math.max(0.01, referenceLength)
      : null;
  const indexDistanceRatio =
    indexDistance !== null && referenceLength
      ? indexDistance / Math.max(0.01, referenceLength)
      : null;
  const handVisibility = average([
    leftWrist?.visibility,
    rightWrist?.visibility,
    leftIndex?.visibility,
    rightIndex?.visibility,
  ]);
  const side = timingItem.side ?? timingItem.segmentMetadata?.side ?? "unknown";

  return {
    segmentId: timingItem.segmentId,
    repetitionIndex: timingItem.repetitionIndex,
    cameraView: timingItem.cameraView,
    status: "ok",
    sourceSecond: frame?.second ?? null,
    suggestedWindow: {
      startSecond: timingItem.cycle.startSecond,
      endSecond: timingItem.cycle.endSecond,
      bestReachSecond: timingItem.cycle.bestReachSecond,
    },
    ratings: {
      reachDistance: classifyReachDistance(wristDistanceRatio),
      handVisibility: classifyHandVisibility(handVisibility),
      shoulderReference: classifyShoulderReference(referenceLength),
      sideContext: classifySideContext(side),
    },
    metrics: {
      side,
      wristDistanceRatio: toFixedNumber(wristDistanceRatio),
      indexDistanceRatio: toFixedNumber(indexDistanceRatio),
      shoulderWidth: toFixedNumber(shoulderWidth),
      torsoLength: toFixedNumber(torsoLength),
      handVisibility: toFixedNumber(handVisibility, 3),
      timingVisibility: toFixedNumber(timingItem.metrics?.avgVisibility, 3),
    },
  };
}

function summarizeFeatureItems(items) {
  const usableItems = items.filter((item) => item.status === "ok");
  const ratingKeys = [
    "reachDistance",
    "handVisibility",
    "shoulderReference",
    "sideContext",
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
    avgWristDistanceRatio: toFixedNumber(
      average(usableItems.map((item) => item.metrics.wristDistanceRatio)),
      3,
    ),
    avgVisibility: toFixedNumber(
      average(usableItems.map((item) => item.metrics.timingVisibility)),
      3,
    ),
    ratingCounts,
  };
}

export function summarizeShoulderMobilityPoseFeatures({
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
