# Backlog

Date: 2026-08-17

This backlog has been reset around the V1.5 restart plan:

**Seven-movement first-pass AI-assisted workflow + four-movement Phase I study +
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

- [x] Consolidate the detailed application closeout draft and the concise
      execution plan into one versioned canonical plan.

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
- [x] Pass lint, format, 283/283 tests, and production build.

### G2: Independent Review

- [x] Add a reviewer-friendly Study Mode backed by the canonical pilot queue.
- [x] Hide file names, historical scores, AI suggestions, and other label cues.
- [x] Add reviewer identity, append-only review events, progress, skip, and
      resume support.
- [x] Add blindability and visible/audio label-cue QA per source video.
- [x] Freeze the formal study sample size after blindability, action balance,
      video-source independence, and reviewer workload QA.
- [x] Define a versioned four-movement feature contract with units,
      interpretive direction, and quality fields.
- [x] Generate a leakage-controlled 110-rep quantitative feature matrix with
      explicit ready/limited status.
- [x] Require all 32 formal reps to pass both blindability and feature-readiness
      gates.
- [x] Complete an isolated four-case Dry Run with save/refresh recovery and a
      separate Test Reviewer namespace.
- [x] Lock Review Event/Export V2 with explicit round identity, foreground
      review duration, supersession lineage, and round-specific storage.
- [x] Add frozen-manifest completion checks, paired JSON/SHA-256 export, and a
      CLI validator for complete or partial reviewer handoff files.
- [x] Publish a Chinese Round A reviewer protocol with field definitions and
      independence rules.
- [x] Distinguish FMS score 0 for observed/reported pain from protocol-based
      `unscorable` outcomes, with required reason and note.
- [x] Add checksum-verified, immutable, idempotent SQLite ingestion for complete
      Study Review exports.
- [x] Complete Ronnie Round A: 32 reviewed, 27 scored, 5 unscorable, with all 46
      append-only events preserved in the local research database.
- [x] Complete Other Reviewer Round A: 32 reviewed, 26 scored, 6 unscorable,
      with all 32 events preserved in the local research database.
- [x] Generate the Round A disagreement/adjudication queue after both reviews
      closed: 1 scoreability mismatch, 0 RAW SCORE disagreements, and 3
      unscorable-reason taxonomy disagreements.
- [x] Report Round A outcome agreement, raw score agreement, linear/quadratic
      weighted Cohen's kappa, and the 0-3 confusion matrix from signed exports.
- [x] Generate a checksum-protected, private post-review AI benchmark manifest
      for all 32 formal reps before either second-round review begins.
- [x] Freeze AI v1.0 coverage at 18 score-bearing suggestions, 8 Rotary
      feature-only records, and 6 protocol-limited Deep Squat records.
- [x] Open an isolated, re-randomized Round B queue as a second blind review;
      show no AI score, pose-derived feature, prior-round result, or other-reviewer result.
- [x] Reject `evidenceReview`, current pose evidence, and current AI suggestion
      exposure in every formal Round B event/export.
- [x] Ingest blind Round B exports without reviewer evidence child rows while
      preserving auditable blind flags in raw events.
- [x] Publish a Chinese Round B reviewer protocol and browser-check the desktop
      and mobile scoring workflow.
- [x] Complete Ronnie Round B after the planned 48-72 hour interval.
- [x] Complete Other Reviewer Round B independently.
- [x] Validate, checksum, and ingest both complete Round B exports.

### G3: Quantitative Feature Study

- [x] Freeze pose model, feature schema, scoring rules, and analysis snapshot.
- [x] Freeze the pre-Round-B AI v1.0 rule fingerprint, source checksums,
      zero-reviewer-exposure policy, and 32-item coverage contract.
- [x] After both Round B exports close, compare frozen AI v1.0 against Round A
      consensus and Round B consensus, with coverage reported separately.
- [x] Add a checksum-verified Round B closeout command for reviewer agreement,
      per-reviewer A/B change, blind-exposure verification, and frozen AI comparisons.
- [x] Implement an isolated Rotary Stability v1.1 experimental adapter with
      pose-derived full-cycle phases, updated FMS score 1/2/3 rules, human
      pain/clearing gates, and explicit abstention.
