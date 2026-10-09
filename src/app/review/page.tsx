import Link from "next/link";
import { RotateCcw } from "lucide-react";
import ReviewSession from "@/components/ReviewSession";
import { countLearnedWords, getCourseDistractorWords, getLearnedWords, getReviewWords, getWeakReviewWords } from "@/lib/course";
import { allReviewSessionPlan } from "@/lib/review-plan";
import { getLearnerId } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ scope?: string; session?: string }> }) {
  const { scope, session } = await searchParams;
  const mode = scope === "all" ? "all" : scope === "weak" ? "weak" : "due";
  const learnerId = await getLearnerId();
  const learnedCount = mode === "all" ? await countLearnedWords(learnerId) : 0;
  const sessionPlan = mode === "all" ? allReviewSessionPlan(learnedCount) : [];
  const requestedSession = Number(session ?? "1");
  const activeSession = sessionPlan[Math.min(Math.max(0, Number.isInteger(requestedSession) ? requestedSession - 1 : 0), Math.max(0, sessionPlan.length - 1))];
  const words = mode === "all" ? await getLearnedWords(learnerId, activeSession ? { skip: activeSession.offset, take: activeSession.size } : undefined) : mode === "weak" ? await getWeakReviewWords(learnerId, 30) : await getReviewWords(learnerId, 24);
  const distractors = words.length > 0 && words.length < 4 ? await getCourseDistractorWords(learnerId, 12) : [];

  const nextSessionHref = activeSession && activeSession.number < sessionPlan.length ? `/review?scope=all&session=${activeSession.number + 1}` : undefined;

  return <main className="shell narrow-shell"><section className="page-heading"><span className="page-heading-icon"><RotateCcw size={23} /></span><div><div className="kicker">{mode === "weak" ? "Targeted remediation" : mode === "all" ? "Complete recall" : "Spaced repetition"}</div><h1>{mode === "weak" ? "Strengthen weak words" : mode === "all" ? "Review all learned words" : "Review due words"}</h1><p>{mode === "weak" ? "Each weak word needs three successful recall rounds before it leaves this focus list." : mode === "all" ? learnedCount > 100 ? `${learnedCount} learned words are split into ${sessionPlan.length} balanced sessions of up to 100 words. Each completed session continues directly to the next.` : `Work through all ${learnedCount} vocabulary words you have studied so far.` : "Strengthen recall with focused Arabic-to-English retrieval."}</p></div></section><nav className="review-tabs" aria-label="Review mode"><Link className={mode === "due" ? "active" : ""} aria-current={mode === "due" ? "page" : undefined} href="/review" prefetch={false}>Due now</Link><Link className={mode === "weak" ? "active" : ""} aria-current={mode === "weak" ? "page" : undefined} href="/review?scope=weak" prefetch={false}>Weak focus</Link><Link className={mode === "all" ? "active" : ""} aria-current={mode === "all" ? "page" : undefined} href="/review?scope=all" prefetch={false}>All learned {mode === "all" ? <span>{learnedCount}</span> : null}</Link></nav>{sessionPlan.length > 1 ? <nav className="review-session-picker" aria-label="All-word review sessions">{sessionPlan.map((item) => <Link key={item.number} className={item.number === activeSession?.number ? "active" : ""} aria-current={item.number === activeSession?.number ? "page" : undefined} href={`/review?scope=all&session=${item.number}`} prefetch={false}>Session {item.number}<span>{item.size} words</span></Link>)}</nav> : null}<ReviewSession key={`${mode}-${activeSession?.number ?? 1}`} words={words} distractors={distractors} mode={mode} nextSessionHref={nextSessionHref} sessionNumber={activeSession?.number} sessionTotal={sessionPlan.length || undefined} /></main>;
}
