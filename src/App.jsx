import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  calibrationApiMode,
  checkVideoReadiness,
  exportVideoDataset,
  getAnalysisJob,
  getVideoConsistency,
  getVideoSegments,
  ingestVideo,
  listActions,
  saveSegmentReview,
  updateSegmentMetadata,
  uploadVideoAndCreateAnalysisJob,
} from "./api/calibrationApi.js";
import {
  adjudicateScores,
  getSegmentReviewStatus,
  summarizeIngest,
  summarizeReviewerReadiness,
} from "./lib/adjudication.js";
import {
  buildAiDraftTimingPayloads,
  filterSegmentsWithDetectedCycles,
  withAiDraftRange,
} from "./lib/ai-draft-timing.js";
import { buildAiSideSuggestion } from "./lib/ai-side-suggestion.js";
import { summarizeClearingReadiness } from "./lib/clearing-readiness.js";
import { summarizeConsistency } from "./lib/consistency.js";
import { buildDatasetCsv } from "./lib/dataset-csv.js";
import { buildDatasetPackageZip } from "./lib/dataset-package.js";
import {
  attachPoseEvidenceToDataset,
  buildDatasetExport,
} from "./lib/dataset-export.js";
import {
  summarizeExportQuality,
  summarizeTimingReadiness,
} from "./lib/export-quality.js";
import {
  allSegmentsMatchAdapter,
  evaluateMovementEvidenceGate,
  getImplementedPoseActionTypes,
  getMovementCapabilities,
  getMovementCapability,
  getMovementAdapter,
} from "./lib/movement-adapters.js";
import { detectPoseActivePeriods } from "./lib/pose-active-periods.js";
import { summarizePoseLandmarks } from "./lib/pose-landmarks.js";
import DeepSquatFeatureSnapshot from "./components/DeepSquatFeatureSnapshot.jsx";
import ReviewerScoreForm from "./components/ReviewerScoreForm.jsx";
import ScoreSummary from "./components/ScoreSummary.jsx";
import SegmentEditor from "./components/SegmentEditor.jsx";
import SegmentList from "./components/SegmentList.jsx";
import KeypointOverlay from "./components/KeypointOverlay.jsx";
import { createReviewerRawScore } from "./constants/scoring.js";

const REVIEWER_A_DEFAULT_ID = "Coach_in_video";
const REVIEWER_B_DEFAULT_ID = "Coach_Ronnie";
const DEFAULT_DEMO_PRESET_ID = "sample-1";
const WORKFLOW_STORAGE_KEY = "ai-fms-v1-6-local-workflow";
const INGEST_HISTORY_STORAGE_KEY = "ai-fms-v1-6-ingest-history";
const MAX_INGEST_HISTORY_ENTRIES = 30;
const DEMO_PRESETS = [
  {
    id: "sample-1",
    label: "Sample-1 mixed views",
    actionType: "deep_squat",
    videoUrl: "/Eval_Videos/01-Deep%20Squat/Sample-1.mp4",
    poseUrl: "/Eval_Videos/01-Deep%20Squat/pose/Sample-1.pose.json",
    videoFileName: "Sample-1.mp4",
    poseFileName: "Sample-1.pose.json",
    range: {
      startSecond: "1",
      endSecond: "45",
    },
  },
  {
    id: "front",
    label: "Front only",
    actionType: "deep_squat",
    videoUrl: "/Eval_Videos/01-Deep%20Squat/front.mp4",
    poseUrl: "/Eval_Videos/01-Deep%20Squat/pose/front.pose.json",
    videoFileName: "front.mp4",
    poseFileName: "front.pose.json",
    range: {
      startSecond: "0",
      endSecond: "18",
    },
  },
  {
    id: "side",
    label: "Side only",
    actionType: "deep_squat",
    videoUrl: "/Eval_Videos/01-Deep%20Squat/side.mp4",
    poseUrl: "/Eval_Videos/01-Deep%20Squat/pose/side.pose.json",
    videoFileName: "side.mp4",
    poseFileName: "side.pose.json",
    range: {
      startSecond: "0",
      endSecond: "26",
    },
  },
  {
    id: "aslr-score-3",
    label: "ASLR score-3 sample",
    actionType: "active_straight_leg_raise",
    videoUrl: "/Eval_Videos/Sample%20videos/5-ASLR/2%20reps%20score%203.mp4",
    poseUrl:
      "/Eval_Videos/Sample%20videos/5-ASLR/pose/2-reps-score-3.pose.json",
    videoFileName: "2 reps score 3.mp4",
    poseFileName: "2-reps-score-3.pose.json",
    range: {
      startSecond: "0",
      endSecond: "23.8",
    },
  },
  {
    id: "shoulder-score-2",
    label: "Shoulder score-2 sample",
    actionType: "shoulder_mobility",
    videoUrl:
      "/Eval_Videos/Sample%20videos/4-Shoulder%20Mobility/2%20reps%20score%202.mp4",
    poseUrl:
      "/Eval_Videos/Sample%20videos/4-Shoulder%20Mobility/pose/2-reps-score-2.pose.json",
    videoFileName: "2 reps score 2.mp4",
    poseFileName: "2-reps-score-2.pose.json",
    range: {
      startSecond: "0",
      endSecond: "22.1",
    },
  },
  {
    id: "inline-score-3",
    label: "In-Line Lunge score-3 sample",
    actionType: "in_line_lunge",
    videoUrl:
      "/Eval_Videos/Sample%20videos/3-Inline%20Lunge/6%20reps%20score%203.mp4",
    poseUrl:
      "/Eval_Videos/Sample%20videos/3-Inline%20Lunge/pose/6-reps-score-3.pose.json",
    videoFileName: "6 reps score 3.mp4",
    poseFileName: "6-reps-score-3.pose.json",
    expectedReps: "6",
    notes:
      "In-Line Lunge 6 reps score-3 sample。当前支持 timing/features 与 first-pass pose-based AI suggestion。",
    range: {
      startSecond: "0",
      endSecond: "60.3",
    },
  },
  {
    id: "hurdle-score-3",
    label: "Hurdle score-3 sample",
    actionType: "hurdle_step",
    videoUrl:
      "/Eval_Videos/Sample%20videos/2-Hurdle%20step/7%20reps%20score%203.mp4",
    poseUrl:
      "/Eval_Videos/Sample%20videos/2-Hurdle%20step/pose/7-reps-score-3.pose.json",
    videoFileName: "7 reps score 3.mp4",
    poseFileName: "7-reps-score-3.pose.json",
    range: {
      startSecond: "17",
      endSecond: "55.6",
    },
  },
  {
    id: "trunk-score-3",
    label: "Trunk Stability Push-Up score-3 sample",
    actionType: "trunk_stability_push_up",
    videoUrl:
      "/Eval_Videos/Sample%20videos/6-trunk%20stability%20push%20up/1%20rep%20score%203.mp4",
    poseUrl:
      "/Eval_Videos/Sample%20videos/6-trunk%20stability%20push%20up/pose/1-rep-score-3.pose.json",
    videoFileName: "1 rep score 3.mp4",
    poseFileName: "1-rep-score-3.pose.json",
    expectedReps: "1",
    notes:
      "Trunk Stability Push-Up 1 rep score-3 sample。当前支持 first-pass timing/features 与 pose-based AI suggestion；extension clearing/pain 仍需人工确认。",
    range: {
      startSecond: "0",
      endSecond: "33.5",
    },
  },
  {
    id: "rotary-review",
    label: "Rotary Stability AI sample",
    actionType: "rotary_stability",
    videoUrl:
      "/Eval_Videos/Sample%20videos/7-rotatory%20stability/videoplayback%20%2821%29.mp4",
    poseUrl:
      "/Eval_Videos/Sample%20videos/7-rotatory%20stability/pose/rotary-review.pose.json",
    videoFileName: "videoplayback (21).mp4",
    poseFileName: "rotary-review.pose.json",
    expectedReps: "2",
    notes:
      "Rotary Stability first-pass sample。只保留两个完整 rep：四足支撑起始位、触碰、完全伸展、再次触碰、复原；后面的图片/clearing 讲解不纳入 segment。系统可生成保守、可拒判的 AI RAW SCORE；flexion clearing/pain 仍需人工确认。",
    range: {
      startSecond: "46",
      endSecond: "112",
    },
  },
  {
    id: "rotary-instructions-score-3",
    label: "Rotary Stability instructions score-3 sample",
    actionType: "rotary_stability",
    videoUrl:
      "/Eval_Videos/Sample%20videos/7-rotatory%20stability/Rotary%20stability%20test%20instructions.mp4",
    poseUrl:
      "/Eval_Videos/Sample%20videos/7-rotatory%20stability/pose/rotary-stability-test-instructions.pose.json",
    videoFileName: "Rotary stability test instructions.mp4",
    poseFileName: "rotary-stability-test-instructions.pose.json",
    expectedReps: "12",
    notes:
      "Rotary Stability instructions sample。保留12个完整 rep：四足支撑起始位、触碰、完全伸展、再次触碰、复原。结构为前2个侧面、接着4个正面、再2个侧面、最后4个正面；正面段可用于 timing/score，但 side 先保留 unknown，避免误判 left/right。视频里未见单独 clearing test；clearing negative 作为 reviewer metadata 记录。按 FMS manual，同侧模式完成，curated visual suggestion 为 score 3。",
    range: {
      startSecond: "6",
      endSecond: "124",
    },
  },
  {
    id: "rotary-videoplayback-22-score-1",
    label: "Rotary Stability score-1 sample",
    actionType: "rotary_stability",
    videoUrl:
      "/Eval_Videos/Sample%20videos/7-rotatory%20stability/videoplayback%20%2822%29.mp4",
    poseUrl:
      "/Eval_Videos/Sample%20videos/7-rotatory%20stability/pose/videoplayback-22.pose.json",
    videoFileName: "videoplayback (22).mp4",
    poseFileName: "videoplayback-22.pose.json",
    expectedReps: "4",
    notes:
      "Rotary Stability score-1 sample。只取2分钟前内容；0-48秒讲解/摆位不作为 segment。保留4个完整 rep：从四足支撑位开始，触碰、伸展、再次触碰并复原。按 FMS manual，若出现失去平衡、手未触及 lateral malleolus、膝/肘未完全伸展或无法进入起始位，任一条满足即为 score 1；该样本的 curated visual suggestion 为 score 1。",
    range: {
      startSecond: "48",
      endSecond: "120",
    },
  },
];
const EVAL_VIDEO_PRESETS = {
  "sample-1.mp4": {
    expectedReps: "7",
    notes: "前三个正面，后四个侧面。前六个3分，最后一个2分",
  },
  "front.mp4": {
    expectedReps: "3",
    notes: "都是正面",
  },
  "side.mp4": {
    expectedReps: "4",
    notes: "都是侧面",
  },
  "5reps score 2.mp4": {
    expectedReps: "5",
    notes:
      "Deep Squat 5 reps：前3个floor attempt未达到3分路径；后两个脚跟垫高 / FMS board attempt，完成效果良好，final score 2 sample。",
  },
  "2 reps score 3.mp4": {
    expectedReps: "2",
    notes: "都是正面。两个动作，right + left。score 3 sample",
  },
  "2 reps score 2.mp4": {
    expectedReps: "2",
    notes: "都是正面。两个动作，score 2 sample",
  },
  "7 reps score 3.mp4": {
    expectedReps: "7",
    notes: "都是正面。Hurdle Step 7 reps，默认范围已避开开头准备时间。",
  },
  "12 reps score 3.mp4": {
    expectedReps: "4",
    notes:
      "Hurdle Step 12 reps score 3 source video；clean subset for pose-based scoring。只保留纯视角 clean reps：rep 1 front 21.3-28.5, rep 2 side 34.0-38.5, rep 3 side 39.0-43.5, rep 4 front 48.8-52.5。中间 front/side 切镜头的 reps 不入库；AI suggestion 应基于 pose features 自行判断，不使用文件名分数作为 scoring source。",
    range: {
      startSecond: "20",
      endSecond: "53",
    },
  },
  "first 4 reps all score 3.mp4": {
    expectedReps: "4",
    notes:
      "Hurdle Step clean subset for pose-based scoring。红衣服受试者是 primary subject，绿衣服旁观者/coach 不作为 skeleton。只保留前4个完整动作：rep 1 front 62.0-68.5 right, rep 2 front 70.0-77.0 left, rep 3 front 78.0-83.0 right, rep 4 front 84.0-90.5 left。96秒后的额外示范/重新站位不入库；AI suggestion 应基于 pose features 自行判断，不使用文件名分数作为 scoring source。",
    range: {
      startSecond: "60",
      endSecond: "92",
    },
  },
  "6reps total score 2 fo r both sides.mp4": {
    expectedReps: "6",
    notes:
      "Hurdle Step 6 full-cycle reps；pose-based scoring。红衣服受试者是 primary subject，黑衣服 coach 不作为 skeleton。只保留 clean 动作段：rep 1 front 126.5-134.0 right, rep 2 front 139.5-145.0 left, rep 3 front 147.5-155.0 right, rep 4 front 159.5-166.5 left, rep 5 front 171.0-179.0 left, rep 6 front 181.0-190.0 left。每个 rep 必须从起始姿势开始，脚前伸/跨过障碍后再复原到起始姿势才算一个完整 rep。rep 4 观察到 foot/hurdle kit contact，按 FMS manual score-1 rule 处理。AI suggestion 应基于 pose features 和 FMS manual rule 自行判断，不使用文件名分数作为 scoring source。",
    range: {
      startSecond: "126",
      endSecond: "190",
    },
  },
  "Rotary stability test instructions.mp4": {
    expectedReps: "12",
    notes:
      "Rotary Stability instructions sample。保留12个完整 rep：四足支撑起始位、触碰、完全伸展、再次触碰、复原。结构为前2个侧面、接着4个正面、再2个侧面、最后4个正面；正面段可用于 timing/score，但 side 先保留 unknown，避免误判 left/right。视频里未见单独 clearing test；clearing negative 作为 reviewer metadata 记录。按 FMS manual，同侧模式完成，curated visual suggestion 为 score 3。",
    range: {
      startSecond: "6",
      endSecond: "124",
    },
  },
  "videoplayback (22).mp4": {
    expectedReps: "4",
    notes:
      "Rotary Stability score-1 sample。只取2分钟前内容；0-48秒讲解/摆位不作为 segment。保留4个完整 rep：rep 1 side 59.5-66.0, rep 2 side 76.5-86.0, rep 3 side 91.5-106.0, rep 4 front/angled 108.0-116.5。按 FMS manual，若出现失去平衡、手未触及 lateral malleolus、膝/肘未完全伸展或无法进入起始位，任一条满足即为 score 1；该样本 curated visual suggestion 为 score 1。",
    range: {
      startSecond: "48",
      endSecond: "120",
    },
  },
  "all the reps are right side. first 3 reps score 3, then 1 rep score 1 and 2 reps score 2.mp4":
    {
      expectedReps: "6",
      notes:
        "全部 right side。Hurdle Step 6 reps：前3个 score 3，第4个 score 1，最后2个 score 2。",
    },
  "6reps each side, total 12 reps, score 3 for both sides.mp4": {
    expectedReps: "12",
    notes:
      "Hurdle Step 12 reps score 3：前6个正面，后6个侧面。顺序为正面 right 3 reps、正面 left 3 reps、侧面 right 3 reps、侧面 left 3 reps。只分析 0-127 秒；127 秒后的图片/分屏不作为 segment。",
    range: {
      startSecond: "0",
      endSecond: "127",
    },
  },
  "6 reps score 3.mp4": {
    expectedReps: "6",
    notes:
      "In-Line Lunge 6 reps score-3 sample。当前支持 timing/features 与 first-pass pose-based AI suggestion。",
  },
};

