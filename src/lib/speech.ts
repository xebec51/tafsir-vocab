export function speakEnglish(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !text.trim()) return false;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text.trim());
  const voices = window.speechSynthesis.getVoices();
  const voice = voices.find((candidate) => candidate.lang.toLowerCase() === "en-us")
    ?? voices.find((candidate) => candidate.lang.toLowerCase().startsWith("en"));
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang ?? "en-US";
  utterance.rate = 0.82;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
  return true;
}
