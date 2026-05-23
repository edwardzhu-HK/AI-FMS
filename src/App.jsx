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
} from "./lib/adjudication.js";
import { summarizeConsistency } from "./lib/consistency.js";
import { buildDatasetCsv } from "./lib/dataset-csv.js";
import { buildDatasetPackageZip } from "./lib/dataset-package.js";
import {
  attachPoseEvidenceToDataset,
  buildDatasetExport,
} from "./lib/dataset-export.js";
import { summarizeExportQuality } from "./lib/export-quality.js";
import {
  allSegmentsMatchAdapter,
  getImplementedPoseActionTypes,
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

const REVIEWER_A_DEFAULT_ID = "Coach_in_video";
const REVIEWER_B_DEFAULT_ID = "Coach_Ronnie";
const DEFAULT_DEEP_SQUAT_DEMO_PRESET_ID = "sample-1";
const WORKFLOW_STORAGE_KEY = "ai-fms-v1-6-local-workflow";
const DEEP_SQUAT_DEMO_PRESETS = [
  {
    id: "sample-1",
    label: "Sample-1 mixed views",
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
    videoUrl: "/Eval_Videos/01-Deep%20Squat/side.mp4",
    poseUrl: "/Eval_Videos/01-Deep%20Squat/pose/side.pose.json",
    videoFileName: "side.mp4",
    poseFileName: "side.pose.json",
    range: {
      startSecond: "0",
      endSecond: "26",
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
    deepSquatDemo: "Deep Squat Demo",
    loadDemo: "Load Demo",
    action: "Action",
    uploadVideo: "Upload Video",
    poseJsonOptional: "Pose JSON (optional)",
    video: "Video",
    pose: "Pose",
    frames: "frames",
    visibility: "visibility",
    loadPoseJson: "Load generated MediaPipe JSON to replace the demo skeleton.",
    activePeriodSuggestion: "Active period suggestion",
    activePeriodDetected: "recommended range",
    activePeriods: "active periods",
    activePeriodDuration: "active duration",
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
    completed: "Completed",
    partial: "Partial",
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
    timingEdits: "Timing edits",
    avgShift: "Avg shift",
    features: "Features",
    aiSuggestions: "AI suggestions",
    poseEvidenceInExport: "Pose evidence in export",
    reviewer: "Reviewer",
    movementLabels: "Movement Labels",
    movement: "Movement",
    view: "View",
    total: "Total",
    valid: "Valid",
    invalid: "Invalid",
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
    exitPreview: "Exit preview",
    previewSuggestedTiming: "Preview suggested timing",
    suggestedTiming: "Suggested timing",
    timingStatus: "Timing status",
    reviewStatus: "Review status",
    ingestResult: "Ingest Result",
    batch: "Batch",
    reviewerId: "Reviewer ID",
    totalScore: "Total Score",
    comment: "Comment",
    save: "Save",
    aiSuggestion: "AI Suggestion",
    status: "Status",
    source: "Source",
    humanConsensus: "Human Consensus",
    aiHumanMatch: "AI-Human Match",
    none: "None",
    poseBasedSuggestion: "Pose-based suggestion",
    poseBasedAiSuggestion: "Pose-based AI Suggestion",
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
    reason_pelvicStability: "Pelvic Stability",
    reason_legLine: "Leg Line",
    reason_sideConfidence: "Side Confidence",
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
    "reason_view_best from front view":
      "This criterion is more reliable from a front-view video, so the current value is kept as context rather than final evidence.",
    "reason_view_best from side view":
      "This criterion is more reliable from a side-view video, so the current value is kept as context rather than final evidence.",
    reason_timingNeedsAdjustment:
      "Timing QA indicates the segment may need adjustment before final scoring; review the suggested timing first.",
    segmentMetadata: "Segment Metadata",
    suggested: "suggested",
    lowest: "lowest",
    coverage: "coverage",
    segmentCoversCycle: "Segment covers the detected movement cycle.",
    applySuggestedTiming: "Apply Suggested Timing",
    side: "Side",
    clearingTest: "Clearing Test",
    rubricVersion: "Rubric Version",
    painFlag: "Pain flag",
    saveSegmentMetadata: "Save Segment Metadata",
    segmentTimingQa: "Segment Timing QA",
    cycles: "cycles",
    applyAllSuggestedTiming: "Apply All Suggested Timing",
    noCycle: "No cycle",
    deepSquatFeatures: "Deep Squat Features",
    usable: "usable",
    depth: "Depth",
    torso: "Torso",
    knee: "Knee",
    hipAngle: "Hip angle",
    kneeAngle: "Knee angle",
    ankleProxy: "Ankle proxy",
    statusReady: "Ready",
    statusLimited: "Limited",
    statusInvalid: "Invalid",
    statusMissingPose: "No pose JSON",
    unknown: "Unknown",
    uploadVideoFirst: "Please upload a video file first.",
    invalidStartEnd: "Start/End second is invalid.",
    invalidExpectedReps: "Expected reps must be a positive integer.",
    reviewerIdRequired: "Reviewer ID is required before saving.",
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
    deepSquatDemo: "Deep Squat Demo",
    loadDemo: "加载 Demo",
    action: "Action",
    uploadVideo: "上传视频",
    poseJsonOptional: "Pose JSON（可选）",
    video: "视频",
    pose: "Pose",
    frames: "帧",
    visibility: "可见度",
    loadPoseJson: "加载 MediaPipe JSON 后会替换 demo skeleton。",
    activePeriodSuggestion: "有效动作时间建议",
    activePeriodDetected: "建议范围",
    activePeriods: "有效片段",
    activePeriodDuration: "有效动作时长",
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
    completed: "已完成",
    partial: "部分完成",
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
    timingEdits: "Timing 调整",
    avgShift: "平均偏移",
    features: "Features",
    aiSuggestions: "AI 建议",
    poseEvidenceInExport: "导出包含 pose evidence",
    reviewer: "Reviewer",
    movementLabels: "Movement 标签",
    movement: "Movement",
    view: "视角",
    total: "总数",
    valid: "有效",
    invalid: "无效",
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
    exitPreview: "退出预览",
    previewSuggestedTiming: "预览建议 timing",
    suggestedTiming: "建议 timing",
    timingStatus: "Timing 状态",
    reviewStatus: "Review 状态",
    ingestResult: "入库结果",
    batch: "批次",
    reviewerId: "Reviewer ID",
    totalScore: "总分",
    comment: "评论",
    save: "保存",
    aiSuggestion: "AI 建议",
    status: "状态",
    source: "来源",
    humanConsensus: "人工一致",
    aiHumanMatch: "AI-人工匹配",
    none: "无",
    poseBasedSuggestion: "基于 pose 的建议",
    poseBasedAiSuggestion: "基于 Pose 的 AI 建议",
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
    reason_pelvicStability: "Pelvic Stability",
    reason_legLine: "Leg Line",
    reason_sideConfidence: "Side Confidence",
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
    "reason_view_best from front view":
      "这个指标更适合用正面机位判断，因此当前结果只作为参考，不作为最终证据。",
    "reason_view_best from side view":
      "这个指标更适合用侧面机位判断，因此当前结果只作为参考，不作为最终证据。",
    reason_timingNeedsAdjustment:
      "Timing QA 提示这个 segment 可能还需要调整；建议先预览并确认 suggested timing，再做最终评分。",
    segmentMetadata: "Segment 元数据",
    suggested: "建议",
    lowest: "最低点",
    coverage: "覆盖率",
    segmentCoversCycle: "Segment 覆盖了检测到的动作周期。",
    applySuggestedTiming: "应用建议 timing",
    side: "Side",
    clearingTest: "Clearing Test",
    rubricVersion: "Rubric Version",
    painFlag: "Pain flag",
    saveSegmentMetadata: "保存 Segment 元数据",
    segmentTimingQa: "Segment Timing QA",
    cycles: "动作周期",
    applyAllSuggestedTiming: "应用全部建议 timing",
    noCycle: "无 cycle",
    deepSquatFeatures: "Deep Squat Features",
    usable: "可用",
    depth: "Depth",
    torso: "Torso",
    knee: "Knee",
    hipAngle: "Hip angle",
    kneeAngle: "Knee angle",
    ankleProxy: "Ankle proxy",
    statusReady: "Ready",
    statusLimited: "Limited",
    statusInvalid: "Invalid",
    statusMissingPose: "无 Pose JSON",
    unknown: "Unknown",
    uploadVideoFirst: "请先上传视频。",
    invalidStartEnd: "Start/End 秒数无效。",
    invalidExpectedReps: "Expected reps 必须是正整数。",
    reviewerIdRequired: "保存前必须填写 Reviewer ID。",
    analysisFailed: "分析失败。",
  },
};

function translate(language, key) {
  return UI_TEXT[language]?.[key] ?? UI_TEXT.en[key] ?? key;
}

function getEvalVideoPreset(fileName) {
  return EVAL_VIDEO_PRESETS[fileName.toLowerCase()] ?? null;
}

function getDeepSquatDemoPreset(presetId) {
  return (
    DEEP_SQUAT_DEMO_PRESETS.find((preset) => preset.id === presetId) ??
    DEEP_SQUAT_DEMO_PRESETS[0]
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
      comment: "",
    };
  }

  return {
    reviewerId: source.reviewerId || fallbackReviewerId,
    totalScore: source.totalScore ?? fallbackTotalScore,
    comment: source.comment ?? "",
  };
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

function getPoseStatusLabel(status, t) {
  const labels = {
    ready: t("statusReady"),
    limited: t("statusLimited"),
    invalid: t("statusInvalid"),
    missing: t("statusMissingPose"),
  };

  return labels[status] ?? t("unknown");
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
          ? `${summary.pose.timingGood}/${summary.pose.timingTotal} · ${t(
              "checklistTimingQaPending",
            )}`
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
        summary,
      });
    }
  }

  return rows;
}

