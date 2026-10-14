'use client';

// The event page's body: class and player filters, then Pågår / Kommande / Resultat. The filters
// live in the URL (?klass=787&spelare=5687) so a filtered view can be shared.

import { useEffect, useMemo, useState } from 'react';
import type { ClassInfo, HomePlayer, Match } from '@/lib/model';
import { score, weekdayDate } from '@/lib/format';
import { MatchRow } from './MatchRow';

interface Props {
  matches: Match[];
  classes: ClassInfo[];
  players: HomePlayer[];
  today: string; // "2026-10-14", Swedish time
  initialClass: number | null;
  initialPlayer: string | null;
}

function byDay(ms: Match[]): Array<[string, Match[]]> {
  const out = new Map<string, Match[]>();
  for (const m of ms) {
    const d = m.start?.slice(0, 10) ?? '';
    out.set(d, [...(out.get(d) ?? []), m]);
  }
  return [...out.entries()];
}

function DayList({ ms, today, label }: { ms: Match[]; today: string; label: string }) {
  return (
    <>
      {byDay(ms).map(([d, list]) => (
        <div key={d || 'none'}>
          <h3 className="day">
            {d ? (
              d === today ? <span className="today">Idag · {weekdayDate(d)}</span> : weekdayDate(d)
            ) : (
              'Tid ej satt'
            )}
          </h3>
          <ol className="rows" aria-label={`${label} ${d}`}>
            {list.map((m) => <MatchRow key={m.id} m={m} />)}
          </ol>
        </div>
      ))}
    </>
  );
}

export function MatchesView({ matches, classes, players, today, initialClass, initialPlayer }: Props) {
  const [cls, setCls] = useState<number | null>(initialClass);
  const [player, setPlayer] = useState<string | null>(initialPlayer);

  useEffect(() => {
    const u = new URL(window.location.href);
    if (cls) u.searchParams.set('klass', String(cls));
    else u.searchParams.delete('klass');
    if (player) u.searchParams.set('spelare', player);
    else u.searchParams.delete('spelare');
    window.history.replaceState(window.history.state, '', u);
  }, [cls, player]);

  const shown = useMemo(
    () =>
      matches.filter(
        (m) =>
          (!cls || m.classId === cls) &&
          (!player || [...m.a.players, ...m.b.players].some((p) => p.key === player)),
      ),
    [matches, cls, player],
  );
  const live = shown.filter((m) => m.status === 'live');
  const upcoming = shown.filter((m) => m.status === 'upcoming');
  const done = shown.filter((m) => m.status === 'done').reverse();
  const won = done.filter((m) => m.outcome === 'won').length;
  const lost = done.filter((m) => m.outcome === 'lost').length;

  const usedClasses = classes.filter((c) => matches.some((m) => m.classId === c.id));

  return (
    <>
      <div className="controls">
        {usedClasses.length > 1 && (
          <div className="chips" role="group" aria-label="Klass">
            <button type="button" className="chip" aria-pressed={cls === null} onClick={() => setCls(null)}>
              Alla klasser
            </button>
            {usedClasses.map((c) => (
              <button key={c.id} type="button" className="chip" aria-pressed={cls === c.id}
                onClick={() => setCls(cls === c.id ? null : c.id)}>
                {c.label}
              </button>
            ))}
          </div>
        )}
        {players.length > 1 && (
          <div className="chips" role="group" aria-label="Spelare">
            <button type="button" className="chip" aria-pressed={player === null} onClick={() => setPlayer(null)}>
              Alla spelare
            </button>
            {players.map((p) => (
              <button key={p.key} type="button" className="chip" aria-pressed={player === p.key}
                onClick={() => setPlayer(player === p.key ? null : p.key)}>
                {p.name}
                {p.won + p.lost > 0 && (
                  <span className="rec"><span className="sr-only">vinster och förluster </span>{score(p.won, p.lost)}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {live.length > 0 && (
        <section className="section" aria-labelledby="h-live">
          <h2 className="h2" id="h-live">Pågår</h2>
          <ol className="rows">{live.map((m) => <MatchRow key={m.id} m={m} />)}</ol>
        </section>
      )}

      <section className="section" aria-labelledby="h-next">
        <h2 className="h2" id="h-next">
          Kommande <span className="count">{upcoming.length}</span>
        </h2>
        {upcoming.length ? (
          <DayList ms={upcoming} today={today} label="Kommande" />
        ) : (
          <p className="empty">Inga kommande matcher just nu.</p>
        )}
      </section>

      <section className="section" aria-labelledby="h-done">
        <h2 className="h2" id="h-done">
          Resultat
          {done.length > 0 && (
            <span className="count">
              {won} {won === 1 ? 'vinst' : 'vinster'}, {lost} {lost === 1 ? 'förlust' : 'förluster'}
            </span>
          )}
        </h2>
        {done.length ? (
          <DayList ms={done} today={today} label="Resultat" />
        ) : (
          <p className="empty">Inga spelade matcher än.</p>
        )}
      </section>
    </>
  );
}
