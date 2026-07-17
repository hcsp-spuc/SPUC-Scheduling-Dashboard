// Pulls the 10 latest completed streams from @hopechannelsouthphil and
// replaces the `videos` collection in Firestore with them. Meant to run
// daily via GitHub Actions — see scripts/README.md for setup.
//
// Unlike a typical Admin SDK script, this uses plain unauthenticated
// Firestore REST calls: firestore.rules already allows open read/write
// on `videos`, so no service-account key is needed — only a YouTube
// Data API key.

const fs = require('fs');
const path = require('path');

const FIREBASE_PROJECT_ID = 'hcsp-scheduling-system';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;
const CHANNEL_HANDLE = '@hopechannelsouthphil';
const MAX_VIDEOS = 10;

function loadApiKey() {
    if (process.env.YOUTUBE_API_KEY) return process.env.YOUTUBE_API_KEY;
    const configPath = path.join(__dirname, 'config.json');
    if (!fs.existsSync(configPath)) {
        console.error('Missing YOUTUBE_API_KEY env var and no config.json found. Copy config.example.json to config.json and paste your key in, or set YOUTUBE_API_KEY.');
        process.exit(1);
    }
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (!config.youtubeApiKey) {
        console.error('config.json is missing "youtubeApiKey".');
        process.exit(1);
    }
    return config.youtubeApiKey;
}

async function fetchLatestVideos(apiKey) {
    const chRes = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${encodeURIComponent(CHANNEL_HANDLE)}&key=${apiKey}`
    );
    const chData = await chRes.json();
    if (chData.error) throw new Error('YouTube API error (channels): ' + JSON.stringify(chData.error));
    const channelId = chData.items && chData.items[0] && chData.items[0].id;
    if (!channelId) throw new Error('Could not resolve channel handle: ' + CHANNEL_HANDLE);

    const searchRes = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&eventType=completed&type=video&order=date&maxResults=${MAX_VIDEOS}&key=${apiKey}`
    );
    const searchData = await searchRes.json();
    if (searchData.error) throw new Error('YouTube API error (search): ' + JSON.stringify(searchData.error));

    return (searchData.items || [])
        .filter(item => item.id && item.id.videoId)
        .map(item => ({
            videoId: item.id.videoId,
            title: item.snippet && item.snippet.title ? item.snippet.title : 'Untitled'
        }));
}

async function fetchExistingVideoIds() {
    const res = await fetch(`${FIRESTORE_BASE}/videos?pageSize=300`, { });
    const data = await res.json();
    return (data.documents || []).map(doc => doc.name.split('/').pop());
}

async function deleteVideo(docId) {
    const res = await fetch(`${FIRESTORE_BASE}/videos/${docId}`, { method: 'DELETE' });
    if (!res.ok) {
        const text = await res.text();
        console.warn(`Failed to delete ${docId}: ${text}`);
    }
}

async function writeVideo(docId, video, order) {
    const body = {
        fields: {
            title: { stringValue: video.title },
            url: { stringValue: `https://www.youtube.com/watch?v=${video.videoId}` },
            duration: { stringValue: 'original' },
            order: { integerValue: String(order) },
            source: { stringValue: 'youtube_auto' }
        }
    };
    const res = await fetch(`${FIRESTORE_BASE}/videos/${docId}`, {
        method: 'patch',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to write ${docId}: ${text}`);
    }
}

async function main() {
    const startedAt = new Date().toISOString();
    try {
        const apiKey = loadApiKey();
        const videos = await fetchLatestVideos(apiKey);

        if (!videos.length) {
            console.warn(`[${startedAt}] No videos found for ${CHANNEL_HANDLE}. Playlist left unchanged.`);
            return;
        }

        const existingIds = await fetchExistingVideoIds();
        await Promise.all(existingIds.map(deleteVideo));

        await Promise.all(videos.map((video, i) => writeVideo(`video${i + 1}`, video, i)));

        console.log(`[${startedAt}] Replaced playlist with ${videos.length} videos:`, videos.map(v => v.videoId));
    } catch (err) {
        console.error(`[${startedAt}] Refresh failed:`, err.message);
        process.exitCode = 1;
    }
}

main();
