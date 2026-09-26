export const PROGRESS_UPDATED_EVENT = "tafsir-vocab:progress-updated";

export function announceProgressUpdated() {
  window.dispatchEvent(new Event(PROGRESS_UPDATED_EVENT));
}
