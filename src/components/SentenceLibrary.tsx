"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, BookOpenText } from "lucide-react";
import type { sentencePageSummaries } from "@/lib/sentence-course";
type Pages = Awaited<ReturnType<typeof sentencePageSummaries>>;
export default function SentenceLibrary({ pages }: { pages: Pages }) {
  const [filter, setFilter] = useState("All Pages");
  const total = pages.reduce((sum, page) => sum + page.total, 0);
  const completed = pages.reduce((sum, page) => sum + page.completed, 0);
  const due = pages.reduce((sum, page) => sum + page.due, 0);
  return <>
    <div className="sentence-overview"><div><span className="kicker">Juz 14</span><strong>{completed}<span> / {total} groups completed</span></strong></div><div className="sentence-overview-progress"><div className="progress-track"><span style={{ width: `${total ? completed / total * 100 : 0}%` }} /></div><span>{total ? Math.round(completed / total * 100) : 0}% complete</span></div><Link href="/sentences/review" className="button button-secondary">{due} need review <ArrowUpRight size={16} /></Link></div>
    <nav className="sentence-filters" aria-label="Filter Mushaf pages">{["All Pages", "Not Started", "In Progress", "Completed", "Needs Review"].map((status) => <button type="button" key={status} aria-pressed={filter === status} className={filter === status ? "active" : ""} onClick={() => setFilter(status)}>{status}</button>)}</nav>
    <div className="sentence-page-grid">{pages.filter((page) => filter === "All Pages" || page.status === filter).map((page) => <Link className="sentence-page-card" href={`/sentences/${page.page}`} prefetch={false} key={page.page}>
      <div className="sentence-card-top"><BookOpenText size={21} /><span className={`sentence-status ${page.status.toLowerCase().replaceAll(" ", "-")}`}>{page.status}</span></div>
      <h2>Page {page.page}</h2><strong className="sentence-surah">{page.surah ?? "Juz 14"}</strong><span className="tiny">{page.range ?? "Awaiting source import"}</span>
      <dl className="sentence-card-stats"><div><dt>Sentence groups</dt><dd>{page.total}</dd></div><div><dt>Questions per mode</dt><dd>{page.total}</dd></div><div><dt>Progress</dt><dd>{page.completed}/{page.total}</dd></div><div><dt>Mastery</dt><dd>{page.mastery}%</dd></div><div><dt>Recall accuracy</dt><dd>{page.accuracy}%</dd></div></dl>
      <div className="progress-track" role="progressbar" aria-label={`Page ${page.page} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={page.progress}><span style={{ width: `${page.progress}%` }} /></div>
      <div className="sentence-card-footer"><span>{page.pending ? `${page.pending} pending curation` : "View sentence groups"}</span><ArrowUpRight size={17} /></div>
    </Link>)}</div>
    {pages.every((page) => filter !== "All Pages" && page.status !== filter) ? <div className="empty-state"><h2>No pages in this filter</h2></div> : null}
  </>;
}
