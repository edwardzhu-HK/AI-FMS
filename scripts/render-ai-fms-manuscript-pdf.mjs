/* global console, document, process */

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const input = path.resolve(
  process.argv[2] ??
    "docs/publication/ai_fms_phase_i_full_manuscript_draft_zh-CN_2026-08-17.html",
);
const output = path.resolve(
  process.argv[3] ??
    "output/pdf/ai_fms_phase_i_chinese_manuscript_draft_2026-08-17.pdf",
);

if (!fs.existsSync(input)) {
  throw new Error(`Input manuscript not found: ${input}`);
}

fs.mkdirSync(path.dirname(output), { recursive: true });

const browser = await chromium.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--allow-file-access-from-files", "--disable-web-security"],
});

try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
  });
  await page.goto(pathToFileURL(input).href, { waitUntil: "networkidle" });
  await page.emulateMedia({ media: "print" });

  await page.waitForFunction(() =>
    Array.from(document.images).every(
      (image) => image.complete && image.naturalWidth > 0,
    ),
  );

  await page.pdf({
    path: output,
    format: "A4",
    printBackground: true,
    preferCSSPageSize: false,
    displayHeaderFooter: true,
    margin: {
      top: "18mm",
      right: "17mm",
      bottom: "19mm",
      left: "17mm",
    },
    headerTemplate: `
      <div style="width:100%; padding:0 17mm; font-size:7.5px; color:#68737d;
                  font-family:Arial, sans-serif; display:flex; justify-content:space-between;">
        <span>AI-FMS Phase I · Chinese Manuscript Draft</span>
        <span>Internal Review · 2026-08-23</span>
      </div>`,
    footerTemplate: `
      <div style="width:100%; padding:0 17mm; font-size:7.5px; color:#68737d;
                  font-family:Arial, sans-serif; display:flex; justify-content:space-between;">
        <span>Not submitted · Not peer reviewed</span>
        <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
      </div>`,
  });
} finally {
  await browser.close();
}

const size = fs.statSync(output).size;
if (size < 50_000) {
  throw new Error(`Generated PDF is unexpectedly small: ${size} bytes`);
}

console.log(JSON.stringify({ input, output, bytes: size }, null, 2));
