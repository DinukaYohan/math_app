function requireAuth() {
  const t = localStorage.getItem("token");
  if (!t) window.location.href = "login.html";
}

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
