import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BookOpen, BookOpenText, Check, ChevronRight, Layers3, LockKeyhole, Play, Repeat2 } from "lucide-react";
import ExerciseSession from "@/components/ExerciseSession";
import { getUnitCourse, getUnitOverview, isUnitUnlocked, lessonSlice, maxAccessibleLesson } from "@/lib/course";
import { getLearnerId } from "@/lib/session";

export const dynamic = "force-dynamic";

type UnitSearchParams = { lesson?: string };

export default async function UnitPage({ params, searchParams }: { params: Promise<{ juz: string; unit: string }>; searchParams: Promise<UnitSearchParams> }) {
  const { juz, unit } = await params;
  const { lesson: lessonParam } = await searchParams;
  const unitNumber = Number(unit);
  if (Number(juz) !== 14 || !Number.isInteger(unitNumber) || unitNumber < 1 || unitNumber > 20) notFound();

  const learnerId = await getLearnerId();
  const [unlocked, course] = await Promise.all([
    isUnitUnlocked(unitNumber, learnerId).catch(() => unitNumber === 1),
    (lessonParam ? getUnitCourse(unitNumber, learnerId) : getUnitOverview(unitNumber, learnerId)).catch(() => null)
  ]);
  if (!unlocked) redirect(`/learn/14/${unitNumber - 1}`);
  if (!course) notFound();

  const savedProgress = course.page.pageProgress[0];
  const courseWordCount = course.words.length || course.page.coreWordCount;
  const lessonCount = Math.max(1, Math.ceil(courseWordCount / 6));
  const completedLessons = Math.min(lessonCount, savedProgress?.completedLessons ?? 0);
  const reviewedLessons = Math.min(completedLessons, savedProgress?.reviewedLessons ?? 0);
  const reviewDue = completedLessons > reviewedLessons;
  const accessibleLesson = maxAccessibleLesson(lessonCount, completedLessons, reviewedLessons, savedProgress?.completed ?? false);
  const primaryHref = reviewDue
    ? `/repeat?scope=checkpoint&unit=${unitNumber}&lesson=${completedLessons}`
    : savedProgress?.completed
      ? `/repeat?scope=lesson&unit=${unitNumber}&lesson=${lessonCount}`
      : `/learn/14/${unitNumber}?lesson=${accessibleLesson}`;

  if (!lessonParam) {
    return (
      <main className="shell narrow-shell lesson-shell">
          <section className="unit-heading">
            <div className="unit-heading-main">
              <span className="page-heading-icon"><BookOpen size={22} /></span>
              <div>
                <div className="kicker">Juz 14 <span aria-hidden="true">&middot;</span> Unit {unitNumber}</div>
                <h1>Mushaf page {course.page.mushafPage}</h1>
                <p>{course.page.surahLabel ?? "Juz 14"} <span aria-hidden="true">&middot;</span> {course.page.verseRange ?? `Mushaf page ${course.page.mushafPage}`}</p>
              </div>
            </div>
            <div className="page-pill"><Layers3 size={16} /> {reviewedLessons} of {lessonCount} reviewed</div>
          </section>

          <div className="toolbar lesson-toolbar">
            <Link className="button button-primary" href={primaryHref}>{reviewDue || savedProgress?.completed ? <Repeat2 size={18} /> : <Play size={18} />} {reviewDue ? `Review lesson ${completedLessons}` : savedProgress?.completed ? "Repeat final lesson" : completedLessons ? "Continue learning" : "Start lesson 1"}</Link>
            <Link className="button button-secondary" href={`/repeat?scope=unit&unit=${unitNumber}`}><Repeat2 size={18} /> Repeat page</Link>
          </div>

          <section className="lesson-picker" aria-labelledby="lesson-picker-title">
            <div className="section-title-row">
              <div>
                <span className="section-label">Page lessons</span>
                <h2 id="lesson-picker-title">Choose a lesson</h2>
                <p>Reopen completed lessons or continue from the next available lesson.</p>
              </div>
            </div>
            <div className="lesson-picker-grid">
              {Array.from({ length: lessonCount }, (_, index) => {
                const lessonNumber = index + 1;
                const isCompleted = lessonNumber <= reviewedLessons;
                const needsReview = lessonNumber <= completedLessons && lessonNumber > reviewedLessons;
                const isCurrent = !savedProgress?.completed && !needsReview && lessonNumber === accessibleLesson;
                const isAccessible = lessonNumber <= accessibleLesson;
                const wordStart = index * 6 + 1;
                const wordEnd = Math.min(courseWordCount, wordStart + 5);
                const status = needsReview ? "review" : isCompleted ? "completed" : isCurrent ? "current" : "locked";
                const href = needsReview
                  ? `/repeat?scope=checkpoint&unit=${unitNumber}&lesson=${lessonNumber}`
                  : isCompleted
                    ? `/repeat?scope=lesson&unit=${unitNumber}&lesson=${lessonNumber}`
                    : `/learn/14/${unitNumber}?lesson=${lessonNumber}`;
                const content = (
                  <>
                    <span className="lesson-number" aria-hidden="true">
                      {needsReview ? <Repeat2 size={18} /> : isCompleted ? <Check size={19} /> : isAccessible ? <Play size={18} /> : <LockKeyhole size={17} />}
                    </span>
                    <span className="lesson-picker-main">
                      <strong>Lesson {lessonNumber}</strong>
                      <span>Words {wordStart}-{wordEnd}</span>
                    </span>
                    <span className={`unit-status ${status}`}>{needsReview ? "Review due" : isCompleted ? "Repeat" : isCurrent ? "Current" : "Locked"}</span>
                    {isAccessible ? <ChevronRight size={19} /> : null}
                  </>
                );

                return isAccessible ? (
                  <Link
                    className={`lesson-picker-card ${status}`}
                    href={href}
                    prefetch={isCurrent ? undefined : false}
                    key={lessonNumber}
                  >
                    {content}
                  </Link>
                ) : (
                  <div className={`lesson-picker-card ${status}`} aria-disabled="true" key={lessonNumber}>{content}</div>
                );
              })}
            </div>
          </section>
      </main>
    );
  }

  const lessonNumber = Number(lessonParam);
  if (!Number.isInteger(lessonNumber) || lessonNumber < 1 || lessonNumber > accessibleLesson) {
    redirect(`/learn/14/${unitNumber}`);
  }

  const lesson = lessonSlice(course.words, lessonNumber, 6);
  return (
    <main className="shell narrow-shell lesson-shell">
        <section className="unit-heading">
          <div className="unit-heading-main">
            <span className="page-heading-icon"><BookOpen size={22} /></span>
            <div><div className="kicker">Juz 14 <span aria-hidden="true">&middot;</span> Unit {unitNumber}</div><h1>Mushaf page {course.page.mushafPage}</h1><p>{course.page.surahLabel ?? "Juz 14"} <span aria-hidden="true">&middot;</span> {course.page.verseRange ?? `Mushaf page ${course.page.mushafPage}`}</p></div>
          </div>
          <div className="page-pill"><Layers3 size={16} /> Lesson {lesson.lesson} of {lesson.lessonCount}</div>
        </section>
        <div className="toolbar lesson-toolbar">
          <Link className="button button-secondary" href={`/learn/14/${unitNumber}`} prefetch={false}><Layers3 size={18} /> All lessons</Link>
          <Link className="button button-secondary" href={`/repeat?scope=lesson&unit=${unitNumber}&lesson=${lesson.lesson}`}><Repeat2 size={18} /> Repeat lesson</Link>
          <Link className="button button-secondary" href={`/learn/14/${unitNumber}/ayah?lesson=${lesson.lesson}`}><BookOpenText size={18} /> Lesson in ayah</Link>
        </div>
        <ExerciseSession
          key={`${unitNumber}-${lesson.lesson}`}
          words={lesson.words}
          distractorWords={course.words}
          unitNumber={unitNumber}
          lesson={lesson.lesson}
          lessonCount={lesson.lessonCount}
          requiresReview={lesson.lesson > reviewedLessons}
        />
    </main>
  );
}
