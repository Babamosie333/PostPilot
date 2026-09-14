const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const TOKEN_KEY = "postpilot_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    let body = null;
    try {
      body = await res.json();
    } catch {
      // ignore parse errors
    }
    if (res.status === 401) {
      setToken(null);
    }
    const err = new Error(body?.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.banned = body?.banned;
    err.banReason = body?.banReason;
    throw err;
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const api = {
  base: BASE_URL,

  // --- auth --- (LinkedIn is the only sign-in method — see AuthContext's
  // loginWithLinkedIn, which does a full-page redirect rather than a fetch)
  me: () => request("/api/users/me"),
  devLogin: (email, secret) =>
    request("/api/auth/dev-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, secret }),
    }),

  // --- linkedin ---
  linkedinStatus: () => request("/api/auth/linkedin/status"),

  // --- posts ---
  listPosts: (status) =>
    request(`/api/posts${status ? `?status=${status}` : ""}`),

  generatePost: (formData) =>
    request("/api/posts/generate", { method: "POST", body: formData }),

  updatePost: (id, patch) =>
    request(`/api/posts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }),

  schedulePost: (id, scheduledFor) =>
    request(`/api/posts/${id}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledFor }),
    }),

  postNow: (id) => request(`/api/posts/${id}/post-now`, { method: "POST" }),

  regeneratePost: (id, tone) =>
    request(`/api/posts/${id}/regenerate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tone }),
    }),

  refreshStats: (id) => request(`/api/posts/${id}/refresh-stats`, { method: "POST" }),

  deletePost: (id) => request(`/api/posts/${id}`, { method: "DELETE" }),

  imageUrl: (path) => {
    if (!path) return null;
    const filename = path.split("/").pop();
    return `${BASE_URL}/uploads/${filename}`;
  },

  // --- analytics ---
  analyticsSummary: () => request("/api/analytics/summary"),

  // --- github recap ---
  saveGithub: (username, token) =>
    request("/api/users/me/github", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, token }),
    }),
  triggerRecap: () => request("/api/posts/github-recap", { method: "POST" }),

  // --- admin ---
  adminListUsers: () => request("/api/admin/users"),
  adminBanUser: (id, reason) =>
    request(`/api/admin/users/${id}/ban`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    }),
  adminUnbanUser: (id) => request(`/api/admin/users/${id}/unban`, { method: "POST" }),
};
