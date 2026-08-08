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

function slopeDegrees(first, second) {
  if (!first || !second) {
    return null;
  }

  return (Math.atan2(first.y - second.y, first.x - second.x) * 180) / Math.PI;
}

function angleDifference(first, second) {
  if (first === null || second === null) {
    return null;
  }

  const diff = Math.abs(first - second) % 180;
  return diff > 90 ? 180 - diff : diff;
}

function classifyRotaryReach(score) {
  if (score === null) {
    return {
      status: "not_applicable",
      label: "missing rotary reach",
    };
  }

  if (score >= 1.3) {
    return {
      status: "good",
      label: "clear rotary reach",
    };
  }

  if (score >= 0.9) {
    return {
      status: "watch",
      label: "partial rotary reach",
    };
  }

  return {
    status: "limited",
    label: "limited rotary reach",
  };
}

function classifyTrunkRotation(twistDegrees) {
  if (twistDegrees === null) {
    return {
      status: "not_applicable",
      label: "missing trunk reference",
    };
  }

  if (twistDegrees <= 15) {
    return {
      status: "good",
      label: "controlled trunk rotation",
    };
  }

  if (twistDegrees <= 30) {
    return {
      status: "watch",
      label: "trunk rotation watch",
    };
  }

  return {
    status: "limited",
    label: "large trunk rotation",
  };
}

function classifyBalanceStability(centerOffset, hipHeightGap) {
  if (centerOffset === null || hipHeightGap === null) {
    return {
      status: "not_applicable",
      label: "missing stability proxy",
    };
  }

  if (centerOffset <= 0.08 && hipHeightGap <= 0.08) {
    return {
      status: "good",
      label: "stable quadruped line",
    };
  }

  if (centerOffset <= 0.15 && hipHeightGap <= 0.14) {
    return {
      status: "watch",
      label: "stability watch",
    };
  }

  return {
    status: "limited",
    label: "large stability shift",
  };
}

function classifySideConfidence(confidence, visibility) {
  if (confidence === null && visibility === null) {
    return {
      status: "not_applicable",
      label: "side not available",
    };
  }

  const combined = average([confidence, visibility]);

  if (combined >= 0.72) {
    return {
      status: "good",
      label: "rotary side detected",
    };
  }

  if (combined >= 0.45) {
    return {
      status: "watch",
      label: "rotary side tentative",
    };
  }

  return {
    status: "limited",
    label: "rotary side low confidence",
  };
}

function choosePattern(patterns) {
  return patterns.reduce((bestPattern, pattern) => {
    if (!bestPattern) {
      return pattern;
    }

    return pattern.score > bestPattern.score ? pattern : bestPattern;
  }, null);
}

