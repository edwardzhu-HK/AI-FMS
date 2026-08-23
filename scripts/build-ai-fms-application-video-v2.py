#!/usr/bin/env python3
"""Build the second AI-FMS application-film review cut from approved sources."""

from __future__ import annotations

import argparse
import importlib.util
import json
import subprocess
import textwrap
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


REPO_ROOT = Path(__file__).resolve().parents[1]
PRODUCTION = REPO_ROOT / "Ingested-data/application-video-production"
BASE_SCRIPT = Path(__file__).with_name(
    "build-ai-fms-application-video-review-cut.py"
)

spec = importlib.util.spec_from_file_location("ai_fms_review_cut_base", BASE_SCRIPT)
base = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(base)

run = base.run
probe_duration = base.probe_duration
concat_copy = base.concat_copy

FONT_REGULAR = Path("/System/Library/Fonts/Supplemental/Arial.ttf")
FONT_BOLD = Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf")
FADE_SECOND = 0.20


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--work-dir",
        type=Path,
        default=PRODUCTION / "07-edit-project/rough-cut-v2",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=PRODUCTION
        / "08-exports/ai-fms-application-film-master-review-v2.mp4",
    )
    parser.add_argument("--ffmpeg", default="ffmpeg")
    parser.add_argument("--ffprobe", default="ffprobe")
    return parser.parse_args()


def video_base_filter(speed: float = 1.0) -> str:
    filters = [
        "scale=1920:1080:force_original_aspect_ratio=decrease",
        "pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black",
        "setsar=1",
        "fps=30",
    ]
    if abs(speed - 1.0) > 0.0001:
        filters.append(f"setpts=PTS/{speed:.5f}")
    return ",".join(filters)


def voice_filter(speed: float = 1.0) -> str:
    filters = [
        "asetpts=PTS-STARTPTS",
        "highpass=f=70",
        "lowpass=f=16000",
    ]
    if abs(speed - 1.0) > 0.0001:
        filters.append(f"atempo={speed:.5f}")
    filters.extend(
        [
            "acompressor=threshold=0.16:ratio=2:attack=18:release=160:makeup=1.25",
            "loudnorm=I=-16:TP=-1.5:LRA=7",
            "afade=t=in:st=0:d=0.05",
        ]
    )
    return ",".join(filters)


