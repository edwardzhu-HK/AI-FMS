const DEFAULT_OPTIONS = {
  minVisibility: 0.35,
  lowVisibilityThreshold: 0.5,
  minUsableFrames: 3,
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

function pointLineDistance(point, lineStart, lineEnd) {
  if (!point || !lineStart || !lineEnd) {
    return null;
  }

  const denominator = distance(lineStart, lineEnd);

  if (!denominator) {
    return null;
  }

  return (
    Math.abs(
      (lineEnd.x - lineStart.x) * (lineStart.y - point.y) -
        (lineStart.x - point.x) * (lineEnd.y - lineStart.y),
    ) / denominator
  );
}

function angleDegrees(first, middle, third) {
  if (!first || !middle || !third) {
    return null;
  }

  const firstVector = {
    x: first.x - middle.x,
    y: first.y - middle.y,
  };
  const secondVector = {
    x: third.x - middle.x,
    y: third.y - middle.y,
  };
  const firstLength = Math.hypot(firstVector.x, firstVector.y);
  const secondLength = Math.hypot(secondVector.x, secondVector.y);

  if (!firstLength || !secondLength) {
    return null;
  }

  const cosine =
    (firstVector.x * secondVector.x + firstVector.y * secondVector.y) /
    (firstLength * secondLength);

  return (Math.acos(Math.max(-1, Math.min(1, cosine))) * 180) / Math.PI;
}

function buildPushUpFrameFeature(frame, config) {
  const second = getFrameSecond(frame);
  const landmarks = getLandmarkMap(frame);
  const leftShoulder = landmarks.left_shoulder;
  const rightShoulder = landmarks.right_shoulder;
  const leftHip = landmarks.left_hip;
  const rightHip = landmarks.right_hip;
  const leftAnkle = landmarks.left_ankle;
  const rightAnkle = landmarks.right_ankle;
  const leftWrist = landmarks.left_wrist;
  const rightWrist = landmarks.right_wrist;
  const leftElbow = landmarks.left_elbow;
  const rightElbow = landmarks.right_elbow;

  if (
    second === null ||
    !hasUsableLandmark(leftShoulder, config.minVisibility) ||
    !hasUsableLandmark(rightShoulder, config.minVisibility) ||
    !hasUsableLandmark(leftHip, config.minVisibility) ||
    !hasUsableLandmark(rightHip, config.minVisibility) ||
    !hasUsableLandmark(leftWrist, config.minVisibility) ||
    !hasUsableLandmark(rightWrist, config.minVisibility)
  ) {
    return null;
  }

  const shoulderMid = midpoint(leftShoulder, rightShoulder);
  const hipMid = midpoint(leftHip, rightHip);
  const ankleMid =
    hasUsableLandmark(leftAnkle, config.minVisibility) &&
    hasUsableLandmark(rightAnkle, config.minVisibility)
      ? midpoint(leftAnkle, rightAnkle)
      : null;
  const wristMid = midpoint(leftWrist, rightWrist);
  const torsoLength = distance(shoulderMid, hipMid);
  const bodyLength = ankleMid ? distance(shoulderMid, ankleMid) : torsoLength;
  const referenceLength = bodyLength ?? torsoLength;
  const shoulderWristLift =
    shoulderMid && wristMid && referenceLength
      ? (wristMid.y - shoulderMid.y) / Math.max(0.01, referenceLength)
      : null;
  const hipLineOffset =
    hipMid && shoulderMid && ankleMid && referenceLength
      ? pointLineDistance(hipMid, shoulderMid, ankleMid) /
        Math.max(0.01, referenceLength)
      : null;
  const elbowAngles = [
    angleDegrees(leftShoulder, leftElbow, leftWrist),
    angleDegrees(rightShoulder, rightElbow, rightWrist),
  ].filter((value) => typeof value === "number" && Number.isFinite(value));
  const avgElbowAngle = average(elbowAngles);
  const avgVisibility = average([
    leftShoulder.visibility,
    rightShoulder.visibility,
    leftHip.visibility,
    rightHip.visibility,
    leftAnkle?.visibility,
    rightAnkle?.visibility,
    leftWrist.visibility,
    rightWrist.visibility,
    leftElbow?.visibility,
    rightElbow?.visibility,
  ]);

  if (!referenceLength || shoulderWristLift === null) {
    return null;
  }

  return {
    second,
    shoulderWristLift,
    hipLineOffset,
    avgElbowAngle,
    avgVisibility,
    referenceLength,
    torsoLength,
  };
}

export function buildTrunkStabilityFrameFeatures(payload, options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };

  if (!Array.isArray(payload?.frames)) {
    return [];
  }

  return payload.frames
    .map((frame) => buildPushUpFrameFeature(frame, config))
    .filter(Boolean)
    .sort((left, right) => left.second - right.second);
}

