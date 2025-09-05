// frontend/js/sidebar.js

function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return;

  // Toggle width/collapsed state
  sidebar.classList.toggle("expanded");

  // Support old markup gracefully (if #sidebar-expanded exists)
  const expanded = document.getElementById("sidebar-expanded");
  if (expanded) expanded.classList.toggle("d-none");
}

function newChat() {
  // If we're already on the main page, just clear the UI to start fresh.
  const onIndex =
    location.pathname.endsWith("index.html") ||
    location.pathname === "/" ||
    location.pathname === "";

  if (onIndex) {
    const prompt = document.getElementById("promptInput");
    if (prompt) prompt.value = "";

    // Reset selects/inputs if they exist
    ["country", "language", "grade", "model"].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (el.tagName === "SELECT") el.selectedIndex = 0;
      else el.value = "";
    });

    // Reset output box text
    const resp = document.getElementById("responseText");
    if (resp) resp.textContent = "Your generated question will appear here...";

    // Track a new chat session id (optional; useful later)
    try {
      localStorage.setItem("currentChatId", `chat_${Date.now()}`);
    } catch (_) {
      /* ignore storage issues */
    }

    // Scroll to top for a clean start
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  // If not on index, go there.
  window.location.href = "index.html";
}

function goToHistory() {
  window.location.href = "history.html";
}
