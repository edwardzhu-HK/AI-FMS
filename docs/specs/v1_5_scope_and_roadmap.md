# AI-FMS V1.5 Scope and Roadmap

Date: 2026-05-22

## 1. Executive Decision

AI-FMS should be restarted as an **AI-assisted FMS video annotation and
movement-quality dataset platform**, not as a fully automatic FMS scoring
system.

The project should support all 7 FMS movement patterns at the workflow level,
while using **Deep Squat** as the first flagship movement for real pose
estimation, explainable movement features, AI-assisted segmentation, and
AI-suggested scoring.

This positioning is technically safer, easier to finish on schedule, and more
valuable for Ronnie's college application narrative: long-term student-athlete
experience, Human Movement Science, FMS learning, and AI-assisted movement
screening.

## 2. Inputs Reviewed

- Existing project implementation: React/Vite workbench, mock API, local API
  stub, manifest scripts, adjudication logic, and automated tests.
- `AI-FMS项目定位和规划.md`: recommends V1.5 instead of a simple annotation UI
  or an overcommitted full auto-scoring system.
- Ronnie application planning PDF dated 2026-05-19: positions Ronnie around
  Human Movement Science, student-athlete experience, FMS, and AI-assisted
  movement screening.
- Official/primary technical references:
  - MediaPipe Pose Landmarker Python guide: image/video pose landmarks and 3D
    world coordinates.
  - Ultralytics YOLO Pose docs: pose keypoints and confidence scores.
  - MMPose/OpenMMLab overview: research-grade pose toolbox and model zoo.

## 3. Product Thesis

The system does not replace coaches. It helps coaches and reviewers produce
more consistent, traceable, and reusable movement-screening data.

Application-facing summary:

> AI-FMS is a human-in-the-loop computer vision platform for Functional
> Movement Screen video annotation. It helps reviewers segment movement videos,
> inspect pose-based movement features, compare AI suggestions with human
> labels, adjudicate disagreements, and export traceable datasets for future
> movement-quality models.

## 4. Strategic Scope Layers

### V1: Seven-Movement Annotation Platform

Goal: keep the current platform useful as a complete annotation workflow.

In scope:

- 7 FMS movement entries.
- Local video upload and duration-aware Start/End defaults.
- Expected Reps and Notes-assisted segment generation.
- Segment list, loop playback, previous/next navigation.
- Reviewer A/B scoring with comments.
- AI suggestion placeholder or rules-based score.
- A/B/AI adjudication.
- Valid/invalid/pending label state.
- JSON/CSV-style export path.
- Consistency snapshot and basic dashboard metrics.

Acceptance demo:

- A Deep Squat sample video can be loaded, segmented, reviewed by two reviewers,
  adjudicated, and exported as traceable label records.

### V1.5: Deep Squat Flagship AI Pipeline

Goal: prove that the platform can support real pose-based AI assistance.

In scope:

- MediaPipe Pose Landmarker pipeline for Deep Squat videos.
- Per-frame keypoint JSON export.
- Real keypoint overlay aligned to the displayed video.
- Pose quality summary: missing-frame ratio, average visibility/confidence.
- Deep Squat movement features:
  - knee angle,
  - hip angle,
  - ankle relation,
  - trunk inclination,
  - squat depth proxy,
  - rep phase or lowest-point estimate.
- Pose-assisted segmentation suggestion.
- Manual segment adjustment and audit trail.
- AI suggestion with score, confidence, key features, and explanation.
- Comparison of AI suggestion against final adjudicated label.

Acceptance demo:

- One Deep Squat video shows real pose overlay, extracted features, suggested
  segments, explainable AI score suggestions, reviewer labels, adjudication, and
  export.

### V1.7: Selected Multi-Movement Expansion

Goal: demonstrate that the Deep Squat pipeline can be reused.

Planning reference: `docs/specs/v1_7_movement_expansion_plan.md`.

Priority order:

1. Active Straight Leg Raise: clearer side-view hip/leg angle analysis.
2. Shoulder Mobility: strong application tie-in to swimming and shoulder health.
3. Hurdle Step: useful single-leg stability and left/right comparison.
4. In-Line Lunge: relevant but more sensitive to view and stability.

Support level:

