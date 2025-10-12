// frontend/js/logout.js
document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logoutBtn");
  const loginBtn = document.getElementById("loginBtn");
  const signupBtn = document.getElementById("signupBtn");

  // Retrieve token from localStorage
  const token = localStorage.getItem("token");

  // If user IS logged in → show logout & hide login/signup
  if (token) {
    if (logoutBtn) logoutBtn.style.display = "inline-block";
    if (loginBtn) loginBtn.style.display = "none";
    if (signupBtn) signupBtn.style.display = "none";
  } 
  // If user is NOT logged in → hide logout
  else {
    if (logoutBtn) logoutBtn.style.display = "none";
  }

  // --- Handle logout click ---
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const confirmLogout = confirm("Are you sure you want to log out?");
      if (!confirmLogout) return;

      // 🧹 Clear all authentication and session data
      localStorage.removeItem("token");
      localStorage.removeItem("chat_history");
      localStorage.removeItem("auth_token");
      sessionStorage.clear();

      // 🔁 Redirect to login page
      alert("You have been logged out successfully.");
      window.location.href = "login.html";
    });
  }
});
