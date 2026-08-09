import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildStudyQueue,
  buildStudyReviewExport,
  createStudyReviewEvent,
  latestStudyReviews,
  studyStorageKey,
} from "../lib/study-review.js";

const PILOT_URL = "/research/pilot-v1/generated/canonical-pilot.json";

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

function encodeVideoPath(relativePath) {
  return `/${relativePath.split("/").map(encodeURIComponent).join("/")}`;
}

function emptyDraft(item) {
  return {
    score: null,
    confidence: "medium",
    cameraView: item?.cameraView ?? "unknown",
    side: item?.side ?? "unknown",
    comment: "",
    qualityFlags: [],
  };
}

function draftFromEvent(item, event) {
  if (!event || event.status !== "scored") {
    return emptyDraft(item);
  }
  return {
    score: event.score,
    confidence: event.confidence ?? "medium",
    cameraView: event.cameraView ?? item.cameraView ?? "unknown",
    side: event.side ?? item.side ?? "unknown",
    comment: event.comment ?? "",
    qualityFlags: event.qualityFlags ?? [],
  };
}

function downloadJson(fileName, payload) {
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function StudyApp() {
  const videoRef = useRef(null);
  const [pilot, setPilot] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [reviewerId, setReviewerId] = useState("");
  const [events, setEvents] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [draft, setDraft] = useState(emptyDraft(null));
  const [playing, setPlaying] = useState(false);
  const [savedPulse, setSavedPulse] = useState(false);

  useEffect(() => {
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
          "未找到 canonical pilot。请先运行 npm run data:pilot:build。",
        );
      });
  }, []);

  const queue = useMemo(
    () => (pilot && reviewerId ? buildStudyQueue(pilot, reviewerId) : []),
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
  const completedCount = [...latestByRepetition.values()].filter(
    (event) => event.status === "scored",
  ).length;
  const deferredCount = [...latestByRepetition.values()].filter(
    (event) => event.status === "deferred",
  ).length;
  const progressPercent = queue.length
    ? Math.round((completedCount / queue.length) * 100)
    : 0;

  useEffect(() => {
    if (!pilot || !reviewerId) {
      setEvents([]);
      return;
    }
    const stored = localStorage.getItem(
      studyStorageKey(pilot.pilotId, reviewerId),
    );
    setEvents(stored ? JSON.parse(stored) : []);
    setActiveIndex(0);
  }, [pilot, reviewerId]);

  useEffect(() => {
    if (!pilot || !reviewerId) {
      return;
    }
    localStorage.setItem(
      studyStorageKey(pilot.pilotId, reviewerId),
      JSON.stringify(events),
    );
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
      repetition: activeItem,
      status,
      score: draft.score,
      confidence: draft.confidence,
      cameraView: draft.cameraView,
      side: draft.side,
      comment: draft.comment,
      qualityFlags: draft.qualityFlags,
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

  function exportReviews() {
    if (!pilot || !reviewerId) {
      return;
    }
    const payload = buildStudyReviewExport({ pilot, reviewerId, events });
    const safeReviewer = reviewerId.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    downloadJson(
      `ai-fms-study-${safeReviewer || "reviewer"}-${new Date().toISOString().slice(0, 10)}.json`,
      payload,
    );
  }

  return (
    <main className="study-app">
      <header className="study-header">
        <div>
          <a className="study-brand" href="/">
            AI-FMS
          </a>
          <h1>Study Mode</h1>
        </div>
        <div className="blind-state">
          <span aria-hidden="true" />
          Blind review
        </div>
        <div className="reviewer-switch" aria-label="Reviewer">
          <button
            className={reviewerId === "Ronnie" ? "active" : ""}
            onClick={() => setReviewerId("Ronnie")}
            type="button"
          >
            Ronnie
          </button>
          <button
            className={reviewerId === "Edward" ? "active" : ""}
            onClick={() => setReviewerId("Edward")}
            type="button"
          >
            Edward
          </button>
        </div>
      </header>

      {loadError ? <p className="study-error">{loadError}</p> : null}

      <section className="progress-band" aria-label="Review progress">
        <div className="progress-copy">
          <strong>{reviewerId || "选择 Reviewer"}</strong>
          <span>
            {completedCount}/{queue.length || 110} 已评分
          </span>
          <span>{deferredCount} 稍后处理</span>
        </div>
        <div className="progress-track" aria-hidden="true">
          <span style={{ width: `${progressPercent}%` }} />
        </div>
        <button
          type="button"
          className="export-button"
          disabled={!reviewerId || events.length === 0}
          onClick={exportReviews}
        >
          导出记录
        </button>
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
              {activeReview ? (
                <mark>
                  {activeReview.status === "scored" ? "已记录" : "稍后处理"}
                </mark>
              ) : null}
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
                  className={draft.score === score ? "active" : ""}
                  key={score}
                  onClick={() => setDraft((current) => ({ ...current, score }))}
                >
                  {score}
                </button>
              ))}
            </div>

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
                disabled={draft.score === null}
                onClick={() => appendEvent("scored")}
              >
                保存并继续
              </button>
            </div>
          </aside>
        </section>
      ) : null}
    </main>
  );
}
