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

  const existing = fetchAllEvents();

  let maxNum = 0;
  existing.forEach(e => {
    const match = e.id.match(/^event(\d+)$/);
    if (match) maxNum = Math.max(maxNum, parseInt(match[1]));
  });

  let imported = 0;
  let skipped = 0;

  events.forEach(event => {
    const dateStr = event.getStartTime().toDateString();
    const time = formatTimeRange(event.getStartTime(), event.getEndTime());
    const programName = (event.getTitle() || 'Untitled').trim();
    const description = (event.getDescription() || '').replace(/<[^>]*>/g, '').trim();

    const isDup = existing.some(e => e.date === dateStr && e.time === time && e.programName === programName);
    if (isDup) { skipped++; return; }

    maxNum++;
    const docId = 'event' + maxNum;
    const body = {
      fields: {
        date: { stringValue: dateStr },
        time: { stringValue: time },
        programName: { stringValue: programName },
        description: { stringValue: description },
        status: { stringValue: 'Upcoming' },
        createdAt: { timestampValue: new Date().toISOString() },
        source: { stringValue: 'google_calendar' }
      }
    };
    const resp = UrlFetchApp.fetch(`${FIRESTORE_BASE}/events/${docId}`, {
      method: 'patch',
      contentType: 'application/json',
      payload: JSON.stringify(body),
      muteHttpExceptions: true
    });
    if (resp.getResponseCode() < 300) {
      imported++;
      existing.push({ id: docId, date: dateStr, time, programName });
    } else {
      Logger.log('Failed to write ' + docId + ': ' + resp.getContentText());
    }
  });

  Logger.log(`Synced. Imported ${imported}, skipped ${skipped}`);
}

function fetchAllEvents() {
  const results = [];
  let pageToken = null;
  do {
    let url = `${FIRESTORE_BASE}/events?pageSize=300`;
    if (pageToken) url += '&pageToken=' + encodeURIComponent(pageToken);
    const resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const data = JSON.parse(resp.getContentText());
    (data.documents || []).forEach(doc => {
      const f = doc.fields || {};
      const id = doc.name.split('/').pop();
      results.push({
        id,
        date: f.date ? f.date.stringValue : '',
        time: f.time ? f.time.stringValue : '',
        programName: f.programName ? f.programName.stringValue : ''
      });
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
