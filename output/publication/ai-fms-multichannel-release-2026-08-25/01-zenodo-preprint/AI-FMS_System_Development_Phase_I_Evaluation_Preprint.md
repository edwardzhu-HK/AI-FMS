# AI-FMS: System Development, Phase I Evaluation, and Human-AI Collaboration in FMS Video Review

**Haoran ZHU**
Kang Chiao International School East China Campus
Corresponding email: 13061747546@163.com

**Preprint. Not peer reviewed.**
Version 1.0, 3 October 2026
DOI: 10.5281/zenodo.23118144

## Abstract

Functional Movement Screen (FMS) assessment depends on trained human observation, yet practical video review can be constrained by transient viewing, remote access, repeated manual navigation, qualitative judgments, and the compression of movement into an ordinal 0-3 score. We developed AI-FMS, a human-in-the-loop video-review system with implemented functionality for all seven FMS movements, including upload, repetition segmentation, looped playback, reviewer scoring, structured protocol fields, pose overlays, quantitative features, explainable first-pass score suggestions, quality warnings, abstention, adjudication, and traceable export. The system uses two-dimensional pose landmarks to preserve movement evidence such as joint angles, relative distances, side-specific trajectories, and full-cycle events while retaining human authority over protocol, pain, clearing conditions, and final scores.

Building on the seven-movement system, Phase I quantitative research focused on Deep Squat, Hurdle Step, Active Straight-Leg Raise, and Rotary Stability. The corpus contained 28 unique source videos and 110 canonical repetitions. A balanced subset of 32 repetitions, eight per movement, was reviewed by two reviewers in two independent blinded rounds. Both rounds concealed AI scores, pose evidence, previous ratings, and the other reviewer's results. Human rating consistency and AI-human score comparison formed one part of the study: among 25 comparable items, the locked AI matched the human reference exactly on 16 and was within one point on 23. These are internal exploratory findings, not independent external validation.

The structured movement evidence also enabled further analyses: a Deep Squat depth-and-joint-strategy continuum, ASLR bilateral repeatability, different control and deduction pathways within the same Hurdle Step score, and Rotary Stability full-cycle event structures. These analyses preserve continuous differences, bilateral relationships, and temporal information beyond the 0-3 score, providing traceable evidence for movement explanation, cross-repetition comparison, and future research. AI-FMS thus combines seven-movement system development, Phase I quantitative research, and movement analyses enabled by the system's data. Automation organizes evidence and offers inspectable suggestions while human reviewers retain final interpretation and scoring authority. The system is not intended for clinical diagnosis or injury prediction.

**Keywords:** Functional Movement Screen; human-in-the-loop AI; movement screening; pose estimation; video review; explainable AI; human-AI interaction; sports technology

## 1. Introduction

The Functional Movement Screen organizes seven movement patterns into a structured assessment scored on an ordinal 0-3 scale. Research has reported useful interrater and intrarater reliability, while also documenting important questions about validity and warning against treating a composite score as a stand-alone injury-prediction instrument [1-3]. This distinction matters for the present project: AI-FMS is a movement-screening and review system, not a diagnostic or injury-prediction tool.

Human scoring is essential because an assessor must interpret whether the movement followed protocol, whether a clearing condition or pain report changes the score, and whether the visual evidence is sufficient. However, the work is not always ergonomically supported. A movement may pass before the reviewer has inspected every region. Remote or asynchronous review requires manual navigation through long videos. Camera orientation and side can be mislabeled. A reviewer may want to compare attempts or inspect a joint relationship frame by frame, but a conventional player does not preserve that evidence as structured data.

The ordinal score also performs necessary compression. Two repetitions may both receive a score of 2 while differing in depth, trunk strategy, knee control, side-to-side stability, or movement path. The score is appropriate for screening, but the underlying motion contains additional information that may be useful for explanation, quality control, and later research. Markerless pose estimation makes it possible to calculate continuous movement descriptors from ordinary video, although two-dimensional measurements remain sensitive to camera geometry, occlusion, clothing, and framing [4-7].

