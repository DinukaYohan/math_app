// frontend/js/config.js
const BASE_URL = "http://127.0.0.1:8080";


// Fill a <select> with options, preserving selection if still present
function fillSelect(selectEl, options, { addBlank = false } = {}) {
  if (!selectEl) return;
  const prev = selectEl.value;
  selectEl.innerHTML = "";

  if (addBlank) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "-- Select --";
    selectEl.appendChild(opt);
  }

  (options || []).forEach((val) => {
    const opt = document.createElement("option");
    opt.value = String(val);
    opt.textContent = String(val);
    selectEl.appendChild(opt);
  });

  if ([...selectEl.options].some((o) => o.value === prev)) {
    selectEl.value = prev;
  }
}

// Strict option-array equality (string compare)
function arraysEqual(a = [], b = []) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (String(a[i]) !== String(b[i])) return false;
  return true;
}

// Returns non-blank option values currently in a select
function getSelectOptions(selectEl) {
  return Array.from(selectEl.options)
    .map((o) => o.value)
    .filter((v) => v !== "");
}

// Read a control’s value safely
function getVal(id) {
  const el = document.getElementById(id);
  return el ? String(el.value).trim() : "";
}

//Bootstrap (initial fill)

async function loadBootstrap() {
  const res = await fetch(`${BASE_URL}/options/bootstrap`);
  if (!res.ok) throw new Error("Failed to load bootstrap options");
  const data = await res.json();

  // Base selects
  fillSelect(document.getElementById("country"), data.countries, { addBlank: true });
  fillSelect(document.getElementById("grade"), data.grades, { addBlank: true });
  fillSelect(document.getElementById("model"), data.models, { addBlank: false });

  // Language is dependent on country (+ grade), start empty/disabled
  const langSel = document.getElementById("language");
  fillSelect(langSel, [], { addBlank: true });
  langSel.disabled = true;

  // Dependent selects start empty/disabled
  const topicSel = document.getElementById("topic");
  const loSel = document.getElementById("learningObjective");
  fillSelect(topicSel, [], { addBlank: true });
  topicSel.disabled = true;
  fillSelect(loSel, [], { addBlank: true });
  loSel.disabled = true;

  const loHelp = document.getElementById("loHelp");
  if (loHelp) loHelp.classList.add("d-none");
}

//Language (country/grade filtered) 

// Track in-flight language requests to avoid race conditions
let langReqId = 0;

async function loadLanguages() {
  const country = getVal("country");
  const grade = getVal("grade"); // optional narrowing
  const langSel = document.getElementById("language");

  // Remember previous selection but DO NOT clear language yet (prevents flicker)
  const prevLang = langSel ? langSel.value : "";

  // Always reset downstream selects now
  const topicSel = document.getElementById("topic");
  const loSel = document.getElementById("learningObjective");
  const loHelp = document.getElementById("loHelp");

  if (topicSel) {
    topicSel.innerHTML = "";
    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = "-- Select --";
    topicSel.appendChild(blank);
    topicSel.disabled = true;
  }
  if (loSel) {
    loSel.innerHTML = "";
    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = "-- Select --";
    loSel.appendChild(blank);
    loSel.disabled = true;
  }
  if (loHelp) loHelp.classList.add("d-none");

  // If no country, also clear language and disable it
  if (!country) {
    if (langSel) {
      langSel.innerHTML = "";
      const blank = document.createElement("option");
      blank.value = "";
      blank.textContent = "-- Select --";
      langSel.appendChild(blank);
      langSel.disabled = true;
    }
    return;
  }

  // Start request (assign id so we can ignore stale responses)
  const myReqId = ++langReqId;

  // Subtle loading cue without disabling (prevents flicker)
  langSel?.classList.add("is-loading");

  // Build URL
  const url = new URL(`${BASE_URL}/options/languages`);
  url.searchParams.set("country", country);
  if (grade) url.searchParams.set("grade", grade);

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (myReqId !== langReqId) return; // stale response

    const langs = (data.languages || []).map(String);
    const current = getSelectOptions(langSel);

    // If the set of options hasn’t changed, keep UI stable and just ensure enabled state
    if (arraysEqual(current, langs)) {
      langSel.disabled = !(langs.length > 0);
      if (prevLang && langs.includes(prevLang)) {
        langSel.value = prevLang;
        await loadTopics(); // cascade if language preserved
      } else {
        // Ensure blank option exists & selection is blank
        if (!Array.from(langSel.options).some((o) => o.value === "")) {
          const blank = document.createElement("option");
          blank.value = "";
          blank.textContent = "-- Select --";
          langSel.insertBefore(blank, langSel.firstChild);
        }
        langSel.value = "";
      }
      return;
    }

    // Options changed to rebuild without disabling (avoid flicker)
    const frag = document.createDocumentFragment();
    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = "-- Select --";
    frag.appendChild(blank);
    for (const v of langs) {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      frag.appendChild(opt);
    }
    langSel.innerHTML = "";
    langSel.appendChild(frag);
    langSel.disabled = !(langs.length > 0);

    // Try to preserve previous selection if still valid
    if (prevLang && langs.includes(prevLang)) {
      langSel.value = prevLang;
      await loadTopics(); // cascade if preserved
    } else {
      langSel.value = ""; // force user to reselect
    }
  } catch (e) {
    console.warn("loadLanguages failed:", e);
    // Keep previous UI when failing; no flicker introduced
  } finally {
    langSel?.classList.remove("is-loading");
  }
}

