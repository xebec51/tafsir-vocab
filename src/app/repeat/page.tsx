import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, BookOpenCheck, Layers3, Repeat2, Shuffle } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import ExerciseSession from "@/components/ExerciseSession";
import { getJuzCourseWords, getUnitCourse, lessonSlice, type CourseWord } from "@/lib/course";
import { prisma } from "@/lib/prisma";
import { getLearnerId } from "@/lib/session";
import { JUZ_14 } from "@/lib/juz14";

export const dynamic = "force-dynamic";

type RepeatSearchParams = {
  scope?: string;
  unit?: string;
  lesson?: string;
};

function dailyShuffle<T extends { lexemeId: number }>(words: T[], seed: number) {
  const today = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
  return [...words].sort((a, b) => {
    const left = ((a.lexemeId * 1103515245 + seed + today) >>> 0) % 100000;
    const right = ((b.lexemeId * 1103515245 + seed + today) >>> 0) % 100000;
    return left - right;
  });
}

function repeatRound(words: CourseWord[], limit: number, seed: number) {
  const weak = words.filter((word) => word.masteryLevel === "LEARNING");
  const newWords = words.filter((word) => word.masteryLevel === "NEW");
  const strong = words.filter((word) => word.masteryLevel !== "LEARNING" && word.masteryLevel !== "NEW");
  const ordered = [
    ...dailyShuffle(weak, seed + 1),
    ...dailyShuffle(newWords, seed + 2),
    ...dailyShuffle(strong, seed + 3)
  ];
  const seen = new Set<number>();
  return ordered.filter((word) => {
    if (seen.has(word.lexemeId)) return false;
    seen.add(word.lexemeId);
    return true;
  }).slice(0, limit);
}