- [x] Pin the pre-review AI v1.0 package SHA-256 and prove that Rotary v1.1
      cannot enter the default Workbench or blind Round B path.
- [x] Generate a label-free-first Rotary v1.1 internal benchmark: 4/8 formal
      reps scored, 4/4 exact among comparable reps, 4 abstentions.
- [x] Run a MediaPipe Full 15 fps sensitivity on the low-coverage Rotary source;
      retain the original gate after coverage did not improve.
- [x] Replace the all-or-nothing Rotary landmark gate with core-cycle and
      criterion-specific visibility checks; use visible finger landmarks for
      the lateral-malleolus proxy and retain conservative disagreement cases.
- [x] Regenerate Rotary v1.1 at 8/8 score-bearing coverage: 6/8 exact, 8/8
      within one, MAE 0.25; do not tune the two conservative score-1 cases to
      their Round A labels.
- [x] Expose Rotary v1.1 as an explicitly experimental Workbench suggestion
      while keeping frozen AI v1.0 and both blind Study rounds isolated.
- [x] Promote the default Rotary Workbench path to the same first-pass
      pose-based AI suggestion status as the other six actions, while keeping
      the frozen research adapter and benchmark provenance unchanged.
- [x] Audit floor/board protocol metadata for all eight formal Deep Squat reps
      without reading human scores or changing thresholds.
- [x] Lock a label-free final AI v1.1 prediction package for all 32 formal reps:
      28 score-bearing, 4 staged Deep Squat abstentions, checksum-protected.
- [x] Extend the Round B closeout command to compare both frozen AI v1.0 and
      final AI v1.1 only after blind signed reviewer exports are available.
- [x] Generate a checksum-protected private Round A reviewer comparison package.
- [x] Preserve all 110 canonical reps in an explicit evidence-tier analysis
      instead of reducing the research pool to the 26 gold-consensus rows.
- [x] Mirror one checksum/fingerprint-traceable 110-rep snapshot and all 110
      quantitative feature/quality rows into the local SQLite research database.
- [x] Generate label-free descriptive feature summaries for all 66 feature-ready
      reps, with source-video counts and sampling-unit limitations.
- [x] Generate deterministic label-free k-medoids profiles, robust-z heatmaps,
      source-video distance diagnostics, and leave-one-video-out stability for
      all 66 feature-ready reps.
- [x] Overlay the 26 Round A gold-consensus rows only after label-free groups
      are frozen, and export a video/time-coded human review queue.
- [x] Classify 26 unused blindable + feature-ready reps as future review
      candidates while keeping historical scores weak-label-only.
- [x] Recompute leakage-free AI suggestions for all 110 camera-audited feature
      rows before joining human labels; compare 16 eligible suggestions with
      the 26 Round A consensus rows and preserve 10 protocol/feature-only
      exclusions.
- [x] Visually audit the two ASLR two-point under-scores, four Hurdle score
      disagreements, one Deep Squat score disagreement, and two Deep Squat
      protocol-metadata gaps before changing thresholds or requesting targeted
      collection.
- [x] Preserve the frozen 9/16 baseline, then report a separate post-audit
      Deep Squat protocol sensitivity: 11/17 exact, 15/17 within one, with no
      ASLR or Hurdle threshold tuning.
- [x] Audit all 17 ASLR records with a label-free side/peak evidence gate:
      16 unique windows, including 11 good, 2 watch, and 3 limited.
- [x] Re-extract the three limited ASLR windows with subject-aware multi-pose or
      ROI selection, manually review the two watch windows, and keep the result
      as a separate sensitivity layer: 1 good, 2 watch, 0 limited after ROI;
      no frozen evidence or scoring thresholds changed.
- [x] Defer robust peak-window ASLR geometry and expanded Hurdle cycle-level
      features on independent videos to Phase II; these are not G3 acceptance
      blockers for the frozen Phase I claims.
- [x] Export Round A consensus action-specific quantitative feature tables with
      units and quality fields.