- These movements may begin with annotation-only support and gradually receive
  pose features and AI suggestions.
- Do not promise equal AI depth for all 7 movements in the first delivery.
- Any framework or schema change during movement expansion should be called out
  before implementation. Default strategy is backward-compatible adapters first,
  schema-version changes only after explicit review.

Current V1.7 implementation status:

- Active Straight Leg Raise has an implemented pose/timing/features/suggestion
  path and one browser-verifiable demo preset.
- Shoulder Mobility has a feature-only pose evidence path and one
  browser-verifiable demo preset; suggestion is intentionally held for more
  human calibration.
- Hurdle Step has completed an initial pose probe, timing/features helpers, and
  one browser demo path with first-pass pose-based AI suggestion. The scoring is
  reviewer support, not a final automatic FMS score.
- In-Line Lunge has completed an initial pose probe, timing/features helpers,
  and one browser demo path with first-pass pose-based AI suggestion. The
  selected 6-rep sample passes timing/features smoke, but knee-foot alignment
  and sample variety still need calibration before stronger AI scoring claims.
- Trunk Stability Push-Up and Rotary Stability are connected as annotation-only
  workflow paths. They can be segmented, reviewed, ingested in mock mode, and
  exported, but they do not yet have pose evidence or movement-specific AI
  features.

Four-movement local demo readiness is now covered by `npm run demo:check:four`.
As of 2026-05-23, Deep Squat, Active Straight Leg Raise, Shoulder Mobility, and
Hurdle Step all pass the local preset readiness check.

Seven-action local workflow smoke is now covered by `npm run demo:flow:seven`.
As of 2026-05-30, all 7 FMS action slots pass the mock end-to-end workflow:
Deep Squat, Active Straight Leg Raise, Hurdle Step, and In-Line Lunge as
implemented pose/AI paths; Shoulder Mobility as a feature-only pose path; and
Trunk Stability Push-Up / Rotary Stability as annotation-only paths.

### V2: Evaluation and Application Package

Goal: turn the project into a complete application asset.

In scope:

- Small sample dataset and dataset card.
- Inter-rater agreement report.
- AI-final agreement report.
- Segment timing error analysis.
- Per-movement difficulty notes.
- Technical report.
- GitHub-ready README.
- 2-3 minute demo video outline.
- Project page or portfolio-ready summary.

### V1.6: Dataset and Expansion Track

Goal: bridge the current working V1.5 demo into a stronger application-ready
dataset workflow before spending effort on showcase-only surfaces.

Development order agreed on 2026-05-23:

1. **Export Dataset Package**: one-click ZIP export containing dataset JSON,
   CSV, dataset card, run summary, and README.
2. **Readiness Checklist**: make export/ingest readiness understandable to a
   human reviewer, not only as engineering counters.
3. **Local State Persistence**: preserve reviewer scores, segment metadata,
   active demo preset, and selected segment during local testing.
4. **AI Draft Timing / Effective Action Discovery**: when pose JSON is
   available, Start/End only defines the analysis range; segment boundaries
   should default to pose-detected effective movement windows with a small
   review buffer, so long instruction or waiting sections do not dominate the
   actual clips.
5. **Selected Movement Expansion**: add one movement at a time after the Deep
   Squat dataset loop is stable.
6. **Demo/Project Snapshot Mode**: wait until the project has enough movement
   coverage and evidence to make a richer demo meaningful.

This order intentionally places Demo Mode after movement expansion. The demo
surface should summarize real capabilities rather than becoming a decorative
shell ahead of the evidence.

The active-period step has been folded into the segment-level workflow:
reviewers may still use Start/End to limit the analysis range, but after
analysis the primary editable `segment.startSecond` / `segment.endSecond`
should become the AI draft timing. The raw pose-detected cycle remains in
`poseTiming` for audit/export, while manual edits overwrite the segment timing
and change provenance from `ai_draft` to manual adjustment.

Batch QA on 2026-05-23 showed that this flow is stable for the current Deep
Squat samples, simple ASLR samples, the selected Hurdle Step demo, and the
6-rep In-Line Lunge sample after overlapping-cycle dedupe. ASLR 4-rep and
In-Line Lunge 4-rep still only produce 2 reliable cycles and must remain
review-blocked until human review confirms whether the issue is pose recall,
video content, or expected-rep metadata. A new `duplicate_cycle_assignment`
blocker prevents multiple segments from silently sharing the same detected
cycle. Shoulder Mobility is excluded from AI draft timing auto-apply until it
has a true movement-cycle detector instead of feature-only reach evidence.

