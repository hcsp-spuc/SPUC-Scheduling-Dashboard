# Daily Playlist Refresh

Replaces the `videos` collection with the 10 latest completed streams from
`@hopechannelsouthphil` every day. No Firebase billing plan or service
account required — `firestore.rules` already allows open writes to
`videos`, so the script talks to Firestore over plain unauthenticated
REST, the same way the public display and Admin Dashboard do.

Runs two ways, sharing the same script:
- **GitHub Actions (recommended)** — runs on GitHub's servers at 8am
  Asia/Manila daily. Works even if no computer is on.
- **Manually / local testing** — run the script by hand anytime to check
  it works.

**Note:** this fully replaces the video list each run — any manually
added videos, live-stream entries, or custom ordering will be overwritten
by the latest 10 channel uploads.

## One-time setup

### 1. Get a free YouTube Data API key
- Go to [Google Cloud Console](https://console.cloud.google.com), select
  the project tied to `hcsp-scheduling-system` (or create/use any GCP
  project — the key just needs YouTube Data API v3 enabled).
- **APIs & Services → Library** → search "YouTube Data API v3" → **Enable**.
- **APIs & Services → Credentials → Create Credentials → API key** → copy it.
- Click "Restrict key" → limit it to YouTube Data API v3 (recommended, not required).

### 2. Local test (optional but recommended before wiring up GitHub)
- Copy `config.example.json` → `config.json` and paste your YouTube API
  key into it (already excluded via `.gitignore`).
- Run:
  ```
  cd scripts
  node refresh-playlist.js
  ```
  You should see `Replaced playlist with 10 videos: [...]`. Check the
  Admin Videos page to confirm.

## 3. Set up GitHub Actions (runs automatically, no computer needed)

Add one secret to the GitHub repo — encrypted by GitHub, never visible in
logs or to anyone without repo admin access:

1. Go to the repo on GitHub → **Settings → Secrets and variables →
   Actions → New repository secret**.
2. Add secret **`YOUTUBE_API_KEY`** — paste just the API key string from
   step 1.
3. That's it. The workflow at `.github/workflows/refresh-playlist.yml` is
   already in the repo and will run automatically every day at 8:00 AM
   Asia/Manila time.

### Test it without waiting for 8am
- Go to the repo on GitHub → **Actions** tab → **Daily Playlist Refresh**
  (left sidebar) → **Run workflow** button → **Run workflow**.
- Wait ~30 seconds, click into the run, and check the "Refresh playlist"
  step's log for `Replaced playlist with 10 videos`.
- Check the Admin Videos page to confirm.
