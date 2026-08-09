import {
  findNearestPoseFrame,
  getPrimaryPoseLandmarks,
} from "./pose-landmarks.js";

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
    getPrimaryPoseLandmarks(frame).map((landmark) => [landmark.name, landmark]),
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

function angleDegrees(first, vertex, third) {
  if (
    !first ||
    !vertex ||
    !third ||
    typeof first.x !== "number" ||
    typeof first.y !== "number" ||
    typeof vertex.x !== "number" ||
    typeof vertex.y !== "number" ||
    typeof third.x !== "number" ||
    typeof third.y !== "number"
  ) {
    return null;
  }

  const firstVector = {
    x: first.x - vertex.x,
    y: first.y - vertex.y,
  };
  const thirdVector = {
    x: third.x - vertex.x,
    y: third.y - vertex.y,
  };
  const firstLength = Math.hypot(firstVector.x, firstVector.y);
  const thirdLength = Math.hypot(thirdVector.x, thirdVector.y);

  if (firstLength === 0 || thirdLength === 0) {
    return null;
  }

  const cosine =
    (firstVector.x * thirdVector.x + firstVector.y * thirdVector.y) /
    (firstLength * thirdLength);
  const clampedCosine = Math.max(-1, Math.min(1, cosine));
  return (Math.acos(clampedCosine) * 180) / Math.PI;
}

function kneeLineOffset(hip, knee, ankle) {
  if (
    !hip ||
    !knee ||
    !ankle ||
    typeof hip.x !== "number" ||
    typeof knee.x !== "number" ||
    typeof ankle.x !== "number"
  ) {
    return null;
  }

  return Math.abs(knee.x - (hip.x + ankle.x) / 2);
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

function classifyHurdleClearance(peakClearance) {
  if (peakClearance === null) {
    return {
      status: "not_applicable",
      label: "missing clearance evidence",
    };
  }

  if (peakClearance >= 0.12) {
    return {
      status: "good",
      label: "score 3 clearance zone",
    };
  }

  if (peakClearance >= 0.07) {
    return {
      status: "watch",
      label: "score 2 clearance zone",
    };
  }

  return {
    status: "limited",
    label: "low clearance proxy; review hurdle contact or balance loss",
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

function classifyStanceLegControl(stanceAnkleDrift, stanceKneeAngleDegrees) {
  if (stanceAnkleDrift === null && stanceKneeAngleDegrees === null) {
    return {
      status: "not_applicable",
      label: "missing stance leg evidence",
    };
  }

  if (
    (stanceAnkleDrift !== null && stanceAnkleDrift > 0.07) ||
    (stanceKneeAngleDegrees !== null && stanceKneeAngleDegrees < 160)
  ) {
    return {
      status: "limited",
      label: "stance leg compensation watch",
    };
  }

  if (
    (stanceAnkleDrift !== null && stanceAnkleDrift > 0.035) ||
    (stanceKneeAngleDegrees !== null && stanceKneeAngleDegrees < 170)
  ) {
    return {
      status: "watch",
      label: "stance leg control watch",
    };
  }

  return {
    status: "good",
    label: "stable stance leg",
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

function classifyPelvisTrunkControl(trunkCenterOffset, hipHeightGap) {
  if (trunkCenterOffset === null && hipHeightGap === null) {
    return {
      status: "not_applicable",
      label: "missing pelvis trunk evidence",
    };
  }

  if (
    (trunkCenterOffset !== null && trunkCenterOffset > 0.08) ||
    (hipHeightGap !== null && hipHeightGap > 0.08)
  ) {
    return {
      status: "limited",
      label: "large pelvis trunk shift",
    };
  }

  if (
    (trunkCenterOffset !== null && trunkCenterOffset > 0.04) ||
    (hipHeightGap !== null && hipHeightGap > 0.045)
  ) {
    return {
      status: "watch",
      label: "pelvis trunk shift watch",
    };
  }

  return {
    status: "good",
    label: "controlled pelvis trunk",
  };
}

function classifyStepLegAlignment(stepKneeLineOffset) {
  if (stepKneeLineOffset === null) {
    return {
      status: "not_applicable",
      label: "missing stepping leg evidence",
    };
  }

  if (stepKneeLineOffset !== null && stepKneeLineOffset > 0.065) {
    return {
      status: "limited",
      label: "stepping leg alignment watch",
    };
  }

  if (stepKneeLineOffset !== null && stepKneeLineOffset > 0.035) {
    return {
      status: "watch",
      label: "mild stepping leg drift",
    };
  }

  return {
    status: "good",
    label: "aligned stepping leg",
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
  const stanceHip = landmarks[`${stanceSide}_hip`];
  const stanceKnee = landmarks[`${stanceSide}_knee`];
  const stanceAnkle = landmarks[`${stanceSide}_ankle`];
  const rawStanceAnkleDrift = calculateStanceAnkleDrift({
    posePayload,
    timingItem,
    stanceSide,
  });
  const stanceAnkleDrift =
    timingItem.cameraView === "side" ? null : rawStanceAnkleDrift;
  const rawStanceKneeAngleDegrees = angleDegrees(
    stanceHip,
    stanceKnee,
    stanceAnkle,
  );
  const stanceKneeAngleDegrees =
    timingItem.cameraView === "side" ? null : rawStanceKneeAngleDegrees;
  const stepKneeAngleDegrees = angleDegrees(hip, knee, ankle);
  const stepKneeLineOffset = kneeLineOffset(hip, knee, ankle);
  const trunkCenterOffset = calculateTrunkCenterOffset(landmarks);
  const hipHeightGap = calculateHipHeightGap(landmarks);
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
      hurdleClearance: classifyHurdleClearance(timingItem.cycle.peakClearance),
      stanceLegControl: classifyStanceLegControl(
        stanceAnkleDrift,
        stanceKneeAngleDegrees,
      ),
      stepLegAlignment: classifyStepLegAlignment(stepKneeLineOffset),
      pelvisTrunkControl: classifyPelvisTrunkControl(
        trunkCenterOffset,
        hipHeightGap,
      ),
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
      rawStanceAnkleDrift: toFixedNumber(rawStanceAnkleDrift),
      stanceAnkleDriftReliable: timingItem.cameraView !== "side",
      stanceKneeAngleDegrees: toFixedNumber(stanceKneeAngleDegrees, 1),
      rawStanceKneeAngleDegrees: toFixedNumber(rawStanceKneeAngleDegrees, 1),
      stanceKneeAngleReliable: timingItem.cameraView !== "side",
      stepKneeAngleDegrees: toFixedNumber(stepKneeAngleDegrees, 1),
      stepKneeLineOffset: toFixedNumber(stepKneeLineOffset),
      trunkCenterOffset: toFixedNumber(trunkCenterOffset),
      hipHeightGap: toFixedNumber(hipHeightGap),
      avgVisibility: toFixedNumber(timingItem.metrics?.avgVisibility, 3),
      timingCoverageRatio: toFixedNumber(timingItem.metrics?.coverageRatio, 3),
      sideVisibility: toFixedNumber(sideVisibility, 3),
      scoreOneEvidence: timingItem.cycle.scoreOneEvidence ?? null,
    },
  };
}

function summarizeFeatureItems(items) {
  const usableItems = items.filter((item) => item.status === "ok");
  const ratingKeys = [
    "hurdleClearance",
    "stanceLegControl",
    "stepLegAlignment",
    "pelvisTrunkControl",
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
