import Link from "next/link";
import { JUZ_14 } from "@/lib/juz14";
import { getVersesByPage } from "@/lib/quran-api";

export default async function UnitPage({
  params
}: {
  params: Promise<{ juz: string; unit: string }>;
}) {
  const { juz, unit } = await params;
  const juzNumber = Number(juz);
  const unitNumber = Number(unit);

  if (juzNumber !== 14 || unitNumber < 1 || unitNumber > 20) {
    return <main className="shell"><h1>Unit not found.</h1></main>;
  }

  const mushafPage = JUZ_14.firstMushafPage + unitNumber - 1;
  let verses: Awaited<ReturnType<typeof getVersesByPage>> = [];
  let apiError = "";

  try {
    verses = await getVersesByPage(mushafPage);
  } catch (error) {
    apiError = error instanceof Error ? error.message : "Unable to load Qur'an data.";
  }

  return (
    <main className="shell">
      <Link href="/">← Learning path</Link>
      <section className="hero" style={{ marginTop: 24 }}>
        <div className="kicker">Juz 14 · Unit {unitNumber}</div>
        <h1>Page {unitNumber}</h1>
        <p>Mushaf page {mushafPage}</p>
      </section>

      <div className="toolbar">
        <span className="button">Learn</span>
        <span className="button">Arabic → English</span>
        <span className="button">Context</span>
        <span className="button">Recall</span>
      </div>

      {apiError ? (
        <div className="card">
          <strong>Qur'an API unavailable in this environment.</strong>
          <p className="muted">{apiError}</p>
          <p>The route and data layer are ready; run locally with internet access.</p>
        </div>
      ) : (
        <section style={{ display: "grid", gap: 14 }}>
          {verses.map((verse) => (
            <article className="card" key={verse.id}>
              <span className="badge">{verse.verse_key}</span>
              <div className="arabic">{verse.text_uthmani}</div>
              <p className="muted">
                {(verse.words ?? [])
                  .filter((w) => w.translation?.text)
                  .map((w) => `${w.text_uthmani ?? ""} — ${w.translation?.text}`)
                  .join(" · ")}
              </p>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
