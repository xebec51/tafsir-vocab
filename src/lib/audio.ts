export function wordAudioUrl(value?: string | null) {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return new URL(value.replace(/^\/+/, ""), "https://audio.qurancdn.com/").toString();
}
