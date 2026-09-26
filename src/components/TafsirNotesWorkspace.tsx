"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpenText, Check, ChevronDown, Clock3, Languages, Link2, ListChecks,
  Mic2, Pencil, Plus, RotateCcw, Save, ScrollText, Sparkles, Trash2
} from "lucide-react";
import { announceProgressUpdated } from "@/lib/progress-client";
import { REFERENCE_NAMES, type TafsirDocument, type TafsirVocabularyInput } from "@/lib/tafsir-notes";

type Mode = "reading" | "memorization" | "competition";

type WorkspaceProps = {
  surah: number;
  ayah: number;
  surahName: string;
  arabicText: string;
  initialDocument: TafsirDocument;
  hasSavedNotes: boolean;
  randomHref: string;
  initialMode?: Mode;
};

function lines(value: string) {
  return value.split(/\r?\n/).map((item) => item.replace(/^[-*\d.)\s]+/, "").trim()).filter(Boolean);
}

function ReadText({ value, empty = "No notes yet." }: { value: string; empty?: string }) {
  const items = lines(value);
  if (!items.length) return <p className="notes-empty">{empty}</p>;
  return items.length === 1 ? <p className="notes-prose">{items[0]}</p> : <ul className="notes-list">{items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul>;
}

function NoteField({ label, value, onChange, placeholder, rows = 4 }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; rows?: number }) {
  return <label className="notes-field"><span>{label}</span><textarea rows={rows} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>;
}

function NoteSelect({ value, onChange }: { value: TafsirDocument["hasAsbab"]; onChange: (value: TafsirDocument["hasAsbab"]) => void }) {
  return <label className="notes-field"><span>Does this ayah have a specific asbabun nuzul?</span><select value={value} onChange={(event) => onChange(event.target.value as TafsirDocument["hasAsbab"])}><option value="unknown">Not established yet</option><option value="yes">Yes</option><option value="no">No specific report</option></select></label>;
}

function SectionCard({ icon, title, preview, children, open = false }: { icon: React.ReactNode; title: string; preview: string; children: React.ReactNode; open?: boolean }) {
  return <details className="notes-section" open={open}><summary><span className="notes-section-icon">{icon}</span><span><strong>{title}</strong><small>{preview}</small></span><ChevronDown className="notes-chevron" size={19} /></summary><div className="notes-section-body">{children}</div></details>;
}

function VocabularyEditor({ rows, onChange }: { rows: TafsirVocabularyInput[]; onChange: (rows: TafsirVocabularyInput[]) => void }) {
  function update(index: number, key: keyof TafsirVocabularyInput, value: string) {
    onChange(rows.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row));
  }
  return <div className="vocabulary-editor">
    {rows.map((row, index) => <div className="vocabulary-edit-row" key={index}>
      <label><span>Arabic word</span><input className="arabic-input" dir="rtl" lang="ar" value={row.arabicWord} onChange={(event) => update(index, "arabicWord", event.target.value)} /></label>
      <label><span>Transliteration</span><input value={row.transliteration} onChange={(event) => update(index, "transliteration", event.target.value)} /></label>
      <label><span>English meaning</span><input value={row.meaning} onChange={(event) => update(index, "meaning", event.target.value)} /></label>
      <label><span>Root</span><input value={row.root} onChange={(event) => update(index, "root", event.target.value)} /></label>
      <label className="vocabulary-context"><span>Importance in tafsir context</span><textarea rows={2} value={row.explanation} onChange={(event) => update(index, "explanation", event.target.value)} /></label>
      <button className="icon-button vocabulary-delete" type="button" onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))} aria-label={`Remove vocabulary row ${index + 1}`} title="Remove word"><Trash2 size={17} /></button>
    </div>)}
    <button className="button button-secondary add-row-button" type="button" onClick={() => onChange([...rows, { arabicWord: "", transliteration: "", root: "", meaning: "", explanation: "" }])}><Plus size={17} /> Add word</button>
  </div>;
}

function VocabularyReading({ rows }: { rows: TafsirVocabularyInput[] }) {
  const visible = rows.filter((row) => row.arabicWord || row.meaning);
  if (!visible.length) return <p className="notes-empty">No vocabulary has been selected yet.</p>;
  return <div className="notes-vocabulary-grid">{visible.map((row, index) => <div className="notes-vocabulary-item" key={`${row.arabicWord}-${index}`}><div><span className="arabic-small" dir="rtl" lang="ar">{row.arabicWord}</span><strong>{row.meaning}</strong></div><span>{[row.transliteration, row.root ? `Root ${row.root}` : ""].filter(Boolean).join(" · ")}</span>{row.explanation ? <p>{row.explanation}</p> : null}</div>)}</div>;
}

