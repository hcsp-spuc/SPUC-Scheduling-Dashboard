import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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


// SHOW / HIDE PASSWORD
const togglePassword = document.getElementById("togglePassword");
const passwordInput = document.getElementById("password");

togglePassword.addEventListener("click", function(){
    const type = passwordInput.type === "password" ? "text" : "password";
    passwordInput.type = type;
    this.classList.toggle("fa-eye");
    this.classList.toggle("fa-eye-slash");
});


// LOGIN SYSTEM
const form = document.getElementById("loginForm");

form.addEventListener("submit", async function(e){

    e.preventDefault();

    const username = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const errorMsg = document.getElementById("error");
    const loginBtn = document.querySelector(".login-btn");

    loginBtn.innerHTML = "Signing in...";
    loginBtn.disabled = true;

    try {

        const querySnapshot = await getDocs(collection(db, "admin"));
        let authenticated = false;
        let adminData = null;

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            console.log("DB doc:", JSON.stringify(data));
            if(username.trim() === (data.username || "").trim() && password.trim() === (data.password || "").trim()){
                authenticated = true;
                adminData = { id: docSnap.id, ...data };
            }
        });

        if(authenticated){
            localStorage.setItem("isAdminLoggedIn", "true");
            localStorage.setItem("adminId", adminData.id);
            localStorage.setItem("adminName", adminData.name);
            window.location.href = "AdminDashboard.html";
        }else{
            errorMsg.innerHTML = "Invalid username or password";
            errorMsg.style.display = "block";
            loginBtn.innerHTML = '<span>Sign In</span><i class="fas fa-arrow-right"></i>';
            loginBtn.disabled = false;
        }

    } catch(error){

        errorMsg.innerHTML = error.message;
        errorMsg.style.display = "block";

        loginBtn.innerHTML = '<span>Sign In</span><i class="fas fa-arrow-right"></i>';
        loginBtn.disabled = false;

    }

});