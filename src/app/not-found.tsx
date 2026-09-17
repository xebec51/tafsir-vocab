import Link from "next/link";
export default function NotFound() {
  return <main className="shell narrow-shell"><div className="empty-state"><div className="kicker">404</div><h1>Page not found</h1><p>The learning unit or page you requested does not exist.</p><Link className="button button-primary" href="/">Back to Juz 14</Link></div></main>;
}
