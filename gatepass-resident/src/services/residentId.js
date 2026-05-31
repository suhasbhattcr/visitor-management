const RESIDENT_ID_KEY = "resident_id";

/**
 * Returns a stable 10-char base-36 ID for this browser/resident.
 * Created once and persisted in localStorage.
 */
export function getResidentId() {
  let id = localStorage.getItem(RESIDENT_ID_KEY);
  if (!id) {
    id = Math.random().toString(36).slice(2, 7) + Math.random().toString(36).slice(2, 7);
    id = id.slice(0, 10);
    localStorage.setItem(RESIDENT_ID_KEY, id);
  }
  return id;
}
