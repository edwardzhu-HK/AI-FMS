# AI-FMS Phase I Publication Track

Status: ACTIVE - multichannel draft review

Last updated: 2026-08-26

Chinese version: `README.zh-CN.md`

## Current publication decision

The project is now preparing three related but distinct public outputs:

1. **Zenodo preprint** - the complete system-development and Phase I research record with a DOI.
2. **OpenAI Developer Community article** - a non-archival build story about what Codex accelerated and what human judgment had to own.
3. **ACM IUI 2027 Demo** - a four-page intelligent-interface paper plus a system-focused demonstration video.

The three outputs share one verified evidence base but do not reuse the same narrative. The earlier NHSJS route is retained as historical preparation material and is not the active publication path because its author-only prose policy conflicts with the project's preferred transparent, AI-positive collaboration story.

## Approved titles

- **Zenodo:** _AI-FMS: System Development, Phase I Evaluation, and Human-AI Collaboration in FMS Video Review_
- **OpenAI Community:** _Building AI-FMS with Codex: What AI Automated and What Human Judgment Had to Own_
- **ACM IUI 2027 Demo:** _AI-FMS: An Explainable Human-in-the-Loop Interface for Functional Movement Screen Video Review_

## Evidence and claim boundary

- Product scope: all seven FMS movements.
- Phase I research focus: Deep Squat, Hurdle Step, Active Straight-Leg Raise, and Rotary Stability.
- Corpus: 28 unique source videos, 29 ingestion records, and 110 canonical repetitions.
- Formal audit: 32 repetitions, eight per movement, from 21 source videos; two reviewers; two blind rounds.
- Round B: 32/32 status agreement and 26/26 exact numeric agreement within this reviewer pair.
- Locked AI: 28/32 coverage; four protocol-aware abstentions; 25 comparable items; exact 16/25; within one 23/25; MAE 0.44; linear weighted kappa 0.4917.
- Interpretation: internal Phase I post-audit feasibility evidence, not held-out, external, or clinical validation.
- AI-FMS supports movement screening and human review. It does not diagnose injury, disease, pain, or impairment and does not replace certified professionals.

## Current readiness

| Component                             | Status                     | Evidence or remaining gate                                                                              |
| ------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------- |
| Three channel-specific English drafts | Ready for author review    | Complete Zenodo, OpenAI Community, and ACM IUI drafts                                                   |
| Zenodo DOCX/PDF                       | Ready for author review    | 15-page rendered preprint with seven figures                                                            |
| Zenodo Chinese translation            | Ready for internal review  | Complete Chinese Markdown and polished Word translation; English remains canonical                      |
| ACM IUI paper                         | Ready for author review    | Official ACM Word template; four total rendered pages                                                   |
| OpenAI Community post                 | Ready for voice review     | Markdown plus polished Word review copy, images, tags, launch copy, and instructions                    |
| Publication instructions              | Ready                      | Chinese step-by-step guides in each package                                                             |
| Checksums and archives                | Ready                      | 52-file manifest, SHA-256 list, and three verified ZIP archives                                         |
| Author/affiliation/ORCID              | Pending human confirmation | Yellow placeholders remain in manuscripts                                                               |
| Media and privacy rights              | Partially cleared          | Public-safe interface figures use consented project video; all other media remain private until cleared |
| Public GitHub ownership               | Pending                    | Transfer to Haoran Zhu after repository history and public-boundary audit                               |
| Public demo URL                       | Pending                    | Build from a sanitized demo dataset and permission-cleared video                                        |
| Zenodo DOI                            | Pending                    | Reserve in draft, then insert into final PDF                                                            |
| ACM preprint compatibility            | Pending written guidance   | Email `posters2027@iui.acm.org` before Zenodo publication                                               |
| IUI attendance and cost               | Pending                    | At least one author must attend Helsinki if accepted                                                    |

## Canonical package

`../../output/publication/ai-fms-multichannel-release-2026-08-25/`

Important entrypoints:

- `README.md`: channel roles and recommended release order.
- `publication-review-order.zh-CN.md`: human review sequence.
- `00-release-control/author-rights-and-claims-checklist.md`: publication blockers.
- `01-zenodo-preprint/`: full preprint, metadata, disclosure, figures, and instructions.
- `02-openai-developer-community/`: developer article, visuals, launch copy, and instructions.
- `03-acm-iui-2027-demo/`: four-page paper, demo runbook/video plan, PCS metadata, policy inquiry, and instructions.
- `release-archives/`: one tested ZIP per channel.
- `release-manifest.json` and `SHA256SUMS`: integrity record.

## Required human decisions

1. Confirm author list, order, affiliation, email, ORCID, and corresponding contact.
2. Review every English sentence, figure, number, reference, and AI-use disclosure.
3. Confirm public rights for every image, video, music track, and repository asset.
4. Decide whether any patent filing is contemplated before publishing a Zenodo record.
5. Send and archive the IUI prior-publication inquiry.
6. Provide Haoran Zhu's GitHub username and approve repository transfer/public release.
7. Confirm that at least one author can attend IUI 2027 in Helsinki if accepted.

## Status language

Use only the status that has actually occurred:

- `draft in author review`
- `preprint published on Zenodo` or `Zenodo preprint`
- `submitted to ACM IUI 2027 Demos`
- `under peer review`
- `accepted`
- `published in the ACM IUI companion proceedings`

A Zenodo preprint and a community post are public, but neither is peer reviewed.
