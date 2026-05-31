const KEY = "security_officer_id";

export function getOfficerId() {
  let id = localStorage.getItem(KEY);
  if (!id) {
    // 10-char base-36 random ID — short enough for URL/thread keys, unique enough for a small team
    id = Math.random().toString(36).slice(2, 7) + Math.random().toString(36).slice(2, 7);
    localStorage.setItem(KEY, id);
  }
  return id;
}