- [x] Analyze Round A feature distributions and exploratory effect sizes by
      human consensus score, with video-confounding flags.
- [x] Identify seven same-score/different-feature movement-profile candidates.
- [x] Complete the first cross-video Hurdle Step score-2 case review, then
      downgrade it to a view-confounded methodological example after the
      camera audit changed one rep from historical `front` to `mixed`; resolve
      the stance-stability discrepancy as an inapplicable front-only feature.
- [x] Complete a cross-video Deep Squat score-2 board-attempt case review and
      promote it as the primary application-facing same-score example.
- [x] Select the initial four-case application portfolio: Deep Squat as the primary
      movement-profile case, ASLR as a measurement-reliability case, Hurdle as
      a view-metadata method case, and Rotary as a frozen-v1.0 feature-only /
      experimental-v1.1 abstention boundary case.
- [x] Reframe the Phase I report portfolio around four same-score quantitative
      contrasts: Deep Squat depth/strategy, ASLR stationary-leg/pelvic control,
      Hurdle clearance/alignment, and Rotary cycle completion; retain the prior
      ASLR, view, and fail-closed examples as measurement-QA evidence.
- [x] Interpret each same-score contrast through observed features, movement
      profile, and a testable mobility/stability/coordination/compensation
      hypothesis, without converting pose proxies into diagnostic claims.
- [x] Re-audit the full 110-repetition pool and replace the uniform pairwise
      portfolio with four movement-specific methods: Deep Squat continuum,
      ASLR bilateral repeatability, Hurdle blind score-2 pathway taxonomy, and
      Rotary cycle-event matrix.
- [x] Audit historical `cameraView` metadata across all 110 reps, preserve the
      original field for lineage, and generate checksum-protected
      `auditedCameraView` outputs before using view as an explanatory variable.
- [x] Rebuild a separate camera-audited feature sensitivity matrix without
      changing the frozen Round A fingerprint; confirm 66/44 readiness, profile
      groups, score strata, source effects, and stability conclusions remain
      unchanged.
- [x] Separate exploratory movement-profile hypotheses from validated findings
      in the generated report.
- [x] Generate reproducible figures and script outputs with SHA-256 checksums.
- [x] After Round B, audit historical labels against blind gold consensus before
      promoting any legacy labels to audited weak labels.

### G4: Application Package and Release

- [x] Update README to the current four-movement research narrative and remove
      single-video/mock-prototype onboarding drift.
- [x] Finalize the Phase I dataset card, methods, limitations, and
      ethics/publication notes for the Round A/B results-frozen release candidate.
- [x] Produce the Chinese Phase I technical report with an English abstract.
- [x] Rewrite the Phase I report narrative around two product goals, implemented
      reviewer support, seven-action product scope, four-action research scope,
      and a four-layer AI-human evaluation design.
- [x] Align the abstract and Quantitative Movement Findings so Sections 6.2-6.5
      all answer what continuous information the 0-3 score compresses, with
      explicit evidence tiers and limitations.
- [x] Extend the application narrative beyond parameter differences to bounded,
      testable movement-science hypotheses and targeted follow-up priorities.
- [x] Produce current application copy and a concise claim-control evidence table.
- [x] Generate the initial two public-safe figures as a feasibility pass; retain
      them as historical/QA assets after the v2 portfolio superseded them.
- [x] Upgrade the pinned case-study generator to v2 and generate four
      differentiated public-safe figures from the full-pool, blind-review, and
      cycle-event evidence sources.
- [ ] Record and verify a 4:15-4:30 application-film master, then export a
      3-minute cut and a 60-second teaser.
- [x] Replace the May V1.5 demo script with the current seven-movement product,
      four-movement research, blind-review, and quantitative-findings narrative.
- [x] Add applicant-facing opening and closing sections covering FMS basics,
      Ronnie's Level 1/Level 2 certification, assessment practice, personal role,
      reflection, and college-stage research direction.
- [x] Produce a time-coded asset and shot plan that separates new A-roll/FMS
      filming, certificate processing, Workbench/Study screen recordings,
      frozen-results graphics, research figures, rights gates, and handoff specs.