function getLocalWorkflowSnapshot() {
  try {
    const rawSnapshot = window.localStorage.getItem(WORKFLOW_STORAGE_KEY);
    return rawSnapshot ? JSON.parse(rawSnapshot) : null;
  } catch {
    return null;
  }
}

function setLocalWorkflowSnapshot(snapshot) {
  try {
    window.localStorage.setItem(WORKFLOW_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Local persistence is a convenience for the workbench, not a hard blocker.
  }
}

function buildLocalReadiness(videoId, segments) {
  const completedSegmentsCount = segments.filter(
    (segment) => getSegmentReviewStatus(segment) === "completed",
  ).length;

  return {
    videoId,
    allSegmentsCount: segments.length,
    completedSegmentsCount,
    readyForIngest:
      segments.length > 0 && completedSegmentsCount === segments.length,
    blockingReasons:
      segments.length > 0 && completedSegmentsCount === segments.length
        ? []
        : ["some segments are still pending reviewer scores"],
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
      rubricVersion: payload.rubricVersion || "fms_v1.0",
      segmentSource: "manual_adjusted",
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
  const [loopPlayback, setLoopPlayback] = useState(true);
  const [showKeypoints, setShowKeypoints] = useState(false);
  const [posePayload, setPosePayload] = useState(null);
  const [poseSummary, setPoseSummary] = useState(null);
  const [poseFileName, setPoseFileName] = useState("");
  const [selectedDemoPresetId, setSelectedDemoPresetId] = useState(
    DEFAULT_DEEP_SQUAT_DEMO_PRESET_ID,
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

    return (
      timingReport.items.find(
        (item) => item.segmentId === activeSegment.segmentId,
      ) ?? null
    );
  }, [activeSegment, timingReport]);

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
      featureReport,
      timingReport,
    });
  }, [featureReport, movementAdapter, timingReport]);

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
      snapshot.selectedDemoPresetId ?? DEFAULT_DEEP_SQUAT_DEMO_PRESET_ID,
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
        const demoPreset = getDeepSquatDemoPreset(
          snapshot.selectedDemoPresetId ?? DEFAULT_DEEP_SQUAT_DEMO_PRESET_ID,
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

    const demoPreset = getDeepSquatDemoPreset(selectedDemoPresetId);
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
        selectedAction === "deep_squat" &&
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

  async function syncSegments(targetVideoId) {
    try {
      const response = await getVideoSegments(targetVideoId);
      setSegments(response.items);

      if (response.items.length > 0) {
        setActiveSegmentId(
          (currentId) => currentId || response.items[0].segmentId,
        );
      }

      setReadiness(buildLocalReadiness(targetVideoId, response.items));
      setConsistencySnapshot(
        buildLocalConsistency(targetVideoId, response.items),
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
            await syncSegments(jobResult.videoId);
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

  function handleApplyActivePeriodSuggestion() {
    const range = activePeriodReport?.recommendedRange;

    if (!range) {
      return;
    }

    analysisRangeOverrideRef.current = null;
    setStartSecond(String(range.startSecond));
    setEndSecond(String(range.endSecond));
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

  async function handleLoadDeepSquatDemo() {
    setErrorText("");
    setIsBusy(true);

    try {
      const demoPreset = getDeepSquatDemoPreset(selectedDemoPresetId);
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
      const posePayloadJson = JSON.parse(await poseAsset.text());

      setSelectedAction("deep_squat");
      handleVideoFileChange(videoAsset, {
        analysisRangeOverride: demoPreset.range,
      });
      applyPosePayload(posePayloadJson, poseAsset.name);
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
      const savedScore = {
        reviewerId: form.reviewerId.trim(),
        totalScore: form.totalScore,
        subscores: {
          depth: form.totalScore,
          kneeAlignment: form.totalScore,
          torsoControl: form.totalScore,
        },
        comment: form.comment,
        savedAt: new Date().toISOString(),
      };

      await saveSegmentReview({
        segmentId: activeSegment.segmentId,
        reviewerRole: role,
        reviewerId: savedScore.reviewerId,
        score: {
          totalScore: savedScore.totalScore,
          subscores: savedScore.subscores,
          comment: savedScore.comment,
        },
      });

      await syncSegments(videoId);
    } catch {
      const nextSegments = applyLocalReviewToSegments(
        segments,
        activeSegment.segmentId,
        role,
        {
          reviewerId: form.reviewerId.trim(),
          totalScore: form.totalScore,
          subscores: {
            depth: form.totalScore,
            kneeAlignment: form.totalScore,
            torsoControl: form.totalScore,
          },
          comment: form.comment,
          savedAt: new Date().toISOString(),
        },
      );
      setSegments(nextSegments);
      setReadiness(buildLocalReadiness(videoId, nextSegments));
      setConsistencySnapshot(buildLocalConsistency(videoId, nextSegments));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSaveSegmentMetadata(payload) {
    if (!activeSegment || !videoId) {
      return;
    }

    setErrorText("");

    if (
      Number.isNaN(payload.startSecond) ||
      Number.isNaN(payload.endSecond) ||
      payload.endSecond <= payload.startSecond
    ) {
      setErrorText(t("invalidStartEnd"));
      return;
    }

    setIsBusy(true);

    try {
      await updateSegmentMetadata(payload);
      await syncSegments(videoId);
    } catch {
      const nextSegments = applyLocalMetadataToSegments(segments, payload);
      setSegments(nextSegments);
      setReadiness(buildLocalReadiness(videoId, nextSegments));
      setConsistencySnapshot(buildLocalConsistency(videoId, nextSegments));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleApplyAllTimingSuggestions() {
    if (!videoId || !timingReport?.items?.length) {
      return;
    }

    const updates = timingReport.items
      .filter((item) => item.cycle)
      .map((item) => {
        const segment = segments.find(
          (candidate) => candidate.segmentId === item.segmentId,
        );

        if (!segment) {
          return null;
        }

        return {
          segmentId: segment.segmentId,
          startSecond: item.cycle.startSecond,
          endSecond: item.cycle.endSecond,
          side: segment.side,
          painFlag: segment.painFlag,
          clearingTest: segment.clearingTest,
          rubricVersion: segment.rubricVersion,
        };
      })
      .filter(Boolean);

    if (updates.length === 0) {
      return;
    }

    setErrorText("");
    setPreviewTimingRange(null);
    setIsBusy(true);

    try {
      for (const payload of updates) {
        await updateSegmentMetadata(payload);
      }

      await syncSegments(videoId);
    } catch {
      const nextSegments = updates.reduce(
        (currentSegments, payload) =>
          applyLocalMetadataToSegments(currentSegments, payload),
        segments,
      );
      setSegments(nextSegments);
      setReadiness(buildLocalReadiness(videoId, nextSegments));
      setConsistencySnapshot(buildLocalConsistency(videoId, nextSegments));
    } finally {
      setIsBusy(false);
    }
  }

  async function buildCurrentDatasetExport() {
    let dataset = null;

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

  async function handleIngest() {
    setErrorText("");
    setIsBusy(true);

    try {
      const result = await ingestVideo(videoId, "reviewer_a");
      setIngestResult(result);
      await Promise.all([
        refreshReadiness(videoId),
        refreshConsistency(videoId),
      ]);
    } catch (error) {
      if (!readiness?.readyForIngest || segments.length === 0) {
        setErrorText(error.message);
        return;
      }

      const summary = summarizeIngest(segments);
      setIngestResult({
        ingestBatchId: `local_${Date.now()}`,
        videoId,
        requestedBy: "reviewer_a",
        segmentsTotal: summary.segmentsTotal,
        segmentsValid: summary.segmentsValid,
        segmentsInvalid: summary.segmentsInvalid,
        status: "succeeded",
        createdAt: new Date().toISOString(),
      });
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
    if (!item?.cycle) {
      return;
    }

    setActiveSegmentId(item.segmentId);
    const range = {
      segmentId: item.segmentId,
      startSecond: item.cycle.startSecond,
      endSecond: item.cycle.endSecond,
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
                {t("deepSquatDemo")}
                <select
                  value={selectedDemoPresetId}
                  onChange={(event) =>
                    setSelectedDemoPresetId(event.target.value)
                  }
                >
                  {DEEP_SQUAT_DEMO_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                className="button-secondary demo-load-button"
                onClick={handleLoadDeepSquatDemo}
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

            {activePeriodReport ? (
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
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={handleApplyActivePeriodSuggestion}
                    >
                      {t("applyActivePeriod")}
                    </button>
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
              {t("completed")}: {readiness?.completedSegmentsCount ?? 0}/
              {readiness?.allSegmentsCount ?? 0}
            </p>
            <p>
              {t("ready")}: {readiness?.readyForIngest ? t("yes") : t("no")}
            </p>
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
              disabled={!readiness?.readyForIngest || isBusy}
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
                <span>{t("total")}</span>
                <span>{t("valid")}</span>
                <span>{t("pending")}</span>
                <span>{t("invalid")}</span>
              </div>
              {movementSummaryRows.map((row) => (
                <div className="movement-summary-row" key={row.id}>
                  <span>{row.label}</span>
                  <strong>{row.summary.segmentsTotal}</strong>
                  <strong>{row.summary.validCount}</strong>
                  <strong>{row.summary.pendingCount}</strong>
                  <strong>{row.summary.invalidCount}</strong>
                </div>
              ))}
            </div>
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
                    : t("currentSegmentTiming")}
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
              ) : activeTimingSuggestion?.cycle ? (
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
            onSave={handleSaveSegmentMetadata}
            t={t}
          />

          <SegmentList
            segments={segments}
            activeSegmentId={activeSegmentId}
            timingReport={timingReport}
            onApplyAllTiming={handleApplyAllTimingSuggestions}
            onSelect={handleSelectSegment}
            disabled={!segments.length}
            t={t}
          />

          <DeepSquatFeatureSnapshot
            report={
              movementAdapter?.featureTitleKey === "deepSquatFeatures"
                ? featureReport
                : null
            }
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
                t={t}
              />
              <ReviewerScoreForm
                title="Reviewer A"
                value={reviewerForms.reviewer_a}
                onChange={(next) => updateReviewerForm("reviewer_a", next)}
                onSave={() => handleSaveReview("reviewer_a")}
                disabled={isBusy}
                t={t}
              />
              <ReviewerScoreForm
                title="Reviewer B"
                value={reviewerForms.reviewer_b}
                onChange={(next) => updateReviewerForm("reviewer_b", next)}
                onSave={() => handleSaveReview("reviewer_b")}
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
          </p>
        </section>
      ) : null}
    </main>
  );
}