const UI_TEXT = {
  en: {
    title: "FMS Calibration Workbench",
    subtitle:
      "V1 scope: all 7 FMS actions, segment-level scoring and ingest workflow.",
    apiMode: "API mode",
    language: "Language",
    english: "EN",
    chinese: "中文",
    inputJob: "Input & Job",
    demoPreset: "Demo Preset",
    loadDemo: "Load Demo",
    action: "Action",
    uploadVideo: "Upload Video",
    poseJsonOptional: "Pose JSON (optional)",
    video: "Video",
    pose: "Pose",
    frames: "frames",
    visibility: "visibility",
    loadPoseJson: "Load generated MediaPipe JSON to replace the demo skeleton.",
    activePeriodSuggestion: "Effective action detection",
    activePeriodDetected: "recommended range",
    activePeriods: "motion bursts",
    activePeriodDuration: "active duration",
    activePeriodList: "detected periods",
    useActivePeriod: "Use period",
    activePeriodSingleRangeLimit:
      "Segment clips now default to detected movement cycles; multi-period storage remains a later schema review.",
    noActivePeriodSuggestion: "No clear active period detected.",
    applyActivePeriod: "Apply active range",
    startSecond: "Start (s)",
    endSecond: "End (s)",
    expectedReps: "Expected Reps (optional)",
    notes: "Notes (optional)",
    startAnalysis: "Start Analysis",
    job: "Job",
    idle: "idle",
    ingestReadiness: "Ingest Readiness",
    ingestHistory: "Ingest History",
    ingestHistoryEmpty: "No saved ingest batches yet.",
    ingestHistorySaved:
      "Saved locally in this browser. Export JSON for a durable file copy.",
    exportIngestHistory: "Export Ingest History JSON",
    latestIngest: "Latest ingest",
    savedAt: "Saved at",
    completed: "Completed",
    partial: "Partial",
    protocolEvidence: "Protocol evidence",
    ready: "Ready",
    yes: "Yes",
    no: "No",
    checkReadiness: "Check Readiness",
    ingest: "Ingest",
    exportJson: "Export JSON",
    exportCsv: "Export CSV",
    exportPackage: "Export Package",
    consistencySnapshot: "Consistency Snapshot",
    segments: "Segments",
    clips: "clips",
    validLabels: "Valid labels",
    pendingLabels: "Pending labels",
    invalidLabels: "Invalid labels",
    reviewerAgreement: "Reviewer agreement",
    aiFinalAgreement: "AI-final agreement",
    refreshConsistency: "Refresh Consistency",
    exportEvidence: "Export Evidence",
    exportChecklist: "Export Checklist",
    checklistReady: "Ready",
    checklistNeedsReview: "Needs review",
    checklistMissing: "Missing",
    checklistSegmentRecords: "Segment records",
    checklistSegmentRecordsReady: "segments are available for export.",
    checklistSegmentRecordsMissing: "Run analysis to create segment records.",
    checklistReviewerCompletion: "Reviewer completion",
    checklistReviewerCompletionReady:
      "all segment records have Reviewer A and Reviewer B scores.",
    checklistReviewerCompletionPending:
      "segment records still need Reviewer A/B scores.",
    checklistIncomplete: "Incomplete",
    checklistFinalLabels: "Final labels",
    checklistFinalLabelsReady: "all segment records have valid final labels.",
    checklistFinalLabelsPending:
      "pending or invalid labels remain; export is allowed, ingest is blocked.",
    checklistPoseEvidence: "Pose evidence",
    checklistPoseEvidenceReady: "pose evidence is attached to the export.",
    checklistPoseEvidenceMissing:
      "no pose evidence is attached; export remains annotation-only.",
    checklistTimingQa: "Timing QA",
    checklistTimingQaReady: "all timing rows are complete.",
    checklistTimingQaPending: "some timing rows need review.",
    checklistTimingQaMissing: "no pose-assisted timing QA is available.",
    checklistTimingQaBlocked:
      "timing blockers remain; formal ingest is blocked until review.",
    checklistFeaturesReady: "pose features are available.",
    checklistFeaturesPending: "some pose features are missing or limited.",
    checklistFeaturesMissing: "no pose features are available.",
    checklistAiSuggestionsReady: "pose-based AI suggestions are available.",
    checklistAiSuggestionsPending: "some AI suggestions are missing.",
    checklistAiSuggestionsMissing:
      "no pose-based AI suggestions are available.",
    checklistPackageExport: "Dataset package export",
    checklistPackageExportReady: "ZIP export can be generated now.",
    checklistPackageExportMissing:
      "run analysis before generating a dataset package.",
    records: "Records",
    pending: "Pending",
    ok: "OK",
    poseFrames: "Pose frames",
    timingQa: "Timing QA",
    cycleCountQa: "Cycle count QA",
    cycleCountQaOk: "OK",
    cycleCountQaBlocked: "blocked",
    cycleCountQaNeedsReview: "needs review",
    cycleCountQaNotAvailable: "N/A",
    expectedCandidateAssigned: "expected/candidate/assigned",
    timingEdits: "Timing edits",
    avgShift: "Avg shift",
    features: "Features",
    aiSuggestions: "AI suggestions",
    poseEvidenceInExport: "Pose evidence in export",
    reviewer: "Reviewer",
    movementLabels: "Movement Labels",
    movement: "Movement",
    capability: "Capability",
    view: "View",
    total: "Total",
    valid: "Valid",
    invalid: "Invalid",
    protocolEvidenceShort: "protocol evidence",
    playback: "Playback",
    loopSegment: "Loop segment",
    showPose: "Show skeleton",
    demoSkeleton: "Demo skeleton",
    videoPlaceholder:
      "Upload a video and run analysis to start reviewing segments.",
    realPoseOverlay:
      "Real MediaPipe pose overlay from {poseFileName}; sampled frame follows current playback time.",
    demoSkeletonOnly:
      "Demo skeleton only; load Pose JSON to inspect real keypoints.",
    segment: "Segment",
    prev: "Prev",
    next: "Next",
    runAnalysisEmpty: "Run analysis and choose a segment to start scoring.",
    previewingSuggestedTiming: "Previewing suggested timing",
    currentSegmentTiming: "Current segment timing",
    segmentTiming: "Segment timing",
    exitPreview: "Exit preview",
    previewSuggestedTiming: "Preview AI draft timing",
    suggestedTiming: "Suggested timing",
    aiDraftTiming: "AI draft timing",
    aiTimingEvidence: "AI timing evidence",
    detectedCycle: "Detected cycle",
    restoreAiDraftTiming: "Restore AI draft timing",
    rebuildAiDraftTiming: "Rebuild AI draft timing",
    aiDraftTimingFailed: "AI draft timing could not be applied",
    timingStatus: "Timing status",
    timingNeedsReview: "Timing needs review",
    timingAssignedCycleShortfall: "Unique cycle coverage",
    timingAssignedCycleShortfallDetail:
      "Some segments do not have a unique detected movement cycle; review before scoring.",
    timingExtraCandidateCycles: "Extra candidate cycles",
    timingExtraCandidateCyclesDetail:
      "The detector saw additional movement-like periods; confirm the assigned clips are the true reps.",
    candidateCycles: "candidate cycles",
    assignedCycles: "assigned cycles",
    segmentsNeedUniqueCycleReview:
      "segments have no unique movement cycle and will not be auto-trimmed.",
    segmentsNeedDuplicateCycleReview:
      "segments share a detected movement cycle and must be reviewed.",
    aiDraftPartialApply: "AI draft timing can only apply to part of the list",
    aiDraftPartialApplyDetail:
      "Blocked segments remain unchanged until a reviewer adjusts timing or rep count.",
    noUniqueCycleForSegment: "No unique cycle assigned",
    noUniqueCycleForSegmentDetail:
      "This segment could not be matched to a reliable movement cycle. Check whether the video contains this rep, whether Expected Reps is correct, or whether manual timing is needed.",
    timingIssueShort_missing_start: "missing start",
    timingIssueShort_missing_return: "missing return",
    timingIssueShort_too_short: "too short",
    timingIssueShort_wide_lead: "wide lead",
    timingIssueShort_wide_tail: "wide tail",
    timingIssueShort_duplicate_cycle_assignment: "duplicate cycle",
    timingIssueShort_no_unique_cycle_assignment: "no unique cycle",
    timingIssueShort_detected_cycle_shortfall: "cycle shortfall",
    timingIssueShort_assigned_cycle_shortfall: "assignment shortfall",
    timingIssueShort_extra_candidate_cycles: "extra cycles",
    timingIssueShort_insufficient_pose: "low pose",
    timingIssueShort_low_motion_amplitude: "low motion",
    timingIssueShort_insufficient_reach_frames: "low reach evidence",
    timingIssueShort_low_visibility: "low visibility",
    timingIssue_missing_start:
      "Segment starts after the movement has already begun; move the start earlier.",
    timingIssue_missing_return:
      "Segment ends before the movement returns; move the end later.",
    timingIssue_too_short:
      "Segment does not cover the full movement cycle; widen or reselect timing.",
    timingIssue_wide_lead:
      "Segment includes a long lead-in before the movement; trimming is recommended but not blocking.",
    timingIssue_wide_tail:
      "Segment includes a long tail after the movement; trimming is recommended but not blocking.",
    timingIssue_duplicate_cycle_assignment:
      "Multiple segments map to the same detected movement cycle; review rep count or timing before scoring.",
    timingIssue_no_unique_cycle_assignment:
      "No unique movement cycle could be assigned to this segment; review detected reps and segment timing.",
    timingIssue_detected_cycle_shortfall:
      "The detector found fewer movement cycles than expected; review Expected Reps, active range, or timing.",
    timingIssue_assigned_cycle_shortfall:
      "Fewer unique movement cycles were assigned than expected; some clips need manual review.",
    timingIssue_extra_candidate_cycles:
      "The detector found extra candidate cycles; confirm the selected clips are the intended reps.",
    timingIssue_insufficient_pose:
      "Pose trajectory is not reliable enough to suggest timing for this segment.",
    timingIssue_low_motion_amplitude:
      "The movement signal is too small for a reliable timing suggestion.",
    timingIssue_insufficient_reach_frames:
      "Not enough usable shoulder/wrist landmarks are available in this segment.",
    timingIssue_low_visibility:
      "Landmarks are visible but low-confidence; review manually.",
    reviewStatus: "Review status",
    ingestResult: "Ingest Result",
    batch: "Batch",
    reviewerId: "Reviewer ID",
    totalScore: "Total Score",
    scoreNotScored: "Temporarily unable to score",
    comment: "Comment",
    reviewerScoreScope: "Score scope",
    reviewerScoreScopeValue: "Rep-level RAW SCORE",
    reviewerContextAction: "Action",
    positiveClearingScoreWarning:
      "Positive clearing or pain usually leads to RAW SCORE 0; please confirm before saving.",
    clearingConfirmationRequired:
      "Clearing / pain requires human confirmation before ingest.",
    save: "Save",
    aiSuggestion: "AI Suggestion",
    posePipeline: "Pose pipeline",
    aiScoring: "AI scoring",
    posePipeline_implemented: "implemented",
    posePipeline_features_only: "features only",
    posePipeline_annotation_only: "annotation only",
    posePipeline_unknown: "unknown",
    aiScoring_pose_based_ai_suggestion: "pose-based AI suggestion",
    aiScoring_pose_cycle_experimental_suggestion:
      "experimental cycle-based AI suggestion",
    aiScoring_pose_evidence_only: "pose evidence only",
    aiScoring_not_supported_yet: "not supported yet",
    status: "Status",
    source: "Source",
    humanConsensus: "Human Consensus",
    aiHumanMatch: "AI-Human Match",
    none: "None",
    poseBasedSuggestion: "Pose-based suggestion",
    poseBasedAiSuggestion: "Pose-based AI Suggestion",
    experimentalPoseAiSuggestion: "Experimental pose-based AI suggestion",
    experimentalPoseAiSuggestionDetail:
      "Conservative first-pass only. A human reviewer confirms the score, pain, and clearing test.",
    deepSquatStagedScoring: "Deep Squat staged scoring",
    deepSquatNeedsBoardAttemptDetail:
      "This floor attempt did not meet the score-3 path. Review the heels-elevated / FMS board attempts before assigning a Deep Squat final score.",
    rawAttemptEvidence: "Raw attempt evidence",
    poseEvidenceOnly: "Pose Evidence Only",
    poseEvidenceOnlyDetail:
      "Pose features are available for review, but this movement does not have a pose-based AI suggestion yet.",
    annotationOnlyWorkflow: "Annotation-only Workflow",
    annotationOnlyWorkflowDetail:
      "This movement currently supports segment review, human RAW SCORE, adjudication, and export, but no pose-based AI scoring yet.",
    poseAiNotReady: "Pose-based AI Not Ready",
    poseEvidenceGate_ready: "Pose evidence is sufficient for this suggestion.",
    poseEvidenceGate_annotation_only:
      "This movement is currently annotation-only.",
    poseEvidenceGate_missing_pose_evidence:
      "Load a matching Pose JSON before using pose-based AI scoring.",
    poseEvidenceGate_limited_pose_quality:
      "Pose quality is limited, so the result should stay as evidence for manual review.",
    poseEvidenceGate_features_only:
      "Pose features are available, but AI scoring is intentionally disabled for this movement.",
    poseEvidenceGate_limited_features:
      "Pose features are incomplete for this segment.",
    poseEvidenceGate_missing_timing:
      "Pose timing evidence is not available for this segment.",
    poseEvidenceGate_timing_needs_review:
      "Timing QA needs review before using pose-based AI scoring.",
    poseEvidenceGate_insufficient_features:
      "Movement features are insufficient for a responsible AI suggestion.",
    poseEvidenceGate_insufficient_ai_suggestion:
      "The model did not produce a usable pose-based suggestion for this segment.",
    poseEvidenceGate_deep_squat_needs_heel_elevated_attempt:
      "Deep Squat staged scoring requires a heels-elevated / FMS board attempt before assigning the final score.",
    poseEvidenceGate_unknown_action:
      "This action is not registered in the movement capability schema.",
    confidence: "confidence",
    confidence_high: "high",
    confidence_medium: "medium",
    confidence_low: "low",
    poseVsFinalPending: "Pose vs final: pending final label",
    poseVsFinalMatch: "Pose vs final: match",
    poseVsFinalDiffers: "Pose vs final: differs",
    suggestedScore: "suggested score",
    notScoredFromThisView: "not scored from this camera view.",
    reason_depth: "Depth",
    reason_kneeAlignment: "Knee Alignment",
    reason_torsoControl: "Torso Control",
    reason_hipFlexion: "Hip Flexion",
    reason_activeLegRaise: "Active Leg Raise",
    reason_stationaryLegControl: "Stationary Leg Control",
    reason_pelvicStability: "Pelvic Stability",
    reason_legLine: "Leg Line",
    reason_sideConfidence: "Side Confidence",
    reason_hurdleClearance: "Hurdle Clearance",
    reason_stanceLegControl: "Stance Leg Control",
    reason_pelvisTrunkControl: "Pelvis Trunk Control",
    reason_stepLegAlignment: "Step Leg Alignment",
    reason_stepClearance: "Step Clearance",
    reason_stanceStability: "Stance Stability",
    reason_trunkControl: "Trunk Control",
    reason_lungeDepthZone: "Lunge Depth Zone",
    reason_trunkPelvisControl: "Trunk Pelvis Control",
    reason_rearLegControl: "Rear Leg Control",
    reason_frontKneeFootLine: "Front Knee-foot Line",
    reason_lungeDepth: "Lunge Depth",
    reason_trunkAlignment: "Trunk Alignment",
    reason_kneeFootAlignment: "Knee-foot Alignment",
    "reason_depth_hip below knee":
      "Evidence: hip is below the knee at the lowest point, so squat depth supports a high score.",
    "reason_depth_near parallel":
      "Evidence: hip is near knee height at the lowest point, so depth is acceptable but should be reviewed.",
    "reason_depth_limited depth":
      "Evidence: hip remains above the knee at the lowest point, suggesting limited squat depth.",
    "reason_kneeAlignment_knees track feet":
      "Evidence: knees stay close to the ankle/foot line in the usable view, supporting good alignment.",
    "reason_kneeAlignment_mild knee drift":
      "Evidence: knees show mild drift from the ankle/foot line, so this subscore should be reviewed.",
    "reason_kneeAlignment_large knee drift":
      "Evidence: knees drift far from the ankle/foot line, suggesting limited alignment control.",
    "reason_torsoControl_controlled trunk":
      "Evidence: trunk lean is within the controlled range at the lowest point.",
    "reason_torsoControl_forward lean watch":
      "Evidence: trunk lean is somewhat high, so torso control should be reviewed.",
    "reason_torsoControl_excessive forward lean":
      "Evidence: trunk lean is high enough to suggest limited torso control.",
    "reason_hipFlexion_leg reaches high":
      "Evidence: the raised ankle is clearly above the hip proxy at the peak of the leg raise.",
    "reason_hipFlexion_moderate leg raise":
      "Evidence: the leg raise is visible but the peak height is moderate, so this should be reviewed.",
    "reason_hipFlexion_limited leg raise":
      "Evidence: the raised ankle stays near or below the hip proxy, suggesting limited hip flexion.",
    "reason_activeLegRaise_score 3 raise zone":
      "Evidence: the raised ankle reaches the high ASLR proxy zone for this first-pass model.",
    "reason_activeLegRaise_score 2 raise zone":
      "Evidence: the raised ankle reaches a moderate ASLR proxy zone and should be reviewed.",
    "reason_activeLegRaise_score 1 raise zone":
      "Evidence: the raised ankle remains low for this ASLR proxy, suggesting limited leg raise.",
    "reason_stationaryLegControl_stable down leg":
      "Evidence: the down leg stays straight and stable enough for this first-pass proxy.",
    "reason_stationaryLegControl_down leg control watch":
      "Evidence: the down leg shows mild movement or bend and should be reviewed.",
    "reason_stationaryLegControl_down leg compensation watch":
      "Evidence: the down leg shows enough movement or bend to suggest compensation.",
    "reason_pelvicStability_stable pelvis proxy":
      "Evidence: left/right hip height remains close enough for this first-pass pelvis stability proxy.",
    "reason_pelvicStability_pelvic shift watch":
      "Evidence: the hip-height gap suggests possible pelvic compensation and should be reviewed.",
    "reason_pelvicStability_pelvic compensation watch":
      "Evidence: the hip-height gap is large enough to flag possible pelvic compensation.",
    "reason_legLine_straight leg line":
      "Evidence: the hip-knee-ankle angle stays close to a straight leg line.",
    "reason_legLine_mild knee bend":
      "Evidence: the raised leg has a mild knee bend and should be reviewed.",
    "reason_legLine_bent knee watch":
      "Evidence: the raised leg bends enough to weaken the straight-leg evidence.",
    "reason_sideConfidence_right side detected":
      "Evidence: the timing cycle and landmarks consistently indicate the right side.",
    "reason_sideConfidence_left side detected":
      "Evidence: the timing cycle and landmarks consistently indicate the left side.",
    "reason_sideConfidence_right side low visibility":
      "Evidence: right-side landmarks are visible but lower-confidence, so the suggestion should be reviewed.",
    "reason_sideConfidence_left side low visibility":
      "Evidence: left-side landmarks are visible but lower-confidence, so the suggestion should be reviewed.",
    "reason_hurdleClearance_score 3 clearance zone":
      "Evidence: the moving leg reaches the stronger Hurdle Step clearance proxy zone, supporting a high raw-score suggestion for this criterion.",
    "reason_hurdleClearance_score 2 clearance zone":
      "Evidence: the moving leg clears in a moderate proxy zone; the rep is usable but should be checked by the reviewer.",
    "reason_hurdleClearance_score 1 clearance zone":
      "Evidence: the moving leg stays low in this Hurdle Step proxy, suggesting limited clearance or an incomplete step pattern.",
    "reason_stanceLegControl_stable stance leg":
      "Evidence: the stance leg remains straight enough and the stance ankle stays stable during the detected step cycle.",
    "reason_stanceLegControl_stance leg control watch":
      "Evidence: the stance leg shows mild bend or ankle drift, so balance and control should be reviewed.",
    "reason_stanceLegControl_stance leg compensation watch":
      "Evidence: the stance leg shows enough bend or ankle drift to flag possible compensation.",
    "reason_pelvisTrunkControl_controlled pelvis trunk":
      "Evidence: the shoulder/hip centers and hip-height proxy remain controlled during the step peak.",
    "reason_pelvisTrunkControl_pelvis trunk shift watch":
      "Evidence: the pelvis or trunk proxy shifts during the step peak and should be reviewed.",
    "reason_pelvisTrunkControl_large pelvis trunk shift":
      "Evidence: pelvis/trunk shift is large enough to weaken this Hurdle Step control evidence.",
    "reason_stepLegAlignment_aligned stepping leg":
      "Evidence: the moving hip-knee-ankle line stays aligned enough at the step peak.",
    "reason_stepLegAlignment_mild stepping leg drift":
      "Evidence: the moving leg line has mild knee drift or bend and should be reviewed.",
    "reason_stepLegAlignment_stepping leg alignment watch":
      "Evidence: the moving leg line shows enough drift or bend to weaken the knee-ankle-line evidence.",
    "reason_stepClearance_clear step height proxy":
      "Evidence: the moving foot clears the obstacle-height proxy with a strong step signal.",
    "reason_stepClearance_moderate step height":
      "Evidence: step clearance is visible but moderate, so this criterion should be reviewed.",
    "reason_stepClearance_low step clearance watch":
      "Evidence: the moving foot has limited clearance, suggesting the step pattern may be limited.",
    "reason_stanceStability_stable stance proxy":
      "Evidence: the stance-side ankle remains stable during the step cycle.",
    "reason_stanceStability_stance drift watch":
      "Evidence: the stance-side ankle drifts during the step cycle and should be reviewed.",
    "reason_stanceStability_large stance drift":
      "Evidence: stance-side drift is large enough to suggest limited balance control.",
    "reason_trunkControl_controlled trunk proxy":
      "Evidence: shoulder and hip centers stay aligned enough for this first-pass trunk-control proxy.",
    "reason_trunkControl_trunk shift watch":
      "Evidence: trunk center shift is visible and should be reviewed.",
    "reason_trunkControl_large trunk shift":
      "Evidence: trunk shift is large enough to suggest limited control.",
    "reason_lungeDepthZone_score 3 lunge depth zone":
      "Evidence: the lunge reaches the stronger In-Line Lunge depth proxy zone, supporting a high raw-score suggestion for this criterion.",
    "reason_lungeDepthZone_score 2 lunge depth zone":
      "Evidence: the lunge depth is in a moderate proxy zone; the rep is usable but should be checked by the reviewer.",
    "reason_lungeDepthZone_score 1 lunge depth zone":
      "Evidence: the lunge remains shallow in this proxy, suggesting limited depth or an incomplete pattern.",
    "reason_trunkPelvisControl_controlled trunk pelvis":
      "Evidence: shoulder/hip center alignment and hip-height proxy remain controlled near the lunge peak.",
    "reason_trunkPelvisControl_trunk pelvis shift watch":
      "Evidence: the trunk or pelvis proxy shifts near the lunge peak and should be reviewed.",
    "reason_trunkPelvisControl_large trunk pelvis shift":
      "Evidence: trunk/pelvis shift is large enough to weaken this In-Line Lunge stability evidence.",
    "reason_rearLegControl_stable rear leg proxy":
      "Evidence: the rear-side ankle stays stable enough during the lunge cycle for this proxy.",
    "reason_rearLegControl_rear foot drift watch":
      "Evidence: the rear foot shows mild drift during the lunge cycle and should be reviewed.",
    "reason_rearLegControl_rear leg control watch":
      "Evidence: the rear leg has low visibility or enough foot drift to weaken the control evidence.",
    "reason_frontKneeFootLine_front knee tracks foot":
      "Evidence: the front knee stays close to the foot line in the usable view.",
    "reason_frontKneeFootLine_front knee-foot line watch":
      "Evidence: the front knee-foot line has visible offset and should be reviewed.",
    "reason_frontKneeFootLine_large front knee-foot offset":
      "Evidence: the front knee-foot offset is large enough to weaken the foot-knee alignment evidence.",
    "reason_lungeDepth_deep lunge proxy":
      "Evidence: the lunge reaches a strong depth proxy, supporting the lunge-depth criterion.",
    "reason_lungeDepth_moderate lunge depth":
      "Evidence: lunge depth is visible but moderate, so this criterion should be reviewed.",
    "reason_lungeDepth_limited lunge depth":
      "Evidence: lunge depth appears limited in this pose window.",
    "reason_trunkAlignment_controlled trunk proxy":
      "Evidence: shoulder and hip centers stay aligned enough for this first-pass trunk-stability proxy.",
    "reason_trunkAlignment_trunk shift watch":
      "Evidence: trunk center shift is visible and should be reviewed.",
    "reason_trunkAlignment_large trunk shift":
      "Evidence: trunk shift is large enough to suggest limited trunk stability.",
    "reason_kneeFootAlignment_knee tracks foot proxy":
      "Evidence: the lead-side knee stays close to the foot line in the usable view.",
    "reason_kneeFootAlignment_knee-foot offset watch":
      "Evidence: the knee-foot offset is visible and should be reviewed.",
    "reason_kneeFootAlignment_large knee-foot offset":
      "Evidence: knee-foot offset is large enough to suggest limited alignment control.",
    "reason_view_best from front view":
      "This criterion is more reliable from a front-view video, so the current value is kept as context rather than final evidence.",
    "reason_view_best from side view":
      "This criterion is more reliable from a side-view video, so the current value is kept as context rather than final evidence.",
    reason_timingNeedsAdjustment:
      "Timing QA indicates the segment may need adjustment before final scoring; review the suggested timing first.",
    segmentMetadata: "Segment Metadata",
    attemptCondition: "Attempt condition",
    attemptCondition_floor: "floor",
    attemptCondition_heels_elevated_board: "heels elevated / FMS board",
    attemptCondition_unknown: "unknown",
    suggested: "suggested",
    lowest: "lowest",
    coverage: "coverage",
    segmentCoversCycle: "Segment covers the detected movement cycle.",
    applySuggestedTiming: "Apply Suggested Timing",
    side: "Side",
    clearingTest: "Clearing Test",
    sideOption_none: "none",
    sideOption_unknown: "unknown",
    sideOption_left: "left",
    sideOption_right: "right",
    clearingFinding_ankle_clearing_pain: "Ankle Clearing - Pain",
    clearingFinding_ankle_clearing_mobility: "Ankle Clearing - Mobility",
    clearingFinding_shoulder_clearing: "Shoulder Clearing",
    clearingFinding_extension_clearing: "Extension Clearing",
    clearingFinding_flexion_clearing: "Flexion Clearing",
    clearingResult_not_applicable: "not applicable",
    clearingResult_not_tested: "not tested",
    clearingResult_negative: "negative (-)",
    clearingResult_positive: "positive (+)",
    clearingResult_unknown: "unknown",
    clearingResult_green: "green",
    clearingResult_yellow: "yellow",
    clearingResult_red: "red",
    rubricVersion: "Rubric Version",
    painFlag: "Pain flag",
    saveSegmentMetadata: "Save Segment Metadata",
    segmentTimingQa: "Segment Timing QA",
    cycles: "cycles",
    applyAllSuggestedTiming: "Apply All Suggested Timing",
    noCycle: "No cycle",
    deepSquatFeatures: "Deep Squat Features",
    activeStraightLegRaiseFeatures: "Active Straight Leg Raise Features",
    shoulderMobilityFeatures: "Shoulder Mobility Features",
    hurdleStepFeatures: "Hurdle Step Features",
    inlineLungeFeatures: "In-Line Lunge Features",
    trunkStabilityPushUpFeatures: "Trunk Stability Push-Up Features",
    rotaryStabilityFeatures: "Rotary Stability Features",
    usable: "usable",
    depth: "Depth",
    torso: "Torso",
    knee: "Knee",
    hipAngle: "Hip angle",
    kneeAngle: "Knee angle",
    ankleProxy: "Ankle proxy",
    hipFlexion: "Hip Flexion",
    activeLegRaise: "Active Leg Raise",
    kneeExtension: "Knee Extension",
    stationaryLegControl: "Stationary Leg Control",
    pelvicStability: "Pelvic Stability",
    sideConfidence: "Side Confidence",
    reachDistance: "Reach Distance",
    handVisibility: "Hand Visibility",
    shoulderReference: "Shoulder Reference",
    sideContext: "Side Context",
    hurdleClearance: "Hurdle Clearance",
    stanceLegControl: "Stance Leg Control",
    pelvisTrunkControl: "Pelvis Trunk Control",
    stepLegAlignment: "Step Leg Alignment",
    stepClearance: "Step Clearance",
    stanceStability: "Stance Stability",
    trunkControl: "Trunk Control",
    lungeDepthZone: "Lunge Depth Zone",
    trunkPelvisControl: "Trunk Pelvis Control",
    rearLegControl: "Rear Leg Control",
    frontKneeFootLine: "Front Knee-foot Line",
    lungeDepth: "Lunge Depth",
    trunkAlignment: "Trunk Alignment",
    kneeFootAlignment: "Knee-Foot Alignment",
    coreStability: "Core Stability",
    pushUpPattern: "Push-Up Pattern",
    armExtension: "Arm Extension",
    compensation: "Compensation",
    trunkVisibility: "Trunk Visibility",
    rotaryDiagonalControl: "Rotary Diagonal Control",
    trunkRotationControl: "Trunk Rotation Control",
    balanceStability: "Balance Stability",
    statusReady: "Ready",
    statusLimited: "Limited",
    statusInvalid: "Invalid",
    statusMissingPose: "No pose JSON",
    unknown: "Unknown",
    uploadVideoFirst: "Please upload a video file first.",
    invalidStartEnd: "Start/End second is invalid.",
    invalidExpectedReps: "Expected reps must be a positive integer.",
    reviewerIdRequired: "Reviewer ID is required before saving.",
    timingIngestBlocked:
      "Timing QA still has blockers. Review or adjust segment timing before ingest.",
    clearingIngestBlocked:
      "Clearing / pain confirmation is required before ingest.",
    analysisFailed: "Analysis failed.",
  },
  zh: {
    title: "FMS Calibration Workbench",
    subtitle:
      "V1 范围：7 个 FMS actions、segment-level scoring 与 ingest workflow。",
    apiMode: "API 模式",
    language: "语言",
    english: "EN",
    chinese: "中文",
    inputJob: "输入与任务",
    demoPreset: "Demo Preset",
    loadDemo: "加载 Demo",
    action: "Action",
    uploadVideo: "上传视频",
    poseJsonOptional: "Pose JSON（可选）",
    video: "视频",
    pose: "Pose",
    frames: "帧",
    visibility: "可见度",
    loadPoseJson: "加载 MediaPipe JSON 后会替换 demo skeleton。",
    activePeriodSuggestion: "有效动作检测摘要",
    activePeriodDetected: "建议范围",
    activePeriods: "活跃片段",
    activePeriodDuration: "有效动作时长",
    activePeriodList: "检测到的时间段",
    useActivePeriod: "使用片段",
    activePeriodSingleRangeLimit:
      "当前 segment clips 会默认使用检测到的动作周期；真正的多区间存储仍需要后续评审 schema。",
    noActivePeriodSuggestion: "暂未检测到清晰的有效动作时间段。",
    applyActivePeriod: "应用有效范围",
    startSecond: "开始 (s)",
    endSecond: "结束 (s)",
    expectedReps: "Expected Reps（可选）",
    notes: "备注（可选）",
    startAnalysis: "开始分析",
    job: "任务",
    idle: "空闲",
    ingestReadiness: "入库准备",
    ingestHistory: "入库历史",
    ingestHistoryEmpty: "还没有保存过入库批次。",
    ingestHistorySaved:
      "已保存在当前浏览器本地。请导出 JSON，作为真正长期保存的文件副本。",
    exportIngestHistory: "导出入库历史 JSON",
    latestIngest: "最近入库",
    savedAt: "保存时间",
    completed: "已完成",
    partial: "部分完成",
    protocolEvidence: "流程证据",
    ready: "Ready",
    yes: "是",
    no: "否",
    checkReadiness: "检查准备状态",
    ingest: "入库",
    exportJson: "导出 JSON",
    exportCsv: "导出 CSV",
    exportPackage: "导出 Package",
    consistencySnapshot: "一致性快照",
    segments: "分段",
    clips: "段",
    validLabels: "有效标签",
    pendingLabels: "待标注",
    invalidLabels: "无效标签",
    reviewerAgreement: "Reviewer 一致率",
    aiFinalAgreement: "AI-final 一致率",
    refreshConsistency: "刷新一致性",
    exportEvidence: "导出证据",
    exportChecklist: "导出检查清单",
    checklistReady: "就绪",
    checklistNeedsReview: "需复核",
    checklistMissing: "缺失",
    checklistSegmentRecords: "Segment 记录",
    checklistSegmentRecordsReady: "已有 segment records，可以导出。",
    checklistSegmentRecordsMissing: "请先运行分析，生成 segment records。",
    checklistReviewerCompletion: "Reviewer 完成度",
    checklistReviewerCompletionReady:
      "所有 segment 都已有 Reviewer A 和 Reviewer B 评分。",
    checklistReviewerCompletionPending:
      "个 segment 还没有完成 Reviewer A/B 双评分。",
    checklistIncomplete: "未完成",
    checklistFinalLabels: "最终标签",
    checklistFinalLabelsReady: "所有 segment 都已有有效 final label。",
    checklistFinalLabelsPending:
      "仍有 pending 或 invalid label；可以导出，但不能正式入库。",
    checklistPoseEvidence: "Pose evidence",
    checklistPoseEvidenceReady: "导出包会包含 pose evidence。",
    checklistPoseEvidenceMissing:
      "当前没有 pose evidence；导出仍可用，但只是 annotation-only。",
    checklistTimingQa: "Timing QA",
    checklistTimingQaReady: "所有 timing rows 都完整。",
    checklistTimingQaPending: "部分 timing rows 还需要复核。",
    checklistTimingQaMissing: "当前没有 pose-assisted timing QA。",
    checklistTimingQaBlocked:
      "仍有 timing blocker；复核前不能进入正式 ingest。",
    checklistFeaturesReady: "pose features 已可用。",
    checklistFeaturesPending: "部分 pose features 缺失或受限。",
    checklistFeaturesMissing: "当前没有 pose features。",
    checklistAiSuggestionsReady: "基于 pose 的 AI 建议已可用。",
    checklistAiSuggestionsPending: "部分 AI 建议缺失。",
    checklistAiSuggestionsMissing: "当前没有基于 pose 的 AI 建议。",
    checklistPackageExport: "Dataset package 导出",
    checklistPackageExportReady: "现在可以生成 ZIP 导出包。",
    checklistPackageExportMissing: "请先运行分析，再生成 dataset package。",
    records: "记录",
    pending: "待处理",
    ok: "OK",
    poseFrames: "Pose 帧",
    timingQa: "Timing QA",
    cycleCountQa: "动作周期 QA",
    cycleCountQaOk: "OK",
    cycleCountQaBlocked: "已阻断",
    cycleCountQaNeedsReview: "需复核",
    cycleCountQaNotAvailable: "N/A",
    expectedCandidateAssigned: "预期/候选/已分配",
    timingEdits: "Timing 调整",
    avgShift: "平均偏移",
    features: "Features",
    aiSuggestions: "AI 建议",
    poseEvidenceInExport: "导出包含 pose evidence",
    reviewer: "Reviewer",
    movementLabels: "Movement 标签",
    movement: "Movement",
    capability: "能力",
    view: "视角",
    total: "总数",
    valid: "有效",
    invalid: "无效",
    protocolEvidenceShort: "流程证据",
    playback: "播放",
    loopSegment: "循环 segment",
    showPose: "显示骨骼",
    demoSkeleton: "Demo skeleton",
    videoPlaceholder: "上传视频并运行分析后开始 review segments。",
    realPoseOverlay:
      "真实 MediaPipe pose overlay：{poseFileName}；采样帧会跟随当前播放时间。",
    demoSkeletonOnly:
      "当前只是 demo skeleton；加载 Pose JSON 后可查看真实 keypoints。",
    segment: "Segment",
    prev: "上一个",
    next: "下一个",
    runAnalysisEmpty: "运行分析并选择一个 segment 后开始评分。",
    previewingSuggestedTiming: "正在预览建议 timing",
    currentSegmentTiming: "当前 segment timing",
    segmentTiming: "Segment timing",
    exitPreview: "退出预览",
    previewSuggestedTiming: "预览 AI draft timing",
    suggestedTiming: "建议 timing",
    aiDraftTiming: "AI draft timing",
    aiTimingEvidence: "AI timing 证据",
    detectedCycle: "检测到的动作周期",
    restoreAiDraftTiming: "恢复 AI draft timing",
    rebuildAiDraftTiming: "重新生成 AI draft timing",
    aiDraftTimingFailed: "AI draft timing 未能自动应用",
    timingStatus: "Timing 状态",
    timingNeedsReview: "Timing 需要复核",
    timingAssignedCycleShortfall: "唯一动作周期覆盖",
    timingAssignedCycleShortfallDetail:
      "部分 segment 没有匹配到唯一动作周期，评分前需要人工复核。",
    timingExtraCandidateCycles: "额外候选动作周期",
    timingExtraCandidateCyclesDetail:
      "系统看到了更多像动作的时间段，需要确认已分配的 clips 才是真正 reps。",
    candidateCycles: "候选周期",
    assignedCycles: "已分配周期",
    segmentsNeedUniqueCycleReview:
      "个 segment 没有唯一动作周期，不会被自动切片。",
    segmentsNeedDuplicateCycleReview:
      "个 segment 共享同一个动作周期，必须人工复核。",
    aiDraftPartialApply: "AI draft timing 只能应用到部分 segment",
    aiDraftPartialApplyDetail:
      "被 blocker 拦住的 segment 会保持原 timing，直到人工调整 timing 或 rep count。",
    noUniqueCycleForSegment: "未匹配到唯一动作周期",
    noUniqueCycleForSegmentDetail:
      "这个 segment 暂时无法匹配到可靠动作周期。请检查视频里是否真的包含这一 rep、Expected Reps 是否正确，或者是否需要手动调整 timing。",
    timingIssueShort_missing_start: "缺开始",
    timingIssueShort_missing_return: "缺回程",
    timingIssueShort_too_short: "太短",
    timingIssueShort_wide_lead: "前段过长",
    timingIssueShort_wide_tail: "尾段过长",
    timingIssueShort_duplicate_cycle_assignment: "重复 cycle",
    timingIssueShort_no_unique_cycle_assignment: "无唯一 cycle",
    timingIssueShort_detected_cycle_shortfall: "cycle 不足",
    timingIssueShort_assigned_cycle_shortfall: "分配不足",
    timingIssueShort_extra_candidate_cycles: "额外 cycle",
    timingIssueShort_insufficient_pose: "Pose 不足",
    timingIssueShort_low_motion_amplitude: "动作信号弱",
    timingIssueShort_insufficient_reach_frames: "reach 证据少",
    timingIssueShort_low_visibility: "可见度低",
    timingIssue_missing_start:
      "Segment 的开始晚于动作开始，需要把开始时间往前调。",
    timingIssue_missing_return:
      "Segment 的结束早于动作回程结束，需要把结束时间往后调。",
    timingIssue_too_short:
      "Segment 没有覆盖完整动作周期，需要放宽或重新选择 timing。",
    timingIssue_wide_lead:
      "Segment 包含较长动作前等待时间，建议裁短，但不是强 blocker。",
    timingIssue_wide_tail:
      "Segment 包含较长动作后尾段，建议裁短，但不是强 blocker。",
    timingIssue_duplicate_cycle_assignment:
      "多个 segment 映射到了同一个检测动作周期；评分前请复核 rep count 或 timing。",
    timingIssue_no_unique_cycle_assignment:
      "这个 segment 没有匹配到唯一动作周期；请复核检测到的 reps 和 segment timing。",
    timingIssue_detected_cycle_shortfall:
      "检测到的动作周期少于预期；请复核 Expected Reps、有效范围或 timing。",
    timingIssue_assigned_cycle_shortfall:
      "已分配的唯一动作周期少于预期；部分 clips 需要人工复核。",
    timingIssue_extra_candidate_cycles:
      "系统检测到额外候选动作周期；请确认已选 clips 是否是真正 reps。",
    timingIssue_insufficient_pose:
      "Pose 轨迹不足以为这个 segment 可靠建议 timing。",
    timingIssue_low_motion_amplitude:
      "动作信号幅度太小，暂时不能生成可靠 timing 建议。",
    timingIssue_insufficient_reach_frames:
      "这个 segment 中可用的肩/手腕关键点帧数不足。",
    timingIssue_low_visibility: "关键点可见度偏低，需要人工复核。",
    reviewStatus: "Review 状态",
    ingestResult: "入库结果",
    batch: "批次",
    reviewerId: "Reviewer ID",
    totalScore: "总分",
    scoreNotScored: "暂时无法打分",
    comment: "评论",
    reviewerScoreScope: "评分范围",
    reviewerScoreScopeValue: "当前 rep 的 RAW SCORE",
    reviewerContextAction: "动作",
    positiveClearingScoreWarning:
      "Clearing 阳性或 pain flag 通常意味着 RAW SCORE 应为 0；保存前请人工确认。",
    clearingConfirmationRequired:
      "入库前需要人工确认 clearing / pain；AI 不会自动判定疼痛。",
    save: "保存",
    aiSuggestion: "AI 建议",
    posePipeline: "Pose pipeline",
    aiScoring: "AI scoring",
    posePipeline_implemented: "已接入",
    posePipeline_features_only: "仅 features",
    posePipeline_annotation_only: "仅人工标注",
    posePipeline_unknown: "unknown",
    aiScoring_pose_based_ai_suggestion: "基于 pose 的 AI 建议",
    aiScoring_pose_cycle_experimental_suggestion: "实验性周期规则 AI 建议",
    aiScoring_pose_evidence_only: "仅 pose evidence",
    aiScoring_not_supported_yet: "暂未支持",
    status: "状态",
    source: "来源",
    humanConsensus: "人工一致",
    aiHumanMatch: "AI-人工匹配",
    none: "无",
    poseBasedSuggestion: "基于 pose 的建议",
    poseBasedAiSuggestion: "基于 Pose 的 AI 建议",
    experimentalPoseAiSuggestion: "实验性 Pose AI 建议",
    experimentalPoseAiSuggestionDetail:
      "仅作为保守的 first-pass 建议；最终分数、疼痛与 clearing test 仍由人工确认。",
    deepSquatStagedScoring: "Deep Squat 分阶段评分",
    deepSquatNeedsBoardAttemptDetail:
      "这个 floor attempt 没有达到 3 分路径；需要复核脚跟垫高 / FMS board attempts 后，才能给 Deep Squat 最终分。",
    rawAttemptEvidence: "Attempt evidence 原始判断",
    poseEvidenceOnly: "仅显示 Pose 证据",
    poseEvidenceOnlyDetail:
      "当前动作已经有 pose features 可供人工复核，但还没有接入 pose-based AI suggestion。",
    annotationOnlyWorkflow: "仅人工标注流程",
    annotationOnlyWorkflowDetail:
      "当前动作支持 segment review、人工 RAW SCORE、仲裁和导出，但暂不提供基于 pose 的 AI 打分。",
    poseAiNotReady: "基于 Pose 的 AI 暂不可用",
    poseEvidenceGate_ready: "Pose evidence 足以支持当前建议。",
    poseEvidenceGate_annotation_only: "当前动作仍是 annotation-only。",
    poseEvidenceGate_missing_pose_evidence:
      "请先加载匹配的 Pose JSON，再使用基于 pose 的 AI 打分。",
    poseEvidenceGate_limited_pose_quality:
      "Pose 质量有限，因此只能作为人工复核 evidence。",
    poseEvidenceGate_features_only:
      "当前动作已有 pose features，但有意不开放 AI 打分。",
    poseEvidenceGate_limited_features: "当前 segment 的 pose features 不完整。",
    poseEvidenceGate_missing_timing:
      "当前 segment 没有可用的 pose timing evidence。",
    poseEvidenceGate_timing_needs_review:
      "Timing QA 需要复核后，才能使用基于 pose 的 AI 打分。",
    poseEvidenceGate_insufficient_features:
      "动作 features 不足，暂时不能负责任地生成 AI 建议。",
    poseEvidenceGate_insufficient_ai_suggestion:
      "模型没有为当前 segment 生成可用的 pose-based suggestion。",
    poseEvidenceGate_deep_squat_needs_heel_elevated_attempt:
      "Deep Squat 的 staged scoring 需要先复核脚跟垫高 / FMS board attempt，再给最终分。",
    poseEvidenceGate_unknown_action:
      "当前动作还没有注册到 movement capability schema。",
    confidence: "置信度",
    confidence_high: "高",
    confidence_medium: "中",
    confidence_low: "低",
    poseVsFinalPending: "Pose vs final：等待最终标签",
    poseVsFinalMatch: "Pose vs final：一致",
    poseVsFinalDiffers: "Pose vs final：不一致",
    suggestedScore: "建议",
    notScoredFromThisView: "当前机位不适合直接评分。",
    reason_depth: "Depth",
    reason_kneeAlignment: "Knee Alignment",
    reason_torsoControl: "Torso Control",
    reason_hipFlexion: "Hip Flexion",
    reason_activeLegRaise: "Active Leg Raise",
    reason_stationaryLegControl: "Stationary Leg Control",
    reason_pelvicStability: "Pelvic Stability",
    reason_legLine: "Leg Line",
    reason_sideConfidence: "Side Confidence",
    reason_hurdleClearance: "Hurdle Clearance",
    reason_stanceLegControl: "Stance Leg Control",
    reason_pelvisTrunkControl: "Pelvis Trunk Control",
    reason_stepLegAlignment: "Step Leg Alignment",
    reason_stepClearance: "Step Clearance",
    reason_stanceStability: "Stance Stability",
    reason_trunkControl: "Trunk Control",
    reason_lungeDepthZone: "Lunge Depth Zone",
    reason_trunkPelvisControl: "Trunk Pelvis Control",
    reason_rearLegControl: "Rear Leg Control",
    reason_frontKneeFootLine: "Front Knee-foot Line",
    reason_lungeDepth: "Lunge Depth",
    reason_trunkAlignment: "Trunk Alignment",
    reason_kneeFootAlignment: "Knee-foot Alignment",
    "reason_depth_hip below knee":
      "依据是 hip below knee：最低点时髋部已经低于膝盖，深度证据支持较高评分。",
    "reason_depth_near parallel":
      "依据是 near parallel：最低点时髋部接近膝盖高度，深度基本可用但建议人工复核。",
    "reason_depth_limited depth":
      "依据是 limited depth：最低点时髋部仍高于膝盖，提示深蹲深度可能不足。",
    "reason_kneeAlignment_knees track feet":
      "依据是 knees track feet：膝盖相对脚踝/足部线的偏移较小，对齐表现较好。",
    "reason_kneeAlignment_mild knee drift":
      "依据是 mild knee drift：膝盖相对脚踝/足部线有轻微偏移，建议人工复核。",
    "reason_kneeAlignment_large knee drift":
      "依据是 large knee drift：膝盖偏移较明显，提示 knee alignment control 可能不足。",
    "reason_torsoControl_controlled trunk":
      "依据是 controlled trunk：最低点时躯干前倾仍在可控范围内。",
    "reason_torsoControl_forward lean watch":
      "依据是 forward lean watch：躯干前倾略高，建议人工复核 torso control。",
    "reason_torsoControl_excessive forward lean":
      "依据是 excessive forward lean：躯干前倾较明显，提示 torso control 可能不足。",
    "reason_hipFlexion_leg reaches high":
      "依据是 leg reaches high：抬腿最高点时脚踝明显高于髋部 proxy，hip flexion 证据较好。",
    "reason_hipFlexion_moderate leg raise":
      "依据是 moderate leg raise：可以看到抬腿，但最高点高度中等，建议人工复核。",
    "reason_hipFlexion_limited leg raise":
      "依据是 limited leg raise：脚踝接近或低于髋部 proxy，提示 hip flexion 可能受限。",
    "reason_activeLegRaise_score 3 raise zone":
      "依据是 score 3 raise zone：抬腿脚踝进入第一版 ASLR 高位 proxy 区间。",
    "reason_activeLegRaise_score 2 raise zone":
      "依据是 score 2 raise zone：抬腿高度处于中等 proxy 区间，建议人工复核。",
    "reason_activeLegRaise_score 1 raise zone":
      "依据是 score 1 raise zone：抬腿脚踝仍偏低，提示 active leg raise 可能受限。",
    "reason_stationaryLegControl_stable down leg":
      "依据是 stable down leg：支撑腿在第一版 proxy 中保持伸直和稳定。",
    "reason_stationaryLegControl_down leg control watch":
      "依据是 down leg control watch：支撑腿有轻微移动或弯曲，建议人工复核。",
    "reason_stationaryLegControl_down leg compensation watch":
      "依据是 down leg compensation watch：支撑腿移动或弯曲较明显，提示可能有代偿。",
    "reason_pelvicStability_stable pelvis proxy":
      "依据是 stable pelvis proxy：左右髋高度差在第一版 proxy 的可接受范围内。",
    "reason_pelvicStability_pelvic shift watch":
      "依据是 pelvic shift watch：左右髋高度差提示可能有骨盆代偿，建议人工复核。",
    "reason_pelvicStability_pelvic compensation watch":
      "依据是 pelvic compensation watch：左右髋高度差较大，提示可能存在骨盆代偿。",
    "reason_legLine_straight leg line":
      "依据是 straight leg line：hip-knee-ankle 角度接近伸直，直腿线条证据较好。",
    "reason_legLine_mild knee bend":
      "依据是 mild knee bend：抬腿侧膝盖有轻微弯曲，建议人工复核。",
    "reason_legLine_bent knee watch":
      "依据是 bent knee watch：抬腿侧膝盖弯曲较明显，会削弱 straight-leg evidence。",
    "reason_sideConfidence_right side detected":
      "依据是 right side detected：timing cycle 与关键点稳定指向右侧。",
    "reason_sideConfidence_left side detected":
      "依据是 left side detected：timing cycle 与关键点稳定指向左侧。",
    "reason_sideConfidence_right side low visibility":
      "依据是 right side low visibility：右侧关键点可用但置信度偏低，建议复核。",
    "reason_sideConfidence_left side low visibility":
      "依据是 left side low visibility：左侧关键点可用但置信度偏低，建议复核。",
    "reason_hurdleClearance_score 3 clearance zone":
      "依据是 score 3 clearance zone：跨步腿进入更充分的 Hurdle Step clearance proxy 区间，支持该项较高 raw-score 建议。",
    "reason_hurdleClearance_score 2 clearance zone":
      "依据是 score 2 clearance zone：跨步腿 clearance 处在中等 proxy 区间，动作可分析但建议人工复核。",
    "reason_hurdleClearance_score 1 clearance zone":
      "依据是 score 1 clearance zone：跨步腿在该 proxy 中抬高不足，提示 clearance 或 step pattern 可能受限。",
    "reason_stanceLegControl_stable stance leg":
      "依据是 stable stance leg：支撑腿保持较直，支撑侧脚踝在动作周期中也比较稳定。",
    "reason_stanceLegControl_stance leg control watch":
      "依据是 stance leg control watch：支撑腿有轻微弯曲或脚踝漂移，建议复核 balance/control。",
    "reason_stanceLegControl_stance leg compensation watch":
      "依据是 stance leg compensation watch：支撑腿弯曲或漂移较明显，提示可能存在代偿。",
    "reason_pelvisTrunkControl_controlled pelvis trunk":
      "依据是 controlled pelvis trunk：肩/髋中心和髋高度 proxy 在跨步峰值附近保持较稳定。",
    "reason_pelvisTrunkControl_pelvis trunk shift watch":
      "依据是 pelvis trunk shift watch：骨盆或躯干 proxy 有可见偏移，建议人工复核。",
    "reason_pelvisTrunkControl_large pelvis trunk shift":
      "依据是 large pelvis trunk shift：骨盆/躯干偏移较明显，会削弱 Hurdle Step 控制证据。",
    "reason_stepLegAlignment_aligned stepping leg":
      "依据是 aligned stepping leg：跨步侧 hip-knee-ankle 线在峰值附近保持较好对齐。",
    "reason_stepLegAlignment_mild stepping leg drift":
      "依据是 mild stepping leg drift：跨步腿线条有轻微膝部漂移或弯曲，建议人工复核。",
    "reason_stepLegAlignment_stepping leg alignment watch":
      "依据是 stepping leg alignment watch：跨步腿线条漂移或弯曲较明显，会削弱 knee-ankle-line 证据。",
    "reason_stepClearance_clear step height proxy":
      "依据是 clear step height proxy：跨步脚在动作周期中有比较清晰的抬高/越障证据。",
    "reason_stepClearance_moderate step height":
      "依据是 moderate step height：可以看到跨步动作，但抬高幅度中等，建议人工复核。",
    "reason_stepClearance_low step clearance watch":
      "依据是 low step clearance watch：跨步脚抬高不足，提示 step pattern 可能受限。",
    "reason_stanceStability_stable stance proxy":
      "依据是 stable stance proxy：支撑侧脚踝在动作周期中比较稳定。",
    "reason_stanceStability_stance drift watch":
      "依据是 stance drift watch：支撑侧脚踝有可见漂移，建议复核 balance control。",
    "reason_stanceStability_large stance drift":
      "依据是 large stance drift：支撑侧漂移较明显，提示 balance control 可能受限。",
    "reason_trunkControl_controlled trunk proxy":
      "依据是 controlled trunk proxy：肩部中心和髋部中心相对对齐，躯干控制证据较好。",
    "reason_trunkControl_trunk shift watch":
      "依据是 trunk shift watch：躯干中心有可见偏移，建议人工复核。",
    "reason_trunkControl_large trunk shift":
      "依据是 large trunk shift：躯干偏移较明显，提示 trunk control 可能受限。",
    "reason_lungeDepthZone_score 3 lunge depth zone":
      "依据是 score 3 lunge depth zone：弓步进入更充分的 In-Line Lunge 深度 proxy 区间，支持该项较高 raw-score 建议。",
    "reason_lungeDepthZone_score 2 lunge depth zone":
      "依据是 score 2 lunge depth zone：弓步深度处在中等 proxy 区间，动作可分析但建议人工复核。",
    "reason_lungeDepthZone_score 1 lunge depth zone":
      "依据是 score 1 lunge depth zone：弓步深度在该 proxy 中偏浅，提示 depth 或动作完整性可能受限。",
    "reason_trunkPelvisControl_controlled trunk pelvis":
      "依据是 controlled trunk pelvis：肩/髋中心和髋高度 proxy 在弓步峰值附近保持较稳定。",
    "reason_trunkPelvisControl_trunk pelvis shift watch":
      "依据是 trunk pelvis shift watch：躯干或骨盆 proxy 在弓步峰值附近有可见偏移，建议人工复核。",
    "reason_trunkPelvisControl_large trunk pelvis shift":
      "依据是 large trunk pelvis shift：躯干/骨盆偏移较明显，会削弱 In-Line Lunge 稳定性证据。",
    "reason_rearLegControl_stable rear leg proxy":
      "依据是 stable rear leg proxy：后侧脚踝在弓步周期中保持较稳定。",
    "reason_rearLegControl_rear foot drift watch":
      "依据是 rear foot drift watch：后侧脚有轻微漂移，建议人工复核。",
    "reason_rearLegControl_rear leg control watch":
      "依据是 rear leg control watch：后侧关键点可见度偏低或脚部漂移较明显，会削弱控制证据。",
    "reason_frontKneeFootLine_front knee tracks foot":
      "依据是 front knee tracks foot：前侧膝盖相对足部线的偏移较小，对齐证据较好。",
    "reason_frontKneeFootLine_front knee-foot line watch":
      "依据是 front knee-foot line watch：前膝与足部线有可见偏移，建议人工复核。",
    "reason_frontKneeFootLine_large front knee-foot offset":
      "依据是 large front knee-foot offset：前膝与足部线偏移较明显，会削弱 Foot-knee Alignment 证据。",
    "reason_lungeDepth_deep lunge proxy":
      "依据是 deep lunge proxy：弓步深度 proxy 比较充分，支持 Lunge Depth 这一项。",
    "reason_lungeDepth_moderate lunge depth":
      "依据是 moderate lunge depth：可以看到弓步深度，但幅度中等，建议人工复核。",
    "reason_lungeDepth_limited lunge depth":
      "依据是 limited lunge depth：弓步深度看起来不足，提示这一项可能受限。",
    "reason_trunkAlignment_controlled trunk proxy":
      "依据是 controlled trunk proxy：肩部中心和髋部中心相对对齐，躯干稳定性证据较好。",
    "reason_trunkAlignment_trunk shift watch":
      "依据是 trunk shift watch：躯干中心有可见偏移，建议人工复核。",
    "reason_trunkAlignment_large trunk shift":
      "依据是 large trunk shift：躯干偏移较明显，提示 Trunk Stability 可能受限。",
    "reason_kneeFootAlignment_knee tracks foot proxy":
      "依据是 knee tracks foot proxy：前侧膝盖相对足部线的偏移较小，对齐证据较好。",
    "reason_kneeFootAlignment_knee-foot offset watch":
      "依据是 knee-foot offset watch：膝-足偏移可见，建议人工复核。",
    "reason_kneeFootAlignment_large knee-foot offset":
      "依据是 large knee-foot offset：膝-足偏移较明显，提示 Foot-knee Alignment 可能受限。",
    "reason_view_best from front view":
      "这个指标更适合用正面机位判断，因此当前结果只作为参考，不作为最终证据。",
    "reason_view_best from side view":
      "这个指标更适合用侧面机位判断，因此当前结果只作为参考，不作为最终证据。",
    reason_timingNeedsAdjustment:
      "Timing QA 提示这个 segment 可能还需要调整；建议先预览并确认 suggested timing，再做最终评分。",
    segmentMetadata: "Segment 元数据",
    attemptCondition: "Attempt condition",
    attemptCondition_floor: "脚跟着地 / floor",
    attemptCondition_heels_elevated_board: "脚跟垫高 / FMS board",
    attemptCondition_unknown: "unknown",
    suggested: "建议",
    lowest: "最低点",
    coverage: "覆盖率",
    segmentCoversCycle: "Segment 覆盖了检测到的动作周期。",
    applySuggestedTiming: "应用建议 timing",
    side: "Side",
    clearingTest: "Clearing Test",
    sideOption_none: "none",
    sideOption_unknown: "unknown",
    sideOption_left: "left",
    sideOption_right: "right",
    clearingFinding_ankle_clearing_pain: "Ankle Clearing - Pain",
    clearingFinding_ankle_clearing_mobility: "Ankle Mobility Clearing",
    clearingFinding_shoulder_clearing: "Shoulder Clearing",
    clearingFinding_extension_clearing: "Extension Clearing",
    clearingFinding_flexion_clearing: "Flexion Clearing",
    clearingResult_not_applicable: "不适用",
    clearingResult_not_tested: "未测试",
    clearingResult_negative: "阴性 (-)",
    clearingResult_positive: "阳性 (+)",
    clearingResult_unknown: "unknown",
    clearingResult_green: "green",
    clearingResult_yellow: "yellow",
    clearingResult_red: "red",
    rubricVersion: "Rubric Version",
    painFlag: "Pain flag",
    saveSegmentMetadata: "保存 Segment 元数据",
    segmentTimingQa: "Segment Timing QA",
    cycles: "动作周期",
    applyAllSuggestedTiming: "应用全部建议 timing",
    noCycle: "无 cycle",
    deepSquatFeatures: "Deep Squat Features",
    activeStraightLegRaiseFeatures: "Active Straight Leg Raise Features",
    shoulderMobilityFeatures: "Shoulder Mobility Features",
    hurdleStepFeatures: "Hurdle Step Features",
    inlineLungeFeatures: "In-Line Lunge Features",
    trunkStabilityPushUpFeatures: "Trunk Stability Push-Up Features",
    rotaryStabilityFeatures: "Rotary Stability Features",
    usable: "可用",
    depth: "Depth",
    torso: "Torso",
    knee: "Knee",
    hipAngle: "Hip angle",
    kneeAngle: "Knee angle",
    ankleProxy: "Ankle proxy",
    hipFlexion: "Hip Flexion",
    activeLegRaise: "Active Leg Raise",
    kneeExtension: "Knee Extension",
    stationaryLegControl: "Stationary Leg Control",
    pelvicStability: "Pelvic Stability",
    sideConfidence: "Side Confidence",
    reachDistance: "Reach Distance",
    handVisibility: "Hand Visibility",
    shoulderReference: "Shoulder Reference",
    sideContext: "Side Context",
    hurdleClearance: "Hurdle Clearance",
    stanceLegControl: "Stance Leg Control",
    pelvisTrunkControl: "Pelvis Trunk Control",
    stepLegAlignment: "Step Leg Alignment",
    stepClearance: "Step Clearance",
    stanceStability: "Stance Stability",
    trunkControl: "Trunk Control",
    lungeDepthZone: "Lunge Depth Zone",
    trunkPelvisControl: "Trunk Pelvis Control",
    rearLegControl: "Rear Leg Control",
    frontKneeFootLine: "Front Knee-foot Line",
    lungeDepth: "Lunge Depth",
    trunkAlignment: "Trunk Alignment",
    kneeFootAlignment: "Knee-Foot Alignment",
    coreStability: "Core Stability",
    pushUpPattern: "Push-Up Pattern",
    armExtension: "Arm Extension",
    compensation: "Compensation",
    trunkVisibility: "Trunk Visibility",
    rotaryDiagonalControl: "Rotary Diagonal Control",
    trunkRotationControl: "Trunk Rotation Control",
    balanceStability: "Balance Stability",
    statusReady: "Ready",
    statusLimited: "Limited",
    statusInvalid: "Invalid",
    statusMissingPose: "无 Pose JSON",
    unknown: "Unknown",
    uploadVideoFirst: "请先上传视频。",
    invalidStartEnd: "Start/End 秒数无效。",
    invalidExpectedReps: "Expected reps 必须是正整数。",
    reviewerIdRequired: "保存前必须填写 Reviewer ID。",
    timingIngestBlocked:
      "Timing QA 仍有 blocker。请先复核或调整 segment timing，再入库。",
    clearingIngestBlocked: "入库前需要先人工确认 clearing / pain。",
    analysisFailed: "分析失败。",
  },
};

