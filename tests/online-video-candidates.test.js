import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCandidateRegistry,
  buildYtDlpArgs,
  isDownloadAllowed,
  mergeCandidateRegistries,
  parseIsoDuration,
  selectApprovedCandidates,
} from "../scripts/online-video-candidates.js";

const searchItem = {
  id: {
    videoId: "abc123",
  },
  snippet: {
    title: "FMS Rotary Stability Test",
    description: "Rotary stability movement screen sample.",
    channelTitle: "Example Channel",
    channelId: "channel-1",
    publishedAt: "2026-01-01T00:00:00Z",
    thumbnails: {
      high: {
        url: "https://example.com/thumb.jpg",
      },
    },
  },
};

test("parseIsoDuration converts YouTube contentDetails duration", () => {
  assert.equal(parseIsoDuration("PT1M23S"), 83);
  assert.equal(parseIsoDuration("PT2H3M4S"), 7384);
});

test("buildCandidateRegistry marks title and duration duplicates", () => {
  const registry = buildCandidateRegistry({
    actionTypes: ["rotary_stability"],
    searchItemsByAction: {
      rotary_stability: [searchItem],
    },
    videoDetailsById: {
      abc123: {
        id: "abc123",
        contentDetails: {
          duration: "PT2M4S",
        },
        statistics: {
          viewCount: "100",
        },
        status: {
          license: "youtube",
        },
      },
    },
    existingIndex: [
      {
        path: "Eval_Videos/Sample videos/7-rotatory stability/FMS Rotary Stability Test.mp4",
        actionType: "rotary_stability",
        titleKey: "fms rotary stability test",
        durationSecond: 124,
      },
    ],
    generatedAt: "2026-05-30T00:00:00.000Z",
  });

  assert.equal(registry.candidates.length, 1);
  assert.equal(registry.candidates[0].duplicateStatus, "likely_duplicate");
  assert.equal(registry.candidates[0].rightsStatus, "needs_rights_review");
});

test("download gate requires approval and confirmed rights", () => {
  const baseCandidate = {
    approvedForDownload: true,
    rightsStatus: "needs_rights_review",
  };

  assert.equal(isDownloadAllowed(baseCandidate), false);
  assert.equal(
    isDownloadAllowed({
      ...baseCandidate,
      rightsStatus: "permission_confirmed",
    }),
    true,
  );
  assert.equal(
    isDownloadAllowed({
      ...baseCandidate,
      approvedForDownload: false,
      rightsStatus: "permission_confirmed",
    }),
    false,
  );
});

test("mergeCandidateRegistries preserves reviewer decisions", () => {
  const existingRegistry = {
    candidates: [
      {
        candidateId: "youtube_rotary_stability_abc123",
        approvedForDownload: true,
        rightsStatus: "permission_confirmed",
        reviewerNotes: "Permission email saved.",
      },
    ],
  };
  const discoveredRegistry = {
    schemaVersion: "ai_fms_online_video_candidates_v1",
    generatedAt: "2026-05-30T00:00:00.000Z",
    candidates: [
      {
        candidateId: "youtube_rotary_stability_abc123",
        approvedForDownload: false,
        rightsStatus: "needs_rights_review",
        reviewerNotes: "",
      },
    ],
  };

  const merged = mergeCandidateRegistries(existingRegistry, discoveredRegistry);
  assert.equal(merged.candidates[0].approvedForDownload, true);
  assert.equal(merged.candidates[0].rightsStatus, "permission_confirmed");
  assert.equal(merged.candidates[0].reviewerNotes, "Permission email saved.");
});

test("selectApprovedCandidates and yt-dlp args stay scoped", () => {
  const registry = {
    candidates: [
      {
        url: "https://www.youtube.com/watch?v=abc123",
        approvedForDownload: true,
        rightsStatus: "owned_by_project",
      },
      {
        url: "https://www.youtube.com/watch?v=skip",
        approvedForDownload: true,
        rightsStatus: "needs_rights_review",
      },
    ],
  };

  const selected = selectApprovedCandidates(registry);
  assert.equal(selected.length, 1);
  assert.deepEqual(
    buildYtDlpArgs(
      selected[0],
      "Eval_Videos/Online Candidates/07-Rotary Stability",
    ),
    [
      "--no-playlist",
      "--write-info-json",
      "--write-thumbnail",
      "--convert-thumbnails",
      "jpg",
      "--merge-output-format",
      "mp4",
      "-P",
      "Eval_Videos/Online Candidates/07-Rotary Stability",
      "-o",
      "%(title).180B-%(id)s.%(ext)s",
      "https://www.youtube.com/watch?v=abc123",
    ],
  );
});
