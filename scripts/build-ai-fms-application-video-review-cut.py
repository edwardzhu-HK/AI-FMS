#!/usr/bin/env python3
"""Build the first AI-FMS application-film review cut with FFmpeg."""

from __future__ import annotations

import argparse
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
PRODUCTION = REPO_ROOT / "Ingested-data/application-video-production"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--work-dir",
        type=Path,
        default=PRODUCTION / "07-edit-project/rough-cut-v1",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=PRODUCTION / "08-exports/ai-fms-application-film-master-review-v1.mp4",
    )
    parser.add_argument("--ffmpeg", default="ffmpeg")
    parser.add_argument("--ffprobe", default="ffprobe")
    return parser.parse_args()


def run(command: list[str]) -> None:
    result = subprocess.run(command, text=True, capture_output=True)
    if result.returncode != 0:
        raise RuntimeError(
            f"Command failed ({result.returncode}): {' '.join(command)}\n{result.stderr}"
        )


def probe_duration(path: Path, ffprobe: str) -> float:
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
    return float(result.stdout.strip())


def video_filter(*, speed: float = 1.0, label: str | None = None) -> str:
    filters = [
        "scale=1920:1080:force_original_aspect_ratio=decrease",
        "pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black",
        "setsar=1",
        "fps=30",
    ]
    if abs(speed - 1.0) > 0.0001:
        filters.append(f"setpts=PTS/{speed:.5f}")
    return ",".join(filters)


def render_muted_clip(
    *,
    ffmpeg: str,
    source: Path,
    output: Path,
    start: float,
    end: float,
    duration: float,
    label: str | None = None,
) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    run(
        [
            ffmpeg,
            "-y",
            "-ss",
            f"{start:.3f}",
            "-to",
            f"{end:.3f}",
            "-i",
            str(source),
            "-f",
            "lavfi",
            "-t",
            f"{duration:.3f}",
            "-i",
            "anullsrc=r=48000:cl=stereo",
            "-vf",
            video_filter(label=label),
            "-t",
            f"{duration:.3f}",
            "-map",
            "0:v:0",
            "-map",
            "1:a:0",
            "-map_metadata",
            "-1",
            "-c:v",
            "libx264",
            "-preset",
            "fast",
            "-crf",
            "18",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-ar",
            "48000",
            "-movflags",
            "+faststart",
            str(output),
        ]
    )


def render_live_clip(
    *,
    ffmpeg: str,
    source: Path,
    output: Path,
    start: float,
    end: float,
    speed: float = 1.0,
    lower_third: bool = False,
) -> None:
    clip_duration = end - start
    filters = video_filter(speed=speed)
    audio_filters = [
        f"atrim=start=0:end={clip_duration:.3f}",
        "asetpts=PTS-STARTPTS",
        "highpass=f=70",
        "lowpass=f=16000",
    ]
    if abs(speed - 1.0) > 0.0001:
        audio_filters.append(f"atempo={speed:.5f}")
    audio_filters.extend(
        [
            "loudnorm=I=-16:TP=-1.5:LRA=7",
            "afade=t=in:st=0:d=0.05",
        ]
    )
    run(
        [
            ffmpeg,
            "-y",
            "-ss",
            f"{start:.3f}",
            "-t",
            f"{clip_duration:.3f}",
            "-i",
            str(source),
            "-vf",
            filters,
            "-af",
            ",".join(audio_filters),
            "-map_metadata",
            "-1",
            "-c:v",
            "libx264",
            "-preset",
            "fast",
            "-crf",
            "18",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-ar",
            "48000",
            "-ac",
            "2",
            "-movflags",
            "+faststart",
            str(output),
        ]
    )


