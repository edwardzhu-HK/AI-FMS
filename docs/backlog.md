# Backlog

Date: 2026-08-09

This backlog has been reset around the V1.5 restart plan:

**Seven-movement annotation platform + Deep Squat flagship AI pipeline +
application-ready evidence package.**

See `docs/specs/v1_5_scope_and_roadmap.md` for the canonical scope.

## P0: Restart Alignment

- [x] Reposition project as an AI-assisted, human-in-the-loop FMS video
      annotation and movement-quality dataset platform.
- [x] Review existing project implementation and legacy V1 docs.
- [x] Review AI-FMS planning document.
- [x] Review Ronnie application planning context.
- [x] Create project-specific `AGENTS.md`.
- [x] Create V1.5 scope and roadmap document.
- [x] Create application-facing project brief.
- [x] Initialize or reconnect Git repository for durable change tracking.

## P1: Workflow Platform Hardening

- [x] Upgrade score model from 1/2/3 to 0/1/2/3.
- [x] Add `side` support for left/right/bilateral movements.
- [x] Add human-only `pain_flag`.
- [x] Add `clearing_test` field.
- [x] Add `rubric_version`.
- [x] Add action-specific rubric criteria mapping to JSON/CSV/package exports
      while keeping compatible subscore fields.
- [x] Add `criteriaScores` as the primary score shape for future per-action
      rubric schemas, while retaining legacy `subscores` compatibility.
- [x] Add rep-level RAW SCORE scope and action-specific side / clearing / pain
      policy metadata to JSON, CSV, and package exports.
- [x] Keep human reviewer scoring scoresheet-like: overall RAW SCORE +
      comment/reason, not forced per-criterion human scoring.
- [x] Add reviewer score-basis metadata and Reviewer A/B context UI so human
      scores are clearly stored as scoresheet-like rep RAW SCORE, while AI
      criteria remain pose-based rationale.
- [x] Add action-specific `clearingFindings` schema and Segment Metadata UI:
      Shoulder/Extension/Flexion clearing, plus In-Line Lunge ankle pain and
      R/Y/G ankle mobility.
- [x] Add segment manual start/end adjustment controls.
- [x] Persist suggested vs manually adjusted segment times.
- [x] Add JSON export for current mock workflow.
- [x] Add pose timing/features/suggestion evidence to JSON export.
- [x] Add CSV export for reviewer/dataset records.
- [x] Add tests for upgraded score schema and adjudication.
- [x] Clearly label mock keypoint overlay or hide it until real pose data exists.

## P2: Deep Squat Pose Pipeline

- [x] Add Python pose extraction script using MediaPipe Pose Landmarker.
- [x] Generate per-frame keypoint JSON for
      `Eval_Videos/01-Deep Squat/Sample-1.mp4`.
- [x] Generate pose JSON for `front.mp4` and `side.mp4` if needed for the demo.
- [x] Store pose model name and version in analysis output.
- [x] Compute pose quality summary: - average landmark visibility/confidence, - missing-frame ratio, - frame count processed.
- [x] Render real keypoint overlay from uploaded pose JSON aligned to video
      playback time.
- [x] Add tests or fixtures for pose JSON parsing.

## P3: Pose-Assisted Segmentation

- [x] Extract shoulder/hip/ankle depth trajectory for Deep Squat timing.
- [x] Estimate movement phases and lowest point.
- [x] Generate pose-assisted segment timing suggestions.
- [x] Compare suggested segments against current/manual timing in a batch report.
- [x] Show selected-segment timing QA in the workbench.
- [x] Add batch segment quality report.

## P4: Explainable Deep Squat AI Suggestion

- [x] Compute first-pass Deep Squat features: - trunk inclination, - squat depth proxy, - hip-vs-knee depth, - knee-vs-ankle lateral offset.
- [x] Show selected-segment feature snapshot in the workbench.
- [x] Add angle-based hip/knee/ankle features when view quality is sufficient.
- [x] Generate suggested score with confidence.
- [x] Generate reviewer-readable explanation.
- [x] Compare AI suggestion with final adjudicated label in the AI panel.
- [x] Add tests for feature thresholds and feature payloads.
- [x] Add tests for suggestion payloads.

