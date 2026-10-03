# Public Demo and Repository Release Checklist

The Zenodo, OpenAI Community, and ACM IUI packages all benefit from stable public links. Complete this checklist before inserting URLs.

## Repository

- [ ] Optional later step: transfer ownership to Haoran Zhu's GitHub account; not a prerequisite for public access.
- [ ] Choose the public branch and tag a release.
- [x] Inspect Git history and scan 1,423 file versions for common credential patterns; no matches found. Four withdrawn media blobs are removed from the public history.
- [ ] Remove raw videos, private databases, reviewer exports, source manifests, local paths, and authentication files.
- [ ] Confirm third-party licenses for all dependencies and copied assets.
- [x] Update README with seven-movement scope, local setup, screenshots, limitations, draft-paper links, and public/private asset boundaries.
- [ ] Add `LICENSE`, `CITATION.cff`, and a release tag.
- [ ] Confirm that a new user can run the privacy-safe demo from the public instructions.

## Demo

- [ ] Use only permission-cleared media recorded for public demonstration.
- [ ] Replace the research database with a sanitized demo dataset.
- [ ] Hide source filenames, local paths, identities, and notes.
- [ ] Test in a clean browser profile and on a second computer.
- [ ] Provide a static fallback or prerecorded demo.
- [ ] Add a visible non-diagnostic disclaimer.
- [ ] Record the deployed commit, URL, date, and checksum of downloadable assets.

## Release URLs

- Public repository: https://github.com/edwardzhu-HK/AI-FMS
- Public demo: [ADD]
- Zenodo DOI: [ADD]
- Application film: [ADD OR OMIT]
- ACM IUI submission/project page: [ADD LATER]

Public access verified on 3 October 2026. Public checkout validation: 327 passed, 14 private-data tests skipped; private research checkout: 341 passed. Code licensing remains separate from the confirmed CC BY 4.0 preprint license.
