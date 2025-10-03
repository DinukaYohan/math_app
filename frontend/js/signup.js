// public/js/signup.js
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
  const email = $("email").value.trim().toLowerCase();
  const password = $("password").value.trim();

  try {
    // NOTE: backend route is /auth/register (not /auth/signup)
    const data = await apiRequest("/auth/register", {
      method: "POST",
      body: { username, email, password },
    });

    // If backend returns a token on signup, you could store it here.
    if (data.access_token) localStorage.setItem("token", data.access_token);
    if (data.username) localStorage.setItem("username", data.username);

    showAlert("success", "Account created! Redirecting to login…");
    setTimeout(() => (window.location.href = "login.html"), 1000);
  } catch (err) {
    console.error(err);
    showAlert("danger", err.message || "Signup failed. Please try again.");
  }
});
