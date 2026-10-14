import { getEventData } from '@/lib/stupa';
import { getTvWindows } from '@/lib/svt';
import { type TvWindow, SVT_PLAY_URL, tvWindowOf } from '@/lib/tv';
import type { EventInfo } from '@/lib/model';
import { eventTitle, homePlayers } from '@/lib/model';
import { dateRange, weekdayDate } from '@/lib/format';
import { AutoRefresh } from './AutoRefresh';
import { MatchesView } from './MatchesView';

const TZ = 'Europe/Stockholm';

function swedishNow(ms: number): { date: string; time: string } {
  const f = new Intl.DateTimeFormat('sv-SE', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(new Date(ms));
  const p = Object.fromEntries(f.map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

export async function EventPage({ event, searchParams }: {
  event: EventInfo;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const [data, tv] = await Promise.all([getEventData(event), getTvWindows(event)]);
  const classes = data.classes;
  const matches = data.matches.map((m) => ({ ...m, tv: tvWindowOf(m, tv)?.channel ?? null }));
  const players = homePlayers(matches);
  const today = swedishNow(Date.now()).date;
  const updated = swedishNow(data.fetchedAt).time;
  const klass = Number(searchParams.klass) || null;
  const spelare = typeof searchParams.spelare === 'string' ? searchParams.spelare : null;
  const visa = searchParams.visa === 'resultat' ? 'resultat' : searchParams.visa === 'kommande' ? 'kommande' : null;

  return (
    <>
      <h1 className="title">{eventTitle(event)}</h1>
      <p className="meta">
        {event.start ? `${dateRange(event.start, event.end)} · ` : ''}
        {matches.length} matcher · uppdaterad {updated}
      </p>
      <TvLine windows={tv} today={today} />
      <p className="linkline">
        {/* ettu.tv keeps the chosen class out of its URL, so this opens its draw page (men's singles first) */}
        <a href={`https://www.ettu.tv/events/${event.id}/4/1/5/5`} target="_blank" rel="noopener noreferrer">
          Lottning och resultat på ettu.tv <span aria-hidden>↗</span>
        </a>
      </p>
      {data.stale && (
        <p className="notice" role="status">ETTU svarar inte just nu. Du ser de senast hämtade resultaten.</p>
      )}
      {matches.length === 0 ? (
        <p className="empty" style={{ marginTop: 'var(--sp-8)' }}>
          Inga svenska matcher i EM än.
        </p>
      ) : (
        <MatchesView
          matches={matches}
          classes={classes}
          players={players}
          today={today}
          initialView={visa}
          initialClass={klass}
          initialPlayer={spelare}
        />
      )}
      {/* faster while a Swedish match is on: the live feed changes every point */}
      <AutoRefresh seconds={matches.some((m) => m.status === 'live') ? 10 : 30} />
    </>
  );
}

/** "På SVT Play idag 15:45–17:30, 19:00–21:30", else the next day with a broadcast. */
function TvLine({ windows, today }: { windows: TvWindow[]; today: string }) {
  const days = [...new Set(windows.map((w) => w.date))].filter((d) => d >= today).sort();
  if (!days.length) return null;
  const day = days[0];
  const list = windows.filter((w) => w.date === day);
  const channels = [...new Set(list.map((w) => w.channel))].join(' och ');
  const times = list.map((w) => `${w.from}–${w.to}`).join(', ');
  return (
    <p className="tvline">
      <a href={SVT_PLAY_URL} target="_blank" rel="noopener noreferrer">
        <span aria-hidden>▶</span> {channels}
      </a>{' '}
      {day === today ? 'idag' : weekdayDate(day)} {times}
    </p>
  );
}