## P5: Dashboard and Evaluation

- [x] Add inter-rater agreement metric.
- [x] Add AI-final agreement metric.
- [x] Add valid/invalid/pending summary by movement.
- [x] Add segment timing correction summary.
- [x] Add pose-evidence export summary to dashboard.
- [x] Add dataset card draft.
- [x] Add sample-quality and limitation notes.

## P6: Application Package

- [x] Draft application-facing project brief.
- [x] Regenerate and verify project brief PDF after final copy edits.
- [x] Draft technical report outline.
- [x] Draft 2-3 minute demo video script.
- [x] Prepare project page content.
- [x] Add screenshots after UI stabilizes.
- [x] Finalize GitHub-ready README.
- [x] Draft standalone project-page copy.
- [x] Add Deep Squat demo preset selector for Sample-1/front/side assets.
- [x] Add user testing handoff for the current V1.5 demo.
- [x] Add English/Chinese UI language toggle while keeping all 7 movement names
      in English.
- [x] Add suggested-timing preview playback before applying segment timing
      changes.
- [x] Merge Segments and Segment Timing QA into one review list for cleaner
      demo testing.
- [x] Merge legacy AI and pose-based AI suggestion display into one
      pose-first card with clearer scoring rationale.

## P7: V1.6 Dataset and Expansion Track

Current development order agreed on 2026-05-23:

1. Export Dataset Package.
2. Clearer export/readiness checklist.
3. Local workflow state persistence.
4. Selected movement expansion.
5. Demo/Project Snapshot mode after more movements are useful.

- [x] Add browser-side dataset package export as a ZIP containing JSON, CSV,
      dataset card, run summary, and README.
- [x] Redesign readiness/export quality as a human-readable checklist.
- [x] Persist reviewer scores, segment metadata, active preset, and selected
      segment state in localStorage for local testing.
- [x] Add pose-based active period suggestion so long instructional/non-action
      lead-in or tail sections can be detected.
- [x] Shift the main workflow from pre-analysis active-period selection to
      post-analysis AI draft timing: Start/End defines the analysis range, while
      detected movement cycles become the editable segment clips by default.
- [x] Add a small AI draft timing buffer and keep raw pose-detected cycle timing
      in export evidence for audit/review.
- [x] Batch-test AI draft timing against existing pose samples and document
      stability/risks in `docs/ai_draft_timing_batch_qa_2026-05-23.md`.
- [x] Add `duplicate_cycle_assignment` as a timing QA blocker so repeated cycle
      mapping cannot silently pass as OK.
- [x] Add ordered one-to-one cycle-to-rep matching so a detected movement cycle
      can only be assigned to one segment.
- [x] Add `no_unique_cycle_assignment` for segments that cannot be matched to a
      unique detected cycle.
- [x] Add overlapping candidate-cycle dedupe so one movement with two nearby
      peaks is not counted as two reps.
- [x] Exclude Shoulder Mobility from AI draft timing auto-apply until it has a
      true movement-cycle detector rather than feature-only reach evidence.
- [x] Surface Timing QA blockers in the segment list/editor with reviewer-facing
      Chinese/English explanations instead of raw internal issue codes.
- [x] Gate formal Ingest readiness on Timing QA blockers while keeping JSON/CSV
      export available for debugging and review.
- [x] Add a four-movement demo readiness command and Chinese handoff covering
      Deep Squat, Active Straight Leg Raise, Shoulder Mobility, and Hurdle Step.
- [x] Add a four-movement end-to-end mock workflow smoke covering analysis,
      AI draft timing, reviewer consensus, ingest, and dataset package export.
- [x] Add a seven-action end-to-end mock workflow smoke covering all FMS action
      slots. The original smoke kept Trunk Stability Push-Up and Rotary
      Stability annotation-only; later V1.7 work upgraded Trunk to implemented
      and Rotary to features-only.