The first cycle-to-rep matching pass now uses ordered one-to-one assignment:
candidate cycles are sorted by movement time, segments are sorted by repetition
order, and a detected cycle can be assigned to at most one segment. Segments
without a unique match receive `no_unique_cycle_assignment`. A second pass
deduplicates highly overlapping candidate cycles and keeps the stronger,
more-visible movement signal. This improves redundant-video handling, but
Hurdle Step still needs movement-specific filtering when candidate cycles
exceed Expected Reps.

True multi-interval video slicing remains a later schema decision because it
would affect segment provenance and export semantics. For V1.6, effective
action discovery happens by generating one reviewed segment per detected
movement cycle, not by storing arbitrary disjoint video intervals.

## 5. Explicit Non-Goals

The restarted project should not commit to:

- Fully automatic FMS scoring across all 7 movements.
- Certified-coach-level accuracy claims.
- Medical diagnosis.
- Pain detection or injury-risk prediction.
- Realtime live scoring.
- Multi-person video handling.
- Native mobile app delivery.
- Full model training pipeline before a quality labeled dataset exists.

## 6. Data Model Upgrade

The current segment-centric schema is a good foundation, but V1.5 needs fields
that make the data credible for FMS and future model training.

Recommended record shape:

```json
{
  "video_id": "vid_001",
  "participant_id": "anon_001",
  "action_type": "deep_squat",
  "rep_index": 1,
  "side": "none",
  "camera_view": "front",
  "start_ms": 1200,
  "end_ms": 5400,
  "pose_model": "mediapipe_pose_landmarker",
  "pose_model_version": "x.x",
  "keypoints_uri": "pose/vid_001_rep_001.json",
  "pose_confidence_summary": {
    "avg_visibility": 0.86,
    "missing_frames_ratio": 0.04
  },
  "ai_suggestion": {
    "score": 2,
    "confidence": 0.71,
    "features": {
      "max_knee_flexion_deg": 96,
      "trunk_inclination_deg": 31,
      "depth_reached": true
    },
    "explanation": "Completed movement, but compensation detected."
  },
  "reviewer_a": {
    "score": 2,
    "comment": "Good depth, slight trunk lean."
  },
  "reviewer_b": {
    "score": 3,
    "comment": "Acceptable form."
  },
  "pain_flag": false,
  "clearing_test": "not_applicable",
  "final_label": 2,
  "adjudication_source": "ai_plus_reviewer_a",
  "validity_status": "valid",
  "rubric_version": "fms_v1.0"
}
```

Required schema concepts:

- `side`: none, left, right, bilateral, unknown.
- `raw_score`: 0/1/2/3.
- `final_score`: computed or reviewer-confirmed final score.
- `pain_flag`: only from human input, not AI inference.
- `clearing_test`: not_applicable, pass, fail, unknown.
- `rubric_version`: stable scoring rubric reference.
- `pose_model` and `pose_model_version`.
- `pose_confidence_summary`.
- `features`: action-specific motion features.
- `explanation`: reviewer-readable AI rationale.

## 7. Proposed Architecture

```text
Frontend Workbench
  React/Vite
  upload, segment editor, playback, reviewer forms, AI panel, dashboard

API Layer
  Fastify/Nest/FastAPI candidate
  videos, jobs, segments, reviews, labels, exports

Pose Service
  Python + MediaPipe first
  frame sampling, landmarks, feature extraction, segment suggestions

Storage
  Postgres or SQLite during prototype
  object/file storage for videos, segment clips, keypoint JSON

Evaluation Package
  manifest validator, agreement reports, dataset card, technical report
```

## 8. Schedule

This schedule assumes the application asset should be materially complete before
the 2026 summer application-material closeout window.

### M0: Scope Lock and Documentation

Dates: 2026-05-22 to 2026-05-24

Deliverables:

- V1.5 scope document.
- Updated README and backlog.
- Application-facing project brief.
- PDF project explanation.