function translate(language, key) {
  return UI_TEXT[language]?.[key] ?? UI_TEXT.en[key] ?? key;
}

function getEvalVideoPreset(fileName) {
  return EVAL_VIDEO_PRESETS[fileName.toLowerCase()] ?? null;
}

function getDemoPreset(presetId) {
  return (
    DEMO_PRESETS.find((preset) => preset.id === presetId) ?? DEMO_PRESETS[0]
  );
}

function formatDurationSecond(duration) {
  const rounded = Number(duration.toFixed(1));
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function createReviewerForm(source, fallbackReviewerId, fallbackTotalScore) {
  if (!source) {
    return {
      reviewerId: fallbackReviewerId,
      totalScore: fallbackTotalScore,
      scoringStatus: "scored",
      comment: "",
    };
  }

  if (
    source.scoringStatus === "not_scored" ||
    source.totalScore === null ||
    source.totalScore === undefined
  ) {
    return {
      reviewerId: source.reviewerId || fallbackReviewerId,
      totalScore: null,
      scoringStatus: "not_scored",
      comment: source.comment ?? "",
    };
  }

  return {
    reviewerId: source.reviewerId || fallbackReviewerId,
    totalScore: source.totalScore ?? fallbackTotalScore,
    scoringStatus: source.scoringStatus ?? "scored",
    comment: source.comment ?? "",
  };
}

function createReviewerScoreFromForm(actionType, form) {
  const scoringStatus =
    form.scoringStatus === "not_scored" || form.totalScore === null
      ? "not_scored"
      : "scored";

  return createReviewerRawScore(
    actionType,
    scoringStatus === "not_scored" ? null : form.totalScore,
    {
      reviewerId: form.reviewerId.trim(),
      comment: form.comment,
      scoringStatus,
      savedAt: new Date().toISOString(),
    },
  );
}

function formatProgressText(job, t) {
  if (!job) {
    return t("idle");
  }

  return `${job.status} (${job.progress}%)`;
}

function formatRate(rate) {
  if (rate === null || rate === undefined) {
    return "N/A";
  }

  return `${(rate * 100).toFixed(1)}%`;
}

function formatPoseMetric(value) {
  if (value === null || value === undefined) {
    return "N/A";
  }

  return value.toFixed(3);
}

function formatSecondMetric(value) {
  if (value === null || value === undefined) {
    return "N/A";
  }

  return `${value.toFixed(1)}s`;
}

function formatDateTime(value) {
  if (!value) {
    return "N/A";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function getPoseStatusLabel(status, t) {
  const labels = {
    ready: t("statusReady"),
    limited: t("statusLimited"),
    invalid: t("statusInvalid"),
    missing: t("statusMissingPose"),
  };

  return labels[status] ?? t("unknown");
}

function getCycleCountQaStatusLabel(status, t) {
  const labels = {
    ok: t("cycleCountQaOk"),
    blocked: t("cycleCountQaBlocked"),
    needs_review: t("cycleCountQaNeedsReview"),
    not_available: t("cycleCountQaNotAvailable"),
  };

  return labels[status] ?? status ?? t("cycleCountQaNotAvailable");
}

function buildChecklistItem(status, title, detail) {
  return { status, title, detail };
}

function buildExportChecklist(summary, segments, t) {
  const recordsTotal = summary.recordsTotal;
  const hasRecords = recordsTotal > 0;
  const reviewerCompletedCount = segments.filter(
    (segment) => getSegmentReviewStatus(segment) === "completed",
  ).length;
  const reviewerIncompleteCount = Math.max(
    0,
    recordsTotal - reviewerCompletedCount,
  );
  const reviewerComplete = hasRecords && reviewerIncompleteCount === 0;
  const allLabelsValid =
    hasRecords &&
    summary.validLabels === recordsTotal &&
    summary.invalidLabels === 0;
  const hasTiming = summary.pose.timingTotal > 0;
  const timingComplete =
    hasTiming && summary.pose.timingGood === summary.pose.timingTotal;
  const timingBlocked =
    hasTiming && summary.pose.timingReadyForIngest === false;
  const hasFeatures = summary.pose.featureTotal > 0;
  const featuresComplete =
    hasFeatures && summary.pose.featureUsable === summary.pose.featureTotal;
  const hasSuggestions = summary.pose.suggestionTotal > 0;
  const suggestionsComplete =
    hasSuggestions &&
    summary.pose.suggestionReady === summary.pose.suggestionTotal;

  return [
    buildChecklistItem(
      hasRecords ? "ready" : "missing",
      t("checklistSegmentRecords"),
      hasRecords
        ? `${t("records")}: ${recordsTotal} · ${t(
            "checklistSegmentRecordsReady",
          )}`
        : t("checklistSegmentRecordsMissing"),
    ),
    buildChecklistItem(
      reviewerComplete ? "ready" : hasRecords ? "review" : "missing",
      t("checklistReviewerCompletion"),
      reviewerComplete
        ? t("checklistReviewerCompletionReady")
        : `${t("checklistIncomplete")}: ${reviewerIncompleteCount} · ${t(
            "checklistReviewerCompletionPending",
          )}`,
    ),
    buildChecklistItem(
      allLabelsValid
        ? "ready"
        : summary.invalidLabels > 0 || summary.pendingLabels > 0
          ? "review"
          : "missing",
      t("checklistFinalLabels"),
      allLabelsValid
        ? t("checklistFinalLabelsReady")
        : `${t("validLabels")}: ${summary.validLabels}/${recordsTotal} · ${t(
            "checklistFinalLabelsPending",
          )}`,
    ),
    buildChecklistItem(
      summary.poseEvidenceAttached ? "ready" : "review",
      t("checklistPoseEvidence"),
      summary.poseEvidenceAttached
        ? t("checklistPoseEvidenceReady")
        : t("checklistPoseEvidenceMissing"),
    ),
    buildChecklistItem(
      timingComplete ? "ready" : hasTiming ? "review" : "missing",
      t("checklistTimingQa"),
      timingComplete
        ? `${summary.pose.timingGood}/${summary.pose.timingTotal} · ${t(
            "checklistTimingQaReady",
          )}`
        : hasTiming
          ? `${summary.pose.timingGood}/${summary.pose.timingTotal} · ${
              timingBlocked
                ? `${summary.pose.timingBlockerCount} ${t(
                    "checklistNeedsReview",
                  )} · ${t("checklistTimingQaBlocked")}`
                : t("checklistTimingQaPending")
            }`
          : t("checklistTimingQaMissing"),
    ),
    buildChecklistItem(
      featuresComplete ? "ready" : hasFeatures ? "review" : "missing",
      t("features"),
      featuresComplete
        ? `${summary.pose.featureUsable}/${summary.pose.featureTotal} · ${t(
            "checklistFeaturesReady",
          )}`
        : hasFeatures
          ? `${summary.pose.featureUsable}/${summary.pose.featureTotal} · ${t(
              "checklistFeaturesPending",
            )}`
          : t("checklistFeaturesMissing"),
    ),
    buildChecklistItem(
      suggestionsComplete ? "ready" : hasSuggestions ? "review" : "missing",
      t("aiSuggestions"),
      suggestionsComplete
        ? `${summary.pose.suggestionReady}/${summary.pose.suggestionTotal} · ${t(
            "checklistAiSuggestionsReady",
          )}`
        : hasSuggestions
          ? `${summary.pose.suggestionReady}/${summary.pose.suggestionTotal} · ${t(
              "checklistAiSuggestionsPending",
            )}`
          : t("checklistAiSuggestionsMissing"),
    ),
    buildChecklistItem(
      hasRecords ? "ready" : "missing",
      t("checklistPackageExport"),
      hasRecords
        ? t("checklistPackageExportReady")
        : t("checklistPackageExportMissing"),
    ),
  ];
}

function checklistStatusLabel(status, t) {
  if (status === "ready") {
    return t("checklistReady");
  }

  if (status === "review") {
    return t("checklistNeedsReview");
  }

  return t("checklistMissing");
}

function buildMovementSummaryRows(actions, movementBreakdown) {
  const knownActionIds = new Set(actions.map((action) => action.id));
  const rows = actions.map((action) => ({
    id: action.id,
    label: action.displayName,
    capability: getMovementCapability(action.id),
    summary: movementBreakdown[action.id] ?? {
      segmentsTotal: 0,
      validCount: 0,
      invalidCount: 0,
      pendingCount: 0,
    },
  }));

  for (const [actionType, summary] of Object.entries(movementBreakdown)) {
    if (!knownActionIds.has(actionType)) {
      rows.push({
        id: actionType,
        label: actionType,
        capability: getMovementCapability(actionType),
        summary,
      });
    }
  }

  return rows;
}

function getLocalWorkflowSnapshot() {
  try {
    if (typeof window === "undefined") {
      return null;
    }
    const rawSnapshot = window.localStorage.getItem(WORKFLOW_STORAGE_KEY);
    return rawSnapshot ? JSON.parse(rawSnapshot) : null;
  } catch {
    return null;
  }
}

function setLocalWorkflowSnapshot(snapshot) {
  try {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(WORKFLOW_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Local persistence is a convenience for the workbench, not a hard blocker.
  }
}

function getLocalIngestHistory() {
  try {
    if (typeof window === "undefined") {
      return [];
    }
    const rawHistory = window.localStorage.getItem(INGEST_HISTORY_STORAGE_KEY);
    const parsed = rawHistory ? JSON.parse(rawHistory) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setLocalIngestHistory(history) {
  try {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(
      INGEST_HISTORY_STORAGE_KEY,
      JSON.stringify(history),
    );
  } catch {
    // Ingest history is a convenience cache; JSON export remains the durable copy.
  }
}

function buildLocalReadiness(videoId, segments) {
  const reviewerReadiness = summarizeReviewerReadiness(segments);
  const clearingReadiness = summarizeClearingReadiness(segments);

  return {
    videoId,
    allSegmentsCount: reviewerReadiness.allSegmentsCount,
    completedSegmentsCount: reviewerReadiness.completedSegmentsCount,
    scoreableCompletedSegmentsCount:
      reviewerReadiness.scoreableCompletedSegmentsCount,
    protocolEvidenceSegmentsCount:
      reviewerReadiness.protocolEvidenceSegmentsCount,
    clearingReadyForIngest: clearingReadiness.readyForIngest,
    clearingBlockerCount: clearingReadiness.blockerCount,
    clearingRequiredSegmentsCount: clearingReadiness.requiredSegmentsCount,
    clearingConfirmedSegmentsCount: clearingReadiness.confirmedSegmentsCount,
    readyForIngest:
      reviewerReadiness.readyForIngest && clearingReadiness.readyForIngest,
    blockingReasons: [
      ...reviewerReadiness.blockingReasons,
      ...(clearingReadiness.readyForIngest
        ? []
        : ["some segments still need clearing/pain confirmation"]),
    ],
  };
}

function applyTimingGateToReadiness(readiness, timingReport, t) {
  if (!readiness) {
    return null;
  }

  const timingReadiness = summarizeTimingReadiness(timingReport);

  if (timingReadiness.readyForIngest) {
    return {
      ...readiness,
      timingReadyForIngest: true,
      timingBlockerCount: timingReadiness.blockerCount,
    };
  }

  const blockingReasons = [
    ...(readiness.blockingReasons ?? []),
    `${t("timingIngestBlocked")} (${timingReadiness.blockerCount})`,
  ];

  return {
    ...readiness,
    readyForIngest: false,
    timingReadyForIngest: false,
    timingBlockerCount: timingReadiness.blockerCount,
    blockingReasons: [...new Set(blockingReasons)],
  };
}

function applyClearingGateToReadiness(readiness, segments, t) {
  if (!readiness) {
    return null;
  }

  const clearingReadiness = summarizeClearingReadiness(segments);

  if (clearingReadiness.readyForIngest) {
    return {
      ...readiness,
      clearingReadyForIngest: true,
      clearingBlockerCount: clearingReadiness.blockerCount,
      clearingRequiredSegmentsCount: clearingReadiness.requiredSegmentsCount,
      clearingConfirmedSegmentsCount: clearingReadiness.confirmedSegmentsCount,
    };
  }

  const blockingReasons = [
    ...(readiness.blockingReasons ?? []),
    `${t("clearingIngestBlocked")} (${clearingReadiness.blockerCount})`,
  ];

  return {
    ...readiness,
    readyForIngest: false,
    clearingReadyForIngest: false,
    clearingBlockerCount: clearingReadiness.blockerCount,
    clearingRequiredSegmentsCount: clearingReadiness.requiredSegmentsCount,
    clearingConfirmedSegmentsCount: clearingReadiness.confirmedSegmentsCount,
    blockingReasons: [...new Set(blockingReasons)],
  };
}

function buildLocalConsistency(videoId, segments) {
  return {
    videoId,
    generatedAt: new Date().toISOString(),
    metrics: summarizeConsistency(segments),
  };
}

function buildVideoSnapshot({
  videoId,
  selectedAction,
  videoFileName,
  startSecond,
  endSecond,
  expectedReps,
  analysisNotes,
}) {
  return {
    videoId,
    actionType: selectedAction,
    fileName: videoFileName || "restored-video.mp4",
    startSecond: Number(startSecond),
    endSecond: Number(endSecond),
    expectedReps: expectedReps ? Number(expectedReps) : null,
    notes: analysisNotes,
  };
}

function applyLocalReviewToSegments(segments, segmentId, role, score) {
  return segments.map((segment) => {
    if (segment.segmentId !== segmentId) {
      return segment;
    }

    const reviewerScores = {
      ...segment.reviewerScores,
      [role]: score,
    };

    const updatedSegment = {
      ...segment,
      reviewerScores,
    };

    return {
      ...updatedSegment,
      reviewStatus: getSegmentReviewStatus(updatedSegment),
    };
  });
}

function applyLocalMetadataToSegments(segments, payload) {
  return segments.map((segment) => {
    if (segment.segmentId !== payload.segmentId) {
      return segment;
    }

    return {
      ...segment,
      startSecond: Number(payload.startSecond.toFixed(2)),
      endSecond: Number(payload.endSecond.toFixed(2)),
      side: payload.side,
      painFlag: Boolean(payload.painFlag),
      clearingTest: payload.clearingTest,
      clearingFindings: payload.clearingFindings,
      attemptCondition: payload.attemptCondition ?? segment.attemptCondition,
      rubricVersion: payload.rubricVersion || "fms_v1.0",
      segmentSource: payload.segmentSource ?? segment.segmentSource,
      updatedAt: new Date().toISOString(),
    };
  });
}

async function fetchAssetFile(url, fileName, type) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Could not load ${fileName}: ${response.status}`);
  }

  const blob = await response.blob();
  return new File([blob], fileName, {
    type: type || blob.type,
  });
}

export default function App() {
  const [language, setLanguage] = useState("en");
  const [actions, setActions] = useState([]);
  const [selectedAction, setSelectedAction] = useState("deep_squat");
  const [videoFile, setVideoFile] = useState(null);
  const [restoredVideoFileName, setRestoredVideoFileName] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [startSecond, setStartSecond] = useState("0");
  const [endSecond, setEndSecond] = useState("20");
  const [expectedReps, setExpectedReps] = useState("");
  const [analysisNotes, setAnalysisNotes] = useState("");
  const [analysisJob, setAnalysisJob] = useState(null);
  const [videoId, setVideoId] = useState("");
  const [segments, setSegments] = useState([]);
  const [activeSegmentId, setActiveSegmentId] = useState("");
  const [readiness, setReadiness] = useState(null);
  const [consistencySnapshot, setConsistencySnapshot] = useState(null);
  const [ingestResult, setIngestResult] = useState(null);
  const [ingestHistory, setIngestHistory] = useState(getLocalIngestHistory);
  const [loopPlayback, setLoopPlayback] = useState(true);
  const [showKeypoints, setShowKeypoints] = useState(false);
  const [posePayload, setPosePayload] = useState(null);
  const [poseSummary, setPoseSummary] = useState(null);
  const [poseFileName, setPoseFileName] = useState("");
  const [selectedDemoPresetId, setSelectedDemoPresetId] = useState(
    DEFAULT_DEMO_PRESET_ID,
  );
  const [previewTimingRange, setPreviewTimingRange] = useState(null);
  const [playbackSecond, setPlaybackSecond] = useState(0);
  const [isBusy, setIsBusy] = useState(false);
  const [reviewerForms, setReviewerForms] = useState({
    reviewer_a: {
      reviewerId: REVIEWER_A_DEFAULT_ID,
      totalScore: 3,
      comment: "",
    },
    reviewer_b: {
      reviewerId: REVIEWER_B_DEFAULT_ID,
      totalScore: 3,
      comment: "",
    },
  });
  const [errorText, setErrorText] = useState("");

  const pollTimerRef = useRef(null);
  const videoRef = useRef(null);
  const analysisRangeOverrideRef = useRef(null);
  const hasHydratedWorkflowRef = useRef(false);
  const metadataUpdateRef = useRef(Promise.resolve());
  const t = useCallback((key) => translate(language, key), [language]);

  const activeSegment = useMemo(
    () =>
      segments.find((segment) => segment.segmentId === activeSegmentId) || null,
    [segments, activeSegmentId],
  );
  const currentVideoFileName = videoFile?.name ?? restoredVideoFileName;
  const movementAdapter = useMemo(
    () => getMovementAdapter(selectedAction),
    [selectedAction],
  );
  const activeActionLabel = useMemo(() => {
    const activeActionType = activeSegment?.actionType ?? selectedAction;
    return (
      actions.find((action) => action.id === activeActionType)?.displayName ??
      activeActionType
    );
  }, [activeSegment, actions, selectedAction]);
  const activePeriodReport = useMemo(
    () => (posePayload ? detectPoseActivePeriods(posePayload) : null),
    [posePayload],
  );

  const adjudicationPreview = useMemo(() => {
    if (!activeSegment) {
      return {
        labelStatus: "pending",
        labelSource: "none",
        finalScore: null,
      };
    }

    return adjudicateScores(
      activeSegment.aiScore,
      activeSegment.reviewerScores.reviewer_a,
      activeSegment.reviewerScores.reviewer_b,
    );
  }, [activeSegment]);

  const timingReport = useMemo(() => {
    if (
      !posePayload ||
      !allSegmentsMatchAdapter(segments, movementAdapter, selectedAction)
    ) {
      return null;
    }

    return movementAdapter.buildTimingReport({
      posePayload,
      segments,
    });
  }, [movementAdapter, posePayload, segments, selectedAction]);

  const activeTimingSuggestion = useMemo(() => {
    if (!timingReport || !activeSegment) {
      return null;
    }

    const timingItem =
      timingReport.items.find(
        (item) => item.segmentId === activeSegment.segmentId,
      ) ?? null;

    if (!movementAdapter?.supportsAiDraftTiming) {
      return timingItem;
    }

    return withAiDraftRange(timingItem, {
      rangeStartSecond: Number(startSecond),
      rangeEndSecond: Number(endSecond),
    });
  }, [activeSegment, endSecond, movementAdapter, startSecond, timingReport]);

  const featureReport = useMemo(() => {
    if (!movementAdapter || !posePayload || !timingReport) {
      return null;
    }

    return movementAdapter.buildFeatureReport({
      posePayload,
      timingReport,
    });
  }, [movementAdapter, posePayload, timingReport]);

  const suggestionReport = useMemo(() => {
    if (!movementAdapter || !featureReport || !timingReport) {
      return null;
    }

    return movementAdapter.buildSuggestionReport({
      posePayload,
      featureReport,
      timingReport,
      segments,
      notes: analysisNotes,
      fileName: currentVideoFileName,
    });
  }, [
    analysisNotes,
    currentVideoFileName,
    featureReport,
    movementAdapter,
    posePayload,
    segments,
    timingReport,
  ]);

  const activePoseSuggestion = useMemo(() => {
    if (!suggestionReport || !activeSegment) {
      return null;
    }

    return (
      suggestionReport.items.find(
        (item) => item.segmentId === activeSegment.segmentId,
      ) ?? null
    );
  }, [activeSegment, suggestionReport]);

  const activeAiSideSuggestion = useMemo(() => {
    if (!activeSegment) {
      return null;
    }

    const featureItem =
      featureReport?.items?.find(
        (item) => item.segmentId === activeSegment.segmentId,
      ) ?? null;

    return buildAiSideSuggestion({
      actionType: activeSegment.actionType ?? selectedAction,
      segment: activeSegment,
      featureItem,
    });
  }, [activeSegment, featureReport, selectedAction]);

  const activeMovementCapability = useMemo(
    () => getMovementCapability(activeSegment?.actionType ?? selectedAction),
    [activeSegment, selectedAction],
  );

  const activeEvidenceGate = useMemo(
    () =>
      evaluateMovementEvidenceGate({
        actionType: activeSegment?.actionType ?? selectedAction,
        segmentId: activeSegment?.segmentId,
        poseSummary,
        timingReport,
        featureReport,
        suggestionReport,
      }),
    [
      activeSegment,
      featureReport,
      poseSummary,
      selectedAction,
      suggestionReport,
      timingReport,
    ],
  );

  const playbackRange = previewTimingRange ?? activeSegment;

  const exportQualitySummary = useMemo(
    () =>
      summarizeExportQuality({
        segments,
        consistencyMetrics: consistencySnapshot?.metrics ?? null,
        poseSummary,
        timingReport,
        featureReport,
        suggestionReport,
      }),
    [
      consistencySnapshot,
      featureReport,
      poseSummary,
      segments,
      suggestionReport,
      timingReport,
    ],
  );

  const effectiveReadiness = useMemo(
    () =>
      applyClearingGateToReadiness(
        applyTimingGateToReadiness(readiness, timingReport, t),
        segments,
        t,
      ),
    [readiness, segments, t, timingReport],
  );

  const exportChecklist = useMemo(
    () => buildExportChecklist(exportQualitySummary, segments, t),
    [exportQualitySummary, segments, t],
  );

  const movementSummaryRows = useMemo(
    () =>
      buildMovementSummaryRows(actions, exportQualitySummary.movementBreakdown),
    [actions, exportQualitySummary.movementBreakdown],
  );

  useEffect(() => {
    async function loadActionOptions() {
      try {
        const result = await listActions();
        setActions(result.items);
      } catch (error) {
        setErrorText(error.message);
      }
    }

    loadActionOptions();
  }, []);

  useEffect(() => {
    const snapshot = getLocalWorkflowSnapshot();

    if (!snapshot) {
      hasHydratedWorkflowRef.current = true;
      return undefined;
    }

    let isCancelled = false;

    setLanguage(snapshot.language ?? "en");
    setSelectedAction(snapshot.selectedAction ?? "deep_squat");
    setSelectedDemoPresetId(
      snapshot.selectedDemoPresetId ?? DEFAULT_DEMO_PRESET_ID,
    );
    setStartSecond(snapshot.startSecond ?? "0");
    setEndSecond(snapshot.endSecond ?? "20");
    setExpectedReps(snapshot.expectedReps ?? "");
    setAnalysisNotes(snapshot.analysisNotes ?? "");
    setVideoId(snapshot.videoId ?? "");
    setRestoredVideoFileName(snapshot.videoFileName ?? "");
    setSegments(snapshot.segments ?? []);
    setActiveSegmentId(snapshot.activeSegmentId ?? "");
    setAnalysisJob(snapshot.analysisJob ?? null);
    setReadiness(
      snapshot.videoId && snapshot.segments?.length
        ? buildLocalReadiness(snapshot.videoId, snapshot.segments)
        : null,
    );
    setConsistencySnapshot(
      snapshot.videoId && snapshot.segments?.length
        ? buildLocalConsistency(snapshot.videoId, snapshot.segments)
        : null,
    );
    setLoopPlayback(snapshot.loopPlayback ?? true);
    setShowKeypoints(snapshot.showKeypoints ?? false);

    async function restoreDemoAssets() {
      if (!snapshot.isDemoWorkflow) {
        hasHydratedWorkflowRef.current = true;
        return;
      }

      try {
        const demoPreset = getDemoPreset(
          snapshot.selectedDemoPresetId ?? DEFAULT_DEMO_PRESET_ID,
        );
        analysisRangeOverrideRef.current = {
          ...demoPreset.range,
          fileName: demoPreset.videoFileName,
        };
        const [videoAsset, poseAsset] = await Promise.all([
          fetchAssetFile(
            demoPreset.videoUrl,
            demoPreset.videoFileName,
            "video/mp4",
          ),
          fetchAssetFile(
            demoPreset.poseUrl,
            demoPreset.poseFileName,
            "application/json",
          ),
        ]);

        if (isCancelled) {
          return;
        }

        const posePayloadJson = JSON.parse(await poseAsset.text());
        const summary = summarizePoseLandmarks(posePayloadJson);
        setVideoFile(videoAsset);
        setRestoredVideoFileName(videoAsset.name);
        setPosePayload(summary.valid ? posePayloadJson : null);
        setPoseSummary(summary.valid ? summary : null);
        setPoseFileName(summary.valid ? poseAsset.name : "");
        setShowKeypoints(
          summary.valid ? (snapshot.showKeypoints ?? true) : false,
        );
      } catch (error) {
        if (!isCancelled) {
          setErrorText(
            `Local workflow assets could not be restored: ${error.message}`,
          );
        }
      } finally {
        if (!isCancelled) {
          hasHydratedWorkflowRef.current = true;
        }
      }
    }

    restoreDemoAssets();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasHydratedWorkflowRef.current) {
      return;
    }

    const demoPreset = getDemoPreset(selectedDemoPresetId);
    const videoFileName = currentVideoFileName;

    setLocalWorkflowSnapshot({
      schemaVersion: "ai_fms_local_workflow_v1",
      savedAt: new Date().toISOString(),
      language,
      selectedAction,
      selectedDemoPresetId,
      startSecond,
      endSecond,
      expectedReps,
      analysisNotes,
      videoId,
      videoFileName,
      isDemoWorkflow:
        selectedAction === demoPreset.actionType &&
        Boolean(videoFileName) &&
        videoFileName === demoPreset.videoFileName,
      segments,
      activeSegmentId,
      analysisJob,
      loopPlayback,
      showKeypoints,
      poseFileName,
    });
  }, [
    activeSegmentId,
    analysisJob,
    analysisNotes,
    currentVideoFileName,
    endSecond,
    expectedReps,
    language,
    loopPlayback,
    poseFileName,
    segments,
    selectedAction,
    selectedDemoPresetId,
    showKeypoints,
    startSecond,
    videoId,
  ]);

  useEffect(() => {
    if (!videoFile) {
      setVideoUrl("");
      return undefined;
    }

    const fileUrl = URL.createObjectURL(videoFile);
    setVideoUrl(fileUrl);

    return () => {
      URL.revokeObjectURL(fileUrl);
    };
  }, [videoFile]);

  useEffect(() => {
    if (!videoFile) {
      return undefined;
    }

    let isCancelled = false;
    const metadataUrl = URL.createObjectURL(videoFile);
    const metadataVideo = document.createElement("video");

    metadataVideo.preload = "metadata";
    metadataVideo.onloadedmetadata = () => {
      if (!isCancelled) {
        if (!applyAnalysisRangeOverride(videoFile.name)) {
          applyVideoDuration(metadataVideo.duration);
        }
      }

      URL.revokeObjectURL(metadataUrl);
    };
    metadataVideo.onerror = () => {
      URL.revokeObjectURL(metadataUrl);
    };
    metadataVideo.src = metadataUrl;

    return () => {
      isCancelled = true;
      URL.revokeObjectURL(metadataUrl);
    };
  }, [videoFile]);

  useEffect(() => {
    if (!activeSegment) {
      return;
    }

    setReviewerForms({
      reviewer_a: createReviewerForm(
        activeSegment.reviewerScores.reviewer_a,
        REVIEWER_A_DEFAULT_ID,
        activeSegment.aiScore.totalScore,
      ),
      reviewer_b: createReviewerForm(
        activeSegment.reviewerScores.reviewer_b,
        REVIEWER_B_DEFAULT_ID,
        activeSegment.aiScore.totalScore,
      ),
    });
  }, [activeSegment]);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!videoRef.current || !activeSegment) {
      return;
    }

    const nextStartSecond =
      previewTimingRange?.segmentId === activeSegment.segmentId
        ? previewTimingRange.startSecond
        : activeSegment.startSecond;
    videoRef.current.currentTime = nextStartSecond;
  }, [activeSegment, previewTimingRange]);

  function stopPolling() {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }

  async function refreshReadiness(targetVideoId) {
    if (!targetVideoId) {
      return;
    }

    try {
      const result = await checkVideoReadiness(targetVideoId);
      setReadiness(result);
    } catch {
      setReadiness(buildLocalReadiness(targetVideoId, segments));
    }
  }

  async function refreshConsistency(targetVideoId) {
    if (!targetVideoId) {
      return;
    }

    try {
      const result = await getVideoConsistency(targetVideoId);
      setConsistencySnapshot(result);
    } catch {
      setConsistencySnapshot(buildLocalConsistency(targetVideoId, segments));
    }
  }

  async function syncSegments(targetVideoId, options = {}) {
    try {
      const response = await getVideoSegments(targetVideoId);
      let nextSegments = response.items;
      const canUsePoseTiming =
        posePayload &&
        movementAdapter?.supportsPoseTiming &&
        allSegmentsMatchAdapter(nextSegments, movementAdapter, selectedAction);

      if (
        options.applyAiDraftTiming &&
        movementAdapter?.supportsAiDraftTiming &&
        canUsePoseTiming
      ) {
        try {
          const draftTimingReport = movementAdapter.buildTimingReport({
            posePayload,
            segments: nextSegments,
          });
          const updates = buildAiDraftTimingPayloads({
            segments: nextSegments,
            timingReport: draftTimingReport,
            rangeStartSecond: options.rangeStartSecond,
            rangeEndSecond: options.rangeEndSecond,
          });

          if (updates.length > 0) {
            for (const payload of updates) {
              await updateSegmentMetadata(payload);
            }

            const refreshedResponse = await getVideoSegments(targetVideoId);
            nextSegments = refreshedResponse.items;
          }
        } catch (error) {
          setErrorText(
            `${t("aiDraftTimingFailed")}: ${error.message ?? t("unknown")}`,
          );
        }
      }

      if (canUsePoseTiming && nextSegments.length > 0) {
        const latestTimingReport = movementAdapter.buildTimingReport({
          posePayload,
          segments: nextSegments,
        });

        nextSegments = filterSegmentsWithDetectedCycles({
          segments: nextSegments,
          timingReport: latestTimingReport,
        });
      }

      setSegments(nextSegments);

      setActiveSegmentId((currentId) =>
        nextSegments.some((segment) => segment.segmentId === currentId)
          ? currentId
          : (nextSegments[0]?.segmentId ?? ""),
      );

      setReadiness(buildLocalReadiness(targetVideoId, nextSegments));
      setConsistencySnapshot(
        buildLocalConsistency(targetVideoId, nextSegments),
      );
    } catch {
      if (segments.length > 0) {
        setReadiness(buildLocalReadiness(targetVideoId, segments));
        setConsistencySnapshot(buildLocalConsistency(targetVideoId, segments));
      }
    }
  }

  async function handleStartAnalysis() {
    setErrorText("");
    setIngestResult(null);

    if (!videoFile) {
      setErrorText(t("uploadVideoFirst"));
      return;
    }

    const parsedStart = Number(startSecond);
    const parsedEnd = Number(endSecond);
    const parsedExpectedReps = expectedReps ? Number(expectedReps) : null;

    if (
      Number.isNaN(parsedStart) ||
      Number.isNaN(parsedEnd) ||
      parsedEnd <= parsedStart
    ) {
      setErrorText(t("invalidStartEnd"));
      return;
    }

    if (
      parsedExpectedReps !== null &&
      (!Number.isInteger(parsedExpectedReps) || parsedExpectedReps <= 0)
    ) {
      setErrorText(t("invalidExpectedReps"));
      return;
    }

    setIsBusy(true);

    try {
      const jobResult = await uploadVideoAndCreateAnalysisJob({
        actionType: selectedAction,
        file: videoFile,
        fileName: videoFile.name,
        startSecond: parsedStart,
        endSecond: parsedEnd,
        expectedReps: parsedExpectedReps,
        notes: analysisNotes.trim(),
      });

      setVideoId(jobResult.videoId);
      setAnalysisJob({
        analysisJobId: jobResult.analysisJobId,
        status: jobResult.status,
        progress: 0,
        message: "queued",
      });
      setSegments([]);
      setActiveSegmentId("");
      setReadiness(null);
      setConsistencySnapshot(null);

      stopPolling();
      pollTimerRef.current = setInterval(async () => {
        try {
          const latestJob = await getAnalysisJob(jobResult.analysisJobId);
          setAnalysisJob(latestJob);

          if (latestJob.status === "succeeded") {
            stopPolling();
            await syncSegments(jobResult.videoId, {
              applyAiDraftTiming: true,
              rangeStartSecond: parsedStart,
              rangeEndSecond: parsedEnd,
            });
          }

          if (latestJob.status === "failed") {
            stopPolling();
            setErrorText(latestJob.error?.message ?? t("analysisFailed"));
          }
        } catch (error) {
          stopPolling();
          setErrorText(error.message);
        }
      }, 500);
    } catch (error) {
      setErrorText(error.message);
    } finally {
      setIsBusy(false);
    }
  }

  function resetAnalysisState() {
    setAnalysisJob(null);
    setVideoId("");
    setSegments([]);
    setActiveSegmentId("");
    setPreviewTimingRange(null);
    setReadiness(null);
    setConsistencySnapshot(null);
    setIngestResult(null);
    stopPolling();
  }

  function resetPoseState() {
    setPosePayload(null);
    setPoseSummary(null);
    setPoseFileName("");
    setShowKeypoints(false);
  }

  function handleVideoFileChange(file, options = {}) {
    setPreviewTimingRange(null);

    if (file && options.analysisRangeOverride) {
      analysisRangeOverrideRef.current = {
        ...options.analysisRangeOverride,
        fileName: file.name,
      };
    } else {
      analysisRangeOverrideRef.current = null;
    }

    setVideoFile(file);
    setRestoredVideoFileName(file?.name ?? "");
    resetAnalysisState();
    resetPoseState();

    if (!file) {
      setStartSecond("0");
      setEndSecond("");
      setExpectedReps("");
      setAnalysisNotes("");
      return;
    }

    setStartSecond("0");
    setEndSecond("");

    const preset = getEvalVideoPreset(file.name);
    if (preset) {
      if (preset.range) {
        analysisRangeOverrideRef.current = {
          ...preset.range,
          fileName: file.name,
        };
        setStartSecond(preset.range.startSecond);
        setEndSecond(preset.range.endSecond);
      }
      setExpectedReps(preset.expectedReps);
      setAnalysisNotes(preset.notes);
      return;
    }

    setExpectedReps("");
    setAnalysisNotes("");
  }

  function applyPosePayload(payload, fileName) {
    const summary = summarizePoseLandmarks(payload);

    if (!summary.valid) {
      resetPoseState();
      setErrorText(`Pose JSON is invalid: ${summary.issues.join("; ")}`);
      return false;
    }

    setPosePayload(payload);
    setPoseSummary(summary);
    setPoseFileName(fileName);
    setShowKeypoints(true);
    return true;
  }

  async function handlePoseFileChange(file) {
    setErrorText("");

    if (!file) {
      resetPoseState();
      return;
    }

    try {
      const payload = JSON.parse(await file.text());
      applyPosePayload(payload, file.name);
    } catch (error) {
      resetPoseState();
      setErrorText(`Pose JSON could not be loaded: ${error.message}`);
    }
  }

  async function handleLoadDemo() {
    setErrorText("");
    setIsBusy(true);

    try {
      const demoPreset = getDemoPreset(selectedDemoPresetId);
      const [videoAsset, poseAsset] = await Promise.all([
        fetchAssetFile(
          demoPreset.videoUrl,
          demoPreset.videoFileName,
          "video/mp4",
        ),
        demoPreset.poseUrl
          ? fetchAssetFile(
              demoPreset.poseUrl,
              demoPreset.poseFileName,
              "application/json",
            )
          : Promise.resolve(null),
      ]);

      setSelectedAction(demoPreset.actionType);
      handleVideoFileChange(videoAsset, {
        analysisRangeOverride: demoPreset.range,
      });
      if (demoPreset.expectedReps !== undefined) {
        setExpectedReps(demoPreset.expectedReps);
      }
      if (demoPreset.notes !== undefined) {
        setAnalysisNotes(demoPreset.notes);
      }

      if (poseAsset) {
        const posePayloadJson = JSON.parse(await poseAsset.text());
        applyPosePayload(posePayloadJson, poseAsset.name);
      } else {
        resetPoseState();
      }
    } catch (error) {
      resetPoseState();
      setErrorText(`Demo assets could not be loaded: ${error.message}`);
    } finally {
      setIsBusy(false);
    }
  }

  function applyVideoDuration(duration) {
    if (!Number.isFinite(duration) || duration <= 0) {
      return;
    }

    setStartSecond("0");
    setEndSecond(formatDurationSecond(duration));
  }

  function applyAnalysisRangeOverride(fileName) {
    const override = analysisRangeOverrideRef.current;

    if (!override || override.fileName !== fileName) {
      return false;
    }

    setStartSecond(override.startSecond);
    setEndSecond(override.endSecond);
    return true;
  }

  function handleVideoLoadedMetadata(event) {
    if (applyAnalysisRangeOverride(videoFile?.name ?? "")) {
      return;
    }

    applyVideoDuration(event.currentTarget.duration);
  }

  function updateReviewerForm(role, nextValue) {
    setReviewerForms((previous) => ({
      ...previous,
      [role]: nextValue,
    }));
  }

  async function handleSaveReview(role) {
    if (!activeSegment) {
      return;
    }

    setErrorText("");
    const form = reviewerForms[role];

    if (!form.reviewerId.trim()) {
      setErrorText(t("reviewerIdRequired"));
      return;
    }

    setIsBusy(true);

    try {
      await metadataUpdateRef.current;
      const savedScore = createReviewerScoreFromForm(
        activeSegment.actionType ?? selectedAction,
        form,
      );

      await saveSegmentReview({
        segmentId: activeSegment.segmentId,
        reviewerRole: role,
        reviewerId: savedScore.reviewerId,
        score: {
          totalScore: savedScore.totalScore,
          subscores: savedScore.subscores,
          criteriaScores: savedScore.criteriaScores,
          scoreScope: savedScore.scoreScope,
          scoreBasis: savedScore.scoreBasis,
          usesCriteriaScores: savedScore.usesCriteriaScores,
          scoringStatus: savedScore.scoringStatus,
          comment: savedScore.comment,
        },
      });

      await syncSegments(videoId);
    } catch {
      const nextSegments = applyLocalReviewToSegments(
        segments,
        activeSegment.segmentId,
        role,
        createReviewerScoreFromForm(
          activeSegment.actionType ?? selectedAction,
          form,
        ),
      );
      setSegments(nextSegments);
      setReadiness(buildLocalReadiness(videoId, nextSegments));
      setConsistencySnapshot(buildLocalConsistency(videoId, nextSegments));
    } finally {
      setIsBusy(false);
    }
  }

  const handleSegmentMetadataChange = useCallback(
    (payload) => {
      if (!videoId) {
        return;
      }

      if (
        Number.isNaN(payload.startSecond) ||
        Number.isNaN(payload.endSecond) ||
        payload.endSecond <= payload.startSecond
      ) {
        return;
      }

      setSegments((currentSegments) => {
        const nextSegments = applyLocalMetadataToSegments(
          currentSegments,
          payload,
        );
        setReadiness(buildLocalReadiness(videoId, nextSegments));
        setConsistencySnapshot(buildLocalConsistency(videoId, nextSegments));
        return nextSegments;
      });

      metadataUpdateRef.current = updateSegmentMetadata(payload).catch(
        () => {},
      );
    },
    [videoId],
  );

  async function handleApplyAllTimingSuggestions() {
    if (
      !videoId ||
      !timingReport?.items?.length ||
      !movementAdapter?.supportsAiDraftTiming
    ) {
      return;
    }

    const updates = buildAiDraftTimingPayloads({
      segments,
      timingReport,
      rangeStartSecond: Number(startSecond),
      rangeEndSecond: Number(endSecond),
    });

    if (updates.length === 0) {
      return;
    }

    setErrorText("");
    setPreviewTimingRange(null);
    setIsBusy(true);

    try {
      await metadataUpdateRef.current;
      for (const payload of updates) {
        await updateSegmentMetadata(payload);
      }

      await syncSegments(videoId);
    } catch {
      let nextSegments = updates.reduce(
        (currentSegments, payload) =>
          applyLocalMetadataToSegments(currentSegments, payload),
        segments,
      );

      if (movementAdapter?.supportsPoseTiming && posePayload) {
        const latestTimingReport = movementAdapter.buildTimingReport({
          posePayload,
          segments: nextSegments,
        });
        nextSegments = filterSegmentsWithDetectedCycles({
          segments: nextSegments,
          timingReport: latestTimingReport,
        });
      }

      setSegments(nextSegments);
      setActiveSegmentId((currentId) =>
        nextSegments.some((segment) => segment.segmentId === currentId)
          ? currentId
          : (nextSegments[0]?.segmentId ?? ""),
      );
      setReadiness(buildLocalReadiness(videoId, nextSegments));
      setConsistencySnapshot(buildLocalConsistency(videoId, nextSegments));
    } finally {
      setIsBusy(false);
    }
  }

  async function buildCurrentDatasetExport() {
    let dataset = null;

    await metadataUpdateRef.current;

    if (segments.length > 0) {
      dataset = buildDatasetExport(
        buildVideoSnapshot({
          videoId,
          selectedAction,
          videoFileName: currentVideoFileName,
          startSecond,
          endSecond,
          expectedReps,
          analysisNotes,
        }),
        segments,
      );
    } else {
      dataset = await exportVideoDataset(videoId);
    }

    return attachPoseEvidenceToDataset(dataset, {
      poseFileName,
      poseSummary,
      timingReport,
      featureReport,
      suggestionReport,
      implementedPoseActionTypes: getImplementedPoseActionTypes(),
      movementCapabilities: getMovementCapabilities(),
      plannedActionTypes: actions.map((action) => action.id),
    });
  }

  function downloadTextFile({ contents, fileName, type }) {
    const blob = new Blob([contents], { type });
    downloadBlobFile({ blob, fileName });
  }

  function downloadBlobFile({ blob, fileName }) {
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = fileName;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(downloadUrl);
  }

  async function handleExportDataset() {
    if (!videoId) {
      return;
    }

    setErrorText("");
    setIsBusy(true);

    try {
      const dataset = await buildCurrentDatasetExport();
      downloadTextFile({
        contents: JSON.stringify(dataset, null, 2),
        fileName: `ai-fms-${videoId}.json`,
        type: "application/json",
      });
    } catch (error) {
      setErrorText(error.message);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleExportCsv() {
    if (!videoId) {
      return;
    }

    setErrorText("");
    setIsBusy(true);

    try {
      const dataset = await buildCurrentDatasetExport();
      downloadTextFile({
        contents: buildDatasetCsv(dataset),
        fileName: `ai-fms-${videoId}.csv`,
        type: "text/csv",
      });
    } catch (error) {
      setErrorText(error.message);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleExportPackage() {
    if (!videoId) {
      return;
    }

    setErrorText("");
    setIsBusy(true);

    try {
      const dataset = await buildCurrentDatasetExport();
      const zipBlob = buildDatasetPackageZip({
        dataset,
        qualitySummary: exportQualitySummary,
      });
      downloadBlobFile({
        blob: zipBlob,
        fileName: `ai-fms-${videoId}-dataset-package.zip`,
      });
    } catch (error) {
      setErrorText(error.message);
    } finally {
      setIsBusy(false);
    }
  }

  function saveIngestHistoryEntry(result) {
    const savedAt = new Date().toISOString();
    const demoPreset = getDemoPreset(selectedDemoPresetId);
    const entry = {
      schemaVersion: "ai_fms_ingest_history_entry_v1",
      id: `${result.ingestBatchId}-${savedAt}`,
      savedAt,
      ingest: result,
      workflow: {
        apiMode: calibrationApiMode,
        selectedAction,
        selectedDemoPresetId,
        demoPresetLabel: demoPreset.label,
        videoId,
        videoFileName: currentVideoFileName,
        poseFileName,
        startSecond,
        endSecond,
        expectedReps,
        analysisNotes,
      },
      readiness: effectiveReadiness
        ? {
            completedSegmentsCount: effectiveReadiness.completedSegmentsCount,
            allSegmentsCount: effectiveReadiness.allSegmentsCount,
            scoreableCompletedSegmentsCount:
              effectiveReadiness.scoreableCompletedSegmentsCount,
            protocolEvidenceSegmentsCount:
              effectiveReadiness.protocolEvidenceSegmentsCount,
            readyForIngest: effectiveReadiness.readyForIngest,
            blockingReasons: effectiveReadiness.blockingReasons ?? [],
          }
        : null,
      consistency: consistencySnapshot?.metrics ?? null,
      segments,
    };

    setIngestHistory((currentHistory) => {
      const nextHistory = [
        entry,
        ...currentHistory.filter(
          (item) => item.ingest?.ingestBatchId !== result.ingestBatchId,
        ),
      ].slice(0, MAX_INGEST_HISTORY_ENTRIES);
      setLocalIngestHistory(nextHistory);
      return nextHistory;
    });
  }

  function handleExportIngestHistory() {
    if (ingestHistory.length === 0) {
      return;
    }

    downloadTextFile({
      contents: JSON.stringify(
        {
          schemaVersion: "ai_fms_ingest_history_v1",
          exportedAt: new Date().toISOString(),
          entries: ingestHistory,
        },
        null,
        2,
      ),
      fileName: "ai-fms-ingest-history.json",
      type: "application/json",
    });
  }

  async function handleIngest() {
    setErrorText("");

    if (!effectiveReadiness?.readyForIngest || segments.length === 0) {
      setErrorText(
        effectiveReadiness?.blockingReasons?.[0] ?? t("timingIngestBlocked"),
      );
      return;
    }

    setIsBusy(true);

    try {
      await metadataUpdateRef.current;
      const result = await ingestVideo(videoId, "reviewer_a");
      setIngestResult(result);
      saveIngestHistoryEntry(result);
      await Promise.all([
        refreshReadiness(videoId),
        refreshConsistency(videoId),
      ]);
    } catch (error) {
      if (!effectiveReadiness?.readyForIngest || segments.length === 0) {
        setErrorText(error.message);
        return;
      }

      const summary = summarizeIngest(segments);
      const result = {
        ingestBatchId: `local_${Date.now()}`,
        videoId,
        requestedBy: "reviewer_a",
        segmentsTotal: summary.segmentsTotal,
        segmentsValid: summary.segmentsValid,
        segmentsInvalid: summary.segmentsInvalid,
        segmentsProtocolEvidence: summary.segmentsProtocolEvidence,
        status: "local_only",
        persistenceStatus: "not_persisted",
        persistenceError: error.message,
        createdAt: new Date().toISOString(),
      };
      setIngestResult(result);
      saveIngestHistoryEntry(result);
      setReadiness(buildLocalReadiness(videoId, segments));
      setConsistencySnapshot(buildLocalConsistency(videoId, segments));
    } finally {
      setIsBusy(false);
    }
  }

  function selectNeighborSegment(direction) {
    if (!activeSegment) {
      return;
    }

    const currentIndex = segments.findIndex(
      (segment) => segment.segmentId === activeSegment.segmentId,
    );

    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= segments.length) {
      return;
    }

    setActiveSegmentId(segments[nextIndex].segmentId);
    setPreviewTimingRange(null);
  }

  function handleSelectSegment(segmentId) {
    setActiveSegmentId(segmentId);
    setPreviewTimingRange(null);
  }

  function handlePreviewTimingSuggestion(item) {
    const draftRange = item?.aiDraftRange ?? item?.cycle;

    if (!draftRange) {
      return;
    }

    setActiveSegmentId(item.segmentId);
    const range = {
      segmentId: item.segmentId,
      startSecond: draftRange.startSecond,
      endSecond: draftRange.endSecond,
    };
    setPreviewTimingRange(range);

    if (videoRef.current) {
      videoRef.current.currentTime = range.startSecond;
      videoRef.current.play();
    }
  }

  function handleExitTimingPreview() {
    setPreviewTimingRange(null);

    if (videoRef.current && activeSegment) {
      videoRef.current.currentTime = activeSegment.startSecond;
    }
  }

  function handleVideoTimeUpdate() {
    if (!videoRef.current) {
      return;
    }

    setPlaybackSecond(videoRef.current.currentTime);

    if (!loopPlayback || !playbackRange) {
      return;
    }

    if (videoRef.current.currentTime > playbackRange.endSecond) {
      videoRef.current.currentTime = playbackRange.startSecond;
      videoRef.current.play();
    }
  }

  return (
    <main className="calibration-app">
      <header className="app-header card">
        <div>
          <h1>{t("title")}</h1>
          <p>{t("subtitle")}</p>
          <p className="api-mode">
            {t("apiMode")}: {calibrationApiMode}
          </p>
        </div>
        <div className="language-switch" aria-label={t("language")}>
          <span>{t("language")}</span>
          <button
            type="button"
            className={language === "en" ? "language-option-active" : ""}
            onClick={() => setLanguage("en")}
          >
            {t("english")}
          </button>
          <button
            type="button"
            className={language === "zh" ? "language-option-active" : ""}
            onClick={() => setLanguage("zh")}
          >
            {t("chinese")}
          </button>
        </div>
      </header>

      {errorText ? <p className="error-banner">{errorText}</p> : null}

      <section className="workspace-grid">
        <aside className="left-column">
          <section className="card form-card">
            <h2>{t("inputJob")}</h2>

            <div className="demo-loader">
              <label>
                {t("demoPreset")}
                <select
                  value={selectedDemoPresetId}
                  onChange={(event) =>
                    setSelectedDemoPresetId(event.target.value)
                  }
                >
                  {DEMO_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                className="button-secondary demo-load-button"
                onClick={handleLoadDemo}
                disabled={isBusy}
              >
                {t("loadDemo")}
              </button>
            </div>

            <label>
              {t("action")}
              <select
                value={selectedAction}
                onChange={(event) => setSelectedAction(event.target.value)}
              >
                {actions.map((action) => (
                  <option key={action.id} value={action.id}>
                    {action.displayName}
                  </option>
                ))}
              </select>
            </label>

            <label>
              {t("uploadVideo")}
              <input
                type="file"
                accept="video/*"
                onChange={(event) =>
                  handleVideoFileChange(event.target.files?.[0] ?? null)
                }
              />
            </label>

            <label>
              {t("poseJsonOptional")}
              <input
                key={videoFile?.name ?? "no-video"}
                type="file"
                accept="application/json,.json"
                onChange={(event) =>
                  handlePoseFileChange(event.target.files?.[0] ?? null)
                }
              />
            </label>

            {videoFile ? (
              <p className="asset-status">
                {t("video")}: {videoFile.name}
              </p>
            ) : null}

            {poseSummary ? (
              <p className="pose-status">
                {t("pose")}: {poseFileName} · {poseSummary.framesWithPose}/
                {poseSummary.framesTotal} {t("frames")} · {t("visibility")}{" "}
                {formatPoseMetric(poseSummary.avgVisibility)}
              </p>
            ) : (
              <p className="pose-status">{t("loadPoseJson")}</p>
            )}

            {analysisJob?.status === "succeeded" && activePeriodReport ? (
              <section className="active-period-suggestion">
                <header>
                  <strong>{t("activePeriodSuggestion")}</strong>
                  <span>
                    {activePeriodReport.recommendedRange
                      ? `${formatSecondMetric(
                          activePeriodReport.recommendedRange.startSecond,
                        )} - ${formatSecondMetric(
                          activePeriodReport.recommendedRange.endSecond,
                        )}`
                      : t("noActivePeriodSuggestion")}
                  </span>
                </header>
                {activePeriodReport.recommendedRange ? (
                  <>
                    <p>
                      {t("activePeriodDetected")}:{" "}
                      {activePeriodReport.recommendedRange.periodCount}{" "}
                      {t("activePeriods")} · {t("activePeriodDuration")}{" "}
                      {formatSecondMetric(
                        activePeriodReport.metrics.activeDurationSecond,
                      )}
                    </p>
                    {activePeriodReport.periods.length > 1 ? (
                      <p className="active-period-detail">
                        {t("activePeriodList")}:{" "}
                        {activePeriodReport.periods
                          .map(
                            (period) =>
                              `${formatSecondMetric(
                                period.startSecond,
                              )}-${formatSecondMetric(period.endSecond)}`,
                          )
                          .join(", ")}
                        <br />
                        {t("activePeriodSingleRangeLimit")}
                      </p>
                    ) : null}
                  </>
                ) : null}
              </section>
            ) : null}

            <div className="row-inputs">
              <label>
                {t("startSecond")}
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={startSecond}
                  onChange={(event) => {
                    analysisRangeOverrideRef.current = null;
                    setStartSecond(event.target.value);
                  }}
                />
              </label>

              <label>
                {t("endSecond")}
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={endSecond}
                  onChange={(event) => {
                    analysisRangeOverrideRef.current = null;
                    setEndSecond(event.target.value);
                  }}
                />
              </label>
            </div>

            <label>
              {t("expectedReps")}
              <input
                type="number"
                min="1"
                step="1"
                value={expectedReps}
                onChange={(event) => setExpectedReps(event.target.value)}
                placeholder="e.g. 3"
              />
            </label>

            <label>
              {t("notes")}
              <textarea
                value={analysisNotes}
                onChange={(event) => setAnalysisNotes(event.target.value)}
                rows={3}
                placeholder="e.g. 前三个正面，后四个侧面；前六个3分，最后一个2分"
              />
            </label>

            <button
              type="button"
              className="button-primary"
              onClick={handleStartAnalysis}
              disabled={isBusy}
            >
              {t("startAnalysis")}
            </button>

            <p className="job-status">
              {t("job")}: {formatProgressText(analysisJob, t)}
            </p>
          </section>

          <section className="card readiness-card">
            <h2>{t("ingestReadiness")}</h2>
            <p>
              {t("completed")}:{" "}
              {effectiveReadiness?.completedSegmentsCount ?? 0}/
              {effectiveReadiness?.allSegmentsCount ?? 0}
            </p>
            <p>
              {t("ready")}:{" "}
              {effectiveReadiness?.readyForIngest ? t("yes") : t("no")}
            </p>
            {effectiveReadiness?.blockingReasons?.length ? (
              <ul className="readiness-blockers">
                {effectiveReadiness.blockingReasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            ) : null}
            <button
              type="button"
              className="button-secondary"
              onClick={() => refreshReadiness(videoId)}
              disabled={!videoId || isBusy}
            >
              {t("checkReadiness")}
            </button>
            <button
              type="button"
              className="button-primary"
              onClick={handleIngest}
              disabled={!effectiveReadiness?.readyForIngest || isBusy}
            >
              {t("ingest")}
            </button>
            <button
              type="button"
              className="button-secondary"
              onClick={handleExportDataset}
              disabled={!videoId || isBusy}
            >
              {t("exportJson")}
            </button>
            <button
              type="button"
              className="button-secondary"
              onClick={handleExportCsv}
              disabled={!videoId || isBusy}
            >
              {t("exportCsv")}
            </button>
            <button
              type="button"
              className="button-secondary"
              onClick={handleExportPackage}
              disabled={!videoId || isBusy}
            >
              {t("exportPackage")}
            </button>
          </section>

          <section className="card readiness-card">
            <h2>{t("consistencySnapshot")}</h2>
            <p>
              {t("segments")}:{" "}
              {consistencySnapshot?.metrics?.segmentsTotal ?? 0}
            </p>
            <p>
              {t("validLabels")}:{" "}
              {consistencySnapshot?.metrics?.validCount ?? 0}
            </p>
            <p>
              {t("pendingLabels")}:{" "}
              {consistencySnapshot?.metrics?.pendingCount ?? 0}
            </p>
            <p>
              {t("invalidLabels")}:{" "}
              {consistencySnapshot?.metrics?.invalidCount ?? 0}
            </p>
            <p>
              {t("reviewerAgreement")}:{" "}
              {formatRate(consistencySnapshot?.metrics?.reviewerAgreementRate)}
            </p>
            <p>
              {t("aiFinalAgreement")}:{" "}
              {formatRate(consistencySnapshot?.metrics?.aiMatchesFinalRate)}
            </p>
            <button
              type="button"
              className="button-secondary"
              onClick={() => refreshConsistency(videoId)}
              disabled={!videoId || isBusy}
            >
              {t("refreshConsistency")}
            </button>
          </section>

          <section className="card evidence-summary-card">
            <h2>{t("exportChecklist")}</h2>
            <ul className="readiness-checklist">
              {exportChecklist.map((item) => (
                <li
                  className={`readiness-checklist-item readiness-checklist-${item.status}`}
                  key={item.title}
                >
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.detail}</span>
                  </div>
                  <em>{checklistStatusLabel(item.status, t)}</em>
                </li>
              ))}
            </ul>
            <dl className="summary-metrics">
              <div>
                <dt>{t("records")}</dt>
                <dd>{exportQualitySummary.recordsTotal}</dd>
              </div>
              <div>
                <dt>{t("validLabels")}</dt>
                <dd>
                  {exportQualitySummary.validLabels}/
                  {exportQualitySummary.recordsTotal}
                </dd>
              </div>
              <div>
                <dt>{t("pending")}</dt>
                <dd>{exportQualitySummary.pendingLabels}</dd>
              </div>
              <div>
                <dt>{t("pose")}</dt>
                <dd>
                  {getPoseStatusLabel(exportQualitySummary.pose.poseStatus, t)}
                </dd>
              </div>
              <div>
                <dt>{t("poseFrames")}</dt>
                <dd>
                  {exportQualitySummary.pose.framesWithPose}/
                  {exportQualitySummary.pose.framesTotal}
                </dd>
              </div>
              <div>
                <dt>{t("visibility")}</dt>
                <dd>
                  {formatPoseMetric(exportQualitySummary.pose.avgVisibility)}
                </dd>
              </div>
              <div>
                <dt>{t("timingQa")}</dt>
                <dd>
                  {exportQualitySummary.pose.timingGood}/
                  {exportQualitySummary.pose.timingTotal}
                </dd>
              </div>
              <div>
                <dt>{t("cycleCountQa")}</dt>
                <dd>
                  {getCycleCountQaStatusLabel(
                    exportQualitySummary.pose.cycleCountQaStatus,
                    t,
                  )}{" "}
                  · {t("expectedCandidateAssigned")}:{" "}
                  {exportQualitySummary.pose.expectedSegments ?? "N/A"}/
                  {exportQualitySummary.pose.candidateCycles ?? "N/A"}/
                  {exportQualitySummary.pose.assignedCycles ?? "N/A"}
                </dd>
              </div>
              <div>
                <dt>{t("timingEdits")}</dt>
                <dd>
                  {exportQualitySummary.timingCorrections.adjustedCount}/
                  {exportQualitySummary.timingCorrections.segmentsTotal}
                </dd>
              </div>
              <div>
                <dt>{t("avgShift")}</dt>
                <dd>
                  {formatSecondMetric(
                    exportQualitySummary.timingCorrections
                      .avgBoundaryShiftSecond,
                  )}
                </dd>
              </div>
              <div>
                <dt>{t("features")}</dt>
                <dd>
                  {exportQualitySummary.pose.featureUsable}/
                  {exportQualitySummary.pose.featureTotal}
                </dd>
              </div>
              <div>
                <dt>{t("aiSuggestions")}</dt>
                <dd>
                  {exportQualitySummary.pose.suggestionReady}/
                  {exportQualitySummary.pose.suggestionTotal}
                </dd>
              </div>
            </dl>
            <p className="summary-note">
              {t("poseEvidenceInExport")}:{" "}
              {exportQualitySummary.poseEvidenceAttached ? t("yes") : t("no")} ·
              {t("reviewer")}:{" "}
              {formatRate(exportQualitySummary.reviewerAgreementRate)} ·{" "}
              {t("aiFinalAgreement")}:{" "}
              {formatRate(exportQualitySummary.aiMatchesFinalRate)}
            </p>
            <div className="movement-summary">
              <h3>{t("movementLabels")}</h3>
              <div className="movement-summary-header" aria-hidden="true">
                <span>{t("movement")}</span>
                <span>{t("capability")}</span>
                <span>{t("total")}</span>
                <span>{t("valid")}</span>
                <span>{t("pending")}</span>
                <span>{t("invalid")}</span>
              </div>
              {movementSummaryRows.map((row) => (
                <div className="movement-summary-row" key={row.id}>
                  <span>{row.label}</span>
                  <em>
                    {t(
                      `posePipeline_${
                        row.capability?.posePipelineStatus ?? "unknown"
                      }`,
                    )}
                  </em>
                  <strong>{row.summary.segmentsTotal}</strong>
                  <strong>{row.summary.validCount}</strong>
                  <strong>{row.summary.pendingCount}</strong>
                  <strong>{row.summary.invalidCount}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="card manager-entry-card">
            <a
              className="button-secondary manager-entry-button"
              href="/study.html"
              rel="noreferrer"
              target="_blank"
            >
              Study Mode
            </a>
            <a
              className="button-secondary manager-entry-button"
              href="/video-manager.html"
              rel="noreferrer"
              target="_blank"
            >
              Video Manager
            </a>
          </section>
        </aside>

        <section className="center-column">
          <section className="card player-card">
            <header>
              <h2>{t("playback")}</h2>
              <div className="inline-toggle-row">
                <label className="inline-toggle">
                  <input
                    type="checkbox"
                    checked={loopPlayback}
                    onChange={(event) => setLoopPlayback(event.target.checked)}
                  />
                  {t("loopSegment")}
                </label>
                <label className="inline-toggle">
                  <input
                    type="checkbox"
                    checked={showKeypoints}
                    onChange={(event) => setShowKeypoints(event.target.checked)}
                  />
                  {posePayload ? t("showPose") : t("demoSkeleton")}
                </label>
              </div>
            </header>

            <div className="video-stage">
              {videoUrl ? (
                <video
                  ref={videoRef}
                  controls
                  src={videoUrl}
                  onLoadedMetadata={handleVideoLoadedMetadata}
                  onTimeUpdate={handleVideoTimeUpdate}
                >
                  <track kind="captions" />
                </video>
              ) : (
                <div className="video-placeholder">{t("videoPlaceholder")}</div>
              )}
              {videoUrl && showKeypoints && activeSegment ? (
                <KeypointOverlay
                  playbackSecond={playbackSecond}
                  cameraView={activeSegment.cameraView}
                  poseLandmarks={posePayload}
                />
              ) : null}
            </div>
            {showKeypoints ? (
              <p className="keypoint-note">
                {posePayload
                  ? t("realPoseOverlay").replace("{poseFileName}", poseFileName)
                  : t("demoSkeletonOnly")}
              </p>
            ) : null}

            {activeSegment ? (
              <div className="segment-nav">
                <span>
                  {previewTimingRange
                    ? t("previewingSuggestedTiming")
                    : t("segmentTiming")}
                  : {t("segment")} #{activeSegment.repetitionIndex} (
                  {activeSegment.cameraView})
                </span>
                <span>
                  {playbackRange.startSecond.toFixed(1)}s -
                  {playbackRange.endSecond.toFixed(1)}s
                </span>
              </div>
            ) : null}

            <div className="button-row">
              <button
                type="button"
                className="button-secondary"
                onClick={() => selectNeighborSegment(-1)}
                disabled={!activeSegment}
              >
                {t("prev")}
              </button>
              <button
                type="button"
                className="button-secondary"
                onClick={() => selectNeighborSegment(1)}
                disabled={!activeSegment}
              >
                {t("next")}
              </button>
              {previewTimingRange ? (
                <button
                  type="button"
                  className="button-secondary"
                  onClick={handleExitTimingPreview}
                >
                  {t("exitPreview")}
                </button>
              ) : activeTimingSuggestion?.aiDraftRange ? (
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() =>
                    handlePreviewTimingSuggestion(activeTimingSuggestion)
                  }
                >
                  {t("previewSuggestedTiming")}
                </button>
              ) : null}
            </div>
          </section>

          <SegmentEditor
            segment={activeSegment}
            disabled={isBusy}
            timingSuggestion={activeTimingSuggestion}
            aiSideSuggestion={activeAiSideSuggestion}
            onChange={handleSegmentMetadataChange}
            t={t}
          />

          <SegmentList
            segments={segments}
            activeSegmentId={activeSegmentId}
            timingReport={timingReport}
            onApplyAllTiming={
              movementAdapter?.supportsAiDraftTiming
                ? handleApplyAllTimingSuggestions
                : null
            }
            onSelect={handleSelectSegment}
            disabled={!segments.length}
            t={t}
          />

          <DeepSquatFeatureSnapshot
            report={featureReport}
            titleKey={movementAdapter?.featureTitleKey}
            activeSegmentId={activeSegmentId}
            t={t}
          />
        </section>

        <aside className="right-column">
          {activeSegment ? (
            <>
              <ScoreSummary
                actionType={activeSegment.actionType ?? selectedAction}
                aiScore={activeSegment.aiScore}
                adjudication={adjudicationPreview}
                poseSuggestion={activePoseSuggestion}
                movementCapability={activeMovementCapability}
                evidenceGate={activeEvidenceGate}
                t={t}
              />
              <ReviewerScoreForm
                title="Reviewer A"
                value={reviewerForms.reviewer_a}
                onChange={(next) => updateReviewerForm("reviewer_a", next)}
                onSave={() => handleSaveReview("reviewer_a")}
                context={{
                  actionLabel: activeActionLabel,
                  side: activeSegment.side,
                  clearingTest: activeSegment.clearingTest,
                  clearingFindings: activeSegment.clearingFindings,
                  painFlag: activeSegment.painFlag,
                }}
                disabled={isBusy}
                t={t}
              />
              <ReviewerScoreForm
                title="Reviewer B"
                value={reviewerForms.reviewer_b}
                onChange={(next) => updateReviewerForm("reviewer_b", next)}
                onSave={() => handleSaveReview("reviewer_b")}
                context={{
                  actionLabel: activeActionLabel,
                  side: activeSegment.side,
                  clearingTest: activeSegment.clearingTest,
                  clearingFindings: activeSegment.clearingFindings,
                  painFlag: activeSegment.painFlag,
                }}
                disabled={isBusy}
                t={t}
              />
            </>
          ) : (
            <section className="card empty-score-card">
              {t("runAnalysisEmpty")}
            </section>
          )}
        </aside>
      </section>

      {ingestResult ? (
        <section className="card ingest-result-card">
          <h2>{t("ingestResult")}</h2>
          <p>
            {t("batch")}: {ingestResult.ingestBatchId}
          </p>
          <p>
            {t("total")}: {ingestResult.segmentsTotal} | {t("valid")}:{" "}
            {ingestResult.segmentsValid} | {t("invalid")}:{" "}
            {ingestResult.segmentsInvalid}
            {ingestResult.segmentsProtocolEvidence ? (
              <>
                {" "}
                | {t("protocolEvidenceShort")}:{" "}
                {ingestResult.segmentsProtocolEvidence}
              </>
            ) : null}
          </p>
        </section>
      ) : null}

      <section className="card ingest-history-card">
        <div className="ingest-history-header">
          <div>
            <h2>{t("ingestHistory")}</h2>
            <p>{t("ingestHistorySaved")}</p>
          </div>
          <button
            type="button"
            className="button-secondary"
            onClick={handleExportIngestHistory}
            disabled={ingestHistory.length === 0}
          >
            {t("exportIngestHistory")}
          </button>
        </div>
        {ingestHistory.length > 0 ? (
          <ol className="ingest-history-list">
            {ingestHistory.slice(0, 5).map((entry, index) => (
              <li key={entry.id}>
                <strong>
                  {index === 0 ? `${t("latestIngest")} · ` : ""}
                  {entry.workflow?.videoFileName || entry.ingest.videoId}
                </strong>
                <span>
                  {t("batch")}: {entry.ingest.ingestBatchId}
                </span>
                <span>
                  {t("savedAt")}: {formatDateTime(entry.savedAt)}
                </span>
                <span>
                  {t("total")}: {entry.ingest.segmentsTotal} | {t("valid")}:{" "}
                  {entry.ingest.segmentsValid} | {t("invalid")}:{" "}
                  {entry.ingest.segmentsInvalid}
                  {entry.ingest.segmentsProtocolEvidence ? (
                    <>
                      {" "}
                      | {t("protocolEvidenceShort")}:{" "}
                      {entry.ingest.segmentsProtocolEvidence}
                    </>
                  ) : null}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p>{t("ingestHistoryEmpty")}</p>
        )}
      </section>
    </main>
  );
}
