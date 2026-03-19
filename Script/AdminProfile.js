import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

const menuToggle = document.getElementById("menuToggle");
const dropdownMenu = document.getElementById("dropdownMenu");
const darkModeToggle = document.getElementById("darkModeToggle");

// Load current admin credentials from Firestore
async function loadAdminData() {
    try {
        const docRef = doc(db, "admin", "adminCredentials");
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('displayName').textContent = data.name || 'Administrator';
            document.getElementById('currentName').value = data.name || 'Administrator';
            document.getElementById('currentUsername').value = data.username || 'admin';
            document.querySelector('.profile-email').textContent = data.username || 'admin';
        }
    } catch (error) {
        console.error('Error loading admin data:', error);
    }
}

loadAdminData();

// Dark mode toggle
if (localStorage.getItem('darkMode') === 'enabled') {
    document.body.classList.add('dark-mode');
    darkModeToggle.innerHTML = '<i class="fas fa-sun"></i><span>Light Mode</span>';
}

darkModeToggle.addEventListener('click', function() {
    document.body.classList.toggle('dark-mode');
    if (document.body.classList.contains('dark-mode')) {
        localStorage.setItem('darkMode', 'enabled');
        this.innerHTML = '<i class="fas fa-sun"></i><span>Light Mode</span>';
    } else {
        localStorage.setItem('darkMode', 'disabled');
        this.innerHTML = '<i class="fas fa-moon"></i><span>Dark Mode</span>';
    }
});

// Dropdown menu toggle
let isDropdownOpen = false;

menuToggle.addEventListener('mouseenter', function() {
    if (!isDropdownOpen) {
        dropdownMenu.style.display = 'block';
    }
});

menuToggle.addEventListener('click', function(e) {
    e.stopPropagation();
    isDropdownOpen = !isDropdownOpen;
    dropdownMenu.style.display = isDropdownOpen ? 'block' : 'none';
});

document.querySelector('.user-menu').addEventListener('mouseleave', function() {
    if (!isDropdownOpen) {
        dropdownMenu.style.display = 'none';
    }
});

document.addEventListener('click', function() {
    if (isDropdownOpen) {
        isDropdownOpen = false;
        dropdownMenu.style.display = 'none';
    }
});

// Toggle password visibility
document.querySelectorAll('.toggle-password').forEach(icon => {
    icon.addEventListener('click', function() {
        const input = this.previousElementSibling;
        const type = input.type === 'password' ? 'text' : 'password';
        input.type = type;
        this.classList.toggle('fa-eye');
        this.classList.toggle('fa-eye-slash');
    });
});

window.logout = function() {
    if (confirm("Are you sure you want to logout?")) {
        localStorage.removeItem("isAdminLoggedIn");
        window.location.href = "LoginAdmin.html";
    }
}

// Change Name
document.getElementById('nameForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const newName = document.getElementById('newName').value;
    
    try {
        const docRef = doc(db, "admin", "adminCredentials");
        await updateDoc(docRef, { name: newName });
        alert('Name updated successfully!');
        document.getElementById('currentName').value = newName;
        document.getElementById('displayName').textContent = newName;
        this.reset();
    } catch (error) {
        alert('Error updating name: ' + error.message);
    }
});

// Change Username
document.getElementById('usernameForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const newUsername = document.getElementById('newUsername').value;
    
    try {
        const docRef = doc(db, "admin", "adminCredentials");
        await updateDoc(docRef, { username: newUsername });
        alert('Username updated successfully!');
        document.getElementById('currentUsername').value = newUsername;
        document.querySelector('.profile-email').textContent = newUsername;
        this.reset();
    } catch (error) {
        alert('Error updating username: ' + error.message);
    }
});

// Change Password
document.getElementById('passwordForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (newPassword !== confirmPassword) {
        alert('Passwords do not match!');
        return;
    }
    
    try {
        const docRef = doc(db, "admin", "adminCredentials");
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists() && docSnap.data().password === currentPassword) {
            await updateDoc(docRef, { password: newPassword });
            alert('Password updated successfully!');
            this.reset();
        } else {
            alert('Current password is incorrect!');
        }
    } catch (error) {
        alert('Error updating password: ' + error.message);
    }
});
