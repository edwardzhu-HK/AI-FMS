# Four-Movement Pilot V1

This folder defines the reproducible private research snapshot for the AI-FMS
four-movement pilot.

Run:

```bash
npm run data:pilot:build
```

The command reads the local, ignored `Ingested-data/` exports and resolves their
video and pose references under `Eval_Videos/`. Generated private artifacts are
written to `research/pilot-v1/generated/` and remain ignored by Git:

- `canonical-pilot.json`
- `canonical-repetitions.csv`
- `asset-manifest.json`
- `qa-report.md`
- `SHA256SUMS`

The builder preserves legacy AI scores only as provenance. They are explicitly
marked as affected by label leakage and are not eligible for accuracy claims.

Build the blindability QA manifest after the canonical outputs exist:

```bash
npm run study:blindability:build
npm run study:blindability:previews
npm run data:pilot:features
npm run study:formal:freeze
npm run study:formal:previews
```

Manual QA decisions are source-controlled in `blindability-overrides.json`.
Generated manifests, candidate CSV files, reports, and preview contact sheets
remain private under `research/pilot-v1/generated/`.

The override file is fail-closed: unseen videos remain `pending`. Direct score
labels and scoring-guidance captions are tracked separately; either excludes a
clip from the formal blinded set, while a movement title alone is allowed.

`study:formal:freeze` applies the versioned Core-study selection policy, creates
an anonymized hard-link alias for each selected source video, writes the frozen
32-rep reviewer-safe manifest plus a private internal lineage manifest, and
records checksums for both. Study Mode reads the reviewer-safe manifest instead
of the complete 110-rep research pool.

`data:pilot:features` applies the versioned `feature-contract.json` to all 110
canonical reps. The builder strips score-bearing file names and absolute paths
before calling the existing movement adapters, writes JSON/CSV matrices, and
keeps limited rows with explicit quality reasons.

Open `/study.html?mode=dry-run` for the isolated four-case workflow check. Its
pilot ID, review events, media aliases, manifest, and checksum are separate from
the frozen formal study.

Formal Round A uses `/study.html?round=a`. Review events and browser storage are
isolated by `pilotId`, `studyRound`, and reviewer. Each V2 event records
foreground review duration plus an explicit `round_a`, `round_b`, or `dry_run`
identifier. The export builder reports complete versus partial status against
the frozen manifest. A rep is resolved by either a scored result or an explicit
unscorable result. Score 0 is reserved for observed or reported pain;
unscorable records require a protocol reason and are excluded from score
analysis.

Use the paired JSON and SHA-256 downloads for handoff. Validate a complete
formal export with:

```bash
npm run study:reviews:validate -- /absolute/path/to/review.json
```

Pass `--allow-partial` only for session backups. Reviewer instructions are in
`docs/research/round_a_reviewer_protocol.md`.

After validation, ingest a complete signed export into the ignored local
research database and inspect its latest-event summary:

```bash
npm run study:reviews:ingest -- /absolute/path/to/review.json
npm run study:reviews:db:status -- --pilot-id ai-fms-four-movement-core-2026-08-09 --round round_a --reviewer Ronnie
```

The default database is `Ingested-data/ai-fms-study-reviews.sqlite`. Import is
idempotent by export SHA-256 and rejects reused event IDs with different
content. The paired JSON/SHA-256 remains the frozen handoff artifact.

After both reviewer exports are complete, generate the private Round A
agreement package from the signed source files:

```bash
npm run study:reviews:agreement -- /absolute/path/to/reviewer-a.json /absolute/path/to/reviewer-b.json
```

Outputs are written to the ignored
`research/pilot-v1/generated/round-a-agreement/` directory. Scoreability
agreement is reported across all frozen reps; RAW SCORE agreement, weighted
Cohen's kappa, and the confusion matrix use only reps scored by both reviewers.
Unscorable outcomes remain nonnumeric and are analyzed separately.

Generate the Round A quantitative movement-profile package from the verified
agreement output and feature matrix:

```bash
npm run study:profiles:round-a
```

The command keeps only the 26 reps with identical blinded human RAW SCORE,
joins them by stable repetition ID, and writes feature tables, exploratory
score contrasts, same-score profile candidates, a Chinese report, and
checksums under the ignored `round-a-movement-profiles/` directory. Round B,
legacy AI scores, reviewer comments, and label-bearing source metadata are not
used.