AI-FMS was therefore designed around two linked goals. The first was to make human video review more usable, repeatable, and traceable. The second was to preserve selected quantitative evidence that the 0-3 result does not retain. The central design decision was not to automate the human away. Instead, the system combines machine-assisted segmentation, pose evidence, explicit uncertainty, and first-pass suggestions with reviewer-controlled protocol fields, scoring, notes, and adjudication.

This report makes three contributions:

1. It implements an end-to-end AI-assisted review system for all seven FMS movements, integrating video annotation, pose evidence, explainable suggestions, human review, and traceable export.
2. It conducts Phase I quantitative research on four movements, establishing a reproducible corpus and a two-reviewer, two-round blinded workflow, and reporting human rating consistency, an internal AI-human benchmark, coverage, and abstention.
3. It uses structured movement evidence to analyze movement-specific strategy continua, bilateral repeatability, control and deduction pathways, and full-cycle events, demonstrating information beyond the ordinal score while preserving non-clinical claim boundaries.

## 2. System Objectives and Design Principles

### 2.1 Support the reviewer before predicting a score

The system begins with the review task. Users can upload a video, define an analysis range, detect or adjust repetitions, loop a selected repetition, and record a score with protocol context. Each repetition receives stable identifiers and a traceable relationship to its source video. This structure reduces repeated searching and supports later adjudication.

### 2.2 Preserve evidence, not just the output label

For each supported movement, AI-FMS can retain timing, pose landmarks, derived angles or relative distances, side evidence, quality flags, and an explanation of any AI suggestion. The visible overlay lets the reviewer inspect whether the landmarks correspond to the body. Quantitative values are presented as supporting evidence rather than ground truth.

### 2.3 Make uncertainty actionable

The system distinguishes a low score from insufficient evidence. It can abstain when protocol metadata are missing, a staged condition changes the interpretation, pose quality is inadequate, or a pain/clearing decision requires human input. This follows human-AI interaction guidance that systems should communicate limitations and make correction possible [8].

### 2.4 Keep human authority explicit

The reviewer controls camera view, side, protocol condition, score, confidence, and notes. Pain and clearing tests are never inferred from silent video. AI suggestions can be accepted, revised, or ignored. A second reviewer and adjudication workflow can inspect the same repetition without overwriting the first judgment.

## 3. System Implementation

### 3.1 Interface and data flow

AI-FMS is implemented as a browser-based React/Vite workbench with a structured data layer and a private local database. The operational flow is:

1. ingest a source video and record provenance;
2. define the usable analysis range;
3. segment candidate repetitions;
4. run pose landmark extraction;
5. compute movement-specific features and quality gates;
6. generate an explainable first-pass suggestion or abstention;
7. conduct independent human review and adjudication; and
8. export structured records for analysis.

The implementation reuses stable schemas and generated adapters so that interface fields, exports, reports, and database records refer to the same source-of-truth representation. Automated checks cover data parsing, scoring logic, study-mode blinding, export behavior, and builds. At the Phase I release point, the repository quality gate included 340 automated tests together with linting, formatting, and three production entry builds. This is engineering evidence, not a claim of three independent scientific validations.

### 3.2 Seven-movement product scope

The product workflow supports Deep Squat, Hurdle Step, In-Line Lunge, Shoulder Mobility, Active Straight-Leg Raise, Trunk Stability Push-Up, and Rotary Stability. Across movements, shared functions include video ingestion, repetition timing, playback, reviewer scoring, structured evidence, and export. Movement-specific modules define the relevant landmarks, events, side logic, protocol gates, and explanation text.

Rotary Stability required a different approach from a single peak-angle threshold. Its first-pass suggestion uses full-cycle event evidence, including pattern and side relationships, reach or contact behavior, trunk rotation, center displacement, return completion, and balance-related events. The output remains conservative and can abstain when the cycle cannot be resolved.

### 3.3 Interface views

The Workbench is designed for transparent inspection. A video panel, repetition navigator, movement and protocol fields, quantitative evidence, pose overlay, and score controls remain visible within one task-oriented surface. A separate Study Mode hides filenames, prior answers, AI scores, pose evidence, and the other reviewer's data so that formal human ratings can be collected without information leakage.

**Figure 1.** AI-FMS system workflow from source video to traceable reviewer-controlled output.
`figures/figure-01-ai-fms-workflow.png`

