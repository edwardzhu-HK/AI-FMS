# Project Agent Instructions

This repository is being restarted as an application-facing AI-FMS project, not
only as a calibration UI prototype.

## Product Direction

- Treat the project as an AI-assisted, human-in-the-loop FMS video annotation
  and movement-quality dataset platform.
- Do not describe the system as a medical diagnostic tool or as a replacement
  for certified FMS professionals.
- Prefer wording such as "movement screening", "annotation", "AI-assisted
  review", "pose-based features", "human reviewer workflow", and "traceable
  training data".
- Keep Deep Squat as the flagship AI pipeline, but keep the platform structure
  ready for all 7 FMS movements.
- For Ronnie's application narrative, connect the project to long-term swimming,
  Human Movement Science, FMS learning, sports health technology, and
  interpretable AI.

## Implementation Priorities

- Reuse the existing React/Vite workbench, mock API, API stub, manifest tools,
  adjudication logic, and test suite before creating parallel workflows.
- Keep the UI useful for annotation first: upload, duration-aware analysis
  range, segment list, loop playback, reviewer scoring, adjudication, and export.
- Do not ship fake keypoints as if they were real model output. Mock overlays
  must be labeled or replaced by real pose data.
- Prefer MediaPipe Pose Landmarker for the first real pose pipeline unless a
  concrete blocker appears. Treat YOLO Pose and MMPose as later alternatives.
- Use source-of-truth data/schema changes plus generated adapters instead of
  hand-editing derived reports.

## Scope Discipline

- V1: seven-movement annotation workflow.
- V1.5: Deep Squat real pose/features/explainable AI suggestion.
- V1.7: expand selected movements such as Active Straight Leg Raise, Shoulder
  Mobility, Hurdle Step, and In-Line Lunge.
- V2: evaluation package, dataset card, technical report, project page, and demo
  video for applications.
- Keep realtime scoring, clinical diagnosis, injury-risk prediction, and mobile
  app work out of the committed scope unless explicitly re-approved.

## Documentation Rules

- User-facing project documents should use Chinese as the main writing
  framework. English technical terms such as FMS, Human Movement Science,
  MediaPipe, pose estimation, dataset card, and human-in-the-loop can remain in
  English when clearer.
- Update `docs/specs/v1_5_scope_and_roadmap.md` before major scope or milestone
  changes.
- Update `docs/backlog.md` when moving tasks between planned, in progress, and
  accepted states.
- README should remain a current onboarding document, not a historical changelog.
- Application-facing materials should avoid overclaiming and include limitations.

## Quality Gates

- Run `npm run check` after code or docs changes that touch checked file types.
- If a PDF/application brief is regenerated, verify that the file exists,
  contains extractable text, and has a reasonable page count.
- This directory is not currently a Git repository; use direct file validation
  rather than Git history as evidence unless Git is initialized later.
