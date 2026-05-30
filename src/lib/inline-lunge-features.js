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

function oppositeSide(side) {
  return side === "left" ? "right" : "left";
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

function classifyLungeDepthZone(peakDepthRatio) {
  if (peakDepthRatio === null) {
    return {
      status: "not_applicable",
      label: "missing depth evidence",
    };
  }

  if (peakDepthRatio >= 0.7) {
    return {
      status: "good",
      label: "score 3 lunge depth zone",
    };
  }

  if (peakDepthRatio >= 0.62) {
    return {
      status: "watch",
      label: "score 2 lunge depth zone",
    };
  }

  return {
    status: "limited",
    label: "score 1 lunge depth zone",
  };
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

function classifyTrunkPelvisControl(trunkCenterOffset, hipHeightGap) {
  if (trunkCenterOffset === null && hipHeightGap === null) {
    return {
      status: "not_applicable",
      label: "missing trunk pelvis evidence",
    };
  }

  if (
    (trunkCenterOffset !== null && trunkCenterOffset > 0.08) ||
    (hipHeightGap !== null && hipHeightGap > 0.08)
  ) {
    return {
      status: "limited",
      label: "large trunk pelvis shift",
    };
  }

  if (
    (trunkCenterOffset !== null && trunkCenterOffset > 0.04) ||
    (hipHeightGap !== null && hipHeightGap > 0.045)
  ) {
    return {
      status: "watch",
      label: "trunk pelvis shift watch",
    };
  }

  return {
    status: "good",
    label: "controlled trunk pelvis",
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

function classifyFrontKneeFootLine(kneeFootOffset) {
  if (kneeFootOffset === null) {
    return {
      status: "not_applicable",
      label: "missing front knee-foot evidence",
    };
  }

  if (kneeFootOffset <= 0.045) {
    return {
      status: "good",
      label: "front knee tracks foot",
    };
  }

  if (kneeFootOffset <= 0.09) {
    return {
      status: "watch",
      label: "front knee-foot line watch",
    };
  }

  return {
    status: "limited",
    label: "large front knee-foot offset",
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

function classifyRearLegControl(rearAnkleDrift, rearSideVisibility) {
  if (rearAnkleDrift === null && rearSideVisibility === null) {
    return {
      status: "not_applicable",
      label: "missing rear leg evidence",
    };
  }

  if (
    (rearSideVisibility !== null && rearSideVisibility < 0.45) ||
    (rearAnkleDrift !== null && rearAnkleDrift > 0.075)
  ) {
    return {
      status: "limited",
      label: "rear leg control watch",
    };
  }

  if (rearAnkleDrift !== null && rearAnkleDrift > 0.04) {
    return {
      status: "watch",
      label: "rear foot drift watch",
    };
  }

  return {
    status: "good",
    label: "stable rear leg proxy",
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

function calculateHipHeightGap(landmarks) {
  const leftHip = landmarks.left_hip;
  const rightHip = landmarks.right_hip;

  if (
    !leftHip ||
    !rightHip ||
    typeof leftHip.y !== "number" ||
    typeof rightHip.y !== "number"
  ) {
    return null;
  }

  return Math.abs(leftHip.y - rightHip.y);
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

function calculateSideVisibility(landmarks, side) {
  if (side !== "left" && side !== "right") {
    return null;
  }

  return average([
    landmarks[`${side}_hip`]?.visibility,
    landmarks[`${side}_knee`]?.visibility,
    landmarks[`${side}_ankle`]?.visibility,
    landmarks[`${side}_foot_index`]?.visibility,
  ]);
}

function calculateSideAnkleDrift({ posePayload, timingItem, side }) {
  if (!timingItem?.cycle || (side !== "left" && side !== "right")) {
    return null;
  }

  const frames = getFramesInWindow(
    posePayload,
    timingItem.cycle.startSecond,
    timingItem.cycle.endSecond,
  );
  const ankleXs = frames
    .map((frame) => getLandmarkMap(frame)[`${side}_ankle`]?.x)
    .filter((value) => typeof value === "number" && Number.isFinite(value));

  return range(ankleXs);
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
  const rearSide =
    frontSide === "left" || frontSide === "right"
      ? oppositeSide(frontSide)
      : "unknown";
  const trunkCenterOffset = calculateTrunkCenterOffset(landmarks);
  const hipHeightGap = calculateHipHeightGap(landmarks);
  const kneeFootOffset =
    frontSide === "left" || frontSide === "right"
      ? calculateKneeFootOffset(landmarks, frontSide)
      : null;
  const sideVisibility = calculateSideVisibility(landmarks, frontSide);
  const rearSideVisibility = calculateSideVisibility(landmarks, rearSide);
  const rearAnkleDrift = calculateSideAnkleDrift({
    posePayload,
    timingItem,
    side: rearSide,
  });

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
      lungeDepthZone: classifyLungeDepthZone(timingItem.cycle.peakDepthRatio),
      trunkPelvisControl: classifyTrunkPelvisControl(
        trunkCenterOffset,
        hipHeightGap,
      ),
      frontKneeFootLine: classifyFrontKneeFootLine(kneeFootOffset),
      rearLegControl: classifyRearLegControl(
        rearAnkleDrift,
        rearSideVisibility,
      ),
      lungeDepth: classifyLungeDepth(timingItem.cycle.peakDepthRatio),
      trunkAlignment: classifyTrunkAlignment(trunkCenterOffset),
      kneeFootAlignment: classifyKneeFootAlignment(kneeFootOffset),
      sideConfidence: classifySideConfidence(frontSide, sideVisibility),
    },
    metrics: {
      frontSide,
      rearSide,
      peakDepthRatio: toFixedNumber(timingItem.cycle.peakDepthRatio),
      baselineDepthRatio: toFixedNumber(timingItem.cycle.baselineDepthRatio),
      trunkCenterOffset: toFixedNumber(trunkCenterOffset),
      hipHeightGap: toFixedNumber(hipHeightGap),
      kneeFootOffset: toFixedNumber(kneeFootOffset),
      rearAnkleDrift: toFixedNumber(rearAnkleDrift),
      avgVisibility: toFixedNumber(timingItem.metrics?.avgVisibility, 3),
      timingCoverageRatio: toFixedNumber(timingItem.metrics?.coverageRatio, 3),
      sideVisibility: toFixedNumber(sideVisibility, 3),
      rearSideVisibility: toFixedNumber(rearSideVisibility, 3),
    },
  };
}

function summarizeFeatureItems(items) {
  const usableItems = items.filter((item) => item.status === "ok");
  const ratingKeys = [
    "lungeDepthZone",
    "trunkPelvisControl",
    "frontKneeFootLine",
    "rearLegControl",
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