//Topicscountry/grade/language

async function loadTopics() {
  const country = getVal("country");
  const grade = getVal("grade");
  const language = getVal("language");

  const topicSel = document.getElementById("topic");
  const loSel = document.getElementById("learningObjective");
  const loHelp = document.getElementById("loHelp");

  // Reset downstream
  fillSelect(topicSel, [], { addBlank: true });
  topicSel.disabled = true;
  fillSelect(loSel, [], { addBlank: true });
  loSel.disabled = true;
  if (loHelp) loHelp.classList.add("d-none");

  if (!(country && grade && language)) return;

  const res = await fetch(
    `${BASE_URL}/options/topics?country=${encodeURIComponent(country)}&grade=${encodeURIComponent(
      grade
    )}&language=${encodeURIComponent(language)}`
  );
  const data = await res.json();

  fillSelect(topicSel, data.topics || [], { addBlank: true });
  topicSel.disabled = !(data.topics && data.topics.length);
}

// Objectives (country/grade/language/topic)

async function loadObjectives() {
  const country = getVal("country");
  const grade = getVal("grade");
  const language = getVal("language");
  const topic = getVal("topic");

  const loSel = document.getElementById("learningObjective");
  const loHelp = document.getElementById("loHelp");

  fillSelect(loSel, [], { addBlank: true });
  loSel.disabled = true;
  if (loHelp) loHelp.classList.add("d-none");

  if (!(country && grade && language && topic)) return;

  const res = await fetch(
    `${BASE_URL}/options/objectives?country=${encodeURIComponent(country)}&grade=${encodeURIComponent(
      grade
    )}&language=${encodeURIComponent(language)}&topic=${encodeURIComponent(topic)}`
  );
  const data = await res.json();

  fillSelect(loSel, data.objectives || [], { addBlank: true });
  loSel.disabled = !(data.objectives && data.objectives.length);
  if (loHelp) loHelp.classList.toggle("d-none", !!(data.objectives && data.objectives.length));
}

// Wire events (avoid double reloads)

window.addEventListener("DOMContentLoaded", () => {
  if (!document.getElementById("topic")) return;

  loadBootstrap().catch(console.warn);

  // Country/Grade to refresh languages (and maybe topics if language preserved)
  document.getElementById("country")?.addEventListener("change", loadLanguages);
  document.getElementById("grade")?.addEventListener("change", loadLanguages);

  // Language to refresh topics
  document.getElementById("language")?.addEventListener("change", loadTopics);

  // Topic to refresh objectives
  document.getElementById("topic")?.addEventListener("change", loadObjectives);
});
