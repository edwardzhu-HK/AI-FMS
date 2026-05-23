const DEFAULT_OPTIONS = {
  minVisibility: 0.35,
  lowVisibilityThreshold: 0.5,
  minReachFrames: 3,
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

function buildReachFrameFeature(frame, config) {
  const second = getFrameSecond(frame);
  const landmarks = getLandmarkMap(frame);
  const leftWrist = landmarks.left_wrist;
  const rightWrist = landmarks.right_wrist;
  const leftShoulder = landmarks.left_shoulder;
  const rightShoulder = landmarks.right_shoulder;
  const leftHip = landmarks.left_hip;
  const rightHip = landmarks.right_hip;

  if (
    second === null ||
    !hasUsableLandmark(leftWrist, config.minVisibility) ||
    !hasUsableLandmark(rightWrist, config.minVisibility) ||
    !hasUsableLandmark(leftShoulder, config.minVisibility) ||
    !hasUsableLandmark(rightShoulder, config.minVisibility)
  ) {
    return null;
  }

  const shoulderWidth = distance(leftShoulder, rightShoulder);
  const torsoLength = average([
    distance(leftShoulder, leftHip),
    distance(rightShoulder, rightHip),
  ]);
  const referenceLength = torsoLength ?? shoulderWidth;
  const wristDistance = distance(leftWrist, rightWrist);
  const avgVisibility = average([
    leftWrist.visibility,
    rightWrist.visibility,
    leftShoulder.visibility,
    rightShoulder.visibility,
    leftHip?.visibility,
    rightHip?.visibility,
  ]);

  if (!referenceLength || !wristDistance) {
    return null;
  }

  return {
    second,
    wristDistance,
    wristDistanceRatio: wristDistance / Math.max(0.01, referenceLength),
    shoulderWidth,
    torsoLength,
    avgVisibility,
  };
}

export function buildShoulderMobilityFrameFeatures(payload, options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };

  if (!Array.isArray(payload?.frames)) {
    return [];
  }

  return payload.frames
    .map((frame) => buildReachFrameFeature(frame, config))
    .filter(Boolean)
    .sort((left, right) => left.second - right.second);
}

function pickBestReachFrame(features) {
  return features.reduce((bestFrame, frame) => {
    if (!bestFrame) {
      return frame;
    }

    return frame.wristDistanceRatio < bestFrame.wristDistanceRatio
      ? frame
      : bestFrame;
  }, null);
}

function timingIssue(code, severity, message) {
  return { code, severity, message };
}

function evaluateSegmentReach(features, segment, config) {
  const segmentFeatures = features.filter(
    (feature) =>
      feature.second >= segment.startSecond &&
      feature.second <= segment.endSecond,
  );

  if (segmentFeatures.length < config.minReachFrames) {
    return {
      status: "insufficient_pose",
      label: "No reliable shoulder reach frame",
      issues: [
        timingIssue(
          "insufficient_reach_frames",
          "error",
          "Not enough usable shoulder/wrist landmarks in this segment.",
        ),
      ],
      cycle: null,
      metrics: {
        usableReachFrames: segmentFeatures.length,
      },
    };
  }

  const bestFrame = pickBestReachFrame(segmentFeatures);
  const avgVisibility = average(
    segmentFeatures.map((feature) => feature.avgVisibility),
  );
  const issues = [];

  if (avgVisibility !== null && avgVisibility < config.lowVisibilityThreshold) {
    issues.push(
      timingIssue(
        "low_visibility",
        "warning",
        "Shoulder/wrist landmarks are visible but low-confidence.",
      ),
    );
  }

  return {
    status: "good",
    label: "Best shoulder reach frame detected",
    issues,
    cycle: {
      startSecond: segment.startSecond,
      endSecond: segment.endSecond,
      bestReachSecond: toFixedNumber(bestFrame.second, 2),
      // Keep the existing timing export/UI shape until a later schema review.
      lowestPointSecond: toFixedNumber(bestFrame.second, 2),
      wristDistanceRatio: toFixedNumber(bestFrame.wristDistanceRatio),
      avgVisibility: toFixedNumber(avgVisibility, 3),
    },
    metrics: {
      usableReachFrames: segmentFeatures.length,
      avgVisibility: toFixedNumber(avgVisibility, 3),
      bestReachSecond: toFixedNumber(bestFrame.second, 2),
      wristDistanceRatio: toFixedNumber(bestFrame.wristDistanceRatio),
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

export function evaluateShoulderMobilitySegmentsTiming({
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
  const features = buildShoulderMobilityFrameFeatures(posePayload, config);
  const items = segments.map((segment) => ({
    segmentId: segment.segmentId,
    repetitionIndex: segment.repetitionIndex,
    cameraView: segment.cameraView,
    side: segment.side,
    segmentMetadata: segment.metadata,
    currentStartSecond: segment.startSecond,
    currentEndSecond: segment.endSecond,
    ...evaluateSegmentReach(features, segment, config),
  }));
  const summary = summarizeTimingItems(items);

  return {
    status: summary.needsAdjustmentCount > 0 ? "needs_adjustment" : "good",
    label:
      summary.needsAdjustmentCount > 0
        ? "Some segments lack shoulder reach evidence"
        : "Shoulder reach frames detected",
    items,
    summary,
    cycles: items.flatMap((item) => (item.cycle ? [item.cycle] : [])),
    quality: {
      status: features.length > 0 ? "ok" : "insufficient_pose",
      featureFrames: features.length,
    },
  };
}
