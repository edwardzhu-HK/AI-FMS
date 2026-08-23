# AI-FMS NHSJS English Authoring Guide

Status: AUTHOR-ONLY PROSE WORKFLOW

Last updated: 2026-08-23

Companion Word file:
`output/publication/nhsjs/AI-FMS_NHSJS_English_Authoring_Manuscript_Standard_Citations.docx`

## 1. Why This Is an Authoring Manuscript

NHSJS currently permits AI use for coding, debugging, analysis, interpretation, and literature
search, but it does not permit AI to draft, translate, paraphrase, expand, or rewrite manuscript
prose, including text that an author later edits. Therefore:

- Ronnie must compose every narrative sentence in the Word file himself.
- Yellow `AUTHOR TEXT REQUIRED` paragraphs are instructions and must be deleted.
- Frozen numbers, tables, figures, and software-generated research outputs may be used after
  human verification.
- Codex use must be fully disclosed at submission.
- After Ronnie writes, assistance must be limited to spelling and grammar corrections that do not
  rewrite or rephrase his sentences.

Official sources:

- NHSJS AI Usage Policy: https://nhsjs.com/ai-usage-policy/
- NHSJS Submission Guidelines: https://nhsjs.com/submission-guidelines/
- NHSJS Submission Types: https://nhsjs.com/submit-your-work/submission-types/

## 2. Submission Format Locked in the Word File

- Research Article.
- Standard citation format for blind peer review.
- US Letter, 1-inch margins, Times New Roman 12 pt, single spacing.
- Maximum 20 pages including figures and tables.
- Sections in order: Title; Authors and affiliations; Abstract; Introduction; Methods; Results;
  Discussion; Acknowledgments; References.
- Standard file removes author names, affiliations, emails, and acknowledgments.
- Keep the repository and any project page using the manuscript title private during blind review;
  a searchable project page, commit history, or GitHub profile could reveal the student author.
- References use superscript numbers before punctuation and are ordered by first appearance.
- Figures and tables stay in the main text near first mention.
- Six figures plus four tables satisfy the Research Article minimum of five figures/tables.

## 3. Suggested Word Budget

| Section         |            Target | Ronnie must accomplish                                                                |
| --------------- | ----------------: | ------------------------------------------------------------------------------------- |
| Abstract        |     200-250 words | Background/objective; methods; results; conclusion, in that order                     |
| Introduction    |     650-800 words | Define FMS, human review problems, project purpose, research questions, scope         |
| Methods         | 1,200-1,500 words | System, data reconstruction, pose/features, blind review, locked AI, analyses, ethics |
| Results         | 1,100-1,400 words | Product implementation, data quality, human agreement, AI concordance, four findings  |
| Discussion      |   900-1,100 words | Meaning, boundaries, limitations, next research, data/code availability               |
| Total narrative | 4,050-5,050 words | Keep the final Standard manuscript at or below 20 pages                               |

## 4. Section-by-Section Evidence Map

### Title

Working title:

`AI-FMS: Development and Phase I Evaluation of an Explainable Human-in-the-Loop System for Functional Movement Screen Video Review`

Decision points:

- Keep the seven-movement system as the primary contribution.
- Keep the four-movement Phase I evaluation as the evidence scope, not the title scope.
- Do not use `clinical validation`, `diagnosis`, or `injury prediction`.

### Abstract

Facts available for Ronnie to express in his own sentences:

- Product: seven-movement video review workflow.
- Phase I: four movements, 28 unique videos, 110 canonical repetitions.
- Formal blind sample: 32 repetitions, two reviewers, two rounds.
- Round B: status agreement 32/32; jointly scorable exact agreement 26/26; six jointly
  unscorable with matching reasons.
- Final locked AI comparison: 25 numeric comparisons; 16/25 exact; 23/25 within one; MAE 0.44;
  linear weighted kappa 0.4917.
- Secondary contribution: continuous pose features retain movement information that a 0-3 score
  compresses.
- Boundary: internal formative evaluation, not held-out or clinical validation.

### Introduction

Questions to answer in Ronnie's own words:

1. What is FMS, and why are seven movement patterns scored on an ordinal 0-3 scale?
2. What practical difficulties arise in live, remote, or asynchronous human review?
3. Why can video replay, rep segmentation, and traceable metadata help a reviewer?
4. What continuous movement information is lost when multiple strategies receive the same score?
5. Why can pose-derived 2D features help without replacing professional judgment?
6. What did the project build, and what did Phase I evaluate?

Citation targets:

- FMS background: References 1-2.
- Reliability and updated scoring: References 3-5.
- Markerless video analysis: References 6-10.
- Human-AI design: Reference 12.

### Methods

#### System development and product scope

- React/Vite Workbench, Study Mode, Video Manager, movement adapter registry.
- Video import; duration-aware range; rep segmentation; loop playback; timing correction.
- Camera view, side, protocol, clearing/pain metadata.
- MediaPipe overlay, movement-specific features, explainable first-pass suggestion, abstention.
- Human review, adjudication, JSON/CSV export, stable IDs, checksum lineage.
- Product scope: all seven FMS movements.

