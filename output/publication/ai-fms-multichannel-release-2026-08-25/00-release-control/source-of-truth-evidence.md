# Source-of-Truth Evidence Snapshot

This file is a publication control, not a public manuscript.

## System scope

- Platform workflow: all seven FMS movements.
- Phase I research focus: Deep Squat, Hurdle Step, Active Straight-Leg Raise, and Rotary Stability.
- Human remains the final scorer.
- Pose-derived quantities are evidence, not diagnosis.

## Corpus and formal review

| Measure                                    | Verified value |
| ------------------------------------------ | -------------: |
| Unique source videos                       |             28 |
| Ingestion records                          |             29 |
| Canonical repetitions                      |            110 |
| Blindable repetitions                      |             97 |
| Feature-ready repetitions                  |             66 |
| Both blindable and feature-ready           |             58 |
| Formal review repetitions                  |             32 |
| Source videos represented in formal review |             21 |
| Reviewers                                  |              2 |
| Review rounds                              |              2 |

## Review results

| Measure                                   | Round A | Round B |
| ----------------------------------------- | ------: | ------: |
| Status agreement                          |   31/32 |   32/32 |
| Exact agreement on mutually numeric items |   26/26 |   26/26 |
| Mutually unscorable items                 |       5 |       6 |

Each reviewer changed one numeric score between rounds, both on the same Hurdle Step item. Round B remained blind to AI scores, pose evidence, filenames, earlier answers, audio, and the other reviewer.

## Locked AI comparison

| Measure                       |                     Verified value |
| ----------------------------- | ---------------------------------: |
| AI output available           |                              28/32 |
| AI abstentions                | 4 Deep Squat staged-protocol items |
| Human-score-comparable items  |                                 25 |
| Exact agreement               |                              16/25 |
| Within-one agreement          |                              23/25 |
| Mean absolute error           |                               0.44 |
| Linear weighted Cohen's kappa |                             0.4917 |

Interpretation: promising internal post-audit evidence for an explainable assistance workflow. It is not held-out, clinical, or external validation.

## Known limitations that must survive editing

- Repetitions are nested within source videos and subjects; 110 is not an independent-subject count.
- The sample is small, convenience-based, and uneven across movements and camera conditions.
- The final AI was developed after Round A and locked before Round B results were viewed.
- Round B cannot measure an AI-assistance effect because AI evidence was not shown.
- Camera-view metadata required manual correction for 45 of 110 canonical repetitions.
- Two-dimensional pose estimation is sensitive to camera geometry, occlusion, clothing, and framing.
- Protocol, pain, and clearing-test conditions require human confirmation.
- Source publication rights remain separate from analytical use rights.
