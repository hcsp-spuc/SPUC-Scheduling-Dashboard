import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { showModal, showConfirm, initModal } from "/Script/modal.js";

const firebaseConfig = {

    apiKey: "AIzaSyB32ggdpwiNyZ0BKXeqwhVG7_Ei2qLF-Pw",
    authDomain: "hcsp-scheduling-system.firebaseapp.com",
    projectId: "hcsp-scheduling-system",
    storageBucket: "hcsp-scheduling-system.firebasestorage.app",
    messagingSenderId: "498610158944",
    appId: "1:498610158944:web:d4c6778a849016e12c7205",
    measurementId: "G-GFNQXDK1LE"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

// Extract YouTube video ID from URL (supports /live/ URLs too)
function extractYouTubeId(url) {
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|\/live\/)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
}

// Get YouTube thumbnail
function getYouTubeThumbnail(videoId) {
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

// Check if YouTube video is embeddable
async function isEmbeddable(videoId) {
    try {
        const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
        return res.ok;
    } catch {
        return false;
    }
}

// Save order of all video cards to Firestore
async function saveOrder() {
    const cards = document.querySelectorAll("#videoGrid .video-card");
    const updates = [];
    cards.forEach((card, index) => {
        updates.push(setDoc(doc(db, "videos", card.dataset.id), { order: index }, { merge: true }));
    });
    await Promise.all(updates);
}

// Drag-and-drop state
let dragSrc = null;

function onDragStart(e) {
    dragSrc = this;
    this.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
}

function onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const grid = document.getElementById("videoGrid");
    const target = e.target.closest(".video-card");
    if (target && target !== dragSrc) {
        const cards = [...grid.querySelectorAll(".video-card")];
        const srcIdx = cards.indexOf(dragSrc);
        const tgtIdx = cards.indexOf(target);
        if (srcIdx < tgtIdx) {
            grid.insertBefore(dragSrc, target.nextSibling);
        } else {
            grid.insertBefore(dragSrc, target);
        }
    }
}

function updateOrderBadges() {
    document.querySelectorAll("#videoGrid .video-card").forEach((card, i) => {
        card.querySelector(".play-order").textContent = i + 1;
    });
}

function onDragEnd() {
    this.classList.remove("dragging");
    updateOrderBadges();
    saveOrder();
}

// Load and display videos
async function loadVideos() {
    const videoGrid = document.getElementById("videoGrid");
    videoGrid.innerHTML = "";
    
    const snapshot = await getDocs(collection(db, "videos"));
    
    if (snapshot.empty) {
        videoGrid.innerHTML = "<p style='grid-column: 1/-1; text-align: center; color: #999;'>No videos added yet</p>";
        return;
    }
    
    const cards = [];
    snapshot.forEach(docSnap => cards.push({ id: docSnap.id, data: docSnap.data() }));
    cards.sort((a, b) => (a.data.order ?? Infinity) - (b.data.order ?? Infinity));

    const cardEls = new Array(cards.length);
    await Promise.all(cards.map(async ({ id, data }, index) => {
        const videoId = extractYouTubeId(data.url);
        const thumbnail = videoId ? getYouTubeThumbnail(videoId) : '';
        const embeddable = videoId ? await isEmbeddable(videoId) : false;
        
        const card = document.createElement("div");
        card.className = "video-card";
        card.dataset.id = id;
        card.draggable = true;
        card.innerHTML = `
            <div class="drag-handle" title="Drag to reorder"><span class="play-order">${index + 1}</span> ⠿</div>
            <div class="video-thumbnail">
                ${thumbnail ? `<img src="${thumbnail}" alt="${data.title}">` : `<div class="thumbnail-placeholder">LIVE</div>`}
                <div class="live-badge">${data.isLive ? '🔴 LIVE' : (data.duration || 'N/A')}</div>
                ${!data.isLive ? `<div class="embed-badge ${embeddable ? 'embeddable' : 'not-embeddable'}">${embeddable ? '✔ Embeddable' : '✘ Not Embeddable'}</div>` : ''}
            </div>
            <p class="video-title">${data.title}</p>
            <button class="btn-delete" data-id="${id}">DELETE</button>
        `;
        
        card.querySelector(".btn-delete").addEventListener("click", () => deleteVideo(id));
        card.addEventListener("dragstart", onDragStart);
        card.addEventListener("dragover", onDragOver);
        card.addEventListener("dragend", onDragEnd);
        cardEls[index] = card;
    }));
    cardEls.forEach(card => videoGrid.appendChild(card));
}

