import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const args = {
    manifestPath: "research/pilot-v1/generated/blindability-manifest.json",
    outputDir: "research/pilot-v1/generated/blindability-previews",
    pageSize: 8,
    force: false,
    limit: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const value = argv[index + 1];
    if (token === "--manifest" && value) {
      args.manifestPath = value;
      index += 1;
    } else if (token === "--output-dir" && value) {
      args.outputDir = value;
      index += 1;
    } else if (token === "--page-size" && value) {
      args.pageSize = Number(value);
      index += 1;
    } else if (token === "--limit" && value) {
      args.limit = Number(value);
      index += 1;
    } else if (token === "--force") {
      args.force = true;
    }
  }
  return args;
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(
      `${command} failed (${result.status}): ${result.stderr || result.stdout}`,
    );
  }
}

function sampleTimes(item) {
  const clip = item.clip ?? item;
  const start = clip.startSecond;
  const end = clip.endSecond;
  const duration = end - start;
  const inset = Math.min(0.15, Math.max(0.03, duration * 0.03));
  return [start + inset, start + duration / 2, end - inset].map((value) =>
    Math.max(0, value).toFixed(3),
  );
}

function buildStrip(item, outputPath, repoRoot) {
  const videoPath = path.resolve(
    repoRoot,
    item.clip?.videoRelativePath ?? item.videoPath,
  );
  const times = sampleTimes(item);
  const inputArgs = times.flatMap((time) => ["-ss", time, "-i", videoPath]);
  const panels = times.map(
    (_time, index) =>
      `[${index}:v]scale=320:180:force_original_aspect_ratio=decrease,pad=320:180:(ow-iw)/2:(oh-ih)/2:black[v${index}]`,
  );
  const filter = `${panels.join(";")};[v0][v1][v2]hstack=inputs=3[out]`;
  run(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      ...inputArgs,
      "-filter_complex",
      filter,
      "-map",
      "[out]",
      "-frames:v",
      "1",
      "-q:v",
      "3",
      outputPath,
    ],
    repoRoot,
  );
}

function buildPage(rows, outputPath, repoRoot) {
  const inputs = rows.flatMap((row) => ["-i", row.stripPath]);
  const streams = rows.map((_row, index) => `[${index}:v]`).join("");
  run(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      ...inputs,
      "-filter_complex",
      `${streams}vstack=inputs=${rows.length}[out]`,
      "-map",
      "[out]",
      "-frames:v",
      "1",
      "-q:v",
      "3",
      outputPath,
    ],
    repoRoot,
  );
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildHtml(index) {
  const sections = index.pages
    .map(
      (page) => `
        <section>
          <h2>Page ${page.pageNumber}</h2>
          <img src="${escapeHtml(path.basename(page.relativePath))}" alt="Blindability contact sheet page ${page.pageNumber}">
          <ol start="${page.startIndex}">
            ${page.rows
              .map(
                (row) =>
                  `<li><code>${escapeHtml(row.studyItemId)}</code> ${escapeHtml(row.actionType)} <code>${escapeHtml(row.repetitionId)}</code></li>`,
              )
              .join("\n")}
          </ol>
        </section>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>AI-FMS Blindability QA</title>
    <style>
      body { margin: 0; padding: 24px; color: #20231f; background: #eef0ec; font-family: system-ui, sans-serif; }
      main { max-width: 1040px; margin: 0 auto; }
      section { margin: 0 0 28px; padding: 16px; border: 1px solid #cbd1c8; background: white; }
      img { display: block; width: 100%; height: auto; background: #111; }
      ol { columns: 2; line-height: 1.6; }
      li { break-inside: avoid; }
      code { font-size: 0.78rem; }
    </style>
  </head>
  <body><main><h1>Blindability QA Contact Sheets</h1>${sections}</main></body>
</html>`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = process.cwd();
  const manifest = JSON.parse(
    fs.readFileSync(path.resolve(repoRoot, args.manifestPath), "utf8"),
  );
  const outputDir = path.resolve(repoRoot, args.outputDir);
  const stripsDir = path.join(outputDir, "strips");
  fs.mkdirSync(stripsDir, { recursive: true });

  const sourceItems = args.limit
    ? manifest.items.slice(0, args.limit)
    : manifest.items;
  const rows = sourceItems.map((item, index) => {
    const stripName = `${String(index + 1).padStart(3, "0")}-${item.studyItemId}.jpg`;
    const stripPath = path.join(stripsDir, stripName);
    if (args.force || !fs.existsSync(stripPath)) {
      buildStrip(item, stripPath, repoRoot);
    }
    process.stdout.write(
      `[${index + 1}/${sourceItems.length}] ${item.studyItemId}\n`,
    );
    return {
      studyItemId: item.studyItemId,
      repetitionId: item.repetitionId,
      actionType: item.actionType,
      stripPath,
    };
  });

  const pages = [];
  for (let index = 0; index < rows.length; index += args.pageSize) {
    const pageRows = rows.slice(index, index + args.pageSize);
    const pageNumber = pages.length + 1;
    const pagePath = path.join(
      outputDir,
      `contact-sheet-${String(pageNumber).padStart(2, "0")}.jpg`,
    );
    buildPage(pageRows, pagePath, repoRoot);
    pages.push({
      pageNumber,
      startIndex: index + 1,
      relativePath: path.relative(outputDir, pagePath),
      rows: pageRows.map((row) => ({
        studyItemId: row.studyItemId,
        repetitionId: row.repetitionId,
        actionType: row.actionType,
      })),
    });
  }

  const indexPayload = {
    schemaVersion: "ai_fms_blindability_preview_index_v1",
    pilotId: manifest.pilotId,
    generatedAt: new Date().toISOString(),
    sampleFramesPerRep: ["start", "middle", "end"],
    pages,
  };
  fs.writeFileSync(
    path.join(outputDir, "index.json"),
    `${JSON.stringify(indexPayload, null, 2)}\n`,
  );
  fs.writeFileSync(path.join(outputDir, "index.html"), buildHtml(indexPayload));
  process.stdout.write(
    `${JSON.stringify({ reps: rows.length, pages: pages.length }, null, 2)}\n`,
  );
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
}
