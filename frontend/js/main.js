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

// === Custom modal alert (replaces browser alert) ===
function showAlertDialog({ title = "Notice", message = "Something went wrong.", redirect = null }) {
  const modalEl = document.getElementById("alertModal");
  const modal = new bootstrap.Modal(modalEl);
  const titleEl = document.getElementById("alertModalTitle");
  const bodyEl = document.getElementById("alertModalBody");
  const btnEl = modalEl.querySelector(".btn-primary");

  titleEl.textContent = title;
  bodyEl.textContent = message;

  // Default button behavior
  btnEl.textContent = redirect ? "Login" : "OK";
  btnEl.onclick = () => {
    modal.hide();
    if (redirect) window.location.href = redirect;
  };

  modal.show();
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
  if (!lastQaid) {
    return showAlertDialog({
      title: "No Question Found",
      message: "Please generate a question before submitting a review."
    });
  }

  const token = localStorage.getItem("token");
  if (!token) {
    showAlertDialog({
      title: "Login Required",
      message: "Please log in first to submit your review.",
      redirect: "login.html"
    });
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
    showAlertDialog({
      title: "Review Saved",
      message: "Your review has been successfully submitted."
    });
  } catch (e) {
    console.error(e);
    status.textContent = "Failed to save.";
    showAlertDialog({
      title: "Error",
      message: "Failed to save your review. Please try again later."
    });
  } finally {
    document.getElementById("saveReviewBtn").disabled = false;
  }
}

function clearReviewDraft() {
  // Reset thumbs (reviewScore)
  reviewScore = null;
  refreshThumbs();

  // Clear review text
  const textEl = document.getElementById("reviewText");
  if (textEl) textEl.value = "";

  // Clear status label
  const statusEl = document.getElementById("reviewStatus");
  if (statusEl) statusEl.textContent = "";

  // Show confirmation modal
  showAlertDialog({
    title: "Cleared",
    message: "Your review draft has been cleared."
  });
}



// === EXISTING ===
async function onGenerateClick(e) {
  e.preventDefault();
  e.stopPropagation();

  const token = localStorage.getItem("token");
  if (!token) {
    showAlertDialog({
      title: "Login Required",
      message: "Please log in first to generate questions."
    });
    setTimeout(() => location.href = "login.html", 2500); // timeout to redirect to login page 
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

  if (!body.country)
    return showAlertDialog({ title: "Missing Selection", message: "Please select a country." });
  if (!body.language)
    return showAlertDialog({ title: "Missing Selection", message: "Please select a language." });
  if (!body.grade)
    return showAlertDialog({ title: "Missing Selection", message: "Please select a grade." });
  if (!body.topic)
    return showAlertDialog({ title: "Missing Selection", message: "Please select a topic." });
  if (!body.learning_objective)
    return showAlertDialog({ title: "Missing Selection", message: "Please select a learning objective." });


  const btn = document.getElementById("generateBtn");
  const out = document.getElementById("responseText");
  const original = btn.innerHTML;

  try {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Generating...`;
    out.textContent = "Generating...";

    const res = await apiRequest("/generate", { method: "POST", body, auth: true });
    // Format content for cleaner HTML display
    let formatted = res?.content || "(No content returned)";

    // Clean up LaTeX-style math and symbols
    formatted = formatted
      .replace(/\\times/g, "×")                // replace \times → ×
      .replace(/\\div/g, "÷")                  // replace \div → ÷
      .replace(/\\pi/g, "π")                   // replace \pi → π
      .replace(/\\text\{(.*?)\}/g, "$1")       // remove \text{...}
      .replace(/\\frac\{(.*?)\}\{(.*?)\}/g, "($1 ÷ $2)"); // fraction → (a ÷ b)

    // Markdown bold/italic
    formatted = formatted
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")  // **bold**
      .replace(/\*(.*?)\*/g, "<em>$1</em>");             // *italic*

    // Spacing and paragraphs
    formatted = formatted
      .replace(/\n{2,}/g, "</p><p>")
      .replace(/\n/g, "<br>")
      .replace(/^/, "<p>")
      .replace(/$/, "</p>");

    // Render result
    out.innerHTML = formatted;

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