- [x] Add a Chinese seven-action handoff for morning human testing.
- [x] Add first-pass Hurdle Step pose-based AI suggestion with confidence,
      reviewer-readable reasons, and tests.
- [x] Add first-pass In-Line Lunge pose-based AI suggestion with confidence,
      reviewer-readable reasons, and tests.
- [x] Add first-pass Trunk Stability Push-Up pose-based AI suggestion with
      push-up lift, trunk/body-line, arm extension, compensation proxies,
      reviewer-readable reasons, and tests.
- [x] Add first-pass Rotary Stability feature-only pose probe with rotary reach,
      trunk rotation, balance stability, side-confidence evidence, and tests.
- [x] Add a reproducible Rotary Stability multi-sample feature probe report.
  - [x] Generate local pose JSON for two approved online Rotary candidates.
  - [x] Summarize pose coverage, timing/features coverage, and AI side counts.
  - [x] Keep Rotary as feature-only; do not export pose-based AI RAW SCORE.
- [x] Improve detectedCycles-vs-ExpectedReps QA for ASLR / Hurdle Step /
      In-Line Lunge videos where detected cycles differ from the expected count.
- [x] Add movement capability registry and evidence gate so each action is
      explicitly marked as implemented, features-only, or annotation-only
      before UI/export show pose-based AI scoring.
- [x] Draft V1.7 movement expansion plan and schema/framework change gates.
- [x] Document the 7-action maturity table plus Side / Clearing capability
      schema in `docs/specs/v1_7_movement_maturity_and_side_clearing.md`.
- [x] Add unified segment-level `aiSideSuggestion` across lateralized actions.
  - [x] Reuse existing pose feature side evidence from ASLR, Hurdle Step,
        In-Line Lunge, and Shoulder Mobility.
  - [x] Preserve reviewer-saved `side` separately from AI suggestion.
  - [x] Include confidence, source, and evidence detail in dataset export.
- [x] Add clearing reminder / gate for actions with clearing policies.
  - [x] Do not auto-classify pain as positive/negative.
  - [x] Prompt reviewer confirmation for Shoulder, Trunk, Rotary, and
        In-Line Lunge clearing findings.
  - [x] Keep actions without clearing as disabled `not_applicable` fields in
        the metadata UI.
- [ ] Start one selected movement expansion after Deep Squat export loop is
      stable.
  - [x] Confirm movement adapter boundary before code restructure.
  - [x] Select 2-3 Active Straight Leg Raise samples for first pose extraction.
  - [x] Generate and validate Active Straight Leg Raise pose JSON.
  - [x] Add Active Straight Leg Raise timing/features/suggestion tests.
    - [x] Add Active Straight Leg Raise timing helper and tests.
    - [x] Add Active Straight Leg Raise feature helper and tests.
    - [x] Add Active Straight Leg Raise suggestion helper and tests.
    - [x] Upgrade ASLR evidence to include active leg raise zones and
          stationary leg control proxy.
  - [x] Add one browser-verifiable Active Straight Leg Raise demo path.
  - [x] Show Active Straight Leg Raise feature snapshot in the workbench.
- [ ] Add Demo/Project Snapshot mode after multi-movement evidence is more
      representative.
- [ ] Start Shoulder Mobility expansion after ASLR demo path is stable.
  - [x] Select 2-3 Shoulder Mobility samples for first pose extraction.
  - [x] Generate and validate Shoulder Mobility pose JSON.
  - [x] Document Shoulder Mobility pose probe and active-period findings.
  - [x] Add Shoulder Mobility feature helper and tests.
  - [x] Add one browser-verifiable Shoulder Mobility feature-only demo path.
  - [x] Add conservative first-pass Shoulder Mobility pose-based AI suggestion
        with reviewer-readable pain/clearing limitation reason.
  - [ ] Collect Ronnie calibration feedback on Shoulder Mobility thresholds and
        score language.
