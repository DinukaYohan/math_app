// frontend/js/main.js

// --------- tiny helper ----------
const $ = (id) => document.getElementById(id);

// ===== History helpers (localStorage) =====
const HISTORY_KEY = "chatHistory";

function saveToHistory(item) {
  const list = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  list.unshift({
    ts: new Date().toISOString(),
    text: item,
    filters: {
      country: $("country")?.value || "",
      language: $("language")?.value || "",
      grade: $("grade")?.value || "",
      model: $("model")?.value || "",
      topic: $("topic")?.value || "",
    },
  });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 100)));
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
}

// Expose for history.html if you use it
window.loadHistory = loadHistory;
window.clearHistory = clearHistory;

// ===== Prompt builder (no free-text box) =====
function buildPromptFromFilters() {
  const country  = $("country")?.value || "any country";
  const language = $("language")?.value || "English";
  const grade    = $("grade")?.value || "?";
  const topicVal = $("topic")?.value || "addition";

  const topicNice = {
    addition: "addition",
    subtraction: "subtraction",
    multiplication: "multiplication",
    division: "division",
    fractions: "fractions",
  }[topicVal] || topicVal;

  return `Generate one ${topicNice} math question in ${language} for Grade ${grade} students (${country} curriculum). ` +
         `Provide the question, then on a new line provide "Answer: <value>".`;
}

// ===== Generate handler =====
async function submitPrompt() {
  const outEl = $("responseText");
  if (outEl) outEl.textContent = "Generating… please wait.";

  const country  = $("country")?.value || "";
  const language = $("language")?.value || "";
  const grade    = $("grade")?.value || "";
  const model    = $("model")?.value || "";
  const topic    = $("topic")?.value || "";

  // Auto-build the prompt from the filters
  const prompt = buildPromptFromFilters();

  // Payload you can send to the backend
  const payload = { prompt, country, language, grade, model, topic };

  // ===== Option A: CALL YOUR BACKEND (uncomment & set URL) =====
  // try {
  //   const res = await fetch("http://127.0.0.1:5000/api/generate", {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify(payload),
  //   });
  //   if (!res.ok) throw new Error(`Server error: ${res.status}`);
  //   const data = await res.json();
  //   const text = data?.text || "No response text received.";
  //   if (outEl) outEl.innerHTML = text.replace(/\n/g, "<br>");
  //   saveToHistory(text);
  //   return;
  // } catch (err) {
  //   console.error(err);
  //   if (outEl) outEl.textContent = `Error: ${err.message || "Network error"}`;
  //   return;
  // }

  // ===== Option B: FRONTEND-ONLY PREVIEW =====
  const preview = (() => {
    // Simple sample generation based on topic
    const samples = {
      addition:        { q: "What is 27 + 15?",  a: "42" },
      subtraction:     { q: "What is 58 − 19?",  a: "39" },
      multiplication:  { q: "What is 7 × 6?",    a: "42" },
      division:        { q: "What is 84 ÷ 2?",   a: "42" },
      fractions:       { q: "What is 3/7 + 3/7?", a: "6/7" },
    };
    const pick = samples[topic] || samples.addition;
    return `${pick.q}\nAnswer: ${pick.a}`;
  })();

  if (outEl) outEl.innerHTML = preview.replace(/\n/g, "<br>");
  saveToHistory(preview);
}

// Make available to inline onclick in HTML
window.submitPrompt = submitPrompt;

// No “New Chat” button anymore, but keep DOM-ready hook if needed later
window.addEventListener("DOMContentLoaded", () => {
  // place future startup wiring here
});