#### Data reconstruction and Phase I sample

- 28 cumulative history exports reconstructed into 29 ingests, 28 unique source videos, and 110
  repetitions after checksum-based deduplication.
- Phase I movements: Deep Squat, ASLR, Hurdle Step, Rotary Stability.
- Blindability: 97/110.
- Feature-ready: 66/110.
- Formal sample: 32, eight per movement, all passing both gates.
- Repetitions are nested in source videos; 110 reps do not mean 110 participants.

#### Blind review

- Two reviewers, Round A and Round B, approximately 51 hours apart.
- Re-randomized queue and separate storage namespace.
- No filenames, prior scores, AI suggestions, pose features, other-reviewer answers, or audio.
- Reviewer options: RAW SCORE 0-3 or unscorable with reason.
- Append-only events, signed JSON export, SHA-256, schema and blind-state validation.

#### Locked AI comparison

- AI path isolated from reviewer path.
- No score-bearing filenames, notes, historical scores, or reviewer comments as model inputs.
- Coverage and abstention reported separately from agreement.
- Final AI rules locked before Round B results were viewed, but development followed Round A;
  therefore the final comparison is an internal benchmark, not held-out validation.

#### Secondary analyses

- Deep Squat: 15 audited side-view reps from seven videos; continuous depth/strategy analysis.
- ASLR: four-rep bilateral sequence from one source; repeatability and side control.
- Hurdle Step: five blind-reviewed score-2 reps from five videos; pathway coding plus quantitative
  ranges.
- Rotary Stability: eight blind-reviewed reps; full-cycle event matrix.

#### Ethics and privacy

- Phase I used existing local and public teaching/reference videos; no prospective recruitment for
  the research dataset.
- Project-owned 2026-08-23 footage is used only for interface demonstration figures and is not part
  of the Phase I benchmark.
- Raw videos, raw pose, reviewer comments, signed exports, and SQLite remain private.
- The target journal must clarify SRC/IRB/exemption requirements before submission.

### Results

Use the Word tables and figures as the evidence anchors. Write only observations supported by them.

Required result blocks:

1. Seven-movement system implementation and engineering quality gate.
2. Canonical data, blindability, feature-readiness, and formal sample.
3. Round A and Round B human agreement.
4. Final AI-human internal concordance with coverage and abstention.
5. Deep Squat continuous strategy finding.
6. ASLR bilateral repeatability finding.
7. Hurdle score-2 pathway finding.
8. Rotary full-cycle evidence finding.

### Discussion

Questions to answer:

1. How does the system support human review rather than replace it?
2. What does perfect agreement in a selected 26-rep scorable subset mean, and what does it not mean?
3. What does moderate AI-human concordance show about current usefulness and remaining errors?
4. Why is abstention a capability rather than a failure?
5. How do the four movement analyses show different kinds of information recovery?
6. Which functional interpretations are reasonable hypotheses, and which would be medical
   overclaims?
7. What new held-out collection would most efficiently test generalization?

Required limitations:

- Small selected formal sample and only two reviewers.
- Repetitions nested within relatively few source videos.
- Mixed camera views and 2D projection limitations.
- Historical development data include iterative tuning.
- Final AI benchmark is post-audit and not held out.
- Four movement analyses are exploratory and differently structured.
- No injury outcomes, diagnosis, or external clinical validation.

## 5. Frozen Claims and Prohibited Claims

Allowed:

- `seven-movement human-in-the-loop system`
- `four-movement Phase I formative evaluation`
- `internal AI-human concordance benchmark`
- `pose-derived quantitative evidence`
- `exploratory movement-profile analyses`

Do not write:

- `clinically validated`
- `diagnostic accuracy`
- `predicts injury or impairment`
- `AI replaces FMS professionals`
- `110 participants`
- `held-out validation`
- `AI improved reviewer confidence or efficiency`

## 6. Reference Verification Checklist

Before Ronnie inserts a citation:

- Open and read the original source.
- Confirm that the cited sentence is actually supported.
- Insert the superscript number before punctuation.
- Keep one publication per reference number.
- Number references in order of first appearance.
- Do not cite a source only because it appeared in the earlier Chinese working draft.

## 7. Final Author Workflow

1. Duplicate the Word file locally for Ronnie's writing session.
2. Write one subsection at a time without copying wording from the Chinese AI-assisted draft or this
   guide.
3. Delete each yellow author prompt after replacing it with Ronnie's own prose.
4. Open and verify every cited source.
5. Recheck all table and figure captions in Ronnie's own words.
6. Remove author names, affiliations, acknowledgments, comments, and identifying metadata from the
   Standard version.
7. Confirm final page count is 20 or fewer.
8. Produce the Online Citations version only after the Standard prose is author-complete.
9. Limit later AI help to spelling and grammar corrections without rewriting or rephrasing.
10. Complete the journal's AI-use disclosure honestly.
