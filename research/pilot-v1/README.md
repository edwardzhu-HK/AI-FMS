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
