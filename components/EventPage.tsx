import { notFound } from 'next/navigation';
import { getEventData } from '@/lib/stupa';
import { homePlayers, shortEventName } from '@/lib/model';
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

export async function EventPage({ eventId, searchParams }: {
  eventId: number;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const data = await getEventData(eventId);
  if (!data) notFound();
  const { event, classes, matches } = data;
  const players = homePlayers(matches);
  const today = swedishNow(Date.now()).date;
  const updated = swedishNow(data.fetchedAt).time;
  const klass = Number(searchParams.klass) || null;
  const spelare = typeof searchParams.spelare === 'string' ? searchParams.spelare : null;

  return (
    <>
      <h1 className="title">{shortEventName(event.name, event.start)}</h1>
      <p className="meta">
        {event.start ? `${dateRange(event.start, event.end)} · ` : ''}
        {matches.length} matcher · uppdaterad {updated}
      </p>
      {data.stale && (
        <p className="notice" role="status">ETTU svarar inte just nu. Du ser de senast hämtade resultaten.</p>
      )}
      {data.hasTeamClasses && (
        <p className="notice">Lagklasserna visas inte här, bara singel och dubbel.</p>
      )}
      {matches.length === 0 ? (
        <p className="empty" style={{ marginTop: 'var(--sp-8)' }}>
          {classes.length ? 'Inga svenska matcher i den här tävlingen än.' : 'Tävlingen har bara lagklasser.'}
        </p>
      ) : (
        <MatchesView
          matches={matches}
          classes={classes}
          players={players}
          today={today}
          initialClass={klass}
          initialPlayer={spelare}
        />
      )}
      <AutoRefresh seconds={30} />
    </>
  );
}