- [x] Generate and visually inspect two print-ready PDFs: a 12-page A4 landscape
      asset/shot plan and a 9-page A4 portrait on-set script with repeating
      headers, page numbers, readable tables, and non-orphaned narration blocks.
- [ ] Collect the exact certificate titles/dates, redacted certificate images,
      consented FMS-practice footage, Ronnie A-roll, and final narration audio.
- [ ] Produce the final technical-report PDF and verify text extraction, page
      count, figure legibility, links, and page layout.
- [ ] Build the final portfolio project page from the current application copy
      and evidence table; link the report, demo, GitHub, and public-safe figures.
- [ ] Finish the application writing pack: current length variants and resume/
      interview copy are drafted; Ronnie must approve the first-person
      contribution, certification, learning, and future-direction statements.
- [x] Refresh the canonical application copy, claim-control table, and project-
      page copy around the approved seven-movement system narrative and current
      Phase I frozen evidence.
- [x] Create one Phase I output index and a GitHub repository-transfer checklist
      that preserves history and waits for Ronnie's exact username.
- [ ] After Ronnie registers GitHub, complete the pre-transfer public-boundary
      audit, merge the approved closeout branch to `main`, create the Phase I
      release, and transfer repository ownership.
- [x] Select NHSJS expedited review as the primary paper route, with Zenodo
      blocked until written preprint permission is received.
- [x] Capture the current NHSJS Research Article structure, file variants,
      figure/table minimum, page limit, timeline, and contact information.
- [x] Draft a transparent presubmission inquiry covering AI use, secondary-video
      ethics, rights, advisor requirements, and preprint eligibility.
- [x] Create a manuscript evidence map from the frozen Phase I results without
      presenting AI-generated planning text as a journal-ready student paper.
- [x] Produce a complete Chinese internal manuscript draft with title, abstract,
      introduction, methods, results, discussion, conclusion, declarations,
      references, figures/tables, and four appendices.
- [x] Recheck the current NHSJS AI Usage Policy and replace the planned
      AI-translated English draft with an author-only prose workflow.
- [x] Build an 11-page Standard-citation English authoring manuscript from the
      official NHSJS Word template, with 4 frozen tables, 6 embedded figures,
      blind-review metadata scrubbed, and no AI-drafted narrative prose.
- [x] Create a section-by-section English authoring guide with word budgets,
      frozen evidence, citation targets, limitations, and prohibited claims.
- [x] Render and visually inspect the initial 19-page Chinese draft, then rebuild
      v0.2 as a 23-page system-development-first internal review PDF with all
      figures, declarations, references, and appendices retained.
- [x] Reframe the manuscript around all-seven-movement system development and
      Phase I formative evaluation; retain four-movement information recovery as
      a secondary research contribution rather than the initial project purpose.
- [x] Replace the old partial UI captures with reproducible Workbench overview,
      quantitative-feature detail, and Study Mode dry-run screenshots generated
      from the real browser workflow.
- [x] Restore clear real-video action frames in the Workbench and Study Mode
      captures while removing source file names, score-bearing notes, and
      specific reviewer identifiers; retain frame-level rights clearance as a
      publication gate.
- [x] Replace the interface figures with 2026-08-23 project-owned, consented
      Deep Squat footage; generate aligned MediaPipe pose, a metadata-clean
      1080p proxy, and an anonymous Study Mode frame while keeping raw media
      private.
- [x] Transcribe all GarageBand narration regions and A-roll locally with
      whisper.cpp; preserve originals and select nine narration takes with
      natural-speed and timeline-speed derivatives.
- [x] Record privacy-safe S01-S03 Workbench and S04 Study Mode video masters
      from the local app using the owned Deep Squat proxy and real pose.
- [x] Generate five Phase I results cards and a no-URL end card, then assemble a
      4:32.4 music-free 1080p/30fps Master review cut with A-roll, seven-movement
      montage, certificates, practice B-roll, screen recordings, and findings.
- [x] Complete human review of Master v1; add action labels, privacy-cropped FMS
      course evidence, narration-matched screen actions, dynamic emphasis,
      editable SRT, baked captions, subtle licensed-loop music, and a 4:31.8
      Master review cut v2.
