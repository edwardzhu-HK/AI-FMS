# AI-FMS: An Explainable Human-in-the-Loop Interface for Functional Movement Screen Video Review

**Haoran Zhu**
[CONFIRM AFFILIATION]
[CONFIRM CITY, COUNTRY]
[CONFIRM EMAIL]

**[CONFIRM ADDITIONAL HUMAN AUTHOR(S), AFFILIATIONS, AND EMAILS]**

## Abstract

Functional Movement Screen (FMS) video review requires trained interpretation of brief movement sequences, protocol, side-specific evidence, and ordinal 0-3 scores. We present AI-FMS, an explainable human-in-the-loop interface for all seven FMS movements. It combines repetition segmentation, looped playback, pose overlays, movement-specific evidence, first-pass suggestions, quality warnings, protocol-aware abstention, and traceable review. Blind Study Mode protects independent ratings from filenames, prior answers, pose evidence, and AI output. In a four-movement Phase I internal evaluation, two reviewers completed two blind rounds over 32 repetitions. A locked AI pass yielded 25 comparable results: 16/25 exact and 23/25 within one, mean absolute error 0.44, and linear weighted kappa 0.4917. The demo foregrounds inspecting, correcting, or rejecting AI suggestions rather than autonomous scoring. AI-FMS is a movement-screening review tool, not a diagnostic or injury-prediction system.

## CCS Concepts

- **Human-centered computing** -> Interactive systems and tools;
- **Human-centered computing** -> Human computer interaction (HCI);
- **Computing methodologies** -> Computer vision.

## Keywords

human-in-the-loop AI, intelligent user interface, movement screening, pose estimation, explainable AI, video review, abstention

## 1 Introduction

The Functional Movement Screen compresses seven observed movement patterns into ordinal 0-3 scores. Human judgment remains essential because protocol, pain, clearing conditions, completion, and evidence quality cannot be reduced safely to pose coordinates. Ordinary video players, however, provide little support for locating repetitions, comparing attempts, inspecting side-specific motion, or retaining quantitative evidence omitted by the final score.

Markerless pose estimation can extract body landmarks from ordinary video, but two-dimensional measurements are sensitive to camera geometry, occlusion, clothing, and framing [1-3]. An intelligent interface must therefore do more than display a predicted score. It should expose relevant evidence, communicate limitations, support correction, and keep the reviewer in control [4].

AI-FMS is a browser-based interface designed around this distribution of responsibility: AI organizes repetitions, pose evidence, explanations, and first-pass suggestions; the reviewer owns protocol, confidence, unscorable decisions, and the final score. The contribution combines a seven-movement workflow, protocol-aware abstention, a blind rating mode separated from evidence inspection, and traceable adjudication/export. It is an interface and feasibility contribution, not clinical validation.

## 2 Interface Design

### 2.1 One repetition as the unit of work

After ingest, the user selects the usable time range and reviews repetition boundaries. Each repetition receives a stable identifier and can be looped. Video, navigation, movement and protocol controls, score, confidence, and notes remain visible within one task surface.

Figure 1 summarizes the interaction. Pose landmarks become movement-specific evidence that passes through quality and protocol gates. The interface then presents an explainable suggestion or abstention; human review and adjudication produce the output.

**Figure 1. AI-FMS evidence and control flow.**
`figures/iui-figure-01-workflow.png`

### 2.2 Evidence before recommendation

The Workbench overlays landmarks and presents movement-specific quantities: joint relationships around squat depth, active- and stationary-leg evidence for Active Straight-Leg Raise, Hurdle Step trajectories, and Rotary Stability cycle events. The suggestion panel states which evidence contributed and which quality checks passed.

Camera view and side are reviewer-controlled. Low visibility, incomplete cycles, ambiguous side evidence, or missing protocol metadata trigger warnings. Pain and clearing tests are never inferred from silent video.

### 2.3 Abstention as an interface state

AI-FMS distinguishes "low score" from "insufficient evidence." Abstention includes a reason and requested human action, such as confirming a staged Deep Squat condition or reviewing a Rotary cycle. The reviewer can resolve the condition, score manually, or leave the item unscorable.

### 2.4 Independent review and adjudication

Study Mode removes filenames, labels, prior answers, AI output, pose evidence, audio, and the other reviewer's data. The item can later open in the Workbench or adjudication view. This prevents the rating interface from leaking the output being evaluated.

**Figure 2. Two interface roles. (a) Workbench with pose-based evidence and reviewer controls. (b) Blind Study Mode for independent scoring.**
`figures/iui-figure-02-workbench-study-composite.png`