**Figure 2.** Main Workbench with a real, permission-cleared demonstration video and inspectable quantitative evidence.
`figures/figure-02-workbench-overview.png`

**Figure 3.** Blind Study Mode used to collect independent human ratings.
`figures/figure-03-study-mode.png`

## 4. Phase I Methods

### 4.1 Research scope

Phase I focused on Deep Squat, Hurdle Step, Active Straight-Leg Raise (ASLR), and Rotary Stability. The four movements were selected because they represented distinct technical challenges: multi-joint depth and strategy, dynamic single-leg control, side-specific range and stabilization, and full-cycle pattern events. The study was exploratory and intended to test the data and review pipeline rather than establish clinical performance.

### 4.2 Corpus construction

The curated corpus contained 28 unique source videos represented by 29 ingestion records and 110 canonical repetitions. Of these, 97 were eligible for blinded review, 66 were feature-ready, and 58 met both criteria. Repetitions remained linked to their source videos because multiple repetitions from one video are not statistically independent.

The formal subset contained 32 repetitions, eight from each movement, drawn from 21 source videos. Selection was deterministic and balanced, not random. Stable study identifiers and randomized presentation order hid source filenames and score-related metadata from reviewers. Historical AI suggestions existed for some corpus items, but 92 legacy numeric suggestions were excluded from formal evidence because they were generated during development and could contain label leakage or tuning dependence.

### 4.3 Human review protocol

One reviewer, Haoran ZHU, completed FMS Level 1 certification on 17 July 2025 and FMS Level 2 certification on 10 August 2025, before the Phase I reviews. These certifications informed his use of the FMS protocol and interpretation of movement evidence.

Two reviewers completed Round A and Round B approximately 51 hours apart. In both rounds, each reviewer was blind to source filenames, historical labels, AI scores, pose evidence, audio, prior answers, and the other reviewer's responses. The order was independently randomized. Reviewers recorded:

- numeric FMS score when the repetition was independently scorable;
- unscorable status and reason when protocol or evidence was insufficient;
- camera view and side;
- protocol condition;
- confidence; and
- optional notes.

Round B was a repeated blind review, not an AI-assisted review. It therefore measures short-interval review stability, not whether displaying AI evidence improves speed, confidence, or accuracy.

### 4.4 Locked AI benchmark

The final AI rules were developed after inspecting Round A outcomes but were frozen before Round B results were viewed. The locked pass was then compared with the final human reference. Because the formal items informed development, this is an internal post-audit benchmark rather than held-out validation.

The primary metrics were coverage, abstention, exact agreement, within-one agreement, mean absolute error, and linear weighted Cohen's kappa [9]. Coverage and abstention are reported explicitly because a responsible system should not receive credit for forcing a numeric score when required evidence is missing.

### 4.5 Secondary quantitative analyses

The full corpus was used to examine whether repetitions with the same human score could follow different observable movement strategies. These analyses are descriptive. They do not identify diagnoses or prove functional impairments. Their purpose is to generate testable hypotheses and demonstrate what information a traceable pose record can preserve.

## 5. Results

### 5.1 Human review agreement and stability

In Round A, the two reviewers agreed on status for 31 of 32 items and assigned exactly the same numeric score to all 26 items that both considered numeric. In Round B, they agreed on status for all 32 items and again matched exactly on all 26 mutually numeric items. Six Round B items were mutually classified as unscorable for protocol-based reasons.

Between rounds, each reviewer changed one numeric score, and both changes concerned the same Hurdle Step repetition. The result suggests strong agreement within this small reviewer pair, but it should not be generalized to other reviewers without a larger multi-rater study. Exact agreement can also be inflated when a sample contains a limited score range.

### 5.2 Locked AI-human benchmark

The locked AI generated output for 28 of 32 formal items. It abstained on four Deep Squat items because the staged protocol condition could not be safely resolved from the available metadata and visual evidence. Three additional AI outputs did not have a comparable numeric human reference, leaving 25 comparable items.

Among these 25 items:

- exact agreement was 16/25 (64%);
- within-one agreement was 23/25 (92%);
- mean absolute error was 0.44; and
- linear weighted Cohen's kappa was 0.4917.

