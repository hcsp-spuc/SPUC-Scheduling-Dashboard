import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
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

const app = initializeApp(firebaseConfig);
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
    snapshot.forEach(doc => cards.push({ id: doc.id, data: doc.data() }));

    await Promise.all(cards.map(async ({ id, data }) => {
        const videoId = extractYouTubeId(data.url);
        const thumbnail = videoId ? getYouTubeThumbnail(videoId) : '';
        const embeddable = videoId ? await isEmbeddable(videoId) : false;
        
        const card = document.createElement("div");
        card.className = "video-card";
        card.innerHTML = `
            <div class="video-thumbnail">
                ${thumbnail ? `<img src="${thumbnail}" alt="${data.title}">` : `<div class="thumbnail-placeholder">LIVE</div>`}
                <div class="live-badge">${data.isLive ? '🔴 LIVE' : (data.duration || 'N/A')}</div>
                ${!data.isLive ? `<div class="embed-badge ${embeddable ? 'embeddable' : 'not-embeddable'}">${embeddable ? '✔ Embeddable' : '✘ Not Embeddable'}</div>` : ''}
            </div>
            <p class="video-title">${data.title}</p>
            <button class="btn-delete" data-id="${id}">DELETE</button>
        `;
        
        card.querySelector(".btn-delete").addEventListener("click", () => deleteVideo(id));
        videoGrid.appendChild(card);
    }));
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
    
    if (!duration) {
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
        
        const videoData = { title, url, duration };
        if (isLive) videoData.isLive = true;

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
document.addEventListener("DOMContentLoaded", () => {
    initModal();
    loadVideos();
    
    // Duration dropdown functionality
    const durationBtn = document.getElementById("durationBtn");
    const durationMenu = document.getElementById("durationMenu");
    const durationWrapper = document.querySelector(".duration-dropdown-wrapper");
    const selectedDurationInput = document.getElementById("selectedDuration");
    const customDurationInput = document.getElementById("customDurationInput");
    const applyCustomDurationBtn = document.getElementById("applyCustomDuration");
    const durationOptions = document.querySelectorAll(".duration-option");
    
    // Toggle dropdown
    durationBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        durationWrapper.classList.toggle("active");
    });
    
    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
        if (!durationWrapper.contains(e.target)) {
            durationWrapper.classList.remove("active");
        }
    });
    
    // Handle preset duration options
    durationOptions.forEach(option => {
        option.addEventListener("click", () => {
            const value = option.getAttribute("data-value");
            selectedDurationInput.value = value;
            durationBtn.textContent = option.textContent;
            durationWrapper.classList.remove("active");
            customDurationInput.value = "";
        });
    });
    
    // Handle custom duration
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
    
    // Allow Enter key to apply custom duration
    customDurationInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            applyCustomDurationBtn.click();
        }
    });
    
    document.querySelector(".btn-add").addEventListener("click", addVideo);
    document.querySelector(".btn-cancel").addEventListener("click", () => {
        document.querySelector(".form-input[placeholder='Youtube Video Title']").value = "";
        document.querySelector(".form-input[placeholder='Youtube Video URL Link']").value = "";
        selectedDurationInput.value = "";
        durationBtn.textContent = "Select Duration";
        customDurationInput.value = "";
        document.getElementById("isLiveCheckbox").checked = false;
    });
});
