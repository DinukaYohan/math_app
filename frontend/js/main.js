// frontend/js/main.js

// Prevent any accidental form submits on the page (defense in depth)
window.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("form").forEach((f) => {
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    });
  });

  const btn = document.getElementById("generateBtn");
  if (btn) {
    btn.setAttribute("type", "button"); // ensure not a submit
    btn.addEventListener("click", onGenerateClick, { capture: true });
  }

  // Populate dropdowns once (config.js fetches /config on DOMContentLoaded)
  // If your config.js doesn't auto-run, call a global like loadConfigAndPopulate() here.
});

async function onGenerateClick(e) {
  // Absolutely block default behavior and bubbling
  e.preventDefault();
  e.stopPropagation();

  // Require login
  const token = localStorage.getItem("token");
  if (!token) {
    alert("Please log in first.");
    location.href = "login.html";
    return;
  }

  const body = {
    country:  getVal("country"),
    language: getVal("language"),
    grade:    getVal("grade"),
    model:    (getVal("model") || "").toLowerCase(),
    topic:    getVal("topic"),
  };

  if (!body.topic)  return alert("Please select a topic.");
  if (!body.grade)  return alert("Please select a grade.");

  const btn = document.getElementById("generateBtn");
  const out = document.getElementById("responseText");

  const original = btn.innerHTML;
  try {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Generating...`;
    out.textContent = "Generating...";

    // Use your api.js helper so Authorization header is added automatically
    const res = await apiRequest("/generate", { method: "POST", body, auth: true });

    out.textContent = res?.content || "(No content returned)";
  } catch (err) {
    console.error(err);
    const msg = String(err?.message || "Failed to generate.");
    // If token is bad/expired redirect to login
    if (msg.toLowerCase().includes("unauthorized") || msg.includes("401")) {
      alert("Session expired. Please log in again.");
      location.href = "login.html";
      return;
    }
    out.textContent = msg;
  } finally {
    btn.disabled = false;
    btn.innerHTML = original;
  }
}

// Small helper
function getVal(id) {
  const el = document.getElementById(id);
  return el ? String(el.value).trim() : "";
}
