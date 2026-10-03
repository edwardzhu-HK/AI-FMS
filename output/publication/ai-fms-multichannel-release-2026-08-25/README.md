# AI-FMS Multichannel Publication Release Package

**Prepared:** 2026-08-25
**Project stage:** System Development and Phase I Evaluation
**Publication status:** Public review drafts accompanying the GitHub source release. No Zenodo deposit, DOI, or conference submission has been completed.

This release package presents one project through three deliberately different channels. The three texts share the same verified evidence base, but they do not make the same contribution or reuse the same narrative.

| Package                         | Primary contribution                                                                       | Intended audience                                     | Archival status                                 |
| ------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------- | ----------------------------------------------- |
| `01-zenodo-preprint`            | Full system, methods, Phase I evidence, limitations, and research record                   | Researchers, admissions readers, future collaborators | Public preprint with DOI; not peer reviewed     |
| `02-openai-developer-community` | A candid development story about what Codex accelerated and what human judgment had to own | Developers building human-in-the-loop AI systems      | Public non-peer-reviewed community post         |
| `03-acm-iui-2027-demo`          | Explainable interface, reviewer control, abstention, and interactive demonstration         | HCI and intelligent-interface researchers             | Peer-reviewed companion proceedings if accepted |

The Zenodo folder also contains a complete Chinese translation review draft in Markdown and Word. It supports internal review and does not replace the canonical English publication manuscript.

## Recommended release order

1. Complete the author, rights, privacy, and patent checks in `00-release-control`.
2. Review all three texts for factual accuracy and genuine author voice.
3. Make the public repository and privacy-safe demo links stable.
4. Create a Zenodo draft and reserve a DOI, but do not publish yet.
5. Cite and disclose the preprint in the later IUI submission. The prepared chair inquiry is optional clarification; ACM permits unreviewed preprints.
6. Add the reserved DOI to the Zenodo PDF, rebuild it, and publish the author-approved record after the current asset and metadata checks.
7. Publish the OpenAI Developer Community post with links to the Zenodo record, demo video, and public repository.
8. Submit the ACM IUI 2027 Demo package by November 10, 2026, 11:59 p.m. Anywhere on Earth.

## Canonical evidence boundary

- The product workflow covers all seven FMS movements.
- Phase I quantitative study work focused on four movements.
- The corpus contains 28 unique source videos, 29 ingestion records, and 110 canonical repetitions.
- The formal review set contains 32 repetitions, eight per movement, selected deterministically from 21 source videos.
- Two reviewers completed two mutually blinded rounds. Round B did not expose AI scores or pose evidence.
- Final locked AI output was available for 28 of 32 formal items. Of 25 human-score-comparable items, exact agreement was 16/25, within-one agreement was 23/25, mean absolute error was 0.44, and linear weighted kappa was 0.4917.
- These are internal Phase I post-audit results, not held-out clinical validation.
- The system supports movement screening and human review. It does not diagnose injury, disease, pain, or impairment.

## Files that must not be made public

Do not upload raw participant videos, private pose files, reviewer event logs, free-text reviewer comments, the private SQLite database, authentication material, or any source whose publication rights have not been verified. Each channel package contains its own public-file checklist.

## Local media pointer

The approved English application film remains outside this tracked package:

`Ingested-data/application-video-production/08-exports/ai-fms-application-film-master-final.mp4`

Expected SHA-256:

`0951438d04a600ca281769dff065a24d98e67a8fed222497f9b6b93d30c00451`

The current 4:30 film is suitable as a general project overview and is within the ACM IUI five-minute limit. It is a content backup, not a submission-ready IUI master: the SIGCHI submission version should use a separate timestamped caption file rather than burned-in captions. The IUI package therefore proposes a more interface-focused clean-caption cut that foregrounds interaction rather than the admissions narrative.

Policy rechecked 3 October 2026: [ACM Policy on Authorship](https://www.acm.org/publications/policies/new-acm-policy-on-authorship) permits preprints on arXiv or similar venues without requesting an exception.
