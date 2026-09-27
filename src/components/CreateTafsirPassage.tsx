"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

type VerseOption = { surah: number; ayah: number; surahName: string };

export default function CreateTafsirPassage({ verses }: { verses: VerseOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [surah, setSurah] = useState(15);
  const [startAyah, setStartAyah] = useState(1);
  const [endAyah, setEndAyah] = useState(1);
  const [specificAyahs, setSpecificAyahs] = useState("");
  const [title, setTitle] = useState("");
  const [theme, setTheme] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const ayahs = useMemo(() => verses.filter((verse) => verse.surah === surah).map((verse) => verse.ayah), [surah, verses]);

  async function create() {
    if (saving) return;
    setSaving(true); setMessage("");
    const selectedAyahs = specificAyahs.split(",").map((item) => Number(item.trim())).filter((item) => Number.isInteger(item));
    try {
      const response = await fetch("/api/tafsir-passages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, theme, surah, startAyah, endAyah, selectedAyahs }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Passage could not be created.");
      router.push(`/tafsir-notes/passages/${payload.id}`);
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Passage could not be created."); }
    finally { setSaving(false); }
  }

  return <section className="create-passage">
    <div><span className="section-label">Your thematic library</span><h2>Passages, not duplicate notes</h2><p>Create one manual document for a connected discussion, while retaining each ayah's own notes as an exception.</p></div>
    <button className="button button-primary" type="button" onClick={() => setOpen((value) => !value)}><Plus size={17} /> Create passage</button>
    {open ? <div className="create-passage-form">
      <label className="notes-field"><span>Passage title</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="For example: Allah preserves His revelation" /></label>
      <label className="notes-field"><span>Theme (optional)</span><input value={theme} onChange={(event) => setTheme(event.target.value)} placeholder="A concise thematic anchor" /></label>
      <label className="notes-field"><span>Surah</span><select value={surah} onChange={(event) => { const next = Number(event.target.value); setSurah(next); setStartAyah(verses.find((verse) => verse.surah === next)?.ayah ?? 1); setEndAyah(verses.find((verse) => verse.surah === next)?.ayah ?? 1); }}><option value={15}>Al-Hijr</option><option value={16}>An-Nahl</option></select></label>
      <label className="notes-field"><span>From ayah</span><select value={startAyah} onChange={(event) => setStartAyah(Number(event.target.value))}>{ayahs.map((ayah) => <option value={ayah} key={ayah}>{ayah}</option>)}</select></label>
      <label className="notes-field"><span>To ayah</span><select value={endAyah} onChange={(event) => setEndAyah(Number(event.target.value))}>{ayahs.map((ayah) => <option value={ayah} key={ayah}>{ayah}</option>)}</select></label>
      <label className="notes-field full"><span>Or choose specific ayat</span><input value={specificAyahs} onChange={(event) => setSpecificAyahs(event.target.value)} placeholder="Optional comma-separated ayat, for example: 9, 10, 12" /><small>Specific choices replace the range and remain in their Quranic order.</small></label>
      <div className="create-passage-actions"><button className="button button-primary" type="button" disabled={saving || title.trim().length < 2} onClick={() => void create()}>{saving ? "Creating..." : "Create and write notes"}</button>{message ? <p className="save-message error" role="status">{message}</p> : null}</div>
    </div> : null}
  </section>;
}
