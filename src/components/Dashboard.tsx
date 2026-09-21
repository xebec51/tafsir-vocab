import Link from "next/link";
import {
  ArrowRight, BookOpenText, Check, ChevronRight, Flame, LockKeyhole,
  Repeat2, RotateCcw, Sparkles, Star, Target, Trophy
} from "lucide-react";
import type { DashboardData } from "@/lib/dashboard";
import { JUZ_14 } from "@/lib/juz14";

function lessonCountFor(coreWordCount: number, savedLessonCount?: number) {
  return Math.max(savedLessonCount ?? 1, Math.max(1, Math.ceil(coreWordCount / 6)));
}

function nextLessonFor(page: DashboardData["pages"][number] | undefined) {
  if (!page) return 1;
  const total = lessonCountFor(page.coreWordCount, page.progress?.lessonCount);
  if ((page.progress?.completedLessons ?? 0) > (page.progress?.reviewedLessons ?? 0)) {
    return Math.min(total, page.progress?.completedLessons ?? 1);
  }
  return Math.min(total, (page.progress?.reviewedLessons ?? 0) + 1);
}

export default function Dashboard({ data }: { data: DashboardData | null }) {
  const pageMap = new Map(data?.pages.map((page) => [page.unitNumber, page]) ?? []);
  const completed = data?.pages.filter((page) => page.progress?.completed).length ?? 0;
  const nextUnit = data?.pages.find((page) => !page.progress?.completed)?.unitNumber ?? 20;
  const nextPage = pageMap.get(nextUnit);
  const nextLesson = nextLessonFor(nextPage);
  const lessonReviewDue = (nextPage?.progress?.completedLessons ?? 0) > (nextPage?.progress?.reviewedLessons ?? 0);
  const continueHref = lessonReviewDue
    ? `/repeat?scope=checkpoint&unit=${nextUnit}&lesson=${nextLesson}`
    : `/learn/14/${nextUnit}?lesson=${nextLesson}`;
  const courseProgress = Math.round((completed / 20) * 100);

  return (
    <main className="shell dashboard-shell">
        <section className="dashboard-heading">
          <div>
            <div className="kicker">Juz 14 vocabulary</div>
            <h1>Ready for today&apos;s study?</h1>
            <p>Build reliable Arabic-to-English recall, one Mushaf page at a time.</p>
          </div>
          <div className="streak-badge" aria-label={`${data?.learner.streakDays ?? 0} day streak`}>
            <Flame size={22} />
            <div><strong>{data?.learner.streakDays ?? 0}</strong><span>day streak</span></div>
          </div>
        </section>

        {!data && (
          <div className="notice" role="alert">
            Course data is unavailable. <Link href="/setup"><strong>Check setup status</strong></Link>
          </div>
        )}

        <section className="overview-grid" aria-label="Daily learning overview">
          <div className="continue-card">
            <div className="continue-copy">
              <span className="status-label"><span className="status-dot" /> Continue learning</span>
              <h2>Unit {nextUnit}</h2>
              <p>{nextPage?.surahLabel ?? "Juz 14"} <span aria-hidden="true">&middot;</span> Mushaf page {261 + nextUnit} <span aria-hidden="true">&middot;</span> Lesson {nextLesson}{lessonReviewDue ? " review" : ""}</p>
              <div className="progress-block">
                <div className="progress-label"><span>Juz progress</span><strong>{completed} of 20 units</strong></div>
                <div className="progress-track" role="progressbar" aria-label="Juz 14 completion" aria-valuemin={0} aria-valuemax={20} aria-valuenow={completed}>
                  <span style={{ width: `${courseProgress}%` }} />
                </div>
              </div>
            </div>
            <Link className="button button-light continue-button" href={continueHref}>
              {lessonReviewDue ? "Review words" : "Start lesson"} <ArrowRight size={18} />
            </Link>
          </div>

          <div className="metric-grid">
            <div className="metric"><span className="metric-icon xp"><Sparkles size={19} /></span><div><strong>{data?.learner.xp ?? 0}</strong><span>Total XP</span></div></div>
            <div className="metric"><span className="metric-icon due"><RotateCcw size={19} /></span><div><strong>{data?.due ?? 0}</strong><span>Review due</span></div></div>
            <div className="metric"><span className="metric-icon weak"><Target size={19} /></span><div><strong>{data?.weak ?? 0}</strong><span>Weak words</span></div></div>
            <div className="metric"><span className="metric-icon mastered"><Trophy size={19} /></span><div><strong>{data?.mastered ?? 0}</strong><span>Mastered</span></div></div>
          </div>
        </section>

        <section className="priority-section" aria-labelledby="priority-title">
          <div className="section-title-row">
            <div><span className="section-label">Study priorities</span><h2 id="priority-title">Focus where it matters</h2></div>
          </div>
          <div className="priority-grid">
            <Link className="priority-item" href="/review">
              <span className="priority-icon review"><RotateCcw size={22} /></span>
              <div><strong>Spaced review</strong><span>{data?.due ?? 0} words due now</span></div>
              <ChevronRight size={19} />
            </Link>
            <Link className="priority-item" href="/repeat">
              <span className="priority-icon repeat"><Repeat2 size={22} /></span>
              <div><strong>Repeat rounds</strong><span>Lesson, page, or full Juz 14 loops</span></div>
              <ChevronRight size={19} />
            </Link>
            <Link className="priority-item" href="/weak-words">
              <span className="priority-icon weak"><Target size={22} /></span>
              <div><strong>Weak words</strong><span>Prioritize {data?.weak ?? 0} difficult words</span></div>
              <ChevronRight size={19} />
            </Link>
            <Link className="priority-item" href="/tafsir-practice">
              <span className="priority-icon tafsir"><BookOpenText size={22} /></span>
              <div><strong>Tafsir practice</strong><span>Explain meaning in ayah context</span></div>
              <ChevronRight size={19} />
            </Link>
          </div>
        </section>

        <section className="learning-path" id="learning-path" aria-labelledby="path-title">
          <div className="section-title-row path-heading">
            <div>
              <span className="section-label">Learning path</span>
              <h2 id="path-title">Juz 14 <span aria-hidden="true">&middot;</span> 20 units</h2>
              <p>Al-Hijr to An-Nahl <span aria-hidden="true">&middot;</span> Mushaf pages 262-281</p>
            </div>
            <div className="completion-summary"><strong>{courseProgress}%</strong><span>complete</span></div>
          </div>

          <div className="path-list">
            {JUZ_14.units.map((unit) => {
              const page = pageMap.get(unit.unitNumber);
              const stars = page?.progress?.completed ? (page.progress.masteryStars ?? 0) : 0;
              const previous = unit.unitNumber === 1 ? null : pageMap.get(unit.unitNumber - 1);
              const unlocked = unit.unitNumber === 1 || Boolean(previous?.progress?.completed);
              const status = page?.progress?.completed ? "completed" : unit.unitNumber === nextUnit ? "current" : unlocked ? "available" : "locked";
              const unitLessonCount = lessonCountFor(page?.coreWordCount ?? 0, page?.progress?.lessonCount);
              const unitNextLesson = nextLessonFor(page);
              const unitReviewDue = (page?.progress?.completedLessons ?? 0) > (page?.progress?.reviewedLessons ?? 0);
              const partialLabel = page?.progress && !page.progress.completed
                ? unitReviewDue ? `Review lesson ${unitNextLesson}` : `Lesson ${unitNextLesson}/${unitLessonCount}`
                : null;
              const card = (
                <>
                  <span className="unit-state-icon" aria-hidden="true">
                    {status === "completed" ? <Check size={19} /> : status === "locked" ? <LockKeyhole size={17} /> : String(unit.unitNumber).padStart(2, "0")}
                  </span>
                  <span className="unit-main">
                    <span className="unit-title-row"><strong>Unit {unit.unitNumber}</strong><span>Page {unit.mushafPage}</span></span>
                    <span className="unit-surah">{page?.surahLabel ?? "Juz 14"}</span>
                    <span className="unit-range">{page?.verseRange ?? `Mushaf page ${unit.mushafPage}`}</span>
                  </span>
                  <span className="unit-end">
                    {status === "completed" ? (
                      <span className="unit-stars" aria-label={`${stars} of 3 mastery stars`}>
                        {[1, 2, 3].map((value) => <Star key={value} size={16} fill={value <= stars ? "currentColor" : "none"} />)}
                      </span>
                    ) : (
                      <span className={`unit-status ${status}`}>{partialLabel ?? (status === "current" ? "Current" : status === "locked" ? "Locked" : "Ready")}</span>
                    )}
                    {page?.coreWordCount ? <span className="unit-word-count">{page.coreWordCount} core words</span> : null}
                  </span>
                  {unlocked ? <ChevronRight className="unit-chevron" size={20} /> : null}
                </>
              );

              return unlocked ? (
                <Link className={`path-unit ${status}`} href={`/learn/14/${unit.unitNumber}`} key={unit.unitNumber}>{card}</Link>
              ) : (
                <div className={`path-unit ${status}`} key={unit.unitNumber} aria-disabled="true">{card}</div>
              );
            })}
          </div>
        </section>
    </main>
  );
}
