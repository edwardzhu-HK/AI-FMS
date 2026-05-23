import {
  POSE_LANDMARK_CONNECTIONS,
  buildPoseOverlayPoints,
  findNearestPoseFrame,
} from "../lib/pose-landmarks.js";

const DEMO_LANDMARKS = {
  nose: { x: 50, y: 21, side: "neutral" },
  leftEye: { x: 47.2, y: 20.6, side: "left" },
  rightEye: { x: 52.8, y: 20.6, side: "right" },
  leftEar: { x: 45.1, y: 21.3, side: "left" },
  rightEar: { x: 54.9, y: 21.3, side: "right" },
  leftShoulder: { x: 40.8, y: 34, side: "left" },
  rightShoulder: { x: 59.2, y: 34, side: "right" },
  leftElbow: { x: 31.8, y: 25.2, side: "left" },
  rightElbow: { x: 68.2, y: 25.2, side: "right" },
  leftWrist: { x: 22.5, y: 16.4, side: "left" },
  rightWrist: { x: 77.5, y: 16.4, side: "right" },
  leftHip: { x: 45.8, y: 56.2, side: "left" },
  rightHip: { x: 54.2, y: 56.2, side: "right" },
  leftKnee: { x: 45, y: 74.2, side: "left" },
  rightKnee: { x: 55, y: 74.2, side: "right" },
  leftAnkle: { x: 44.8, y: 91.5, side: "left" },
  rightAnkle: { x: 55.2, y: 91.5, side: "right" },
  leftHeel: { x: 43.6, y: 94.4, side: "left" },
  rightHeel: { x: 56.4, y: 94.4, side: "right" },
  leftFootIndex: { x: 46.2, y: 95.2, side: "left" },
  rightFootIndex: { x: 53.8, y: 95.2, side: "right" },
};

const DEMO_EDGES = [
  ["leftEye", "nose"],
  ["rightEye", "nose"],
  ["leftEye", "leftEar"],
  ["rightEye", "rightEar"],
  ["leftShoulder", "rightShoulder"],
  ["leftShoulder", "leftElbow"],
  ["leftElbow", "leftWrist"],
  ["rightShoulder", "rightElbow"],
  ["rightElbow", "rightWrist"],
  ["leftShoulder", "leftHip"],
  ["rightShoulder", "rightHip"],
  ["leftHip", "rightHip"],
  ["leftHip", "leftKnee"],
  ["rightHip", "rightKnee"],
  ["leftKnee", "leftAnkle"],
  ["rightKnee", "rightAnkle"],
  ["leftAnkle", "leftHeel"],
  ["leftHeel", "leftFootIndex"],
  ["leftAnkle", "leftFootIndex"],
  ["rightAnkle", "rightHeel"],
  ["rightHeel", "rightFootIndex"],
  ["rightAnkle", "rightFootIndex"],
];

function transformPoint(point, key, phase, cameraView) {
  const squatDepth = (Math.sin(phase) + 1) / 2;

  let x = point.x;
  let y = point.y;

  if (key.includes("Hip")) {
    y += squatDepth * 6;
  }
  if (key.includes("Knee")) {
    y += squatDepth * 8.2;
    x += key.startsWith("left") ? -squatDepth * 0.9 : squatDepth * 0.9;
  }
  if (
    key.includes("Ankle") ||
    key.includes("Heel") ||
    key.includes("FootIndex")
  ) {
    y += squatDepth * 5.1;
    x += key.startsWith("left") ? -squatDepth * 0.45 : squatDepth * 0.45;
  }
  if (
    key.includes("Shoulder") ||
    key.includes("Elbow") ||
    key.includes("Wrist")
  ) {
    y += squatDepth * 2.4;
  }
  if (key === "nose" || key.includes("Eye") || key.includes("Ear")) {
    y += squatDepth * 1.1;
  }

  if (cameraView === "side") {
    // Compress left-right spread in side view while keeping structure readable.
    x = 50 + (x - 50) * 0.72;
    x += key.startsWith("left") ? -1.8 : key.startsWith("right") ? 1.8 : 0;
  }

  return { x, y };
}

function buildDemoPoints(playbackSecond, cameraView) {
  const phase = playbackSecond * 2.4;

  return Object.entries(DEMO_LANDMARKS).reduce((acc, [key, point]) => {
    const transformedPoint = transformPoint(point, key, phase, cameraView);
    const subjectFrame =
      cameraView === "side"
        ? { x: 34, y: 4, width: 32, height: 90 }
        : { x: 30, y: 4, width: 40, height: 90 };

    acc[key] = {
      x: subjectFrame.x + (transformedPoint.x / 100) * subjectFrame.width,
      y: subjectFrame.y + (transformedPoint.y / 100) * subjectFrame.height,
      side: point.side,
    };
    return acc;
  }, {});
}

function buildOverlayState(playbackSecond, cameraView, poseLandmarks) {
  if (poseLandmarks) {
    const frame = findNearestPoseFrame(poseLandmarks, playbackSecond);
    return {
      points: buildPoseOverlayPoints(frame),
      edges: POSE_LANDMARK_CONNECTIONS,
      mode: "real",
    };
  }

  return {
    points: buildDemoPoints(playbackSecond, cameraView),
    edges: DEMO_EDGES,
    mode: "demo",
  };
}

export default function KeypointOverlay({
  playbackSecond,
  cameraView,
  poseLandmarks = null,
}) {
  const { points, edges, mode } = buildOverlayState(
    playbackSecond,
    cameraView,
    poseLandmarks,
  );
  const visibleEdges = edges.filter(([from, to]) => points[from] && points[to]);

  return (
    <svg
      className="keypoint-overlay"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {visibleEdges.map(([from, to]) => (
        <line
          key={`${from}-${to}`}
          className="skeleton-edge"
          x1={points[from].x}
          y1={points[from].y}
          x2={points[to].x}
          y2={points[to].y}
        />
      ))}

      {Object.entries(points).map(([key, point]) => (
        <circle
          key={key}
          className={`skeleton-point skeleton-point-${point.side}`}
          cx={point.x}
          cy={point.y}
          r={mode === "real" ? 0.72 : key === "nose" ? 1 : 0.95}
        />
      ))}
    </svg>
  );
}
