const DEFAULT_OPTIONS = {
  minVisibility: 0.35,
  lowVisibilityThreshold: 0.5,
  minRotaryFrames: 3,
};

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

function distance(first, second) {
  if (!first || !second) {
    return null;
  }

  return Math.hypot(first.x - second.x, first.y - second.y);
}

function hasUsableLandmark(landmark, minVisibility) {
  if (
    !landmark ||
    typeof landmark.x !== "number" ||
    typeof landmark.y !== "number" ||
    !Number.isFinite(landmark.x) ||
    !Number.isFinite(landmark.y)
  ) {
    return false;
  }

  return (
    typeof landmark.visibility !== "number" ||
    landmark.visibility >= minVisibility
  );
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

function buildRotaryFrameFeature(frame, config) {
  const second = getFrameSecond(frame);
  const landmarks = getLandmarkMap(frame);
  const leftShoulder = landmarks.left_shoulder;
  const rightShoulder = landmarks.right_shoulder;
  const leftHip = landmarks.left_hip;
  const rightHip = landmarks.right_hip;
  const leftWrist = landmarks.left_wrist;
  const rightWrist = landmarks.right_wrist;
  const leftAnkle = landmarks.left_ankle;
  const rightAnkle = landmarks.right_ankle;
  const requiredLandmarks = [
    leftShoulder,
    rightShoulder,
    leftHip,
    rightHip,
    leftWrist,
    rightWrist,
    leftAnkle,
    rightAnkle,
  ];

  if (
    second === null ||
    requiredLandmarks.some(
      (landmark) => !hasUsableLandmark(landmark, config.minVisibility),
    )
  ) {
    return null;
  }

  const shoulderWidth = distance(leftShoulder, rightShoulder);
  const hipWidth = distance(leftHip, rightHip);
  const torsoLength = average([
    distance(leftShoulder, leftHip),
    distance(rightShoulder, rightHip),
  ]);
  const referenceLength = average([shoulderWidth, hipWidth, torsoLength]);

  if (!referenceLength) {
    return null;
  }

  const leftArmReach = distance(leftWrist, leftShoulder) / referenceLength;
  const rightArmReach = distance(rightWrist, rightShoulder) / referenceLength;
  const leftLegReach = distance(leftAnkle, leftHip) / referenceLength;
  const rightLegReach = distance(rightAnkle, rightHip) / referenceLength;
  const patterns = [
    {
      pattern: "left_same_side",
      side: "left",
      score: leftArmReach + leftLegReach,
    },
    {
      pattern: "right_same_side",
      side: "right",
      score: rightArmReach + rightLegReach,
    },
    {
      pattern: "left_arm_right_leg",
      side: "right",
      score: leftArmReach + rightLegReach,
    },
    {
      pattern: "right_arm_left_leg",
      side: "left",
      score: rightArmReach + leftLegReach,
    },
  ];
  const bestPattern = choosePattern(patterns);
  const shoulderSlope = slopeDegrees(leftShoulder, rightShoulder);
  const hipSlope = slopeDegrees(leftHip, rightHip);
  const trunkTwistDegrees = angleDifference(shoulderSlope, hipSlope);
  const shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2;
  const hipCenterX = (leftHip.x + rightHip.x) / 2;
  const trunkCenterOffset = Math.abs(shoulderCenterX - hipCenterX);
  const hipHeightGap = Math.abs(leftHip.y - rightHip.y);
  const avgVisibility = average(
    requiredLandmarks.map((landmark) => landmark.visibility),
  );

  return {
    second,
    pattern: bestPattern.pattern,
    side: bestPattern.side,
    rotaryReachScore: bestPattern.score,
    sideConfidence: calculateSideConfidence(bestPattern, patterns),
    leftArmReach,
    rightArmReach,
    leftLegReach,
    rightLegReach,
    trunkTwistDegrees,
    trunkCenterOffset,
    hipHeightGap,
    shoulderWidth,
    hipWidth,
    torsoLength,
    avgVisibility,
  };
}

export function buildRotaryStabilityFrameFeatures(payload, options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };

  if (!Array.isArray(payload?.frames)) {
    return [];
  }

  return payload.frames
    .map((frame) => buildRotaryFrameFeature(frame, config))
    .filter(Boolean)
    .sort((left, right) => left.second - right.second);
}

function pickBestRotaryFrame(features) {
  return features.reduce((bestFrame, frame) => {
    if (!bestFrame) {
      return frame;
    }

    return frame.rotaryReachScore > bestFrame.rotaryReachScore
      ? frame
      : bestFrame;
  }, null);
}

