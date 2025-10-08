// frontend/js/sidebar.js

function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return;

  sidebar.classList.toggle("expanded");

  const main = document.querySelector(".main-wrap");
  if (main) {
    main.style.marginLeft = sidebar.classList.contains("expanded") ? "200px" : "60px";
  }
}


function newChat() {
  const onIndex =
    location.pathname.endsWith("index.html") ||
    location.pathname === "/" ||
    location.pathname === "";

  if (onIndex) {
    const prompt = document.getElementById("promptInput");
    if (prompt) prompt.value = "";

    ["country", "language", "grade", "model", "topic", "learningObjective"].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (el.tagName === "SELECT") el.selectedIndex = 0;
      else el.value = "";
    });

    const resp = document.getElementById("responseText");
    if (resp) resp.textContent = "Your generated question will appear here...";

    const reviewBox = document.getElementById("reviewBox");
    if (reviewBox) reviewBox.classList.add("d-none");

    const reviewText = document.getElementById("reviewText");
    if (reviewText) reviewText.value = "";

    try {
      localStorage.setItem("currentChatId", `chat_${Date.now()}`);
    } catch (_) {}

    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  window.location.href = "index.html";
}

function goToHistory() {
  window.location.href = "history.html";
}

// Sidebar initialization on every page
window.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.getElementById("sidebar");
  const expanded = document.getElementById("sidebar-expanded");
  const icons = document.getElementById("sidebar-icons");
  const main = document.querySelector(".main-wrap");

  if (!sidebar) return; // skip if page doesn't have sidebar

  // Start collapsed
  sidebar.classList.remove("expanded");
  if (expanded) expanded.classList.add("d-none");
  if (icons) icons.classList.remove("d-none");
  if (main) main.style.marginLeft = "80px";
});
