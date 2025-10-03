function requireAuth() {
  const t = localStorage.getItem("token");
  if (!t) window.location.href = "login.html";
}
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  window.location.href = "login.html";
}