These results indicate promising alignment for a first-pass assistance system while leaving meaningful room for refinement. The four abstentions are not treated as failures equivalent to incorrect forced scores; they demonstrate that protocol-aware refusal can be part of the interface contract.

**Table 1. Phase I evidence summary**

| Evidence layer       | Result                                      | Appropriate interpretation                                                |
| -------------------- | ------------------------------------------- | ------------------------------------------------------------------------- |
| Corpus               | 28 unique videos; 110 canonical repetitions | Development and exploratory analysis corpus                               |
| Formal review        | 32 repetitions; 2 reviewers; 2 blind rounds | Small internal reliability audit                                          |
| Round B human status | 32/32 agreement                             | Agreement within this reviewer pair                                       |
| Locked AI coverage   | 28/32                                       | AI can analyze most formal items and abstain on unresolved protocol cases |
| AI-human comparable  | 25 items                                    | Internal post-audit benchmark, not held-out validation                    |
| Exact / within one   | 16/25 / 23/25                               | Preliminary ordinal alignment                                             |
| MAE / weighted kappa | 0.44 / 0.4917                               | Descriptive internal performance                                          |

### 5.3 Quantitative information within an ordinal score

#### Deep Squat: a continuum of depth and joint strategy

Deep Squat provided the clearest example of score compression. Repetitions sharing a human score occupied different positions along a descriptive continuum defined by squat depth, knee and hip flexion, trunk angle, and knee-to-foot relationships. Rather than creating a new diagnostic subtype, AI-FMS makes the evidence visible: one score-2 repetition may approach the required depth with a greater forward-trunk strategy, while another may remain shallower with a different knee-hip contribution. The observation suggests that a future, larger study could test whether feature profiles improve coaching explanation or longitudinal tracking.

**Figure 4.** Deep Squat strategy continuum among same-score repetitions.
`figures/figure-04-deep-squat-strategy-continuum.png`

#### ASLR: bilateral repeatability as an evidence-quality question

ASLR is side-specific and visually simple, but the stationary leg, pelvis, camera framing, and landmark quality affect interpretation. Repeated left-right evidence showed where active-leg height appeared stable and where side assignment or pose confidence required review. The central contribution is not a claim about a particular restriction. It is the ability to preserve bilateral trajectories and surface low-confidence evidence rather than reducing every observation to one number.

**Figure 5.** ASLR bilateral evidence and repeatability.
`figures/figure-05-aslr-bilateral-repeatability.png`

#### Hurdle Step: multiple pathways to the same score

Hurdle Step demonstrated that a similar peak position can be reached through different temporal paths. Full-trajectory evidence separated ascent, clearance, stance control, return, and balance events. A repetition can therefore share a score with another while differing in where the movement becomes unstable. These are descriptive movement pathways, not medical impairment categories.

**Figure 6.** Hurdle Step score-2 pathways across the movement cycle.
`figures/figure-06-hurdle-score2-pathways.png`

#### Rotary Stability: event structure and appropriate abstention

Rotary Stability cannot be summarized reliably by a single peak angle. Its protocol depends on pattern, side, sequence, contact, extension, balance, and return. The event matrix helped explain why full-cycle logic was necessary and why the system should abstain when the pattern could not be resolved. This case represents a different kind of value from parameter extraction: a transparent system can show both what it detected and why that evidence was not enough for a confident suggestion.

**Figure 7.** Rotary Stability cycle-event matrix.
`figures/figure-07-rotary-cycle-event-matrix.png`

## 6. Human-AI Collaboration in Development

The project was developed through an iterative collaboration between domain-led human review and generative-AI-assisted engineering. Haoran ZHU's FMS training and repeated scoring work shaped the protocol logic, movement-specific evidence, and acceptance criteria. Human reviewers defined when a repetition was scorable, corrected camera and side metadata, identified information leakage, reviewed every formal item, and determined the claim boundaries.

OpenAI Codex assisted with code exploration, implementation, tests, data reconciliation, statistical scripts, figure preparation, document drafting, and release checks. This assistance accelerated iteration but did not remove the need for human correction. Three examples were especially important:

1. Legacy AI suggestions created during development could not be treated as independent validation. They were separated from the formal evidence layer.
2. Camera-view metadata appeared structured but required correction for 45 of 110 canonical repetitions. Human visual review remained necessary.
3. Rotary Stability could not be responsibly completed by adding one convenient threshold. The implementation had to represent the full movement cycle and allow abstention.

