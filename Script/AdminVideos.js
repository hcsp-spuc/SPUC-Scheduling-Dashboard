import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDzSCJ8XellJRvOSBZ7cTCA2OcmFh8jSrs",
    authDomain: "spuc-events-web.firebaseapp.com",
    projectId: "spuc-events-web",
    storageBucket: "spuc-events-web.firebasestorage.app",
    messagingSenderId: "989356465487",
    appId: "1:989356465487:web:428b119629a939e725793a",
    measurementId: "G-QE1HPE63EH"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Extract YouTube video ID from URL
function extractYouTubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
}

// Get YouTube thumbnail
function getYouTubeThumbnail(videoId) {
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
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
    
    snapshot.forEach(doc => {
        const data = doc.data();
        const videoId = extractYouTubeId(data.url);
        const thumbnail = getYouTubeThumbnail(videoId);
        
        const card = document.createElement("div");
        card.className = "video-card";
        card.innerHTML = `
            <div class="video-thumbnail">
                <img src="${thumbnail}" alt="${data.title}">
                <div class="live-badge">${data.duration || "N/A"}</div>
            </div>
            <p class="video-title">${data.title}</p>
            <button class="btn-delete" data-id="${doc.id}">DELETE</button>
        `;
        
        card.querySelector(".btn-delete").addEventListener("click", () => deleteVideo(doc.id));
        videoGrid.appendChild(card);
    });
}

// Add video
async function addVideo() {
    const titleInput = document.querySelector(".form-input[placeholder='Youtube Video Title']");
    const urlInput = document.querySelector(".form-input[placeholder='Youtube Video URL Link']");
    const selectedDurationInput = document.getElementById("selectedDuration");
    
    const title = titleInput.value.trim();
    const url = urlInput.value.trim();
    const duration = selectedDurationInput.value.trim();
    
    if (!title || !url) {
        alert("Please fill in title and URL");
        return;
    }
    
    if (!duration) {
        alert("Please select a duration");
        return;
    }
    
    if (!extractYouTubeId(url)) {
        alert("Invalid YouTube URL");
        return;
    }
    
    try {
        await addDoc(collection(db, "videos"), {
            title,
            url,
            duration
        });
        
        titleInput.value = "";
        urlInput.value = "";
        selectedDurationInput.value = "";
        document.getElementById("durationBtn").textContent = "Select Duration";
        document.getElementById("customDurationInput").value = "";
        loadVideos();
    } catch (error) {
        console.error("Error adding video:", error);
        alert("Error adding video");
    }
}

// Delete video
async function deleteVideo(docId) {
    if (confirm("Delete this video?")) {
        try {
            await deleteDoc(doc(db, "videos", docId));
            loadVideos();
        } catch (error) {
            console.error("Error deleting video:", error);
        }
    }
}

// Validate duration format
function validateDurationFormat(str) {
    return /^\d+[smh]$/i.test(str);
}

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
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
                alert("Invalid format. Use: 30s, 2m, 1h");
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
    });
});
