import { displayCode, flagOf } from '@/lib/countries';

/** Small flag + muted code. ETTU's neutral athletes (ETTU1 / ETTU2) show ETTU's flag and "AIN". */
export function Nation({ code }: { code: string | null }) {
  if (!code) return null;
  const flag = flagOf(code);
  const label = displayCode(code);
  return (
    <span className="nation">
      {flag && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={flag.src} alt="" className={flag.wide ? 'wide' : undefined} width={flag.wide ? 27 : 18} height={14}
          loading="lazy" />
      )}
      {label === 'AIN' ? <abbr title="Individuella neutrala idrottare">AIN</abbr> : label}
    </span>
  );
}
