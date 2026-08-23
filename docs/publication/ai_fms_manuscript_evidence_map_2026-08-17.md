# AI-FMS NHSJS Manuscript Evidence Map

Status: INTERNAL WORKING OUTLINE - not submission text

Chinese version: `ai_fms_manuscript_evidence_map_2026-08-17.zh-CN.md`

This document maps frozen evidence into an NHSJS Research Article structure. It
is intentionally not a polished manuscript while the journal's AI-use policy is
unconfirmed.

## Working Title

**AI-FMS: Development and Phase I Evaluation of an Explainable Human-in-the-Loop
System for Functional Movement Screen Video Review**

## Article Type and Central Question

Article type: Original Research Article; human-centered system development and
formative evaluation with exploratory secondary analyses.

Central question:

> Can an explainable, human-in-the-loop system support human FMS video review
> across all seven movements, and what do a four-movement Phase I evaluation and
> secondary quantitative analyses reveal about reliability, AI-human
> concordance, and information preservation?

Do not describe this question as prospectively preregistered. The four
movement-specific analyses were refined during the Phase I audit and are
exploratory.

## NHSJS Structure Map

### Title, Authors, and Affiliations

- Target first author: Ronnie, subject to final contribution and accountability
  review.
- Adult corresponding contact: pending.
- Other Reviewer: author only if authorship criteria are met; otherwise
  acknowledgment or contributor statement.
- Codex/OpenAI: disclose as an AI-assisted tool, never list as an author.

### Abstract

Target: 200-250 words after the manuscript is frozen.

Required elements:

- Background: human FMS scoring faces replay, remote review, repetition finding,
  quantitative observation, context preservation, and traceability limitations.
- Objective: develop a seven-movement AI-assisted review system and evaluate its
  internal workflow, human reliability, AI-human concordance, and secondary
  research value.
- Methods: 28 videos, 110 canonical repetitions, 66 feature-ready repetitions,
  32 balanced formal repetitions, two reviewers, two blind rounds, locked AI
  comparison, four exploratory analysis methods.
- Results: Round B 32/32 scoreability agreement; 26/26 exact among jointly
  scorable repetitions; final locked AI scored 28/32; 25 AI-human comparable;
  16/25 exact, 23/25 within one, MAE 0.44, linear weighted kappa 0.4917.
- Conclusion: the seven-movement system is functionally implemented and the
  four-movement Phase I provides bounded internal evaluation evidence;
  quantitative information recovery is a secondary research contribution, not
  the sole project purpose.

### Introduction

Evidence and literature tasks:

1. Define FMS and the practical problems of live, remote, and video-based human
   scoring without reproducing
   proprietary scoring material unnecessarily.
2. Review FMS interrater and intrarater reliability.
3. Separate reliability from construct validity and injury prediction.
4. Review markerless pose estimation in sports and exercise.
5. Explain 2D pose limitations: camera view, occlusion, out-of-plane movement,
   subject selection, and landmark jitter.
6. Define the primary gap: no single workflow in this project context connected
   seven-movement video review, replay, metadata, pose evidence, human scoring,
   AI suggestion, abstention, and traceable export.
7. Introduce ordinal-score information recovery as a secondary research
   opportunity enabled by the completed system.
8. State exploratory objectives rather than a post-hoc confirmatory hypothesis.

Initial references to read and verify manually:

1. Cuchna JW, Hoch MC, Hoch JM. The interrater and intrarater reliability of the
   Functional Movement Screen: a systematic review with meta-analysis. Physical
   Therapy in Sport. 2016;19:57-65. DOI: 10.1016/j.ptsp.2015.12.002.
2. Bonazza NA, Smuin D, Onks CA, Silvis ML, Dhawan A. Reliability, validity, and
   injury predictive value of the Functional Movement Screen: a systematic
   review and meta-analysis. American Journal of Sports Medicine.
   2017;45(3):725-732. DOI: 10.1177/0363546516641937.
