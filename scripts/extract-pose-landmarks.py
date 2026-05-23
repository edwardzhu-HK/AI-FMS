#!/usr/bin/env python3
"""Extract MediaPipe Pose Landmarker frames into AI-FMS JSON."""

from __future__ import annotations

import argparse
import json
import math
import os
import sys
from datetime import datetime, timezone
from importlib import metadata
from pathlib import Path
from typing import Any, Iterable, Optional


LANDMARK_NAMES = [
    "nose",
    "left_eye_inner",
    "left_eye",
    "left_eye_outer",
    "right_eye_inner",
    "right_eye",
    "right_eye_outer",
    "left_ear",
    "right_ear",
    "mouth_left",
    "mouth_right",
    "left_shoulder",
    "right_shoulder",
    "left_elbow",
    "right_elbow",
    "left_wrist",
    "right_wrist",
    "left_pinky",
    "right_pinky",
    "left_index",
    "right_index",
    "left_thumb",
    "right_thumb",
    "left_hip",
    "right_hip",
    "left_knee",
    "right_knee",
    "left_ankle",
    "right_ankle",
    "left_heel",
    "right_heel",
    "left_foot_index",
    "right_foot_index",
]


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Extract MediaPipe Pose Landmarker output from a video."
    )
    parser.add_argument("--video", required=True, help="Input video file.")
    parser.add_argument("--model", required=True, help="Pose Landmarker .task file.")
    parser.add_argument("--output", required=True, help="Output JSON file.")
    parser.add_argument("--video-id", default="", help="Optional stable video id.")
    parser.add_argument("--action-type", default="deep_squat")
    parser.add_argument("--start-second", type=float, default=0.0)
    parser.add_argument(
        "--end-second",
        type=float,
        default=None,
        help="Optional end second. Defaults to detected video duration.",
    )
    parser.add_argument(
        "--target-fps",
        type=float,
        default=10.0,
        help="Sampling FPS for inference. Use 0 to process every frame.",
    )
    parser.add_argument(
        "--max-frames",
        type=int,
        default=None,
        help="Optional safety cap for smoke tests and quick probes.",
    )
    parser.add_argument("--num-poses", type=int, default=1)
    parser.add_argument(
        "--delegate",
        choices=["CPU", "GPU"],
        default="CPU",
        help="MediaPipe delegate. CPU is the safest default on macOS.",
    )
    parser.add_argument("--min-pose-detection-confidence", type=float, default=0.5)
    parser.add_argument("--min-pose-presence-confidence", type=float, default=0.5)
    parser.add_argument("--min-tracking-confidence", type=float, default=0.5)
    parser.add_argument(
        "--min-avg-visibility",
        type=float,
        default=0.5,
        help="Quality-summary threshold for low-visibility processed frames.",
    )
    return parser.parse_args(argv)


def require_dependency(module_name: str, install_hint: str) -> Any:
    try:
        return __import__(module_name)
    except ImportError as error:
        raise RuntimeError(f"Missing dependency '{module_name}'. Run: {install_hint}") from error


def package_version(package_name: str) -> Optional[str]:
    try:
        return metadata.version(package_name)
    except metadata.PackageNotFoundError:
        return None


def read_video_metadata(cv2: Any, video_path: Path) -> dict[str, Any]:
    capture = cv2.VideoCapture(str(video_path))
    if not capture.isOpened():
        raise RuntimeError(f"Could not open video: {video_path}")

    try:
        fps = float(capture.get(cv2.CAP_PROP_FPS) or 0)
        width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
        height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
        frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    finally:
        capture.release()

    duration_second = frame_count / fps if fps > 0 and frame_count > 0 else None
    return {
        "width": width,
        "height": height,
        "fps": fps,
        "frameCount": frame_count,
        "durationSecond": duration_second,
    }


def finite_or_none(value: Any) -> Optional[float]:
    if value is None:
        return None
    number = float(value)
    return number if math.isfinite(number) else None