function CompetitionMode({ document, randomHref }: { document: TafsirDocument; randomHref: string }) {
  const [seconds, setSeconds] = useState(15 * 60);
  const [running, setRunning] = useState(false);
  const [answer, setAnswer] = useState("");
  const [showModel, setShowModel] = useState(false);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setSeconds((value) => {
      if (value <= 1) {
        setRunning(false);
        return 0;
      }
      return value - 1;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [running]);
  const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
  const remainder = String(seconds % 60).padStart(2, "0");
  function reset() { setSeconds(15 * 60); setRunning(false); setAnswer(""); setShowModel(false); }
  return <section className="competition-workspace">
    <div className="competition-bar"><div><span className="section-label">Musabaqah simulation</span><strong><Clock3 size={19} /> {minutes}:{remainder}</strong></div><div className="toolbar"><button className="button button-secondary" type="button" onClick={() => setRunning((value) => !value)}>{running ? "Pause" : seconds === 15 * 60 ? "Start timer" : "Resume"}</button><button className="icon-button" type="button" onClick={reset} aria-label="Reset simulation" title="Reset"><RotateCcw size={18} /></button></div></div>
    <div className="competition-question"><span>Questions from judges</span><ReadText value={document.judgeQuestions} empty="Add possible judge questions in Edit notes." /></div>
    <label className="notes-field"><span>Your answer in English</span><textarea rows={10} value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Structure your answer: theme, lexical evidence, interpretation, and connection..." /></label>
    <div className="competition-actions"><button className="button button-primary" type="button" disabled={!answer.trim()} onClick={() => setShowModel(true)}><Check size={17} /> Compare answer</button><Link className="button button-secondary" prefetch={false} href={randomHref}>Random ayah</Link></div>
    {showModel ? <div className="model-answer"><span className="section-label">Model answer</span><ReadText value={document.modelAnswers} empty="A model answer has not been written for this ayah." /><span className="section-label">Presentation phrases</span><ReadText value={document.presentationPhrases} empty="No presentation phrases yet." /></div> : null}
  </section>;
}

export default function TafsirNotesWorkspace({ surah, ayah, surahName, arabicText, initialDocument, hasSavedNotes, randomHref, initialMode = "reading" }: WorkspaceProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [editing, setEditing] = useState(!hasSavedNotes);
  const [document, setDocument] = useState<TafsirDocument>(initialDocument);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const points = useMemo(() => lines(document.interpretationPoints), [document.interpretationPoints]);

  function setField<K extends keyof TafsirDocument>(key: K, value: TafsirDocument[K]) {
    setDocument((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/tafsir-notes/${surah}/${ayah}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(document) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Notes could not be saved.");
      setEditing(false);
      setMessage("Notes saved.");
      announceProgressUpdated();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Notes could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  function updateKeyword(index: number, key: "arabic" | "meaning", value: string) {
    setField("keywords", document.keywords.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  }

  return <>
    <section className="notes-verse-hero">
      <div className="notes-verse-meta"><span className="kicker">{surahName} {surah}:{ayah}</span><div className="notes-actions"><button className="button button-secondary" type="button" onClick={() => setEditing((value) => !value)}><Pencil size={17} /> {editing ? "Preview" : "Edit notes"}</button>{editing ? <button className="button button-primary" type="button" disabled={saving} onClick={() => void save()}><Save size={17} /> {saving ? "Saving..." : "Save notes"}</button> : null}</div></div>
      <div className="notes-ayah arabic" dir="rtl" lang="ar">{arabicText}</div>
      {editing ? <><NoteField label="English translation" value={document.translation} onChange={(value) => setField("translation", value)} placeholder="Add a trusted English translation for study context." rows={3} /><NoteField label="Main theme" value={document.theme} onChange={(value) => setField("theme", value)} placeholder="For example: Preservation of the Qur'an" rows={2} /></> : <div className="notes-quick-summary"><div><span>Theme</span><strong>{document.theme || "Theme not added yet"}</strong></div><div><span>Quick summary</span><p>{document.englishExplanation || document.summaryIndonesian || "Add a concise tafsir summary to anchor this ayah."}</p></div></div>}
      {message ? <div className={message === "Notes saved." ? "save-message success" : "save-message error"} role="status">{message}</div> : null}
    </section>

    <div className="notes-mode-switch" role="group" aria-label="Tafsir notes study mode">
      <button className={mode === "reading" ? "active" : ""} type="button" onClick={() => setMode("reading")}><BookOpenText size={17} /> Reading</button>
      <button className={mode === "memorization" ? "active" : ""} type="button" onClick={() => setMode("memorization")}><Sparkles size={17} /> Memorization</button>
      <button className={mode === "competition" ? "active" : ""} type="button" onClick={() => setMode("competition")}><Mic2 size={17} /> Competition</button>
    </div>

    {mode === "memorization" ? <section className="memorization-sheet"><div><span className="section-label">Theme</span><h2>{document.theme || "Add the central theme"}</h2></div><div><span className="section-label">Key interpretation points</span>{points.length ? <ol>{points.map((point, index) => <li key={`${point}-${index}`}>{point}</li>)}</ol> : <p className="notes-empty">Add one point per line in Reading mode.</p>}</div><div><span className="section-label">Keywords and vocabulary</span><VocabularyReading rows={document.vocabulary} /></div></section> : null}
    {mode === "competition" ? <CompetitionMode document={document} randomHref={randomHref} /> : null}

    {mode === "reading" ? <section className="notes-sections" aria-label="Structured tafsir notes">
      <SectionCard icon={<BookOpenText size={20} />} title="Tafsir" preview={document.summaryIndonesian || "Summary, references, interpretation, and lessons"} open>
        {editing ? <div className="notes-form-grid"><NoteField label="Tafsir summary (Bahasa Indonesia)" value={document.summaryIndonesian} onChange={(value) => setField("summaryIndonesian", value)} placeholder="Ringkas makna ayat secara akurat dan mudah diingat." /><NoteField label="Key interpretation points" value={document.interpretationPoints} onChange={(value) => setField("interpretationPoints", value)} placeholder="One point per line" /><div className="notes-subsection full"><h3>Tafsir references</h3><div className="reference-grid">{REFERENCE_NAMES.map((name) => <NoteField key={name} label={name} value={document.references[name] ?? ""} onChange={(value) => setField("references", { ...document.references, [name]: value })} placeholder="Page, volume, or concise note" rows={2} />)}</div></div><div className="notes-subsection full"><h3>Lessons and reflection</h3><div className="notes-form-grid"><NoteField label="Aqidah lessons" value={document.aqidahLessons} onChange={(value) => setField("aqidahLessons", value)} placeholder="Belief and creed lessons" /><NoteField label="Moral lessons" value={document.moralLessons} onChange={(value) => setField("moralLessons", value)} placeholder="Character and ethical lessons" /><NoteField label="Practical application" value={document.practicalApplication} onChange={(value) => setField("practicalApplication", value)} placeholder="How this ayah guides action" /><NoteField label="Da'wah points" value={document.dawahPoints} onChange={(value) => setField("dawahPoints", value)} placeholder="Points useful in da'wah" /></div></div></div> : <><span className="section-label">Ringkasan</span><ReadText value={document.summaryIndonesian} /><span className="section-label">Key interpretation points</span><ReadText value={document.interpretationPoints} /><span className="section-label">Lessons and reflection</span><div className="reading-columns"><ReadText value={document.aqidahLessons} empty="No aqidah lessons yet." /><ReadText value={document.practicalApplication} empty="No practical applications yet." /></div></>}
      </SectionCard>

      <SectionCard icon={<Link2 size={20} />} title="Munasabah" preview={document.previousConnection || "Connections within the passage and surah"}>
        {editing ? <div className="notes-form-grid"><NoteField label="Connection with the previous ayah" value={document.previousConnection} onChange={(value) => setField("previousConnection", value)} placeholder="How does the previous ayah prepare this meaning?" /><NoteField label="Connection with the next ayah" value={document.nextConnection} onChange={(value) => setField("nextConnection", value)} placeholder="How does the discussion continue?" /><NoteField label="Connection with the surah's main theme" value={document.surahThemeConnection} onChange={(value) => setField("surahThemeConnection", value)} placeholder="Place this ayah in the surah's central message." /><NoteField label="Structural connection" value={document.structureConnection} onChange={(value) => setField("structureConnection", value)} placeholder="Explain the flow and structure of the passage." /></div> : <div className="reading-columns"><div><span className="section-label">Previous ayah</span><ReadText value={document.previousConnection} /></div><div><span className="section-label">Next ayah</span><ReadText value={document.nextConnection} /></div><div><span className="section-label">Surah theme</span><ReadText value={document.surahThemeConnection} /></div><div><span className="section-label">Structure</span><ReadText value={document.structureConnection} /></div></div>}
      </SectionCard>

      <SectionCard icon={<ScrollText size={20} />} title="Asbabun Nuzul" preview={document.hasAsbab === "yes" ? document.asbabBackground || "A related report is recorded" : document.hasAsbab === "no" ? "No specific report" : "Status not established"}>
        {editing ? <div className="notes-form-grid"><NoteSelect value={document.hasAsbab} onChange={(value) => setField("hasAsbab", value)} /><NoteField label="Background of revelation" value={document.asbabBackground} onChange={(value) => setField("asbabBackground", value)} placeholder="Describe the reported historical setting." /><NoteField label="Related narration" value={document.asbabNarration} onChange={(value) => setField("asbabNarration", value)} placeholder="Summarize the relevant riwayah." /><NoteField label="Source" value={document.asbabSource} onChange={(value) => setField("asbabSource", value)} placeholder="Tafsir or hadith source" /><NoteField label="Validity" value={document.asbabValidity} onChange={(value) => setField("asbabValidity", value)} placeholder="For example: sahih, hasan, weak, or disputed" /></div> : <><div className="asbab-status">{document.hasAsbab === "yes" ? "Specific report recorded" : document.hasAsbab === "no" ? "No specific report recorded" : "Not established yet"}</div><ReadText value={document.asbabBackground} /><span className="section-label">Riwayah and source</span><ReadText value={[document.asbabNarration, document.asbabSource, document.asbabValidity].filter(Boolean).join("\n")} /></>}
      </SectionCard>

      <SectionCard icon={<Languages size={20} />} title="English Explanation" preview={document.englishExplanation || "Competition-ready tafsir explanation"}>
        {editing ? <NoteField label="English tafsir explanation" value={document.englishExplanation} onChange={(value) => setField("englishExplanation", value)} placeholder="Explain the meaning, context, and significance in clear competition-ready English." rows={10} /> : <ReadText value={document.englishExplanation} />}
      </SectionCard>

      <SectionCard icon={<ListChecks size={20} />} title="Vocabulary" preview={`${document.vocabulary.length} selected words`}>
        {editing ? <><div className="notes-subsection"><h3>Ayah keywords</h3>{document.keywords.map((keyword, index) => <div className="keyword-edit-row" key={index}><input className="arabic-input" dir="rtl" lang="ar" value={keyword.arabic} onChange={(event) => updateKeyword(index, "arabic", event.target.value)} placeholder="كلمة" /><input value={keyword.meaning} onChange={(event) => updateKeyword(index, "meaning", event.target.value)} placeholder="English meaning" /><button className="icon-button" type="button" onClick={() => setField("keywords", document.keywords.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove keyword ${index + 1}`}><Trash2 size={16} /></button></div>)}<button className="button button-secondary add-row-button" type="button" onClick={() => setField("keywords", [...document.keywords, { arabic: "", meaning: "" }])}><Plus size={17} /> Add keyword</button></div><VocabularyEditor rows={document.vocabulary} onChange={(value) => setField("vocabulary", value)} /></> : <VocabularyReading rows={document.vocabulary} />}
      </SectionCard>

      <SectionCard icon={<Mic2 size={20} />} title="Musabaqah Notes" preview={document.judgeQuestions || "Judge questions, model answers, and presentation phrases"}>
        {editing ? <div className="notes-form-grid"><NoteField label="Possible questions from judges" value={document.judgeQuestions} onChange={(value) => setField("judgeQuestions", value)} placeholder="One possible question per line" /><NoteField label="Model answers in English" value={document.modelAnswers} onChange={(value) => setField("modelAnswers", value)} placeholder="Write a precise, structured model answer." rows={8} /><NoteField label="Important presentation phrases" value={document.presentationPhrases} onChange={(value) => setField("presentationPhrases", value)} placeholder="Useful transitions and formal phrases" /><NoteField label="Connections with other verses" value={document.relatedVerses} onChange={(value) => setField("relatedVerses", value)} placeholder="Verse reference and connection" /></div> : <div className="reading-columns"><div><span className="section-label">Possible judge questions</span><ReadText value={document.judgeQuestions} /></div><div><span className="section-label">Model answers</span><ReadText value={document.modelAnswers} /></div><div><span className="section-label">Presentation phrases</span><ReadText value={document.presentationPhrases} /></div><div><span className="section-label">Related verses</span><ReadText value={document.relatedVerses} /></div></div>}
      </SectionCard>
    </section> : null}
  </>;
}
