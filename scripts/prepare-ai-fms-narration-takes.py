#!/usr/bin/env python3
"""Trim, normalize, and time selected AI-FMS narration takes."""

from __future__ import annotations

import argparse
import json
import subprocess
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path


@dataclass(frozen=True)
class Selection:
    voice_id: str
    slug: str
    region: int
    start_second: float
    end_second: float
    timeline_speed: float
    reason: str


SELECTIONS = [
    Selection("VO01", "fms-intro", 3, 3.60, 24.24, 1.06, "Take 2: complete wording and clearest diagnostic boundary."),
    Selection("VO02", "certifications", 4, 4.06, 26.86, 1.08, "Take 1: clean Level 1/2 sequence and stronger final clause."),
    Selection("VO03", "practice-problem", 7, 3.84, 29.44, 1.08, "Take 2: clearest zero-to-three information-loss sentence; transition line is handled on camera."),
    Selection("VO04", "seven-movement-system", 8, 3.64, 27.82, 1.12, "Take 1: clearest review-system wording and complete abstention clause."),
    Selection("VO05", "rep-pose-evidence", 10, 3.34, 29.00, 1.06, "Take 1: strongest repetition, timing, MediaPipe, and trajectory wording."),
    Selection("VO06", "human-judgment", 12, 3.94, 24.66, 1.06, "Take 1: complete criteria-to-notes sequence."),
    Selection("VO07", "blind-study-mode", 14, 4.36, 27.41, 1.08, "Take 1: strongest blind-round, append-only, and checksum wording."),
    Selection("VO08", "phase-i-results", 18, 3.64, 38.90, 1.15, "Take 3: only compact complete take with all five frozen result statements."),
    Selection("VO09", "research-findings", 20, 3.52, 27.56, 1.08, "Take 2: cleaner present tense and full Rotary Stability ending."),
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio-dir", type=Path, required=True)
    parser.add_argument("--selected-dir", type=Path, required=True)
    parser.add_argument("--timeline-dir", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--ffmpeg", default="ffmpeg")
    parser.add_argument("--ffprobe", default="ffprobe")
    return parser.parse_args()


def duration(path: Path, ffprobe: str) -> float:
    result = subprocess.run(
        [
            ffprobe,
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return round(float(result.stdout.strip()), 3)


def render_take(
    *,
    ffmpeg: str,
    source: Path,
    output: Path,
    start_second: float,
    end_second: float,
    speed: float,
) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    output_duration = (end_second - start_second) / speed
    fade_out_start = max(0.0, output_duration - 0.08)
    filters = [
        f"atrim=start={start_second:.3f}:end={end_second:.3f}",
        "asetpts=PTS-STARTPTS",
        "highpass=f=70",
        "lowpass=f=16000",
    ]
    if abs(speed - 1.0) > 0.0001:
        filters.append(f"atempo={speed:.5f}")
    filters.extend(
        [
            "loudnorm=I=-16:TP=-1.5:LRA=7",
            "afade=t=in:st=0:d=0.05",
            f"afade=t=out:st={fade_out_start:.3f}:d=0.08",
        ]
    )
    subprocess.run(
        [
            ffmpeg,
            "-y",
            "-i",
            str(source),
            "-vn",
            "-af",
            ",".join(filters),
            "-ac",
            "1",
            "-ar",
            "48000",
            "-c:a",
            "pcm_s24le",
            str(output),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def write_report(rows: list[dict], path: Path) -> None:
    lines = [
        "# AI-FMS Narration Take Selection",
        "",
        f"Generated: {datetime.now(timezone.utc).isoformat()}",
        "",
        "The original GarageBand regions remain unchanged. `selected` files retain natural speed; `timeline` files use mild timing adjustments for the application-film master.",
        "",
        "| VO | Selected region | Natural | Timeline | Speed | Reason |",
        "| --- | ---: | ---: | ---: | ---: | --- |",
    ]
    for row in rows:
        lines.append(
            f"| {row['voiceId']} | #{row['region']:02d} | {row['selectedDurationSecond']:.2f}s | "
            f"{row['timelineDurationSecond']:.2f}s | {row['timelineSpeed']:.2f}x | {row['reason']} |"
        )
    lines.extend(
        [
            "",
            f"Natural selected total: {sum(row['selectedDurationSecond'] for row in rows):.2f}s",
            "",
            f"Timeline narration total: {sum(row['timelineDurationSecond'] for row in rows):.2f}s",
            "",
            "Selection is based on script completeness, offline transcript evidence, pronunciation clarity, and the accepted application-video timing plan. Final performance approval remains human.",
            "",
        ]
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    args = parse_args()
    audio_dir = args.audio_dir.resolve()
    selected_dir = args.selected_dir.resolve()
    timeline_dir = args.timeline_dir.resolve()
    rows = []

    for selection in SELECTIONS:
        source = audio_dir / f"音频 1#{selection.region:02d}.wav"
        if not source.exists():
            raise SystemExit(f"Missing selected source: {source}")
        stem = f"{selection.voice_id}_{selection.slug}"
        selected_output = selected_dir / f"{stem}.wav"
        timeline_output = timeline_dir / f"{stem}.wav"
        render_take(
            ffmpeg=args.ffmpeg,
            source=source,
            output=selected_output,
            start_second=selection.start_second,
            end_second=selection.end_second,
            speed=1.0,
        )
        render_take(
            ffmpeg=args.ffmpeg,
            source=source,
            output=timeline_output,
            start_second=selection.start_second,
            end_second=selection.end_second,
            speed=selection.timeline_speed,
        )
        rows.append(
            {
                "voiceId": selection.voice_id,
                "slug": selection.slug,
                "region": selection.region,
                "sourceFileName": source.name,
                "sourceStartSecond": selection.start_second,
                "sourceEndSecond": selection.end_second,
                "timelineSpeed": selection.timeline_speed,
                "selectedFileName": selected_output.name,
                "timelineFileName": timeline_output.name,
                "selectedDurationSecond": duration(selected_output, args.ffprobe),
                "timelineDurationSecond": duration(timeline_output, args.ffprobe),
                "reason": selection.reason,
            }
        )

    manifest = {
        "schemaVersion": "ai_fms_narration_selection_v1",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "items": rows,
        "summary": {
            "selectedCount": len(rows),
            "naturalDurationSecond": round(
                sum(row["selectedDurationSecond"] for row in rows), 3
            ),
            "timelineDurationSecond": round(
                sum(row["timelineDurationSecond"] for row in rows), 3
            ),
        },
    }
    args.manifest.parent.mkdir(parents=True, exist_ok=True)
    args.manifest.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    write_report(rows, args.report)
    print(json.dumps(manifest["summary"], indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

