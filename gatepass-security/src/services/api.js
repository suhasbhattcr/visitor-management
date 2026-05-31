const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4001";
const REQUEST_TIMEOUT_MS = 15_000;

async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      signal: controller.signal,
      ...options,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Request failed");
    return data;
  } finally {
    clearTimeout(timer);
  }
}

export async function createDeliveries(payload) {
  return request("/deliveries", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchDeliveries(filters = {}) {
  const search = new URLSearchParams(filters);
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return request(`/deliveries${suffix}`);
}

export async function fetchRecentVisitors() {
  return request("/deliveries/recent-visitors");
}

export async function approveDelivery(id) {
  return request(`/deliveries/${id}/approve`, { method: "POST" });
}

export async function rejectDelivery(id) {
  return request(`/deliveries/${id}/reject`, { method: "POST" });
}

export async function exitVisitor(id) {
  return request(`/deliveries/${id}/exit-visitor`, { method: "POST" });
}

export async function fetchPreregistrations(filters = {}) {
  const search = new URLSearchParams(filters);
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return request(`/preregistrations${suffix}`);
}

export async function fetchInstructionsMulti(units) {
  return request(`/instructions/multi?units=${units.map(encodeURIComponent).join(",")}`);
}

export async function fetchWatchlist() {
  return request("/watchlist");
}

export async function addToWatchlist(data) {
  return request("/watchlist", { method: "POST", body: JSON.stringify(data) });
}

export async function removeFromWatchlist(id) {
  return request(`/watchlist/${id}`, { method: "DELETE" });
}

export async function checkWatchlist(name, phone) {
  const params = new URLSearchParams();
  if (name) params.set("name", name);
  if (phone) params.set("phone", phone);
  return request(`/watchlist/check?${params.toString()}`);
}