function pickBestPushUpFrame(features) {
  return features.reduce((bestFrame, frame) => {
    if (!bestFrame) {
      return frame;
    }

    return frame.shoulderWristLift > bestFrame.shoulderWristLift
      ? frame
      : bestFrame;
  }, null);
}

function valueRange(values) {
  const validValues = values.filter(
    (value) => typeof value === "number" && Number.isFinite(value),
  );

  if (validValues.length === 0) {
    return null;
  }

  return Math.max(...validValues) - Math.min(...validValues);
}

function timingIssue(code, severity, message) {
  return { code, severity, message };
}

function evaluateSegmentPushUp(features, segment, config) {
  const segmentFeatures = features.filter(
    (feature) =>
      feature.second >= segment.startSecond &&
      feature.second <= segment.endSecond,
  );

  if (segmentFeatures.length < config.minUsableFrames) {
    return {
      status: "insufficient_pose",
      label: "No reliable push-up frame",
      issues: [
        timingIssue(
          "insufficient_push_up_frames",
          "error",
          "Not enough usable trunk/arm landmarks in this segment.",
        ),
      ],
      cycle: null,
      metrics: {
        usableFrames: segmentFeatures.length,
      },
    };
  }

  const bestFrame = pickBestPushUpFrame(segmentFeatures);
  const avgVisibility = average(
    segmentFeatures.map((feature) => feature.avgVisibility),
  );
  const hipLineOffsetRange = valueRange(
    segmentFeatures.map((feature) => feature.hipLineOffset),
  );
  const issues = [];

  if (avgVisibility !== null && avgVisibility < config.lowVisibilityThreshold) {
    issues.push(
      timingIssue(
        "low_visibility",
        "warning",
        "Trunk push-up landmarks are visible but low-confidence.",
      ),
    );
  }

  return {
    status: "good",
    label: "Best trunk push-up frame detected",
    issues,
    cycle: {
      startSecond: segment.startSecond,
      endSecond: segment.endSecond,
      bestPushSecond: toFixedNumber(bestFrame.second, 2),
      lowestPointSecond: toFixedNumber(bestFrame.second, 2),
      shoulderWristLift: toFixedNumber(bestFrame.shoulderWristLift),
      hipLineOffset: toFixedNumber(bestFrame.hipLineOffset),
      avgElbowAngle: toFixedNumber(bestFrame.avgElbowAngle, 1),
      avgVisibility: toFixedNumber(avgVisibility, 3),
    },
    metrics: {
      usableFrames: segmentFeatures.length,
      avgVisibility: toFixedNumber(avgVisibility, 3),
      bestPushSecond: toFixedNumber(bestFrame.second, 2),
      shoulderWristLift: toFixedNumber(bestFrame.shoulderWristLift),
      hipLineOffset: toFixedNumber(bestFrame.hipLineOffset),
      hipLineOffsetRange: toFixedNumber(hipLineOffsetRange),
      avgElbowAngle: toFixedNumber(bestFrame.avgElbowAngle, 1),
    },
  };
}

function summarizeTimingItems(items) {
  const okItems = items.filter((item) => item.status === "good");
  const errorCount = items.filter((item) =>
    item.issues.some((issue) => issue.severity === "error"),
  ).length;
  const avgVisibility = average(
    okItems.map((item) => item.metrics.avgVisibility),
  );

  return {
    segmentsTotal: items.length,
    okSegments: okItems.length,
    errorCount,
    avgVisibility: toFixedNumber(avgVisibility, 3),
  };
}

export function evaluateTrunkStabilitySegmentsTiming({
  posePayload,
  segments,
  options = {},
} = {}) {
  if (!posePayload || !Array.isArray(segments)) {
    return null;
  }

  const config = { ...DEFAULT_OPTIONS, ...options };
  const features = buildTrunkStabilityFrameFeatures(posePayload, config);
  const items = segments.map((segment, index) => {
    const result = evaluateSegmentPushUp(features, segment, config);

    return {
      segmentId: segment.segmentId,
      repetitionIndex: segment.repetitionIndex ?? index + 1,
      cameraView: segment.cameraView ?? "side",
      actionType: segment.actionType ?? "trunk_stability_push_up",
      segmentStartSecond: segment.startSecond,
      segmentEndSecond: segment.endSecond,
      suggestedStartSecond: result.cycle?.startSecond ?? null,
      suggestedEndSecond: result.cycle?.endSecond ?? null,
      coverageRatio: result.status === "good" ? 1 : 0,
      status: result.status,
      label: result.label,
      issues: result.issues,
      cycle: result.cycle,
      metrics: result.metrics,
    };
  });

  return {
    status: "ok",
    actionType: "trunk_stability_push_up",
    modelVersion: "pose-timing-v0.1-trunk-stability-push-up",
    items,
    summary: summarizeTimingItems(items),
  };
}
