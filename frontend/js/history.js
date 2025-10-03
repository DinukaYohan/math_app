const API_BASE = (typeof BASE_URL === "string" && BASE_URL) || "http://127.0.0.1:8080";

async function loadHistory() {
  const token = localStorage.getItem("token");
  const list = document.getElementById("historyList");

  if (!token) {
    list.innerHTML = `<li class="list-group-item text-danger">You must log in first</li>`;
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/history`, {
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
      const li = document.createElement("li");
      li.className = "list-group-item";
      li.innerHTML = `
        <strong>Q${idx + 1}:</strong> ${item.question}<br/>
        <em>Ans:</em> ${item.answer}<br/>
        <small class="text-muted">Model: ${item.model} • ${item.created_at}</small>
      `;
      list.appendChild(li);
    });
  } catch (err) {
    console.error(err);
    list.innerHTML = `<li class="list-group-item text-danger">Failed to load history</li>`;
  }
}

document.addEventListener("DOMContentLoaded", loadHistory);
