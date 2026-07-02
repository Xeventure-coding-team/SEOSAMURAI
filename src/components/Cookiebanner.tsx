'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Clarity from '@microsoft/clarity';

const COOKIE_NAME    = 'rankerly_consent';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

const ENABLE_GA      = false;
const ENABLE_CLARITY = true;

// Routes that are part of the app — banner will NOT show here
const APP_PREFIXES = [
  '/admin',
];

function isAppRoute(pathname: string): boolean {
  return APP_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

function getConsent(): 'all' | 'necessary' | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  return match ? (decodeURIComponent(match[1]) as 'all' | 'necessary') : null;
}

function setConsent(value: 'all' | 'necessary') {
  document.cookie = `${COOKIE_NAME}=${value}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax; Secure`;
}

function loadGA() {
  if (!ENABLE_GA) return;
  const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
  if (!GA_ID || document.getElementById('ga-script')) return;
  const s1    = document.createElement('script');
  s1.id       = 'ga-script';
  s1.src      = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  s1.async    = true;
  document.head.appendChild(s1);
  const s2     = document.createElement('script');
  s2.id        = 'ga-init';
  s2.innerHTML = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`;
  document.head.appendChild(s2);
}

function loadClarity() {
  if (!ENABLE_CLARITY) return;
  const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID;
  if (!CLARITY_ID) return;
  Clarity.init(CLARITY_ID);
}

function loadAnalytics() {
  loadGA();
  loadClarity();
}

export function CookieBanner() {
  const pathname          = usePathname();
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    // Never show inside the app
    if (isAppRoute(pathname)) return;

    const consent = getConsent();
    if (consent === null) {
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
    if (consent === 'all') loadAnalytics();
  }, [pathname]);

  function dismiss(fn: () => void) {
    setLeaving(true);
    setTimeout(() => { fn(); setVisible(false); }, 250);
  }

  function acceptAll()       { dismiss(() => { setConsent('all');      loadAnalytics(); }); }
  function acceptNecessary() { dismiss(() => { setConsent('necessary'); });                 }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie preferences"
      className={`
        fixed bottom-5 right-5 z-50 w-80
        transition-all duration-250 ease-out
        ${leaving ? 'opacity-0 translate-y-3' : 'opacity-100 translate-y-0'}
        animate-in slide-in-from-bottom-4 fade-in duration-300
      `}
    >
      {/* Floating cookie image */}
      <div className="flex justify-center mb-[-2.25rem] relative z-10 pointer-events-none">
        <Image
          src="/cookie_banner.png"
          alt=""
          width={80}
          height={80}
          className="w-20 h-20 object-contain drop-shadow-lg"
        />
      </div>

      <div className="rounded-xl border border-border bg-card shadow-lg shadow-black/[0.06] overflow-hidden">

        {/* Header */}
        <div className="bg-primary pt-10 pb-4 px-5 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-primary-foreground/50 mb-1">
            Rankerly
          </p>
          <h2 className="text-base font-bold text-primary-foreground tracking-tight">
            We use cookies
          </h2>
        </div>

        {/* Body */}
        <div className="px-5 py-4 border-b border-border">
          <p className="text-xs text-muted-foreground leading-relaxed text-center">
            We use analytics to understand how Rankerly is used so we can make it better.
            All data is anonymous —{' '}
            <span className="text-foreground font-medium">no personal data is sold or shared.</span>
          </p>

          <div className="mt-3 space-y-1">
            {[
              'Anonymous usage data only',
              'No ads, no selling your data',
              'Withdraw consent anytime',
            ].map((line) => (
              <div key={line} className="flex items-center gap-2.5">
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 shrink-0">
                  <circle cx="8" cy="8" r="8" className="fill-primary/10" />
                  <path
                    d="M5 8l2 2 4-4"
                    stroke="hsl(var(--primary))"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
                <span className="text-[11px] text-muted-foreground">{line}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 space-y-2">
          <button
            onClick={acceptAll}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold tracking-wide hover:opacity-90 transition-opacity"
          >
            Accept cookies
          </button>
          <button
            onClick={acceptNecessary}
            className="w-full py-2.5 rounded-lg border border-border bg-transparent text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
          >
            Essential only
          </button>
          <p className="text-center text-[10px] text-muted-foreground/40 pt-0.5">
            <Link href="/privacy" className="hover:text-muted-foreground transition-colors underline underline-offset-4">
              Privacy
            </Link>
            {' · '}
            <Link href="/cookies" className="hover:text-muted-foreground transition-colors underline underline-offset-4">
              Cookie policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}