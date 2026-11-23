"use client";
export default function SentenceError({ reset }: { reset: () => void }) { return <main className="shell narrow-shell"><div className="empty-state" role="alert"><h2>Sentence practice is temporarily unavailable</h2><p>Your saved progress is safe. Try loading this page again.</p><button className="button button-primary" type="button" onClick={reset}>Try again</button></div></main>; }
