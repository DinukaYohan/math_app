document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim().toLowerCase();
  const password = document.getElementById("password").value;

  try {
    const data = await apiRequest("/auth/login", {
      method: "POST",
      body: { email, password },
    });

    const { access_token, username } = data;
    localStorage.setItem("token", access_token);
    if (username) localStorage.setItem("username", username);

    // mark user as logged in only after success
    localStorage.setItem("loggedIn", "true");

    // redirect to app
    window.location.href = "index.html";
  } catch (err) {
    console.error(err);
    const box = document.getElementById("loginError");
    box.textContent = err.message || "Login failed. Please try again.";
  }
});
