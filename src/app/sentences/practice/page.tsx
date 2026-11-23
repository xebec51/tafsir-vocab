import { notFound } from "next/navigation";
import SentenceQuizSession from "@/components/SentenceQuizSession";
import { getSentenceSession, SentenceError } from "@/lib/sentence-sessions";
import { getLearnerId } from "@/lib/session";
export const dynamic = "force-dynamic";
export default async function SentencePracticePage({ searchParams }: { searchParams: Promise<{ session?: string }> }) {
  const { session } = await searchParams;
  if (!session || session.length > 80) notFound();
  try {
    const initial = await getSentenceSession(await getLearnerId(), session);
    return <main className="shell narrow-shell sentence-practice-shell"><SentenceQuizSession initial={initial} /></main>;
  } catch (error) { if (error instanceof SentenceError && error.status === 404) notFound(); throw error; }
}
