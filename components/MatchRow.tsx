import type { Match, Player } from '@/lib/model';
import { clock, score, weekdayDate } from '@/lib/format';
import { Nation } from './Nation';
import { SvtLink } from './SvtLink';

/** Text whose last word stays on one line with the flag after it. */
function WithFlag({ text, code }: { text: string; code: string | null }) {
  if (!code) return <>{text}</>;
  const i = text.lastIndexOf(' ');
  return (
    <>
      {i > 0 && text.slice(0, i + 1)}
      <span className="nw">
        {i > 0 ? text.slice(i + 1) : text}
        <Nation code={code} />
      </span>
    </>
  );
}

/**
 * One side: a player by full name, a pair by initials ("E. Dorr / F. Bourrassaud") with one flag when
 * both play for the same country. Swedes get no flag unless both sides are Swedish.
 */
function SideNames({ players, flagHome }: { players: Player[]; flagHome: boolean }) {
  const code = (p: Player) => (p.home && !flagHome ? null : p.code);
  if (players.length === 1) return <WithFlag text={players[0].name} code={code(players[0])} />;
  const codes = players.map(code);
  if (codes.every((c) => c === codes[0])) {
    return <WithFlag text={players.map((p) => p.short).join(' / ')} code={codes[0]} />;
  }
  return (
    <>
      {players.map((p, i) => (
        <span key={p.key}>
          {i > 0 && ' / '}
          <WithFlag text={p.short} code={code(p)} />
        </span>
      ))}
    </>
  );
}

function Mark({ m }: { m: Match }) {
  if (m.status === 'live') return <span className="res live" aria-label="pågår" />;
  if (m.outcome === 'won') return <span className="res w" aria-label="vinst">V</span>;
  if (m.outcome === 'lost') return <span className="res l" aria-label="förlust">F</span>;
  return null;
}

/** The game in play while live: the last game, unless it is already decided. */
function runningGame(m: Match): number {
  if (m.status !== 'live' || m.games.length === 0) return -1;
  const [a, b] = m.games[m.games.length - 1];
  const decided = Math.max(a, b) >= 11 && Math.abs(a - b) >= 2;
  return decided ? -1 : m.games.length - 1;
}

function when(start: string | null, timeKnown: boolean): string {
  if (!start) return '';
  return timeKnown ? `${weekdayDate(start)} ${clock(start)}` : weekdayDate(start);
}

export function MatchRow({ m }: { m: Match }) {
  const now = runningGame(m);
  const walkover = m.a.walkover || m.b.walkover;
  const hiddenTime = m.status === 'upcoming' && !!m.start && !m.timeKnown;
  const info = [m.classLabel, m.round, m.table ? `Bord ${m.table}` : null, hiddenTime ? 'tid ej klar' : null]
    .filter((x): x is string => !!x);
  const time = m.start ? (m.timeKnown ? clock(m.start) : '–') : '';

  return (
    <li className="row">
      <span className="row-time">{time}</span>
      <span className="row-mark"><Mark m={m} /></span>
      <div className="row-main">
        <div className="row-home">
          <span className={m.outcome === 'lost' ? 'lost-name' : undefined}>
            <SideNames players={m.a.players} flagHome={m.derby} />
          </span>
          {m.status === 'live' && <span className="tag live">Pågår</span>}
          {m.derby && <span className="tag">Svensk duell</span>}
        </div>
        <div className="row-opp">
          <span className="vs">mot </span>
          {m.b.players.length ? <SideNames players={m.b.players} flagHome={m.derby} /> : m.oppLabel}
        </div>
        <div className="row-info">
          {/* each part stays whole ("Bord 1"); the line breaks only between parts */}
          {info.map((x, i) => (
            <span key={i} className="nw">{i > 0 && ' · '}{x}</span>
          ))}
          {m.tv && (
            <SvtLink className="tv" plats="match" spelare={m.a.players.map((p) => p.name).join(' / ')}
              label={`Se på ${m.tv} (öppnas i ny flik)`}>
              <span aria-hidden>▶</span> {m.tv}
            </SvtLink>
          )}
        </div>
        {m.next && (
          <div className="row-next">
            <b>Nästa:</b> {m.next.round} mot {m.next.opp}
            {m.next.start && <span className="row-next-when"> · {when(m.next.start, m.next.timeKnown)}</span>}
          </div>
        )}
      </div>
      <div className="row-sets">
        {walkover ? (
          <span className="sets muted">WO</span>
        ) : m.status !== 'upcoming' ? (
          <span className="sets">{score(m.a.sets, m.b.sets)}</span>
        ) : null}
      </div>
      {m.games.length > 0 && (
        <div className="games" aria-label="game">
          {m.games.map(([a, b], i) => (
            <span key={i} className={i === now ? 'now' : a > b ? 'won' : undefined}>
              {score(a, b)}
            </span>
          ))}
        </div>
      )}
    </li>
  );
}
