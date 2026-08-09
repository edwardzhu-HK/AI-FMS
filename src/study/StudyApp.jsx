import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildStudyQueue,
  buildStudyReviewExport,
  createStudyReviewEvent,
  latestStudyReviews,
  studyStorageKey,
  validateStudyReviewExport,
} from "../lib/study-review.js";

const SEARCH_PARAMS = new URLSearchParams(window.location.search);
const IS_DRY_RUN = SEARCH_PARAMS.get("mode") === "dry-run";
const ROUND_PARAM = SEARCH_PARAMS.get("round");
const STUDY_ROUND = IS_DRY_RUN
  ? "dry_run"
  : ROUND_PARAM === "b" || ROUND_PARAM === "round_b"
    ? "round_b"
    : "round_a";
const ROUND_B_REQUESTED = !IS_DRY_RUN && STUDY_ROUND === "round_b";
const ROUND_LABEL = IS_DRY_RUN
  ? "Dry Run"
  : STUDY_ROUND === "round_b"
    ? "Round B"
    : "Round A";
const INVALID_ROUND_PARAM =
  !IS_DRY_RUN &&
  ROUND_PARAM !== null &&
  !["a", "round_a", "b", "round_b"].includes(ROUND_PARAM);
const PILOT_URL = IS_DRY_RUN
  ? "/research/pilot-v1/generated/dry-run-study-manifest.json"
  : "/research/pilot-v1/generated/formal-study-manifest.json";

const ACTION_LABELS = {
  deep_squat: "Deep Squat",
  hurdle_step: "Hurdle Step",
  active_straight_leg_raise: "Active Straight Leg Raise",
  rotary_stability: "Rotary Stability",
};

const QUALITY_FLAGS = [
  ["movement_not_visible", "动作不可见"],
  ["timing_needs_adjustment", "片段边界需调整"],
  ["label_cue_visible", "画面出现分数提示"],
];

const UNSCORABLE_REASONS = [
  ["movement_not_visible", "动作不可见"],
  ["missing_required_reference", "缺少评分所需参照物"],
  ["missing_required_protocol_condition", "缺少后续测试条件"],
  ["timing_invalid", "片段边界无法支持评分"],
  ["other", "其他"],
];

function encodeVideoPath(relativePath) {
  return `/${relativePath.split("/").map(encodeURIComponent).join("/")}`;
}

function emptyDraft(item) {
  return {
    outcome: "scored",
    score: null,
    scoreZeroConfirmed: false,
    unscorableReason: null,
    confidence: "medium",
    cameraView: item?.cameraView ?? "unknown",
    side: item?.side ?? "unknown",
    comment: "",
    qualityFlags: [],
  };
}

function draftFromEvent(item, event) {
  if (!event || event.status === "deferred") {
    return emptyDraft(item);
  }
  return {
    outcome: event.status === "unscorable" ? "unscorable" : "scored",
    score: event.score,
    scoreZeroConfirmed: event.scoreZeroReason === "pain_observed_or_reported",
    unscorableReason: event.unscorableReason ?? null,
    confidence: event.confidence ?? "medium",
    cameraView: event.cameraView ?? item.cameraView ?? "unknown",
    side: event.side ?? item.side ?? "unknown",
    comment: event.comment ?? "",
    qualityFlags: event.qualityFlags ?? [],
  };
}

function readTimerDuration(timer) {
  if (!timer) {
    return 0;
  }
  const activeDuration =
    timer.activeSinceMs === null ? 0 : performance.now() - timer.activeSinceMs;
  return Math.max(0, Math.round(timer.elapsedMs + activeDuration));
}

