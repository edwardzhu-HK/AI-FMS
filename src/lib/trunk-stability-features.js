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

function classifyPushUpPattern(shoulderWristLift) {
  if (shoulderWristLift === null) {
    return {
      status: "not_applicable",
      label: "missing push-up lift evidence",
    };
  }

  if (shoulderWristLift >= 0.38) {
    return {
      status: "good",
      label: "body lifts as a unit proxy",
    };
  }

  if (shoulderWristLift >= 0.24) {
    return {
      status: "watch",
      label: "partial push-up lift proxy",
    };
  }

  return {
    status: "limited",
    label: "limited push-up lift proxy",
  };
}

function classifyCoreStability(hipLineOffset) {
  if (hipLineOffset === null) {
    return {
      status: "not_applicable",
      label: "missing body-line evidence",
    };
  }

  if (hipLineOffset <= 0.055) {
    return {
      status: "good",
      label: "stable trunk line proxy",
    };
  }

  if (hipLineOffset <= 0.105) {
    return {
      status: "watch",
      label: "trunk line watch",
    };
  }

  return {
    status: "limited",
    label: "large hip/body-line offset",
  };
}

function classifyArmExtension(avgElbowAngle) {
  if (avgElbowAngle === null) {
    return {
      status: "not_applicable",
      label: "missing elbow extension evidence",
    };
  }

  if (avgElbowAngle >= 160) {
    return {
      status: "good",
      label: "arms extended proxy",
    };
  }

  if (avgElbowAngle >= 140) {
    return {
      status: "watch",
      label: "partial arm extension",
    };
  }

  return {
    status: "limited",
    label: "limited arm extension",
  };
}

function classifyCompensation(hipLineOffsetRange) {
  if (hipLineOffsetRange === null) {
    return {
      status: "not_applicable",
      label: "missing compensation evidence",
    };
  }

  if (hipLineOffsetRange <= 0.04) {
    return {
      status: "good",
      label: "minimal hip drift proxy",
    };
  }

  if (hipLineOffsetRange <= 0.08) {
    return {
      status: "watch",
      label: "hip drift watch",
    };
  }

  return {
    status: "limited",
    label: "large hip drift proxy",
  };
}

function classifyVisibility(visibility) {
  if (visibility === null) {
    return {
      status: "not_applicable",
      label: "missing visibility evidence",
    };
  }

  if (visibility >= 0.72) {
    return {
      status: "good",
      label: "trunk landmarks visible",
    };
  }

  if (visibility >= 0.52) {
    return {
      status: "watch",
      label: "trunk landmarks partially visible",
    };
  }

  return {
    status: "limited",
    label: "low trunk landmark visibility",
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
    timingItem.cycle.bestPushSecond ?? timingItem.cycle.lowestPointSecond,
  );
  const landmarks = getLandmarkMap(frame);
  const visibility = average([
    landmarks.left_shoulder?.visibility,
    landmarks.right_shoulder?.visibility,
    landmarks.left_hip?.visibility,
    landmarks.right_hip?.visibility,
    landmarks.left_wrist?.visibility,
    landmarks.right_wrist?.visibility,
    landmarks.left_ankle?.visibility,
    landmarks.right_ankle?.visibility,
  ]);
  const shoulderWristLift =
    timingItem.metrics?.shoulderWristLift ??
    timingItem.cycle.shoulderWristLift ??
    null;
  const hipLineOffset =
    timingItem.metrics?.hipLineOffset ?? timingItem.cycle.hipLineOffset ?? null;
  const hipLineOffsetRange = timingItem.metrics?.hipLineOffsetRange ?? null;
  const avgElbowAngle =
    timingItem.metrics?.avgElbowAngle ?? timingItem.cycle.avgElbowAngle ?? null;

  return {
    segmentId: timingItem.segmentId,
    repetitionIndex: timingItem.repetitionIndex,
    cameraView: timingItem.cameraView,
    status: "ok",
    sourceSecond: frame?.second ?? null,
    suggestedWindow: {
      startSecond: timingItem.cycle.startSecond,
      endSecond: timingItem.cycle.endSecond,
      bestPushSecond: timingItem.cycle.bestPushSecond,
    },
    ratings: {
      pushUpPattern: classifyPushUpPattern(shoulderWristLift),
      coreStability: classifyCoreStability(hipLineOffset),
      armExtension: classifyArmExtension(avgElbowAngle),
      compensation: classifyCompensation(hipLineOffsetRange),
      trunkVisibility: classifyVisibility(visibility),
    },
    metrics: {
      shoulderWristLift: toFixedNumber(shoulderWristLift),
      hipLineOffset: toFixedNumber(hipLineOffset),
      hipLineOffsetRange: toFixedNumber(hipLineOffsetRange),
      avgElbowAngle: toFixedNumber(avgElbowAngle, 1),
      avgVisibility: toFixedNumber(
        visibility ?? timingItem.metrics?.avgVisibility,
        3,
      ),
      timingVisibility: toFixedNumber(timingItem.metrics?.avgVisibility, 3),
    },
  };
}

function summarizeFeatureItems(items) {
  const usableItems = items.filter((item) => item.status === "ok");
  const ratingKeys = [
    "pushUpPattern",
    "coreStability",
    "armExtension",
    "compensation",
    "trunkVisibility",
  ];
  const ratingCounts = Object.fromEntries(
    ratingKeys.map((key) => [
      key,
      usableItems.reduce((counts, item) => {
        const status = item.ratings[key]?.status ?? "missing";
        counts[status] = (counts[status] ?? 0) + 1;
        return counts;
      }, {}),
    ]),
  );

  return {
    repetitionsTotal: items.length,
    usableRepetitions: usableItems.length,
    avgVisibility: toFixedNumber(
      average(usableItems.map((item) => item.metrics.avgVisibility)),
      3,
    ),
    ratingCounts,
  };
}

export function summarizeTrunkStabilityPoseFeatures({
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
    actionType: "trunk_stability_push_up",
    modelVersion: "pose-features-v0.1-trunk-stability-push-up",
    items,
    summary: summarizeFeatureItems(items),
  };
}
