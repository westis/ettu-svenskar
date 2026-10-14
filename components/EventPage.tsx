import { getEventData } from '@/lib/stupa';
import type { EventInfo } from '@/lib/model';
import { eventTitle, homePlayers } from '@/lib/model';
import { dateRange } from '@/lib/format';
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
  const data = await getEventData(event);
  const { classes, matches } = data;
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
