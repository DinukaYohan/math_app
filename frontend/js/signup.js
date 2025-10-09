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
    // 1) Create the account
    await apiRequest("/auth/register", {
      method: "POST",
      body: { username, email, password },
    });

    // 2) Immediately login to get token + canonical username
    const loginData = await apiRequest("/auth/login", {
      method: "POST",
      body: { email, password },
    });

    const { access_token, username: uname } = loginData;

    if (access_token) localStorage.setItem("token", access_token);
    if (uname) localStorage.setItem("username", uname);
    localStorage.setItem("loggedIn", "true");

    // 3) Go straight to the app
    window.location.href = "index.html";
  } catch (err) {
    console.error(err);
    showAlert("danger", err.message || "Signup failed. Please try again.");
  }
});
