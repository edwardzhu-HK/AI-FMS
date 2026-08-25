/* global console, process */

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const outputDir = path.resolve(
  process.argv[2] ??
    "Ingested-data/application-video-production/05-graphics/rendered",
);

fs.mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});

const baseStyle = `
  * { box-sizing: border-box; }
  html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    background: #f7f8f6;
    color: #18232b;
    letter-spacing: 0;
  }
  .frame {
    width: 1920px;
    height: 1080px;
    padding: 92px 112px 88px;
    display: flex;
    flex-direction: column;
  }
  .kicker {
    font-size: 24px;
    line-height: 1;
    font-weight: 700;
    color: #176f65;
    text-transform: uppercase;
    margin-bottom: 26px;
  }
  h1 {
    font-size: 76px;
    line-height: 1.05;
    margin: 0;
    max-width: 1500px;
  }
  .rule { width: 100%; height: 3px; background: #18232b; margin: 38px 0 44px; }
  .metric-row {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(var(--columns, 2), minmax(0, 1fr));
    gap: 54px;
    align-items: center;
  }
  .metric {
    min-width: 0;
    border-left: 8px solid var(--accent, #176f65);
    padding: 24px 0 26px 34px;
  }
  .metric strong {
    display: block;
    font-size: 124px;
    line-height: 0.92;
    color: var(--accent, #176f65);
  }
  .metric span { display: block; margin-top: 20px; font-size: 34px; line-height: 1.25; }
  .footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 26px;
    font-size: 24px;
    color: #56646d;
  }
  .boundary {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
  }
  .boundary strong { font-size: 98px; line-height: 1.0; }
  .boundary p { font-size: 38px; line-height: 1.35; max-width: 1260px; margin: 34px 0 0; }
  .end {
    justify-content: center;
    background: #122026;
    color: #f7f8f6;
  }
  .end .brand { font-size: 136px; line-height: 0.95; font-weight: 800; }
  .end .project-title-row {
    display: flex;
    align-items: baseline;
    gap: 64px;
    white-space: nowrap;
  }
  .end .project-subtitle {
    font-size: 44px;
    line-height: 1.15;
    font-weight: 600;
    color: #f7f8f6;
  }
  .end .name { margin-top: 34px; font-size: 48px; }
  .end .end-rule { width: 190px; height: 8px; background: #e8b44f; margin: 54px 0 36px; }
  .end .themes { font-size: 30px; color: #cbd4d6; }
  .end.final-card .themes { color: #8fd0c6; }
`;

const slides = [
  {
    name: "G01-01-canonical-pool.png",
    body: `
      <div class="frame">
        <div class="kicker">AI-FMS Phase I</div>
        <h1>From source video to traceable movement evidence</h1>
        <div class="rule"></div>
        <div class="metric-row" style="--columns:2">
          <div class="metric" style="--accent:#176f65"><strong>28</strong><span>source videos</span></div>
          <div class="metric" style="--accent:#c65042"><strong>110</strong><span>canonical repetitions</span></div>
        </div>
        <div class="footer"><span>Stable IDs · checksums · lineage</span><span>Phase I internal evidence</span></div>
      </div>`,
  },
  {
    name: "G01-02-blind-study.png",
    body: `
      <div class="frame">
        <div class="kicker">Blinded Human Review</div>
        <h1>A balanced formal audit</h1>
        <div class="rule"></div>
        <div class="metric-row" style="--columns:3">
          <div class="metric" style="--accent:#176f65"><strong>32</strong><span>formal repetitions</span></div>
          <div class="metric" style="--accent:#d07a17"><strong>4</strong><span>movements</span></div>
          <div class="metric" style="--accent:#c65042"><strong>2</strong><span>blind rounds</span></div>
        </div>
        <div class="footer"><span>Two independent reviewers</span><span>AI and pose evidence hidden</span></div>
      </div>`,
  },
  {
    name: "G01-03-human-agreement.png",
    body: `
      <div class="frame">
        <div class="kicker">Human Round B</div>
        <h1>Agreement among jointly scorable repetitions</h1>
        <div class="rule"></div>
        <div class="metric-row" style="--columns:1">
          <div class="metric" style="--accent:#176f65"><strong>26 / 26</strong><span>exact RAW SCORE agreement</span></div>
        </div>
        <div class="footer"><span>32 / 32 scoreability status agreement</span><span>6 / 6 matching unscorable reasons</span></div>
      </div>`,
  },
  {
    name: "G01-04-locked-ai.png",
    body: `
      <div class="frame">
        <div class="kicker">Locked AI vs Human Consensus</div>
        <h1>Agreement and near-agreement are reported separately</h1>
        <div class="rule"></div>
        <div class="metric-row" style="--columns:2">
          <div class="metric" style="--accent:#c65042"><strong>16 / 25</strong><span>exact</span></div>
          <div class="metric" style="--accent:#d07a17"><strong>23 / 25</strong><span>within one point</span></div>
        </div>
        <div class="footer"><span>28 / 32 score coverage</span><span>Coverage and abstention remain visible</span></div>
      </div>`,
  },
  {
    name: "G01-05-boundary.png",
    body: `
      <div class="frame">
        <div class="kicker">Evidence Boundary</div>
        <div class="boundary">
          <strong>Internal benchmark</strong>
          <p>Formative Phase I evidence. Not held-out clinical validation, medical diagnosis, or injury prediction.</p>
        </div>
        <div class="footer"><span>Human judgment remains final</span><span>AI may abstain</span></div>
      </div>`,
  },
  {
    name: "G06-end-card.png",
    body: `
      <div class="frame end">
        <div class="brand">AI-FMS</div>
        <div class="name">Haoran Zhu</div>
        <div class="end-rule"></div>
        <div class="themes">Human Movement Science · Responsible AI · Movement Evidence</div>
      </div>`,
  },
  {
    name: "G06-end-card-final.png",
    body: `
      <div class="frame end final-card">
        <div class="project-title-row">
          <div class="brand">AI-FMS</div>
          <div class="project-subtitle">System Development &amp; Phase I Evaluation</div>
        </div>
        <div class="name">Haoran Zhu</div>
        <div class="end-rule"></div>
        <div class="themes">Human Movement Science · Responsible AI · Movement Evidence</div>
      </div>`,
  },
];

try {
  for (const slide of slides) {
    const page = await browser.newPage({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
    });
    await page.setContent(
      `<!doctype html><html><head><style>${baseStyle}</style></head><body>${slide.body}</body></html>`,
      { waitUntil: "load" },
    );
    await page.screenshot({
      path: path.join(outputDir, slide.name),
      fullPage: false,
    });
    await page.close();
  }
} finally {
  await browser.close();
}

const outputs = slides.map((slide) => {
  const file = path.join(outputDir, slide.name);
  return { name: slide.name, bytes: fs.statSync(file).size };
});

if (outputs.some((item) => item.bytes < 20_000)) {
  throw new Error(`Graphic generation failed: ${JSON.stringify(outputs)}`);
}

console.log(JSON.stringify({ outputDir, outputs }, null, 2));
