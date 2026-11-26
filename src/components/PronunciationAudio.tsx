"use client";
import { useEffect, useId, useRef, useState } from "react";
import { LoaderCircle, Pause, Volume2 } from "lucide-react";
import { speakEnglish } from "@/lib/speech";

const AUDIO_STARTED = "tv-pronunciation-started";

export function EnglishPronunciation({ text }: { text: string }) {
  const id = useId();
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => () => { window.speechSynthesis?.cancel(); }, [text]);
  const label = `Hear English pronunciation: ${text}`;
  return <span className="pronunciation-audio"><button type="button" className="audio-button audio-button-secondary" title={label} aria-label={label} onClick={() => { window.dispatchEvent(new CustomEvent(AUDIO_STARTED, { detail: id })); setUnavailable(!speakEnglish(text)); }}><Volume2 size={18} /></button>{unavailable ? <span role="status" className="audio-error">English pronunciation is unavailable in this browser.</span> : null}</span>;
}

export default function PronunciationAudio({ src, label, native = false }: { src: string; label: string; native?: boolean }) {
  const id = useId();
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const stop = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== id) audio.current?.pause();
    };
    window.addEventListener(AUDIO_STARTED, stop);
    const element = audio.current;
    return () => { window.removeEventListener(AUDIO_STARTED, stop); element?.pause(); };
  }, [id, src]);
  function announcePlayback() {
    window.dispatchEvent(new CustomEvent(AUDIO_STARTED, { detail: id }));
    window.speechSynthesis?.cancel();
    setPlaying(true); setLoading(false);
  }
  async function toggle() {
    const element = audio.current;
    if (!element) return;
    if (!element.paused) { element.pause(); return; }
    if (element.error) element.load();
    setError(""); setLoading(true);
    try { await element.play(); }
    catch { setError("Audio could not play. Tap to retry."); setPlaying(false); }
    finally { setLoading(false); }
  }
  return <span className={`pronunciation-audio ${native ? "native" : ""}`}>
    <audio ref={audio} src={src} controls={native} preload="none" aria-label={label} onPlay={announcePlayback} onPlaying={() => setLoading(false)} onWaiting={() => setLoading(true)} onPause={() => { setPlaying(false); setLoading(false); }} onEnded={() => { setPlaying(false); setLoading(false); }} onError={() => { setError("Audio unavailable. Tap to retry."); setLoading(false); setPlaying(false); }} />
    {!native ? <button type="button" className="audio-button" title={error || label} aria-label={label} aria-pressed={playing} aria-busy={loading} onClick={() => void toggle()}>{loading ? <LoaderCircle size={18} className="audio-loading" /> : playing ? <Pause size={18} /> : <Volume2 size={18} />}</button> : null}
    {error ? <span role="status" className="audio-error">{error}</span> : null}
  </span>;
}