- [x] Complete human review of Master v2; produce a 4:37.0 Master review cut v3
      with a real opening card, lighter captions, complete-course evidence,
      corrected practice B-roll, an expanded seven-action selector, full-page
      Study Mode and research figures, restrained annotations, and synced A03.
- [x] Complete human review of Master v3; produce a 4:34.8 Master review cut v4
      with a dedicated animated evidence pipeline, sport-tech music, improved
      live voice, labeled practice footage, score-scale PIP, faster system
      sections, Hurdle Step Study Mode, refined figure marks, and revised A03.
- [x] Complete human review of Master v4; produce a 4:35.3 Master review cut v5
      with the approved full-course screenshot, subtitle-tail protection,
      corrected measurement label, slower transitions, clean research figures,
      accessible melodic music, refined live sound, and rebuilt A03 sync.
- [ ] Complete human review of Master v5 and freeze the approved Master before
      deriving shorter versions.
- [ ] Derive and review the 3-minute application cut and 60-second teaser from
      the approved Master.
- [ ] Confirm student/author metadata, adult corresponding contact, CRediT-style
      contributions, rights boundaries, and AI-use disclosure.
- [ ] Ronnie independently writes every English manuscript sentence, verifies
      every citation, rewrites captions in his own words, and deletes all yellow
      author prompts.
- [ ] After the Standard prose is author-complete, generate and verify the NHSJS
      Online Citations Word version without changing Ronnie's wording.
- [ ] Send the NHSJS presubmission inquiry and archive the written response.
- [ ] After eligibility confirmation, prepare the NHSJS anonymous standard-
      citation Word manuscript, online-citation Word manuscript, supplements,
      and submission checklist.
- [ ] Submit through the expedited route only after the package and $280 fee are
      approved; use the resulting status exactly as received from the journal.
- [ ] Deposit a Zenodo preprint only after written NHSJS permission and the final
      public-safe manuscript audit.
- [x] Create a fail-closed Phase I release-candidate manifest that verifies
      17/17 research/application artifacts, checksums 11 documents, and pins
      reproduction commands.
- [x] Run release-document preflight for local absolute paths and required
      study/claim boundaries, plus the full test and three-entry build gate.
- [ ] Complete the remaining human contribution, author/advisor, PII, music,
      non-interface media, and final stale-claim audit after Round B.
- [ ] Rebuild the application and controlled research outputs in a clean
      environment, then generate the final public-safe manifest and closeout index.

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

- Study Review exports now persist in an ignored local SQLite research database,
  but the application remains a local research workflow rather than a deployed
  multi-user production service.
- The four-movement canonical pilot contains 110 repetitions from 28 videos.
  Repetitions from one video are correlated and do not represent 110 independent
  participants.
- All 29 pilot ingest references resolve to real pose JSON. Camera view has now
  been audited for all 110 reps; pose quality, crop choice, and feature validity
  still require per-action QA.
- Historical Reviewer A/B records are not independent blind ratings. The new
  two-reviewer, two-round blinded study is complete, but its 26 jointly scored
  reps remain a small frozen pilot and do not establish clinical validity or
  generalization.
- All 92 historical numeric AI suggestions are excluded from accuracy analysis
  because the legacy workflow could read score-bearing file names or notes.
- Current AI suggestion is pose-based and explainable for all seven actions.
  Rotary Stability uses full-cycle evidence and may abstain. The Workbench
  uses movement capability metadata and a per-segment evidence gate to decide
  whether to show pose-based AI scoring or a more conservative state.
- Keypoint overlay uses real pose JSON when uploaded, and falls back to an
  explicitly labeled demo skeleton when no pose JSON is loaded.
- Demo presets now cover all 7 FMS action slots, but Trunk Stability Push-Up
  still needs more sample calibration beyond the first score-3 pose demo, and
  Rotary Stability needs new held-out samples before any generalization claim.
- The pilot can support movement-quality phenotype hypotheses, but it has no
  external clinical diagnosis, impairment, injury, or outcome labels. It must
  not be presented as evidence of diagnosis or injury-risk prediction.
