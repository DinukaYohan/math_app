// frontend/js/history.js

// ===== Configuration =====
const API_BASE =
  (typeof BASE_URL === "string" && BASE_URL) || "http://127.0.0.1:8080";

// ===== Helpers =====
const $ = (id) => document.getElementById(id);
const els = {
  list: $("historyList"),
  loginAlert: $("loginAlert"),   // optional (friendly banner)
  emptyState: $("emptyState"),   // optional (illustrated empty box)
  clearAllBtn: $("clearAllBtn"), // optional (Clear History button)
  footer: $("historyFooter"),
};

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function fmtDate(iso) {
  try {
    const d = new Date(iso);
    if (isNaN(d)) return "Unknown time";
    return d.toLocaleString();
  } catch {
    return "Unknown time";
  }
}

function showLoggedOut() {
  if (els.list) els.list.innerHTML = `
    <li class="list-group-item text-warning">
      <strong>You must log in first.</strong> Your chat history is linked to your account.
    </li>`;
  if (els.loginAlert) els.loginAlert.classList.remove("d-none");
  if (els.emptyState) els.emptyState.classList.add("d-none");
}

function showEmpty() {
  if (els.emptyState) {
    els.emptyState.classList.remove("d-none");
  } else if (els.list) {
    els.list.innerHTML = `
      <li class="list-group-item text-muted">No history found</li>`;
  }
}

function hideBanners() {
  if (els.loginAlert) els.loginAlert.classList.add("d-none");
  if (els.emptyState) els.emptyState.classList.add("d-none");
}

// === Custom confirmation modal (replaces browser confirm) ===
function showConfirmDialog({ title = "Confirm", message = "Are you sure?", confirmText = "OK", cancelText = "Cancel" }) {
  return new Promise((resolve) => {
    const modalEl = document.getElementById("confirmModal");
    const modal = new bootstrap.Modal(modalEl);
    const titleEl = document.getElementById("confirmModalTitle");
    const bodyEl = document.getElementById("confirmModalBody");
    const yesBtn = document.getElementById("confirmModalYesBtn");

    titleEl.textContent = title;
    bodyEl.textContent = message;
    yesBtn.textContent = confirmText;

    const onConfirm = () => {
      resolve(true);
      modal.hide();
    };

    const onCancel = () => resolve(false);

    yesBtn.onclick = onConfirm;
    modalEl.addEventListener("hidden.bs.modal", onCancel, { once: true });

    modal.show();
  });
}


// ===== API calls =====
async function apiFetchHistory(token) {
  const res = await fetch(`${API_BASE}/history?limit=50`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`History error ${res.status}`);
  return res.json();
}

