/* global console, document */

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { marked } = require("marked");
const { chromium } = require("playwright");

const repoRoot = path.resolve(import.meta.dirname, "..");
const generatedDate = "2026-08-22";

const documents = [
  {
    id: "shot-plan",
    source: path.join(
      repoRoot,
      "docs/delivery/ai_fms_application_video_asset_and_shot_plan_2026-08-17.md",
    ),
    output: path.join(
      repoRoot,
      "output/pdf/ai_fms_application_video_asset_and_shot_plan_print_2026-08-22.pdf",
    ),
    layout: "landscape",
    shortTitle: "AI-FMS Application Video - Asset & Shot Plan",
    editionLabel: "A4 LANDSCAPE · PRINT PRODUCTION GUIDE",
    summary:
      "18 time-coded units · 2.5-3 hour filming plan · owners, rights, handoff and QA",
  },
  {
    id: "script",
    source: path.join(repoRoot, "docs/demo_walkthrough_script_ai_fms_v1_5.md"),
    output: path.join(
      repoRoot,
      "output/pdf/ai_fms_application_video_script_print_2026-08-22.pdf",
    ),
    layout: "portrait",
    shortTitle: "AI-FMS Application Video Script",
    editionLabel: "A4 PORTRAIT · ON-SET SCRIPT",
    summary:
      "4:15-4:30 master · Ronnie-led narration · 3-minute and 60-second cutdowns",
  },
];

marked.setOptions({
  gfm: true,
  breaks: false,
});

