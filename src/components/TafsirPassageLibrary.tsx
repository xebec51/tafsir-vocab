"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, Search } from "lucide-react";

type Passage = { id: string; title: string; theme: string | null; range: string; verseCount: number; completedSections: number };

export default function TafsirPassageLibrary({ passages }: { passages: Passage[] }) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const visible = passages.filter((passage) => !needle || [passage.title, passage.theme, passage.range].filter(Boolean).join(" ").toLowerCase().includes(needle));
  return <section className="prepared-notes"><div className="section-title-row"><div><span className="section-label">Thematic passage library</span><h2>Your discussion groups</h2></div><span className="notes-count">{passages.length} passages</span></div><label className="passage-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search surah, ayah range, or theme" /></label><div className="prepared-notes-grid">{visible.map((passage) => <Link className="prepared-note passage-note" prefetch={false} href={`/tafsir-notes/passages/${passage.id}`} key={passage.id}><span>{passage.range} · {passage.verseCount} ayat</span><strong>{passage.title}</strong><small>{passage.theme || `${passage.completedSections} sections prepared`}</small><ChevronRight size={18} /></Link>)}</div>{!visible.length ? <p className="notes-empty">No passage matches that search.</p> : null}</section>;
}