3. Morgan R, LeMire S, Knoll L, et al. The Functional Movement Screen: exploring
   interrater reliability between raters in the updated version. International
   Journal of Sports Physical Therapy. 2023;18(3):737-745. DOI:
   10.26603/001c.74724.
4. Bazarevsky V, Grishchenko I, Raveendran K, Zhu T, Zhang F, Grundmann M.
   BlazePose: on-device real-time body pose tracking. arXiv:2006.10204.
5. Colyer SL, Evans M, Cosker DP, Salo AIT. A review of the evolution of
   vision-based motion analysis and the integration of advanced computer vision
   methods towards developing a markerless system. Sports Medicine - Open.
   2018;4:24. DOI: 10.1186/s40798-018-0139-y.

No citation enters the submission package until a human author has opened,
read, and verified the source and its relevance.

### Methods

#### Human-Centered System Design

- Manual scoring problems and design requirements.
- Seven-movement product capability table.
- Workbench, Study Mode, Video Manager, movement adapters, quality gates, and
  export/research architecture.

#### Phase I Study Design

- Exploratory observational software-and-data pilot.
- Seven-movement product workflow; four-movement quantitative study.
- No prospective participant recruitment or clinical outcome collection.

#### Canonical Dataset

- 28 unique source videos.
- 29 ingests after lineage reconstruction.
- 110 canonical repetitions.
- Stable IDs and SHA-256 lineage.
- Repetitions nested within source videos; do not call them 110 participants.

#### Quality Gates

- 97 blindable repetitions.
- 66 pose/timing feature-ready repetitions.
- 58 repetitions passed both gates.
- Formal sample: 32 repetitions, eight per movement, from 21 source videos.
- Selection was deterministic and balanced, not simple random sampling.

#### Human Review

- Two reviewers, two blind rounds.
- Approximately 51-hour interval before Round B.
- Re-randomized queues and isolated storage.
- No file names, historical labels, AI scores, pose evidence, prior-round
  answers, other-reviewer answers, or audio cues.
- `0` reserved for observed or reported pain; insufficient protocol evidence
  recorded as `unscorable`.

#### Pose and Quantitative Features

- MediaPipe Pose Landmarker.
- Action-specific timing and feature adapters.
- 2D normalized distances, angles, trajectories, and cycle events.
- Camera-audited feature sensitivity and action-specific quality gates.

#### Locked AI Comparison

- Suggestions generated without file names, notes, historical scores, reviewer
  comments, or legacy AI labels.
- Final rules locked before Round B results were viewed.
- Development occurred after Round A; report as post-audit internal benchmark,
  not held-out validation.
- Coverage, abstention, exact agreement, within-one agreement, MAE, and weighted
  kappa reported separately.

#### Movement-Specific Analyses

| Movement         | Question                                                 | Method                                                 | Unit                  |
| ---------------- | -------------------------------------------------------- | ------------------------------------------------------ | --------------------- |
| Deep Squat       | Does depth determine the complete movement strategy?     | Side-view continuum and Spearman rank analysis         | 15 reps / 7 videos    |
| ASLR             | Are similar results stable across sides and repetitions? | Within-source bilateral repeatability series           | 4 good reps           |
| Hurdle Step      | Do score-2 repetitions share one review pathway?         | Blind-comment thematic coding plus quantitative ranges | 5 reps / 5 videos     |
| Rotary Stability | Can a peak frame represent a complex sequence?           | Full-cycle event matrix                                | 8 blind-reviewed reps |

### Results

#### Human Reliability

- Round A outcome agreement: 31/32.
- Round A jointly scored: 26/26 exact.
- Round B outcome agreement: 32/32.
- Round B jointly scored: 26/26 exact.
- Round B unscorable reason agreement: 6/6.
- Each reviewer changed one numeric score between rounds, on the same Hurdle
  Step repetition.

#### AI-Human Internal Concordance

