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

function getAveragePoint(landmarks, names) {
  const x = average(names.map((name) => landmarks[name]?.x));
  const y = average(names.map((name) => landmarks[name]?.y));
  const visibility = average(names.map((name) => landmarks[name]?.visibility));

  if (x === null || y === null) {
    return null;
  }

  return { x, y, visibility };
}

function angleBetweenPoints(start, vertex, end) {
  if (!start || !vertex || !end) {
    return null;
  }

  const first = {
    x: start.x - vertex.x,
    y: start.y - vertex.y,
  };
  const second = {
    x: end.x - vertex.x,
    y: end.y - vertex.y,
  };
  const firstMagnitude = Math.hypot(first.x, first.y);
  const secondMagnitude = Math.hypot(second.x, second.y);

  if (firstMagnitude === 0 || secondMagnitude === 0) {
    return null;
  }

  const cosine =
    (first.x * second.x + first.y * second.y) /
    (firstMagnitude * secondMagnitude);
  const clampedCosine = Math.max(-1, Math.min(1, cosine));
  return (Math.acos(clampedCosine) * 180) / Math.PI;
}

function sideJointAngle(landmarks, side, start, vertex, end) {
  return angleBetweenPoints(
    landmarks[`${side}_${start}`],
    landmarks[`${side}_${vertex}`],
    landmarks[`${side}_${end}`],
  );
}

function averageSideJointAngle(landmarks, start, vertex, end) {
  return average([
    sideJointAngle(landmarks, "left", start, vertex, end),
    sideJointAngle(landmarks, "right", start, vertex, end),
  ]);
}

function sideShankLeanAngle(landmarks, side) {
  const knee = landmarks[`${side}_knee`];
  const ankle = landmarks[`${side}_ankle`];

  if (!knee || !ankle) {
    return null;
  }

  return Math.abs(
    (Math.atan2(knee.x - ankle.x, ankle.y - knee.y) * 180) / Math.PI,
  );
}

function averageShankLeanAngle(landmarks) {
  return average([
    sideShankLeanAngle(landmarks, "left"),
    sideShankLeanAngle(landmarks, "right"),
  ]);
}

function classifyDepth(hipKneeVerticalGap) {
  if (hipKneeVerticalGap === null) {
    return {
      status: "not_applicable",
      label: "missing landmarks",
    };
  }

  if (hipKneeVerticalGap >= 0.025) {
    return {
      status: "good",
      label: "hip below knee",
    };
  }

  if (hipKneeVerticalGap >= -0.015) {
    return {
      status: "watch",
      label: "near parallel",
    };
  }

  return {
    status: "limited",
    label: "limited depth",
  };
}

function classifySideAngle(cameraView, value, thresholds, labels) {
  if (value === null) {
    return {
      status: "not_applicable",
      label: "missing landmarks",
    };
  }

  if (cameraView !== "side") {
    return {
      status: "not_applicable",
      label: "best from side view",
    };
  }

  if (thresholds.good(value)) {
    return {
      status: "good",
      label: labels.good,
    };
  }

  if (thresholds.watch(value)) {
    return {
      status: "watch",
      label: labels.watch,
    };
  }

  return {
    status: "limited",
    label: labels.limited,
  };
}

function classifyHipAngle(cameraView, hipAngleDegrees) {
  return classifySideAngle(
    cameraView,
    hipAngleDegrees,
    {
      good: (value) => value <= 115,
      watch: (value) => value <= 140,
    },
    {
      good: "deep hip flexion",
      watch: "moderate hip flexion",
      limited: "limited hip flexion",
    },
  );
}

function classifyKneeAngle(cameraView, kneeAngleDegrees) {
  return classifySideAngle(
    cameraView,
    kneeAngleDegrees,
    {
      good: (value) => value <= 105,
      watch: (value) => value <= 135,
    },
    {
      good: "deep knee flexion",
      watch: "moderate knee flexion",
      limited: "limited knee flexion",
    },
  );
}

function classifyAnkleAngle(cameraView, ankleShankLeanDegrees) {
  return classifySideAngle(
    cameraView,
    ankleShankLeanDegrees,
    {
      good: (value) => value >= 18,
      watch: (value) => value >= 10,
    },
    {
      good: "ankle mobility proxy ok",
      watch: "ankle mobility watch",
      limited: "limited ankle proxy",
    },
  );
}

function classifyTorso(cameraView, trunkLeanDegrees) {
  if (trunkLeanDegrees === null) {
    return {
      status: "not_applicable",
      label: "missing landmarks",
    };
  }

  if (cameraView !== "side") {
    return {
      status: "not_applicable",
      label: "best from side view",
    };
  }

  if (trunkLeanDegrees <= 24) {
    return {
      status: "good",
      label: "controlled trunk",
    };
  }

  if (trunkLeanDegrees <= 34) {
    return {
      status: "watch",
      label: "forward lean watch",
    };
  }

  return {
    status: "limited",
    label: "excessive forward lean",
  };
}

