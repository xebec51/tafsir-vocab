"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { MODE_LABELS, SENTENCE_MODES, type SentenceMode } from "@/lib/sentence-quiz";
import type { getSentenceSession } from "@/lib/sentence-sessions";

export default function SentencePracticeLauncher({ page, segmentId, scope = "page", label = "Start practice", listening = false, retrySessionId, compact = false, initialMode = "ARABIC_TO_ENGLISH", onStarted, prepare = false }: {
  page?: number; segmentId?: string; scope?: "page" | "due" | "weak"; label?: string; listening?: boolean; retrySessionId?: string; compact?: boolean;
  initialMode?: SentenceMode; onStarted?: (session: Awaited<ReturnType<typeof getSentenceSession>>) => void;
  prepare?: boolean;
}) {
  const [mode, setMode] = useState<SentenceMode>(initialMode === "LISTENING" && !listening ? "ARABIC_TO_ENGLISH" : initialMode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef<string | null>(null);
  const lock = useRef(false);
  const prepared = useRef<Promise<{ id: string; session?: Awaited<ReturnType<typeof getSentenceSession>> }> | null>(null);
  const router = useRouter();
  const requestSession = useCallback(() => {
    if (prepared.current) return prepared.current;
    requestId.current ??= crypto.randomUUID();
    const payload = { requestId: requestId.current, mode, scope, page, segmentId, retrySessionId };
    prepared.current = (async () => {
      const response = await fetch("/api/sentences/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) { if (response.status < 500 && requestId.current === payload.requestId) requestId.current = null; throw new Error(result.error || "Practice could not be started."); }
      return result;
    })();
    return prepared.current;
  }, [mode, scope, page, segmentId, retrySessionId]);
  useEffect(() => {
    if (prepare) void requestSession().catch(() => {});
  }, [prepare, requestSession]);
  async function start() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      const result = await requestSession();
      if (onStarted && result.session) {
        window.history.replaceState(null, "", `/sentences/practice?session=${result.id}`);
        onStarted(result.session);
      } else router.push(`/sentences/practice?session=${result.id}`);
    } catch (cause) { prepared.current = null; setError(cause instanceof Error ? cause.message : "Connection failed. Please retry."); setBusy(false); lock.current = false; }
  }
  return <div className={`sentence-launcher ${compact ? "compact" : ""}`}>
    <label><span className="tiny">Practice mode</span><select aria-label="Sentence practice mode" value={mode} disabled={busy} onChange={(event) => { setMode(event.target.value as SentenceMode); requestId.current = null; prepared.current = null; }}>{SENTENCE_MODES.map((value) => <option key={value} value={value} disabled={value === "LISTENING" && !listening}>{MODE_LABELS[value]}{value === "LISTENING" && !listening ? " — audio pending verification" : ""}</option>)}</select></label>
    <button type="button" className="button button-primary" disabled={busy} onClick={() => void start()}>{busy ? "Opening practice..." : label}<ArrowRight size={17} /></button>
    {error ? <p className="notice notice-error" role="alert">{error}</p> : null}
  </div>;
}