## 3 Implementation and Preliminary Evaluation

AI-FMS uses React/Vite, movement-specific scoring modules, structured exports, and a private local research database. A MediaPipe-based pipeline extracts single-camera pose landmarks [1]. Shared schemas connect interface, scoring, export, and analysis; automated checks cover parsing, scoring, blinding, exports, and builds.

Phase I focused on Deep Squat, Hurdle Step, Active Straight-Leg Raise, and Rotary Stability. The corpus contained 28 unique videos, 29 ingests, and 110 canonical repetitions. A deterministic balanced formal subset contained 32 repetitions, eight per movement from 21 videos. Two reviewers completed two blind rounds approximately 51 hours apart.

In Round B, reviewers agreed on status for all 32 items and matched all 26 mutually numeric scores; six items were mutually unscorable. Round B hid AI output and therefore measures repeated human review, not an assistance effect.

Final AI rules were locked before Round B results were viewed but after Round A informed development. This is an internal post-audit, not held-out validation. AI output covered 28/32 items, abstaining on four staged-protocol cases; 25 outputs had comparable human scores.

**Table 1. Phase I internal benchmark.**

| Measure                        |                      Result |
| ------------------------------ | --------------------------: |
| Human Round B agreement        | 32/32 status; 26/26 numeric |
| AI output; comparable items    |                   28/32; 25 |
| Exact; within-one agreement    |                16/25; 23/25 |
| MAE; linear weighted kappa [5] |                0.44; 0.4917 |

The result supports first-pass feasibility while leaving substantive cases for human interpretation; it does not establish clinical validity or external generalization.

## 4 Demonstration

The four-minute local demo uses permission-cleared video. It moves from ingest, range, segmentation, and looped playback to pose evidence and explanation; the presenter then changes a reviewer-controlled condition, opens an abstention case, switches to blind Study Mode and adjudication/export, and compares same-score movement evidence. One laptop and modern browser are sufficient, and the demo runs offline with preloaded media. No private participant record, proprietary course content, or cloud account is used.

## 5 Limitations and Next Steps

The convenience corpus is small, heterogeneous, and nested by video; the reviewers represent one trained pair; the AI benchmark is internal; and two-dimensional pose remains camera-sensitive. The study did not compare review with and without visible AI. Next work will use permission-cleared held-out video, additional reviewers, and a randomized assistance study measuring time, confidence, corrections, decisions, and appropriate reliance.

## 6 Conclusion

AI-FMS converts video into inspectable repetitions and quantitative evidence, offers explainable first-pass suggestions, and abstains when protocol or pose evidence is insufficient. The reviewer retains final control. The demo shows how evidence, abstention, and auditability can support responsible human-AI collaboration in expert video review.

## Acknowledgments and Generative AI Use Disclosure

[CONFIRM HUMAN ACKNOWLEDGMENTS.] OpenAI Codex assisted implementation, tests, data and statistical scripts, figures, editing, and portions of drafting under human direction. Human authors defined the research and FMS protocol, audited scoring, corrected errors, verified results and references, set the claim boundaries, and take full responsibility for the work.

## References

1. Valentin Bazarevsky, Ivan Grishchenko, Karthik Raveendran, Tyler Zhu, Fan Zhang, and Matthias Grundmann. 2020. BlazePose: On-device real-time body pose tracking. _arXiv:2006.10204_. https://doi.org/10.48550/arXiv.2006.10204
2. Steffi L. Colyer, Murray Evans, Darren P. Cosker, and Aki I. T. Salo. 2018. A review of the evolution of vision-based motion analysis and the integration of advanced computer vision methods towards developing a markerless system. _Sports Medicine - Open_ 4, 24. https://doi.org/10.1186/s40798-018-0139-y
3. Lukasz Kidzinski, Bryan Yang, Jennifer L. Hicks, Apoorva Rajagopal, Scott L. Delp, and Michael H. Schwartz. 2020. Deep neural networks enable quantitative movement analysis using single-camera videos. _Nature Communications_ 11, 4054. https://doi.org/10.1038/s41467-020-17807-z
4. Saleema Amershi, Dan Weld, Mihaela Vorvoreanu, et al. 2019. Guidelines for human-AI interaction. In _Proceedings of the 2019 CHI Conference on Human Factors in Computing Systems_. ACM, 1-13. https://doi.org/10.1145/3290605.3300233
5. Jacob Cohen. 1968. Weighted kappa: Nominal scale agreement with provision for scaled disagreement or partial credit. _Psychological Bulletin_ 70, 4, 213-220. https://doi.org/10.1037/h0026256
