#!/usr/bin/env python3
"""Create deterministic release archives, checksums, and a manifest."""

from __future__ import annotations

import hashlib
import json
import zipfile
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT / "output/publication/ai-fms-multichannel-release-2026-08-25"
ARCHIVES = PACKAGE / "release-archives"
CHANNELS = (
    "01-zenodo-preprint",
    "02-openai-developer-community",
    "03-acm-iui-2027-demo",
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def public_files(base: Path):
    for path in sorted(base.rglob("*")):
        if not path.is_file():
            continue
        if path.name in {".DS_Store", "release-manifest.json", "SHA256SUMS"}:
            continue
        if "__MACOSX" in path.parts:
            continue
        yield path


def write_archive(channel: str):
    source = PACKAGE / channel
    target = ARCHIVES / f"{channel}.zip"
    ARCHIVES.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path in public_files(source):
            relative = Path(channel) / path.relative_to(source)
            info = zipfile.ZipInfo(str(relative))
            info.date_time = (2026, 8, 25, 12, 0, 0)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, path.read_bytes())


def main():
    for channel in CHANNELS:
        write_archive(channel)

    files = []
    checksum_lines = []
    for path in public_files(PACKAGE):
        relative = path.relative_to(PACKAGE).as_posix()
        digest = sha256(path)
        files.append(
            {
                "path": relative,
                "bytes": path.stat().st_size,
                "sha256": digest,
            }
        )
        checksum_lines.append(f"{digest}  {relative}")

    manifest = {
        "package": "AI-FMS Multichannel Publication Release Package",
        "status": "draft_for_author_review",
        "prepared_date": "2026-08-25",
        "generated_at_utc": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "channels": list(CHANNELS),
        "file_count": len(files),
        "files": files,
    }
    (PACKAGE / "release-manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=True) + "\n",
        encoding="utf-8",
    )
    (PACKAGE / "SHA256SUMS").write_text("\n".join(checksum_lines) + "\n", encoding="utf-8")
    print(f"Finalized {len(files)} files in {PACKAGE}")


if __name__ == "__main__":
    main()
