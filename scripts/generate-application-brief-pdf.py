from __future__ import annotations

import re
import sys
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.pdfbase.pdfmetrics import registerFont
from reportlab.platypus import (
    ListFlowable,
    ListItem,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
)


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "AI-FMS_project_brief_application.md"
OUTPUT = ROOT / "docs" / "AI-FMS_project_brief_application.pdf"


def clean_inline(text: str) -> str:
    text = text.strip()
    text = re.sub(r"`([^`]+)`", r"<font name='Courier'>\1</font>", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", text)
    text = text.replace("&", "&amp;")
    text = text.replace("<b>", "§B§").replace("</b>", "§/B§")
    text = text.replace("<font name='Courier'>", "§C§").replace("</font>", "§/C§")
    text = text.replace("<", "&lt;").replace(">", "&gt;")
    text = text.replace("§B§", "<b>").replace("§/B§", "</b>")
    text = text.replace("§C§", "<font name='Courier'>").replace("§/C§", "</font>")
    return text


def on_page(canvas, doc):
    canvas.saveState()
    canvas.setFont("STSong-Light", 8)
    canvas.setFillColor(colors.HexColor("#6f766b"))
    canvas.drawString(inch, 0.55 * inch, "AI-FMS 项目说明")
    canvas.drawRightString(7.5 * inch, 0.55 * inch, f"Page {doc.page}")
    canvas.restoreState()


def build_styles():
    registerFont(UnicodeCIDFont("STSong-Light"))
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "Title",
            parent=base["Title"],
            fontName="STSong-Light",
            fontSize=22,
            leading=28,
            textColor=colors.HexColor("#173f35"),
            spaceAfter=14,
            wordWrap="CJK",
        ),
        "h1": ParagraphStyle(
            "Heading1",
            parent=base["Heading1"],
            fontName="STSong-Light",
            fontSize=15,
            leading=20,
            textColor=colors.HexColor("#1e6f5c"),
            spaceBefore=12,
            spaceAfter=7,
            wordWrap="CJK",
        ),
        "h2": ParagraphStyle(
            "Heading2",
            parent=base["Heading2"],
            fontName="STSong-Light",
            fontSize=12,
            leading=16,
            textColor=colors.HexColor("#26352f"),
            spaceBefore=8,
            spaceAfter=5,
            wordWrap="CJK",
        ),
        "body": ParagraphStyle(
            "Body",
            parent=base["BodyText"],
            fontName="STSong-Light",
            fontSize=10.2,
            leading=15,
            alignment=TA_LEFT,
            spaceAfter=6,
            wordWrap="CJK",
        ),
        "quote": ParagraphStyle(
            "Quote",
            parent=base["BodyText"],
            fontName="STSong-Light",
            fontSize=10.5,
            leading=15,
            leftIndent=14,
            rightIndent=10,
            textColor=colors.HexColor("#33564e"),
            borderColor=colors.HexColor("#b8d2c8"),
            borderWidth=0.6,
            borderPadding=8,
            backColor=colors.HexColor("#f1f7f4"),
            spaceBefore=5,
            spaceAfter=8,
            wordWrap="CJK",
        ),
        "code": ParagraphStyle(
            "Code",
            parent=base["Code"],
            fontName="Courier",
            fontSize=7.8,
            leading=10,
            leftIndent=8,
            rightIndent=8,
            borderColor=colors.HexColor("#d4d9d2"),
            borderWidth=0.5,
            borderPadding=6,
            backColor=colors.HexColor("#f7f7f4"),
            spaceBefore=5,
            spaceAfter=8,
        ),
        "bullet": ParagraphStyle(
            "Bullet",
            parent=base["BodyText"],
            fontName="STSong-Light",
            fontSize=10,
            leading=14,
            leftIndent=18,
            firstLineIndent=-10,
            wordWrap="CJK",
        ),
    }


def markdown_to_story(markdown: str, styles):
    story = []
    lines = markdown.splitlines()
    i = 0
    bullet_buffer = []
    numbered_buffer = []

    def flush_lists():
        nonlocal bullet_buffer, numbered_buffer
        if bullet_buffer:
            for item in bullet_buffer:
                story.append(Paragraph(clean_inline(f"- {item}"), styles["bullet"]))
            story.append(Spacer(1, 4))
            bullet_buffer = []
        if numbered_buffer:
            story.append(
                ListFlowable(
                    [
                        ListItem(
                            Paragraph(clean_inline(item), styles["bullet"]),
                            value=index,
                        )
                        for index, item in enumerate(numbered_buffer, start=1)
                    ],
                    bulletType="1",
                    start="1",
                    leftIndent=20,
                    bulletFontName="Helvetica",
                )
            )
            story.append(Spacer(1, 4))
            numbered_buffer = []

    while i < len(lines):
        line = lines[i].rstrip()

        if not line:
            flush_lists()
            i += 1
            continue

        if line.startswith("  ") and (bullet_buffer or numbered_buffer):
            if numbered_buffer:
                numbered_buffer[-1] = f"{numbered_buffer[-1]} {line.strip()}"
            else:
                bullet_buffer[-1] = f"{bullet_buffer[-1]} {line.strip()}"
            i += 1
            continue

        if line.startswith("```"):
            flush_lists()
            code_lines = []
            i += 1
            while i < len(lines) and not lines[i].startswith("```"):
                code_lines.append(lines[i])
                i += 1
            story.append(Paragraph("<br/>".join(clean_inline(x) for x in code_lines), styles["code"]))
            i += 1
            continue

        if line.startswith("# "):
            flush_lists()
            story.append(Paragraph(clean_inline(line[2:]), styles["title"]))
            story.append(Spacer(1, 6))
            i += 1
            continue

        if line.startswith("## "):
            flush_lists()
            story.append(Paragraph(clean_inline(line[3:]), styles["h1"]))
            i += 1
            continue

        if line.startswith("### "):
            flush_lists()
            story.append(Paragraph(clean_inline(line[4:]), styles["h2"]))
            i += 1
            continue

        if line.startswith("> "):
            flush_lists()
            quote_lines = [line[2:]]
            i += 1
            while i < len(lines) and lines[i].startswith("> "):
                quote_lines.append(lines[i][2:])
                i += 1
            story.append(Paragraph(clean_inline(" ".join(quote_lines)), styles["quote"]))
            continue

        bullet_match = re.match(r"^[-*]\s+(.+)$", line)
        if bullet_match:
            if numbered_buffer:
                flush_lists()
            bullet_buffer.append(bullet_match.group(1))
            i += 1
            continue

        number_match = re.match(r"^\d+\.\s+(.+)$", line)
        if number_match:
            if bullet_buffer:
                flush_lists()
            numbered_buffer.append(number_match.group(1))
            i += 1
            continue

        flush_lists()
        story.append(Paragraph(clean_inline(line), styles["body"]))
        i += 1

    flush_lists()
    return story


def main():
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else SOURCE
    output = Path(sys.argv[2]) if len(sys.argv) > 2 else OUTPUT
    styles = build_styles()
    markdown = source.read_text(encoding="utf-8")
    story = markdown_to_story(markdown, styles)

    doc = SimpleDocTemplate(
        str(output),
        pagesize=letter,
        rightMargin=0.82 * inch,
        leftMargin=0.82 * inch,
        topMargin=0.78 * inch,
        bottomMargin=0.82 * inch,
        title="AI-FMS 项目说明",
        author="AI-FMS 项目",
    )
    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    print(output)


if __name__ == "__main__":
    main()
