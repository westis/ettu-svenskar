'use client';

// Light/dark toggle. The page starts with the system setting; a choice is stored in localStorage
// and applied before paint by THEME_SCRIPT (lib/theme.ts, in app/layout.tsx). The icon is chosen by
// CSS, so the server-rendered button is right before hydration too.

import { THEME_KEY } from '@/lib/theme';

function current(): 'light' | 'dark' {
  const set = document.documentElement.dataset.theme;
  if (set === 'light' || set === 'dark') return set;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeToggle() {
  const toggle = () => {
    const next = current() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // private mode: the choice lasts for this page only
    }
  };
  return (
    <button type="button" className="theme-btn" onClick={toggle} aria-label="Växla mellan ljust och mörkt läge">
      <svg className="moon" width="18" height="18" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
      <svg className="sun" width="18" height="18" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    </button>
  );
}
