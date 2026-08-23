#!/usr/bin/env python3
"""Transcribe numbered AI-FMS narration WAV regions with whisper.cpp."""

from __future__ import annotations

import argparse
import re
import subprocess
import tempfile
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--model", type=Path, required=True)
    parser.add_argument("--whisper", default="whisper-cli")
    parser.add_argument("--language", default="en")
    parser.add_argument("--pattern", default="*.wav")
    parser.add_argument("--ffmpeg", default="ffmpeg")
    return parser.parse_args()


def region_number(path: Path) -> int:
    match = re.search(r"#(\d+)$", path.stem)
    return int(match.group(1)) if match else 10_000


def main() -> int:
    args = parse_args()
    input_dir = args.input_dir.resolve()
    output_dir = args.output_dir.resolve()
    model = args.model.resolve()

    if not input_dir.is_dir():
        raise SystemExit(f"Input directory not found: {input_dir}")
    if not model.is_file():
        raise SystemExit(f"Model not found: {model}")

    source_files = sorted(input_dir.glob(args.pattern), key=region_number)
    if not source_files:
        raise SystemExit(
            f"No source files matching {args.pattern!r} found in: {input_dir}"
        )

    output_dir.mkdir(parents=True, exist_ok=True)
    for source_path in source_files:
        number = region_number(source_path)
        output_name = (
            f"region-{number:02d}" if number < 10_000 else source_path.stem
        )
        output_stem = output_dir / output_name
        temporary_audio = None
        audio_path = source_path
        if source_path.suffix.lower() != ".wav":
            with tempfile.NamedTemporaryFile(
                suffix=".wav", delete=False, dir=output_dir
            ) as stream:
                temporary_audio = Path(stream.name)
            subprocess.run(
                [
                    args.ffmpeg,
                    "-y",
                    "-i",
                    str(source_path),
                    "-vn",
                    "-ac",
                    "1",
                    "-ar",
                    "16000",
                    "-c:a",
                    "pcm_s16le",
                    str(temporary_audio),
                ],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            audio_path = temporary_audio
        command = [
            args.whisper,
            "-m",
            str(model),
            "-l",
            args.language,
            "-otxt",
            "-osrt",
            "-ojf",
            "-of",
            str(output_stem),
            "-np",
            str(audio_path),
        ]
        print(f"Transcribing {source_path.name} -> {output_stem.name}", flush=True)
        try:
            subprocess.run(command, check=True)
        finally:
            if temporary_audio is not None:
                temporary_audio.unlink(missing_ok=True)

    print(f"Transcribed {len(source_files)} files to {output_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
