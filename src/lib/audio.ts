export function wordAudioUrl(value?: string | null) {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return new URL(value.replace(/^\/+/, ""), "https://audio.qurancdn.com/").toString();
}

export function alignedWordAudio(value: string | null | undefined, location: string): string | null {
  if (!value || !/^\d+:\d+:\d+$/.test(location)) return null;
  try {
    const url = new URL(wordAudioUrl(value)!);
    const filename = location.split(":").map((part) => part.padStart(3, "0")).join("_") + ".mp3";
    return url.protocol === "https:" && url.hostname === "audio.qurancdn.com" && url.pathname === `/wbw/${filename}` ? url.toString() : null;
  } catch { return null; }
}
