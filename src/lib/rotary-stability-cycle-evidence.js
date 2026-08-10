const REQUIRED_LANDMARKS = [
  "left_shoulder",
  "right_shoulder",
  "left_hip",
  "right_hip",
  "left_elbow",
  "right_elbow",
  "left_wrist",
  "right_wrist",
  "left_knee",
  "right_knee",
  "left_ankle",
  "right_ankle",
];

export const ROTARY_STABILITY_CYCLE_EVIDENCE_VERSION =
  "pose-cycle-evidence-v1.1-rotary-experimental";

export const DEFAULT_ROTARY_STABILITY_CYCLE_RULES = Object.freeze({
  minVisibility: 0.45,
  minUsableFrames: 12,
  minUsableFrameRatio: 0.7,
  setupWindowRatio: 0.12,
  endWindowRatio: 0.12,
  minNormalizedMotion: 0.8,
  maxAnkleTouchDistance: 1.05,
  clearAnkleTouchFailureDistance: 1.45,
  minElbowExtensionDegrees: 150,
  clearElbowExtensionFailureDegrees: 138,
  minKneeExtensionDegrees: 145,
  clearKneeExtensionFailureDegrees: 130,
  maxReturnError: 0.45,
  clearReturnFailureError: 0.85,
  liftOnsetMotion: 0.2,
  maxSimultaneousLiftDeltaSecond: 0.05,
  clearNonSimultaneousLiftDeltaSecond: 0.15,
});

function average(values) {
  const valid = values.filter(Number.isFinite);
  return valid.length
    ? valid.reduce((sum, value) => sum + value, 0) / valid.length
    : null;
}

function median(values) {
  const valid = values
    .filter(Number.isFinite)
    .sort((left, right) => left - right);
  if (!valid.length) return null;
  const middle = Math.floor(valid.length / 2);
  return valid.length % 2
    ? valid[middle]
    : (valid[middle - 1] + valid[middle]) / 2;
}

function round(value, digits = 3) {
  return Number.isFinite(value) ? Number(value.toFixed(digits)) : null;
}

function getFrameSecond(frame) {
  if (Number.isFinite(frame?.second)) return frame.second;
  return Number.isFinite(frame?.timestampMs) ? frame.timestampMs / 1000 : null;
}

function getLandmarkMap(frame) {
  return Object.fromEntries(
    (frame?.poses?.[0]?.landmarks ?? []).map((landmark) => [
      landmark.name,
      landmark,
    ]),
  );
}

function isUsableLandmark(landmark, minVisibility) {
  return Boolean(
    landmark &&
    Number.isFinite(landmark.x) &&
    Number.isFinite(landmark.y) &&
    (!Number.isFinite(landmark.visibility) ||
      landmark.visibility >= minVisibility),
  );
}

function distance(first, second) {
  return first && second
    ? Math.hypot(first.x - second.x, first.y - second.y)
    : null;
}

function jointAngle(first, center, last) {
  if (!first || !center || !last) return null;
  const firstVector = [first.x - center.x, first.y - center.y];
  const lastVector = [last.x - center.x, last.y - center.y];
  const denominator = Math.hypot(...firstVector) * Math.hypot(...lastVector);
  if (!denominator) return null;
  const cosine =
    (firstVector[0] * lastVector[0] + firstVector[1] * lastVector[1]) /
    denominator;
  return (Math.acos(Math.max(-1, Math.min(1, cosine))) * 180) / Math.PI;
}

function midpoint(first, second) {
  return first && second
    ? { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 }
    : null;
}

function medianPoint(states, landmarkName) {
  return {
    x: median(states.map((state) => state.landmarks[landmarkName]?.x)),
    y: median(states.map((state) => state.landmarks[landmarkName]?.y)),
  };
}

function buildFrameState(frame, config) {
  const second = getFrameSecond(frame);
  const landmarks = getLandmarkMap(frame);
  if (
    second === null ||
    REQUIRED_LANDMARKS.some(
      (name) => !isUsableLandmark(landmarks[name], config.minVisibility),
    )
  ) {
    return null;
  }
  const referenceLength = average([
    distance(landmarks.left_shoulder, landmarks.right_shoulder),
    distance(landmarks.left_hip, landmarks.right_hip),
    distance(landmarks.left_shoulder, landmarks.left_hip),
    distance(landmarks.right_shoulder, landmarks.right_hip),
  ]);
  if (!referenceLength) return null;

  return {
    second,
    landmarks,
    referenceLength,
    visibility: average(
      REQUIRED_LANDMARKS.map((name) => landmarks[name].visibility),
    ),
  };
}

