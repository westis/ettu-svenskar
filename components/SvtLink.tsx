'use client';

// A link to SVT Play that also counts the click (custom event "SVT-klick", Vercel Web Analytics).
// plats: 'match' (a match row) or 'rubrik' (the TV line under the title); spelare: the Swedish side.

import { track } from '@vercel/analytics';
import { SVT_PLAY_URL } from '@/lib/tv';

export function SvtLink({ plats, spelare, className, label, children }: {
  plats: 'match' | 'rubrik';
  spelare?: string;
  className?: string;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <a className={className} href={SVT_PLAY_URL} target="_blank" rel="noopener noreferrer" aria-label={label}
      onClick={() => track('SVT-klick', spelare ? { plats, spelare } : { plats })}>
      {children}
    </a>
  );
}