These examples support a broader design lesson: successful human-AI collaboration is not defined by how much content the model produces. It is defined by whether responsibilities, evidence, uncertainty, and correction paths are explicit. The human author remains fully responsible for this report, its references, permissions, calculations, and conclusions.

## 7. Discussion

AI-FMS demonstrates that an intelligent movement-review interface can add value before it reaches the threshold of autonomous or clinical-grade scoring. The system makes video navigable, turns repetitions into traceable records, preserves quantitative evidence, and creates a structured place for disagreement and uncertainty. The reviewer remains in control of protocol and final interpretation.

The internal benchmark is encouraging but deliberately modest. Exact agreement of 64% and within-one agreement of 92% show that the AI often lands close to the human reference, while the moderate weighted kappa and movement-specific errors show that ordinal alignment is not solved. Reporting abstention also changes the evaluation question from "Did the model always output a number?" to "Did the system make a defensible contribution to review?"

The secondary analyses extend the project's value beyond score reproduction. Traditional FMS scoring compresses a movement into a practical screening label. Pose evidence can preserve continuous differences within that label and make them available for explanation, comparison, and hypothesis generation. However, the observed feature patterns should not be translated directly into diagnoses. A movement strategy may have multiple causes, and two-dimensional video cannot establish underlying pathology.

The project also illustrates a productive use of generative AI in student-led research and engineering. Codex accelerated repetitive and technical work, but the most consequential decisions were human: what problem to solve, which protocol mattered, which evidence was contaminated, which outputs were misleading, what needed to be re-recorded, and what claims the data could not support. That distribution of responsibility is central to the system itself.

## 8. Limitations

First, the corpus is a convenience sample. It is small, heterogeneous, and uneven across movements, sources, camera views, and protocol conditions. Repetitions are nested within videos and subjects, so repetition-level counts do not equal independent sample size.

Second, the two-reviewer audit involved one reviewer pair and a short interval. The strong exact agreement should be tested with more reviewers, broader experience levels, longer intervals, and adjudication procedures.

Third, the final AI was refined after Round A. Locking it before Round B protected one part of the process, but the 32 formal items were still involved in development. The reported comparison is therefore an internal post-audit benchmark, not held-out validation.

Fourth, Round B remained fully blind. This protected the human reference but means the study did not test whether visible AI evidence changed reviewer time, confidence, or accuracy. A future assistance study should randomize access to AI evidence and define those outcomes prospectively.

Fifth, two-dimensional pose landmarks are affected by perspective, self-occlusion, clothing, lighting, framing, and model uncertainty. Relative features reduce but do not eliminate these problems. Quantities should not be interpreted as laboratory-grade three-dimensional biomechanics.

Sixth, some protocol information cannot be inferred from image data. Pain, clearing-test outcomes, staging, equipment conditions, and some contact events require explicit human confirmation.

Finally, the current dataset and private database cannot be released in full because analytical access does not imply publication rights, and reviewer records may contain sensitive information. Public replication materials must use permission-cleared examples or newly collected consented data.

## 9. Ethics, Privacy, and Responsible Use

AI-FMS is intended for movement screening, education, research workflow, and reviewer assistance. It should not be used to diagnose disease, infer pain from appearance, predict injury, determine eligibility, or replace qualified professional judgment. Users should obtain consent appropriate to recording, analysis, storage, and publication; minimize identifiers; protect raw media and reviewer records; and define retention and deletion procedures.

The interface should show the origin of each suggestion, distinguish measured evidence from inferred conclusions, and make abstention visible. Public demonstrations should use permission-cleared media and should not expose filenames, local paths, authentication data, or proprietary course content.

## 10. Next Steps

The next research phase should prioritize:

1. a prospectively defined held-out set of newly collected, permission-cleared videos;
2. multiple reviewers with varied training levels and longer retest intervals;
3. a randomized study of review with and without visible AI evidence;
4. movement-specific calibration and confidence intervals;
5. camera protocol standardization and automated metadata validation;
6. external evaluation against expert adjudication;
7. longitudinal analysis that tests whether continuous features are stable and useful; and
8. privacy-preserving public demo and replication materials.

