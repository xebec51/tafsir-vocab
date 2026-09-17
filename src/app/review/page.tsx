import Link from "next/link";

export default function ReviewPage() {
  return (
    <main className="shell">
      <Link href="/">← Dashboard</Link>
      <section className="hero" style={{ marginTop: 24 }}>
        <div className="kicker">Spaced Repetition</div>
        <h1>Review</h1>
        <p>
          This screen will combine due words and weak words across all completed
          pages. The SRS engine is already included in <code>src/lib/srs.ts</code>.
        </p>
      </section>
      <div className="card">
        <strong>No review history yet.</strong>
        <p className="muted">Complete vocabulary exercises to populate your review queue.</p>
      </div>
    </main>
  );
}
