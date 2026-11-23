"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { MODE_LABELS, SENTENCE_MODES, type SentenceMode } from "@/lib/sentence-quiz";

export default function SentencePracticeLauncher({ page, segmentId, scope = "page", label = "Start practice", listening = false, retrySessionId, compact = false }: {
  page?: number; segmentId?: string; scope?: "page" | "due" | "weak"; label?: string; listening?: boolean; retrySessionId?: string; compact?: boolean;
}) {
  const [mode, setMode] = useState<SentenceMode>("ARABIC_TO_ENGLISH");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef<string | null>(null);
  const lock = useRef(false);
  const router = useRouter();
  async function start() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    requestId.current ??= crypto.randomUUID();
    try {
      const response = await fetch("/api/sentences/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: requestId.current, mode, scope, page, segmentId, retrySessionId }) });
      const result = await response.json();
      if (!response.ok) { if (response.status < 500) requestId.current = null; throw new Error(result.error || "Practice could not be started."); }
      router.push(`/sentences/practice?session=${result.id}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Connection failed. Please retry."); setBusy(false); lock.current = false; }
  }
  return <div className={`sentence-launcher ${compact ? "compact" : ""}`}>
    <label><span className="tiny">Practice mode</span><select aria-label="Sentence practice mode" value={mode} disabled={busy} onChange={(event) => { setMode(event.target.value as SentenceMode); requestId.current = null; }}>{SENTENCE_MODES.map((value) => <option key={value} value={value} disabled={value === "LISTENING" && !listening}>{MODE_LABELS[value]}{value === "LISTENING" && !listening ? " — audio pending verification" : ""}</option>)}</select></label>
    <button type="button" className="button button-primary" disabled={busy} onClick={() => void start()}>{busy ? "Opening practice..." : label}<ArrowRight size={17} /></button>
    {error ? <p className="notice notice-error" role="alert">{error}</p> : null}
  </div>;
}