## 11. Conclusion

AI-FMS was created to support the human work of FMS video review and to preserve movement evidence that an ordinal score necessarily compresses. The resulting platform covers all seven movements and combines segmentation, playback, pose-based quantities, explainable first-pass suggestions, quality gates, abstention, independent review, adjudication, and traceable export. Phase I on four movements established a functioning corpus and study workflow, strong agreement within one reviewer pair, and promising but incomplete AI-human alignment. The project's main result is therefore neither autonomous scoring nor a clinical claim. It is a practical, inspectable model of human-AI collaboration in which automation organizes and quantifies evidence while the reviewer owns protocol, uncertainty, and final judgment.

## Data and Code Availability

Source code and project documentation are available at https://github.com/edwardzhu-HK/AI-FMS. A hosted interactive demonstration is not included with this release. The private Phase I corpus, raw video, pose records, reviewer event logs, comments, and SQLite database are not publicly released because consent and publication rights vary by source. Aggregate analysis outputs and permission-cleared figures accompany this preprint.

## Author Contributions

**Haoran ZHU:** Conceptualization; domain protocol; investigation; software testing; human review; validation; visualization review; writing - original draft; writing - review and editing.

## Generative AI Use Disclosure

OpenAI Codex was used under human direction to assist code exploration, implementation, test generation, data reconciliation, statistical scripting, figure preparation, document structuring, language editing, and portions of manuscript drafting. The human author defined the research questions and FMS protocol, reviewed the source evidence, performed and audited the human scoring, corrected model and metadata errors, verified numerical results and references, determined the limitations and claims, and approved the final text. The human author takes full responsibility for the originality, accuracy, permissions, and integrity of this work.

## Conflicts of Interest

The author declares no competing interests.

## Funding

This work received no external funding.

## References

1. Cuchna JW, Hoch MC, Hoch JM. The interrater and intrarater reliability of the Functional Movement Screen: A systematic review with meta-analysis. _Physical Therapy in Sport_. 2016;19:57-65. https://doi.org/10.1016/j.ptsp.2015.12.002
2. Bonazza NA, Smuin D, Onks CA, Silvis ML, Dhawan A. Reliability, validity, and injury predictive value of the Functional Movement Screen: A systematic review and meta-analysis. _American Journal of Sports Medicine_. 2017;45(3):725-732. https://doi.org/10.1177/0363546516641937
3. Moran RW, Schneiders AG, Mason J, Sullivan SJ. Do Functional Movement Screen composite scores predict subsequent injury? A systematic review with meta-analysis. _British Journal of Sports Medicine_. 2017;51(23):1661-1669. https://doi.org/10.1136/bjsports-2016-096938
4. Bazarevsky V, Grishchenko I, Raveendran K, Zhu T, Zhang F, Grundmann M. BlazePose: On-device real-time body pose tracking. _arXiv_. 2020. https://doi.org/10.48550/arXiv.2006.10204
5. Colyer SL, Evans M, Cosker DP, Salo AIT. A review of the evolution of vision-based motion analysis and the integration of advanced computer vision methods towards developing a markerless system. _Sports Medicine - Open_. 2018;4:24. https://doi.org/10.1186/s40798-018-0139-y
6. Kidzinski L, Yang B, Hicks JL, Rajagopal A, Delp SL, Schwartz MH. Deep neural networks enable quantitative movement analysis using single-camera videos. _Nature Communications_. 2020;11:4054. https://doi.org/10.1038/s41467-020-17807-z
7. Pagnon D, Kim H. Sports2D: Compute 2D human pose and angles from a video or a webcam. _Journal of Open Source Software_. 2024;9(101):6849. https://doi.org/10.21105/joss.06849
8. Amershi S, Weld D, Vorvoreanu M, et al. Guidelines for human-AI interaction. In: _Proceedings of the 2019 CHI Conference on Human Factors in Computing Systems_. ACM; 2019:1-13. https://doi.org/10.1145/3290605.3300233
9. Cohen J. Weighted kappa: Nominal scale agreement with provision for scaled disagreement or partial credit. _Psychological Bulletin_. 1968;70(4):213-220. https://doi.org/10.1037/h0026256
