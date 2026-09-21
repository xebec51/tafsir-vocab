import { Cloud, Database, ShieldCheck } from "lucide-react";
import AuthForm from "@/components/AuthForm";

export default async function AuthPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="shell auth-shell">
      <section className="auth-intro">
        <div className="kicker">Your learning account</div>
        <h1>Carry your Qur&apos;anic vocabulary progress with you.</h1>
        <p>Sign in to preserve your mastery, reviews, streak, and Tafsir practice across refreshes and deployments.</p>
        <div className="auth-benefits">
          <span><Database size={20} /><span><strong>Permanent progress</strong><small>PostgreSQL is the source of truth</small></span></span>
          <span><ShieldCheck size={20} /><span><strong>Private by default</strong><small>Each learner has isolated records</small></span></span>
          <span><Cloud size={20} /><span><strong>Device independent</strong><small>Resume after signing in anywhere</small></span></span>
        </div>
      </section>
      <AuthForm nextPath={next} />
    </main>
  );
}
