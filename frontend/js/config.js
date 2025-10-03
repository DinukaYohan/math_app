// frontend/js/config.js

// Backend API base
const BASE_URL = "http://127.0.0.1:8080";

// Map backend codes → human labels
const LABELS = {
  languages: { en: "English", si: "Sinhala", ta: "Tamil", hi: "Hindi", sq: "Albanian" },
  models: { qwen: "Qwen", gemini: "Gemini" },
};

// Small helper to clear + repopulate a <select>
function fillSelect(selectEl, options, { labelMap = null, addBlank = false } = {}) {
  if (!selectEl) return;
  const prev = selectEl.value;
  selectEl.innerHTML = "";

  if (addBlank) {
    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = "-- Select --";
    selectEl.appendChild(blank);
  }

  options.forEach((val) => {
    const opt = document.createElement("option");
    opt.value = String(val);
    opt.textContent = labelMap?.[val] ?? String(val);
    selectEl.appendChild(opt);
  });

  // restore previous selection if possible
  if ([...selectEl.options].some((o) => o.value === prev)) {
    selectEl.value = prev;
  }
}

// Fetch config and fill dropdowns
async function loadConfigAndPopulate() {
  try {
    const res = await fetch(`${BASE_URL}/config`);
    if (!res.ok) throw new Error(`Failed to fetch /config (${res.status})`);
    const cfg = await res.json();

    fillSelect(document.getElementById("country"), cfg.countries || [], { addBlank: true });
    fillSelect(document.getElementById("language"), cfg.languages || [], { labelMap: LABELS.languages });
    fillSelect(document.getElementById("grade"), cfg.grades || []);
    fillSelect(document.getElementById("model"), cfg.models || [], { labelMap: LABELS.models });
    fillSelect(document.getElementById("topic"), cfg.topics || []);

  } catch (err) {
    console.warn("Could not load /config, keeping hardcoded options:", err);
  }
}

// Auto-run on pages with dropdowns
window.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("topic")) {
    loadConfigAndPopulate();
  }
});
