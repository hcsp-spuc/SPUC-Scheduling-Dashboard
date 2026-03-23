if (!localStorage.getItem("isAdminLoggedIn")) {
    window.location.replace("/Page/LoginAdmin.html");
}

document.addEventListener("DOMContentLoaded", () => {
    const signOutBtn = document.querySelector(".sign-out");
    if (signOutBtn) {
        signOutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            localStorage.removeItem("isAdminLoggedIn");
            localStorage.removeItem("adminId");
            localStorage.removeItem("adminName");
            window.location.replace("/Page/LoginAdmin.html");
        });
    }
});
