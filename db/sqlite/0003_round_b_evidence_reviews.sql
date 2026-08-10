create table if not exists study_review_evidence_reviews (
  event_id text primary key,
  manifest_fingerprint text not null,
  item_fingerprint text not null,
  evidence_status text not null,
  ai_suggestion_shown integer not null check (ai_suggestion_shown in (0, 1)),
  usefulness text check (
    usefulness is null or usefulness in ('helpful', 'no_change', 'insufficient')
  ),
  foreign key (event_id) references study_review_events(event_id)
);

create index if not exists idx_study_review_evidence_status
  on study_review_evidence_reviews(evidence_status, usefulness);
