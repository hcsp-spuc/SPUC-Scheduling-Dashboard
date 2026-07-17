# Google Calendar → Firestore Background Sync

Runs every 5 minutes on Google's servers, even when the Admin Dashboard
is closed. Separate from the in-browser sync on the Admin Dashboard
(that one still works too, for on-demand syncing of any viewed month).

## Current live setup (completed July 2026)

- **Apps Script project:** `HCSP Calendar Sync`, owned by
  `hcspdashboard2026@spucadventist.org` (script.google.com → My Projects)
- **Code:** `CalendarSync.gs` in this folder (kept in sync manually —
  editing this file does NOT update the live script; paste changes into
  the Apps Script editor)
- **Trigger:** time-driven, every 5 minutes, function `syncCalendarToFirestore`
- **Calendar:** the shared SPUC events calendar
  (`c_588a151f...@group.calendar.google.com`), shared with the account above
- **Firestore access:** unauthenticated REST calls — `firestore.rules`
  allows open read/write on the `events` collection, so no IAM role or
  OAuth datastore scope is needed. (If those rules are ever tightened,
  this script will need an auth mechanism.)

## Behavior

- Syncs the **current month's** timed events (all-day events are skipped)
- Maps: event title → `programName`, description → `description`
  (HTML stripped), start/end → `time` string like `6:00 - 8:00 AM`
- Duplicate detection on (date, time, programName) — same rule as the
  in-browser sync, so running both never double-imports
- Logs `Synced. Imported N, skipped M` per run (Executions page)

## To recreate from scratch

1. As `hcspdashboard2026@spucadventist.org`, create a project at
   script.google.com (use an incognito window signed into ONLY that
   account — mixed multi-account sessions cause "cannot open file" errors)
2. Paste `CalendarSync.gs` into `Code.gs`
3. Project Settings (gear) → show `appsscript.json`, set:

   ```json
   {
     "timeZone": "Asia/Manila",
     "dependencies": {},
     "exceptionLogging": "STACKDRIVER",
     "runtimeVersion": "V8",
     "oauthScopes": [
       "https://www.googleapis.com/auth/calendar.readonly",
       "https://www.googleapis.com/auth/script.external_request"
     ]
   }
   ```

4. Make sure the calendar is shared with the account ("See all event details")
5. Run `syncCalendarToFirestore` once manually and approve the
   authorization prompt; confirm the log shows `Synced. Imported ...`
6. Triggers (clock icon) → Add Trigger → `syncCalendarToFirestore`,
   Time-driven, Minutes timer, Every 5 minutes → Save

## Notes

- Workspace admin setting for Apps Script lives at:
  Admin console → Apps → Google Workspace → Settings for Drive and Docs
  → Google Apps Script → Service status (was already ON)
- To stop background syncing, delete the trigger from the Triggers page.
