# V1 Wireframes: Calibration UI

## 1. Desktop Wireframe (`/calibration`)

```text
+--------------------------------------------------------------------------------------+
| Header: FMS Calibration (7 Actions)                                 User: reviewer_a |
+--------------------------------------------------------------------------------------+
| Left: Input & Job         | Center: Player + Segments             | Right: Scoring  |
|---------------------------|----------------------------------------|-----------------|
| Action: [Action v]        | +------------------------------------+ | AI Suggestion   |
| Upload: [Choose File]     | |            Video Player            | | total: [3]     |
| Start: [ 0.0 ] sec        | | Loop [x]  Keypoints [ ]           | | criteria...    |
| End:   [60.0 ] sec        | +------------------------------------+ |-----------------|
| Expected Reps: [ 7 ]      | Segment: #3 | view: side | 5.2-7.9s  | Reviewer A       |
| Notes: [ ... ]            | [Prev] [Next]                        | total: [ ]       |
| [Start Analysis]          | Segment Timeline/List                 | comment...       |
| Job: processing 62%       | [#1 front done]                       | [Save A]         |
|---------------------------| [#2 side done]                        |-----------------|
| Ingest Readiness          | [#3 side editing]                     | Reviewer B       |
| Completed 3/6             | [#4 front pending]                    | total: [ ]       |
| Ready: No                 | [#5 side pending]                     | comment...       |
| [Check Readiness] [Ingest]| [#6 front pending]                    | [Save B]         |
|---------------------------|----------------------------------------|-----------------|
| Consistency Snapshot      |                                        | Adjudication     |
| AI matches final: 83.3%   |                                        | status: partial  |
+--------------------------------------------------------------------------------------+
```

## 2. Mobile Wireframe (`/calibration`)

```text
+--------------------------------------+
| FMS Calibration                       |
| Action [Action v]                     |
| Upload [Choose File]                  |
| Start [0.0] End [60.0]                |
| Expected Reps [7]                     |
| Notes [ ... ]                         |
| [Start Analysis] Job: 62%             |
|--------------------------------------|
| Player (Loop / Keypoints)             |
| Segment #3 side 5.2-7.9               |
| [Prev] [Next]                         |
|--------------------------------------|
| AI Suggestion total [3]               |
| Reviewer A total/comment              |
| Reviewer B total/comment              |
|--------------------------------------|
| Ingest Readiness + Consistency        |
| [Check Readiness] [Ingest]            |
+--------------------------------------+
```

## 3. Component Mapping

- `CalibrationPage`
- `UploadPanel`
- `AnalysisJobCard`
- `SegmentPlayer`
- `KeypointOverlay`
- `SegmentList`
- `ScoreSummary`
- `ReviewerScoreForm`
- `ReadinessCard`
- `ConsistencyCard`

## 4. Definition of Wireframe Done

- 包含桌面与移动布局。
- 覆盖上传、分析、评分、入库全链路。
- 每个 UI 块可映射到明确组件。
