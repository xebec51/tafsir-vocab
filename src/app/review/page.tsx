import Link from "next/link";
import { RotateCcw } from "lucide-react";
import ReviewSession from "@/components/ReviewSession";
import { getCourseDistractorWords, getLearnedWords, getReviewWords } from "@/lib/course";
import { getLearnerId } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const { scope } = await searchParams;
  const mode = scope === "all" ? "all" : "due";
  const learnerId = await getLearnerId();
  const words = mode === "all" ? await getLearnedWords(learnerId) : await getReviewWords(learnerId, 24);
  const distractors = words.length > 0 && words.length < 4 ? await getCourseDistractorWords(learnerId, 12) : [];

  return <main className="shell narrow-shell"><section className="page-heading"><span className="page-heading-icon"><RotateCcw size={23} /></span><div><div className="kicker">{mode === "all" ? "Complete recall" : "Spaced repetition"}</div><h1>{mode === "all" ? "Review all learned words" : "Review due words"}</h1><p>{mode === "all" ? `Work through all ${words.length} vocabulary words you have studied so far.` : "Strengthen recall with focused Arabic-to-English retrieval."}</p></div></section><nav className="review-tabs" aria-label="Review mode"><Link className={mode === "due" ? "active" : ""} aria-current={mode === "due" ? "page" : undefined} href="/review" prefetch={false}>Due now</Link><Link className={mode === "all" ? "active" : ""} aria-current={mode === "all" ? "page" : undefined} href="/review?scope=all" prefetch={false}>All learned {mode === "all" ? <span>{words.length}</span> : null}</Link></nav><ReviewSession key={mode} words={words} distractors={distractors} mode={mode} /></main>;
}
