import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BookOpenText, Layers3, Repeat2 } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { getUnitCourse, isUnitUnlocked, lessonSlice, maxAccessibleLesson, type CourseWord } from "@/lib/course";
import { getLearnerId } from "@/lib/session";

export const dynamic = "force-dynamic";

type AyahGroup = {
  verseKey: string;
  contextArabic: string | null;
  words: CourseWord[];
};

function groupByAyah(words: CourseWord[]) {
  const groups = new Map<string, AyahGroup>();
  for (const word of words) {
    const existing = groups.get(word.verseKey);
    if (existing) {
      existing.words.push(word);
    } else {
      groups.set(word.verseKey, {
        verseKey: word.verseKey,
        contextArabic: word.contextArabic,
        words: [word]
      });
    }
  }
  return [...groups.values()];
}

export default async function LessonAyahPage({ params, searchParams }: { params: Promise<{ juz: string; unit: string }>; searchParams: Promise<{ lesson?: string }> }) {
  const { juz, unit } = await params;
  const { lesson: lessonParam } = await searchParams;
  const unitNumber = Number(unit);
  if (Number(juz) !== 14 || !Number.isInteger(unitNumber) || unitNumber < 1 || unitNumber > 20) notFound();

  const learnerId = await getLearnerId();
  const [unlocked, course] = await Promise.all([
    isUnitUnlocked(unitNumber, learnerId).catch(() => unitNumber === 1),
    getUnitCourse(unitNumber, learnerId)
  ]);
  if (!unlocked) redirect(`/learn/14/${unitNumber - 1}`);
  if (!course) notFound();

  const savedProgress = course.page.pageProgress[0];
  const lessonCount = Math.max(1, Math.ceil(course.words.length / 6));
  const savedNextLesson = Math.min(lessonCount, (savedProgress?.completedLessons ?? 0) + 1);
  const lessonNumber = Number(lessonParam ?? String(savedNextLesson)) || 1;
  const accessibleLesson = maxAccessibleLesson(lessonCount, savedProgress?.completedLessons ?? 0, savedProgress?.reviewedLessons ?? 0, savedProgress?.completed ?? false);
  if (!Number.isInteger(lessonNumber) || lessonNumber < 1 || lessonNumber > accessibleLesson) redirect(`/learn/14/${unitNumber}`);
  const lesson = lessonSlice(course.words, lessonNumber, 6);
  const groups = groupByAyah(lesson.words);

  return (
    <>
      <AppHeader />
      <main className="shell narrow-shell lesson-shell">
        <section className="unit-heading">
          <div className="unit-heading-main">
            <span className="page-heading-icon"><BookOpenText size={22} /></span>
            <div>
              <div className="kicker">Lesson in ayah</div>
              <h1>Unit {unitNumber}, Lesson {lesson.lesson}</h1>
              <p>{course.page.surahLabel ?? "Juz 14"} <span aria-hidden="true">&middot;</span> Mushaf page {course.page.mushafPage}</p>
            </div>
          </div>
          <div className="page-pill"><Layers3 size={16} /> {groups.length} ayah contexts</div>
        </section>

        <div className="toolbar">
          <Link className="button button-primary" href={`/repeat?scope=lesson&unit=${unitNumber}&lesson=${lesson.lesson}`}><Repeat2 size={18} /> Repeat this lesson</Link>
          <Link className="button button-secondary" href={`/learn/14/${unitNumber}?lesson=${lesson.lesson}`}>Back to lesson</Link>
        </div>

        <section className="ayah-lesson-list" aria-label="Lesson vocabulary inside ayah context">
          {groups.map((group) => (
            <article className="ayah-card" key={group.verseKey}>
              <div className="verse-tag">Ayah {group.verseKey}</div>
              {group.contextArabic ? <div className="arabic context-arabic ayah-context" lang="ar" dir="rtl">{group.contextArabic}</div> : null}
              <div className="ayah-word-grid">
                {group.words.map((word) => (
                  <div className="ayah-word-chip" key={word.occurrenceId}>
                    <span className="arabic-small" lang="ar" dir="rtl">{word.arabic}</span>
                    <strong>{word.english}</strong>
                    {word.indonesian ? <span>{word.indonesian}</span> : null}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>
      </main>
    </>
  );
}