def render_still(
    *,
    ffmpeg: str,
    source: Path,
    output: Path,
    duration: float,
    label: str | None = None,
) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    filter_text = (
        "scale=1920:1080:force_original_aspect_ratio=decrease,"
        "pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=#f7f8f6,setsar=1,fps=30"
    )
    run(
        [
            ffmpeg,
            "-y",
            "-loop",
            "1",
            "-framerate",
            "30",
            "-i",
            str(source),
            "-f",
            "lavfi",
            "-t",
            f"{duration:.3f}",
            "-i",
            "anullsrc=r=48000:cl=stereo",
            "-vf",
            filter_text,
            "-t",
            f"{duration:.3f}",
            "-map",
            "0:v:0",
            "-map",
            "1:a:0",
            "-map_metadata",
            "-1",
            "-c:v",
            "libx264",
            "-preset",
            "fast",
            "-crf",
            "18",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-ar",
            "48000",
            "-movflags",
            "+faststart",
            str(output),
        ]
    )


def render_screen_section(
    *,
    ffmpeg: str,
    source: Path,
    output: Path,
    start: float,
    available: float,
    duration: float,
) -> None:
    pad_duration = max(0.0, duration - available)
    filters = [video_filter()]
    if pad_duration > 0.001:
        filters.append(f"tpad=stop_mode=clone:stop_duration={pad_duration:.3f}")
    run(
        [
            ffmpeg,
            "-y",
            "-ss",
            f"{start:.3f}",
            "-t",
            f"{available:.3f}",
            "-i",
            str(source),
            "-f",
            "lavfi",
            "-t",
            f"{duration:.3f}",
            "-i",
            "anullsrc=r=48000:cl=stereo",
            "-vf",
            ",".join(filters),
            "-t",
            f"{duration:.3f}",
            "-map",
            "0:v:0",
            "-map",
            "1:a:0",
            "-map_metadata",
            "-1",
            "-c:v",
            "libx264",
            "-preset",
            "fast",
            "-crf",
            "18",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-ar",
            "48000",
            "-movflags",
            "+faststart",
            str(output),
        ]
    )


def concat_copy(ffmpeg: str, sources: list[Path], output: Path) -> None:
    list_file = output.with_suffix(".concat.txt")
    list_file.write_text(
        "\n".join(f"file '{source.resolve()}'" for source in sources) + "\n",
        encoding="utf-8",
    )
    run(
        [
            ffmpeg,
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(list_file),
            "-c",
            "copy",
            str(output),
        ]
    )


def attach_voiceover(
    *, ffmpeg: str, visual: Path, voiceover: Path, output: Path, duration: float
) -> None:
    run(
        [
            ffmpeg,
            "-y",
            "-i",
            str(visual),
            "-i",
            str(voiceover),
            "-t",
            f"{duration:.3f}",
            "-map",
            "0:v:0",
            "-map",
            "1:a:0",
            "-c:v",
            "copy",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-ar",
            "48000",
            "-ac",
            "2",
            "-movflags",
            "+faststart",
            str(output),
        ]
    )


