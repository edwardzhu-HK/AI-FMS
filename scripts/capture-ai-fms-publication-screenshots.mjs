/* global console, document, process, window */

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const baseUrl = process.argv[2] ?? "http://127.0.0.1:5173";
const outputDir = path.resolve(process.argv[3] ?? "docs/assets/publication");
const ownedVideoPath = path.resolve(
  process.env.AI_FMS_PUBLICATION_VIDEO ??
    "Ingested-data/application-video-production/04-screen-recordings/proxies/ai-fms-owned-deep-squat-20260823-1080p.mp4",
);
const ownedPosePath = path.resolve(
  process.env.AI_FMS_PUBLICATION_POSE ??
    "Ingested-data/application-video-production/04-screen-recordings/pose/ai-fms-owned-deep-squat-20260823.pose.json",
);
const ownedFramePath = path.resolve(
  process.env.AI_FMS_PUBLICATION_FRAME ??
    "Ingested-data/application-video-production/04-screen-recordings/stills/ai-fms-owned-deep-squat-20260823-lowest.jpg",
);
const publicationFrameSecond = Number(
  process.env.AI_FMS_PUBLICATION_FRAME_SECOND ?? 12.49,
);

for (const sourcePath of [ownedVideoPath, ownedPosePath, ownedFramePath]) {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Required publication source is missing: ${sourcePath}`);
  }
}

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
  await page.locator(".form-card select").nth(1).selectOption("deep_squat");
  await page
    .getByLabel("Upload Video", { exact: true })
    .setInputFiles(ownedVideoPath);
  await page
    .getByLabel("Pose JSON (optional)", { exact: true })
    .setInputFiles(ownedPosePath);
  const rangeInputs = page.locator(".form-card .row-inputs input");
  await rangeInputs.nth(0).fill("0");
  await rangeInputs.nth(1).fill("15.95");
  await page.locator('.form-card input[type="number"]').nth(2).fill("3");
  await page
    .locator(".form-card textarea")
    .fill("Three front-view repetitions with complete movement cycles.");
  await page.getByRole("button", { name: "Start Analysis" }).click();
  await page.waitForFunction(
    () => document.body.innerText.includes("3 clips"),
    null,
    { timeout: 15_000 },
  );

  await page.locator(".segment-item").nth(2).click();
  await page.evaluate(() => {
    for (const input of document.querySelectorAll(
      '.form-card input[type="file"]',
    )) {
      input.style.color = "transparent";
    }
    for (const node of document.querySelectorAll(".form-card p")) {
      node.textContent = node.textContent
        .replace(/Video: .*\.mp4/, "Video: rights-cleared project footage")
        .replace(/Pose: .*\.pose\.json/, "Pose: MediaPipe landmarks");
    }
    for (const node of document.querySelectorAll(".player-card p")) {
      if (node.textContent.includes("ai-fms-owned-deep-squat-20260823.pose.json")) {
        node.textContent =
          "Real MediaPipe pose overlay aligned to the selected action frame.";
      }
    }
    window.scrollTo(0, 0);
  });
  const reviewerIds = page.locator(".reviewer-form input");
  await reviewerIds.nth(0).fill("Reviewer_A");
  await reviewerIds.nth(1).fill("Reviewer_B");
  await page.evaluate(() => document.activeElement?.blur());
  await prepareVideoForCapture(page, ".video-stage", { showPose: true });
  await seekVideoFrame(page, ".video-stage", publicationFrameSecond);
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

  await page.route("**/__publication-owned-demo-frame.jpg", async (route) => {
    await route.fulfill({
      path: ownedFramePath,
      contentType: "image/jpeg",
    });
  });

  await page.goto(`${baseUrl}/study.html?mode=dry-run`, {
    waitUntil: "networkidle",
  });
  await page.getByRole("button", { name: "Test Reviewer" }).click();
  await page.waitForSelector(".study-video-shell video");
  await page.locator(".queue-item", { hasText: "Deep Squat" }).first().click();
  await page.locator(".study-video-shell video").evaluate((video) => {
    const frame = document.createElement("img");
    frame.src = "/__publication-owned-demo-frame.jpg";
    frame.alt = "Rights-cleared Deep Squat frame";
    frame.style.display = "block";
    frame.style.width = "100%";
    frame.style.height = "100%";
    frame.style.objectFit = "contain";
    frame.style.background = "#071014";
    video.replaceWith(frame);
  });
  await prepareVideoForCapture(page, ".study-video-shell", { showPose: false });
  await page.waitForFunction(() => {
    const frame = document.querySelector(".study-video-shell img");
    return frame?.complete && frame.naturalWidth > 0;
  });

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

console.log(
  JSON.stringify(
    {
      outputDir,
      source: {
        video: path.relative(process.cwd(), ownedVideoPath),
        pose: path.relative(process.cwd(), ownedPosePath),
        studyFrame: path.relative(process.cwd(), ownedFramePath),
        frameSecond: publicationFrameSecond,
      },
      outputs,
    },
    null,
    2,
  ),
);
