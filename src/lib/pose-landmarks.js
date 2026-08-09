export function validatePoseLandmarkPayload(payload) {
  const issues = [];

  if (!payload || typeof payload !== "object") {
    return ["payload must be an object"];
  }

  if (payload.schemaVersion === "ai_fms_dataset_v1_5_draft") {
    return [
      "this is a dataset export JSON, not a Pose JSON; choose the MediaPipe landmarks file with schemaVersion ai_fms_pose_landmarks_v1",
    ];
  }

  if (payload.schemaVersion !== "ai_fms_pose_landmarks_v1") {
    issues.push("schemaVersion must be ai_fms_pose_landmarks_v1");
  }

  if (!payload.sourceVideo?.fileName) {
    issues.push("sourceVideo.fileName is required");
  }

  if (!payload.poseModel?.name) {
    issues.push("poseModel.name is required");
  }

  if (!Array.isArray(payload.frames)) {
    issues.push("frames must be an array");
  }

  return issues;
}

export const POSE_LANDMARK_CONNECTIONS = [
  ["left_eye", "nose"],
  ["right_eye", "nose"],
  ["left_eye", "left_ear"],
  ["right_eye", "right_ear"],
  ["left_shoulder", "right_shoulder"],
  ["left_shoulder", "left_elbow"],
  ["left_elbow", "left_wrist"],
  ["right_shoulder", "right_elbow"],
  ["right_elbow", "right_wrist"],
  ["left_shoulder", "left_hip"],
  ["right_shoulder", "right_hip"],
  ["left_hip", "right_hip"],
  ["left_hip", "left_knee"],
  ["right_hip", "right_knee"],
  ["left_knee", "left_ankle"],
  ["right_knee", "right_ankle"],
  ["left_ankle", "left_heel"],
  ["left_heel", "left_foot_index"],
  ["left_ankle", "left_foot_index"],
  ["right_ankle", "right_heel"],
  ["right_heel", "right_foot_index"],
  ["right_ankle", "right_foot_index"],
];

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

function frameSecond(frame) {
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

export function findNearestPoseFrame(payload, second) {
  if (!Array.isArray(payload?.frames) || payload.frames.length === 0) {
    return null;
  }

  if (typeof second !== "number" || !Number.isFinite(second)) {
    return payload.frames.find((frame) => frame.poses?.length > 0) ?? null;
  }

  return (
    payload.frames.reduce((closest, frame) => {
      if (!frame.poses?.length) {
        return closest;
      }

      const currentSecond = frameSecond(frame);
      if (currentSecond === null) {
        return closest;
      }

      const distance = Math.abs(currentSecond - second);
      if (!closest || distance < closest.distance) {
        return { frame, distance };
      }

      return closest;
    }, null)?.frame ?? null
  );
}

export function getPrimaryPose(frame) {
  const poses = frame?.poses ?? [];
  if (!Array.isArray(poses) || poses.length === 0) {
    return null;
  }

  const markedPrimaryPose = poses.find(
    (pose) => pose?.primaryPose === true || pose?.subjectRole === "subject",
  );
  if (markedPrimaryPose) {
    return markedPrimaryPose;
  }

  if (
    Number.isInteger(frame?.primaryPoseIndex) &&
    frame.primaryPoseIndex >= 0
  ) {
    const poseByOriginalIndex = poses.find(
      (pose) => pose?.poseIndex === frame.primaryPoseIndex,
    );
    if (poseByOriginalIndex) {
      return poseByOriginalIndex;
    }

    if (poses[frame.primaryPoseIndex]) {
      return poses[frame.primaryPoseIndex];
    }
  }

  return poses[0];
}

export function getPrimaryPoseLandmarks(frame) {
  return getPrimaryPose(frame)?.landmarks ?? [];
}

export function getPoseLandmarkSide(name) {
  if (name.startsWith("left_")) {
    return "left";
  }

  if (name.startsWith("right_")) {
    return "right";
  }

  return "neutral";
}

export function buildPoseOverlayPoints(frame, visibilityThreshold = 0.2) {
  return getPrimaryPoseLandmarks(frame).reduce((points, landmark) => {
    if (
      !landmark?.name ||
      typeof landmark.x !== "number" ||
      typeof landmark.y !== "number" ||
      !Number.isFinite(landmark.x) ||
      !Number.isFinite(landmark.y)
    ) {
      return points;
    }

    if (
      typeof landmark.visibility === "number" &&
      landmark.visibility < visibilityThreshold
    ) {
      return points;
    }

    points[landmark.name] = {
      x: landmark.x * 100,
      y: landmark.y * 100,
      side: getPoseLandmarkSide(landmark.name),
      visibility: landmark.visibility ?? null,
      presence: landmark.presence ?? null,
    };
    return points;
  }, {});
}

export function summarizePoseLandmarks(payload) {
  const issues = validatePoseLandmarkPayload(payload);
  if (issues.length > 0) {
    return {
      valid: false,
      issues,
      framesTotal: 0,
      framesWithPose: 0,
      missingFramesRatio: null,
      avgVisibility: null,
      avgPresence: null,
    };
  }

  const frames = payload.frames;
  const framesWithPose = frames.filter((frame) => frame.poses?.length > 0);
  const missingFrames = frames.length - framesWithPose.length;
  const avgVisibility = average(
    framesWithPose.map((frame) => frame.quality?.avgVisibility),
  );
  const avgPresence = average(
    framesWithPose.map((frame) => frame.quality?.avgPresence),
  );

  return {
    valid: true,
    issues: [],
    schemaVersion: payload.schemaVersion,
    videoId: payload.sourceVideo.videoId,
    fileName: payload.sourceVideo.fileName,
    poseModel: payload.poseModel.name,
    framesTotal: frames.length,
    framesWithPose: framesWithPose.length,
    missingFrames,
    missingFramesRatio:
      frames.length > 0 ? missingFrames / frames.length : null,
    avgVisibility,
    avgPresence,
  };
}
