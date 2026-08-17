# AI-FMS Phase I Publication Track

Status: ACTIVE - presubmission clarification

Last updated: 2026-08-17

Chinese version: `README.zh-CN.md`

Internal review note: the Chinese draft's overall structure, system-development
framing, title, abstract direction, and main conclusions are accepted. Remaining
work is detailed editing, human confirmation, rights/ethics clearance, and
target-format adaptation.

## Publication Decision

Primary route:

1. Prepare an original research manuscript for the National High School Journal
   of Science (NHSJS).
2. Request expedited review only after the journal confirms that the project's
   disclosed AI-assisted workflow, secondary video analysis, and ethics/rights
   documentation are eligible.
3. Deposit a Zenodo preprint only after NHSJS confirms in writing that a preprint
   will not make the manuscript ineligible or count as prior publication.

The Phase I delivery target is a submission-ready manuscript package and, if
the presubmission questions are resolved, a completed submission. Acceptance
and publication dates are controlled by the journal and are not Phase I
completion criteria.

## Why NHSJS

NHSJS accepts high-school original research and currently describes a
peer/professional review path. Its official requirements include:

- a 200-250 word abstract;
- Title, Authors and affiliations, Abstract, Introduction, Methods, Results,
  Discussion, Acknowledgments, and References;
- no more than 20 pages including figures and tables, 12-point font, single
  spacing;
- at least five figures or tables for a Research Article;
- an anonymized standard-citation manuscript and a separate online-citation
  manuscript in Word, or three files for a LaTeX submission;
- explicit methods, sample, data analysis, limitations, and ethical
  considerations.

Official references:

- Submission guidelines: https://nhsjs.com/submission-guidelines/
- Submission types: https://nhsjs.com/submit-your-work/submission-types/
- Review timeline: https://nhsjs.com/about/peer-review-process/
- Contact: submissions@nhsjs.com

The expedited option currently promises a two-week initial decision for $280.
It does not guarantee acceptance or publication; revisions return to the normal
review timeline.

## Current Readiness

| Component                    | Status                    | Evidence                                                                                        |
| ---------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------- |
| Research question and scope  | Ready                     | Four-movement exploratory pilot; seven-movement product scope remains contextual                |
| Frozen quantitative results  | Ready                     | Phase I release candidate and checksum-protected generated artifacts                            |
| Human reliability results    | Ready                     | Round A/B signed export closeout                                                                |
| AI-human internal benchmark  | Ready                     | Final locked prediction package; not held-out validation                                        |
| Movement-specific analyses   | Ready                     | Four differentiated analyses and four generated figures                                         |
| Literature review            | Initial draft             | Eleven starting references included; every source still requires human reading and verification |
| Ethics/SRC/IRB determination | Pending                   | Secondary-video status and any future collection must be confirmed                              |
| Media and protocol rights    | Pending                   | Internal draft has two real-frame UI captures; external reuse needs frame-level clearance       |
| AI-use eligibility           | Pending journal reply     | Full disclosure is mandatory; no policy assumption                                              |
| Authorship and adult advisor | Pending                   | Ronnie first-author target; adult corresponding contact must be confirmed                       |
| NHSJS Word variants          | Pending                   | Created only after eligibility and manuscript text are approved                                 |
| Zenodo deposit               | Blocked by journal policy | No deposit before written preprint confirmation                                                 |
| GitHub ownership             | Pending Ronnie account    | Transfer complete history after main/release and public-boundary audits                         |

## Publication Claims

Use only the status that has actually occurred:

- `manuscript in preparation`
- `manuscript submitted`
- `under peer review`
- `accepted for publication`
- `published`

Do not use `peer reviewed`, `accepted`, or `published` for a working manuscript,
submission receipt, or Zenodo preprint.

## Files

- `nhsjs_presubmission_inquiry_2026-08-17.md`: review-ready inquiry draft.
- `nhsjs_presubmission_inquiry_2026-08-17.zh-CN.md`: Chinese review copy of the
  inquiry.
- `ai_fms_manuscript_evidence_map_2026-08-17.md`: paper structure, frozen facts,
  figure plan, references to verify, and unsupported claims to exclude.
- `ai_fms_manuscript_evidence_map_2026-08-17.zh-CN.md`: Chinese version of the
  evidence map.
- `publication_human_input_form_2026-08-17.md`: short author, contribution,
  rights, and AI-disclosure confirmation form.
- `publication_human_input_form_2026-08-17.zh-CN.md`: Chinese version of the
  human confirmation form.
- `ai_fms_phase_i_full_manuscript_draft_zh-CN_2026-08-17.html`: maintainable
  source for the complete Chinese internal manuscript draft.
- `../../output/pdf/ai_fms_phase_i_chinese_manuscript_draft_2026-08-17.pdf`:
  24-page A4 v0.2 internal review PDF with seven numbered figures, twelve numbered
  tables, references, and four appendices. The formal English submission will
  move detailed case tables, the Study Mode figure, and appendices into
  supporting material to meet the NHSJS 20-page limit at 12-point type.
- `../../scripts/capture-ai-fms-publication-screenshots.mjs`: reproducibly runs
  the real Demo and Study Mode dry-run, seeks fixed action frames, removes source
  names and score-bearing metadata, and generates the three interface assets.
- `../assets/publication/ai-fms-workbench-overview-real-video.png`: complete
  Workbench overview with real movement video and pose overlay.
- `../assets/publication/ai-fms-study-mode-blind-review-real-video.png`: blind
  review workflow with the anonymous action video visible.
- `../assets/publication/ai-fms-workbench-quantitative-evidence.png`: compact
  parameter-detail figure for the project page or supplement.
- `../delivery/ai_fms_phase_i_output_index_2026-08-17.md`: canonical cross-output
  status and delivery entrypoint.
- `../delivery/ronnie_github_repository_transfer_2026-08-17.md`: repository
  ownership-transfer gates and verification checklist.

## Required Human Decisions

Before the inquiry is sent:

1. Confirm Ronnie's current grade, school affiliation, and preferred author name.
2. Identify the adult advisor/corresponding contact.
3. Confirm the accurate role of each human contributor using a CRediT-style
   contribution statement.
4. Confirm which source videos, screenshots, and aggregate figures may be
   described or published.
5. Approve the AI-use disclosure without minimizing the role of Codex.
6. Provide Ronnie's exact GitHub username after account registration.

The two real-frame interface captures are for internal manuscript review until
the exact frames are cleared for publication. If clearance is unavailable, they
must be replaced by equivalent project-owned, consented footage.
