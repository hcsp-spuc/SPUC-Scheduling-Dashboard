import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
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

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

initModal();

// Tab toggle
let activeTab = 'upload';
document.getElementById('tabUpload').addEventListener('click', () => {
    activeTab = 'upload';
    document.getElementById('tabUpload').classList.add('active');
    document.getElementById('tabLink').classList.remove('active');
    document.getElementById('panelUpload').style.display = '';
    document.getElementById('panelLink').style.display = 'none';
});
document.getElementById('tabLink').addEventListener('click', () => {
    activeTab = 'link';
    document.getElementById('tabLink').classList.add('active');
    document.getElementById('tabUpload').classList.remove('active');
    document.getElementById('panelLink').style.display = '';
    document.getElementById('panelUpload').style.display = 'none';
});

function convertGoogleDriveUrl(url) {
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
    return url;
}

const IMGBB_API_KEY = "YOUR_IMGBB_API_KEY";

async function uploadToImgBB(file) {
    const formData = new FormData();
    formData.append("image", file);

    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: "POST",
        body: formData
    });

    if (!res.ok) throw new Error("ImgBB upload failed");
    const data = await res.json();
    return { url: data.data.url, publicId: data.data.id };
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

document.getElementById('btnAdd').addEventListener('click', async () => {
    const btnAdd = document.getElementById('btnAdd');

    if (activeTab === 'link') {
        const raw = document.getElementById('imageLinkInput').value.trim();
        if (!raw) return showModal('Please paste at least one image URL.', 'error');

        const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        let added = 0;
        for (const line of lines) {
            const url = convertGoogleDriveUrl(line);
            await addDoc(collection(db, 'images'), { url, publicId: '' });
            added++;
        }
        document.getElementById('imageLinkInput').value = '';
        await loadImages();
        showModal(`${added} image(s) added successfully!`);
        return;
    }

    const fileInput = document.getElementById('imageFileInput');
    const file = fileInput.files[0];
    if (!file) return showModal('Please select an image file.', 'error');

    btnAdd.disabled = true;
    btnAdd.textContent = 'UPLOADING...';

    try {
        const { url, publicId } = await uploadToImgBB(file);
        await addDoc(collection(db, 'images'), { url, publicId });
        fileInput.value = '';
        await loadImages();
    } catch (err) {
        showModal('Upload failed: ' + err.message, 'error');
    } finally {
        btnAdd.disabled = false;
        btnAdd.textContent = 'ADD IMAGE';
    }
});

document.getElementById('btnCancel').addEventListener('click', () => {
    document.getElementById('imageFileInput').value = '';
    document.getElementById('imageLinkInput').value = '';
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
