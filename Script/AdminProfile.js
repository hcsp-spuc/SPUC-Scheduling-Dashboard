import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
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

initModal();

const adminId = localStorage.getItem("adminId");
const editBtn = document.getElementById('editBtn');
const saveBtn = document.getElementById('saveBtn');
const profileForm = document.getElementById('profileForm');
const inputs = profileForm.querySelectorAll('.form-control');

async function loadAdminData() {
    if (!adminId) return;
    try {
        const docSnap = await getDoc(doc(db, "admin", adminId));
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('nameInput').value = data.name || '';
            document.getElementById('emailInput').value = data.email || '';
            document.getElementById('usernameInput').value = data.username || '';
            document.getElementById('passwordInput').value = data.password || '';
        }
    } catch (error) {
        console.error('Error loading admin data:', error);
    }
}

loadAdminData();

editBtn.addEventListener('click', () => {
    inputs.forEach(input => input.removeAttribute('readonly'));
    saveBtn.style.display = 'block';
    editBtn.style.opacity = '0.4';
    editBtn.style.pointerEvents = 'none';
});

profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!adminId) return;

    const name = document.getElementById('nameInput').value.trim();
    const username = document.getElementById('usernameInput').value.trim();
    const password = document.getElementById('passwordInput').value.trim();

    if (!name || !username || !password) {
        showModal('Name, Username, and Password cannot be empty.', 'error');
        return;
    }

    try {
        await updateDoc(doc(db, "admin", adminId), {
            name: name,
            email: document.getElementById('emailInput').value,
            username: username,
            password: password
        });
        showModal('Profile updated successfully!');
        inputs.forEach(input => input.setAttribute('readonly', true));
        saveBtn.style.display = 'none';
        editBtn.style.opacity = '1';
        editBtn.style.pointerEvents = 'auto';
    } catch (error) {
        showModal('Error updating profile: ' + error.message, 'error');
    }
});