def serialize_landmark(landmark: Any, index: int) -> dict[str, Any]:
    return {
        "index": index,
        "name": LANDMARK_NAMES[index] if index < len(LANDMARK_NAMES) else f"landmark_{index}",
        "x": finite_or_none(getattr(landmark, "x", None)),
        "y": finite_or_none(getattr(landmark, "y", None)),
        "z": finite_or_none(getattr(landmark, "z", None)),
        "visibility": finite_or_none(getattr(landmark, "visibility", None)),
        "presence": finite_or_none(getattr(landmark, "presence", None)),
    }


def serialize_landmark_list(landmarks: Iterable[Any]) -> list[dict[str, Any]]:
    return [serialize_landmark(landmark, index) for index, landmark in enumerate(landmarks)]


def frame_quality(poses: list[dict[str, Any]]) -> dict[str, Optional[float]]:
    values = []
    presences = []
    for pose in poses:
        for landmark in pose["landmarks"]:
            if landmark["visibility"] is not None:
                values.append(landmark["visibility"])
            if landmark["presence"] is not None:
                presences.append(landmark["presence"])

    return {
        "avgVisibility": sum(values) / len(values) if values else None,
        "avgPresence": sum(presences) / len(presences) if presences else None,
    }


def summarize_quality(frames: list[dict[str, Any]], min_avg_visibility: float) -> dict[str, Any]:
    processed_frames = len(frames)
    frames_with_pose = [frame for frame in frames if frame["poses"]]
    visibility_values = [
        frame["quality"]["avgVisibility"]
        for frame in frames_with_pose
        if frame["quality"]["avgVisibility"] is not None
    ]
    presence_values = [
        frame["quality"]["avgPresence"]
        for frame in frames_with_pose
        if frame["quality"]["avgPresence"] is not None
    ]
    low_visibility_frames = [
        frame
        for frame in frames_with_pose
        if frame["quality"]["avgVisibility"] is not None
        and frame["quality"]["avgVisibility"] < min_avg_visibility
    ]

    missing_frames = processed_frames - len(frames_with_pose)
    return {
        "processedFrames": processed_frames,
        "framesWithPose": len(frames_with_pose),
        "missingFrames": missing_frames,
        "missingFramesRatio": missing_frames / processed_frames if processed_frames else None,
        "poseFramesRatio": len(frames_with_pose) / processed_frames if processed_frames else None,
        "avgVisibility": sum(visibility_values) / len(visibility_values)
        if visibility_values
        else None,
        "avgPresence": sum(presence_values) / len(presence_values) if presence_values else None,
        "lowVisibilityFrames": len(low_visibility_frames),
        "minAvgVisibilityThreshold": min_avg_visibility,
    }


