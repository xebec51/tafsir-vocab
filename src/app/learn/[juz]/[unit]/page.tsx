import { notFound, redirect } from "next/navigation";
import { BookOpen, Layers3 } from "lucide-react";
import AppHeader from "@/components/AppHeader";
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
  const savedProgress = course?.page.pageProgress[0];
  const lessonCount = Math.max(1, Math.ceil((course?.words.length ?? 0) / 6));
  const savedNextLesson = Math.min(lessonCount, (savedProgress?.completedLessons ?? 0) + 1);
  const lessonNumber = Number(lessonParam ?? String(savedNextLesson)) || 1;
  const lesson = lessonSlice(course?.words ?? [], lessonNumber, 6);
  return <><AppHeader /><main className="shell narrow-shell lesson-shell">
    <section className="unit-heading">
      <div className="unit-heading-main"><span className="page-heading-icon"><BookOpen size={22} /></span><div><div className="kicker">Juz 14 <span aria-hidden="true">&middot;</span> Unit {unitNumber}</div><h1>Mushaf page {261 + unitNumber}</h1><p>{course?.page.surahLabel ?? "Juz 14"} <span aria-hidden="true">&middot;</span> {course?.page.verseRange ?? `Mushaf page ${261 + unitNumber}`}</p></div></div>
      <div className="page-pill"><Layers3 size={16} /> Lesson {lesson.lesson} of {lesson.lessonCount}</div>
    </section>
    <ExerciseSession words={lesson.words} distractorWords={course?.words ?? []} unitNumber={unitNumber} lesson={lesson.lesson} lessonCount={lesson.lessonCount} />
  </main></>;
}
