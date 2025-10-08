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

// ===== API calls =====
async function apiFetchHistory(token) {
  const res = await fetch(`${API_BASE}/history?limit=50`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`History error ${res.status}`);
  return res.json();
}

async function apiDeleteAll(token) {
  // Prefer DELETE /history
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

// ===== Renderers =====
function renderItems(items) {
  if (!els.list) return;

  els.list.innerHTML = "";
  if (!items || !items.length) {
    showEmpty();
    return;
  }

  // Newest first if backend isn't sorted
  const sorted = [...items].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  for (let i = 0; i < sorted.length; i++) {
    const it = sorted[i] || {};
    const meta = it.meta || {};

    const chips = [];
    if (meta.country)  chips.push(`<span class="meta"><i class="bi bi-geo-alt"></i>${esc(meta.country)}</span>`);
    if (meta.language) chips.push(`<span class="meta"><i class="bi bi-translate"></i>${esc(meta.language)}</span>`);
    if (meta.grade)    chips.push(`<span class="meta"><i class="bi bi-journal-text"></i>Grade ${esc(meta.grade)}</span>`);
    if (meta.topic)    chips.push(`<span class="meta"><i class="bi bi-book"></i>${esc(meta.topic)}</span>`);

    const lo =
      meta.learning_objective
        ? `<div class="small text-info mt-1"><i class="bi bi-mortarboard"></i> Aligned LO: ${esc(meta.learning_objective)}</div>`
        : "";

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
    const title = it.title || it.prompt || it.question || `Chat #${i + 1}`;
    const preview = it.preview || it.question || "";

    const li = document.createElement("li");
    li.className = "list-group-item py-3";
    li.innerHTML = `
      <div class="d-flex align-items-center justify-content-between gap-3 flex-wrap">
        <div class="flex-grow-1">
          <div class="fw-semibold">${esc(title)}</div>
          ${preview ? `<div class="text-secondary small mt-1">${esc(preview)}</div>` : ""}
          <div class="d-flex flex-wrap gap-2 mt-2">${chips.join("")}</div>
          ${lo}
          ${reviewHtml}
        </div>

        <div class="text-end">
          <div class="small text-muted mb-2">Model: ${esc(it.model || "—")} • ${esc(dateStr)}</div>
          <div class="d-flex gap-2 justify-content-end">
            ${it.id ? `<button class="btn btn-sm btn-outline-danger" data-del="${esc(it.id)}">
              <i class="bi bi-trash3"></i>
            </button>` : ""}
          </div>
        </div>
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
  const ok = confirm("Clear all history? This cannot be undone.");
  if (!ok) return;

  try {
    await apiDeleteAll(token);
  } catch (e) {
    // If your backend doesn’t support DELETE /history yet, fail silently
    console.warn("DELETE /history not supported. Please implement on backend.", e);
  } finally {
    // Re-fetch to reflect the change
    await loadHistory();
  }
}

async function deleteOne(id) {
  const token = localStorage.getItem("token");
  if (!token) {
    showLoggedOut();
    return;
  }
  const ok = confirm("Delete this history item?");
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

  // Initial load
  loadHistory();
});
