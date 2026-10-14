// Every date, score and label shown in the app is formatted here (same conventions as STTR:
// "ons 14 okt", en dashes in scores, sentence case, Swedish round names).

export const NDASH = '–';

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const WEEKDAYS = ['sön', 'mån', 'tis', 'ons', 'tor', 'fre', 'lör'];

/** Stupa's times are the venue's wall clock without an offset: read them as plain parts, never as UTC. */
function parts(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return { y, m, d };
}

/** "ons 14 okt" */
export function weekdayDate(iso: string): string {
  const { y, m, d } = parts(iso);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${WEEKDAYS[wd]} ${d} ${MONTHS[m - 1]}`;
}

/** "11–18 okt 2026", "28 sep–4 okt 2026" */
export function dateRange(start: string, end?: string | null): string {
  const a = parts(start);
  if (!end || end.slice(0, 10) === start.slice(0, 10)) return `${a.d} ${MONTHS[a.m - 1]} ${a.y}`;
  const b = parts(end);
  if (a.y !== b.y) return `${a.d} ${MONTHS[a.m - 1]} ${a.y}${NDASH}${b.d} ${MONTHS[b.m - 1]} ${b.y}`;
  if (a.m === b.m) return `${a.d}${NDASH}${b.d} ${MONTHS[b.m - 1]} ${b.y}`;
  return `${a.d} ${MONTHS[a.m - 1]}${NDASH}${b.d} ${MONTHS[b.m - 1]} ${b.y}`;
}

/** "14:15" from "2026-10-14T14:15:00". */
export function clock(iso: string): string {
  return iso.slice(11, 16);
}

export function score(a: number, b: number): string {
  return `${a}${NDASH}${b}`;
}