### M1: Data Model and Annotation Workflow Hardening

Dates: 2026-05-25 to 2026-06-07

Deliverables:

- Score support for 0/1/2/3.
- Side/pain/clearing/rubric fields.
- Segment manual adjustment UI.
- Export JSON schema.
- Tests for upgraded adjudication and export.

### M2: Deep Squat Pose Pipeline

Dates: 2026-06-08 to 2026-06-21

Deliverables:

- MediaPipe pose extraction script.
- Keypoints JSON output.
- Real overlay in the workbench.
- Pose quality summary.
- At least one Deep Squat sample processed end to end.

### M3: Pose-Assisted Segmentation

Dates: 2026-06-22 to 2026-07-05

Deliverables:

- Hip/knee trajectory-based segment suggestion.
- Start/end manual adjustment.
- Default the editable segment timing to AI draft movement windows after
  analysis, while preserving raw suggested cycle timing for audit/export.
- Record AI draft vs manually adjusted segment times.
- Segment quality report.

### M4: Deep Squat AI Suggestion

Dates: 2026-07-06 to 2026-07-19

Deliverables:

- Feature extraction for Deep Squat.
- Rules-based or lightweight model-based score suggestion.
- Confidence and explanation panel.
- Tests for feature thresholds and suggestion payloads.

### M5: Dashboard, Dataset Export, and Evaluation

Dates: 2026-07-20 to 2026-08-02

Deliverables:

- AI-final agreement.
- Inter-rater agreement.
- Valid/invalid/pending dashboard.
- Dataset card draft.
- CSV/JSON export for labeled segments.

### M6: Application Package

Dates: 2026-08-03 to 2026-08-16

Deliverables:

- Polished README.
- Technical report draft.
- Project page content.
- Demo video script.
- Final application project brief.

### Stretch: Multi-Movement Expansion

Dates: 2026-08-17 to 2026-08-30

Deliverables:

- Add pose features for one additional movement if data quality is strong.
- Preferred first stretch: Active Straight Leg Raise or Shoulder Mobility.

## 9. Risks and Mitigations

- Pose keypoints may be noisy or misaligned.
  - Mitigation: store pose confidence and allow manual review; do not overclaim.
- FMS scoring rules are more complex than a 1/2/3 classifier.
  - Mitigation: add 0/1/2/3, side, pain flag, clearing test, and rubric version.
- Seven movements may create scope sprawl.
  - Mitigation: platform supports seven, flagship AI depth starts with Deep Squat.
- Application material may become too technical.
  - Mitigation: keep a human story: swimming -> movement observation -> FMS ->
    AI-assisted screening -> Human Movement Science.

## 10. Immediate Next Sprint

Implementation status on 2026-05-22:

1. V1.5 data schema adapters now support 0/1/2/3 scores, side, pain flag,
   clearing test, rubric version, and suggested-vs-adjusted segment timing.
2. The workbench now has segment manual editing controls.
3. The current mock/stub workflow can export JSON dataset records.
4. The demo keypoint overlay is labeled as demo-only so it is not confused with
   real model output.
5. Automated tests cover upgraded adjudication, metadata correction, and
   dataset export.

Implementation status after the first P2 pass:

1. Added `scripts/extract-pose-landmarks.py` for MediaPipe Pose Landmarker
   VIDEO-mode extraction.
2. Added `scripts/download-pose-landmarker-model.py` for official `.task` model
   download.
3. Defined `ai_fms_pose_landmarks_v1` JSON output in
   `docs/specs/pose_landmarks_schema.md`.
4. Added pose JSON validation and quality-summary helpers plus tests.
5. Generated real pose JSON for `Sample-1.mp4`: 441 sampled frames, 441 frames
   with pose, missing-frame ratio 0.0, average visibility about 0.9031.
6. The workbench can now upload `ai_fms_pose_landmarks_v1` JSON and render a
   real MediaPipe pose overlay by selecting the nearest sampled frame for the
   current playback time.
7. Added Deep Squat pose-assisted timing QA: shoulder/hip/ankle depth trajectory
   extraction, lowest-point detection, suggested start/end, coverage ratio, and
   selected-segment adjustment UI.
