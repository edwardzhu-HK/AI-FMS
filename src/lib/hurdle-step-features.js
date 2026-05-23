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

function getFrameSecond(frame) {
  if (typeof frame?.second === "number" && Number.isFinite(frame.second)) {
    return frame.second;
  }

  if (
    typeof frame?.timestampMs === "number" &&
    Number.isFinite(frame.timestampMs)
  ) {
    return frame.timestampMs / 1000;
  }

  return null;
}

function getLandmarkMap(frame) {
  return Object.fromEntries(
    (frame?.poses?.[0]?.landmarks ?? []).map((landmark) => [
      landmark.name,
      landmark,
    ]),
  );
}

function oppositeSide(side) {
  return side === "left" ? "right" : "left";
}

function getFramesInWindow(payload, startSecond, endSecond) {
  if (!Array.isArray(payload?.frames)) {
    return [];
  }

  return payload.frames.filter((frame) => {
    const second = getFrameSecond(frame);
    return second !== null && second >= startSecond && second <= endSecond;
  });
}

function range(values) {
  const validValues = values.filter(
    (value) => typeof value === "number" && Number.isFinite(value),
  );

  if (validValues.length === 0) {
    return null;
  }

  return Math.max(...validValues) - Math.min(...validValues);
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

function classifyStepClearance(peakClearance) {
  if (peakClearance === null) {
    return {
      status: "not_applicable",
      label: "missing clearance evidence",
    };
  }

  if (peakClearance >= 0.12) {
    return {
      status: "good",
      label: "clear step height proxy",
    };
  }

  if (peakClearance >= 0.07) {
    return {
      status: "watch",
      label: "moderate step height",
    };
  }

  return {
    status: "limited",
    label: "low step clearance watch",
  };
}

function classifyStanceStability(stanceAnkleDrift) {
  if (stanceAnkleDrift === null) {
    return {
      status: "not_applicable",
      label: "missing stance foot evidence",
    };
  }

  if (stanceAnkleDrift <= 0.035) {
    return {
      status: "good",
      label: "stable stance proxy",
    };
  }

  if (stanceAnkleDrift <= 0.07) {
    return {
      status: "watch",
      label: "stance drift watch",
    };
  }

  return {
    status: "limited",
    label: "large stance drift",
  };
}

function classifyTrunkControl(trunkCenterOffset) {
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

function calculateStanceAnkleDrift({ posePayload, timingItem, stanceSide }) {
  if (!timingItem?.cycle || !stanceSide) {
    return null;
  }

  const frames = getFramesInWindow(
    posePayload,
    timingItem.cycle.startSecond,
    timingItem.cycle.endSecond,
  );
  const ankleXs = frames
    .map((frame) => getLandmarkMap(frame)[`${stanceSide}_ankle`]?.x)
    .filter((value) => typeof value === "number" && Number.isFinite(value));

  return range(ankleXs);
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
  const side = timingItem.cycle.side;
  const stanceSide = oppositeSide(side);
  const hip = landmarks[`${side}_hip`];
  const knee = landmarks[`${side}_knee`];
  const ankle = landmarks[`${side}_ankle`];
  const foot = landmarks[`${side}_foot_index`];
  const stanceAnkleDrift = calculateStanceAnkleDrift({
    posePayload,
    timingItem,
    stanceSide,
  });
  const trunkCenterOffset = calculateTrunkCenterOffset(landmarks);
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
    ratings: {
      stepClearance: classifyStepClearance(timingItem.cycle.peakClearance),
      stanceStability: classifyStanceStability(stanceAnkleDrift),
      trunkControl: classifyTrunkControl(trunkCenterOffset),
      sideConfidence: classifySideConfidence(side, sideVisibility),
    },
    metrics: {
      side,
      stanceSide,
      peakClearance: toFixedNumber(timingItem.cycle.peakClearance),
      stanceAnkleDrift: toFixedNumber(stanceAnkleDrift),
      trunkCenterOffset: toFixedNumber(trunkCenterOffset),
      avgVisibility: toFixedNumber(timingItem.metrics?.avgVisibility, 3),
      timingCoverageRatio: toFixedNumber(timingItem.metrics?.coverageRatio, 3),
      sideVisibility: toFixedNumber(sideVisibility, 3),
    },
  };
}

function summarizeFeatureItems(items) {
  const usableItems = items.filter((item) => item.status === "ok");
  const ratingKeys = [
    "stepClearance",
    "stanceStability",
    "trunkControl",
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
    avgPeakClearance: toFixedNumber(
      average(usableItems.map((item) => item.metrics.peakClearance)),
      3,
    ),
    avgStanceAnkleDrift: toFixedNumber(
      average(usableItems.map((item) => item.metrics.stanceAnkleDrift)),
      3,
    ),
    avgVisibility: toFixedNumber(
      average(usableItems.map((item) => item.metrics.avgVisibility)),
      3,
    ),
    ratingCounts,
  };
}

export function summarizeHurdleStepPoseFeatures({
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
