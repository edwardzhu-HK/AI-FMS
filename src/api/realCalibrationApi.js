import { createEmptyScore } from "../constants/scoring.js";

function buildQuery(path) {
  const baseUrl =
    import.meta.env.VITE_CALIB_API_BASE_URL ?? "http://localhost:4000";
  return `${baseUrl}/api/v0${path}`;
}

async function request(path, options = {}) {
  const response = await fetch(buildQuery(path), options);

  if (!response.ok) {
    let message = `request failed with status ${response.status}`;

    try {
      const payload = await response.json();
      message = payload?.error?.message ?? payload?.message ?? message;
    } catch {
      // Keep default message when server payload is not JSON.
    }

    throw new Error(message);
  }

  return response.json();
}

export async function listActions() {
  return request("/actions");
}

export async function uploadVideoAndCreateAnalysisJob(payload) {
  const formData = new FormData();
  formData.set("file", payload.file);
  formData.set("action_type", payload.actionType);
  formData.set("start_second", String(payload.startSecond));
  formData.set("end_second", String(payload.endSecond));
  if (Number.isInteger(payload.expectedReps)) {
    formData.set("expected_reps", String(payload.expectedReps));
  }
  if (payload.notes) {
    formData.set("notes", payload.notes);
  }

  return request("/videos", {
    method: "POST",
    body: formData,
  });
}

export async function getAnalysisJob(analysisJobId) {
  return request(`/analysis-jobs/${analysisJobId}`);
}

export async function getVideoSegments(videoId) {
  return request(`/videos/${videoId}/segments`);
}

export async function saveSegmentReview(payload) {
  return request(
    `/segments/${payload.segmentId}/reviews/${payload.reviewerRole}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reviewer_id: payload.reviewerId,
        total_score: payload.score.totalScore,
        subscores: payload.score.subscores,
        comment: payload.score.comment,
      }),
    },
  );
}

export async function updateSegmentMetadata(payload) {
  return request(`/segments/${payload.segmentId}/metadata`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      start_second: payload.startSecond,
      end_second: payload.endSecond,
      side: payload.side,
      pain_flag: payload.painFlag,
      clearing_test: payload.clearingTest,
      rubric_version: payload.rubricVersion,
    }),
  });
}

export async function checkVideoReadiness(videoId) {
  return request(`/videos/${videoId}/readiness`);
}

export async function ingestVideo(videoId, requestedBy) {
  return request(`/videos/${videoId}/ingest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ requested_by: requestedBy }),
  });
}

export async function getIngestBatch(ingestBatchId) {
  return request(`/ingest-batches/${ingestBatchId}`);
}

export async function getVideoConsistency(videoId) {
  return request(`/videos/${videoId}/consistency`);
}

export async function exportVideoDataset(videoId) {
  return request(`/videos/${videoId}/dataset-export`);
}

export function buildDefaultReviewerScore() {
  const base = createEmptyScore();
  return {
    reviewerId: "",
    totalScore: base.totalScore,
    subscores: base.subscores,
    comment: base.comment,
  };
}
