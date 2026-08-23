/* global console, process */

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const outputDir = path.resolve(
  process.argv[2] ?? "output/publication/nhsjs/figures",
);

const sources = [
  "deep-squat-strategy-continuum.svg",
  "aslr-bilateral-repeatability.svg",
  "hurdle-score2-pathways.svg",
  "rotary-cycle-event-matrix.svg",
].map((name) => ({
  name,
  source: path.resolve("docs/assets/phase-i-case-studies", name),
  output: path.join(outputDir, name.replace(/\.svg$/u, ".png")),
}));

fs.mkdirSync(outputDir, { recursive: true });

for (const item of sources) {
  if (!fs.existsSync(item.source)) {
    throw new Error(`Missing source figure: ${item.source}`);
  }
}

const browser = await chromium.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--allow-file-access-from-files"],
});

try {
  for (const item of sources) {
    const page = await browser.newPage({
      viewport: { width: 1600, height: 1120 },
      deviceScaleFactor: 1,
    });
    await page.goto(pathToFileURL(item.source).href, {
      waitUntil: "networkidle",
    });
    const svg = page.locator("svg");
    await svg.waitFor();
    await svg.evaluate((node) => {
      node.style.display = "block";
      node.style.background = "#fff";
      node.ownerDocument.documentElement.style.margin = "0";
      node.ownerDocument.documentElement.style.padding = "0";
    });
    await svg.screenshot({ path: item.output });
    await page.close();
  }
} finally {
  await browser.close();
}

const outputs = sources.map((item) => ({
  file: path.relative(process.cwd(), item.output),
  bytes: fs.statSync(item.output).size,
}));

if (outputs.some((item) => item.bytes < 20_000)) {
  throw new Error(
    `Unexpectedly small figure output: ${JSON.stringify(outputs)}`,
  );
}

console.log(JSON.stringify({ outputDir, outputs }, null, 2));
