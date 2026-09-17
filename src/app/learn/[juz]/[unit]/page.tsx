import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ExerciseSession from "@/components/ExerciseSession";
import { getUnitCourse, isUnitUnlocked, lessonSlice } from "@/lib/course";
import { getLearnerId } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function UnitPage({ params, searchParams }: { params: Promise<{ juz: string; unit: string }>; searchParams: Promise<{ lesson?: string }> }) {
  const { juz, unit } = await params;
  const { lesson: lessonParam } = await searchParams;
  const unitNumber = Number(unit);
  if (Number(juz) !== 14 || !Number.isInteger(unitNumber) || unitNumber < 1 || unitNumber > 20) notFound();
  const learnerId = await getLearnerId();
  const unlocked = await isUnitUnlocked(unitNumber, learnerId).catch(() => unitNumber === 1);
  if (!unlocked) redirect(`/learn/14/${unitNumber - 1}`);
  const course = await getUnitCourse(unitNumber, learnerId).catch(() => null);
  const lessonNumber = Number(lessonParam ?? "1") || 1;
  const lesson = lessonSlice(course?.words ?? [], lessonNumber, 6);
  return <main className="shell narrow-shell">
    <nav className="topbar"><Link className="brand" href="/">← TafsirVocab</Link><div className="nav-links"><Link href="/review">Review</Link><Link href="/weak-words">Weak Words</Link></div></nav>
    <section className="unit-heading"><div><div className="kicker">Juz 14 · Unit {unitNumber}</div><h1>Page {unitNumber}</h1><p>{course?.page.surahLabel ?? "Juz 14"} · {course?.page.verseRange ?? `Mushaf page ${261 + unitNumber}`}</p></div><div className="page-pill">Mushaf {261 + unitNumber}</div></section>
    <ExerciseSession words={lesson.words} distractorWords={course?.words ?? []} unitNumber={unitNumber} lesson={lesson.lesson} lessonCount={lesson.lessonCount} />
  </main>;
}
