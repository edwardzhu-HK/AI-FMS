#!/usr/bin/env python3
"""Download a MediaPipe Pose Landmarker task model bundle."""

from __future__ import annotations

import argparse
import sys
import urllib.request
from pathlib import Path


MODEL_URLS = {
    "lite": "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
    "full": "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task",
    "heavy": "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/latest/pose_landmarker_heavy.task",
}


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Download an official MediaPipe Pose Landmarker .task model."
    )
    parser.add_argument(
        "--variant",
        choices=sorted(MODEL_URLS),
        default="lite",
        help="Model variant to download. Lite is fastest for the first prototype.",
    )
    parser.add_argument(
        "--output",
        default="models/pose_landmarker_lite.task",
        help="Destination .task file path.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite an existing non-empty model file.",
    )
    return parser.parse_args(argv)


def download_model(args: argparse.Namespace) -> Path:
    output_path = Path(args.output).expanduser().resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)

    if output_path.exists() and output_path.stat().st_size > 0 and not args.force:
        print(f"Model already exists: {output_path}")
        return output_path

    url = MODEL_URLS[args.variant]
    print(f"Downloading {args.variant} model from {url}")
    urllib.request.urlretrieve(url, output_path)
    print(f"Saved model: {output_path} ({output_path.stat().st_size} bytes)")
    return output_path


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    try:
        download_model(args)
    except Exception as error:  # noqa: BLE001 - CLI should surface download failure.
        print(f"ERROR: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