async function RepeatHub({ learnerId }: { learnerId: string }) {
  const pages = await prisma.page.findMany({
    where: { juzId: 14 },
    orderBy: { unitNumber: "asc" },
    include: { pageProgress: { where: { learnerId }, take: 1 } }
  });
  const nextPage = pages.find((page) => !page.pageProgress[0]?.completed) ?? pages[0];
  const nextLesson = Math.min(
    Math.max(1, Math.ceil((nextPage?.coreWordCount ?? 0) / 6)),
    (nextPage?.pageProgress[0]?.completedLessons ?? 0) + 1
  );

  return (
    <>
      <section className="page-heading">
        <span className="page-heading-icon"><Repeat2 size={23} /></span>
        <div>
          <div className="kicker">Repeat center</div>
          <h1>Repeat vocabulary on purpose</h1>
          <p>Choose a tight lesson round, a full Mushaf page, or a mixed review from all Juz 14 material.</p>
        </div>
      </section>

      <section className="repeat-focus-grid" aria-label="Repeat options">
        <Link className="repeat-focus-card featured" href={`/repeat?scope=lesson&unit=${nextPage?.unitNumber ?? 1}&lesson=${nextLesson}`}>
          <span className="repeat-icon"><Layers3 size={24} /></span>
          <div><strong>Repeat current lesson</strong><span>Small 6-word loop for fast reinforcement</span></div>
          <span className="repeat-cta">Start</span>
        </Link>
        <Link className="repeat-focus-card" href={`/repeat?scope=unit&unit=${nextPage?.unitNumber ?? 1}`}>
          <span className="repeat-icon"><BookOpen size={24} /></span>
          <div><strong>Repeat current page</strong><span>Review the active Mushaf page as one session</span></div>
          <span className="repeat-cta">Page {nextPage?.mushafPage ?? 262}</span>
        </Link>
        <Link className="repeat-focus-card" href="/repeat?scope=all">
          <span className="repeat-icon"><Shuffle size={24} /></span>
          <div><strong>Repeat all material</strong><span>Daily mixed round from the full Juz 14 pool</span></div>
          <span className="repeat-cta">Mixed</span>
        </Link>
      </section>

      <section className="learning-path repeat-path" aria-labelledby="repeat-pages-title">
        <div className="section-title-row path-heading">
          <div>
            <span className="section-label">Page repeat</span>
            <h2 id="repeat-pages-title">Choose a Mushaf page</h2>
            <p>Each page can be repeated as a full-page drill, or opened lesson-by-lesson.</p>
          </div>
        </div>
        <div className="path-list">
          {JUZ_14.units.map((unit) => {
            const page = pages.find((item) => item.unitNumber === unit.unitNumber);
            const progress = page?.pageProgress[0];
            const lessonCount = Math.max(1, Math.ceil((page?.coreWordCount ?? 0) / 6));
            return (
              <div className="path-unit repeat-unit" key={unit.unitNumber}>
                <span className="unit-state-icon" aria-hidden="true">{String(unit.unitNumber).padStart(2, "0")}</span>
                <span className="unit-main">
                  <span className="unit-title-row"><strong>Unit {unit.unitNumber}</strong><span>Page {unit.mushafPage}</span></span>
                  <span className="unit-surah">{page?.surahLabel ?? "Juz 14"}</span>
                  <span className="unit-range">{lessonCount} lessons <span aria-hidden="true">&middot;</span> {page?.coreWordCount ?? 0} core words</span>
                </span>
                <span className="repeat-actions">
                  <Link className="mini-button" href={`/repeat?scope=unit&unit=${unit.unitNumber}`}>Page</Link>
                  <Link className="mini-button" href={`/repeat?scope=lesson&unit=${unit.unitNumber}&lesson=${Math.min(lessonCount, (progress?.completedLessons ?? 0) + 1)}`}>Lesson</Link>
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

export default async function RepeatPage({ searchParams }: { searchParams: Promise<RepeatSearchParams> }) {
  const query = await searchParams;
  const learnerId = await getLearnerId();
  const scope = query.scope;

  if (!scope) {
    return <><AppHeader /><main className="shell dashboard-shell"><RepeatHub learnerId={learnerId} /></main></>;
  }

  let words: CourseWord[] = [];
  let title = "Repeat round";
  let description = "Review vocabulary without changing lesson completion progress.";
  let scopeLabel = "Repeat round";
  let unitNumber = 0;
  let lessonNumber = 1;
  let lessonCount = 1;

  if (scope === "lesson") {
    unitNumber = Number(query.unit);
    lessonNumber = Number(query.lesson ?? "1") || 1;
    if (!Number.isInteger(unitNumber) || unitNumber < 1 || unitNumber > 20) notFound();
    const course = await getUnitCourse(unitNumber, learnerId);
    if (!course) notFound();
    const lesson = lessonSlice(course.words, lessonNumber, 6);
    words = lesson.words;
    lessonNumber = lesson.lesson;
    lessonCount = lesson.lessonCount;
    title = `Repeat Unit ${unitNumber}, Lesson ${lessonNumber}`;
    description = `${course.page.surahLabel ?? "Juz 14"} · Mushaf page ${course.page.mushafPage}`;
    scopeLabel = `Repeat lesson ${lessonNumber} of ${lessonCount}`;
  } else if (scope === "unit") {
    unitNumber = Number(query.unit);
    if (!Number.isInteger(unitNumber) || unitNumber < 1 || unitNumber > 20) notFound();
    const course = await getUnitCourse(unitNumber, learnerId);
    if (!course) notFound();
    words = repeatRound(course.words, 24, unitNumber);
    lessonCount = Math.max(1, Math.ceil(course.words.length / 6));
    title = `Repeat Mushaf page ${course.page.mushafPage}`;
    description = `${course.page.surahLabel ?? "Juz 14"} · ${course.page.verseRange ?? `Unit ${unitNumber}`}`;
    scopeLabel = `Page repeat · ${words.length} words`;
  } else if (scope === "all") {
    const allWords = await getJuzCourseWords(learnerId);
    words = repeatRound(allWords, 36, 1400);
    title = "Repeat all Juz 14 material";
    description = "A daily mixed round sampled from all available Juz 14 vocabulary.";
    scopeLabel = `Full-material repeat · ${words.length} words`;
  } else {
    notFound();
  }

  return (
    <>
      <AppHeader />
      <main className="shell narrow-shell lesson-shell">
        <section className="unit-heading">
          <div className="unit-heading-main">
            <span className="page-heading-icon"><BookOpenCheck size={22} /></span>
            <div><div className="kicker">Repeat</div><h1>{title}</h1><p>{description}</p></div>
          </div>
          <Link className="button button-secondary" href="/repeat">Repeat center</Link>
        </section>
        <ExerciseSession
          words={words}
          distractorWords={scope === "lesson" ? undefined : words}
          unitNumber={unitNumber}
          lesson={lessonNumber}
          lessonCount={lessonCount}
          mode="repeat"
          scopeLabel={scopeLabel}
          doneHref="/repeat"
          doneLabel="Repeat center"
        />
      </main>
    </>
  );
}
