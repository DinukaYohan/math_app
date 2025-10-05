// frontend/js/main.js

//When the page loads, stop forms from reloading the page, and make the Generate button run the custom code that talks to the backend.
window.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("form").forEach((f) => {
    f.addEventListener("submit", (e) => { e.preventDefault(); e.stopPropagation(); return false; });
  });

  const btn = document.getElementById("generateBtn");
  if (btn) {
    btn.setAttribute("type", "button");
    btn.addEventListener("click", onGenerateClick, { capture: true });
  }
});

//main function that runs when you click the “Generate” button
async function onGenerateClick(e) {
  e.preventDefault();
  e.stopPropagation();

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
    learning_objective: getVal("learningObjective"),
  };

  if (!body.country)  return alert("Please select a country.");
  if (!body.language) return alert("Please select a language.");
  if (!body.grade)    return alert("Please select a grade.");
  if (!body.topic)    return alert("Please select a topic.");
  if (!body.learning_objective) return alert("Please select a learning objective.");

  const btn = document.getElementById("generateBtn");
  const out = document.getElementById("responseText");
  const original = btn.innerHTML;

  try {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Generating...`;
    out.textContent = "Generating...";

    const res = await apiRequest("/generate", { method: "POST", body, auth: true });
    out.textContent = res?.content || "(No content returned)";
  } catch (err) {
    console.error(err);
    const msg = String(err?.message || "Failed to generate.");
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

// Utility kept in sync with config.js
function getVal(id) {
  const el = document.getElementById(id);
  return el ? String(el.value).trim() : "";
}