- [ ] Start Hurdle Step expansion after Shoulder feature-only path is stable.
  - [x] Select 2 Hurdle Step samples for first pose extraction.
  - [x] Generate and validate Hurdle Step pose JSON.
  - [x] Document Hurdle Step pose probe and active-period findings.
  - [x] Add Hurdle Step timing helper and tests.
  - [x] Add Hurdle Step feature helper and tests.
  - [x] Add one browser-verifiable Hurdle Step demo path.
  - [x] Add Hurdle Step first-pass pose-based AI suggestion path.
  - [x] Upgrade Hurdle Step evidence to include clearance zones, stance leg
        control, pelvis/trunk control, and stepping-leg alignment proxy.
- [x] Start In-Line Lunge expansion after Hurdle demo path is stable.
  - [x] Select 3 In-Line Lunge samples for first pose extraction.
  - [x] Generate and validate In-Line Lunge pose JSON.
  - [x] Document In-Line Lunge pose probe and active-period findings.
  - [x] Add In-Line Lunge timing helper and tests.
  - [x] Add In-Line Lunge feature helper and tests.
  - [x] Add one browser-verifiable In-Line Lunge demo path.
  - [x] Add In-Line Lunge first-pass pose-based AI suggestion path.
  - [x] Upgrade In-Line Lunge evidence to include depth zones, trunk/pelvis
        control, rear-leg control, and front knee-foot line proxy.

## P8: Four-Week Closeout and Research Output

Canonical execution plan:
`docs/plans/ai_fms_4_week_closeout_plan_2026-08-09.md`.

### G1: Credible Data Baseline

- [x] Create `codex/application-closeout-v1` from the current main baseline.
- [x] Selectively integrate Ronnie's branch without pose backups or deleted
      candidate registries.
- [x] Remove AI score inference from score-bearing file names, notes, and
      curated human reference labels.
- [x] Make Rotary Stability feature-only until its movement-specific scoring
      evidence is calibrated.
- [x] Fix real API/stub round-trip fields and distinguish `local_only` from
      successfully persisted ingests.
- [x] Build a canonical four-movement pilot from the ignored history exports.
- [x] Deduplicate cumulative history entries with content-conflict detection.
- [x] Generate stable IDs, video/pose resolution, checksums, CSV, QA report,
      JSON Schema, and data dictionary.
- [x] Resolve 29/29 video assets and generate 29/29 real MediaPipe pose assets.
- [x] Record human visual subject selection for multi-person Hurdle videos.
- [x] Mark all 92 legacy numeric AI suggestions as label-leakage-ineligible.
- [x] Pass lint, format, 249/249 tests, and production build.

### G2: Independent Review

- [x] Add a reviewer-friendly Study Mode backed by the canonical pilot queue.
- [x] Hide file names, historical scores, AI suggestions, and other label cues.
- [x] Add reviewer identity, append-only review events, progress, skip, and
      resume support.
- [ ] Add blindability and visible/audio label-cue QA per source video.
- [ ] Run independent Ronnie and Edward review on the eligible rep set.
- [ ] Generate disagreement/adjudication queue only after both reviews close.
- [ ] Report raw agreement, weighted Cohen's kappa, and confusion matrix.

### G3: Quantitative Feature Study

- [ ] Freeze pose model, feature schema, scoring rules, and analysis snapshot.
- [ ] Recompute leakage-free AI suggestions from pose evidence only.
- [ ] Export action-specific quantitative feature tables with units and quality.
- [ ] Analyze feature distributions and effect sizes by human consensus score.
- [ ] Identify same-score/different-feature movement phenotype case studies.
- [ ] Separate exploratory compensation hypotheses from validated findings.
- [ ] Generate reproducible figures and analysis notebook/script outputs.

### G4: Application Package and Release

