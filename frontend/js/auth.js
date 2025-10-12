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
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  localStorage.removeItem("loggedIn"); // in case you still use this
  window.location.href = "index.html"; // redirect to new chat page
}

function checkAuthUI() {
  const profileBtn = document.getElementById("profileBtn");
  const profileName = document.getElementById("profileName");
  if (!profileBtn) return;

  const t = localStorage.getItem("token");
  const username = localStorage.getItem("username");

  if (t) {
    profileBtn.classList.remove("d-none");

    if (profileName && username) {
      profileName.textContent = username; // show user’s name
    }

    // open modal on click
    profileBtn.addEventListener("click", () => {
      const modal = new bootstrap.Modal(document.getElementById("profileModal"));
      modal.show();
    });

    // hook up logout button
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", logout);
    }
  } else {
    // hide profile button if logged out
    profileBtn.classList.add("d-none");
  }
}

// Run on page load
document.addEventListener("DOMContentLoaded", checkAuthUI);