function calculateSideConfidence(bestPattern, patterns) {
  if (!bestPattern) {
    return null;
  }

  const nextBest = patterns
    .filter((pattern) => pattern !== bestPattern)
    .reduce((bestScore, pattern) => Math.max(bestScore, pattern.score), 0);
  const delta = bestPattern.score - nextBest;

  return Math.max(0, Math.min(1, delta / Math.max(0.01, bestPattern.score)));
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
  const leftShoulder = landmarks.left_shoulder;
  const rightShoulder = landmarks.right_shoulder;
  const leftHip = landmarks.left_hip;
  const rightHip = landmarks.right_hip;
  const leftWrist = landmarks.left_wrist;
  const rightWrist = landmarks.right_wrist;
  const leftAnkle = landmarks.left_ankle;
  const rightAnkle = landmarks.right_ankle;
  const shoulderWidth = distance(leftShoulder, rightShoulder);
  const hipWidth = distance(leftHip, rightHip);
  const torsoLength = average([
    distance(leftShoulder, leftHip),
    distance(rightShoulder, rightHip),
  ]);
  const referenceLength = average([shoulderWidth, hipWidth, torsoLength]);
  const leftArmReach =
    leftWrist && leftShoulder && referenceLength
      ? distance(leftWrist, leftShoulder) / Math.max(0.01, referenceLength)
      : null;
  const rightArmReach =
    rightWrist && rightShoulder && referenceLength
      ? distance(rightWrist, rightShoulder) / Math.max(0.01, referenceLength)
      : null;
  const leftLegReach =
    leftAnkle && leftHip && referenceLength
      ? distance(leftAnkle, leftHip) / Math.max(0.01, referenceLength)
      : null;
  const rightLegReach =
    rightAnkle && rightHip && referenceLength
      ? distance(rightAnkle, rightHip) / Math.max(0.01, referenceLength)
      : null;
  const patterns = [
    {
      pattern: "left_same_side",
      side: "left",
      score: (leftArmReach ?? 0) + (leftLegReach ?? 0),
    },
    {
      pattern: "right_same_side",
      side: "right",
      score: (rightArmReach ?? 0) + (rightLegReach ?? 0),
    },
    {
      pattern: "left_arm_right_leg",
      side: "right",
      score: (leftArmReach ?? 0) + (rightLegReach ?? 0),
    },
    {
      pattern: "right_arm_left_leg",
      side: "left",
      score: (rightArmReach ?? 0) + (leftLegReach ?? 0),
    },
  ];
  const bestPattern = choosePattern(patterns);
  const shoulderSlope = slopeDegrees(leftShoulder, rightShoulder);
  const hipSlope = slopeDegrees(leftHip, rightHip);
  const trunkTwistDegrees = angleDifference(shoulderSlope, hipSlope);
  const shoulderCenterX =
    leftShoulder && rightShoulder
      ? (leftShoulder.x + rightShoulder.x) / 2
      : null;
  const hipCenterX = leftHip && rightHip ? (leftHip.x + rightHip.x) / 2 : null;
  const trunkCenterOffset =
    shoulderCenterX !== null && hipCenterX !== null
      ? Math.abs(shoulderCenterX - hipCenterX)
      : null;
  const hipHeightGap =
    leftHip && rightHip ? Math.abs(leftHip.y - rightHip.y) : null;
  const avgVisibility = average([
    leftShoulder?.visibility,
    rightShoulder?.visibility,
    leftHip?.visibility,
    rightHip?.visibility,
    leftWrist?.visibility,
    rightWrist?.visibility,
    leftAnkle?.visibility,
    rightAnkle?.visibility,
  ]);
  const sideConfidence = calculateSideConfidence(bestPattern, patterns);
  const rotaryReachScore = bestPattern?.score ?? null;

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
      rotaryDiagonalControl: classifyRotaryReach(rotaryReachScore),
      trunkRotationControl: classifyTrunkRotation(trunkTwistDegrees),
      balanceStability: classifyBalanceStability(
        trunkCenterOffset,
        hipHeightGap,
      ),
      sideConfidence: classifySideConfidence(sideConfidence, avgVisibility),
    },
    metrics: {
      side: bestPattern?.side ?? "unknown",
      pattern: bestPattern?.pattern ?? null,
      rotaryReachScore: toFixedNumber(rotaryReachScore, 3),
      trunkTwistDegrees: toFixedNumber(trunkTwistDegrees, 1),
      trunkCenterOffset: toFixedNumber(trunkCenterOffset, 3),
      hipHeightGap: toFixedNumber(hipHeightGap, 3),
      leftArmReach: toFixedNumber(leftArmReach, 3),
      rightArmReach: toFixedNumber(rightArmReach, 3),
      leftLegReach: toFixedNumber(leftLegReach, 3),
      rightLegReach: toFixedNumber(rightLegReach, 3),
      sideVisibility: toFixedNumber(avgVisibility, 3),
      sideConfidence: toFixedNumber(sideConfidence, 3),
      timingVisibility: toFixedNumber(timingItem.metrics?.avgVisibility, 3),
    },
    manualScoreOverride: timingItem.cycle.manualScoreOverride ?? null,
    manualScoreSource: timingItem.cycle.manualScoreSource ?? null,
    manualScoreReason: timingItem.cycle.manualScoreReason ?? null,
  };
}

function summarizeFeatureItems(items) {
  const usableItems = items.filter((item) => item.status === "ok");
  const ratingKeys = [
    "rotaryDiagonalControl",
    "trunkRotationControl",
    "balanceStability",
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
    avgRotaryReachScore: toFixedNumber(
      average(usableItems.map((item) => item.metrics.rotaryReachScore)),
      3,
    ),
    avgVisibility: toFixedNumber(
      average(usableItems.map((item) => item.metrics.timingVisibility)),
      3,
    ),
    ratingCounts,
  };
}

export function summarizeRotaryStabilityPoseFeatures({
  posePayload,
  timingReport,
}) {
  if (!posePayload || !timingReport?.items) {
    return null;
  }

  const items = timingReport.items.map((timingItem) =>
    buildFeatureItem({ posePayload, timingItem }),
  );

  return {
    actionType: "rotary_stability",
    status: items.some((item) => item.status === "ok")
      ? "ok"
      : "insufficient_pose",
    items,
    summary: summarizeFeatureItems(items),
  };
}
