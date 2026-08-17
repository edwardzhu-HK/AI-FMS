/* global console, document, process, window */

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const baseUrl = process.argv[2] ?? "http://127.0.0.1:5173";
const outputDir = path.resolve(process.argv[3] ?? "docs/assets/publication");

fs.mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});

async function makeVideoPublicSafe(page, selector, { showPose }) {
  await page.addStyleTag({
    content: `
      ${selector} {
        position: relative !important;
        overflow: hidden !important;
        background-color: #10232d !important;
        background-image:
          linear-gradient(rgba(118, 174, 194, 0.10) 1px, transparent 1px),
          linear-gradient(90deg, rgba(118, 174, 194, 0.10) 1px, transparent 1px) !important;
        background-size: 32px 32px !important;
      }
      ${selector} video {
        visibility: hidden !important;
      }
      ${selector} .keypoint-overlay {
        z-index: 2 !important;
        opacity: ${showPose ? 1 : 0} !important;
        filter: drop-shadow(0 0 5px rgba(127, 220, 225, 0.45));
      }
      ${selector} .skeleton-edge {
        stroke: #d9f4f3 !important;
        stroke-width: 0.58 !important;
      }
      ${selector} .skeleton-point-left {
        fill: #2bc7b5 !important;
      }
      ${selector} .skeleton-point-right {
        fill: #f5a623 !important;
      }
      ${selector} .skeleton-point-neutral {
        fill: #ecf4f6 !important;
      }
      ${selector} .publication-media-label {
        position: absolute;
        z-index: 4;
        top: 22px;
        left: 24px;
        padding: 10px 13px;
        border: 1px solid rgba(183, 223, 231, 0.45);
        background: rgba(8, 25, 33, 0.84);
        color: #effbfd;
        font: 600 14px/1.3 system-ui, sans-serif;
        border-radius: 4px;
      }
      ${selector} .publication-media-label small {
        display: block;
        margin-top: 3px;
        color: #a7c5ce;
        font-size: 11px;
        font-weight: 400;
      }
    `,
  });

  await page.evaluate(
    ({ target, poseVisible }) => {
      const shell = document.querySelector(target);
      if (!shell || shell.querySelector(".publication-media-label")) return;
      const label = document.createElement("div");
      label.className = "publication-media-label";
      label.innerHTML = poseVisible
        ? "Privacy-safe pose evidence<small>Source frame withheld pending rights review</small>"
        : "Blind review media<small>Source frame withheld in publication figure</small>";
      shell.appendChild(label);
    },
    { target: selector, poseVisible: showPose },
  );
}

async function captureWorkbench() {
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1400 },
    deviceScaleFactor: 1,
  });

  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Load Demo" }).click();
  await page.waitForTimeout(1800);
  await page.getByRole("button", { name: "Start Analysis" }).click();
  await page.waitForFunction(
    () => document.body.innerText.includes("7 clips"),
    null,
    { timeout: 15_000 },
  );

  await page.locator(".segment-item").nth(4).click();
  await page.evaluate(() => {
    const video = document.querySelector(".video-stage video");
    if (video) {
      video.currentTime = 29.5;
      video.dispatchEvent(new window.Event("timeupdate"));
    }
    const preset = document.querySelector(".form-card select");
    if (preset?.selectedOptions?.[0]) {
      preset.selectedOptions[0].textContent = "Deep Squat demonstration";
    }
    for (const node of document.querySelectorAll(".form-card p")) {
      node.textContent = node.textContent
        .replace("Video: Sample-1.mp4", "Video: publication demo sample")
        .replace("Pose: Sample-1.pose.json", "Pose: MediaPipe landmarks");
    }
    for (const node of document.querySelectorAll(".player-card p")) {
      if (node.textContent.includes("Sample-1.pose.json")) {
        node.textContent =
          "Real MediaPipe pose overlay; source frame withheld in publication figure.";
      }
    }
    window.scrollTo(0, 0);
  });
  await page
    .locator(".form-card textarea")
    .fill("Seven repetitions with front and side review views.");
  const reviewerIds = page.locator(".reviewer-form input");
  await reviewerIds.nth(0).fill("Reviewer_A");
  await reviewerIds.nth(1).fill("Reviewer_B");
  await page.evaluate(() => document.activeElement?.blur());
  await page.waitForTimeout(600);
  await makeVideoPublicSafe(page, ".video-stage", { showPose: true });
  await page.waitForTimeout(300);

  const appBox = await page.locator(".calibration-app").boundingBox();
  if (!appBox) {
    throw new Error("Workbench root bounds are unavailable");
  }
  await page.screenshot({
    path: path.join(outputDir, "ai-fms-workbench-overview-public-safe.png"),
    clip: {
      x: appBox.x,
      y: 0,
      width: appBox.width,
      height: 1200,
    },
  });

  await page.locator(".deep-squat-features.card").screenshot({
    path: path.join(outputDir, "ai-fms-workbench-quantitative-evidence.png"),
  });

  await page.close();
}

async function captureStudyMode() {
  const page = await browser.newPage({
    viewport: { width: 1800, height: 900 },
    deviceScaleFactor: 1,
  });

  await page.goto(`${baseUrl}/study.html?mode=dry-run`, {
    waitUntil: "networkidle",
  });
  await page.getByRole("button", { name: "Test Reviewer" }).click();
  await page.waitForSelector(".study-video-shell video");
  await page.waitForTimeout(1200);
  await makeVideoPublicSafe(page, ".study-video-shell", { showPose: false });
  await page.waitForTimeout(300);

  await page.screenshot({
    path: path.join(
      outputDir,
      "ai-fms-study-mode-blind-review-public-safe.png",
    ),
    fullPage: false,
  });

  await page.close();
}

try {
  await captureWorkbench();
  await captureStudyMode();
} finally {
  await browser.close();
}

const outputs = fs
  .readdirSync(outputDir)
  .filter((name) => name.endsWith(".png"))
  .sort()
  .map((name) => {
    const file = path.join(outputDir, name);
    return { name, bytes: fs.statSync(file).size };
  });

if (outputs.length < 3 || outputs.some((item) => item.bytes < 20_000)) {
  throw new Error(`Screenshot generation failed: ${JSON.stringify(outputs)}`);
}

console.log(JSON.stringify({ outputDir, outputs }, null, 2));
