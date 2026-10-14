'use client';

// The page body: one toggle Kommande | Resultat, two filters (class, player), then the matches by
// day; Kommande starts with the latest finished match. The view and filters live in the URL (?visa=resultat&klass=787&spelare=5687) so a view can be
// shared.

import { useEffect, useMemo, useState } from 'react';
import { track } from '@vercel/analytics';
import type { ClassInfo, HomePlayer, Match } from '@/lib/model';
import { weekdayDate } from '@/lib/format';
import { MatchRow } from './MatchRow';

export type View = 'kommande' | 'resultat';

interface Props {
  matches: Match[];
  classes: ClassInfo[];
  players: HomePlayer[];
  today: string; // "2026-10-14", Swedish time
  initialView: View | null;
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
            {d ? (d === today ? <span className="today">Idag · {weekdayDate(d)}</span> : weekdayDate(d)) : 'Tid ej satt'}
          </h3>
          <ol className="rows" aria-label={`${label} ${d}`}>
            {list.map((m) => <MatchRow key={m.id} m={m} />)}
          </ol>
        </div>
      ))}
    </>
  );
}

/** A filter as a dropdown pill; dark when something other than "all" is chosen. */
function Pick({ label, value, onChange, children }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="pick">
      <span className="sr-only">{label}</span>
      <select className={value ? 'on' : undefined} value={value} onChange={(e) => onChange(e.target.value)}>
        {children}
      </select>
    </label>
  );
}

export function MatchesView({ matches, classes, players, today, initialView, initialClass, initialPlayer }: Props) {
  const [cls, setCls] = useState<number | null>(initialClass);
  const [player, setPlayer] = useState<string | null>(initialPlayer);
  const anyAhead = matches.some((m) => m.status !== 'done');
  const [view, setView] = useState<View>(initialView ?? (anyAhead ? 'kommande' : 'resultat'));

  useEffect(() => {
    const u = new URL(window.location.href);
    const set = (k: string, v: string | null) => (v ? u.searchParams.set(k, v) : u.searchParams.delete(k));
    set('visa', view === 'resultat' ? 'resultat' : null);
    set('klass', cls ? String(cls) : null);
    set('spelare', player);
    window.history.replaceState(window.history.state, '', u);
  }, [view, cls, player]);

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
  // The latest finished match (by start time) heads the Kommande view.
  const latest = done[0] ?? null;
  const won = done.filter((m) => m.outcome === 'won').length;
  const lost = done.filter((m) => m.outcome === 'lost').length;

  const usedClasses = classes.filter((c) => matches.some((m) => m.classId === c.id));

  return (
    <>
      <div className="controls">
        <div className="seg" role="radiogroup" aria-label="Visa">
          <button type="button" role="radio" aria-checked={view === 'kommande'} onClick={() => setView('kommande')}>
            Kommande <span className="seg-n">{live.length + upcoming.length}</span>
          </button>
          <button type="button" role="radio" aria-checked={view === 'resultat'} onClick={() => setView('resultat')}>
            Resultat <span className="seg-n">{done.length}</span>
          </button>
        </div>
        <div className="picks">
          {usedClasses.length > 1 && (
            <Pick label="Klass" value={cls ? String(cls) : ''} onChange={(v) => setCls(v ? Number(v) : null)}>
              <option value="">Alla klasser</option>
              {usedClasses.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </Pick>
          )}
          {players.length > 1 && (
            <Pick label="Spelare" value={player ?? ''} onChange={(v) => {
              setPlayer(v || null);
              // custom event: which Swedes people follow (a public name, nothing about the visitor)
              const name = players.find((p) => p.key === v)?.name;
              if (name) track('Spelarfilter', { spelare: name });
            }}>
              <option value="">Alla spelare</option>
              {players.map((p) => (
                <option key={p.key} value={p.key}>{p.name}</option>
              ))}
            </Pick>
          )}
        </div>
      </div>

      {view === 'kommande' ? (
        <section className="list" aria-label="Kommande matcher">
          {latest && (
            <div className="latest">
              <h3 className="day latest-head">
                <span>
                  Senast avslutad
                  {latest.start && latest.start.slice(0, 10) !== today && ` · ${weekdayDate(latest.start)}`}
                </span>
                <button type="button" className="textbtn" onClick={() => setView('resultat')}>Alla resultat</button>
              </h3>
              <ol className="rows" aria-label="Senast avslutad"><MatchRow m={latest} /></ol>
            </div>
          )}
          {live.length > 0 && (
            <div>
              <h3 className="day live-head">Pågår nu</h3>
              <ol className="rows" aria-label="Pågår nu">{live.map((m) => <MatchRow key={m.id} m={m} />)}</ol>
            </div>
          )}
          {upcoming.length > 0 && <DayList ms={upcoming} today={today} label="Kommande" />}
          {live.length + upcoming.length === 0 && <p className="empty">Inga kommande matcher just nu.</p>}
        </section>
      ) : (
        <section className="list" aria-label="Resultat">
          {done.length > 0 ? (
            <>
              <p className="tally">
                {won} {won === 1 ? 'vinst' : 'vinster'} · {lost} {lost === 1 ? 'förlust' : 'förluster'}
              </p>
              <DayList ms={done} today={today} label="Resultat" />
            </>
          ) : (
            <p className="empty">Inga spelade matcher än.</p>
          )}
        </section>
      )}
    </>
  );
}