// Add video
async function addVideo() {
    const titleInput = document.querySelector(".form-input[placeholder='Youtube Video Title']");
    const urlInput = document.querySelector(".form-input[placeholder='Youtube Video URL Link']");
    const selectedDurationInput = document.getElementById("selectedDuration");
    
    const title = titleInput.value.trim();
    const url = urlInput.value.trim();
    const duration = selectedDurationInput.value.trim();
    
    const isLive = document.getElementById("isLiveCheckbox").checked;

    if (!title || !url) {
        showModal("Please fill in title and URL", 'error');
        return;
    }
    
    if (!isLive && !duration) {
        showModal("Please select a duration", 'error');
        return;
    }
    
    if (!extractYouTubeId(url)) {
        showModal("Invalid YouTube URL", 'error');
        return;
    }
    
    try {
        const snapshot = await getDocs(collection(db, "videos"));
        let maxNumber = 0;
        
        snapshot.forEach(doc => {
            const match = doc.id.match(/video(\d+)/);
            if (match) {
                const num = parseInt(match[1]);
                if (num > maxNumber) maxNumber = num;
            }
        });
        
        const nextNumber = maxNumber + 1;
        const docId = `video${nextNumber}`;
        
        const videoData = { title, url };
        if (isLive) {
            videoData.isLive = true;
        } else {
            videoData.duration = duration;
        }

        let maxOrder = -1;
        snapshot.forEach(d => { const o = d.data().order; if (typeof o === 'number' && o > maxOrder) maxOrder = o; });
        videoData.order = maxOrder + 1;

        await setDoc(doc(db, "videos", docId), videoData);
        
        titleInput.value = "";
        urlInput.value = "";
        selectedDurationInput.value = "";
        document.getElementById("durationBtn").textContent = "Select Duration";
        document.getElementById("customDurationInput").value = "";
        document.getElementById("isLiveCheckbox").checked = false;
        loadVideos();
    } catch (error) {
        console.error("Error adding video:", error);
        showModal("Error adding video", 'error');
    }
}

// Delete video
async function deleteVideo(docId) {
    showConfirm("Delete this video?", async () => {
        try {
            await deleteDoc(doc(db, "videos", docId));
            loadVideos();
        } catch (error) {
            console.error("Error deleting video:", error);
            showModal("Error deleting video", 'error');
        }
    });
}

// Validate duration format
function validateDurationFormat(str) {
    return /^\d+[smh]$/i.test(str);
}

// Event listeners
initModal();
loadVideos();

const durationBtn = document.getElementById("durationBtn");
const durationMenu = document.getElementById("durationMenu");
const durationWrapper = document.querySelector(".duration-dropdown-wrapper");
const selectedDurationInput = document.getElementById("selectedDuration");
const customDurationInput = document.getElementById("customDurationInput");
const applyCustomDurationBtn = document.getElementById("applyCustomDuration");
const durationOptions = document.querySelectorAll(".duration-option");

durationBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    durationWrapper.classList.toggle("active");
});

document.addEventListener("click", (e) => {
    if (!durationWrapper.contains(e.target)) {
        durationWrapper.classList.remove("active");
    }
});

durationOptions.forEach(option => {
    option.addEventListener("click", () => {
        const value = option.getAttribute("data-value");
        selectedDurationInput.value = value;
        durationBtn.textContent = option.textContent;
        durationWrapper.classList.remove("active");
        customDurationInput.value = "";
    });
});

applyCustomDurationBtn.addEventListener("click", () => {
    const customValue = customDurationInput.value.trim();
    if (customValue) {
        if (validateDurationFormat(customValue)) {
            selectedDurationInput.value = customValue;
            durationBtn.textContent = `Custom: ${customValue}`;
            durationWrapper.classList.remove("active");
            customDurationInput.value = "";
        } else {
            showModal("Invalid format. Use: 30s, 2m, 1h", 'error');
        }
    }
});

customDurationInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") applyCustomDurationBtn.click();
});

document.getElementById("isLiveCheckbox").addEventListener("change", (e) => {
    document.getElementById("durationGroup").style.display = e.target.checked ? "none" : "";
});

document.querySelector(".btn-add").addEventListener("click", addVideo);
document.querySelector(".btn-cancel").addEventListener("click", () => {
    document.querySelector(".form-input[placeholder='Youtube Video Title']").value = "";
    document.querySelector(".form-input[placeholder='Youtube Video URL Link']").value = "";
    selectedDurationInput.value = "";
    durationBtn.textContent = "Select Duration";
    customDurationInput.value = "";
    document.getElementById("isLiveCheckbox").checked = false;
    document.getElementById("durationGroup").style.display = "";
});
