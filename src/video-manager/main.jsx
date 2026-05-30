/* eslint-disable react-refresh/only-export-components */
import { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const API_BASE =
  import.meta.env.VITE_VIDEO_MANAGER_API_BASE ?? "http://127.0.0.1:4100";
const DEFAULT_ACTION = "rotary_stability";

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) {
    return "-";
  }

  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function formatResolution(item) {
  if (!item.width || !item.height) {
    return "-";
  }

  return `${item.width}x${item.height}`;
}

function formatList(values) {
  if (!values || values.length === 0) {
    return "-";
  }

  return values.join(", ");
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "request failed");
  }

  return payload;
}

function Sidebar({ actions, selectedAction, onSelect }) {
  return (
    <aside className="manager-sidebar">
      <div className="sidebar-title">FMS Library</div>
      <div className="action-list">
        {actions.map((action) => (
          <button
            className={
              action.id === selectedAction
                ? "action-button action-button-active"
                : "action-button"
            }
            key={action.id}
            onClick={() => onSelect(action.id)}
            type="button"
          >
            <span>{action.displayName}</span>
            <span className="action-count">{action.counts.downloaded}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}

function StatusStrip({ status, error }) {
  return (
    <div className="status-strip">
      <span className={status?.apiKeyConfigured ? "pill ok" : "pill warn"}>
        API key {status?.apiKeyConfigured ? "ready" : "session/manual"}
      </span>
      <span className={status?.ytDlpAvailable ? "pill ok" : "pill danger"}>
        yt-dlp {status?.ytDlpAvailable ? "ready" : "missing"}
      </span>
      {error ? <span className="status-error">{error}</span> : null}
    </div>
  );
}

function LibraryTable({ library, selectedVideo, onSelectVideo }) {
  const items = library?.items ?? [];

  if (items.length === 0) {
    return <div className="empty-state">No videos found for this action.</div>;
  }

  return (
    <div className="table-wrap">
      <table className="manager-table">
        <thead>
          <tr>
            <th>Video</th>
            <th>Type</th>
            <th>Duration</th>
            <th>Resolution</th>
            <th>Reps</th>
            <th>Review</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              className={selectedVideo?.id === item.id ? "selected-row" : ""}
              key={item.id}
              onClick={() => onSelectVideo(item)}
            >
              <td>
                <strong>{item.title}</strong>
                <span>{item.fileName}</span>
              </td>
              <td>
                {item.kind === "online_download" ? "Downloaded" : "Reference"}
              </td>
              <td>{formatDuration(item.durationSecond)}</td>
              <td>{formatResolution(item)}</td>
              <td>{item.expectedReps ?? "-"}</td>
              <td>{formatList(item.needsReview)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VideoDetails({ video }) {
  if (!video) {
    return (
      <div className="empty-state">Select a video to inspect details.</div>
    );
  }

  return (
    <section className="detail-panel">
      <video className="preview-video" controls src={video.url} />
      <h3>{video.title}</h3>
      <dl className="detail-grid">
        <div>
          <dt>Duration</dt>
          <dd>{formatDuration(video.durationSecond)}</dd>
        </div>
        <div>
          <dt>Resolution</dt>
          <dd>{formatResolution(video)}</dd>
        </div>
        <div>
          <dt>Size</dt>
          <dd>{video.sizeMb ? `${video.sizeMb} MB` : "-"}</dd>
        </div>
        <div>
          <dt>Expected reps</dt>
          <dd>{video.expectedReps ?? "-"}</dd>
        </div>
        <div>
          <dt>Score hints</dt>
          <dd>{formatList(video.scoreHints)}</dd>
        </div>
        <div>
          <dt>Duplicate</dt>
          <dd>{video.duplicateStatus ?? "-"}</dd>
        </div>
        <div className="detail-wide">
          <dt>Source</dt>
          <dd>
            {video.sourceUrl ? (
              <a href={video.sourceUrl} rel="noreferrer" target="_blank">
                {video.sourceUrl}
              </a>
            ) : (
              video.path
            )}
          </dd>
        </div>
        <div className="detail-wide">
          <dt>SHA256</dt>
          <dd className="hash-text">{video.sha256 ?? "-"}</dd>
        </div>
      </dl>
    </section>
  );
}

function CandidateRow({ candidate, checked, onToggle }) {
  const recommendation = candidate.recommendation ?? {
    score: 50,
    label: "medium",
    reasons: ["No recommendation score available."],
  };

  return (
    <label className="candidate-row">
      <input
        checked={checked}
        onChange={() => onToggle(candidate.candidateId)}
        type="checkbox"
      />
      <img alt="" className="candidate-thumb" src={candidate.thumbnail ?? ""} />
      <div className="candidate-main">
        <div className="candidate-title">{candidate.title}</div>
        <div className="candidate-meta">
          {candidate.channelTitle} · {formatDuration(candidate.durationSecond)}{" "}
          · {candidate.duplicateStatus}
        </div>
        <div className="candidate-reasons">
          {recommendation.reasons.map((reason) => (
            <span key={reason}>{reason}</span>
          ))}
        </div>
      </div>
      <div className={`score-badge score-${recommendation.label}`}>
        {recommendation.score}
      </div>
    </label>
  );
}

function SearchPanel({
  apiKey,
  candidates,
  isSearching,
  maxResults,
  selectedCandidateIds,
  onApiKeyChange,
  onMaxResultsChange,
  onSearch,
  onToggleCandidate,
  onOpenDownload,
}) {
  return (
    <section className="search-panel">
      <div className="panel-heading">
        <h2>Get more</h2>
        <button disabled={isSearching} onClick={onSearch} type="button">
          {isSearching ? "Searching..." : "Search YouTube"}
        </button>
      </div>
      <div className="search-controls">
        <label>
          Session API key
          <input
            onChange={(event) => onApiKeyChange(event.target.value)}
            placeholder="Optional if server env is configured"
            type="password"
            value={apiKey}
          />
        </label>
        <label>
          Results
          <input
            min="3"
            onChange={(event) => onMaxResultsChange(event.target.value)}
            type="number"
            value={maxResults}
          />
        </label>
      </div>
      <div className="candidate-list">
        {candidates.map((candidate) => (
          <CandidateRow
            candidate={candidate}
            checked={selectedCandidateIds.includes(candidate.candidateId)}
            key={candidate.candidateId}
            onToggle={onToggleCandidate}
          />
        ))}
      </div>
      <button
        className="download-button"
        disabled={selectedCandidateIds.length === 0}
        onClick={onOpenDownload}
        type="button"
      >
        Download selected ({selectedCandidateIds.length})
      </button>
    </section>
  );
}

function ConfirmModal({
  candidates,
  confirmLikelyDuplicates,
  notes,
  onCancel,
  onConfirm,
  onConfirmLikelyDuplicatesChange,
  onNotesChange,
}) {
  const hasLikelyDuplicate = candidates.some(
    (candidate) => candidate.duplicateStatus === "likely_duplicate",
  );

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>Confirm download</h2>
        <p>
          {candidates.length} candidate(s) will be marked permission_confirmed
          and downloaded to the isolated Online Candidates library.
        </p>
        <ul className="modal-list">
          {candidates.map((candidate) => (
            <li key={candidate.candidateId}>{candidate.title}</li>
          ))}
        </ul>
        <label>
          Review notes
          <textarea
            onChange={(event) => onNotesChange(event.target.value)}
            rows="3"
            value={notes}
          />
        </label>
        {hasLikelyDuplicate ? (
          <label className="checkbox-line">
            <input
              checked={confirmLikelyDuplicates}
              onChange={(event) =>
                onConfirmLikelyDuplicatesChange(event.target.checked)
              }
              type="checkbox"
            />
            I understand at least one selected candidate is a likely duplicate.
          </label>
        ) : null}
        <div className="modal-actions">
          <button onClick={onCancel} type="button">
            Cancel
          </button>
          <button
            disabled={hasLikelyDuplicate && !confirmLikelyDuplicates}
            onClick={onConfirm}
            type="button"
          >
            Confirm download
          </button>
        </div>
      </div>
    </div>
  );
}

function JobPanel({ job }) {
  if (!job) {
    return null;
  }

  return (
    <section className="job-panel">
      <div>
        <strong>Download job:</strong> {job.status} ·{" "}
        {Math.round((job.progress ?? 0) * 100)}%
      </div>
      <pre>{(job.logs ?? []).slice(-12).join("")}</pre>
    </section>
  );
}

function VideoManagerApp() {
  const [actions, setActions] = useState([]);
  const [selectedAction, setSelectedAction] = useState(DEFAULT_ACTION);
  const [library, setLibrary] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [maxResults, setMaxResults] = useState("10");
  const [isSearching, setIsSearching] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmLikelyDuplicates, setConfirmLikelyDuplicates] = useState(false);
  const [downloadNotes, setDownloadNotes] = useState(
    "Confirmed from FMS Video Download Manager.",
  );
  const [job, setJob] = useState(null);

  const selectedCandidates = useMemo(
    () =>
      candidates.filter((candidate) =>
        selectedCandidateIds.includes(candidate.candidateId),
      ),
    [candidates, selectedCandidateIds],
  );

  const loadStatus = useCallback(async () => {
    setStatus(await apiRequest("/api/video-manager/status"));
  }, []);

  const loadActions = useCallback(async () => {
    const payload = await apiRequest("/api/video-manager/actions");
    setActions(payload.items);
  }, []);

  const loadLibrary = useCallback(async (actionType) => {
    const payload = await apiRequest(
      `/api/video-manager/library?actionType=${encodeURIComponent(actionType)}`,
    );
    setLibrary(payload);
    setSelectedVideo(payload.items[0] ?? null);
  }, []);

  useEffect(() => {
    Promise.all([
      loadStatus(),
      loadActions(),
      loadLibrary(selectedAction),
    ]).catch((caught) => setError(caught.message));
  }, [loadActions, loadLibrary, loadStatus, selectedAction]);

  useEffect(() => {
    if (!job || job.status === "succeeded" || job.status === "failed") {
      if (job?.status === "succeeded") {
        loadActions();
        loadLibrary(selectedAction);
      }
      return undefined;
    }

    const timer = setInterval(async () => {
      const nextJob = await apiRequest(
        `/api/video-manager/downloads/${job.jobId}`,
      );
      setJob(nextJob);
    }, 1000);

    return () => clearInterval(timer);
  }, [job, loadActions, loadLibrary, selectedAction]);

  async function handleSearch() {
    setIsSearching(true);
    setError("");
    setSelectedCandidateIds([]);
    try {
      const payload = await apiRequest("/api/video-manager/search", {
        method: "POST",
        body: JSON.stringify({
          actionType: selectedAction,
          maxResults: Number(maxResults),
          apiKey,
        }),
      });
      setCandidates(payload.candidates);
      await loadActions();
    } catch (caught) {
      setError(caught.message);
    } finally {
      setIsSearching(false);
    }
  }

  function handleToggleCandidate(candidateId) {
    setSelectedCandidateIds((current) =>
      current.includes(candidateId)
        ? current.filter((id) => id !== candidateId)
        : [...current, candidateId],
    );
  }

  async function handleDownloadConfirm() {
    setError("");
    try {
      const nextJob = await apiRequest("/api/video-manager/downloads", {
        method: "POST",
        body: JSON.stringify({
          candidateIds: selectedCandidateIds,
          reviewerNotes: downloadNotes,
          confirmLikelyDuplicates,
        }),
      });
      setJob(nextJob);
      setModalOpen(false);
    } catch (caught) {
      setError(caught.message);
    }
  }

  return (
    <main className="video-manager-shell">
      <Sidebar
        actions={actions}
        onSelect={(actionType) => {
          setSelectedAction(actionType);
          setCandidates([]);
          setSelectedCandidateIds([]);
        }}
        selectedAction={selectedAction}
      />
      <section className="manager-main">
        <header className="manager-header">
          <div>
            <h1>FMS Video Download Manager</h1>
            <p>{library?.displayName ?? "FMS"} raw video library</p>
          </div>
          <StatusStrip error={error} status={status} />
        </header>
        <div className="manager-grid">
          <section className="library-panel">
            <div className="panel-heading">
              <h2>Downloaded library</h2>
              <div className="summary-metrics">
                <span>{library?.counts.downloaded ?? 0} downloaded</span>
                <span>{library?.counts.references ?? 0} references</span>
              </div>
            </div>
            <LibraryTable
              library={library}
              onSelectVideo={setSelectedVideo}
              selectedVideo={selectedVideo}
            />
          </section>
          <VideoDetails video={selectedVideo} />
          <SearchPanel
            apiKey={apiKey}
            candidates={candidates}
            isSearching={isSearching}
            maxResults={maxResults}
            onApiKeyChange={setApiKey}
            onMaxResultsChange={setMaxResults}
            onOpenDownload={() => setModalOpen(true)}
            onSearch={handleSearch}
            onToggleCandidate={handleToggleCandidate}
            selectedCandidateIds={selectedCandidateIds}
          />
        </div>
        <JobPanel job={job} />
      </section>
      {modalOpen ? (
        <ConfirmModal
          candidates={selectedCandidates}
          confirmLikelyDuplicates={confirmLikelyDuplicates}
          notes={downloadNotes}
          onCancel={() => setModalOpen(false)}
          onConfirm={handleDownloadConfirm}
          onConfirmLikelyDuplicatesChange={setConfirmLikelyDuplicates}
          onNotesChange={setDownloadNotes}
        />
      ) : null}
    </main>
  );
}

createRoot(document.getElementById("video-manager-root")).render(
  <VideoManagerApp />,
);
