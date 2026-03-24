import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { showModal, showConfirm, initModal } from "/Script/modal.js";

const firebaseConfig = {
    apiKey: "AIzaSyB32ggdpwiNyZ0BKXeqwhVG7_Ei2qLF-Pw",
    authDomain: "hcsp-scheduling-system.firebaseapp.com",
    projectId: "hcsp-scheduling-system",
    storageBucket: "hcsp-scheduling-system.firebasestorage.app",
    messagingSenderId: "498610158944",
    appId: "1:498610158944:web:d4c6778a849016e12c7205"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

initModal();

const CLOUDINARY_CLOUD_NAME = "dssub5asx";
const CLOUDINARY_UPLOAD_PRESET = "scheduling_images";

async function uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: formData
    });

    if (!res.ok) throw new Error("Cloudinary upload failed");
    const data = await res.json();
    return { url: data.secure_url, publicId: data.public_id };
}

async function loadImages() {
    const grid = document.getElementById("imageGrid");
    grid.innerHTML = "";
    const snapshot = await getDocs(collection(db, "images"));
    snapshot.forEach(docSnap => {
        const { url, publicId } = docSnap.data();
        const card = document.createElement("div");
        card.className = "image-card";
        card.innerHTML = `
            <img src="${url}" alt="Display Image">
            <div class="image-actions">
                <button class="btn-delete" data-id="${docSnap.id}" data-public-id="${publicId}">DELETE</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

document.getElementById("btnAdd").addEventListener("click", async () => {
    const fileInput = document.getElementById("imageFileInput");
    const file = fileInput.files[0];
    if (!file) return showModal("Please select an image file.", 'error');

    const btnAdd = document.getElementById("btnAdd");
    btnAdd.disabled = true;
    btnAdd.textContent = "UPLOADING...";

    try {
        const { url, publicId } = await uploadToCloudinary(file);
        await addDoc(collection(db, "images"), { url, publicId });
        fileInput.value = "";
        await loadImages();
    } catch (err) {
        showModal("Upload failed: " + err.message, 'error');
    } finally {
        btnAdd.disabled = false;
        btnAdd.textContent = "ADD IMAGE";
    }
});

document.getElementById("btnCancel").addEventListener("click", () => {
    document.getElementById("imageFileInput").value = "";
});

document.getElementById("imageGrid").addEventListener("click", async (e) => {
    if (!e.target.classList.contains("btn-delete")) return;
    showConfirm("Delete this image?", async () => {
        const docId = e.target.dataset.id;
        await deleteDoc(doc(db, "images", docId));
        await loadImages();
    });
});

loadImages();
