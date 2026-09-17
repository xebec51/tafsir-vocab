"use client";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="shell narrow-shell"><div className="empty-state"><div className="kicker">Something went wrong</div><h1>Unable to load this screen</h1><p>Check the database and course import on the Setup page, then try again.</p><button className="button button-primary" onClick={reset}>Try again</button></div></main>;
}