def render_live(
    *,
    ffmpeg: str,
    source: Path,
    output: Path,
    start: float,
    end: float,
    speed: float = 1.0,
    overlay: Path | None = None,
    overlay_until: float | None = None,
) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    duration = (end - start) / speed
    command = [
        ffmpeg,
        "-y",
        "-ss",
        f"{start:.3f}",
        "-t",
        f"{end - start:.3f}",
        "-i",
        str(source),
    ]
    if overlay:
        command.extend(["-loop", "1", "-i", str(overlay)])
        enable = (
            f":enable='between(t,0,{overlay_until:.3f})'"
            if overlay_until is not None
            else ""
        )
        command.extend(
            [
                "-filter_complex",
                f"[0:v]{video_base_filter(speed)}[base];"
                f"[base][1:v]overlay=0:0{enable}[v]",
                "-map",
                "[v]",
                "-map",
                "0:a:0",
            ]
        )
    else:
        command.extend(
            ["-vf", video_base_filter(speed), "-map", "0:v:0", "-map", "0:a:0"]
        )
    command.extend(
        [
            "-af",
            voice_filter(speed),
            "-t",
            f"{duration:.3f}",
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
    run(command)


def render_muted(
    *,
    ffmpeg: str,
    source: Path,
    output: Path,
    start: float,
    end: float,
    duration: float,
    overlay: Path | None = None,
) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    command = [
        ffmpeg,
        "-y",
        "-ss",
        f"{start:.3f}",
        "-to",
        f"{end:.3f}",
        "-i",
        str(source),
    ]
    if overlay:
        command.extend(["-loop", "1", "-i", str(overlay)])
    command.extend(
        [
            "-f",
            "lavfi",
            "-t",
            f"{duration:.3f}",
            "-i",
            "anullsrc=r=48000:cl=stereo",
        ]
    )
    if overlay:
        command.extend(
            [
                "-filter_complex",
                f"[0:v]{video_base_filter()}[base];[base][1:v]overlay=0:0[v]",
                "-map",
                "[v]",
                "-map",
                "2:a:0",
            ]
        )
    else:
        command.extend(
            ["-vf", video_base_filter(), "-map", "0:v:0", "-map", "1:a:0"]
        )
    command.extend(
        [
            "-t",
            f"{duration:.3f}",
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
    run(command)


def render_still(
    *,
    ffmpeg: str,
    source: Path,
    output: Path,
    duration: float,
    crop: tuple[int, int, int, int] | None = None,
    zoom: float = 1.0,
    center: tuple[float, float] = (0.5, 0.5),
) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    filters = []
    if crop:
        width, height, x, y = crop
        filters.append(f"crop={width}:{height}:{x}:{y}")
    filters.extend(
        [
            "scale=1920:1080:force_original_aspect_ratio=decrease",
            "pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=#f7f8f6",
            "setsar=1",
            "fps=30",
        ]
    )
    if zoom > 1.0001:
        frames = max(1, round(duration * 30))
        ramp_in = min(18, frames // 4)
        ramp_out = min(12, frames // 5)
        hold_end = max(ramp_in + 1, frames - ramp_out)
        delta = zoom - 1.0
        z_expr = (
            f"if(lt(on,{ramp_in}),1+{delta:.5f}*on/{ramp_in},"
            f"if(lt(on,{hold_end}),{zoom:.5f},"
            f"{zoom:.5f}-{delta:.5f}*(on-{hold_end})/{ramp_out}))"
        )
        cx, cy = center
        x_expr = f"max(0,min(iw-iw/zoom,iw*{cx:.5f}-iw/(2*zoom)))"
        y_expr = f"max(0,min(ih-ih/zoom,ih*{cy:.5f}-ih/(2*zoom)))"
        filters.append(
            f"zoompan=z='{z_expr}':x='{x_expr}':y='{y_expr}':d=1:s=1920x1080:fps=30"
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


def render_screen_excerpt(
    *,
    ffmpeg: str,
    source: Path,
    output: Path,
    start: float,
    end: float,
    zoom: float = 1.0,
    center: tuple[float, float] = (0.5, 0.5),
) -> None:
    duration = end - start
    filters = ["fps=30", "setsar=1"]
    if zoom > 1.0001:
        frames = max(1, round(duration * 30))
        ramp_in = min(16, frames // 4)
        ramp_out = min(12, frames // 5)
        hold_end = max(ramp_in + 1, frames - ramp_out)
        delta = zoom - 1.0
        z_expr = (
            f"if(lt(on,{ramp_in}),1+{delta:.5f}*on/{ramp_in},"
            f"if(lt(on,{hold_end}),{zoom:.5f},"
            f"{zoom:.5f}-{delta:.5f}*(on-{hold_end})/{ramp_out}))"
        )
        cx, cy = center
        x_expr = f"max(0,min(iw-iw/zoom,iw*{cx:.5f}-iw/(2*zoom)))"
        y_expr = f"max(0,min(ih-ih/zoom,ih*{cy:.5f}-ih/(2*zoom)))"
        filters.append(
            f"zoompan=z='{z_expr}':x='{x_expr}':y='{y_expr}':d=1:s=1920x1080:fps=30"
        )
    run(
        [
            ffmpeg,
            "-y",
            "-ss",
            f"{start:.3f}",
            "-t",
            f"{duration:.3f}",
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
            "-map",
            "0:v:0",
            "-map",
            "1:a:0",
            "-t",
            f"{duration:.3f}",
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


def attach_voice(
    *,
    ffmpeg: str,
    visual: Path,
    voice: Path,
    output: Path,
    duration: float,
    voice_start: float = 0.0,
) -> None:
    run(
        [
            ffmpeg,
            "-y",
            "-i",
            str(visual),
            "-ss",
            f"{voice_start:.3f}",
            "-i",
            str(voice),
            "-t",
            f"{duration:.3f}",
            "-map",
            "0:v:0",
            "-map",
            "1:a:0",
            "-c:v",
            "copy",
            "-af",
            voice_filter(),
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


def speed_audio(
    *, ffmpeg: str, source: Path, output: Path, speed: float
) -> None:
    run(
        [
            ffmpeg,
            "-y",
            "-i",
            str(source),
            "-af",
            voice_filter(speed),
            "-ar",
            "48000",
            "-ac",
            "2",
            str(output),
        ]
    )


def concat_crossfade(
    *, ffmpeg: str, ffprobe: str, sources: list[Path], output: Path
) -> float:
    durations = [probe_duration(source, ffprobe) for source in sources]
    command = [ffmpeg, "-y"]
    for source in sources:
        command.extend(["-i", str(source)])
    filters = []
    for index in range(len(sources)):
        filters.append(
            f"[{index}:v]settb=AVTB,fps=30,format=yuv420p[v{index}]"
        )
        filters.append(f"[{index}:a]aresample=48000[a{index}]")
    video_label = "v0"
    audio_label = "a0"
    current_duration = durations[0]
    for index in range(1, len(sources)):
        next_video = f"vx{index}"
        next_audio = f"ax{index}"
        offset = current_duration - FADE_SECOND
        filters.append(
            f"[{video_label}][v{index}]xfade=transition=fade:duration={FADE_SECOND}:"
            f"offset={offset:.6f}[{next_video}]"
        )
        filters.append(
            f"[{audio_label}][a{index}]acrossfade=d={FADE_SECOND}:c1=tri:c2=tri"
            f"[{next_audio}]"
        )
        video_label = next_video
        audio_label = next_audio
        current_duration += durations[index] - FADE_SECOND
    command.extend(
        [
            "-filter_complex",
            ";".join(filters),
            "-map",
            f"[{video_label}]",
            "-map",
            f"[{audio_label}]",
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
    run(command)
    return current_duration


def fit_font(text: str, bold: bool, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT_BOLD if bold else FONT_REGULAR), size)


def create_title_overlay(path: Path) -> None:
    image = Image.new("RGBA", (1920, 1080), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((70, 58, 640, 192), radius=8, fill=(15, 30, 35, 218))
    draw.rectangle((70, 58, 82, 192), fill=(232, 180, 79, 255))
    draw.text((112, 78), "AI-FMS", font=fit_font("", True, 46), fill="white")
    draw.text(
        (112, 137),
        "Explainable movement review",
        font=fit_font("", False, 25),
        fill=(220, 232, 230, 255),
    )
    image.save(path)


def create_movement_overlay(path: Path, text: str) -> None:
    image = Image.new("RGBA", (1920, 1080), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    font = fit_font(text, True, 34)
    bbox = draw.textbbox((0, 0), text, font=font)
    width = bbox[2] - bbox[0]
    draw.rounded_rectangle(
        (68, 70, 130 + width, 142), radius=7, fill=(15, 30, 35, 225)
    )
    draw.rectangle((68, 70, 78, 142), fill=(232, 180, 79, 255))
    draw.text((96, 87), text, font=font, fill="white")
    image.save(path)


def create_caption_overlay(path: Path, text: str) -> None:
    image = Image.new("RGBA", (1920, 1080), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    font = fit_font(text, False, 42)
    wrapped = textwrap.wrap(text, width=66, break_long_words=False)
    wrapped = wrapped[:2]
    lines = "\n".join(wrapped)
    bbox = draw.multiline_textbbox((0, 0), lines, font=font, spacing=10, align="center")
    width = bbox[2] - bbox[0]
    height = bbox[3] - bbox[1]
    x1 = max(90, (1920 - width) // 2 - 36)
    x2 = min(1830, (1920 + width) // 2 + 36)
    y2 = 1022
    y1 = y2 - height - 34
    draw.rounded_rectangle((x1, y1, x2, y2), radius=7, fill=(8, 16, 20, 202))
    draw.multiline_text(
        (960, y1 + 15),
        lines,
        font=font,
        fill="white",
        anchor="ma",
        spacing=10,
        align="center",
        stroke_width=1,
        stroke_fill=(0, 0, 0, 180),
    )
    image.save(path)


def apply_captions(
    *,
    ffmpeg: str,
    source: Path,
    output: Path,
    cues: list[tuple[float, float, str]],
    overlay_dir: Path,
    stem: str,
) -> None:
    if not cues:
        output.write_bytes(source.read_bytes())
        return
    command = [ffmpeg, "-y", "-i", str(source)]
    overlays = []
    for index, (_, _, text) in enumerate(cues, start=1):
        overlay = overlay_dir / f"{stem}-caption-{index:02d}.png"
        create_caption_overlay(overlay, text)
        overlays.append(overlay)
        command.extend(["-loop", "1", "-i", str(overlay)])
    filters = []
    current = "0:v"
    for index, (start, end, _) in enumerate(cues, start=1):
        next_label = f"cap{index}"
        filters.append(
            f"[{current}][{index}:v]overlay=0:0:"
            f"enable='between(t,{start:.3f},{end:.3f})'[{next_label}]"
        )
        current = next_label
    command.extend(
        [
            "-filter_complex",
            ";".join(filters),
            "-map",
            f"[{current}]",
            "-map",
            "0:a:0",
            "-t",
            f"{probe_duration(source, 'ffprobe'):.3f}",
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
            "copy",
            "-movflags",
            "+faststart",
            str(output),
        ]
    )
    run(command)


def mix_music(
    *, ffmpeg: str, source: Path, output: Path, duration: float
) -> None:
    music = Path(
        "/Library/Audio/Apple Loops/Apple/01 Hip Hop/Slow Drift Ambient Synth.caf"
    )
    if not music.exists():
        output.write_bytes(source.read_bytes())
        return
    fade_out_start = max(0.0, duration - 3.0)
    run(
        [
            ffmpeg,
            "-y",
            "-i",
            str(source),
            "-stream_loop",
            "-1",
            "-i",
            str(music),
            "-filter_complex",
            f"[0:a]highpass=f=60,lowpass=f=17000[voice];"
            f"[1:a]atrim=0:{duration:.3f},asetpts=PTS-STARTPTS,"
            f"highpass=f=90,lowpass=f=8500,volume=0.032,"
            f"afade=t=in:st=0:d=2.5,afade=t=out:st={fade_out_start:.3f}:d=3[music];"
            f"[voice][music]amix=inputs=2:duration=longest:normalize=0,"
            f"loudnorm=I=-16:TP=-1.5:LRA=7[a]",
            "-map",
            "0:v:0",
            "-map",
            "[a]",
            "-map_metadata",
            "-1",
            "-c:v",
            "copy",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-ar",
            "48000",
            "-t",
            f"{duration:.3f}",
            "-movflags",
            "+faststart",
            str(output),
        ]
    )


def srt_time(second: float) -> str:
    millisecond = round(second * 1000)
    hour, remainder = divmod(millisecond, 3_600_000)
    minute, remainder = divmod(remainder, 60_000)
    seconds, millis = divmod(remainder, 1000)
    return f"{hour:02d}:{minute:02d}:{seconds:02d},{millis:03d}"


def build(args: argparse.Namespace) -> dict:
    work_dir = args.work_dir.resolve()
    section_dir = work_dir / "sections"
    clip_dir = work_dir / "clips"
    overlay_dir = work_dir / "overlays"
    for directory in (section_dir, clip_dir, overlay_dir, args.output.parent):
        directory.mkdir(parents=True, exist_ok=True)

    timeline = PRODUCTION / "06-audio/timeline"
    selected = PRODUCTION / "06-audio/selected"
    voices = {
        "VO01": timeline / "VO01_fms-intro.wav",
        "VO02": timeline / "VO02_certifications.wav",
        "VO03": timeline / "VO03_practice-problem.wav",
        "VO04": timeline / "VO04_seven-movement-system.wav",
        "VO05": timeline / "VO05_rep-pose-evidence.wav",
        "VO06": timeline / "VO06_human-judgment.wav",
        "VO07": selected / "VO07_blind-study-mode.wav",
        "VO09": selected / "VO09_research-findings.wav",
    }
    vo08 = work_dir / "VO08-phase-i-results-1.08x.wav"
    speed_audio(
        ffmpeg=args.ffmpeg,
        source=selected / "VO08_phase-i-results.wav",
        output=vo08,
        speed=1.08,
    )
    voices["VO08"] = vo08

    a_roll = PRODUCTION / "01-a-roll"
    practice = PRODUCTION / "02-fms-practice"
    screen = PRODUCTION / "04-screen-recordings/final"
    graphics = PRODUCTION / "05-graphics"
    figures = REPO_ROOT / "output/publication/nhsjs/figures"

    title_overlay = overlay_dir / "opening-title.png"
    create_title_overlay(title_overlay)

    sections: list[dict] = []

    def add_section(
        label: str,
        source: Path,
        cues: list[tuple[float, float, str]],
    ) -> None:
        captioned = section_dir / f"{len(sections) + 1:02d}-{label}-captioned.mp4"
        apply_captions(
            ffmpeg=args.ffmpeg,
            source=source,
            output=captioned,
            cues=cues,
            overlay_dir=overlay_dir,
            stem=f"{len(sections) + 1:02d}-{label}",
        )
        sections.append({"label": label, "file": captioned, "cues": cues})

    a01 = section_dir / "01-A01-opening.mp4"
    render_live(
        ffmpeg=args.ffmpeg,
        source=a_roll / "opening/VID20260823135332.mp4",
        output=a01,
        start=2.0,
        end=19.24,
        overlay=title_overlay,
        overlay_until=3.4,
    )
    add_section(
        "A01-opening",
        a01,
        [
            (0.1, 4.5, "Hi, I'm Ronnie. Years of swimming taught me to notice how small differences in movement"),
            (4.5, 10.1, "can affect control, efficiency, and performance."),
            (10.1, 17.15, "That curiosity led me to study the Functional Movement Screen, and eventually to build AI-FMS."),
        ],
    )

    movement_sources = [
        ("Deep Squat", "seven-movements/VID20260823130739.mp4", 10.8, 13.6),
        ("Hurdle Step", "seven-movements/VID20260823131235.mp4", 5.0, 7.8),
        ("In-Line Lunge", "seven-movements/VID20260823131706.mp4", 3.2, 6.0),
        ("Shoulder Mobility", "seven-movements/VID20260823131851.mp4", 6.0, 8.8),
        ("Active Straight Leg Raise", "seven-movements/VID20260823132359.mp4", 15.0, 17.8),
        ("Trunk Stability Push-Up", "seven-movements/VID20260823132032.mp4", 9.8, 12.6),
        ("Rotary Stability", "seven-movements/VID20260823132708.mp4", 9.3, 12.1),
    ]
    vo01_duration = probe_duration(voices["VO01"], args.ffprobe)
    movement_duration = vo01_duration / len(movement_sources)
    movement_clips = []
    for index, (label, relative, start, end) in enumerate(movement_sources, start=1):
        overlay = overlay_dir / f"movement-{index:02d}.png"
        create_movement_overlay(overlay, label)
        clip = clip_dir / f"movement-{index:02d}.mp4"
        render_muted(
            ffmpeg=args.ffmpeg,
            source=practice / relative,
            output=clip,
            start=start,
            end=end,
            duration=movement_duration,
            overlay=overlay,
        )
        movement_clips.append(clip)
    movement_visual = section_dir / "02-seven-movements-visual.mp4"
    concat_copy(args.ffmpeg, movement_clips, movement_visual)
    movement = section_dir / "02-seven-movements.mp4"
    attach_voice(
        ffmpeg=args.ffmpeg,
        visual=movement_visual,
        voice=voices["VO01"],
        output=movement,
        duration=vo01_duration,
    )
    add_section(
        "seven-movements",
        movement,
        [
            (0.0, 3.2, "FMS stands for Functional Movement Screen."),
            (3.2, 8.1, "It is a standardized screening system that uses seven fundamental movement patterns"),
            (8.1, 13.7, "to observe how mobility, stability, symmetry, and motor control work together."),
            (13.7, 16.35, "Each pattern is scored from zero to three."),
            (16.35, 19.42, "It is a movement screen, not a medical diagnosis."),
        ],
    )

    cert_intro = section_dir / "03-certification-intro.mp4"
    render_live(
        ffmpeg=args.ffmpeg,
        source=a_roll / "transition/VID20260823140122.mp4",
        output=cert_intro,
        start=1.3,
        end=8.5,
    )
    cert_voice_start = 5.2 / 1.08
    cert_remaining = probe_duration(voices["VO02"], args.ffprobe) - cert_voice_start
    cert_part_durations = [3.6, 6.35, cert_remaining - 9.95]
    cert_visual_parts = []
    completed_courses = (
        graphics / "fms-training-site/fms-completed-level-1-level-2.png"
    )
    cert_sources = [
        completed_courses,
        graphics / "certificates/fms-level-1.png",
        graphics / "certificates/fms-level-2.png",
    ]
    for index, (source, duration) in enumerate(
        zip(cert_sources, cert_part_durations), start=1
    ):
        clip = clip_dir / f"certification-{index:02d}.mp4"
        render_still(
            ffmpeg=args.ffmpeg,
            source=source,
            output=clip,
            duration=duration,
            crop=(2400, 1340, 200, 200) if index == 1 else None,
            zoom=1.06 if index == 1 else 1.025,
            center=(0.35, 0.43) if index == 1 else (0.5, 0.48),
        )
        cert_visual_parts.append(clip)
    cert_visual = section_dir / "03-certifications-visual.mp4"
    concat_copy(args.ffmpeg, cert_visual_parts, cert_visual)
    cert_voice = section_dir / "03-certifications-voice.mp4"
    attach_voice(
        ffmpeg=args.ffmpeg,
        visual=cert_visual,
        voice=voices["VO02"],
        output=cert_voice,
        duration=cert_remaining,
        voice_start=cert_voice_start,
    )
    cert_combined = section_dir / "03-certifications.mp4"
    concat_copy(args.ffmpeg, [cert_intro, cert_voice], cert_combined)
    add_section(
        "certifications",
        cert_combined,
        [
            (0.15, 3.8, "Before evaluating other people, I wanted to understand"),
            (3.8, 7.1, "the protocol responsibly."),
            (7.2, 13.2, "I completed FMS Level 1 and Level 2 training and earned both certifications."),
            (13.2, 18.8, "The training gave me a structured foundation for setting up the seven screens,"),
            (18.8, 23.35, "applying the scoring rules, and recognizing when a result requires further human attention."),
        ],
    )

    evaluator_sources = [
        ("evaluator-broll/VID20260823132920.mp4", 4.0, 4.0),
        ("evaluator-broll/VID20260823133352.mp4", 1.0, 8.0),
        ("evaluator-broll/VID20260823134038.mp4", 2.0, 5.5),
        ("evaluator-broll/VID20260823134454.mp4", 4.0, 6.21),
    ]
    vo03_duration = probe_duration(voices["VO03"], args.ffprobe)
    evaluator_clips = []
    for index, (relative, start, duration) in enumerate(evaluator_sources, start=1):
        clip = clip_dir / f"evaluator-{index:02d}.mp4"
        render_muted(
            ffmpeg=args.ffmpeg,
            source=practice / relative,
            output=clip,
            start=start,
            end=start + duration,
            duration=duration,
        )
        evaluator_clips.append(clip)
    evaluator_visual = section_dir / "04-practice-visual.mp4"
    concat_copy(args.ffmpeg, evaluator_clips, evaluator_visual)
    evaluator = section_dir / "04-practice.mp4"
    attach_voice(
        ffmpeg=args.ffmpeg,
        visual=evaluator_visual,
        voice=voices["VO03"],
        output=evaluator,
        duration=vo03_duration,
    )
    add_section(
        "practice",
        evaluator,
        [
            (0.0, 6.2, "After the training, I began conducting and reviewing FMS assessments."),
            (6.2, 8.35, "I saw four practical limitations."),
            (8.35, 10.1, "Movements pass quickly."),
            (10.1, 13.55, "Remote review makes repetitions slow to find."),
            (13.55, 18.65, "Visual judgment remains qualitative even when angles and trajectories matter,"),
            (18.65, 23.6, "and the zero-to-three score preserves little of the evidence behind the decision."),
        ],
    )

    a02 = section_dir / "05-A02-transition.mp4"
    render_live(
        ffmpeg=args.ffmpeg,
        source=a_roll / "transition/VID20260823140338.mp4",
        output=a02,
        start=2.2,
        end=6.2,
    )
    add_section(
        "A02-transition",
        a02,
        [(0.25, 3.85, "Those problems became the starting point for AI-FMS.")],
    )

    workbench = screen / "S01-S03-workbench-master-v2.mp4"
    screen_specs = {
        "VO04": [
            (0.0, 5.4, 1.0, (0.5, 0.5)),
            (5.4, 12.4, 1.30, (0.22, 0.54)),
            (15.0, 18.1, 1.20, (0.50, 0.35)),
            (21.0, 27.1, 1.26, (0.82, 0.38)),
        ],
        "VO05": [
            (28.0, 38.0, 1.28, (0.50, 0.65)),
            (38.0, 45.8, 1.20, (0.50, 0.35)),
            (45.8, 52.2, 1.30, (0.52, 0.66)),
        ],
        "VO06": [
            (52.0, 64.5, 1.30, (0.82, 0.38)),
            (65.0, 68.0, 1.25, (0.51, 0.62)),
            (73.0, 77.0, 1.32, (0.82, 0.63)),
        ],
    }
    screen_cues = {
        "VO04": [
            (0.0, 5.45, "AI-FMS is an explainable, human-in-the-loop video-review system."),
            (5.45, 12.4, "The workbench supports all seven FMS movements, with repetition-level review"),
            (12.4, 15.5, "and a movement-specific, pose-based first-pass suggestion."),
            (15.5, 21.55, "The AI can explain its evidence and abstain when video quality or protocol information is incomplete."),
        ],
        "VO05": [
            (0.0, 10.1, "A reviewer can isolate complete repetitions, replay a difficult moment, and correct the timing"),
            (10.1, 15.8, "instead of searching through the full video again. The MediaPipe overlay is aligned to the video,"),
            (15.8, 24.15, "allowing the system to preserve angles, normalized distances, trajectories, and movement events that are hard to record consistently by eye."),
        ],
        "VO06": [
            (0.0, 4.9, "The AI suggestion supports, rather than replaces, reviewer judgment."),
            (4.9, 10.55, "It shows which criteria support a score, what remains uncertain,"),
            (10.55, 12.6, "and whether protocol information is missing."),
            (12.6, 18.9, "The reviewer records the final score, confidence, camera view, side, clearing information,"),
            (18.9, 19.5, "and notes."),
        ],
    }
    for voice_id in ("VO04", "VO05", "VO06"):
        pieces = []
        for index, (start, end, zoom, center) in enumerate(
            screen_specs[voice_id], start=1
        ):
            piece = clip_dir / f"{voice_id.lower()}-screen-{index:02d}.mp4"
            render_screen_excerpt(
                ffmpeg=args.ffmpeg,
                source=workbench,
                output=piece,
                start=start,
                end=end,
                zoom=zoom,
                center=center,
            )
            pieces.append(piece)
        visual = section_dir / f"{voice_id.lower()}-visual.mp4"
        concat_copy(args.ffmpeg, pieces, visual)
        duration = probe_duration(voices[voice_id], args.ffprobe)
        section = section_dir / f"{voice_id.lower()}.mp4"
        attach_voice(
            ffmpeg=args.ffmpeg,
            visual=visual,
            voice=voices[voice_id],
            output=section,
            duration=duration,
        )
        add_section(voice_id.lower(), section, screen_cues[voice_id])

    study_source = screen / "S04-study-mode-master-v2.mp4"
    vo07_duration = probe_duration(voices["VO07"], args.ffprobe)
    study_visual = section_dir / "09-study-mode-visual.mp4"
    render_screen_excerpt(
        ffmpeg=args.ffmpeg,
        source=study_source,
        output=study_visual,
        start=2.2,
        end=2.2 + vo07_duration,
        zoom=1.24,
        center=(0.80, 0.52),
    )
    study = section_dir / "09-study-mode.mp4"
    attach_voice(
        ffmpeg=args.ffmpeg,
        visual=study_visual,
        voice=voices["VO07"],
        output=study,
        duration=vo07_duration,
    )
    add_section(
        "study-mode",
        study,
        [
            (0.0, 6.45, "To evaluate the system without leaking AI information, we built a separate Study Mode."),
            (6.45, 12.7, "In both blinded rounds, reviewers could not see AI scores, pose parameters, source file names,"),
            (12.7, 17.9, "previous answers, or the other reviewer's decisions."),
            (17.9, 22.95, "Reviews were stored as append-only events and exported with checksums."),
        ],
    )

    result_durations = [5.444, 6.667, 7.667, 7.037, 5.833]
    result_sources = [
        graphics / "rendered/G01-01-canonical-pool.png",
        graphics / "rendered/G01-02-blind-study.png",
        graphics / "rendered/G01-03-human-agreement.png",
        graphics / "rendered/G01-04-locked-ai.png",
        graphics / "rendered/G01-05-boundary.png",
    ]
    result_centers = [(0.53, 0.60), (0.42, 0.60), (0.25, 0.60), (0.54, 0.61), (0.50, 0.50)]
    result_clips = []
    for index, (source, duration, center) in enumerate(
        zip(result_sources, result_durations, result_centers), start=1
    ):
        clip = clip_dir / f"result-{index:02d}.mp4"
        render_still(
            ffmpeg=args.ffmpeg,
            source=source,
            output=clip,
            duration=duration,
            zoom=1.07,
            center=center,
        )
        result_clips.append(clip)
    results_visual = section_dir / "10-results-visual.mp4"
    concat_copy(args.ffmpeg, result_clips, results_visual)
    vo08_duration = probe_duration(voices["VO08"], args.ffprobe)
    results = section_dir / "10-results.mp4"
    attach_voice(
        ffmpeg=args.ffmpeg,
        visual=results_visual,
        voice=voices["VO08"],
        output=results,
        duration=vo08_duration,
    )
    add_section(
        "phase-i-results",
        results,
        [
            (0.0, 5.4, "Phase I reconstructed 110 repetitions from 28 source videos"),
            (5.4, 12.1, "and selected 32 across four movements for two blinded rounds."),
            (12.1, 19.8, "In Round B, the reviewers agreed on scoreability for all 32 items and assigned the same score to all 26 jointly scoreable items."),
            (19.8, 26.85, "The locked AI exactly matched human consensus on 16 of 25 comparable items"),
            (26.85, 32.55, "and was within one point on 23. This is an internal benchmark, not held-out clinical validation."),
        ],
    )

    finding_sources = [
        figures / "deep-squat-strategy-continuum.png",
        figures / "aslr-bilateral-repeatability.png",
        figures / "hurdle-score2-pathways.png",
        figures / "rotary-cycle-event-matrix.png",
    ]
    vo09_duration = probe_duration(voices["VO09"], args.ffprobe)
    finding_duration = vo09_duration / len(finding_sources)
    finding_clips = []
    finding_centers = [(0.54, 0.56), (0.52, 0.56), (0.56, 0.56), (0.52, 0.56)]
    for index, (source, center) in enumerate(
        zip(finding_sources, finding_centers), start=1
    ):
        clip = clip_dir / f"finding-{index:02d}.mp4"
        render_still(
            ffmpeg=args.ffmpeg,
            source=source,
            output=clip,
            duration=finding_duration,
            zoom=1.08,
            center=center,
        )
        finding_clips.append(clip)
    finding_visual = section_dir / "11-findings-visual.mp4"
    concat_copy(args.ffmpeg, finding_clips, finding_visual)
    findings = section_dir / "11-findings.mp4"
    attach_voice(
        ffmpeg=args.ffmpeg,
        visual=finding_visual,
        voice=voices["VO09"],
        output=findings,
        duration=vo09_duration,
    )
    add_section(
        "research-findings",
        findings,
        [
            (0.0, 5.9, "The quantitative evidence also revealed what the ordinal score does not show. Deep Squat formed a strategy continuum;"),
            (5.9, 12.0, "ASLR preserved side and repeatability differences;"),
            (12.0, 18.0, "Hurdle Step showed several pathways to the same score;"),
            (18.0, 23.95, "and Rotary Stability required a full-cycle view of coordination and event sequence."),
        ],
    )

    closing_source = a_roll / "closing/VID20260823141858.mp4"
    closing_parts = []
    closing_intro = clip_dir / "closing-intro.mp4"
    render_muted(
        ffmpeg=args.ffmpeg,
        source=closing_source,
        output=closing_intro,
        start=0.0,
        end=2.4,
        duration=2.4,
    )
    closing_parts.append(closing_intro)
    closing_first = clip_dir / "closing-first.mp4"
    render_live(
        ffmpeg=args.ffmpeg,
        source=closing_source,
        output=closing_first,
        start=9.52,
        end=33.7,
        speed=1.05,
    )
    closing_parts.append(closing_first)
    closing_final = clip_dir / "closing-final.mp4"
    render_live(
        ffmpeg=args.ffmpeg,
        source=closing_source,
        output=closing_final,
        start=54.8,
        end=65.96,
        speed=1.0,
    )
    closing_parts.append(closing_final)
    closing = section_dir / "12-closing.mp4"
    concat_copy(args.ffmpeg, closing_parts, closing)
    add_section(
        "A03-closing",
        closing,
        [
            (2.4, 7.9, "I learned the FMS protocol, completed the blinded reviews, and helped shape the study design"),
            (7.9, 12.45, "and interpret both the useful evidence and the system's failures."),
            (12.45, 18.15, "I worked through an AI-assisted development process, but the project taught me that responsible technology"),
            (18.15, 23.4, "depends on human judgment, data quality, and the willingness to say when the evidence is not enough."),
            (25.45, 31.35, "For me, AI-FMS is not the end of a project."),
            (31.35, 36.5, "It is the beginning of a research direction I want to keep pursuing."),
        ],
    )

    end_card = section_dir / "13-end-card.mp4"
    render_still(
        ffmpeg=args.ffmpeg,
        source=graphics / "rendered/G06-end-card.png",
        output=end_card,
        duration=4.0,
        zoom=1.02,
    )
    add_section("end-card", end_card, [])

    master_speech = work_dir / "master-v2-speech.mp4"
    duration = concat_crossfade(
        ffmpeg=args.ffmpeg,
        ffprobe=args.ffprobe,
        sources=[section["file"] for section in sections],
        output=master_speech,
    )
    mix_music(
        ffmpeg=args.ffmpeg,
        source=master_speech,
        output=args.output.resolve(),
        duration=duration,
    )

    cursor = 0.0
    all_cues = []
    section_rows = []
    for index, section in enumerate(sections):
        section_duration = probe_duration(section["file"], args.ffprobe)
        start = cursor
        end = start + section_duration
        for cue_start, cue_end, text in section["cues"]:
            all_cues.append((start + cue_start, start + cue_end, text))
        section_rows.append(
            {
                "label": section["label"],
                "file": str(section["file"].relative_to(REPO_ROOT)),
                "startSecond": round(start, 3),
                "durationSecond": round(section_duration, 3),
                "endSecond": round(end, 3),
            }
        )
        cursor = end - (FADE_SECOND if index < len(sections) - 1 else 0.0)

    all_cues.sort(key=lambda cue: cue[0])
    cleaned_cues = []
    for index, (start, end, text) in enumerate(all_cues):
        if index + 1 < len(all_cues):
            next_start = all_cues[index + 1][0]
            end = min(end, max(start + 0.05, next_start - 0.02))
        cleaned_cues.append((start, end, text))

    srt_path = args.output.resolve().with_suffix(".srt")
    srt_path.write_text(
        "\n".join(
            f"{index}\n{srt_time(start)} --> {srt_time(end)}\n{text}\n"
            for index, (start, end, text) in enumerate(cleaned_cues, start=1)
        ),
        encoding="utf-8",
    )
    manifest = {
        "schemaVersion": "ai_fms_application_film_review_cut_v2",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "durationSecond": round(probe_duration(args.output.resolve(), args.ffprobe), 3),
        "target": "approximately 4:30 with natural local pacing",
        "music": "Apple Loop: Slow Drift Ambient Synth, mixed under narration",
        "subtitles": str(srt_path.relative_to(REPO_ROOT)),
        "output": str(args.output.resolve().relative_to(REPO_ROOT)),
        "sections": section_rows,
    }
    (work_dir / "review-cut-v2-manifest.json").write_text(
        json.dumps(manifest, indent=2), encoding="utf-8"
    )
    return manifest


def main() -> int:
    args = parse_args()
    manifest = build(args)
    print(json.dumps(manifest, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