function statusFromThreshold(value, pass, fail, direction = "max") {
  if (!Number.isFinite(value)) return "unknown";
  if (direction === "max") {
    if (value <= pass) return "pass";
    if (value >= fail) return "fail";
  } else {
    if (value >= pass) return "pass";
    if (value <= fail) return "fail";
  }
  return "watch";
}

function findMinimum(states, valueBuilder) {
  return states.reduce((best, state) => {
    const value = valueBuilder(state);
    if (!Number.isFinite(value)) return best;
    return !best || value < best.value ? { state, value } : best;
  }, null);
}

function findMaximum(states, valueBuilder) {
  return states.reduce((best, state) => {
    const value = valueBuilder(state);
    if (!Number.isFinite(value)) return best;
    return !best || value > best.value ? { state, value } : best;
  }, null);
}

function getSegmentBounds(timingItem, segment) {
  return {
    startSecond:
      segment?.startSecond ??
      timingItem?.currentStartSecond ??
      timingItem?.cycle?.startSecond ??
      null,
    endSecond:
      segment?.endSecond ??
      timingItem?.currentEndSecond ??
      timingItem?.cycle?.endSecond ??
      null,
  };
}

function createCriterion(status, value, unit, label) {
  return { status, value: round(value), unit, label };
}

function buildCycleEvidenceItem({ posePayload, timingItem, segment, config }) {
  const bounds = getSegmentBounds(timingItem, segment);
  const sourceFrames = (posePayload?.frames ?? []).filter((frame) => {
    const second = getFrameSecond(frame);
    return (
      Number.isFinite(second) &&
      Number.isFinite(bounds.startSecond) &&
      Number.isFinite(bounds.endSecond) &&
      second >= bounds.startSecond &&
      second <= bounds.endSecond
    );
  });
  const states = sourceFrames
    .map((frame) => buildFrameState(frame, config))
    .filter(Boolean);
  const usableFrameRatio = states.length / Math.max(1, sourceFrames.length);
  const base = {
    segmentId: timingItem?.segmentId ?? segment?.segmentId ?? null,
    repetitionIndex:
      timingItem?.repetitionIndex ?? segment?.repetitionIndex ?? null,
    cameraView: segment?.cameraView ?? timingItem?.cameraView ?? "unknown",
    reviewerSide: segment?.side ?? timingItem?.side ?? "unknown",
    segmentMetadata: segment?.metadata ?? timingItem?.segmentMetadata ?? {},
    window: bounds,
  };

  if (
    states.length < config.minUsableFrames ||
    usableFrameRatio < config.minUsableFrameRatio
  ) {
    return {
      ...base,
      status: "insufficient_evidence",
      issues: ["insufficient_full_cycle_pose"],
      phases: {},
      criteria: {},
      metrics: {
        sourceFrames: sourceFrames.length,
        usableFrames: states.length,
        usableFrameRatio: round(usableFrameRatio),
      },
    };
  }

  const referenceLength = median(states.map((state) => state.referenceLength));
  const setupCount = Math.max(
    3,
    Math.round(states.length * config.setupWindowRatio),
  );
  const endCount = Math.max(
    3,
    Math.round(states.length * config.endWindowRatio),
  );
  const setupStates = states.slice(0, setupCount);
  const endStates = states.slice(-endCount);
  const setup = Object.fromEntries(
    REQUIRED_LANDMARKS.map((name) => [name, medianPoint(setupStates, name)]),
  );
  const end = Object.fromEntries(
    REQUIRED_LANDMARKS.map((name) => [name, medianPoint(endStates, name)]),
  );
  const normalizedDisplacement = (state, side, joint) =>
    distance(state.landmarks[`${side}_${joint}`], setup[`${side}_${joint}`]) /
    referenceLength;
  const sideMotion = (side) =>
    findMaximum(states, (state) =>
      average(
        ["wrist", "knee", "ankle"].map((joint) =>
          normalizedDisplacement(state, side, joint),
        ),
      ),
    )?.value ?? 0;
  const leftMotion = sideMotion("left");
  const rightMotion = sideMotion("right");
  const poseSide = leftMotion >= rightMotion ? "left" : "right";
  const supportSide = poseSide === "left" ? "right" : "left";

  const searchStart = Math.min(setupCount, Math.max(0, states.length - 1));
  const searchEnd = Math.max(searchStart + 1, states.length - endCount);
  const movementStates = states.slice(searchStart, searchEnd);
  const extension = findMaximum(movementStates, (state) => {
    const landmarks = state.landmarks;
    const reach = average([
      distance(
        landmarks[`${poseSide}_shoulder`],
        landmarks[`${poseSide}_wrist`],
      ),
      distance(landmarks[`${poseSide}_hip`], landmarks[`${poseSide}_ankle`]),
    ]);
    const displacement = average(
      ["wrist", "knee", "ankle"].map((joint) =>
        normalizedDisplacement(state, poseSide, joint),
      ),
    );
    return reach / referenceLength + displacement;
  });

  if (!extension) {
    return {
      ...base,
      status: "insufficient_evidence",
      issues: ["extension_phase_not_found"],
      phases: {},
      criteria: {},
      metrics: {
        sourceFrames: sourceFrames.length,
        usableFrames: states.length,
        usableFrameRatio: round(usableFrameRatio),
      },
    };
  }

  const extensionIndex = states.indexOf(extension.state);
  const firstTouchSearch = states.slice(searchStart, extensionIndex + 1);
  const secondTouchSearch = states.slice(extensionIndex, searchEnd);
  const touchDistance = (state) =>
    distance(
      state.landmarks[`${poseSide}_wrist`],
      state.landmarks[`${poseSide}_ankle`],
    ) / referenceLength;
  const firstTouch = findMinimum(firstTouchSearch, touchDistance);
  const secondTouch = findMinimum(secondTouchSearch, touchDistance);
  const extensionLandmarks = extension.state.landmarks;
  const elbowExtension = jointAngle(
    extensionLandmarks[`${poseSide}_shoulder`],
    extensionLandmarks[`${poseSide}_elbow`],
    extensionLandmarks[`${poseSide}_wrist`],
  );
  const kneeExtension = jointAngle(
    extensionLandmarks[`${poseSide}_hip`],
    extensionLandmarks[`${poseSide}_knee`],
    extensionLandmarks[`${poseSide}_ankle`],
  );
  const movementAmplitude = average(
    ["wrist", "knee", "ankle"].map((joint) =>
      normalizedDisplacement(extension.state, poseSide, joint),
    ),
  );
  const returnError = average(
    ["wrist", "knee", "ankle"].map(
      (joint) =>
        distance(end[`${poseSide}_${joint}`], setup[`${poseSide}_${joint}`]) /
        referenceLength,
    ),
  );
  const supportDrift =
    findMaximum(states, (state) =>
      average(
        ["wrist", "knee"].map(
          (joint) =>
            distance(
              state.landmarks[`${supportSide}_${joint}`],
              setup[`${supportSide}_${joint}`],
            ) / referenceLength,
        ),
      ),
    )?.value ?? null;
  const setupTrunkCenter = midpoint(
    midpoint(setup.left_shoulder, setup.right_shoulder),
    midpoint(setup.left_hip, setup.right_hip),
  );
  const trunkCenterShift =
    findMaximum(states, (state) => {
      const trunkCenter = midpoint(
        midpoint(state.landmarks.left_shoulder, state.landmarks.right_shoulder),
        midpoint(state.landmarks.left_hip, state.landmarks.right_hip),
      );
      return distance(trunkCenter, setupTrunkCenter) / referenceLength;
    })?.value ?? null;

  const setupJitter = (joint) =>
    Math.max(
      0,
      ...setupStates.map((state) =>
        normalizedDisplacement(state, poseSide, joint),
      ),
    );
  const onsetThreshold = (joint) =>
    Math.max(config.liftOnsetMotion, setupJitter(joint) * 3);
  const onsetSearch = states.slice(
    setupCount,
    (firstTouch ? states.indexOf(firstTouch.state) : extensionIndex) + 1,
  );
  const findOnset = (joint) =>
    onsetSearch.find(
      (state) =>
        normalizedDisplacement(state, poseSide, joint) >= onsetThreshold(joint),
    )?.second ?? null;
  const handLiftSecond = findOnset("wrist");
  const kneeLiftSecond = findOnset("knee");
  const liftDeltaSecond =
    Number.isFinite(handLiftSecond) && Number.isFinite(kneeLiftSecond)
      ? Math.abs(handLiftSecond - kneeLiftSecond)
      : null;
  const frameIntervalSecond = median(
    states.slice(1).map((state, index) => state.second - states[index].second),
  );
  const firstTouchDistance = firstTouch?.value ?? null;
  const secondTouchDistance = secondTouch?.value ?? null;

  const criteria = {
    movementAmplitude: createCriterion(
      Number.isFinite(movementAmplitude) &&
        movementAmplitude >= config.minNormalizedMotion
        ? "pass"
        : "fail",
      movementAmplitude,
      "body_reference_ratio",
      "A full reach phase is visible",
    ),
    firstAnkleTouch: createCriterion(
      statusFromThreshold(
        firstTouchDistance,
        config.maxAnkleTouchDistance,
        config.clearAnkleTouchFailureDistance,
      ),
      firstTouchDistance,
      "body_reference_ratio",
      "First hand-to-lateral-malleolus proxy",
    ),
    secondAnkleTouch: createCriterion(
      statusFromThreshold(
        secondTouchDistance,
        config.maxAnkleTouchDistance,
        config.clearAnkleTouchFailureDistance,
      ),
      secondTouchDistance,
      "body_reference_ratio",
      "Second hand-to-lateral-malleolus proxy",
    ),
    elbowExtension: createCriterion(
      statusFromThreshold(
        elbowExtension,
        config.minElbowExtensionDegrees,
        config.clearElbowExtensionFailureDegrees,
        "min",
      ),
      elbowExtension,
      "degree",
      "Elbow extension at peak reach",
    ),
    kneeExtension: createCriterion(
      statusFromThreshold(
        kneeExtension,
        config.minKneeExtensionDegrees,
        config.clearKneeExtensionFailureDegrees,
        "min",
      ),
      kneeExtension,
      "degree",
      "Knee extension at peak reach",
    ),
    returnControl: createCriterion(
      statusFromThreshold(
        returnError,
        config.maxReturnError,
        config.clearReturnFailureError,
      ),
      returnError,
      "body_reference_ratio",
      "Return to the quadruped setup",
    ),
    simultaneousLift: createCriterion(
      statusFromThreshold(
        liftDeltaSecond,
        config.maxSimultaneousLiftDeltaSecond,
        config.clearNonSimultaneousLiftDeltaSecond,
      ),
      liftDeltaSecond,
      "second",
      "Hand and knee lift onset difference",
    ),
  };

  const phaseOrderValid = Boolean(
    firstTouch &&
    secondTouch &&
    firstTouch.state.second < extension.state.second &&
    extension.state.second < secondTouch.state.second,
  );
  const issues = [];
  if (!phaseOrderValid) issues.push("full_cycle_phase_order_not_supported");
  if (frameIntervalSecond > 0.15)
    issues.push("temporal_resolution_limits_lift_timing");

  return {
    ...base,
    status: phaseOrderValid ? "ok" : "insufficient_evidence",
    evidenceVersion: ROTARY_STABILITY_CYCLE_EVIDENCE_VERSION,
    phaseSource: "pose_derived_within_segment",
    poseSide,
    supportSide,
    issues,
    phases: {
      setupSecond: round(median(setupStates.map((state) => state.second)), 2),
      handLiftSecond: round(handLiftSecond, 2),
      kneeLiftSecond: round(kneeLiftSecond, 2),
      firstTouchSecond: round(firstTouch?.state.second, 2),
      extensionSecond: round(extension.state.second, 2),
      secondTouchSecond: round(secondTouch?.state.second, 2),
      returnSecond: round(median(endStates.map((state) => state.second)), 2),
    },
    criteria,
    metrics: {
      sourceFrames: sourceFrames.length,
      usableFrames: states.length,
      usableFrameRatio: round(usableFrameRatio),
      averageVisibility: round(
        average(states.map((state) => state.visibility)),
      ),
      referenceLength: round(referenceLength, 4),
      frameIntervalSecond: round(frameIntervalSecond, 3),
      leftMotion: round(leftMotion),
      rightMotion: round(rightMotion),
      movementAmplitude: round(movementAmplitude),
      firstAnkleTouchDistance: round(firstTouchDistance),
      secondAnkleTouchDistance: round(secondTouchDistance),
      elbowExtensionDegrees: round(elbowExtension, 1),
      kneeExtensionDegrees: round(kneeExtension, 1),
      liftDeltaSecond: round(liftDeltaSecond, 2),
      returnError: round(returnError),
      supportDrift: round(supportDrift),
      trunkCenterShift: round(trunkCenterShift),
    },
  };
}

export function buildRotaryStabilityCycleEvidence({
  posePayload,
  timingReport,
  segments = [],
  options = {},
} = {}) {
  if (!posePayload || !timingReport?.items?.length) return null;
  const config = { ...DEFAULT_ROTARY_STABILITY_CYCLE_RULES, ...options };
  const segmentsById = new Map(
    segments.map((segment) => [segment.segmentId, segment]),
  );
  const items = timingReport.items.map((timingItem) =>
    buildCycleEvidenceItem({
      posePayload,
      timingItem,
      segment: segmentsById.get(timingItem.segmentId),
      config,
    }),
  );
  return {
    status: "ok",
    actionType: "rotary_stability",
    evidenceVersion: ROTARY_STABILITY_CYCLE_EVIDENCE_VERSION,
    rules: config,
    items,
    summary: {
      segmentsTotal: items.length,
      usableCycles: items.filter((item) => item.status === "ok").length,
      insufficientCycles: items.filter((item) => item.status !== "ok").length,
      scoreOneRuleFailures: items.filter((item) =>
        Object.values(item.criteria ?? {}).some(
          (criterion) => criterion.status === "fail",
        ),
      ).length,
    },
  };
}
