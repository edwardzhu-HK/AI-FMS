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

Formal Round B used `/study.html?round=b` after an approximately 51-hour interval.
It was a second blind review with a separately randomized queue. Study Mode
shows video and the human scoring form only; it does not request or display AI
scores, pose-derived features, Round A answers, or the other reviewer result.

Freeze the private post-review AI benchmark before starting:

```bash
npm run study:evidence:round-b
```

The package contains quantitative features for all 32 formal reps and a frozen
AI v1.0 RAW SCORE for 18. It remains hidden from both reviewers and is loaded
only after the signed Round B exports are complete. Eight Rotary Stability reps
remain feature-only and six protocol-limited Deep Squat reps have no total
score. Instructions are in
`docs/research/round_b_reviewer_protocol_2026-08-10.md`.

Use the paired JSON and SHA-256 downloads for handoff. Validate a complete
formal export with:

```bash
npm run study:reviews:validate -- /absolute/path/to/review.json
```

Pass `--allow-partial` only for session backups. Round A and Round B reviewer
instructions are in `docs/research/round_a_reviewer_protocol.md` and
`docs/research/round_b_reviewer_protocol_2026-08-10.md`.

After validation, ingest a complete signed export into the ignored local
research database and inspect its latest-event summary:

```bash
npm run study:reviews:ingest -- /absolute/path/to/review.json
npm run study:reviews:db:status -- --pilot-id ai-fms-four-movement-core-2026-08-09 --round round_a --reviewer Ronnie
```

The default database is `Ingested-data/ai-fms-study-reviews.sqlite`. Import is
idempotent by export SHA-256 and rejects reused event IDs with different
content. Formal Round B events must have no `evidenceReview` row and must record
blind exposure flags. The complete event remains in `raw_event_json`; the
paired JSON/SHA-256 remains the frozen handoff artifact.

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

After both complete Round B exports are validated and ingested, run the frozen
four-export closeout analysis in this order: Round A reviewer 1, Round A
reviewer 2, Round B reviewer 1, Round B reviewer 2.

```bash
npm run study:closeout:round-b -- \
  /absolute/path/to/round-a-reviewer-1.json \
  /absolute/path/to/round-a-reviewer-2.json \
  /absolute/path/to/round-b-reviewer-1.json \
  /absolute/path/to/round-b-reviewer-2.json
```

The command verifies each JSON/SHA-256 pair, verifies that Round B remained
blind, and then loads the separately frozen AI v1.0 and final v1.1 packages. It
generates Round B agreement, per-reviewer A/B changes, and both AI comparisons
against Round A and Round B consensus. AI-human concordance is exploratory
rather than an independent held-out validation.

The two Round A exports predate the explicit `reviewMode`,
`currentPoseEvidenceShown`, and `currentAiSuggestionShown` fields. The validator
does not rewrite those exports. It applies `round-a-legacy-blind-attestation.json`
only when the source SHA-256 and the older blind flags match the registered
contract; any unknown legacy export fails closed.

Audit historical labels against the stable blind consensus without changing
canonical provenance:

```bash
npm run study:labels:audit
```

The audit identifies only exact, stable Round A/B matches as `audited weak
labels`. It does not promote the rest of the 110-rep history to gold labels.

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

Preserve and analyze the complete 110-rep pool without treating every historic
label as gold evidence:

```bash
npm run data:pilot:utilization
npm run data:pilot:db:ingest
npm run data:pilot:db:status
```

The utilization package keeps all canonical reps in explicit research tiers,
reports label-free quantitative summaries for all 66 feature-ready rows, and
tracks the 32 formal / 26 gold-consensus subset without discarding the other
evidence. The database import mirrors all 110 repetitions and all 110 feature
rows idempotently; canonical JSON/CSV and checksums remain the source of truth.

Discover action-specific quantitative structure across all 66 feature-ready
reps without using historical or Round A scores during grouping:

```bash
npm run data:pilot:profiles:label-free
```

The command writes deterministic profile assignments, source-video and
leave-one-video-out diagnostics, four robust-z heatmaps, outlier candidates,
and checksums under the ignored `label-free-profiles/` directory. It overlays
the 26 Round A consensus rows only after the label-free groups are frozen and
produces a video/time-coded review queue. The groups are exploratory data
descriptions, not validated impairment or diagnostic classes.

Compare leakage-controlled AI suggestions with the frozen Round A consensus,
then rebuild the nine-item visual audit and post-audit protocol sensitivity:

```bash
npm run study:ai-evidence:round-a
npm run study:ai-evidence:audit-previews
```

The baseline comparison is preserved. Source-controlled decisions in
`round-a-targeted-ai-audit.json` may supply non-score protocol metadata only to
a separately labeled post-audit sensitivity layer. Reviewer scores are not
used to tune ASLR or Hurdle thresholds. Private five-frame previews and all
analysis outputs remain under the ignored `generated/` directory.
