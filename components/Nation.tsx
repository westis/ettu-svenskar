import { flagOf } from '@/lib/countries';

const FLAG_BASE = 'https://cdn.jsdelivr.net/npm/flag-icons@7.2.3/flags/4x3';

/** Small flag + muted association code ("ETTU2" for neutral athletes has no flag). */
export function Nation({ code }: { code: string | null }) {
  if (!code) return null;
  const flag = flagOf(code);
  return (
    <span className="nation">
      {flag && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`${FLAG_BASE}/${flag}.svg`} alt="" width={18} height={14} loading="lazy" />
      )}
      {code}
    </span>
  );
}