def build_review_cut(args: argparse.Namespace) -> dict:
    work_dir = args.work_dir.resolve()
    section_dir = work_dir / "sections"
    clip_dir = work_dir / "clips"
    section_dir.mkdir(parents=True, exist_ok=True)
    clip_dir.mkdir(parents=True, exist_ok=True)
    args.output.parent.mkdir(parents=True, exist_ok=True)

    timeline_audio = PRODUCTION / "06-audio/timeline"
    voices = {
        "VO01": timeline_audio / "VO01_fms-intro.wav",
        "VO02": timeline_audio / "VO02_certifications.wav",
        "VO03": timeline_audio / "VO03_practice-problem.wav",
        "VO04": timeline_audio / "VO04_seven-movement-system.wav",
        "VO05": timeline_audio / "VO05_rep-pose-evidence.wav",
        "VO06": timeline_audio / "VO06_human-judgment.wav",
        "VO07": timeline_audio / "VO07_blind-study-mode.wav",
        "VO08": timeline_audio / "VO08_phase-i-results.wav",
        "VO09": timeline_audio / "VO09_research-findings.wav",
    }
    voice_durations = {
        key: probe_duration(path, args.ffprobe) for key, path in voices.items()
    }

    a_roll = PRODUCTION / "01-a-roll"
    practice = PRODUCTION / "02-fms-practice"
    graphics = PRODUCTION / "05-graphics"
    screen = PRODUCTION / "04-screen-recordings/final"
    publication_figures = REPO_ROOT / "output/publication/nhsjs/figures"

    sections: list[tuple[str, Path]] = []

    a01 = section_dir / "01-A01-opening.mp4"
    render_live_clip(
        ffmpeg=args.ffmpeg,
        source=a_roll / "opening/VID20260823135332.mp4",
        output=a01,
        start=0.0,
        end=19.24,
        lower_third=True,
    )
    sections.append(("A01 opening", a01))

    movement_sources = [
        ("Deep Squat", "seven-movements/VID20260823130739.mp4", 10.8, 13.6),
        ("Hurdle Step", "seven-movements/VID20260823131235.mp4", 5.0, 7.8),
        ("In-Line Lunge", "seven-movements/VID20260823131706.mp4", 3.2, 6.0),
        ("Shoulder Mobility", "seven-movements/VID20260823131851.mp4", 6.0, 8.8),
        ("Active Straight Leg Raise", "seven-movements/VID20260823132359.mp4", 15.0, 17.8),
        ("Trunk Stability Push-Up", "seven-movements/VID20260823132032.mp4", 9.8, 12.6),
        ("Rotary Stability", "seven-movements/VID20260823132708.mp4", 9.3, 12.1),
    ]
    movement_duration = voice_durations["VO01"] / len(movement_sources)
    movement_clips = []
    for index, (label, relative, start, end) in enumerate(movement_sources, start=1):
        clip = clip_dir / f"movement-{index:02d}.mp4"
        render_muted_clip(
            ffmpeg=args.ffmpeg,
            source=practice / relative,
            output=clip,
            start=start,
            end=end,
            duration=movement_duration,
            label=label,
        )
        movement_clips.append(clip)
    b02_visual = section_dir / "02-B02-seven-movements-visual.mp4"
    concat_copy(args.ffmpeg, movement_clips, b02_visual)
    b02 = section_dir / "02-B02-seven-movements.mp4"
    attach_voiceover(
        ffmpeg=args.ffmpeg,
        visual=b02_visual,
        voiceover=voices["VO01"],
        output=b02,
        duration=voice_durations["VO01"],
    )
    sections.append(("B02 seven movements", b02))

    certificate_duration = voice_durations["VO02"] / 2
    certificate_clips = []
    for index, (source, label) in enumerate(
        [
            (graphics / "certificates/fms-level-1.png", "FMS Level 1 Certification"),
            (graphics / "certificates/fms-level-2.png", "FMS Level 2 Certification"),
        ],
        start=1,
    ):
        clip = clip_dir / f"certificate-{index:02d}.mp4"
        render_still(
            ffmpeg=args.ffmpeg,
            source=source,
            output=clip,
            duration=certificate_duration,
            label=label,
        )
        certificate_clips.append(clip)
    certificate_visual = section_dir / "03-certificates-visual.mp4"
    concat_copy(args.ffmpeg, certificate_clips, certificate_visual)
    certificates = section_dir / "03-certifications.mp4"
    attach_voiceover(
        ffmpeg=args.ffmpeg,
        visual=certificate_visual,
        voiceover=voices["VO02"],
        output=certificates,
        duration=voice_durations["VO02"],
    )
    sections.append(("certifications", certificates))

    evaluator_sources = [
        ("Kit setup", "evaluator-broll/VID20260823132920.mp4", 4.0),
        ("Explaining the setup", "evaluator-broll/VID20260823133352.mp4", 4.0),
        ("Protocol measurement", "evaluator-broll/VID20260823134038.mp4", 2.0),
        ("Reviewing an ASLR attempt", "evaluator-broll/VID20260823134454.mp4", 4.0),
    ]
    evaluator_duration = voice_durations["VO03"] / len(evaluator_sources)
    evaluator_clips = []
    for index, (label, relative, start) in enumerate(evaluator_sources, start=1):
        clip = clip_dir / f"evaluator-{index:02d}.mp4"
        render_muted_clip(
            ffmpeg=args.ffmpeg,
            source=practice / relative,
            output=clip,
            start=start,
            end=start + evaluator_duration,
            duration=evaluator_duration,
            label=label,
        )
        evaluator_clips.append(clip)
    evaluator_visual = section_dir / "04-D01-practice-visual.mp4"
    concat_copy(args.ffmpeg, evaluator_clips, evaluator_visual)
    evaluator = section_dir / "04-D01-practice.mp4"
    attach_voiceover(
        ffmpeg=args.ffmpeg,
        visual=evaluator_visual,
        voiceover=voices["VO03"],
        output=evaluator,
        duration=voice_durations["VO03"],
    )
    sections.append(("D01 practice", evaluator))

    a02 = section_dir / "05-A02-transition.mp4"
    render_live_clip(
        ffmpeg=args.ffmpeg,
        source=a_roll / "transition/VID20260823140338.mp4",
        output=a02,
        start=0.0,
        end=6.0,
    )
    sections.append(("A02 transition", a02))

    workbench_master = screen / "S01-S03-workbench-master.mp4"
    screen_specs = [
        ("VO04", "06-S01-system-scope", 0.0, voice_durations["VO04"]),
        ("VO05", "07-S02-rep-pose", voice_durations["VO04"], voice_durations["VO05"]),
        (
            "VO06",
            "08-S03-human-review",
            voice_durations["VO04"] + voice_durations["VO05"],
            voice_durations["VO06"],
        ),
    ]
    workbench_available = probe_duration(workbench_master, args.ffprobe)
    for voice_id, stem, start, target_duration in screen_specs:
        available = min(target_duration, max(0.1, workbench_available - start))
        visual = section_dir / f"{stem}-visual.mp4"
        render_screen_section(
            ffmpeg=args.ffmpeg,
            source=workbench_master,
            output=visual,
            start=start,
            available=available,
            duration=target_duration,
        )
        section = section_dir / f"{stem}.mp4"
        attach_voiceover(
            ffmpeg=args.ffmpeg,
            visual=visual,
            voiceover=voices[voice_id],
            output=section,
            duration=target_duration,
        )
        sections.append((stem, section))

    study_master = screen / "S04-study-mode-master.mp4"
    study_start = 2.2
    study_available = max(
        0.1,
        min(
            voice_durations["VO07"],
            probe_duration(study_master, args.ffprobe) - study_start,
        ),
    )
    study_visual = section_dir / "09-S04-study-mode-visual.mp4"
    render_screen_section(
        ffmpeg=args.ffmpeg,
        source=study_master,
        output=study_visual,
        start=study_start,
        available=study_available,
        duration=voice_durations["VO07"],
    )
    study = section_dir / "09-S04-study-mode.mp4"
    attach_voiceover(
        ffmpeg=args.ffmpeg,
        visual=study_visual,
        voiceover=voices["VO07"],
        output=study,
        duration=voice_durations["VO07"],
    )
    sections.append(("S04 study mode", study))

    results_duration = voice_durations["VO08"]
    result_sources = [
        graphics / "rendered/G01-01-canonical-pool.png",
        graphics / "rendered/G01-02-blind-study.png",
        graphics / "rendered/G01-03-human-agreement.png",
        graphics / "rendered/G01-04-locked-ai.png",
        graphics / "rendered/G01-05-boundary.png",
    ]
    result_durations = [5.3, 5.3, 6.0, 7.0]
    result_durations.append(results_duration - sum(result_durations))
    result_clips = []
    for index, (source, duration_value) in enumerate(
        zip(result_sources, result_durations), start=1
    ):
        clip = clip_dir / f"result-{index:02d}.mp4"
        render_still(
            ffmpeg=args.ffmpeg,
            source=source,
            output=clip,
            duration=duration_value,
        )
        result_clips.append(clip)
    results_visual = section_dir / "10-G01-results-visual.mp4"
    concat_copy(args.ffmpeg, result_clips, results_visual)
    results_section = section_dir / "10-G01-results.mp4"
    attach_voiceover(
        ffmpeg=args.ffmpeg,
        visual=results_visual,
        voiceover=voices["VO08"],
        output=results_section,
        duration=results_duration,
    )
    sections.append(("G01 results", results_section))

    finding_sources = [
        publication_figures / "deep-squat-strategy-continuum.png",
        publication_figures / "aslr-bilateral-repeatability.png",
        publication_figures / "hurdle-score2-pathways.png",
        publication_figures / "rotary-cycle-event-matrix.png",
    ]
    finding_duration = voice_durations["VO09"] / len(finding_sources)
    finding_clips = []
    for index, source in enumerate(finding_sources, start=1):
        clip = clip_dir / f"finding-{index:02d}.mp4"
        render_still(
            ffmpeg=args.ffmpeg,
            source=source,
            output=clip,
            duration=finding_duration,
        )
        finding_clips.append(clip)
    findings_visual = section_dir / "11-G02-G05-findings-visual.mp4"
    concat_copy(args.ffmpeg, finding_clips, findings_visual)
    findings = section_dir / "11-G02-G05-findings.mp4"
    attach_voiceover(
        ffmpeg=args.ffmpeg,
        visual=findings_visual,
        voiceover=voices["VO09"],
        output=findings,
        duration=voice_durations["VO09"],
    )
    sections.append(("G02-G05 findings", findings))

    a03_parts = []
    for index, (start, end) in enumerate([(9.52, 40.12), (54.8, 65.96)], start=1):
        part = section_dir / f"12-A03-closing-part-{index}.mp4"
        render_live_clip(
            ffmpeg=args.ffmpeg,
            source=a_roll / "closing/VID20260823141858.mp4",
            output=part,
            start=start,
            end=end,
            speed=1.08,
        )
        a03_parts.append(part)
    a03 = section_dir / "12-A03-closing.mp4"
    concat_copy(args.ffmpeg, a03_parts, a03)
    sections.append(("A03 closing", a03))

    end_card = section_dir / "13-G06-end-card.mp4"
    render_still(
        ffmpeg=args.ffmpeg,
        source=graphics / "rendered/G06-end-card.png",
        output=end_card,
        duration=4.0,
    )
    sections.append(("G06 end card", end_card))

    concat_intermediate = work_dir / "master-concat.mp4"
    concat_copy(args.ffmpeg, [path for _, path in sections], concat_intermediate)
    run(
        [
            args.ffmpeg,
            "-y",
            "-i",
            str(concat_intermediate),
            "-map_metadata",
            "-1",
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            "18",
            "-pix_fmt",
            "yuv420p",
            "-r",
            "30",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-ar",
            "48000",
            "-movflags",
            "+faststart",
            str(args.output.resolve()),
        ]
    )

    cursor = 0.0
    section_rows = []
    for label, path in sections:
        section_duration = probe_duration(path, args.ffprobe)
        section_rows.append(
            {
                "label": label,
                "file": str(path.relative_to(REPO_ROOT)),
                "startSecond": round(cursor, 3),
                "durationSecond": round(section_duration, 3),
                "endSecond": round(cursor + section_duration, 3),
            }
        )
        cursor += section_duration
    manifest = {
        "schemaVersion": "ai_fms_application_film_review_cut_v1",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "music": "none",
        "target": "4:15-4:30 master; review cut may vary slightly",
        "durationSecond": round(probe_duration(args.output.resolve(), args.ffprobe), 3),
        "output": str(args.output.resolve().relative_to(REPO_ROOT)),
        "sections": section_rows,
    }
    manifest_path = work_dir / "review-cut-manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return manifest


def main() -> int:
    args = parse_args()
    manifest = build_review_cut(args)
    print(json.dumps(manifest, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