- Final AI score available: 28/32.
- Abstained: 4/32 staged Deep Squat floor attempts without required follow-up.
- Comparable with numeric Round B consensus: 25.
- Exact: 16/25.
- Within one: 23/25.
- MAE: 0.44.
- Linear weighted kappa: 0.4917.

#### Quantitative Findings

1. Deep Squat: depth, hip flexion, and knee flexion formed a clearer continuum;
   ankle, trunk, and alignment retained partly independent information.
2. ASLR: active height varied less than stationary-ankle drift and pelvic-gap
   proxies within the selected bilateral series.
3. Hurdle Step: five blind score-2 repetitions formed four review pathways:
   multi-domain control, distal alignment, return-phase alignment, and dowel
   control.
4. Rotary Stability: cycle-level touch, extension, timing, and return evidence
   separated incomplete cycles from conservative score-boundary cases.

#### Historical Label Audit

- Stable two-round numeric consensus: 25.
- Exact historical matches: 18 audited weak labels.
- Stable disagreements: 6.
- Historical score missing: 1.
- Do not claim the 32-repetition audit validates all 110 historical labels.

### Discussion

Required interpretation:

- The main contribution is information preservation and traceability, not an
  autonomous scorer.
- FMS ordinal scores may compress different kinds of information for different
  movements.
- Human reliability and AI-human concordance answer different questions.
- Abstention is a designed evidence boundary, not a missing score to hide.
- High agreement in two reviewers does not equal expert-panel or population
  validation.
- The four analyses are exploratory and source-limited.

### Limitations

- 28 source videos, not 110 independent participants.
- No demographics, training background, clinical outcomes, or injury outcomes.
- Two reviewers only; no certified expert panel in the current dataset.
- Public/instructional source selection and rights heterogeneity.
- 2D pose and camera-view limitations.
- One-source ASLR series, two-source formal Rotary subset, and manual Hurdle
  thematic coding.
- Final AI is post-audit and not held-out.
- Round B was blind, so it cannot test whether AI evidence improved human
  efficiency, confidence, or accuracy.

### Acknowledgments and Disclosures

Required statements:

- Human author contributions.
- Adult advisor role.
- Other Reviewer role and whether authorship criteria are met.
- MediaPipe model and version.
- OpenAI Codex use in software, scripts, figures, and internal drafting.
- No AI author.
- Funding and conflicts of interest.
- Rights/privacy and data availability boundaries.
- Ethics/SRC/IRB determination or journal-approved rationale.

### References

Target: a concise, human-verified reference list covering FMS reliability and
validity, video-based FMS scoring, markerless pose estimation, 2D measurement
limitations, and responsible human-in-the-loop AI.

## Figure and Table Plan

NHSJS requires at least five figures or tables for a Research Article. Proposed
submission set:

1. Table 1: manual scoring problems, implemented functions, and boundaries.
2. Figure 1: AI-FMS human-in-the-loop workflow and evidence lineage.
3. Table 2: all-seven-movement product capability.
4. Figure 2: Study Mode dry-run blind-review interface with a selected anonymous
   frame from 2026-08-23 project-owned, consented footage.
5. Figure 3: full Workbench interface using the same consented project footage
   with aligned MediaPipe pose.
6. Table 3: dataset tiers and four-movement Phase I sample distribution.
7. Table 4: Round A/B human reliability and AI-human concordance.
8. Figures 4-7: four movement-specific secondary analyses.

All figures must be readable in print and free of source file names, local
paths, score-bearing metadata, and raw reviewer comments. The selected Workbench
and Study Mode frames have completed the project-owned-footage replacement and
clearance step. Raw video, raw pose, and all other identifiable source frames
remain private unless separately cleared.

## Claims Excluded from the Manuscript

- AI improves reviewer efficiency or confidence.
- The model is clinically validated or diagnostically accurate.
- AI predicts pain, impairment, or injury risk.
- Seven actions have equal validation maturity.
- The 32-repetition subset validates all 110 historical labels.
- Repetitions are independent participants.
- Final AI v1.1 is held-out validation.