async function apiDeleteAll(token) {
  const res = await fetch(`${API_BASE}/history`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Delete all error ${res.status}`);
  return true;
}

async function apiDeleteOne(token, id) {
  const res = await fetch(`${API_BASE}/history/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Delete item error ${res.status}`);
  return true;
}

function renderItems(items) {
  if (!els.list) return;

  els.list.innerHTML = "";
  if (!items || !items.length) {
    showEmpty();
    if (els.clearAllBtn) els.clearAllBtn.classList.add("d-none"); // hide button if empty
    return;
  }

  // Show clear button only if history exists
  if (els.clearAllBtn) els.clearAllBtn.classList.remove("d-none");

  // Newest first if backend isn't sorted
  const sorted = [...items].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  for (let i = 0; i < sorted.length; i++) {
    const it = sorted[i] || {};
    const meta = it.meta || {};

    // Build meta chips (Aligned LO now matches chip style)
    const chips = [];
    if (meta.country)
      chips.push(`<span class="meta"><i class="bi bi-geo-alt"></i>${esc(meta.country)}</span>`);
    if (meta.language)
      chips.push(`<span class="meta"><i class="bi bi-translate"></i>${esc(meta.language)}</span>`);
    if (meta.grade)
      chips.push(`<span class="meta"><i class="bi bi-journal-text"></i>Grade ${esc(meta.grade)}</span>`);
    if (meta.topic)
      chips.push(`<span class="meta"><i class="bi bi-book"></i>${esc(meta.topic)}</span>`);
    if (meta.learning_objective)
      chips.push(`<span class="meta"><i class="bi bi-mortarboard"></i>LO: ${esc(meta.learning_objective)}</span>`);

    // Review summary (if any)
    let reviewHtml = "";
    const score = it.review_score;
    const icon = score === 1 ? "👍" : score === -1 ? "👎" : "";
    if (icon || it.review_text) {
      reviewHtml = `<div class="mt-1 small">
        <strong>Review:</strong> ${icon || ""}
        ${it.review_text ? `<em>${esc(it.review_text)}</em>` : ""}
      </div>`;
    }

    const dateStr = fmtDate(it.created_at);
    const model = esc(it.model || "—");

    // === Question and Answer Display (Formatted for readability) ===
    // We’ll no longer show “Prompt”, only Generated Output.
    const answer = (it.output_html || it.answer_html || it.answer || "")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // bold markdown
      .replace(/\*(.*?)\*/g, "<em>$1</em>")             // italic markdown
      .replace(/\\times/g, "×")                         // replace LaTeX symbols
      .replace(/\\div/g, "÷")
      .replace(/\\pi/g, "π")
      .replace(/\\text\{(.*?)\}/g, "$1")
      .replace(/\n{2,}/g, "</p><p>")
      .replace(/\n/g, "<br>")
      .replace(/^/, "<p>")
      .replace(/$/, "</p>");

    // Create list item container
    const li = document.createElement("li");
    li.className = "list-group-item py-3";
    li.innerHTML = `
      <div class="history-item-container">

        <!-- Generated Output Section -->
        <div class="p-3 mb-3 rounded" style="background: rgba(255,255,255,0.05);">
          <div class="fw-semibold text-info mb-2">Generated Output:</div>
          <div class="text-light" style="white-space: normal;">${answer}</div>
        </div>

        <!-- Meta Chips Section -->
        <div class="d-flex flex-wrap gap-2 mb-2">${chips.join("")}</div>

        <!-- Model and Date Section (now visible white text) -->
        <div class="small" style="color: #ffffff;">Model: ${model} • ${dateStr}</div>

        ${reviewHtml}

        <!-- Delete Button -->
        ${it.qaid ? `<button class="btn btn-sm btn-danger delete-btn-bottom-right" data-del="${esc(it.qaid)}" title="Delete this entry">
          <i class="bi bi-trash3"></i> Delete
        </button>` : ""}
      </div>
    `;
    els.list.appendChild(li);
  }
}


// ===== Page actions =====
async function loadHistory() {
  const token = localStorage.getItem("token");
  if (!token) {
    showLoggedOut();
    return;
  }

  hideBanners();

  try {
    const data = await apiFetchHistory(token);
    renderItems(Array.isArray(data) ? data : []);
  } catch (err) {
    console.error(err);
    if (els.list) {
      els.list.innerHTML = `
        <li class="list-group-item text-danger">Failed to load history</li>`;
    }
  }
}

async function clearAll() {
  const token = localStorage.getItem("token");
  if (!token) {
    showLoggedOut();
    return;
  }

  const ok = await showConfirmDialog({
    title: "Clear All History",
    message: "Are you sure you want to clear your entire history? This cannot be undone.",
    confirmText: "Yes, Clear All"
  });
  if (!ok) return;

  try {
    await apiDeleteAll(token);
  } catch (e) {
    console.warn("DELETE /history not supported. Please implement on backend.", e);
  } finally {
    await loadHistory();
  }
}


async function deleteOne(id) {
  const token = localStorage.getItem("token");
  if (!token) {
    showLoggedOut();
    return;
  }

  // Replace the confirm() line with this custom modal:
  const ok = await showConfirmDialog({
    title: "Delete History Item",
    message: "Are you sure you want to delete this history item?",
    confirmText: "Yes, Delete"
  });
  if (!ok) return;

  try {
    await apiDeleteOne(token, id);
  } catch (e) {
    console.warn("DELETE /history/:id not supported. Please implement on backend.", e);
  } finally {
    await loadHistory();
  }
}

// ===== Wire events =====
document.addEventListener("DOMContentLoaded", () => {
  // List item actions (delete one)
  if (els.list) {
    els.list.addEventListener("click", (e) => {
      const delBtn = e.target.closest("[data-del]");
      if (delBtn) {
        const id = delBtn.getAttribute("data-del");
        if (id) deleteOne(id);
      }
    });
  }

  // Clear all button if present
  if (els.clearAllBtn) {
    els.clearAllBtn.addEventListener("click", clearAll);
  }

  // Add login check here
  const token = localStorage.getItem("token");
  const loginAlert = document.getElementById("loginAlert");
  const card = document.querySelector(".card");

  if (!token) {
    if (loginAlert) loginAlert.classList.remove("d-none");
    if (card) card.classList.add("d-none");
    if (els.clearAllBtn) els.clearAllBtn.classList.add("d-none"); // hide button
    if (els.footer) els.footer.classList.add("d-none");           // hide footer
    return; // stop, don’t call loadHistory
  } else {
    if (loginAlert) loginAlert.classList.add("d-none");
    if (card) card.classList.remove("d-none");
    if (els.clearAllBtn) els.clearAllBtn.classList.remove("d-none"); // show button
    if (els.footer) els.footer.classList.remove("d-none");           // show footer
  }

  // Initial load
  loadHistory();
});