- [ ] Update README to the final four-movement research narrative.
- [ ] Finalize dataset card, methods, limitations, and ethics/publication notes.
- [ ] Produce Chinese technical report with English abstract.
- [ ] Produce application project-page copy and a concise evidence table.
- [ ] Record and verify a 2-3 minute demo video.
- [ ] Create a release manifest with checksums and reproduction commands.
- [ ] Run final stale-claim, privacy, source-rights, tests, and build audit.

## Stretch: Selected Movement Expansion

Priority order:

1. Active Straight Leg Raise
2. Shoulder Mobility
3. Hurdle Step
4. In-Line Lunge

Tasks:

- [x] Inventory prepared sample videos across all 7 FMS movements.
- [x] Generate draft sample manifests for manifest-ready collected videos.
- [x] Validate generated sample manifests.
- [x] Add online FMS video candidate discovery with local duplicate checks and
      review-only registry output.
- [x] Add gated download command that only processes candidates with reviewer
      approval and confirmed source rights.
- [x] Add AI-FMS Video Manager sub-feature with a workbench entry, independent
      manager page, local manager API, action-specific library view, YouTube
      candidate recommendations, download confirmation, and queue status.
- [ ] Promote selected draft rows into canonical movement manifests after human
      review.
- [ ] Ingest prepared sample videos for the remaining FMS movements when
      provided.
- [ ] Add sample manifest rows for selected movement.
- [ ] Validate sample video quality.
- [ ] Define movement-specific pose features.
- [ ] Add AI suggestion as data quality allows.

## Legacy Acceptance Record

The following items were completed during the February 2026 prototype phase and
remain reusable:

- [x] V0/V1 specs, ADRs, and process docs.
- [x] React/Vite workbench skeleton.
- [x] Mock API workflow.
- [x] Local HTTP API stub.
- [x] Mock/real API mode switch.
- [x] Segment list and loop playback.
- [x] Reviewer A/B scoring forms.
- [x] A/B/AI adjudication logic.
- [x] Consistency snapshot endpoint and UI card.
- [x] Manifest validation script.
- [x] Manifest-to-stub import script.
- [x] Deep Squat manifest validation.
- [x] Seven FMS action entries.
- [x] Notes/file-name assisted view inference.
- [x] Expected Reps-assisted segmentation.
- [x] Automated tests for key prototype modules.

## Current Known Limitations

- The active closeout work is isolated on `codex/application-closeout-v1` and
  has not yet been merged into `main`.
- The local API stub now round-trips the required review and protocol fields,
  but it is still a local JSON-backed research service rather than a deployed
  production database.
- The four-movement canonical pilot contains 110 repetitions from 28 videos.
  Repetitions from one video are correlated and do not represent 110 independent
  participants.
- All 29 pilot ingest references resolve to real pose JSON, but pose quality,
  camera view, crop choice, and feature validity still require per-action QA.
- Historical Reviewer A/B records are not independent blind ratings. A new
  Study Mode review round is required before inter-rater claims.
- All 92 historical numeric AI suggestions are excluded from accuracy analysis
  because the legacy workflow could read score-bearing file names or notes.
- Current AI suggestion is pose-based and explainable for Deep Squat, Active
  Straight Leg Raise, Hurdle Step, In-Line Lunge, Shoulder Mobility, and Trunk
  Stability Push-Up. Rotary Stability is feature-only until movement-specific
  phase/side semantics and scoring thresholds are calibrated. The workbench now
  uses movement capability metadata and a per-segment evidence gate to decide
  whether to show pose-based AI scoring or a more conservative
  evidence/annotation state.
- Keypoint overlay uses real pose JSON when uploaded, and falls back to an
  explicitly labeled demo skeleton when no pose JSON is loaded.
- Demo presets now cover all 7 FMS action slots, but Trunk Stability Push-Up
  still needs more sample calibration beyond the first score-3 pose demo, and
  Rotary Stability still needs better final demo sample selection before any AI
  scoring claim.
- The pilot can support movement-quality phenotype hypotheses, but it has no
  external clinical diagnosis, impairment, injury, or outcome labels. It must
  not be presented as evidence of diagnosis or injury-risk prediction.
