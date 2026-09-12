const WORKER_URL = import.meta.env.VITE_WORKER_URL;
const SECRET_STORAGE_KEY = "strava-manager-app-secret";

export function getStoredSecret() {
  return localStorage.getItem(SECRET_STORAGE_KEY) || "";
}

export function setStoredSecret(secret) {
  localStorage.setItem(SECRET_STORAGE_KEY, secret);
}

export function clearStoredSecret() {
  localStorage.removeItem(SECRET_STORAGE_KEY);
}

async function request(path, options = {}) {
  const secret = getStoredSecret();
  const resp = await fetch(`${WORKER_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-App-Secret": secret,
      ...(options.headers || {}),
    },
  });

  if (!resp.ok) {
    let message = `Request failed (${resp.status})`;
    try {
      const body = await resp.json();
      message = body.message || body.error || message;
    } catch {
      // ignore parse errors, use default message
    }
    throw new Error(message);
  }

  return resp.json();
}

export function getStatus() {
  return request("/api/status");
}

export function getAthlete() {
  return request("/api/athlete");
}

export function getActivities(page, perPage = 20) {
  return request(`/api/activities?page=${page}&per_page=${perPage}`);
}

export function getActivityDetail(id) {
  return request(`/api/activities/${id}`);
}

export function updateActivity(id, fields) {
  return request(`/api/activities/${id}`, {
    method: "PUT",
    body: JSON.stringify(fields),
  });
}

export function getKudos(id) {
  return request(`/api/activities/${id}/kudos?per_page=50`);
}

export function getComments(id) {
  return request(`/api/activities/${id}/comments?per_page=50`);
}

export function logout() {
  return request("/api/logout", { method: "POST" });
}

export function loginUrl(secret) {
  return `${WORKER_URL}/login?secret=${encodeURIComponent(secret)}`;
}
