// SVT's TV guide for the EM (svt.se/sport/bordtennis/guide-bordtennis-em-2026) -> broadcast windows,
// and which matches start inside one. Pure functions; tested in tests/tv.test.ts.
//
// The guide is plain text: a day line ("Onsdag 14 oktober") followed by windows ("15.45-17.30 SVT
// Play", "13.00-13.45 SVT Play – Kvartsfinal"). Its dates have typos ("Söndag 19 oktober" for the
// final on Sunday 18), so the weekday decides within the event's dates.

import type { Match } from './model';

export interface TvWindow {
  date: string; // "2026-10-14"
  from: string; // "15:45"
  to: string; // "17:30"
  channel: string; // "SVT Play", "SVT2"
}

export const SVT_PLAY_URL = 'https://www.svtplay.se/bordtennis-em-1';
export const SVT_GUIDE_URL = 'https://www.svt.se/sport/bordtennis/guide-bordtennis-em-2026';

const WEEKDAYS = ['söndag', 'måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag'];
const MONTHS = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september',
  'oktober', 'november', 'december'];

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—' };

/** The page's text, one trimmed line per block. */
export function htmlToLines(html: string): string[] {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (all, e: string) => {
      if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1)));
      return ENTITIES[e.toLowerCase()] ?? all;
    })
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

/** The day a "Söndag 19 oktober" line means: the event day with that weekday nearest the date. */
function resolveDay(weekday: number, day: number, month: number, start: string, end: string): string {
  const year = Number(start.slice(0, 4));
  const stated = new Date(Date.UTC(year, month, day));
  let best: Date | null = null;
  for (let d = new Date(`${start}T00:00:00Z`); iso(d) <= end; d = new Date(d.getTime() + 86_400_000)) {
    if (d.getUTCDay() !== weekday) continue;
    if (!best || Math.abs(d.getTime() - stated.getTime()) < Math.abs(best.getTime() - stated.getTime())) best = d;
  }
  return iso(best ?? stated);
}

const DAY = new RegExp(`^(${WEEKDAYS.join('|')})\\s+(\\d{1,2})\\s+(${MONTHS.join('|')})$`, 'i');
const WINDOW = /^(\d{1,2})[.:](\d{2})\s*[-–]\s*(\d{1,2})[.:](\d{2})\s+(SVT(?:\s?Play|\s?\d|\s?Sport)?)/i;

/** Broadcast windows from the guide's lines (the "TV-tider" section, if it can be found). */
export function parseTvGuide(lines: string[], eventStart: string, eventEnd: string): TvWindow[] {
  let from = 0;
  lines.forEach((l, i) => {
    if (/^TV-TIDER/i.test(l)) from = i; // the last one: the heading, not the table of contents
  });
  const stop = lines.findIndex((l, i) => i > from && /^(Kommentator|Guiden uppdateras)/i.test(l));
  const part = lines.slice(from, stop > 0 ? stop : undefined);

  const out: TvWindow[] = [];
  let date: string | null = null;
  for (const l of part) {
    const d = l.match(DAY);
    if (d) {
      date = resolveDay(WEEKDAYS.indexOf(d[1].toLowerCase()), Number(d[2]), MONTHS.indexOf(d[3].toLowerCase()),
        eventStart, eventEnd);
      continue;
    }
    const w = l.match(WINDOW);
    if (w && date) {
      out.push({
        date,
        from: `${pad(Number(w[1]))}:${w[2]}`,
        to: `${pad(Number(w[3]))}:${w[4]}`,
        channel: w[5].replace(/\s+/g, ' ').trim().replace(/^svt ?play$/i, 'SVT Play').replace(/^svt ?(\d)$/i, 'SVT$1'),
      });
    }
  }
  return out;
}

/** The window a match starts in, if any (only matches with a published time). */
export function tvWindowOf(m: Pick<Match, 'start' | 'timeKnown'>, windows: TvWindow[]): TvWindow | null {
  if (!m.start || !m.timeKnown) return null;
  const date = m.start.slice(0, 10);
  const hm = m.start.slice(11, 16);
  return windows.find((w) => w.date === date && w.from <= hm && hm <= w.to) ?? null;
}
