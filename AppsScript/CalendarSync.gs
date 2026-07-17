// Google Apps Script — syncs the SPUC Google Calendar into Firestore
// on a time-driven trigger, independent of the Admin Dashboard being open.
//
// SETUP: see AppsScript/README.md in this folder for full instructions.

const FIREBASE_PROJECT_ID = 'hcsp-scheduling-system';
const CALENDAR_ID = 'c_588a151fc082a26f878c3e2c51ad6c166e9633634d1e7130f39ab918174e1ee5@group.calendar.google.com';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

function syncCalendarToFirestore() {
  // No Authorization header is sent — Firestore evaluates this against
  // firestore.rules (which allow open read/write on `events`), the same
  // unauthenticated path the public web app and Admin Dashboard use.
  // This avoids needing any Google Cloud IAM role on the calling account.

  const now = new Date();

  // Quiet hours: skip syncing from 8PM to 8AM (Asia/Manila, per manifest
  // timeZone) to save Firestore reads while nobody updates the calendar.
  const hour = now.getHours();
  if (hour >= 20 || hour < 8) {
    Logger.log('Quiet hours (8PM-8AM) — sync skipped.');
    return;
  }
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const calendar = CalendarApp.getCalendarById(CALENDAR_ID);
  if (!calendar) {
    Logger.log('Calendar not found or not accessible: ' + CALENDAR_ID);
    return;
  }
  const events = calendar.getEvents(start, end);

  const existingIds = fetchAllEventIds();

  let imported = 0;
  let skipped = 0;

  // Each Firestore doc ID is derived from the Google Calendar event's own
  // unique ID, so re-syncing the same event always overwrites the same
  // document instead of racing with the in-browser sync to create a new
  // one. updateMask limits updates to the synced fields, leaving admin-set
  // fields like `status` untouched on repeat syncs.
  events.forEach(event => {
    const dateStr = event.getStartTime().toDateString();
    const time = formatTimeRange(event.getStartTime(), event.getEndTime());
    const programName = (event.getTitle() || 'Untitled').trim();
    const description = (event.getDescription() || '').replace(/<[^>]*>/g, '').trim();
    const docId = ('gcal_' + event.getId()).replace(/\//g, '_');
    const alreadyExists = existingIds.indexOf(docId) !== -1;

    const fields = {
      date: { stringValue: dateStr },
      time: { stringValue: time },
      programName: { stringValue: programName },
      description: { stringValue: description },
      source: { stringValue: 'google_calendar' }
    };

    let url = `${FIRESTORE_BASE}/events/${docId}`;
    if (alreadyExists) {
      url += '?' + ['date', 'time', 'programName', 'description', 'source']
        .map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
    } else {
      fields.status = { stringValue: 'Upcoming' };
      fields.createdAt = { timestampValue: new Date().toISOString() };
    }

    const resp = UrlFetchApp.fetch(url, {
      method: 'patch',
      contentType: 'application/json',
      payload: JSON.stringify({ fields }),
      muteHttpExceptions: true
    });
    if (resp.getResponseCode() < 300) {
      if (alreadyExists) skipped++; else imported++;
    } else {
      Logger.log('Failed to write ' + docId + ': ' + resp.getContentText());
    }
  });

  Logger.log(`Synced. Imported ${imported}, skipped ${skipped}`);
}

function fetchAllEventIds() {
  const results = [];
  let pageToken = null;
  do {
    let url = `${FIRESTORE_BASE}/events?pageSize=300`;
    if (pageToken) url += '&pageToken=' + encodeURIComponent(pageToken);
    const resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const data = JSON.parse(resp.getContentText());
    (data.documents || []).forEach(doc => {
      results.push(doc.name.split('/').pop());
    });
    pageToken = data.nextPageToken || null;
  } while (pageToken);
  return results;
}

function formatTimeRange(startDate, endDate) {
  const endAmPm = endDate.getHours() >= 12 ? 'PM' : 'AM';
  const fmt = (d) => {
    const h = d.getHours() % 12 || 12;
    const m = ('0' + d.getMinutes()).slice(-2);
    return `${h}:${m}`;
  };
  return `${fmt(startDate)} - ${fmt(endDate)} ${endAmPm}`;
}
