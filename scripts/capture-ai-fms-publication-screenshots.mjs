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

async function seekVideoFrame(page, selector, second) {
  await page.locator(`${selector} video`).evaluate(async (video, target) => {
    if (video.readyState < 1) {
      await new Promise((resolve, reject) => {
        const timeout = window.setTimeout(
          () => reject(new Error("Video metadata timed out")),
          10_000,
        );
        video.addEventListener(
          "loadedmetadata",
          () => {
            window.clearTimeout(timeout);
            resolve();
          },
          { once: true },
        );
      });
    }

    video.pause();
    video.muted = true;
    const duration = Number.isFinite(video.duration) ? video.duration : target;
    const clampedTarget = Math.max(0, Math.min(target, duration - 0.05));
    if (Math.abs(video.currentTime - clampedTarget) > 0.02) {
      await new Promise((resolve, reject) => {
        const timeout = window.setTimeout(
          () => reject(new Error("Video seek timed out")),
          10_000,
        );
        video.addEventListener(
          "seeked",
          () => {
            window.clearTimeout(timeout);
            resolve();
          },
          { once: true },
        );
        video.currentTime = clampedTarget;
      });
    }
    video.dispatchEvent(new window.Event("timeupdate"));
  }, second);

  await page.waitForTimeout(350);
}

async function prepareVideoForCapture(page, selector, { showPose }) {
  await page.addStyleTag({
    content: `
      ${selector} {
        position: relative !important;
        overflow: hidden !important;
        background: #071014 !important;
      }
      ${selector} video {
        visibility: visible !important;
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
    `,
  });
}

async function captureWorkbench() {
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1400 },
    deviceScaleFactor: 1,
  });

  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  await page
    .locator(".demo-loader select")
    .selectOption("publication-deep-squat");
  await page.getByRole("button", { name: "Load Demo" }).click();
  await page.waitForTimeout(1800);
  await page.getByRole("button", { name: "Start Analysis" }).click();
  await page.waitForFunction(
    () => document.body.innerText.includes("3 clips"),
    null,
    { timeout: 15_000 },
  );

  await page.locator(".segment-item").nth(2).click();
  await page.evaluate(() => {
    const preset = document.querySelector(".form-card select");
    if (preset?.selectedOptions?.[0]) {
      preset.selectedOptions[0].textContent = "Deep Squat demonstration";
    }
    for (const node of document.querySelectorAll(".form-card p")) {
      node.textContent = node.textContent
        .replace("Video: deep-squat-demo.mp4", "Video: publication demo sample")
        .replace(
          "Pose: deep-squat-demo.pose.json",
          "Pose: MediaPipe landmarks",
        );
    }
    for (const node of document.querySelectorAll(".player-card p")) {
      if (node.textContent.includes("deep-squat-demo.pose.json")) {
        node.textContent =
          "Real MediaPipe pose overlay aligned to the selected action frame.";
      }
    }
    window.scrollTo(0, 0);
  });
  await page
    .locator(".form-card textarea")
    .fill("Three front-view repetitions with complete movement cycles.");
  const reviewerIds = page.locator(".reviewer-form input");
  await reviewerIds.nth(0).fill("Reviewer_A");
  await reviewerIds.nth(1).fill("Reviewer_B");
  await page.evaluate(() => document.activeElement?.blur());
  await prepareVideoForCapture(page, ".video-stage", { showPose: true });
  await seekVideoFrame(page, ".video-stage", 15.28);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);

  const appBox = await page.locator(".calibration-app").boundingBox();
  if (!appBox) {
    throw new Error("Workbench root bounds are unavailable");
  }
  await page.screenshot({
    path: path.join(outputDir, "ai-fms-workbench-overview-real-video.png"),
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
  await page.locator(".queue-item", { hasText: "Deep Squat" }).click();
  await prepareVideoForCapture(page, ".study-video-shell", { showPose: false });
  await seekVideoFrame(page, ".study-video-shell", 14.4);

  await page.screenshot({
    path: path.join(outputDir, "ai-fms-study-mode-blind-review-real-video.png"),
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

const expectedOutputNames = [
  "ai-fms-study-mode-blind-review-real-video.png",
  "ai-fms-workbench-overview-real-video.png",
  "ai-fms-workbench-quantitative-evidence.png",
];
const outputs = expectedOutputNames.map((name) => {
  const file = path.join(outputDir, name);
  return { name, bytes: fs.existsSync(file) ? fs.statSync(file).size : 0 };
});

if (outputs.some((item) => item.bytes < 20_000)) {
  throw new Error(`Screenshot generation failed: ${JSON.stringify(outputs)}`);
}

console.log(JSON.stringify({ outputDir, outputs }, null, 2));
