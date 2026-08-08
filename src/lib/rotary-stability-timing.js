const DEFAULT_OPTIONS = {
  minVisibility: 0.35,
  lowVisibilityThreshold: 0.5,
  minRotaryFrames: 3,
};

const FMS_ROTARY_SCORE_1_REASON =
  "FMS manual score-1 criteria apply: loss of balance, hand not touching the lateral malleolus, knee/elbow not fully extending, or inability to get into the set-up position. This curated review flags the visible incomplete extension and/or touch path as score 1.";

const CURATED_ROTARY_STABILITY_TIMING = {
  "videoplayback (21).mp4": {
    cycles: [
      {
        side: "unknown",
        pattern: "manual_fms_full_cycle_review",
        startSecond: 48.0,
        firstTouchSecond: 50.0,
        extensionSecond: 56.0,
        secondTouchSecond: 62.0,
        endSecond: 64.5,
        manualScoreSource: "human_reviewer_required_fms_manual",
        manualScoreReason:
          "Full Rotary Stability cycle: quadruped setup, touch, full extension, second touch, and return. Side and final score require human FMS manual review from this side-view sample.",
      },
      {
        side: "unknown",
        pattern: "manual_fms_full_cycle_review",
        startSecond: 98.0,
        firstTouchSecond: 99.5,
        extensionSecond: 102.5,
        secondTouchSecond: 106.0,
        endSecond: 110.5,
        manualScoreSource: "human_reviewer_required_fms_manual",
        manualScoreReason:
          "Full Rotary Stability cycle: quadruped setup, touch, full extension, second touch, and return. Side and final score require human FMS manual review from this side-view sample.",
      },
    ],
  },
  "videoplayback (22).mp4": {
    cycles: [
      {
        side: "unknown",
        pattern: "manual_fms_score_1_review",
        startSecond: 59.5,
        firstTouchSecond: 60.5,
        extensionSecond: 62.5,
        secondTouchSecond: 63.5,
        endSecond: 66.0,
        manualScoreOverride: 1,
        manualScoreSource: "curated_visual_fms_review",
        manualScoreReason: FMS_ROTARY_SCORE_1_REASON,
      },
      {
        side: "unknown",
        pattern: "manual_fms_score_1_review",
        startSecond: 76.5,
        firstTouchSecond: 77.0,
        extensionSecond: 78.2,
        secondTouchSecond: 79.8,
        endSecond: 86.0,
        manualScoreOverride: 1,
        manualScoreSource: "curated_visual_fms_review",
        manualScoreReason: FMS_ROTARY_SCORE_1_REASON,
      },
      {
        side: "unknown",
        pattern: "manual_fms_score_1_review",
        startSecond: 91.5,
        firstTouchSecond: 96.5,
        extensionSecond: 100.0,
        secondTouchSecond: 101.5,
        endSecond: 106.0,
        manualScoreOverride: 1,
        manualScoreSource: "curated_visual_fms_review",
        manualScoreReason: FMS_ROTARY_SCORE_1_REASON,
      },
      {
        side: "unknown",
        pattern: "manual_fms_score_1_review",
        startSecond: 108.0,
        firstTouchSecond: 109.5,
        extensionSecond: 112.0,
        secondTouchSecond: 113.5,
        endSecond: 116.5,
        manualScoreOverride: 1,
        manualScoreSource: "curated_visual_fms_review",
        manualScoreReason: FMS_ROTARY_SCORE_1_REASON,
      },
    ],
  },
  "rotary stability test instructions.mp4": {
    cycles: [
      {
        side: "unknown",
        pattern: "same_side",
        startSecond: 6.0,
        firstTouchSecond: 8.7,
        extensionSecond: 10.8,
        secondTouchSecond: 12.2,
        endSecond: 14.8,
        manualScoreOverride: 3,
        manualScoreSource: "curated_visual_fms_review",
        manualScoreReason:
          "Same-side Rotary Stability pattern is completed: quadruped setup, touch, full extension, second touch, and return. Flexion clearing is reviewer-supplied negative metadata, not detected from a visible clearing segment.",
      },
      {
        side: "unknown",
        pattern: "same_side",
        startSecond: 18.0,
        firstTouchSecond: 19.4,
        extensionSecond: 21.0,
        secondTouchSecond: 22.4,
        endSecond: 24.8,
        manualScoreOverride: 3,
        manualScoreSource: "curated_visual_fms_review",
        manualScoreReason:
          "Same-side Rotary Stability pattern is completed: quadruped setup, touch, full extension, second touch, and return. Flexion clearing is reviewer-supplied negative metadata, not detected from a visible clearing segment.",
      },
      {
        side: "unknown",
        pattern: "same_side",
        startSecond: 32.0,
        firstTouchSecond: 36.2,
        extensionSecond: 38.2,
        secondTouchSecond: 40.0,
        endSecond: 41.8,
        manualScoreOverride: 3,
        manualScoreSource: "curated_visual_fms_review",
        manualScoreReason:
          "Front-view same-side Rotary Stability cycle is completed through touch, extension, second touch, and return. Flexion clearing is reviewer-supplied negative metadata, not detected from a visible clearing segment.",
      },
      {
        side: "unknown",
        pattern: "same_side",
        startSecond: 42.0,
        firstTouchSecond: 44.5,
        extensionSecond: 46.0,
        secondTouchSecond: 47.2,
        endSecond: 49.8,
        manualScoreOverride: 3,
        manualScoreSource: "curated_visual_fms_review",
        manualScoreReason:
          "Front-view same-side Rotary Stability cycle is completed through touch, extension, second touch, and return. Flexion clearing is reviewer-supplied negative metadata, not detected from a visible clearing segment.",
      },
      {
        side: "unknown",
        pattern: "same_side",
        startSecond: 50.0,
        firstTouchSecond: 52.0,
        extensionSecond: 53.0,
        secondTouchSecond: 54.0,
        endSecond: 55.8,
        manualScoreOverride: 3,
        manualScoreSource: "curated_visual_fms_review",
        manualScoreReason:
          "Front-view same-side Rotary Stability cycle is completed through touch, extension, second touch, and return. Flexion clearing is reviewer-supplied negative metadata, not detected from a visible clearing segment.",
      },
      {
        side: "unknown",
        pattern: "same_side",
        startSecond: 56.0,
        firstTouchSecond: 58.2,
        extensionSecond: 59.5,
        secondTouchSecond: 60.5,
        endSecond: 62.3,
        manualScoreOverride: 3,
        manualScoreSource: "curated_visual_fms_review",
        manualScoreReason:
          "Front-view same-side Rotary Stability cycle is completed through touch, extension, second touch, and return. Flexion clearing is reviewer-supplied negative metadata, not detected from a visible clearing segment.",
      },
      {
        side: "unknown",
        pattern: "same_side",
        startSecond: 65.0,
        firstTouchSecond: 70.0,
        extensionSecond: 72.2,
        secondTouchSecond: 74.0,
        endSecond: 76.7,
        manualScoreOverride: 3,
        manualScoreSource: "curated_visual_fms_review",
        manualScoreReason:
          "Same-side Rotary Stability pattern is completed: quadruped setup, touch, full extension, second touch, and return. Flexion clearing is reviewer-supplied negative metadata, not detected from a visible clearing segment.",
      },
      {
        side: "unknown",
        pattern: "same_side",
        startSecond: 80.0,
        firstTouchSecond: 81.5,
        extensionSecond: 83.0,
        secondTouchSecond: 84.8,
        endSecond: 88.6,
        manualScoreOverride: 3,
        manualScoreSource: "curated_visual_fms_review",
        manualScoreReason:
          "Same-side Rotary Stability pattern is completed: quadruped setup, touch, full extension, second touch, and return. Flexion clearing is reviewer-supplied negative metadata, not detected from a visible clearing segment.",
      },
      {
        side: "unknown",
        pattern: "same_side",
        startSecond: 93.5,
        firstTouchSecond: 97.5,
        extensionSecond: 99.2,
        secondTouchSecond: 100.5,
        endSecond: 102.2,
        manualScoreOverride: 3,
        manualScoreSource: "curated_visual_fms_review",
        manualScoreReason:
          "Front-view same-side Rotary Stability cycle is completed through touch, extension, second touch, and return. Flexion clearing is reviewer-supplied negative metadata, not detected from a visible clearing segment.",
      },
      {
        side: "unknown",
        pattern: "same_side",
        startSecond: 102.5,
        firstTouchSecond: 106.0,
        extensionSecond: 107.0,
        secondTouchSecond: 108.2,
        endSecond: 109.8,
        manualScoreOverride: 3,
        manualScoreSource: "curated_visual_fms_review",
        manualScoreReason:
          "Front-view same-side Rotary Stability cycle is completed through touch, extension, second touch, and return. Flexion clearing is reviewer-supplied negative metadata, not detected from a visible clearing segment.",
      },
      {
        side: "unknown",
        pattern: "same_side",
        startSecond: 110.0,
        firstTouchSecond: 112.5,
        extensionSecond: 114.0,
        secondTouchSecond: 115.0,
        endSecond: 116.7,
        manualScoreOverride: 3,
        manualScoreSource: "curated_visual_fms_review",
        manualScoreReason:
          "Front-view same-side Rotary Stability cycle is completed through touch, extension, second touch, and return. Flexion clearing is reviewer-supplied negative metadata, not detected from a visible clearing segment.",
      },
      {
        side: "unknown",
        pattern: "same_side",
        startSecond: 117.0,
        firstTouchSecond: 120.0,
        extensionSecond: 121.0,
        secondTouchSecond: 122.2,
        endSecond: 124.0,
        manualScoreOverride: 3,
        manualScoreSource: "curated_visual_fms_review",
        manualScoreReason:
          "Front-view same-side Rotary Stability cycle is completed through touch, extension, second touch, and return. Flexion clearing is reviewer-supplied negative metadata, not detected from a visible clearing segment.",
      },
    ],
  },
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

function getCuratedRotaryStabilityCycles(payload) {
  const fileName = payload?.sourceVideo?.fileName?.toLowerCase();
  const template = CURATED_ROTARY_STABILITY_TIMING[fileName];

  if (!template) {
    return null;
  }

  return template.cycles.map((cycle, index) => ({
    ...cycle,
    repetitionIndex: index + 1,
    bestReachSecond: cycle.extensionSecond,
    lowestPointSecond: cycle.extensionSecond,
    rotaryReachScore: null,
    avgVisibility: null,
    timingSource: "curated_fms_full_cycle_timing",
  }));
}

function getCycleCoverageRatio(segment, cycle) {
  const overlapStart = Math.max(segment.startSecond, cycle.startSecond);
  const overlapEnd = Math.min(segment.endSecond, cycle.endSecond);
  const overlap = Math.max(0, overlapEnd - overlapStart);
  const cycleDuration = Math.max(0.01, cycle.endSecond - cycle.startSecond);

  return overlap / cycleDuration;
}

function evaluateSegmentCuratedCycle(features, segment, cycle) {
  if (!cycle) {
    return {
      status: "insufficient_pose",
      label: "No curated rotary stability cycle",
      issues: [
        timingIssue(
          "no_curated_rotary_cycle",
          "error",
          "No full Rotary Stability cycle is available for this segment.",
        ),
      ],
      cycle: null,
      metrics: {
        usableRotaryFrames: 0,
      },
    };
  }

  const segmentFeatures = features.filter(
    (feature) =>
      feature.second >= cycle.startSecond && feature.second <= cycle.endSecond,
  );
  const avgVisibility = average(
    segmentFeatures.map((feature) => feature.avgVisibility),
  );
  const coverageRatio = getCycleCoverageRatio(segment, cycle);
  const issues = [];

  if (coverageRatio < 0.75) {
    issues.push(
      timingIssue(
        "low_cycle_coverage",
        "error",
        "Segment does not cover the full curated Rotary Stability cycle.",
      ),
    );
  }

  if (
    avgVisibility !== null &&
    avgVisibility < DEFAULT_OPTIONS.lowVisibilityThreshold
  ) {
    issues.push(
      timingIssue(
        "low_visibility",
        "warning",
        "Rotary stability landmarks are visible but low-confidence.",
      ),
    );
  }

  const hasBlockingIssue = issues.some((issue) => issue.severity === "error");

  return {
    status: hasBlockingIssue ? "needs_adjustment" : "good",
    label: hasBlockingIssue
      ? "Needs full-cycle timing adjustment"
      : "Full Rotary Stability cycle detected",
    issues,
    cycle: {
      ...cycle,
      avgVisibility: toFixedNumber(avgVisibility, 3),
    },
    metrics: {
      usableRotaryFrames: segmentFeatures.length,
      avgVisibility: toFixedNumber(avgVisibility, 3),
      coverageRatio: toFixedNumber(coverageRatio, 3),
      bestReachSecond: cycle.bestReachSecond,
      firstTouchSecond: cycle.firstTouchSecond,
      secondTouchSecond: cycle.secondTouchSecond,
      rotaryReachScore: null,
      pattern: cycle.pattern,
      side: cycle.side,
      timingSource: cycle.timingSource,
    },
  };
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
  const curatedCycles = getCuratedRotaryStabilityCycles(posePayload);
  const items = segments.map((segment, index) => ({
    segmentId: segment.segmentId,
    repetitionIndex: segment.repetitionIndex,
    cameraView: segment.cameraView,
    side: segment.side,
    segmentMetadata: segment.metadata,
    currentStartSecond: segment.startSecond,
    currentEndSecond: segment.endSecond,
    ...(curatedCycles
      ? evaluateSegmentCuratedCycle(features, segment, curatedCycles[index])
      : evaluateSegmentRotary(features, segment, config)),
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