function classifyKneeAlignment(cameraView, maxKneeAnkleOffset) {
  if (maxKneeAnkleOffset === null) {
    return {
      status: "not_applicable",
      label: "missing landmarks",
    };
  }

  if (cameraView !== "front") {
    return {
      status: "not_applicable",
      label: "best from front view",
    };
  }

  if (maxKneeAnkleOffset <= 0.04) {
    return {
      status: "good",
      label: "knees track feet",
    };
  }

  if (maxKneeAnkleOffset <= 0.08) {
    return {
      status: "watch",
      label: "mild knee drift",
    };
  }

  return {
    status: "limited",
    label: "large knee drift",
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
    timingItem.cycle.lowestPointSecond,
  );
  const landmarks = getLandmarkMap(frame);
  const shoulderMid = getAveragePoint(landmarks, [
    "left_shoulder",
    "right_shoulder",
  ]);
  const hipMid = getAveragePoint(landmarks, ["left_hip", "right_hip"]);
  const kneeMid = getAveragePoint(landmarks, ["left_knee", "right_knee"]);
  const leftKnee = landmarks.left_knee ?? null;
  const rightKnee = landmarks.right_knee ?? null;
  const leftAnkle = landmarks.left_ankle ?? null;
  const rightAnkle = landmarks.right_ankle ?? null;
  const hipKneeVerticalGap = hipMid && kneeMid ? hipMid.y - kneeMid.y : null;
  const hipAngleDegrees = averageSideJointAngle(
    landmarks,
    "shoulder",
    "hip",
    "knee",
  );
  const kneeAngleDegrees = averageSideJointAngle(
    landmarks,
    "hip",
    "knee",
    "ankle",
  );
  const ankleAngleDegrees = averageSideJointAngle(
    landmarks,
    "knee",
    "ankle",
    "foot_index",
  );
  const ankleShankLeanDegrees = averageShankLeanAngle(landmarks);
  const trunkLeanDegrees =
    shoulderMid && hipMid
      ? Math.abs(
          (Math.atan2(hipMid.x - shoulderMid.x, hipMid.y - shoulderMid.y) *
            180) /
            Math.PI,
        )
      : null;
  const leftKneeAnkleOffset =
    leftKnee && leftAnkle ? leftKnee.x - leftAnkle.x : null;
  const rightKneeAnkleOffset =
    rightKnee && rightAnkle ? rightKnee.x - rightAnkle.x : null;
  const maxKneeAnkleOffset = Math.max(
    Math.abs(leftKneeAnkleOffset ?? 0),
    Math.abs(rightKneeAnkleOffset ?? 0),
  );
  const normalizedMaxKneeAnkleOffset =
    leftKneeAnkleOffset === null && rightKneeAnkleOffset === null
      ? null
      : maxKneeAnkleOffset;
  const cameraView = timingItem.cameraView;

  return {
    segmentId: timingItem.segmentId,
    repetitionIndex: timingItem.repetitionIndex,
    cameraView,
    status: "ok",
    sourceSecond: frame?.second ?? null,
    suggestedWindow: {
      startSecond: timingItem.cycle.startSecond,
      endSecond: timingItem.cycle.endSecond,
      lowestPointSecond: timingItem.cycle.lowestPointSecond,
    },
    ratings: {
      depth: classifyDepth(hipKneeVerticalGap),
      torsoControl: classifyTorso(cameraView, trunkLeanDegrees),
      kneeAlignment: classifyKneeAlignment(
        cameraView,
        normalizedMaxKneeAnkleOffset,
      ),
      hipAngle: classifyHipAngle(cameraView, hipAngleDegrees),
      kneeAngle: classifyKneeAngle(cameraView, kneeAngleDegrees),
      ankleAngle: classifyAnkleAngle(cameraView, ankleShankLeanDegrees),
    },
    metrics: {
      peakDepthRatio: timingItem.cycle.peakDepthRatio,
      hipKneeVerticalGap: toFixedNumber(hipKneeVerticalGap),
      hipAngleDegrees: toFixedNumber(hipAngleDegrees, 1),
      kneeAngleDegrees: toFixedNumber(kneeAngleDegrees, 1),
      ankleAngleDegrees: toFixedNumber(ankleAngleDegrees, 1),
      ankleShankLeanDegrees: toFixedNumber(ankleShankLeanDegrees, 1),
      trunkLeanDegrees: toFixedNumber(trunkLeanDegrees, 1),
      leftKneeAnkleOffset: toFixedNumber(leftKneeAnkleOffset),
      rightKneeAnkleOffset: toFixedNumber(rightKneeAnkleOffset),
      maxKneeAnkleOffset: toFixedNumber(normalizedMaxKneeAnkleOffset),
      avgVisibility: toFixedNumber(timingItem.metrics?.avgVisibility, 3),
      timingCoverageRatio: toFixedNumber(timingItem.metrics?.coverageRatio, 3),
    },
  };
}

function summarizeFeatureItems(items) {
  const usableItems = items.filter((item) => item.status === "ok");
  const ratingKeys = [
    "depth",
    "torsoControl",
    "kneeAlignment",
    "hipAngle",
    "kneeAngle",
    "ankleAngle",
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
    avgVisibility: toFixedNumber(
      average(usableItems.map((item) => item.metrics.avgVisibility)),
      3,
    ),
    ratingCounts,
  };
}

export function summarizeDeepSquatPoseFeatures({ posePayload, timingReport }) {
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
