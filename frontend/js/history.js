// frontend/js/history.js
const API_BASE = (typeof BASE_URL === "string" && BASE_URL) || "http://127.0.0.1:8080";

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

async function loadHistory() {
  const token = localStorage.getItem("token");
  const list = document.getElementById("historyList");

  if (!token) {
    list.innerHTML = `<li class="list-group-item text-danger">You must log in first</li>`;
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/history?limit=50`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    const data = await res.json();

    list.innerHTML = "";
    if (!data.length) {
      list.innerHTML = `<li class="list-group-item text-muted">No history found</li>`;
      return;
    }

    data.forEach((item, idx) => {
      const meta = item.meta || {};
      const li = document.createElement("li");
      li.className = "list-group-item";

      let metaHtml = "";
      const tags = [];
      if (meta.country)  tags.push(`<span class="badge bg-secondary me-1">Country: ${esc(meta.country)}</span>`);
      if (meta.language) tags.push(`<span class="badge bg-secondary me-1">Language: ${esc(meta.language)}</span>`);
      if (meta.grade)    tags.push(`<span class="badge bg-secondary me-1">Grade: ${esc(meta.grade)}</span>`);
      if (meta.topic)    tags.push(`<span class="badge bg-secondary me-1">Topic: ${esc(meta.topic)}</span>`);
      if (tags.length) metaHtml += `<div class="mt-2">${tags.join(" ")}</div>`;
      if (meta.learning_objective) {
        metaHtml += `<div class="mt-1"><strong>Aligned LO:</strong> ${esc(meta.learning_objective)}</div>`;
      }

      let reviewHtml = "";
      if (typeof item.review_score !== "undefined" || typeof item.review_text !== "undefined") {
      const icon = item.review_score === 1 ? "👍" : item.review_score === -1 ? "👎" : "";
      if (icon) reviewHtml += `<div class="mt-1"><strong>Review:</strong> ${icon}</div>`;
      if (item.review_text) reviewHtml += `<div class="mt-1"><em>${esc(item.review_text)}</em></div>`;
      }
      
      li.innerHTML = `
        <strong>Q${idx + 1}:</strong> ${esc(item.question)}<br/>
        <em>Ans:</em> ${esc(item.answer)}<br/>
        <small class="text-muted">Model: ${esc(item.model)} • ${esc(item.created_at)}</small>
        ${metaHtml}
        ${reviewHtml}
      `;
      list.appendChild(li);
    });
  } catch (err) {
    console.error(err);
    list.innerHTML = `<li class="list-group-item text-danger">Failed to load history</li>`;
  }
}

document.addEventListener("DOMContentLoaded", loadHistory);
