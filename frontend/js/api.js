// js/api.js

// --- Base URL resolution ---
// Uses CONFIG.BASE_URL if present, otherwise falls back to global BASE_URL or "".
const __BASE =
  (typeof CONFIG !== "undefined" && CONFIG && CONFIG.BASE_URL) ||
  (typeof BASE_URL !== "undefined" ? BASE_URL : "");

// --- Core request helper (exported below as apiRequest) ---
async function apiRequest(path, { method = "GET", body, auth = false, silent401 = false } = {}) {
  const headers = { "Content-Type": "application/json" };

  if (auth) {
    const token = localStorage.getItem("token");
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${__BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Try parse JSON; if not JSON, keep empty object to avoid throws here
  const data = await res.json().catch(() => ({}));

  // Handle 401 centrally (token expired / not valid)
  if (res.status === 401 && auth && !silent401) {
    // Clear any stale session and send to login
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    // If we're not already on login, redirect
    if (!/login\.html$/i.test(location.pathname)) {
      window.location.href = "login.html";
    }
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const msg =
      data?.error ||
      data?.message ||
      (typeof data === "string" ? data : `Request failed (${res.status})`);
    throw new Error(msg);
  }

  return data;
}

// --- Public API wrapper ---
// Centralized endpoints used by the app. Adjust paths to match your Flask routes.
const API = {
  // expose the low-level requester in case other modules need it
  request: apiRequest,

  // ---------- AUTH ----------
  /**
   * Login and persist token/username to localStorage.
   * Expected backend response examples:
   *  { token: "...", user: { username: "vimu", ... } }
   *  or { token: "...", username: "vimu" }
   */
  async login(email, password) {
    // Adjust path to your backend auth route if different
    const data = await apiRequest("/api/auth/login", {
      method: "POST",
      body: { email, password },
    });

    const token = data?.token;
    const username = data?.user?.username || data?.username;

    if (token) localStorage.setItem("token", token);
    if (username) localStorage.setItem("username", username);

    return data;
  },

  /**
   * Signup (optional—remove if your app doesn’t use it yet)
   */
  async signup(payload) {
    // e.g. { username, email, password }
    return apiRequest("/api/auth/signup", {
      method: "POST",
      body: payload,
    });
  },

  // ---------- PROFILE ----------
  /**
   * Get the current logged-in user.
   * Expected response: { id, username, email, created_at, ... }
   */
  async getMe() {
    return apiRequest("/api/users/me", { auth: true });
  },

  /**
   * Update current user fields (e.g., { username, email }).
   */
  async updateMe(payload) {
    return apiRequest("/api/users/me", {
      method: "PUT",
      body: payload,
      auth: true,
    });
  },

  /**
   * Change password: { old_password, new_password }
   */
  async changePassword(payload) {
    return apiRequest("/api/users/me/password", {
      method: "POST",
      body: payload,
      auth: true,
    });
  },

  // ---------- HISTORY (optional; used by history.html) ----------
  async listHistory() {
    return apiRequest("/api/history", { auth: true });
  },

  async clearHistory() {
    return apiRequest("/api/history", { method: "DELETE", auth: true });
  },

  // ---------- GENERATION & REVIEW (optional; used by index.html) ----------
  /**
   * Example generator endpoint; adjust path and payload to your backend.
   * Params might include: country, language, grade, model, topic, learningObjective
   */
  async generate(params) {
    return apiRequest("/api/generate", { method: "POST", body: params, auth: true });
  },

  /**
   * Save a thumbs-up/down review for a session (example).
   * sessionId: string | number
   * payload: { rating: "up"|"down", note?: string }
   */
  async saveReview(sessionId, payload) {
    return apiRequest(`/api/sessions/${encodeURIComponent(sessionId)}/review`, {
      method: "POST",
      body: payload,
      auth: true,
    });
  },
};

// Expose globally
window.API = API;
window.apiRequest = apiRequest;