function formatDuration(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

async function sha256Text(value) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function dataUrl(text, mimeType) {
  return `data:${mimeType};charset=utf-8,${encodeURIComponent(text)}`;
}

export default function StudyApp() {
  const videoRef = useRef(null);
  const reviewTimerRef = useRef(null);
  const [pilot, setPilot] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [reviewerId, setReviewerId] = useState("");
  const [events, setEvents] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [draft, setDraft] = useState(emptyDraft(null));
  const [playing, setPlaying] = useState(false);
  const [savedPulse, setSavedPulse] = useState(false);
  const [reviewDurationMs, setReviewDurationMs] = useState(0);
  const [exportBundle, setExportBundle] = useState(null);
  const [exportPreparing, setExportPreparing] = useState(false);
  const [exportError, setExportError] = useState("");

  useEffect(() => {
    if (ROUND_B_REQUESTED) {
      setLoadError("Round B 尚未开放。请使用 Round A 完成独立盲评。");
      return;
    }
    if (INVALID_ROUND_PARAM) {
      setLoadError("Study round 参数无效。");
      return;
    }
    fetch(PILOT_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Pilot load failed (${response.status}).`);
        }
        return response.json();
      })
      .then(setPilot)
      .catch(() => {
        setLoadError(
          "未找到正式 Study manifest。请先运行 npm run study:formal:freeze。",
        );
      });
  }, []);

  const queue = useMemo(
    () =>
      pilot && reviewerId
        ? buildStudyQueue(pilot, reviewerId, STUDY_ROUND)
        : [],
    [pilot, reviewerId],
  );
  const latestByRepetition = useMemo(
    () => latestStudyReviews(events),
    [events],
  );
  const activeItem = queue[activeIndex] ?? null;
  const activeReview = activeItem
    ? latestByRepetition.get(activeItem.repetitionId)
    : null;
  const scoredCount = [...latestByRepetition.values()].filter(
    (event) => event.status === "scored",
  ).length;
  const unscorableCount = [...latestByRepetition.values()].filter(
    (event) => event.status === "unscorable",
  ).length;
  const resolvedCount = scoredCount + unscorableCount;
  const deferredCount = [...latestByRepetition.values()].filter(
    (event) => event.status === "deferred",
  ).length;
  const progressPercent = queue.length
    ? Math.round((resolvedCount / queue.length) * 100)
    : 0;
  const activeRepetitionId = activeItem?.repetitionId ?? null;
  const canSaveReview =
    draft.outcome === "unscorable"
      ? Boolean(draft.unscorableReason && draft.comment.trim())
      : draft.score !== null && (draft.score !== 0 || draft.scoreZeroConfirmed);

  useEffect(() => {
    if (!pilot || !reviewerId) {
      setEvents([]);
      return;
    }
    const stored = localStorage.getItem(
      studyStorageKey(pilot.pilotId, reviewerId, STUDY_ROUND),
    );
    setEvents(stored ? JSON.parse(stored) : []);
    setActiveIndex(0);
  }, [pilot, reviewerId]);

  useEffect(() => {
    if (!pilot || !reviewerId) {
      return;
    }
    localStorage.setItem(
      studyStorageKey(pilot.pilotId, reviewerId, STUDY_ROUND),
      JSON.stringify(events),
    );
    setExportBundle(null);
    setExportError("");
  }, [events, pilot, reviewerId]);

  useEffect(() => {
    setDraft(draftFromEvent(activeItem, activeReview));
    setPlaying(false);
    const video = videoRef.current;
    if (video && activeItem) {
      video.pause();
      video.currentTime = activeItem.startSecond;
      video.muted = true;
    }
  }, [activeItem, activeReview]);

  useEffect(() => {
    if (!activeRepetitionId) {
      reviewTimerRef.current = null;
      setReviewDurationMs(0);
      return undefined;
    }

    const timer = {
      startedAtIso: new Date().toISOString(),
      elapsedMs: 0,
      activeSinceMs: document.hidden ? null : performance.now(),
    };
    reviewTimerRef.current = timer;
    setReviewDurationMs(0);

    function updateDuration() {
      setReviewDurationMs(readTimerDuration(timer));
    }

    function handleVisibilityChange() {
      if (document.hidden && timer.activeSinceMs !== null) {
        timer.elapsedMs += performance.now() - timer.activeSinceMs;
        timer.activeSinceMs = null;
      } else if (!document.hidden && timer.activeSinceMs === null) {
        timer.activeSinceMs = performance.now();
      }
      updateDuration();
    }

    const interval = window.setInterval(updateDuration, 1000);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeRepetitionId, reviewerId]);

  useEffect(() => {
    if (!savedPulse) {
      return undefined;
    }
    const timer = window.setTimeout(() => setSavedPulse(false), 1200);
    return () => window.clearTimeout(timer);
  }, [savedPulse]);

  function goToIndex(nextIndex) {
    if (!queue.length) {
      return;
    }
    setActiveIndex(Math.min(queue.length - 1, Math.max(0, nextIndex)));
  }

  function goToNextIncomplete() {
    if (!queue.length) {
      return;
    }
    for (let offset = 1; offset <= queue.length; offset += 1) {
      const candidateIndex = (activeIndex + offset) % queue.length;
      if (!latestByRepetition.has(queue[candidateIndex].repetitionId)) {
        setActiveIndex(candidateIndex);
        return;
      }
    }
    goToIndex(activeIndex + 1);
  }

  function handleLoadedMetadata() {
    if (!videoRef.current || !activeItem) {
      return;
    }
    videoRef.current.muted = true;
    videoRef.current.currentTime = activeItem.startSecond;
  }

  function handleTimeUpdate() {
    const video = videoRef.current;
    if (!video || !activeItem) {
      return;
    }
    video.muted = true;
    if (video.currentTime >= activeItem.endSecond) {
      video.currentTime = activeItem.startSecond;
      if (playing) {
        void video.play();
      }
    }
  }

  function togglePlayback() {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    video.muted = true;
    if (video.paused) {
      if (
        activeItem &&
        (video.currentTime < activeItem.startSecond ||
          video.currentTime >= activeItem.endSecond)
      ) {
        video.currentTime = activeItem.startSecond;
      }
      void video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  }

  function replayClip() {
    const video = videoRef.current;
    if (!video || !activeItem) {
      return;
    }
    video.currentTime = activeItem.startSecond;
    video.muted = true;
    void video.play();
    setPlaying(true);
  }

  function appendEvent(status) {
    if (!pilot || !reviewerId || !activeItem) {
      return;
    }
    const event = createStudyReviewEvent({
      pilotId: pilot.pilotId,
      reviewerId,
      studyRound: STUDY_ROUND,
      repetition: activeItem,
      status,
      score: draft.score,
      confidence: draft.confidence,
      cameraView: draft.cameraView,
      side: draft.side,
      comment: draft.comment,
      qualityFlags: draft.qualityFlags,
      reviewStartedAt:
        reviewTimerRef.current?.startedAtIso ?? new Date().toISOString(),
      reviewDurationMs: readTimerDuration(reviewTimerRef.current),
      unscorableReason: status === "unscorable" ? draft.unscorableReason : null,
      scoreZeroReason:
        status === "scored" && draft.score === 0
          ? "pain_observed_or_reported"
          : null,
      supersedesEventId: activeReview?.eventId ?? null,
    });
    setEvents((current) => [...current, event]);
    setSavedPulse(true);
    goToNextIncomplete();
  }

  function toggleQualityFlag(flag) {
    setDraft((current) => ({
      ...current,
      qualityFlags: current.qualityFlags.includes(flag)
        ? current.qualityFlags.filter((item) => item !== flag)
        : [...current.qualityFlags, flag],
    }));
  }

  function selectUnscorableReason(reason) {
    setDraft((current) => ({
      ...current,
      outcome: "unscorable",
      score: null,
      scoreZeroConfirmed: false,
      unscorableReason: reason,
      qualityFlags:
        reason === "movement_not_visible"
          ? current.qualityFlags.includes("movement_not_visible")
            ? current.qualityFlags
            : [...current.qualityFlags, "movement_not_visible"]
          : current.qualityFlags.filter(
              (flag) => flag !== "movement_not_visible",
            ),
    }));
  }

  async function prepareExport() {
    if (!pilot || !reviewerId) {
      return;
    }
    setExportPreparing(true);
    setExportError("");
    try {
      const payload = buildStudyReviewExport({
        pilot,
        reviewerId,
        studyRound: STUDY_ROUND,
        events,
      });
      const validation = validateStudyReviewExport(payload, {
        pilot,
        requireComplete: false,
      });
      if (!validation.valid) {
        throw new Error("Review export validation failed.");
      }
      const jsonText = `${JSON.stringify(payload, null, 2)}\n`;
      const checksum = await sha256Text(jsonText);
      const safeReviewer = reviewerId.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const safeRound = STUDY_ROUND.replaceAll("_", "-");
      const jsonFileName = `ai-fms-${safeRound}-${safeReviewer || "reviewer"}-${new Date().toISOString().slice(0, 10)}.json`;
      const checksumFileName = `${jsonFileName}.sha256`;
      const checksumText = `${checksum}  ${jsonFileName}\n`;
      setExportBundle({
        checksumFileName,
        checksumText,
        completion: validation.completion,
        jsonFileName,
        jsonText,
      });
    } catch {
      setExportBundle(null);
      setExportError("导出校验失败");
    } finally {
      setExportPreparing(false);
    }
  }

  return (
    <main className="study-app">
      <header className="study-header">
        <div>
          <a className="study-brand" href="/">
            AI-FMS
          </a>
          <h1>Study Mode · {ROUND_LABEL}</h1>
        </div>
        <div className="blind-state">
          <span aria-hidden="true" />
          {IS_DRY_RUN
            ? "Dry run"
            : ROUND_B_REQUESTED
              ? "Round B · Locked"
              : "Round A · Blind"}
        </div>
        <div
          className={`reviewer-switch${IS_DRY_RUN ? " single" : ""}`}
          aria-label="Reviewer"
        >
          {IS_DRY_RUN ? (
            <button
              className={reviewerId === "Test Reviewer" ? "active" : ""}
              onClick={() => setReviewerId("Test Reviewer")}
              type="button"
            >
              Test Reviewer
            </button>
          ) : (
            <>
              <button
                className={reviewerId === "Ronnie" ? "active" : ""}
                onClick={() => setReviewerId("Ronnie")}
                type="button"
              >
                Ronnie
              </button>
              <button
                className={reviewerId === "Other Reviewer" ? "active" : ""}
                onClick={() => setReviewerId("Other Reviewer")}
                type="button"
              >
                Other Reviewer
              </button>
            </>
          )}
        </div>
      </header>

      {loadError ? <p className="study-error">{loadError}</p> : null}

      <section className="progress-band" aria-label="Review progress">
        <div className="progress-copy">
          <strong>{reviewerId || "选择 Reviewer"}</strong>
          <span>
            {resolvedCount}/{queue.length} 已处理
          </span>
          <span>{scoredCount} 已评分</span>
          <span>{unscorableCount} 无法评分</span>
          <span>{deferredCount} 稍后处理</span>
        </div>
        <div className="progress-track" aria-hidden="true">
          <span style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="export-area">
          <button
            type="button"
            className="export-button"
            disabled={!reviewerId || events.length === 0 || exportPreparing}
            onClick={prepareExport}
          >
            {exportPreparing ? "生成中" : "生成导出包"}
          </button>
          {exportBundle ? (
            <div
              className="export-links"
              data-complete={exportBundle.completion.complete}
            >
              <span>
                {exportBundle.completion.complete
                  ? `${exportBundle.completion.resolvedCount}/${exportBundle.completion.expectedCount} Complete · ${exportBundle.completion.scoredCount} scored · ${exportBundle.completion.unscorableCount} unscorable`
                  : `${exportBundle.completion.resolvedCount}/${exportBundle.completion.expectedCount} Partial`}
              </span>
              <a
                download={exportBundle.jsonFileName}
                href={dataUrl(exportBundle.jsonText, "application/json")}
              >
                JSON
              </a>
              <a
                download={exportBundle.checksumFileName}
                href={dataUrl(exportBundle.checksumText, "text/plain")}
              >
                SHA-256
              </a>
            </div>
          ) : null}
          {exportError ? (
            <span className="export-error">{exportError}</span>
          ) : null}
        </div>
      </section>

      {!reviewerId ? (
        <section className="reviewer-empty">
          <h2>选择 Reviewer</h2>
        </section>
      ) : activeItem ? (
        <section className="study-workspace">
          <aside className="queue-pane">
            <div className="pane-heading">
              <h2>Review Queue</h2>
              <span>{queue.length}</span>
            </div>
            <div className="queue-list">
              {queue.map((item, index) => {
                const review = latestByRepetition.get(item.repetitionId);
                return (
                  <button
                    type="button"
                    className={
                      index === activeIndex ? "queue-item active" : "queue-item"
                    }
                    key={item.repetitionId}
                    onClick={() => goToIndex(index)}
                  >
                    <span>{String(index + 1).padStart(3, "0")}</span>
                    <strong>{ACTION_LABELS[item.actionType]}</strong>
                    <em data-status={review?.status ?? "pending"}>
                      {review?.status === "scored"
                        ? review.score
                        : review?.status === "unscorable"
                          ? "N/A"
                          : review?.status === "deferred"
                            ? "Later"
                            : "Pending"}
                    </em>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="video-pane">
            <div className="case-heading">
              <div>
                <span>CASE {String(activeIndex + 1).padStart(3, "0")}</span>
                <h2>{ACTION_LABELS[activeItem.actionType]}</h2>
              </div>
              <div className="case-state">
                <time>{formatDuration(reviewDurationMs)}</time>
                {activeReview ? (
                  <mark>
                    {activeReview.status === "scored"
                      ? "已评分"
                      : activeReview.status === "unscorable"
                        ? "无法评分"
                        : "稍后处理"}
                  </mark>
                ) : null}
              </div>
            </div>
            <div className="study-video-shell">
              <video
                key={activeItem.repetitionId}
                ref={videoRef}
                src={encodeVideoPath(activeItem.videoPath)}
                muted
                playsInline
                preload="metadata"
                onLoadedMetadata={handleLoadedMetadata}
                onPause={() => setPlaying(false)}
                onPlay={() => setPlaying(true)}
                onTimeUpdate={handleTimeUpdate}
              />
            </div>
            <div className="playback-controls">
              <button type="button" onClick={togglePlayback}>
                {playing ? "暂停" : "播放"}
              </button>
              <button type="button" onClick={replayClip}>
                重播
              </button>
              <span>Muted</span>
              <div className="case-navigation">
                <button
                  type="button"
                  disabled={activeIndex === 0}
                  onClick={() => goToIndex(activeIndex - 1)}
                  aria-label="Previous case"
                >
                  上一个
                </button>
                <button
                  type="button"
                  disabled={activeIndex === queue.length - 1}
                  onClick={() => goToIndex(activeIndex + 1)}
                  aria-label="Next case"
                >
                  下一个
                </button>
              </div>
            </div>
          </section>

          <aside className="score-pane">
            <div className="pane-heading">
              <h2>RAW SCORE</h2>
              {savedPulse ? <span className="saved-state">Saved</span> : null}
            </div>

            <div className="score-grid" role="group" aria-label="FMS raw score">
              {[0, 1, 2, 3].map((score) => (
                <button
                  type="button"
                  className={
                    draft.outcome === "scored" && draft.score === score
                      ? "active"
                      : ""
                  }
                  key={score}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      outcome: "scored",
                      score,
                      scoreZeroConfirmed:
                        score === 0 ? current.scoreZeroConfirmed : false,
                      unscorableReason: null,
                    }))
                  }
                >
                  {score}
                </button>
              ))}
            </div>

            {draft.outcome === "scored" && draft.score === 0 ? (
              <label className="pain-confirmation">
                <input
                  type="checkbox"
                  checked={draft.scoreZeroConfirmed}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      scoreZeroConfirmed: event.target.checked,
                    }))
                  }
                />
                疼痛已观察或报告
              </label>
            ) : null}

            <div className="outcome-divider" aria-hidden="true">
              <span>OR</span>
            </div>

            <button
              type="button"
              className={
                draft.outcome === "unscorable"
                  ? "unscorable-button active"
                  : "unscorable-button"
              }
              onClick={() =>
                selectUnscorableReason(
                  draft.unscorableReason ?? "movement_not_visible",
                )
              }
            >
              无法独立评分
            </button>

            {draft.outcome === "unscorable" ? (
              <label className="field-block unscorable-reason">
                原因
                <select
                  value={draft.unscorableReason ?? ""}
                  onChange={(event) =>
                    selectUnscorableReason(event.target.value)
                  }
                >
                  {UNSCORABLE_REASONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <div className="field-block">
              <span>Confidence</span>
              <div className="segmented-control">
                {[
                  ["low", "低"],
                  ["medium", "中"],
                  ["high", "高"],
                ].map(([value, label]) => (
                  <button
                    type="button"
                    className={draft.confidence === value ? "active" : ""}
                    key={value}
                    onClick={() =>
                      setDraft((current) => ({ ...current, confidence: value }))
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="metadata-grid">
              <label>
                Camera view
                <select
                  value={draft.cameraView}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      cameraView: event.target.value,
                    }))
                  }
                >
                  <option value="unknown">Unknown</option>
                  <option value="front">Front</option>
                  <option value="side">Side</option>
                  <option value="mixed">Mixed</option>
                </select>
              </label>
              <label>
                Side
                <select
                  value={draft.side}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      side: event.target.value,
                    }))
                  }
                >
                  <option value="unknown">Unknown</option>
                  <option value="none">N/A</option>
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                  <option value="bilateral">Bilateral</option>
                </select>
              </label>
            </div>

            <fieldset className="quality-flags">
              <legend>QA flags</legend>
              {QUALITY_FLAGS.map(([value, label]) => (
                <label key={value}>
                  <input
                    type="checkbox"
                    checked={draft.qualityFlags.includes(value)}
                    onChange={() => toggleQualityFlag(value)}
                  />
                  {label}
                </label>
              ))}
            </fieldset>

            <label className="field-block">
              Review note
              <textarea
                rows="4"
                value={draft.comment}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    comment: event.target.value,
                  }))
                }
              />
            </label>

            <div className="review-actions">
              <button
                type="button"
                className="defer-button"
                onClick={() => appendEvent("deferred")}
              >
                稍后处理
              </button>
              <button
                type="button"
                className="save-button"
                disabled={!canSaveReview}
                onClick={() =>
                  appendEvent(
                    draft.outcome === "unscorable" ? "unscorable" : "scored",
                  )
                }
              >
                {draft.outcome === "unscorable" ? "记录并继续" : "保存并继续"}
              </button>
            </div>
          </aside>
        </section>
      ) : null}
    </main>
  );
}
