"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BookOpenText, FileText, Home, LogIn, LogOut, RotateCcw, Settings, Target, UserRound } from "lucide-react";
import { PROGRESS_UPDATED_EVENT } from "@/lib/progress-client";

const navigation = [
  { href: "/", label: "Learn", icon: Home },
  { href: "/review", label: "Review", icon: RotateCcw },
  { href: "/weak-words", label: "Weak words", icon: Target },
  { href: "/tafsir-notes", label: "Notes", icon: FileText },
  { href: "/tafsir-practice", label: "Tafsir", icon: BookOpenText }
];

export default function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const progressChanged = useRef(false);
  const [account, setAccount] = useState<null | { displayName: string } | false>(null);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setAccount(data.authenticated ? data.user : false))
      .catch(() => setAccount(false));
  }, []);

  useEffect(() => {
    const markProgressChanged = () => {
      progressChanged.current = true;
    };
    const refreshRestoredPage = () => {
      if (!progressChanged.current) return;
      window.setTimeout(() => router.refresh(), 0);
    };

    window.addEventListener(PROGRESS_UPDATED_EVENT, markProgressChanged);
    window.addEventListener("popstate", refreshRestoredPage);
    return () => {
      window.removeEventListener(PROGRESS_UPDATED_EVENT, markProgressChanged);
      window.removeEventListener("popstate", refreshRestoredPage);
    };
  }, [router]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <Link className="brand" href="/" prefetch={false} aria-label="TafsirVocab home">
          <span className="brand-mark"><BookOpenText size={20} strokeWidth={2.2} /></span>
          <span>TafsirVocab</span>
        </Link>

        <nav className="primary-nav" aria-label="Primary navigation">
          {navigation.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" || pathname.startsWith("/learn/") : pathname.startsWith(href);
            return (
              <Link className={active ? "nav-item active" : "nav-item"} href={href} prefetch={false} key={href} aria-current={active ? "page" : undefined}>
                <Icon size={18} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="header-actions">
          {account === null ? <span className="account-loading" aria-label="Loading account" /> : account ? (
            <div className="account-chip"><span className="account-avatar"><UserRound size={16} /></span><span>{account.displayName}</span><button type="button" onClick={() => void logout()} aria-label="Log out" title="Log out"><LogOut size={17} /></button></div>
          ) : (
            <Link className="sign-in-link" href="/auth"><LogIn size={17} /><span>Sign in</span></Link>
          )}
          <Link className="icon-button setup-link" href="/setup" aria-label="Setup status" title="Setup status"><Settings size={19} /></Link>
        </div>
      </div>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {navigation.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" || pathname.startsWith("/learn/") : pathname.startsWith(href);
          return (
            <Link className={active ? "mobile-nav-item active" : "mobile-nav-item"} href={href} prefetch={false} key={href} aria-current={active ? "page" : undefined}>
              <Icon size={21} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
