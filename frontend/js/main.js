// frontend/js/main.js

let lastQaid = null;
let reviewScore = null; // 1 (up) | -1 (down) | null (none)

window.addEventListener("DOMContentLoaded", () => {
  // existing generate bindings stay
  document.querySelectorAll("form").forEach((f) => {
    f.addEventListener("submit", (e) => { e.preventDefault(); e.stopPropagation(); return false; });
  });
  const btn = document.getElementById("generateBtn");
  if (btn) {
    btn.setAttribute("type", "button");
    btn.addEventListener("click", onGenerateClick, { capture: true });
  }

  // Review UI events
  document.getElementById("thumbUp")?.addEventListener("click", () => {
    reviewScore = (reviewScore === 1 ? null : 1); // toggle
    refreshThumbs();
  });
  document.getElementById("thumbDown")?.addEventListener("click", () => {
    reviewScore = (reviewScore === -1 ? null : -1); // toggle
    refreshThumbs();
  });
  document.getElementById("saveReviewBtn")?.addEventListener("click", submitReview);
  document.getElementById("clearReviewBtn")?.addEventListener("click", clearReviewDraft);
});

function refreshThumbs() {
  const up = document.getElementById("thumbUp");
  const down = document.getElementById("thumbDown");
  up?.classList.toggle("btn-success", reviewScore === 1);
  up?.classList.toggle("btn-outline-success", reviewScore !== 1);
  down?.classList.toggle("btn-danger", reviewScore === -1);
  down?.classList.toggle("btn-outline-danger", reviewScore !== -1);
}

function showReviewBox(show) {
  const box = document.getElementById("reviewBox");
  if (!box) return;
  box.classList.toggle("d-none", !show);
  if (show) {
    // reset draft
    reviewScore = null;
    refreshThumbs();
    const t = document.getElementById("reviewText");
    if (t) t.value = "";
    const s = document.getElementById("reviewStatus");
    if (s) s.textContent = "";
  }
}

async function submitReview() {
  if (!lastQaid) return;
  const token = localStorage.getItem("token");
  if (!token) {
    alert("Please log in first.");
    location.href = "login.html";
    return;
  }
  const text = (document.getElementById("reviewText")?.value || "").trim();
  const body = {
    score: reviewScore === 1 ? "up" : reviewScore === -1 ? "down" : "",
    text
  };
  const status = document.getElementById("reviewStatus");
  try {
    document.getElementById("saveReviewBtn").disabled = true;
    status.textContent = "Saving...";
    await apiRequest(`/qa/${encodeURIComponent(lastQaid)}/review`, { method: "POST", body, auth: true });
    status.textContent = "Saved!";
  } catch (e) {
    console.error(e);
    status.textContent = "Failed to save.";
  } finally {
    document.getElementById("saveReviewBtn").disabled = false;
  }
}

function clearReviewDraft() {
  reviewScore = null;
  refreshThumbs();
  const t = document.getElementById("reviewText");
  if (t) t.value = "";
  const s = document.getElementById("reviewStatus");
  if (s) s.textContent = "";
}

// === EXISTING ===
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
    lastQaid = res?.qaid || null;

    // Enable review box (optional feature)
    showReviewBox(!!lastQaid);
  } catch (err) {
    console.error(err);
    const msg = String(err?.message || "Failed to generate.");
    if (msg.toLowerCase().includes("unauthorized") || msg.includes("401")) {
      alert("Session expired. Please log in again.");
      location.href = "login.html";
      return;
    }
    out.textContent = msg;
    showReviewBox(false);
  } finally {
    btn.disabled = false;
    btn.innerHTML = original;
  }
}

// Utility
function getVal(id) {
  const el = document.getElementById(id);
  return el ? String(el.value).trim() : "";
}