function splitMarkdown(markdown) {
  const lines = markdown.replaceAll("\r\n", "\n").split("\n");
  const titleLine = lines.find((line) => line.startsWith("# ")) ?? "# AI-FMS";
  const title = titleLine.replace(/^#\s+/, "").trim();
  const firstSection = lines.findIndex((line) => line.startsWith("## "));
  const titleIndex = lines.indexOf(titleLine);
  return {
    title,
    intro: lines
      .slice(titleIndex + 1, firstSection)
      .join("\n")
      .trim(),
    body: lines.slice(firstSection).join("\n").trim(),
  };
}

function buildStyles(documentConfig) {
  const isLandscape = documentConfig.layout === "landscape";
  return `
    :root {
      --ink: #172127;
      --muted: #5f6d73;
      --rule: #ccd7d9;
      --teal: #176e66;
      --teal-dark: #114f4a;
      --teal-soft: #eaf4f2;
      --gold: #a26b17;
      --gold-soft: #fbf3df;
      --panel: #f5f7f7;
      --paper: #ffffff;
    }

    @page {
      size: A4 ${isLandscape ? "landscape" : "portrait"};
      margin: ${isLandscape ? "13mm 10mm 14mm" : "15mm 15mm 16mm"};
    }

    * { box-sizing: border-box; }

    html {
      font-size: ${isLandscape ? "8.5pt" : "9.6pt"};
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    body {
      margin: 0;
      color: var(--ink);
      background: var(--paper);
      font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", Arial, sans-serif;
      line-height: ${isLandscape ? "1.42" : "1.55"};
      letter-spacing: 0;
    }

    .document-head {
      border-top: 5px solid var(--teal-dark);
      border-bottom: 1px solid var(--rule);
      padding: ${isLandscape ? "7mm 0 5mm" : "8mm 0 6mm"};
      margin-bottom: 7mm;
    }

    .edition {
      color: var(--teal);
      font-size: 7.5pt;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .document-head h1 {
      margin: 2.5mm 0 2mm;
      color: var(--teal-dark);
      font-size: ${isLandscape ? "23pt" : "24pt"};
      line-height: 1.18;
      letter-spacing: 0;
    }

    .summary {
      color: var(--muted);
      font-size: ${isLandscape ? "9pt" : "9.6pt"};
      margin-bottom: 3.5mm;
    }

    .head-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 2mm 7mm;
      color: var(--muted);
      font-size: 7.7pt;
    }

    .head-meta span strong { color: var(--ink); }

    .intro {
      margin-top: 3mm;
      padding: 3mm 4mm;
      border-left: 3px solid var(--gold);
      background: var(--gold-soft);
      font-size: 8.2pt;
    }

    .intro p { margin: 0.7mm 0; }

    article h2 {
      margin: 7mm 0 3mm;
      padding: 2.2mm 3mm;
      color: #fff;
      background: var(--teal-dark);
      font-size: ${isLandscape ? "13pt" : "14pt"};
      line-height: 1.25;
      letter-spacing: 0;
      break-after: avoid;
    }

    .shot-plan article h2:not(:first-child) {
      break-before: page;
    }

    .script article h2 {
      break-before: auto;
    }

    .script article h2:nth-of-type(5),
    .script article h2:nth-of-type(6),
    .script article h2:nth-of-type(7),
    .script article h2:nth-of-type(9) {
      break-before: page;
    }

    article h3 {
      margin: 5mm 0 2mm;
      padding-bottom: 1.2mm;
      border-bottom: 1px solid var(--teal);
      color: var(--teal-dark);
      font-size: ${isLandscape ? "10.5pt" : "11.8pt"};
      line-height: 1.3;
      break-after: avoid;
    }

    article h4 {
      margin: 3.5mm 0 1.5mm;
      color: var(--ink);
      font-size: 10pt;
      break-after: avoid;
    }

    p { margin: 1.5mm 0 2.4mm; }

    ul, ol {
      margin: 1.5mm 0 2.6mm 5.5mm;
      padding-left: 3.5mm;
    }

    li { margin: 0.8mm 0; }
    li > p { margin: 0; }

    strong { color: #10191d; }

    code {
      padding: 0.15em 0.34em;
      border: 1px solid #dde4e5;
      border-radius: 2px;
      color: #294149;
      background: #f2f5f5;
      font-family: "SFMono-Regular", Consolas, monospace;
      font-size: 0.88em;
      overflow-wrap: anywhere;
    }

    pre {
      margin: 2.5mm 0 3mm;
      padding: 3mm;
      border: 1px solid var(--rule);
      background: var(--panel);
      white-space: pre-wrap;
      break-inside: avoid;
    }

    pre code {
      padding: 0;
      border: 0;
      background: transparent;
    }

    blockquote {
      margin: 2.5mm 0 3.5mm;
      padding: 3mm 4mm;
      border-left: 4px solid var(--teal);
      background: var(--teal-soft);
      color: #21383c;
      font-family: Arial, "PingFang SC", sans-serif;
      font-size: ${isLandscape ? "8.4pt" : "9.5pt"};
      line-height: 1.52;
      break-inside: avoid;
    }

    blockquote p { margin: 0 0 2mm; }
    blockquote p:last-child { margin-bottom: 0; }

    table {
      width: 100%;
      margin: 2.5mm 0 4mm;
      border-collapse: collapse;
      font-size: ${isLandscape ? "7.4pt" : "8.4pt"};
      line-height: 1.32;
    }

    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }

    th {
      padding: ${isLandscape ? "1.7mm 1.4mm" : "2mm 1.8mm"};
      border: 1px solid #8ea4a7;
      color: #fff;
      background: var(--teal-dark);
      text-align: left;
      vertical-align: top;
      font-weight: 700;
    }

    td {
      padding: ${isLandscape ? "1.55mm 1.4mm" : "1.8mm"};
      border: 1px solid var(--rule);
      vertical-align: top;
      overflow-wrap: anywhere;
    }

    tbody tr:nth-child(even) td { background: #f7f9f9; }
    tr { break-inside: avoid; }

    input[type="checkbox"] {
      width: 3.4mm;
      height: 3.4mm;
      margin: 0 1.2mm 0 0;
      vertical-align: -0.6mm;
      accent-color: var(--teal);
    }

    a { color: var(--teal-dark); text-decoration: underline; }

    hr {
      margin: 5mm 0;
      border: 0;
      border-top: 1px solid var(--rule);
    }

    .shot-plan article > table:first-of-type {
      table-layout: fixed;
      font-size: 6.65pt;
      line-height: 1.24;
    }

    .shot-plan article > table:first-of-type th:nth-child(1),
    .shot-plan article > table:first-of-type td:nth-child(1) { width: 4%; }
    .shot-plan article > table:first-of-type th:nth-child(2),
    .shot-plan article > table:first-of-type td:nth-child(2) { width: 7%; }
    .shot-plan article > table:first-of-type th:nth-child(3),
    .shot-plan article > table:first-of-type td:nth-child(3) { width: 12%; }
    .shot-plan article > table:first-of-type th:nth-child(4),
    .shot-plan article > table:first-of-type td:nth-child(4) { width: 13%; }
    .shot-plan article > table:first-of-type th:nth-child(5),
    .shot-plan article > table:first-of-type td:nth-child(5) { width: 25%; }
    .shot-plan article > table:first-of-type th:nth-child(6),
    .shot-plan article > table:first-of-type td:nth-child(6) { width: 19%; }
    .shot-plan article > table:first-of-type th:nth-child(7),
    .shot-plan article > table:first-of-type td:nth-child(7) { width: 20%; }

    .script article h3 {
      padding: 2mm 3mm;
      border: 1px solid #b8cbcd;
      border-left: 5px solid var(--teal);
      background: #f2f7f6;
    }

    .script article h3 + p strong:first-child {
      color: var(--gold);
    }

    .script article h3 + p,
    .script article h3 + p + p {
      break-after: avoid;
    }

    .source-note {
      margin-top: 6mm;
      padding-top: 3mm;
      border-top: 1px solid var(--rule);
      color: var(--muted);
      font-size: 7.4pt;
    }
  `;
}

function buildHtml(markdown, documentConfig) {
  const { title, intro, body } = splitMarkdown(markdown);
  return `<!doctype html>
  <html lang="zh-CN">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${title} - Printable Edition</title>
      <style>${buildStyles(documentConfig)}</style>
    </head>
    <body class="${documentConfig.id}">
      <header class="document-head">
        <div class="edition">${documentConfig.editionLabel}</div>
        <h1>${title}</h1>
        <div class="summary">${documentConfig.summary}</div>
        <div class="head-meta">
          <span><strong>Source:</strong> ${path.relative(repoRoot, documentConfig.source)}</span>
          <span><strong>Generated:</strong> ${generatedDate}</span>
          <span><strong>Use:</strong> On-set reference and print review</span>
        </div>
        <div class="intro">${marked.parse(intro)}</div>
      </header>
      <article>${marked.parse(body)}</article>
      <div class="source-note">
        Internal production document. Verify certificates, consent, rights, names,
        links and final narration before filming or public release.
      </div>
    </body>
  </html>`;
}

async function renderDocument(browser, documentConfig) {
  if (!fs.existsSync(documentConfig.source)) {
    throw new Error(`Missing source: ${documentConfig.source}`);
  }

  const markdown = fs.readFileSync(documentConfig.source, "utf8");
  const html = buildHtml(markdown, documentConfig);
  const tempDir = path.join(repoRoot, "tmp/pdfs/ai-fms-video-print");
  fs.mkdirSync(tempDir, { recursive: true });
  fs.mkdirSync(path.dirname(documentConfig.output), { recursive: true });
  const htmlPath = path.join(tempDir, `${documentConfig.id}.html`);
  fs.writeFileSync(htmlPath, html);

  const page = await browser.newPage({
    viewport:
      documentConfig.layout === "landscape"
        ? { width: 1600, height: 1000 }
        : { width: 1200, height: 1600 },
  });
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle" });
  await page.emulateMedia({ media: "print" });
  await page.evaluate(() => document.fonts.ready);

  const isLandscape = documentConfig.layout === "landscape";
  await page.pdf({
    path: documentConfig.output,
    format: "A4",
    landscape: isLandscape,
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: true,
    margin: isLandscape
      ? { top: "13mm", right: "10mm", bottom: "14mm", left: "10mm" }
      : { top: "15mm", right: "15mm", bottom: "16mm", left: "15mm" },
    headerTemplate: `
      <div style="width:100%; padding:0 ${isLandscape ? "10mm" : "15mm"};
                  font:7px Arial,sans-serif; color:#68767a;
                  display:flex; justify-content:space-between;">
        <span>${documentConfig.shortTitle}</span>
        <span>Print edition · ${generatedDate}</span>
      </div>`,
    footerTemplate: `
      <div style="width:100%; padding:0 ${isLandscape ? "10mm" : "15mm"};
                  font:7px Arial,sans-serif; color:#68767a;
                  display:flex; justify-content:space-between;">
        <span>AI-FMS · Internal production guide</span>
        <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
      </div>`,
  });
  await page.close();

  const bytes = fs.statSync(documentConfig.output).size;
  if (bytes < 50_000) {
    throw new Error(
      `Generated PDF is unexpectedly small: ${documentConfig.output}`,
    );
  }
  return { output: documentConfig.output, bytes };
}

const browser = await chromium.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--allow-file-access-from-files", "--disable-web-security"],
});

try {
  const outputs = [];
  for (const documentConfig of documents) {
    outputs.push(await renderDocument(browser, documentConfig));
  }
  console.log(JSON.stringify({ generatedDate, outputs }, null, 2));
} finally {
  await browser.close();
}
