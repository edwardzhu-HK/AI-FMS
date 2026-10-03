#!/usr/bin/env python3
"""Reuse approved V8 clean sections and narration for a caption-free system demo."""
import hashlib
import json
import textwrap
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "Ingested-data/application-video-production/07-edit-project/final-v8"
DEST = ROOT / "output/publication/ai-fms-multichannel-release-2026-08-25/03-acm-iui-2027-demo/video"
WORK = ROOT / "Ingested-data/public-demo-production-2026-10-03"


def run(*args):
    subprocess.run(args, check=True)


def duration(path):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)]))


def stamp(t, comma=True):
    ms = round(t * 1000)
    return f"{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02}{',' if comma else '.'}{ms%1000:03}"


def seconds(s):
    h, m, tail = s.split(":")
    return int(h)*3600 + int(m)*60 + float(tail.replace(",", "."))


def card(name, eyebrow, title, lines, length):
    im = Image.new("RGB", (1920, 1080), "#0d2027")
    draw = ImageDraw.Draw(im)
    regular = "/System/Library/Fonts/Supplemental/Arial.ttf"
    bold = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
    draw.text((120, 160), eyebrow, font=ImageFont.truetype(bold, 28), fill="#61d8bb")
    for n, line in enumerate(title):
        draw.text((120, 270+n*95), line, font=ImageFont.truetype(bold, 76), fill="white")
    for n, line in enumerate(lines):
        draw.text((120, 610+n*65), line, font=ImageFont.truetype(regular, 33), fill="#d2dfe3")
    png = WORK / f"{name}.png"
    im.save(png)
    out = WORK / f"{name}.mp4"
    run("ffmpeg", "-loglevel", "error", "-y", "-loop", "1", "-i", str(png), "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-t", str(length), "-r", "30", "-c:v", "libx264", "-preset", "fast", "-crf", "22", "-pix_fmt", "yuv420p", "-c:a", "aac", str(out))
    return out


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    WORK.mkdir(parents=True, exist_ok=True)
    manifest = json.loads((SOURCE / "review-cut-v8-manifest.json").read_text())
    old = {s["label"]: s for s in manifest["sections"]}
    blocks = (SOURCE / "master-final-natural-temp.srt").read_text().strip().split("\n\n")
    old_cues = []
    for block in blocks:
        lines = block.splitlines()
        a, b = lines[1].split(" --> ")
        old_cues.append((seconds(a), seconds(b), " ".join(lines[2:])))
    opening = card("opening", "AI-FMS · SYSTEM DEMONSTRATION", ["Movement evidence.", "Human judgment."], ["Haoran ZHU", "Kang Chiao International School East China Campus", "Seven movements · Explainable suggestions · Independent review"], 6)
    closing = card("closing", "PREPRINT AND PUBLIC CODE", ["Inspect. Question. Review."], ["Preprint: doi.org/10.5281/zenodo.23118144", "Code: github.com/edwardzhu-HK/AI-FMS", "Internal feasibility study · Not a medical diagnostic system"], 8)
    selections = [("vo04", "vo04.mp4"), ("vo05", "vo05.mp4"), ("vo06", "vo06.mp4"), ("study-mode", "09-study-mode.mp4"), ("phase-i-results", "10-results.mp4"), ("research-findings", "11-findings.mp4")]
    sources = [opening]
    offset = duration(opening)
    cues = []
    provenance = []
    for label, name in selections:
        path = SOURCE / "sections" / name
        length = duration(path)
        for a, b, text in old_cues:
            start = old[label]["startSecond"]
            owner = max((row for row in manifest["sections"] if row["startSecond"] <= a + .005), key=lambda row: row["startSecond"])
            if owner["label"] == label:
                cues.append((offset + max(0, a-start), offset+min(length, b-start), text))
        provenance.append({"label": label, "source": str(path.relative_to(ROOT)), "sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "start": offset, "duration": length})
        sources.append(path)
        offset += length
    sources.append(closing)
    listing = WORK / "concat.txt"
    listing.write_text("".join(f"file '{s}'\n" for s in sources))
    video = DEST / "AI-FMS_System_Demo.mp4"
    run("ffmpeg", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(listing), "-map", "0:v:0", "-map", "0:a:0", "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-r", "30", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "2", "-map_metadata", "-1", "-movflags", "+faststart", str(video))
    for extension in ["srt", "vtt"]:
        text = "WEBVTT\n\n" if extension == "vtt" else ""
        for n, (a, b, caption) in enumerate(cues, 1):
            caption = "\n".join(textwrap.wrap(caption, width=68))
            text += f"{n}\n{stamp(a, extension=='srt')} --> {stamp(b, extension=='srt')}\n{caption}\n\n"
        (DEST / f"AI-FMS_System_Demo.en.{extension}").write_text(text)
    report = {"duration": duration(video), "sha256": hashlib.sha256(video.read_bytes()).hexdigest(), "bytes": video.stat().st_size, "burnedCaptions": False, "music": False, "sources": provenance}
    (WORK / "provenance.json").write_text(json.dumps(report, indent=2))
    print(json.dumps({k:v for k,v in report.items() if k!='sources'}, indent=2))


if __name__ == "__main__":
    main()
