// Uses BASE_URL from js/config.js; falls back to 127.0.0.1:5000 if not set
const API_BASE = (typeof BASE_URL === "string" && BASE_URL) || "http://127.0.0.1:5000";

const $ = (id) => document.getElementById(id);
const alertBox = $("signupAlert");

function showAlert(type, message) {
  alertBox.className = `alert alert-${type}`;
  alertBox.textContent = message;
  alertBox.classList.remove("d-none");
}

function clearAlert() {
  alertBox.classList.add("d-none");
  alertBox.textContent = "";
}

function validateForm() {
  const form = $("signupForm");
  // HTML5 validation UI
  if (!form.checkValidity()) {
    form.classList.add("was-validated");
    return false;
  }
  form.classList.remove("was-validated");

  const pwd = $("password").value.trim();
  const cpwd = $("confirmPassword").value.trim();

  if (pwd.length < 6) {
    $("password").setCustomValidity("Password too short");
    form.classList.add("was-validated");
    return false;
  } else {
    $("password").setCustomValidity("");
  }

  if (pwd !== cpwd) {
    $("confirmPassword").setCustomValidity("Passwords do not match");
    form.classList.add("was-validated");
    return false;
  } else {
    $("confirmPassword").setCustomValidity("");
  }
  return true;
}

$("signupForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  clearAlert();

  if (!validateForm()) return;

  const username = $("username").value.trim();
  const email = $("email").value.trim();
  const password = $("password").value.trim();

  try {
    // If your backend route differs, change below (e.g., /register)
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });

    // Expecting { message, access_token?, username? } or similar
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errMsg = data?.error || data?.message || `Signup failed (${res.status})`;
      showAlert("danger", errMsg);
      return;
    }

    // If backend returns a token immediately, you can store it:
    if (data.access_token) {
      localStorage.setItem("token", data.access_token);
    }
    if (data.username) {
      localStorage.setItem("username", data.username);
    }

    showAlert("success", data?.message || "Account created successfully! Redirecting to login…");
    setTimeout(() => {
      window.location.href = "login.html";
    }, 1200);
  } catch (err) {
    console.error(err);
    showAlert("danger", "Network error. Please try again.");
  }
});
