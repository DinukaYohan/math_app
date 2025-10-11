// js/auth.js

// --- AUTH HELPER OBJECT ---
const Auth = {
  tokenKey: "token",
  userKey: "username",

  // Save login data (called from login.js)
  saveSession({ token, username }) {
    if (token) localStorage.setItem(this.tokenKey, token);
    if (username) localStorage.setItem(this.userKey, username);
  },

  // Check if user is logged in
  isLoggedIn() {
    return !!localStorage.getItem(this.tokenKey);
  },

  // Get token or username
  getToken() {
    return localStorage.getItem(this.tokenKey);
  },

  getUsername() {
    return localStorage.getItem(this.userKey);
  },

  // Remove all auth data
  clear() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  },
};

// --- REQUIRE LOGIN FOR PROTECTED PAGES ---
function requireAuth() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
  }
}

// --- LOGOUT FUNCTION ---
function logout() {
  Auth.clear();
  window.location.href = "login.html";
}

// --- OPTIONAL: DISPLAY USER INFO ON NAVBAR ---
function showUserNav() {
  const isLoggedIn = Auth.isLoggedIn();
  const username = Auth.getUsername();
  const navbar = document.querySelector("nav .container, nav .container-fluid, nav");

  if (!navbar) return;

  // Remove any previous buttons if this is re-run
  const existingProfile = document.getElementById("profileLink");
  if (existingProfile) existingProfile.remove();

  if (isLoggedIn) {
    const btn = document.createElement("a");
    btn.href = "profile.html";
    btn.className = "btn btn-outline-light me-2";
    btn.id = "profileLink";
    btn.innerHTML = `<i class="bi bi-person-circle me-1"></i>${username || "Profile"}`;
    navbar.appendChild(btn);
  }
}

// Call on DOM load (optional)
document.addEventListener("DOMContentLoaded", showUserNav);
