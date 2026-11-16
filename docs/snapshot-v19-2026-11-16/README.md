# PulseLift v19 — page snapshot (16 November 2026)

Captured from the app running locally (`server.py`, port 8765) in headless Chrome, before any work on the human-model update.

- Desktop: 1440 px wide. Phone: 390 × 844 at 2× density.
- Full-page captures for the four views; viewport captures for modals.
- `tools/snap.mjs` is the capture script. It blocks writes to `/api/backup`, so capturing does not touch workout data.

| # | View | Desktop | Phone |
|---|---|---|---|
| 01 | Tracker — Day A | `01-tracker-day-a--desktop.png` | `01-tracker-day-a--mobile.png` |
| 02 | Tracker — Day B | `02-tracker-day-b--desktop.png` | `02-tracker-day-b--mobile.png` |
| 03 | Tracker — history drawer open | `03-tracker-history-drawer--desktop.png` | `03-tracker-history-drawer--mobile.png` |
| 04 | Plan Builder & Coach | `04-planner--desktop.png` | `04-planner--mobile.png` |
| 05 | Exercise Library | `05-library--desktop.png`, `-part2`, `-part3` | `05-library--mobile.png` (first 14,000 px only) |
| 06 | History & Analysis | `06-history--desktop.png` | `06-history--mobile.png` |
| 07 | 360° Studio modal | `07-modal-3d-studio--desktop.png` | `07-modal-3d-studio--mobile.png` |
| 08 | Tutorial modal | `08-modal-tutorial--desktop.png` | `08-modal-tutorial--mobile.png` |
| 09 | Backfill modal | `09-modal-backfill--desktop.png` | `09-modal-backfill--mobile.png` |

## Notes

- The library page is 41,392 px tall on desktop, so it is split into three parts. On a phone it is 121,324 px tall; only the top is captured.
- The phone modal captures (07–09) show the modal mostly off-screen. This is how v19 lays out at 390 px in emulation: the page is 974 px wide, so modals centre on that width. It is recorded as a known problem in [REPORT.md](../REPORT.md).
- `source/` holds a copy of the v19 files. It is kept locally only, as is every screenshot that shows logged workout history; the GitHub branch carries a subset.
