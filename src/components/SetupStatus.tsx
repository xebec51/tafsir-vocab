"use client";
import { useEffect, useState } from "react";

type Status = { database: boolean; pages: number; occurrences: number; quranFoundationConfigured: boolean; quranFoundationEnvironment: string; ready: boolean };
export default function SetupStatus() {
  const [status, setStatus] = useState<Status | null>(null);
  useEffect(() => { fetch("/api/health", { cache: "no-store" }).then((r) => r.json()).then(setStatus).catch(() => setStatus({ database: false, pages: 0, occurrences: 0, quranFoundationConfigured: false, quranFoundationEnvironment: "unknown", ready: false })); }, []);
  if (!status) return <div className="empty-state">Checking setup…</div>;
  const items = [
    ["PostgreSQL", status.database, status.database ? "Connected" : "Not connected"],
    ["20 Juz 14 units", status.pages === 20, `${status.pages}/20 seeded`],
    ["Qur'an vocabulary", status.occurrences > 0, `${status.occurrences} word occurrences`],
    ["Quran Foundation", status.quranFoundationConfigured, status.quranFoundationConfigured ? `${status.quranFoundationEnvironment} credentials configured` : "Credentials missing"]
  ] as const;
  return <div className="setup-list">{items.map(([label, ok, detail]) => <div className="setup-row" key={label}><span className={`setup-dot ${ok ? "ok" : "missing"}`}>{ok ? "✓" : "!"}</span><div><strong>{label}</strong><p>{detail}</p></div></div>)}<div className={`setup-banner ${status.ready ? "ready" : "pending"}`}><strong>{status.ready ? "Course is ready" : "Setup still needs data"}</strong><span>{status.ready ? "You can use all Juz 14 lessons and progress features." : "Follow the commands below, then refresh this page."}</span></div></div>;
}