8. Added a batch Segment Timing QA report that compares current/manual segment
   ranges against detected cycles and highlights blocking issues per repetition.
9. Added first-pass Deep Squat feature extraction and UI snapshot for depth,
   torso control, and knee alignment evidence. On `Sample-1.pose.json`, the
   final side-view repetition is flagged as `forward lean watch`, matching the
   known lower-quality final repetition directionally.
10. Added pose-based explainable Deep Squat suggestions with subscores,
    confidence, reviewer-readable reasons, and pose-vs-final comparison in the
    AI panel. On `Sample-1.pose.json`, the first six reps suggest 3 and the
    final rep suggests 2 because torso control is `forward lean watch`.
11. JSON export now includes optional pose-derived evidence: timing QA, feature
    snapshots, explainable pose suggestions, pose summary metadata, and V2+
    action slots for later expansion to all 7 FMS movements.
12. Added CSV export for reviewer/spreadsheet inspection and a Deep Squat
    dataset card draft for application review.
13. Added application package planning materials:
    `docs/demo_walkthrough_script_ai_fms_v1_5.md`,
    `docs/technical_report_outline_ai_fms_v1_5.md`, and
    `docs/application_package_notes_ai_fms_v1_5.md`.
14. Regenerated `docs/AI-FMS_project_brief_application.pdf` from the Chinese
    application brief and verified it has extractable text across 8 pages.
15. Added an Export Evidence dashboard card that summarizes label completion,
    pose frame coverage, timing QA, feature coverage, AI suggestion coverage,
    and whether pose evidence will be attached to JSON/CSV exports.
16. Added reviewer agreement and AI-final agreement rates to the consistency
    dashboard metrics.
17. Added movement-level valid/pending/invalid label summary rows for all 7 FMS
    action slots in the Export Evidence dashboard.
18. Added segment timing correction summary for manual boundary edits, average
    boundary shift, and max boundary shift.
19. Added sample video inventory tooling for
    `Eval_Videos/Sample videos`: 64 videos across the 7 movement folders,
    per-file metadata from `ffprobe`, readiness flags, quality notes, JSON
    inventory, Chinese Markdown report, and draft sample manifests.
20. Generated and validated draft sample manifests for 6 movement groups:
    Deep Squat, Hurdle Step, In-Line Lunge, Shoulder Mobility, Active Straight
    Leg Raise, and Trunk Stability Push-Up. Rotary Stability currently has only
    review-only/tutorial-like samples and needs better candidate footage.
21. Added side-view angle-based Deep Squat evidence for hip angle, knee angle,
    MediaPipe ankle angle when foot landmarks are present, and shank-lean ankle
    proxy. These features are evidence-only and do not change the existing
    pose-based score mapping.
22. Added a `Deep Squat Demo` preset loader in the workbench so demo dry-runs
    can load `Sample-1`, `front`, or `side` video/pose pairs without manual
    file picking.
23. Added AI draft timing so pose-assisted segment boundaries can become the
    default editable clips after analysis, with a secondary rebuild action for
    reviewers who want to restore those boundaries after manual edits.
24. Added a reproducible Deep Squat demo dry-run checklist and generated three
    screenshot assets for the project/application package:
    `docs/assets/ai-fms-demo-overview.jpg`,
    `docs/assets/ai-fms-demo-side-angle-features.jpg`, and
    `docs/assets/ai-fms-demo-export-evidence.jpg`.
25. Added README screenshot/demo-path sections and standalone project-page copy
    in `docs/project_page_copy_ai_fms_v1_5.md`.
26. Generated Deep Squat pose JSON for `front.mp4` and `side.mp4`, then
    browser-verified all three demo presets: `Sample-1` keeps `1-45s`,
    `front` keeps `0-18s`, and `side` keeps `0-26s` with matching pose status.
27. Local note: MediaPipe extraction needs to run outside the Codex sandbox on
    this Mac because the graph creates a macOS GL/Metal context even with CPU
    delegate.

Recommended next sprint:

1. Promote selected draft sample rows into canonical movement manifests after
   reviewer confirmation.
2. Record the Deep Squat flagship demo using the walkthrough script.
3. Prepare a public-facing project page from the standalone copy draft.
4. Choose the next movement-specific pose feature target after sample review.