def extract_pose(args: argparse.Namespace) -> dict[str, Any]:
    os.environ.setdefault(
        "MPLCONFIGDIR",
        str(Path(".cache/matplotlib").expanduser().resolve()),
    )

    cv2 = require_dependency("cv2", "python3 -m pip install -r requirements-pose.txt")
    mp = require_dependency("mediapipe", "python3 -m pip install -r requirements-pose.txt")

    video_path = Path(args.video).expanduser().resolve()
    model_path = Path(args.model).expanduser().resolve()
    if not video_path.exists():
        raise RuntimeError(f"Video not found: {video_path}")
    if not model_path.exists():
        raise RuntimeError(f"Model not found: {model_path}")

    metadata_result = read_video_metadata(cv2, video_path)
    fps = metadata_result["fps"]
    if fps <= 0:
        raise RuntimeError("Video FPS could not be detected.")

    duration_second = metadata_result["durationSecond"]
    end_second = args.end_second if args.end_second is not None else duration_second
    if end_second is None:
        raise RuntimeError("Video duration could not be detected; pass --end-second.")
    if args.start_second < 0 or end_second <= args.start_second:
        raise RuntimeError("Invalid start/end seconds.")

    start_frame = max(0, int(math.floor(args.start_second * fps)))
    end_frame = int(math.ceil(end_second * fps))
    frame_step = 1
    if args.target_fps and args.target_fps > 0:
        frame_step = max(1, int(round(fps / args.target_fps)))

    BaseOptions = mp.tasks.BaseOptions
    PoseLandmarker = mp.tasks.vision.PoseLandmarker
    PoseLandmarkerOptions = mp.tasks.vision.PoseLandmarkerOptions
    VisionRunningMode = mp.tasks.vision.RunningMode
    delegate = getattr(BaseOptions.Delegate, args.delegate)
    options = PoseLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=str(model_path), delegate=delegate),
        running_mode=VisionRunningMode.VIDEO,
        num_poses=args.num_poses,
        min_pose_detection_confidence=args.min_pose_detection_confidence,
        min_pose_presence_confidence=args.min_pose_presence_confidence,
        min_tracking_confidence=args.min_tracking_confidence,
    )

    capture = cv2.VideoCapture(str(video_path))
    capture.set(cv2.CAP_PROP_POS_FRAMES, start_frame)
    frames = []

    try:
        with PoseLandmarker.create_from_options(options) as landmarker:
            while True:
                ok, frame = capture.read()
                if not ok:
                    break

                frame_index = int(capture.get(cv2.CAP_PROP_POS_FRAMES)) - 1
                if frame_index > end_frame:
                    break
                if (frame_index - start_frame) % frame_step != 0:
                    continue
                if args.max_frames is not None and len(frames) >= args.max_frames:
                    break

                timestamp_ms = int(round((frame_index / fps) * 1000))
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
                result = landmarker.detect_for_video(mp_image, timestamp_ms)

                normalized_poses = result.pose_landmarks or []
                world_poses = result.pose_world_landmarks or []
                poses = []
                for pose_index, landmarks in enumerate(normalized_poses):
                    world_landmarks = (
                        serialize_landmark_list(world_poses[pose_index])
                        if pose_index < len(world_poses)
                        else []
                    )
                    poses.append(
                        {
                            "poseIndex": pose_index,
                            "landmarks": serialize_landmark_list(landmarks),
                            "worldLandmarks": world_landmarks,
                        }
                    )

                frames.append(
                    {
                        "frameIndex": frame_index,
                        "timestampMs": timestamp_ms,
                        "second": frame_index / fps,
                        "poses": poses,
                        "quality": frame_quality(poses),
                    }
                )
    finally:
        capture.release()

    return {
        "schemaVersion": "ai_fms_pose_landmarks_v1",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sourceVideo": {
            "videoId": args.video_id or video_path.stem,
            "actionType": args.action_type,
            "path": str(video_path),
            "fileName": video_path.name,
            **metadata_result,
            "processedStartSecond": args.start_second,
            "processedEndSecond": end_second,
        },
        "poseModel": {
            "name": "mediapipe_pose_landmarker",
            "modelAssetPath": str(model_path),
            "modelVariant": model_path.stem,
            "runningMode": "VIDEO",
            "delegate": args.delegate,
            "mediapipeVersion": package_version("mediapipe"),
            "opencvVersion": getattr(cv2, "__version__", None),
        },
        "sampling": {
            "targetFps": args.target_fps,
            "frameStep": frame_step,
            "startFrame": start_frame,
            "endFrame": end_frame,
        },
        "quality": summarize_quality(frames, args.min_avg_visibility),
        "frames": frames,
    }


def write_output(payload: dict[str, Any], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    try:
        payload = extract_pose(args)
        output_path = Path(args.output).expanduser().resolve()
        write_output(payload, output_path)
        quality = payload["quality"]
        print(f"Wrote pose JSON: {output_path}")
        print(
            "Quality: "
            f"{quality['framesWithPose']}/{quality['processedFrames']} frames with pose, "
            f"missing ratio={quality['missingFramesRatio']}"
        )
    except Exception as error:  # noqa: BLE001 - CLI should return readable failure.
        print(f"ERROR: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