function timingIssue(code, severity, message) {
  return { code, severity, message };
}

function evaluateSegmentRotary(features, segment, config) {
  const segmentFeatures = features.filter(
    (feature) =>
      feature.second >= segment.startSecond &&
      feature.second <= segment.endSecond,
  );

  if (segmentFeatures.length < config.minRotaryFrames) {
    return {
      status: "insufficient_pose",
      label: "No reliable rotary stability frame",
      issues: [
        timingIssue(
          "insufficient_rotary_frames",
          "error",
          "Not enough usable shoulder/hip/wrist/ankle landmarks in this segment.",
        ),
      ],
      cycle: null,
      metrics: {
        usableRotaryFrames: segmentFeatures.length,
      },
    };
  }

  const bestFrame = pickBestRotaryFrame(segmentFeatures);
  const avgVisibility = average(
    segmentFeatures.map((feature) => feature.avgVisibility),
  );
  const issues = [];

  if (avgVisibility !== null && avgVisibility < config.lowVisibilityThreshold) {
    issues.push(
      timingIssue(
        "low_visibility",
        "warning",
        "Rotary stability landmarks are visible but low-confidence.",
      ),
    );
  }

  return {
    status: "good",
    label: "Best rotary stability frame detected",
    issues,
    cycle: {
      startSecond: segment.startSecond,
      endSecond: segment.endSecond,
      bestReachSecond: toFixedNumber(bestFrame.second, 2),
      lowestPointSecond: toFixedNumber(bestFrame.second, 2),
      rotaryReachScore: toFixedNumber(bestFrame.rotaryReachScore),
      pattern: bestFrame.pattern,
      side: bestFrame.side,
      avgVisibility: toFixedNumber(avgVisibility, 3),
    },
    metrics: {
      usableRotaryFrames: segmentFeatures.length,
      avgVisibility: toFixedNumber(avgVisibility, 3),
      bestReachSecond: toFixedNumber(bestFrame.second, 2),
      rotaryReachScore: toFixedNumber(bestFrame.rotaryReachScore),
      pattern: bestFrame.pattern,
      side: bestFrame.side,
    },
  };
}

function summarizeTimingItems(items) {
  const issueCounts = items.reduce((counts, item) => {
    item.issues.forEach((issue) => {
      counts[issue.code] = (counts[issue.code] ?? 0) + 1;
    });
    return counts;
  }, {});

  return {
    segmentsTotal: items.length,
    detectedCycles: items.filter((item) => item.cycle).length,
    goodCount: items.filter((item) => item.status === "good").length,
    needsAdjustmentCount: items.filter((item) => item.status !== "good").length,
    issueCounts,
  };
}

export function evaluateRotaryStabilitySegmentsTiming({
  posePayload,
  segments,
  options = {},
}) {
  if (!posePayload) {
    return {
      status: "no_pose",
      label: "No pose JSON",
      items: [],
      summary: {
        segmentsTotal: 0,
        detectedCycles: 0,
        goodCount: 0,
        needsAdjustmentCount: 0,
        issueCounts: {},
      },
      cycles: [],
      quality: null,
    };
  }

  if (!Array.isArray(segments) || segments.length === 0) {
    return {
      status: "no_segments",
      label: "No segments",
      items: [],
      summary: {
        segmentsTotal: 0,
        detectedCycles: 0,
        goodCount: 0,
        needsAdjustmentCount: 0,
        issueCounts: {},
      },
      cycles: [],
      quality: null,
    };
  }

  const config = { ...DEFAULT_OPTIONS, ...options };
  const features = buildRotaryStabilityFrameFeatures(posePayload, config);
  const items = segments.map((segment) => ({
    segmentId: segment.segmentId,
    repetitionIndex: segment.repetitionIndex,
    cameraView: segment.cameraView,
    side: segment.side,
    segmentMetadata: segment.metadata,
    currentStartSecond: segment.startSecond,
    currentEndSecond: segment.endSecond,
    ...evaluateSegmentRotary(features, segment, config),
  }));
  const summary = summarizeTimingItems(items);

  return {
    status: summary.needsAdjustmentCount > 0 ? "needs_adjustment" : "good",
    label:
      summary.needsAdjustmentCount > 0
        ? "Some segments lack rotary stability evidence"
        : "Rotary stability frames detected",
    items,
    summary,
    cycles: items.flatMap((item) => (item.cycle ? [item.cycle] : [])),
    quality: {
      status: features.length > 0 ? "ok" : "insufficient_pose",
      featureFrames: features.length,
    },
  };
}
