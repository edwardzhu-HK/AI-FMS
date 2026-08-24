/* global console, document, process, window */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const baseUrl = process.argv[2] ?? "http://127.0.0.1:5173";
const outputDir = path.resolve(
  process.argv[3] ??
    "Ingested-data/application-video-production/04-screen-recordings/final",
);
const temporaryDir = path.join(outputDir, "_playwright");
const videoPath = path.resolve(
  process.env.AI_FMS_RECORDING_VIDEO ??
    "Ingested-data/application-video-production/04-screen-recordings/proxies/ai-fms-owned-deep-squat-20260823-1080p.mp4",
);
const posePath = path.resolve(
  process.env.AI_FMS_RECORDING_POSE ??
    "Ingested-data/application-video-production/04-screen-recordings/pose/ai-fms-owned-deep-squat-20260823.pose.json",
);
const studyVideoPath = path.resolve(
  process.env.AI_FMS_RECORDING_STUDY_VIDEO ??
    "Ingested-data/application-video-production/04-screen-recordings/proxies/ai-fms-owned-hurdle-step-20260823-1080p.mp4",
);

for (const sourcePath of [videoPath, posePath, studyVideoPath]) {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Required recording source is missing: ${sourcePath}`);
  }
}

fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(temporaryDir, { recursive: true });

const browser = await chromium.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});

async function installCaptureStyle(page) {
  await page.addStyleTag({
    content: `
      html { scroll-behavior: smooth !important; }
      body { cursor: none !important; }
      * { cursor: none !important; }
      #capture-cursor {
        position: fixed;
        left: 0;
        top: 0;
        width: 24px;
        height: 24px;
        margin: -12px 0 0 -12px;
        border-radius: 50%;
        border: 3px solid rgba(255,255,255,0.96);
        background: rgba(23,111,101,0.82);
        box-shadow: 0 0 0 4px rgba(24,35,43,0.42);
        z-index: 999999;
        pointer-events: none;
        transition: left 420ms ease, top 420ms ease, transform 160ms ease;
      }
      #capture-cursor.clicking { transform: scale(1.55); background: rgba(208,122,23,0.9); }
      #capture-focus {
        position: fixed;
        left: 0;
        top: 0;
        width: 0;
        height: 0;
        border: 4px solid rgba(208,122,23,0.96);
        background: rgba(232,180,79,0.08);
        box-shadow: 0 0 0 9999px rgba(17,27,31,0.12), 0 10px 30px rgba(0,0,0,0.22);
        z-index: 999998;
        pointer-events: none;
        opacity: 0;
        transition: left 420ms ease, top 420ms ease, width 420ms ease,
          height 420ms ease, opacity 220ms ease;
      }
    `,
  });
  await page.evaluate(() => {
    const cursor = document.createElement("div");
    cursor.id = "capture-cursor";
    cursor.style.left = `${window.innerWidth * 0.5}px`;
    cursor.style.top = `${window.innerHeight * 0.5}px`;
    document.body.appendChild(cursor);
    const focus = document.createElement("div");
    focus.id = "capture-focus";
    document.body.appendChild(focus);
  });
}

async function moveCursor(page, locator, { click = false } = {}) {
  const box = await locator.boundingBox();
  if (!box) {
    return;
  }
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.evaluate(
    ({ left, top }) => {
      const cursor = document.querySelector("#capture-cursor");
      if (cursor) {
        cursor.style.left = `${left}px`;
        cursor.style.top = `${top}px`;
      }
    },
    { left: x, top: y },
  );
  await page.waitForTimeout(520);
  if (click) {
    await page.evaluate(() =>
      document.querySelector("#capture-cursor")?.classList.add("clicking"),
    );
    await locator.click();
    await page.waitForTimeout(180);
    await page.evaluate(() =>
      document.querySelector("#capture-cursor")?.classList.remove("clicking"),
    );
  }
}

async function focusLocator(page, locator, { padding = 18 } = {}) {
  await locator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  const box = await locator.boundingBox();
  if (!box) {
    return;
  }
  await moveCursor(page, locator);
  await page.evaluate(
    ({ left, top, width, height }) => {
      const focus = document.querySelector("#capture-focus");
      if (!focus) {
        return;
      }
      focus.style.left = `${left}px`;
      focus.style.top = `${top}px`;
      focus.style.width = `${width}px`;
      focus.style.height = `${height}px`;
      focus.style.opacity = "1";
    },
    {
      left: Math.max(10, box.x - padding),
      top: Math.max(10, box.y - padding),
      width: Math.min(1900, box.width + padding * 2),
      height: Math.min(1060, box.height + padding * 2),
    },
  );
  await page.waitForTimeout(500);
}

async function clearFocus(page) {
  await page.evaluate(() => {
    const focus = document.querySelector("#capture-focus");
    if (focus) {
      focus.style.opacity = "0";
    }
  });
  await page.waitForTimeout(320);
}

async function seekVideo(page, selector, second) {
  await page.locator(`${selector} video`).evaluate(async (video, target) => {
    if (video.readyState < 1) {
      await new Promise((resolve) => {
        video.addEventListener("loadedmetadata", resolve, { once: true });
      });
    }
    video.pause();
    video.muted = true;
    await new Promise((resolve) => {
      video.addEventListener("seeked", resolve, { once: true });
      video.currentTime = Math.max(0, Math.min(target, video.duration - 0.05));
    });
    video.dispatchEvent(new window.Event("timeupdate"));
  }, second);
  await page.waitForTimeout(350);
}

async function playVideoFor(page, selector, second, milliseconds) {
  await seekVideo(page, selector, second);
  await page.locator(`${selector} video`).evaluate((video) => video.play());
  await page.waitForTimeout(milliseconds);
  await page.locator(`${selector} video`).evaluate((video) => video.pause());
}

async function finishRecording(context, page, outputName) {
  const recording = page.video();
  await page.close();
  await context.close();
  const temporaryWebm = path.join(temporaryDir, `${outputName}.webm`);
  await recording.saveAs(temporaryWebm);
  const outputMp4 = path.join(outputDir, `${outputName}.mp4`);
  const conversion = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      temporaryWebm,
      "-map_metadata",
      "-1",
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "18",
      "-pix_fmt",
      "yuv420p",
      "-an",
      "-movflags",
      "+faststart",
      outputMp4,
    ],
    { encoding: "utf8" },
  );
  if (conversion.status !== 0) {
    throw new Error(`ffmpeg conversion failed: ${conversion.stderr}`);
  }
  fs.unlinkSync(temporaryWebm);
  return outputMp4;
}

async function captureWorkbench() {
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: temporaryDir, size: { width: 1920, height: 1080 } },
  });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  await installCaptureStyle(page);
  await page.locator(".form-card select").nth(1).selectOption("deep_squat");
  await page
    .getByLabel("Upload Video", { exact: true })
    .setInputFiles(videoPath);
  await page
    .getByLabel("Pose JSON (optional)", { exact: true })
    .setInputFiles(posePath);
  const rangeInputs = page.locator(".form-card .row-inputs input");
  await rangeInputs.nth(0).fill("0");
  await rangeInputs.nth(1).fill("15.95");
  await page.locator('.form-card input[type="number"]').nth(2).fill("3");
  await page
    .locator(".form-card textarea")
    .fill("Three front-view repetitions with complete movement cycles.");
  await page.getByRole("button", { name: "Start Analysis" }).click();
  await page.waitForFunction(() => document.body.innerText.includes("3 clips"));
  await page.locator(".segment-item").nth(2).click();

  await page.addStyleTag({
    content: `
      .calibration-app { transform: scale(0.88); transform-origin: top left; width: 113.64%; }
      .form-card input[type="file"] { color: transparent !important; }
      .video-stage .keypoint-overlay { z-index: 2 !important; opacity: 1 !important; }
    `,
  });
  await page.evaluate(() => {
    for (const node of document.querySelectorAll(".form-card p")) {
      node.textContent = node.textContent
        .replace(/Video: .*\.mp4/u, "Video: rights-cleared project footage")
        .replace(/Pose: .*\.pose\.json/u, "Pose: MediaPipe landmarks");
    }
    for (const node of document.querySelectorAll(".player-card p")) {
      if (node.textContent.includes("ai-fms-owned-deep-squat")) {
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
  await seekVideo(page, ".video-stage", 12.49);
  await page.waitForTimeout(2200);

  // VO04: establish the full workbench, expand the real action selector to
  // show all seven movements, then move to explainable/abstention evidence.
  await page.waitForTimeout(2400);
  const actionSelect = page.locator(".form-card select").nth(1);
  await focusLocator(page, actionSelect, { padding: 12 });
  await actionSelect.evaluate((select) => {
    select.dataset.captureSize = select.getAttribute("size") ?? "";
    select.setAttribute("size", String(select.options.length));
    select.style.minHeight = "250px";
  });
  await page.waitForTimeout(6500);
  await actionSelect.evaluate((select) => {
    const originalSize = select.dataset.captureSize;
    if (originalSize) {
      select.setAttribute("size", originalSize);
    } else {
      select.removeAttribute("size");
    }
    select.style.minHeight = "";
  });
  await clearFocus(page);
  const playerCard = page.locator(".player-card");
  await focusLocator(page, playerCard, { padding: 10 });
  await page.waitForTimeout(3900);
  await clearFocus(page);
  const scoreSummary = page.locator(".score-summary");
  await focusLocator(page, scoreSummary, { padding: 12 });
  await page.waitForTimeout(4700);
  await clearFocus(page);

  // VO05: move through complete repetitions, replay the real action video,
  // then reveal aligned pose and quantitative feature evidence.
  const segmentList = page.locator(".segment-list");
  await focusLocator(page, segmentList, { padding: 10 });
  const previousButton = page.getByRole("button", {
    name: "Prev",
    exact: true,
  });
  const nextButton = page.getByRole("button", { name: "Next", exact: true });
  await moveCursor(page, previousButton, { click: true });
  await page.waitForTimeout(700);
  await moveCursor(page, previousButton, { click: true });
  await page.waitForTimeout(900);
  await clearFocus(page);
  await focusLocator(page, playerCard, { padding: 10 });
  await playVideoFor(page, ".video-stage", 3.8, 4600);
  await page.waitForTimeout(700);
  await moveCursor(page, nextButton, { click: true });
  await playVideoFor(page, ".video-stage", 7.49, 3200);
  await moveCursor(page, nextButton, { click: true });
  await seekVideo(page, ".video-stage", 12.49);
  await page.waitForTimeout(900);

  const skeletonToggle = page.getByLabel("Show skeleton");
  if (!(await skeletonToggle.isChecked())) {
    await moveCursor(page, skeletonToggle, { click: true });
  } else {
    await moveCursor(page, skeletonToggle);
  }
  await page.waitForTimeout(2300);
  await clearFocus(page);

  const featureCard = page.locator(".deep-squat-features.card");
  await focusLocator(page, featureCard, { padding: 10 });
  await page.waitForTimeout(4300);
  await clearFocus(page);

  // VO06: criteria and uncertainty first, then protocol metadata and the
  // human reviewer fields that determine the final recorded judgment.
  await focusLocator(page, scoreSummary, { padding: 12 });
  await page.waitForTimeout(6100);
  await clearFocus(page);
  const segmentEditor = page.locator(".segment-editor");
  await focusLocator(page, segmentEditor, { padding: 10 });
  await page.waitForTimeout(4200);
  await clearFocus(page);
  const reviewerA = page.locator(".reviewer-form").first();
  await focusLocator(page, reviewerA, { padding: 10 });
  await reviewerA.locator("select").selectOption("2");
  await reviewerA
    .locator("textarea")
    .fill(
      "Human reviewer confirms the final score after checking the evidence.",
    );
  await page.evaluate(() => document.activeElement?.blur());
  await page.waitForTimeout(5200);
  await clearFocus(page);

  return finishRecording(context, page, "S01-S03-workbench-master-v4");
}

async function captureStudyMode() {
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: temporaryDir, size: { width: 1920, height: 1080 } },
  });
  const page = await context.newPage();
  await page.route("**/__application-owned-study-demo.mp4", async (route) => {
    await route.fulfill({ path: studyVideoPath, contentType: "video/mp4" });
  });
  await page.goto(`${baseUrl}/study.html?mode=dry-run`, {
    waitUntil: "networkidle",
  });
  await installCaptureStyle(page);
  await page.getByRole("button", { name: "Test Reviewer" }).click();
  await page.waitForSelector(".study-video-shell video");
  await moveCursor(
    page,
    page.locator(".queue-item", { hasText: "Hurdle Step" }).first(),
    {
      click: true,
    },
  );
  await page.locator(".study-video-shell video").evaluate((video) => {
    const ownedVideo = video.cloneNode(false);
    ownedVideo.src = "/__application-owned-study-demo.mp4";
    ownedVideo.muted = true;
    ownedVideo.playsInline = true;
    ownedVideo.preload = "auto";
    video.replaceWith(ownedVideo);
    ownedVideo.load();
  });
  await page.waitForFunction(() => {
    const video = document.querySelector(".study-video-shell video");
    return video?.readyState >= 1;
  });
  const studyTitle = page.locator(".study-header > div").first();
  await focusLocator(page, studyTitle, { padding: 10 });
  await page.waitForTimeout(4100);
  await clearFocus(page);
  await page.locator(".study-video-shell video").evaluate(async (video) => {
    video.currentTime = 3.8;
    await video.play();
  });
  await page.waitForTimeout(6800);
  await page.locator(".study-video-shell video").evaluate((video) => {
    video.pause();
    video.currentTime = 12.49;
  });
  await page.waitForTimeout(2200);
  await focusLocator(page, page.locator(".score-pane"), { padding: 10 });
  const scoreTwo = page.locator(".score-grid button").nth(2);
  await moveCursor(page, scoreTwo, { click: true });
  await page.waitForTimeout(1500);
  const confidenceHigh = page
    .locator(".segmented-control button")
    .filter({ hasText: "高" });
  await moveCursor(page, confidenceHigh, { click: true });
  await page.waitForTimeout(1300);
  const metadataSelects = page.locator(".metadata-grid select");
  await moveCursor(page, metadataSelects.nth(0));
  await metadataSelects.nth(0).selectOption("front");
  await page.waitForTimeout(1000);
  await moveCursor(page, metadataSelects.nth(1));
  await metadataSelects.nth(1).selectOption("none");
  await page.waitForTimeout(1100);
  const qualityFlag = page.locator(".quality-flags label").first();
  await moveCursor(page, qualityFlag);
  await page.waitForTimeout(1100);
  const reviewNote = page.locator(".score-pane textarea");
  await moveCursor(page, reviewNote);
  await reviewNote.fill(
    "Independent review recorded without AI score visibility.",
  );
  await page.evaluate(() => document.activeElement?.blur());
  await page.waitForTimeout(3100);
  await clearFocus(page);
  await page.waitForTimeout(1600);
  return finishRecording(context, page, "S04-study-mode-master-v4");
}

try {
  const workbench = await captureWorkbench();
  const studyMode = await captureStudyMode();
  console.log(
    JSON.stringify(
      {
        outputDir,
        source: {
          video: path.relative(process.cwd(), videoPath),
          pose: path.relative(process.cwd(), posePath),
          studyVideo: path.relative(process.cwd(), studyVideoPath),
        },
        outputs: [workbench, studyMode].map((file) => ({
          file: path.relative(process.cwd(), file),
          bytes: fs.statSync(file).size,
        })),
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
