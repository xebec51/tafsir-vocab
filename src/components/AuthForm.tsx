"use client";

import { ArrowRight, Check, LockKeyhole, Mail, UserRound } from "lucide-react";
import { FormEvent, useState } from "react";

export default function AuthForm({ nextPath = "/" }: { nextPath?: string }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const response = await fetch(`/api/auth/${mode === "login" ? "login" : "signup"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, email, password })
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Unable to continue.");
        return;
      }
      window.location.href = nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/";
    } catch {
      setError("Unable to connect. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-card">
      <div className="segmented-control" aria-label="Account action">
        <button type="button" className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(""); }}>Sign in</button>
        <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => { setMode("signup"); setError(""); }}>Create account</button>
      </div>
      <div className="auth-card-heading">
        <h2>{mode === "login" ? "Welcome back" : "Keep your progress safe"}</h2>
        <p>{mode === "login" ? "Continue exactly where you left off." : "Your current anonymous progress will move into this account."}</p>
      </div>
      <form className="auth-form" onSubmit={submit}>
        {mode === "signup" ? (
          <label><span>Name</span><span className="input-with-icon"><UserRound size={18} /><input autoComplete="name" maxLength={60} minLength={2} required value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Your name" /></span></label>
        ) : null}
        <label><span>Email</span><span className="input-with-icon"><Mail size={18} /><input autoComplete="email" inputMode="email" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></span></label>
        <label><span>Password</span><span className="input-with-icon"><LockKeyhole size={18} /><input autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "signup" ? 8 : 1} maxLength={128} required type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === "signup" ? "At least 8 characters" : "Your password"} /></span></label>
        {error ? <div className="form-error" role="alert">{error}</div> : null}
        <button className="button button-primary button-wide" disabled={submitting}>{submitting ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}{!submitting ? <ArrowRight size={18} /> : null}</button>
      </form>
      <div className="auth-assurance"><Check size={17} /><span>Progress is stored per account in PostgreSQL and restored on every device after sign in.</span></div>
    </div>
  );
}
