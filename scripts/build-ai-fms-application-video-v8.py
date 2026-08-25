#!/usr/bin/env python3
"""Build the eighth AI-FMS application-film review cut from approved sources."""

from __future__ import annotations

import argparse
import importlib.util
import json
import math
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
FONT_REGULAR_ZH = Path("/System/Library/Fonts/STHeiti Light.ttc")
FONT_BOLD_ZH = Path("/System/Library/Fonts/STHeiti Medium.ttc")
FADE_SECOND = 0.20
SYSTEM_SPEED = 1.04
SECTION_TAIL = 0.14
EXACT_DURATION = 270.0
OUTPUT_LANGUAGE = "en"

ZH_TEXT = {
    "Hi, I'm Ronnie. Years of swimming taught me to notice how small differences in movement": "大家好，我是 Ronnie。多年的游泳训练让我开始留意：动作中的细微差异",
    "can affect control, efficiency, and performance.": "会怎样影响控制、效率和运动表现。",
    "That curiosity led me to study the Functional Movement Screen, and eventually to build AI-FMS.": "这份好奇心促使我学习功能性动作筛查 FMS，并最终开发了 AI-FMS。",
    "FMS stands for Functional Movement Screen.": "FMS 的全称是 Functional Movement Screen，即功能性动作筛查。",
    "It is a standardized screening system that uses seven fundamental movement patterns": "它是一套标准化筛查系统，通过七种基础动作模式，",
    "to observe how mobility, stability, symmetry, and motor control work together.": "观察灵活性、稳定性、对称性和运动控制如何共同发挥作用。",
    "Each pattern is scored from zero to three.": "每个动作的评分为 0 到 3 分。",
    "It is a movement screen, not a medical diagnosis.": "它是动作筛查，而不是医学诊断。",
    "Before evaluating other people, I wanted to understand": "在为其他人进行评估之前，我希望先以负责任的方式",
    "the protocol responsibly.": "掌握完整规范。",
    "I completed FMS Level 1 and Level 2 training and earned both certifications.": "我完成了 FMS 一级和二级培训，并取得了两项认证。",
    "The training gave me a structured foundation for setting up the seven screens,": "培训为我规范设置七项筛查建立了系统基础，",
    "applying the scoring rules, and recognizing when a result requires further human attention.": "也让我学会应用评分规则，并识别哪些结果需要进一步人工关注。",
    "After the training, I began conducting and reviewing FMS assessments.": "完成培训后，我开始实际进行并复核 FMS 评估。",
    "I saw four practical limitations.": "我发现了四个实际问题。",
    "Movements pass quickly.": "动作往往一闪而过。",
    "Remote review makes repetitions slow to find.": "远程复核时，寻找每次动作会很耗时。",
    "Visual judgment remains qualitative even when angles and trajectories matter,": "即使角度和轨迹很重要，人眼判断仍主要是定性的；",
    "and the zero-to-three score preserves little of the evidence behind the decision.": "而 0 到 3 分的结果，也很少保留判分背后的证据。",
    "Those problems became the starting point for AI-FMS.": "这些问题成为 AI-FMS 的出发点。",
    "AI-FMS is an explainable, human-in-the-loop video-review system.": "AI-FMS 是一套可解释、由人工参与决策的视频评审系统。",
    "The workbench supports all seven FMS movements, with repetition-level review": "工作台覆盖全部七项 FMS 动作，可逐次复核每个动作，",
    "and a movement-specific, pose-based first-pass suggestion.": "并针对不同动作提供基于姿态的初步 AI 建议。",
    "The AI can explain its evidence and abstain when video quality or protocol information is incomplete.": "当视频质量或规范信息不足时，AI 会解释证据，也可以拒绝给分。",
    "A reviewer can isolate complete repetitions, replay a difficult moment, and correct the timing": "评审者可以分离完整动作、反复回看困难时刻并修正时间边界，",
    "instead of searching through the full video again. The MediaPipe overlay is aligned to the video,": "不必重新搜索整段视频。MediaPipe 姿态图层与视频逐帧对齐，",
    "allowing the system to preserve angles, normalized distances, trajectories, and movement events that are hard to record consistently by eye.": "从而保存肉眼难以稳定记录的角度、归一化距离、轨迹和动作事件。",
    "The AI suggestion supports, rather than replaces, reviewer judgment.": "AI 建议用于辅助，而不是取代评审者的判断。",
    "It shows which criteria support a score, what remains uncertain,": "它会说明哪些标准支持当前分数、哪些地方仍不确定，",
    "and whether protocol information is missing.": "以及是否缺少规范信息。",
    "The reviewer records the final score, confidence, camera view, side, clearing information,": "评审者最终记录分数、信心、机位、侧别、排除性检查信息",
    "and notes.": "和备注。",
    "To evaluate the system without leaking AI information, we built a separate Study Mode.": "为了在不泄露 AI 信息的前提下评估系统，我们另建了盲评模式。",
    "In both blinded rounds, reviewers could not see AI scores, pose parameters, source file names,": "两轮盲评中，评审者都看不到 AI 分数、姿态参数、原始文件名，",
    "previous answers, or the other reviewer's decisions.": "之前的答案或另一位评审者的判断。",
    "Reviews were stored as append-only events and exported with checksums.": "所有评审以只追加事件保存，并通过校验和导出。",
    "Phase I reconstructed 110 repetitions from 28 source videos": "第一阶段从 28 个原始视频中重建了 110 次动作重复，",
    "and selected 32 across four movements for two blinded rounds.": "并从四个动作中选出 32 次，进行两轮盲评。",
    "In Round B, the reviewers agreed on scoreability for all 32 items and assigned the same score to all 26 jointly scoreable items.": "在 B 轮中，32 项的可评分性判断全部一致；26 项共同可评分动作也全部同分。",
    "The locked AI exactly matched human consensus on 16 of 25 comparable items": "在 25 项可比较样本中，锁定版 AI 有 16 项与人工共识完全一致，",
    "and was within one point on 23. This is an internal benchmark, not held-out clinical validation.": "其中 23 项分差不超过 1 分。这是内部基准，并非独立临床验证。",
    "The quantitative evidence also revealed what the ordinal score does not show. Deep Squat formed a strategy continuum;": "定量证据还揭示了等级分数看不到的信息：深蹲呈现出动作策略的连续变化；",
    "ASLR preserved side and repeatability differences;": "主动直腿抬高保留了左右侧和重复稳定性的差异；",
    "Hurdle Step showed several pathways to the same score;": "跨栏步显示，同一个分数可能由不同动作路径造成；",
    "and Rotary Stability required a full-cycle view of coordination and event sequence.": "旋转稳定性则需要观察完整周期中的协调与事件顺序。",
    "My role in this project grew far beyond demonstrating a piece of software.": "我在这个项目中的角色，早已超出单纯展示一款软件。",
    "I worked through an AI-assisted development process, but the project taught me that responsible technology": "我经历了 AI 辅助的开发过程，但这个项目让我认识到：负责任的技术",
    "depends on human judgment, data quality, and the willingness to say when the evidence is not enough.": "离不开人的判断、数据质量，以及在证据不足时坦诚说“不”。",
    "In college, I hope to continue exploring Human Movement Science, biomechanics, and responsible AI.": "进入大学后，我希望继续探索人体运动科学、生物力学和负责任的 AI。",
    "For me, AI-FMS is not the end of a project.": "对我来说，AI-FMS 不是一个项目的终点，",
    "It is the beginning of a research direction I want to keep pursuing.": "而是我希望继续研究的一个方向的起点。",
    "Deep Squat": "深蹲",
    "Hurdle Step": "跨栏步",
    "In-Line Lunge": "直线弓箭步",
    "Shoulder Mobility": "肩部灵活性",
    "Active Straight Leg Raise": "主动直腿抬高",
    "Trunk Stability Push-Up": "躯干稳定俯卧撑",
    "Rotary Stability": "旋转稳定性",
    "Equipment setup": "器材设置",
    "Coaching": "动作指导",
    "Protocol measurement": "规范测量",
    "Movement measurement": "动作测量",
    "Reviewing an attempt": "回看一次动作",
    "Explainable movement review": "可解释的动作评估",
    "FMS RAW SCORE": "FMS 原始评分",
    "Performs the movement pattern": "完成标准动作模式",
    "Completes with compensation": "通过代偿完成动作",
    "Unable to complete the pattern": "无法完成动作模式",
    "Pain reported or observed": "出现或报告疼痛",
    "DATA FOUNDATION": "数据基础",
    "source videos                 canonical repetitions": "原始视频　　　　　　　标准化动作重复",
    "BLINDED HUMAN REVIEW": "双盲人工评审",
    "formal repetitions   ·   4 movements   ·   2 rounds": "正式动作重复　·　4 个动作　·　2 轮评审",
    "HUMAN RELIABILITY": "人工评审一致性",
    "exact RAW SCORE agreement among jointly scoreable repetitions": "共同可评分动作的原始分完全一致",
    "LOCKED AI vs HUMAN CONSENSUS": "锁定版 AI 与人工共识",
    "exact agreement": "完全一致",
    "EVIDENCE BOUNDARY": "证据边界",
    "within one point": "分差不超过 1 分",
    "AI-FMS PHASE I": "AI-FMS 第一阶段",
    "From movement video to traceable evidence": "从动作视频到可追溯证据",
    "INTERNAL BENCHMARK": "内部基准测试",
    "Not held-out clinical validation": "非独立临床验证",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    default_work_dir = PRODUCTION / "07-edit-project/rough-cut-v8"
    default_output = (
        PRODUCTION / "08-exports/ai-fms-application-film-master-review-v8.mp4"
    )
    default_exact_output = (
        PRODUCTION / "08-exports/ai-fms-application-film-master-4m30-v8.mp4"
    )
    parser.add_argument(
        "--work-dir",
        type=Path,
        default=default_work_dir,
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=default_output,
    )
    parser.add_argument(
        "--exact-output",
        type=Path,
        default=default_exact_output,
    )
    parser.add_argument("--language", choices=("en", "zh"), default="en")
    parser.add_argument(
        "--card",
        type=Path,
        help="Optional opening/end card override; defaults to G06-end-card.png.",
    )
    parser.add_argument("--ffmpeg", default="ffmpeg")
    parser.add_argument("--ffprobe", default="ffprobe")
    args = parser.parse_args()
    if args.language == "zh":
        if args.work_dir == default_work_dir:
            args.work_dir = PRODUCTION / "07-edit-project/rough-cut-v8-zh"
        if args.output == default_output:
            args.output = (
                PRODUCTION
                / "08-exports/ai-fms-application-film-master-review-v8-zh.mp4"
            )
        if args.exact_output == default_exact_output:
            args.exact_output = (
                PRODUCTION
                / "08-exports/ai-fms-application-film-master-4m30-v8-zh.mp4"
            )
    return args


def localize(text: str) -> str:
    return ZH_TEXT.get(text, text) if OUTPUT_LANGUAGE == "zh" else text


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


def live_voice_filter(speed: float = 1.0) -> str:
    filters = [
        "asetpts=PTS-STARTPTS",
        "highpass=f=75",
        "lowpass=f=15500",
    ]
    if abs(speed - 1.0) > 0.0001:
        filters.append(f"atempo={speed:.5f}")
    filters.extend(
        [
            "afftdn=nr=6:nf=-42:tn=1:gs=5",
            "equalizer=f=250:t=q:w=1.1:g=-1.3",
            "equalizer=f=3400:t=q:w=1.0:g=1.2",
            "acompressor=threshold=0.15:ratio=2.2:attack=16:release=150:makeup=1.28",
            "loudnorm=I=-16:TP=-1.5:LRA=6",
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
    fade_video: bool = False,
) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    duration = (end - start) / speed
    live_video_filter = video_base_filter(speed)
    if fade_video:
        live_video_filter += (
            f",fade=t=in:st=0:d=0.22,"
            f"fade=t=out:st={max(0.0, duration - 0.22):.3f}:d=0.22"
        )
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
                f"[0:v]{live_video_filter}[base];"
                f"[base][1:v]overlay=0:0{enable}[v]",
                "-map",
                "[v]",
                "-map",
                "0:a:0",
            ]
        )
    else:
        command.extend(
            ["-vf", live_video_filter, "-map", "0:v:0", "-map", "0:a:0"]
        )
    command.extend(
        [
            "-af",
            live_voice_filter(speed),
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


def render_direct_av_sequence(
    *,
    ffmpeg: str,
    source: Path,
    output: Path,
    ranges: list[tuple[float, float]],
) -> None:
    """Cut complete source A/V clips, then concatenate without track realignment."""

    part_dir = output.parent / f"{output.stem}-direct-parts"
    part_dir.mkdir(parents=True, exist_ok=True)
    parts = []
    for index, (start, end) in enumerate(ranges):
        duration = end - start
        part = part_dir / f"part-{index + 1:02d}.mp4"
        fade_filters = [video_base_filter(), "setpts=PTS-STARTPTS"]
        if index > 0:
            fade_filters.append("fade=t=in:st=0:d=0.08")
        if index + 1 < len(ranges):
            fade_filters.append(
                f"fade=t=out:st={max(0.0, duration - 0.08):.3f}:d=0.08"
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
                "-vf",
                ",".join(fade_filters),
                "-map",
                "0:v:0",
                "-map",
                "0:a:0",
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
                str(part),
            ]
        )
        parts.append(part)
    concat_copy(ffmpeg, parts, output)


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
    speed: float = 1.0,
) -> None:
    source_duration = end - start
    duration = source_duration / speed
    filters = ["fps=30", "setsar=1"]
    if abs(speed - 1.0) > 0.0001:
        filters.append(f"setpts=PTS/{speed:.5f}")
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
            f"{source_duration:.3f}",
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
    section_starts = [0.0]
    current_duration = durations[0]
    for duration in durations[1:]:
        section_starts.append(current_duration - FADE_SECOND)
        current_duration += duration - FADE_SECOND

    command = [ffmpeg, "-y"]
    for source in sources:
        command.extend(["-i", str(source)])
    filters = []
    for index, duration in enumerate(durations):
        filters.append(
            f"[{index}:v]setpts=PTS-STARTPTS,settb=AVTB,fps=30,"
            f"tpad=stop_mode=clone:stop_duration=0.25,"
            f"trim=duration={duration:.6f},setpts=PTS-STARTPTS,"
            f"format=yuv420p[v{index}]"
        )
        audio_filters = [
            "asetpts=PTS-STARTPTS",
            "aresample=48000",
            f"apad=whole_dur={duration:.6f}",
            f"atrim=0:{duration:.6f}",
            "asetpts=PTS-STARTPTS",
        ]
        if index > 0:
            audio_filters.append(f"afade=t=in:st=0:d={FADE_SECOND:.3f}")
        if index + 1 < len(sources):
            audio_filters.append(
                f"afade=t=out:st={max(0.0, duration - FADE_SECOND):.6f}:"
                f"d={FADE_SECOND:.3f}"
            )
        delay_ms = round(section_starts[index] * 1000)
        if delay_ms:
            audio_filters.append(f"adelay=delays={delay_ms}:all=1")
        filters.append(
            f"[{index}:a]{','.join(audio_filters)}[a{index}]"
        )
    video_label = "v0"
    for index in range(1, len(sources)):
        next_video = f"vx{index}"
        offset = section_starts[index]
        filters.append(
            f"[{video_label}][v{index}]xfade=transition=fade:duration={FADE_SECOND}:"
            f"offset={offset:.6f}[{next_video}]"
        )
        video_label = next_video
    filters.append(
        "".join(f"[a{index}]" for index in range(len(sources)))
        + f"amix=inputs={len(sources)}:duration=longest:normalize=0,"
        + f"apad=whole_dur={current_duration:.6f},"
        + f"atrim=0:{current_duration:.6f}[audio]"
    )
    command.extend(
        [
            "-filter_complex",
            ";".join(filters),
            "-map",
            f"[{video_label}]",
            "-map",
            "[audio]",
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


def pad_section_tail(
    *, ffmpeg: str, ffprobe: str, source: Path, output: Path
) -> None:
    duration = probe_duration(source, ffprobe)
    padded_duration = duration + SECTION_TAIL
    run(
        [
            ffmpeg,
            "-y",
            "-i",
            str(source),
            "-vf",
            f"tpad=stop_mode=clone:stop_duration={SECTION_TAIL:.3f}",
            "-af",
            f"apad=pad_dur={SECTION_TAIL:.3f}",
            "-t",
            f"{padded_duration:.3f}",
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


def fit_font(text: str, bold: bool, size: int) -> ImageFont.FreeTypeFont:
    if OUTPUT_LANGUAGE == "zh":
        font_path = FONT_BOLD_ZH if bold else FONT_REGULAR_ZH
    else:
        font_path = FONT_BOLD if bold else FONT_REGULAR
    return ImageFont.truetype(str(font_path), size)


def create_title_overlay(path: Path) -> None:
    image = Image.new("RGBA", (1920, 1080), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((70, 58, 640, 192), radius=8, fill=(15, 30, 35, 218))
    draw.rectangle((70, 58, 82, 192), fill=(232, 180, 79, 255))
    draw.text((112, 78), "AI-FMS", font=fit_font("", True, 46), fill="white")
    draw.text(
        (112, 137),
        localize("Explainable movement review"),
        font=fit_font("", False, 25),
        fill=(220, 232, 230, 255),
    )
    image.save(path)


def create_movement_overlay(path: Path, text: str) -> None:
    text = localize(text)
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


def create_score_scale_overlay(path: Path) -> None:
    image = Image.new("RGBA", (1920, 1080), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    x1, y1, x2, y2 = 1250, 72, 1848, 456
    draw.rounded_rectangle(
        (x1, y1, x2, y2), radius=10, fill=(15, 30, 35, 230), outline=(232, 180, 79, 255), width=4
    )
    draw.text(
        (x1 + 28, y1 + 22),
        localize("FMS RAW SCORE"),
        font=fit_font("", True, 31),
        fill="white",
    )
    rows = [
        ("3", localize("Performs the movement pattern")),
        ("2", localize("Completes with compensation")),
        ("1", localize("Unable to complete the pattern")),
        ("0", localize("Pain reported or observed")),
    ]
    for index, (score, meaning) in enumerate(rows):
        y = y1 + 85 + index * 70
        draw.ellipse((x1 + 28, y, x1 + 78, y + 50), fill=(30, 122, 111, 255))
        draw.text((x1 + 53, y + 25), score, font=fit_font("", True, 27), fill="white", anchor="mm")
        draw.text((x1 + 98, y + 12), meaning, font=fit_font("", False, 24), fill=(236, 241, 239, 255))
    image.save(path)


def apply_timed_overlay(
    *,
    ffmpeg: str,
    source: Path,
    overlay: Path,
    output: Path,
    duration: float,
    start: float,
    end: float,
) -> None:
    run(
        [
            ffmpeg,
            "-y",
            "-i",
            str(source),
            "-loop",
            "1",
            "-i",
            str(overlay),
            "-filter_complex",
            f"[1:v]format=rgba,fade=t=in:st={start:.3f}:d=0.25:alpha=1,"
            f"fade=t=out:st={max(start, end - 0.25):.3f}:d=0.25:alpha=1[pip];"
            f"[0:v][pip]overlay=0:0:enable='between(t,{start:.3f},{end:.3f})':shortest=1[v]",
            "-map",
            "[v]",
            "-map",
            "0:a:0",
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
            "copy",
            "-movflags",
            "+faststart",
            str(output),
        ]
    )


def create_caption_overlay(path: Path, text: str) -> None:
    image = Image.new("RGBA", (1920, 1080), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    font_size = 42 if OUTPUT_LANGUAGE == "zh" else 31
    wrap_width = 27 if OUTPUT_LANGUAGE == "zh" else 102
    font = fit_font(text, False, font_size)
    wrapped = textwrap.wrap(
        text,
        width=wrap_width,
        break_long_words=OUTPUT_LANGUAGE == "zh",
        break_on_hyphens=False,
    )
    wrapped = wrapped[:2]
    lines = "\n".join(wrapped)
    bbox = draw.multiline_textbbox((0, 0), lines, font=font, spacing=10, align="center")
    width = bbox[2] - bbox[0]
    height = bbox[3] - bbox[1]
    x1 = max(90, (1920 - width) // 2 - 36)
    x2 = min(1830, (1920 + width) // 2 + 36)
    y2 = 1064
    y1 = y2 - height - 22
    draw.rounded_rectangle((x1, y1, x2, y2), radius=5, fill=(8, 16, 20, 118))
    draw.multiline_text(
        (960, y1 + 9),
        lines,
        font=font,
        fill="white",
        anchor="ma",
        spacing=10,
        align="center",
        stroke_width=1,
        stroke_fill=(0, 0, 0, 145),
    )
    image.save(path)


def create_annotation_overlay(
    path: Path, shapes: list[tuple[str, tuple[int, ...]]]
) -> None:
    image = Image.new("RGBA", (1920, 1080), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    gold = (213, 126, 16, 235)
    for kind, values in shapes:
        if kind == "ellipse":
            draw.ellipse(values, outline=gold, width=8)
        elif kind == "line":
            draw.line(values, fill=gold, width=9, joint="curve")
        elif kind == "underline":
            x1, y, x2 = values
            draw.line((x1, y, x2, y), fill=gold, width=9)
            draw.ellipse((x1 - 5, y - 5, x1 + 5, y + 5), fill=gold)
            draw.ellipse((x2 - 5, y - 5, x2 + 5, y + 5), fill=gold)
    image.save(path)


def apply_annotation(
    *,
    ffmpeg: str,
    source: Path,
    overlay: Path,
    output: Path,
    duration: float,
    reveal_second: float = 0.8,
) -> None:
    run(
        [
            ffmpeg,
            "-y",
            "-i",
            str(source),
            "-loop",
            "1",
            "-i",
            str(overlay),
            "-filter_complex",
            f"[1:v]format=rgba,fade=t=in:st={reveal_second:.3f}:d=0.35:alpha=1[mark];"
            f"[0:v][mark]overlay=0:0:shortest=1[v]",
            "-map",
            "[v]",
            "-map",
            "0:a:0",
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
            "copy",
            "-movflags",
            "+faststart",
            str(output),
        ]
    )


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


def smoothstep(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return value * value * (3.0 - 2.0 * value)


def render_results_animation(
    *, ffmpeg: str, output: Path, duration: float
) -> None:
    width, height, fps = 1920, 1080, 30
    stages = [
        {
            "start": 0.0,
            "end": 5.45,
            "title": localize("DATA FOUNDATION"),
            "main": "28  →  110",
            "detail": localize(
                "source videos                 canonical repetitions"
            ),
            "accent": (46, 166, 148),
        },
        {
            "start": 5.45,
            "end": 12.1,
            "title": localize("BLINDED HUMAN REVIEW"),
            "main": "32",
            "detail": localize(
                "formal repetitions   ·   4 movements   ·   2 rounds"
            ),
            "accent": (232, 180, 79),
        },
        {
            "start": 12.1,
            "end": 19.8,
            "title": localize("HUMAN RELIABILITY"),
            "main": "26 / 26",
            "detail": localize(
                "exact RAW SCORE agreement among jointly scoreable repetitions"
            ),
            "accent": (46, 166, 148),
        },
        {
            "start": 19.8,
            "end": 26.85,
            "title": localize("LOCKED AI vs HUMAN CONSENSUS"),
            "main": "16 / 25",
            "detail": localize("exact agreement"),
            "accent": (215, 88, 70),
        },
        {
            "start": 26.85,
            "end": duration,
            "title": localize("EVIDENCE BOUNDARY"),
            "main": "23 / 25",
            "detail": localize("within one point"),
            "accent": (232, 180, 79),
        },
    ]
    command = [
        ffmpeg,
        "-y",
        "-f",
        "rawvideo",
        "-pix_fmt",
        "rgb24",
        "-s",
        f"{width}x{height}",
        "-r",
        str(fps),
        "-i",
        "-",
        "-f",
        "lavfi",
        "-t",
        f"{duration:.3f}",
        "-i",
        "anullsrc=r=48000:cl=stereo",
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
    process = subprocess.Popen(command, stdin=subprocess.PIPE, stderr=subprocess.PIPE)
    assert process.stdin is not None
    total_frames = math.ceil(duration * fps)
    title_font = fit_font("", True, 27)
    stage_font = fit_font("", True, 22)
    main_font = fit_font("", True, 142)
    detail_font = fit_font("", False, 32)
    boundary_font = fit_font("", True, 28)
    try:
        for frame_index in range(total_frames):
            second = frame_index / fps
            image = Image.new("RGB", (width, height), (14, 29, 35))
            draw = ImageDraw.Draw(image)
            for x in range(0, width, 120):
                draw.line((x, 0, x, height), fill=(21, 43, 49), width=1)
            for y in range(0, height, 120):
                draw.line((0, y, width, y), fill=(21, 43, 49), width=1)
            draw.text(
                (82, 58),
                localize("AI-FMS PHASE I"),
                font=title_font,
                fill=(110, 205, 191),
            )
            draw.text(
                (82, 96),
                localize("From movement video to traceable evidence"),
                font=detail_font,
                fill=(225, 233, 231),
            )

            active_index = max(
                index
                for index, stage in enumerate(stages)
                if second >= stage["start"]
            )
            line_y = 205
            draw.line((150, line_y, 1770, line_y), fill=(64, 89, 94), width=5)
            for index, stage in enumerate(stages):
                x = 170 + index * 395
                completed = index < active_index
                active = index == active_index
                color = stage["accent"] if completed or active else (73, 94, 98)
                radius = 16 if active else 11
                draw.ellipse((x - radius, line_y - radius, x + radius, line_y + radius), fill=color)
                draw.text(
                    (x, line_y + 34),
                    str(index + 1),
                    font=stage_font,
                    fill=(235, 241, 239) if active else (145, 164, 166),
                    anchor="ma",
                )

            stage = stages[active_index]
            local = second - stage["start"]
            fade_in = smoothstep(local / 0.55)
            fade_out = smoothstep(max(0.0, stage["end"] - second) / 0.45)
            opacity = min(fade_in, fade_out)
            rise = int((1.0 - smoothstep(local / 0.65)) * 34)
            count_progress = smoothstep(local / 0.85)
            if active_index == 0:
                main_text = f"{round(28 * count_progress)}  →  {round(110 * count_progress)}"
            elif active_index == 1:
                main_text = str(round(32 * count_progress))
            elif active_index == 2:
                value = round(26 * count_progress)
                main_text = f"{value} / {value}"
            elif active_index == 3:
                main_text = f"{round(16 * count_progress)} / {round(25 * count_progress)}"
            else:
                main_text = f"{round(23 * count_progress)} / {round(25 * count_progress)}"
            layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
            layer_draw = ImageDraw.Draw(layer)
            accent = (*stage["accent"], round(255 * opacity))
            white = (242, 246, 245, round(255 * opacity))
            muted = (181, 196, 197, round(255 * opacity))
            layer_draw.text((960, 320 + rise), stage["title"], font=stage_font, fill=accent, anchor="ma")
            layer_draw.text((960, 505 + rise), main_text, font=main_font, fill=white, anchor="mm")
            layer_draw.line((540, 630 + rise, 1380, 630 + rise), fill=accent, width=7)
            layer_draw.text((960, 690 + rise), stage["detail"], font=detail_font, fill=muted, anchor="ma")
            if active_index == 4:
                pulse = 0.78 + 0.22 * math.sin(second * math.pi * 1.4) ** 2
                badge_color = (*stage["accent"], round(235 * opacity * pulse))
                layer_draw.rounded_rectangle((650, 802, 1270, 904), radius=8, outline=badge_color, width=5)
                layer_draw.text(
                    (960, 853),
                    localize("INTERNAL BENCHMARK"),
                    font=boundary_font,
                    fill=white,
                    anchor="mm",
                )
                layer_draw.text(
                    (960, 948),
                    localize("Not held-out clinical validation"),
                    font=detail_font,
                    fill=muted,
                    anchor="ma",
                )
            image = Image.alpha_composite(image.convert("RGBA"), layer).convert("RGB")
            process.stdin.write(image.tobytes())
    finally:
        process.stdin.close()
    stderr = process.stderr.read().decode("utf-8", errors="replace") if process.stderr else ""
    return_code = process.wait()
    if return_code != 0:
        raise RuntimeError(f"Results animation render failed ({return_code}):\n{stderr}")


def mix_music(
    *, ffmpeg: str, source: Path, output: Path, duration: float
) -> None:
    beat = Path("/Library/Audio/Apple Loops/Apple/04 Modern RnB/Aurora Beat.caf")
    synth = Path("/Library/Audio/Apple Loops/Apple/04 Modern RnB/Digital Halo Synth.caf")
    if not beat.exists() or not synth.exists():
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
            str(beat),
            "-stream_loop",
            "-1",
            "-i",
            str(synth),
            "-filter_complex",
            f"[0:a]highpass=f=60,lowpass=f=17000[voice];"
            f"[1:a]atrim=0:{duration:.3f},asetpts=PTS-STARTPTS,"
            f"highpass=f=95,lowpass=f=8800,volume=0.038,"
            f"afade=t=in:st=0:d=2.5,afade=t=out:st={fade_out_start:.3f}:d=3[beat];"
            f"[2:a]atrim=0:{duration:.3f},asetpts=PTS-STARTPTS,"
            f"highpass=f=125,lowpass=f=8500,volume=0.042,"
            f"afade=t=in:st=0:d=2.5,afade=t=out:st={fade_out_start:.3f}:d=3[synth];"
            f"[beat][synth]amix=inputs=2:duration=longest:normalize=0[music];"
            f"[voice][music]amix=inputs=2:duration=longest:normalize=0,"
            f"loudnorm=I=-16:TP=-1.5:LRA=7,apad=whole_dur={duration:.3f}[a]",
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


def render_exact_duration(
    *,
    ffmpeg: str,
    ffprobe: str,
    source: Path,
    output: Path,
    cues: list[tuple[float, float, str]],
    target_duration: float,
) -> tuple[float, Path]:
    """Create a separately preserved, globally time-scaled delivery candidate."""

    source_duration = probe_duration(source, ffprobe)
    speed = source_duration / target_duration
    output.parent.mkdir(parents=True, exist_ok=True)
    run(
        [
            ffmpeg,
            "-y",
            "-i",
            str(source),
            "-filter_complex",
            f"[0:v]setpts=PTS/{speed:.8f},fps=30[v];"
            f"[0:a]atempo={speed:.8f},apad=whole_dur={target_duration:.3f}[a]",
            "-map",
            "[v]",
            "-map",
            "[a]",
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
            "-t",
            f"{target_duration:.3f}",
            "-movflags",
            "+faststart",
            str(output),
        ]
    )
    exact_srt = output.with_suffix(".srt")
    exact_srt.write_text(
        "\n".join(
            f"{index}\n{srt_time(start / speed)} --> {srt_time(end / speed)}\n{text}\n"
            for index, (start, end, text) in enumerate(cues, start=1)
        ),
        encoding="utf-8",
    )
    return speed, exact_srt


def srt_time(second: float) -> str:
    millisecond = round(second * 1000)
    hour, remainder = divmod(millisecond, 3_600_000)
    minute, remainder = divmod(remainder, 60_000)
    seconds, millis = divmod(remainder, 1000)
    return f"{hour:02d}:{minute:02d}:{seconds:02d},{millis:03d}"


def build(args: argparse.Namespace) -> dict:
    global OUTPUT_LANGUAGE
    OUTPUT_LANGUAGE = args.language
    work_dir = args.work_dir.resolve()
    section_dir = work_dir / "sections"
    clip_dir = work_dir / "clips"
    overlay_dir = work_dir / "overlays"
    for directory in (section_dir, clip_dir, overlay_dir, args.output.parent):
        directory.mkdir(parents=True, exist_ok=True)

    timeline = PRODUCTION / "06-audio/timeline"
    selected = PRODUCTION / "06-audio/selected"
    voices = {
        "VO01": selected / "VO01_fms-intro.wav",
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
    for voice_id in ("VO04", "VO05", "VO06", "VO07"):
        sped_voice = work_dir / f"{voice_id}-system-1.04x.wav"
        speed_audio(
            ffmpeg=args.ffmpeg,
            source=voices[voice_id],
            output=sped_voice,
            speed=SYSTEM_SPEED,
        )
        voices[voice_id] = sped_voice

    a_roll = PRODUCTION / "01-a-roll"
    practice = PRODUCTION / "02-fms-practice"
    screen = PRODUCTION / "04-screen-recordings/final"
    graphics = PRODUCTION / "05-graphics"
    card = (
        args.card.resolve()
        if args.card
        else graphics / "rendered/G06-end-card.png"
    )
    figures = REPO_ROOT / "output/publication/nhsjs/figures"

    sections: list[dict] = []

    def add_section(
        label: str,
        source: Path,
        cues: list[tuple[float, float, str]],
    ) -> None:
        cues = [(start, end, localize(text)) for start, end, text in cues]
        captioned = section_dir / f"{len(sections) + 1:02d}-{label}-captioned.mp4"
        apply_captions(
            ffmpeg=args.ffmpeg,
            source=source,
            output=captioned,
            cues=cues,
            overlay_dir=overlay_dir,
            stem=f"{len(sections) + 1:02d}-{label}",
        )
        padded = section_dir / f"{len(sections) + 1:02d}-{label}-padded.mp4"
        pad_section_tail(
            ffmpeg=args.ffmpeg,
            ffprobe=args.ffprobe,
            source=captioned,
            output=padded,
        )
        sections.append({"label": label, "file": padded, "cues": cues})

    opening_card = section_dir / "00-opening-card.mp4"
    render_still(
        ffmpeg=args.ffmpeg,
        source=card,
        output=opening_card,
        duration=1.25,
    )
    add_section("opening-card", opening_card, [])

    a01_parts = []
    a01_source = a_roll / "opening/VID20260823135332.mp4"
    for index, (start, end) in enumerate([(2.0, 12.72), (13.28, 19.24)], start=1):
        part = clip_dir / f"A01-opening-part-{index}.mp4"
        render_live(
            ffmpeg=args.ffmpeg,
            source=a01_source,
            output=part,
            start=start,
            end=end,
        )
        a01_parts.append(part)
    a01 = section_dir / "01-A01-opening.mp4"
    concat_copy(args.ffmpeg, a01_parts, a01)
    add_section(
        "A01-opening",
        a01,
        [
            (0.1, 4.5, "Hi, I'm Ronnie. Years of swimming taught me to notice how small differences in movement"),
            (4.5, 10.1, "can affect control, efficiency, and performance."),
            (10.1, 16.59, "That curiosity led me to study the Functional Movement Screen, and eventually to build AI-FMS."),
        ],
    )

    movement_sources = [
        ("Deep Squat", "seven-movements/VID20260823130739.mp4", 10.8, 13.8),
        ("Hurdle Step", "seven-movements/VID20260823131235.mp4", 5.0, 8.0),
        ("In-Line Lunge", "seven-movements/VID20260823131706.mp4", 3.2, 6.2),
        ("Shoulder Mobility", "seven-movements/VID20260823131851.mp4", 6.0, 9.0),
        ("Active Straight Leg Raise", "seven-movements/VID20260823132359.mp4", 15.0, 18.0),
        ("Trunk Stability Push-Up", "seven-movements/VID20260823132032.mp4", 9.8, 12.8),
        ("Rotary Stability", "seven-movements/VID20260823132708.mp4", 9.3, 12.3),
    ]
    vo01_duration = probe_duration(voices["VO01"], args.ffprobe)
    movement_duration = (
        vo01_duration + FADE_SECOND * (len(movement_sources) - 1)
    ) / len(movement_sources)
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
    concat_crossfade(
        ffmpeg=args.ffmpeg,
        ffprobe=args.ffprobe,
        sources=movement_clips,
        output=movement_visual,
    )
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
            (0.0, 3.38, "FMS stands for Functional Movement Screen."),
            (3.38, 8.6, "It is a standardized screening system that uses seven fundamental movement patterns"),
            (8.6, 14.56, "to observe how mobility, stability, symmetry, and motor control work together."),
            (14.56, 17.32, "Each pattern is scored from zero to three."),
            (17.32, 20.6, "It is a movement screen, not a medical diagnosis."),
        ],
    )

    cert_intro = section_dir / "03-certification-intro.mp4"
    render_live(
        ffmpeg=args.ffmpeg,
        source=a_roll / "transition/VID20260823140122.mp4",
        output=cert_intro,
        start=1.3,
        end=8.5,
        speed=1.05,
        fade_video=True,
    )
    cert_voice_start = 5.2 / 1.08
    cert_remaining = probe_duration(voices["VO02"], args.ffprobe) - cert_voice_start
    cert_part_durations = [2.7, 4.5, 4.55, cert_remaining - 11.75]
    cert_visual_parts = []
    completed_courses = (
        graphics / "fms-training-site/fms-completed-level-1-level-2.png"
    )
    cert_sources = [
        completed_courses,
        graphics
        / "fms-training-site/fms-level-1-hurdle-step-lesson-edward-approved.png",
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
            crop=(1900, 1069, 200, 220)
            if index == 1
            else None,
            zoom=1.0,
            center=(0.5, 0.5),
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
            (0.15, 3.6, "Before evaluating other people, I wanted to understand"),
            (3.6, 6.75, "the protocol responsibly."),
            (6.86, 12.86, "I completed FMS Level 1 and Level 2 training and earned both certifications."),
            (12.86, 18.46, "The training gave me a structured foundation for setting up the seven screens,"),
            (18.46, 23.0, "applying the scoring rules, and recognizing when a result requires further human attention."),
        ],
    )

    evaluator_sources = [
        ("Equipment setup", "evaluator-broll/VID20260823132920.mp4", 4.0, 4.0),
        ("Coaching", "evaluator-broll/VID20260823133614.mp4", 4.0, 3.5),
        ("Protocol measurement", "evaluator-broll/VID20260823133831.mp4", 2.5, 4.5),
        ("Movement measurement", "evaluator-broll/VID20260823134038.mp4", 2.0, 5.5),
        ("Reviewing an attempt", "evaluator-broll/VID20260823134454.mp4", 4.0, 6.21),
    ]
    vo03_duration = probe_duration(voices["VO03"], args.ffprobe)
    evaluator_clips = []
    for index, (label, relative, start, duration) in enumerate(
        evaluator_sources, start=1
    ):
        clip = clip_dir / f"evaluator-{index:02d}.mp4"
        overlay = overlay_dir / f"evaluator-{index:02d}-label.png"
        create_movement_overlay(overlay, label)
        render_muted(
            ffmpeg=args.ffmpeg,
            source=practice / relative,
            output=clip,
            start=start,
            end=start + duration,
            duration=duration,
            overlay=overlay,
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
    score_scale = overlay_dir / "fms-raw-score-scale.png"
    create_score_scale_overlay(score_scale)
    evaluator_with_score = section_dir / "04-practice-score-pip.mp4"
    apply_timed_overlay(
        ffmpeg=args.ffmpeg,
        source=evaluator,
        overlay=score_scale,
        output=evaluator_with_score,
        duration=vo03_duration,
        start=18.2,
        end=23.65,
    )
    add_section(
        "practice",
        evaluator_with_score,
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
        start=2.4,
        end=6.0,
        fade_video=True,
    )
    add_section(
        "A02-transition",
        a02,
        [(0.15, 3.5, "Those problems became the starting point for AI-FMS.")],
    )

    workbench = screen / "S01-S03-workbench-master-v4.mp4"
    screen_specs = {
        "VO04": [
            (1.0, 6.45, 1.0, (0.5, 0.5)),
            (10.0, 16.95, 1.18, (0.18, 0.30)),
            (18.0, 21.1, 1.16, (0.50, 0.35)),
            (23.0, 29.1, 1.22, (0.82, 0.38)),
        ],
        "VO05": [
            (30.0, 40.1, 1.22, (0.50, 0.65)),
            (40.1, 45.8, 1.16, (0.50, 0.35)),
            (48.0, 56.42, 1.24, (0.52, 0.66)),
        ],
        "VO06": [
            (54.0, 58.9, 1.24, (0.82, 0.38)),
            (58.9, 64.55, 1.24, (0.82, 0.38)),
            (65.0, 67.05, 1.20, (0.51, 0.62)),
            (73.0, 79.96, 1.26, (0.82, 0.63)),
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
                speed=SYSTEM_SPEED,
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
        add_section(
            voice_id.lower(),
            section,
            [
                (start / SYSTEM_SPEED, end / SYSTEM_SPEED, text)
                for start, end, text in screen_cues[voice_id]
            ],
        )

    study_source = screen / "S04-study-mode-master-v4.mp4"
    vo07_duration = probe_duration(voices["VO07"], args.ffprobe)
    study_full = clip_dir / "study-mode-full-page.mp4"
    render_screen_excerpt(
        ffmpeg=args.ffmpeg,
        source=study_source,
        output=study_full,
        start=2.0,
        end=16.0,
        zoom=1.0,
        center=(0.5, 0.5),
        speed=SYSTEM_SPEED,
    )
    study_controls = clip_dir / "study-mode-controls.mp4"
    render_screen_excerpt(
        ffmpeg=args.ffmpeg,
        source=study_source,
        output=study_controls,
        start=16.0,
        end=25.05,
        zoom=1.20,
        center=(0.80, 0.52),
        speed=SYSTEM_SPEED,
    )
    study_visual = section_dir / "09-study-mode-visual.mp4"
    concat_copy(args.ffmpeg, [study_full, study_controls], study_visual)
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
            (0.0, 6.45 / SYSTEM_SPEED, "To evaluate the system without leaking AI information, we built a separate Study Mode."),
            (6.45 / SYSTEM_SPEED, 12.7 / SYSTEM_SPEED, "In both blinded rounds, reviewers could not see AI scores, pose parameters, source file names,"),
            (12.7 / SYSTEM_SPEED, 17.9 / SYSTEM_SPEED, "previous answers, or the other reviewer's decisions."),
            (17.9 / SYSTEM_SPEED, 22.95 / SYSTEM_SPEED, "Reviews were stored as append-only events and exported with checksums."),
        ],
    )

    vo08_duration = probe_duration(voices["VO08"], args.ffprobe)
    results_visual = section_dir / "10-results-animation.mp4"
    render_results_animation(
        ffmpeg=args.ffmpeg,
        output=results_visual,
        duration=vo08_duration,
    )
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
    for index, source in enumerate(finding_sources, start=1):
        clip = clip_dir / f"finding-{index:02d}.mp4"
        render_still(
            ffmpeg=args.ffmpeg,
            source=source,
            output=clip,
            duration=finding_duration,
            zoom=1.0,
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

    closing = a_roll / "closing/VID_20260824111908126.mp4"
    add_section(
        "A03-closing",
        closing,
        [
            (1.91, 6.75, "My role in this project grew far beyond demonstrating a piece of software."),
            (7.05, 13.09, "I worked through an AI-assisted development process, but the project taught me that responsible technology"),
            (13.09, 18.61, "depends on human judgment, data quality, and the willingness to say when the evidence is not enough."),
            (20.89, 27.1, "In college, I hope to continue exploring Human Movement Science, biomechanics, and responsible AI."),
            (27.44, 30.92, "For me, AI-FMS is not the end of a project."),
            (31.1, 34.64, "It is the beginning of a research direction I want to keep pursuing."),
        ],
    )

    end_card = section_dir / "13-end-card.mp4"
    render_still(
        ffmpeg=args.ffmpeg,
        source=card,
        output=end_card,
        duration=4.0,
        zoom=1.0,
    )
    add_section("end-card", end_card, [])

    master_speech = work_dir / "master-v8-speech.mp4"
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
    exact_speed, exact_srt_path = render_exact_duration(
        ffmpeg=args.ffmpeg,
        ffprobe=args.ffprobe,
        source=args.output.resolve(),
        output=args.exact_output.resolve(),
        cues=cleaned_cues,
        target_duration=EXACT_DURATION,
    )
    manifest = {
        "schemaVersion": (
            "ai_fms_application_film_review_cut_v8_zh"
            if args.language == "zh"
            else "ai_fms_application_film_review_cut_v8"
        ),
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "language": args.language,
        "durationSecond": round(probe_duration(args.output.resolve(), args.ffprobe), 3),
        "target": "sync-corrected natural V8 plus a separately preserved exact 4:30 candidate",
        "music": "Apple Loops: Aurora Beat + Digital Halo Synth, mixed as a relaxed sport-tech bed",
        "subtitles": str(srt_path.relative_to(REPO_ROOT)),
        "output": str(args.output.resolve().relative_to(REPO_ROOT)),
        "exactDurationOutput": str(args.exact_output.resolve().relative_to(REPO_ROOT)),
        "exactDurationSubtitle": str(exact_srt_path.relative_to(REPO_ROOT)),
        "exactDurationSecond": round(
            probe_duration(args.exact_output.resolve(), args.ffprobe), 3
        ),
        "exactDurationSpeedFactor": round(exact_speed, 6),
        "sections": section_rows,
    }
    manifest_name = (
        "review-cut-v8-zh-manifest.json"
        if args.language == "zh"
        else "review-cut-v8-manifest.json"
    )
    (work_dir / manifest_name).write_text(
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
