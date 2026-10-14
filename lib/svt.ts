import 'server-only';

// SVT's TV windows for the EM. The server tries SVT's guide (cached 30 min), but SVT's CDN
// (Akamai) refuses Node's requests, so the schedule bundled in lib/tv-schedule.json (rebuilt with
// `curl … | npm run tv`, see scripts/update-tv.ts) is the fallback and usually the source.

import { cached } from './cache';
import { type TvWindow, SVT_GUIDE_URL, htmlToLines, parseTvGuide } from './tv';
import type { EventInfo } from './model';
import bundled from './tv-schedule.json';

export async function getTvWindows(event: EventInfo): Promise<TvWindow[]> {
  if (!event.start || !event.end) return [];
  const inEvent = (ws: TvWindow[]) => ws.filter((w) => w.date >= event.start! && w.date <= event.end!);
  // A failure is cached too (as the bundled schedule), so SVT is asked at most every 30 minutes.
  const r = await cached(`svt:${event.id}`, 30 * 60_000, async () => {
    try {
      const res = await fetch(SVT_GUIDE_URL, { cache: 'no-store', signal: AbortSignal.timeout(5_000) });
      if (!res.ok) throw new Error(`SVT HTTP ${res.status}`);
      const ws = parseTvGuide(htmlToLines(await res.text()), event.start!, event.end!);
      if (ws.length) return ws;
    } catch {
      // fall through to the bundled schedule
    }
    return (bundled as { windows: TvWindow[] }).windows;
  });
  return inEvent(r.value);
}
