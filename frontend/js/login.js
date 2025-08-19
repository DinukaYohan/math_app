document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
        const response = await axios.post("http://127.0.0.1:5000/auth/login", {
            email,
            password,
        });

        const { access_token, username } = response.data;
        localStorage.setItem("token", access_token);
        localStorage.setItem("username", username);

        window.location.href = "../index.html"; // Redirect to homepage
    } catch (err) {
        console.error(err);
        document.getElementById("loginError").textContent =
            err.response?.data?.error || "Login failed. Please try again.";
    }
});
