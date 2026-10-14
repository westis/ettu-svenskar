import type { Match, Player, Side } from '@/lib/model';
import { clock, score } from '@/lib/format';
import { Nation } from './Nation';

function Names({ side, showHomeCode }: { side: Side; showHomeCode: boolean }) {
  return (
    <>
      {side.players.map((p: Player, i) => (
        <span key={p.key}>
          {i > 0 && ' / '}
          {p.name}
          {(!p.home || showHomeCode) && <Nation code={p.code} />}
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

export function MatchRow({ m }: { m: Match }) {
  const now = runningGame(m);
  const walkover = m.a.walkover || m.b.walkover;
  const info = [m.classLabel, m.round, m.table ? `Bord ${m.table}` : null].filter(Boolean).join(' · ');
  let sets: React.ReactNode = null;
  if (walkover) sets = <div className="sets muted">WO</div>;
  else if (m.status !== 'upcoming') sets = <div className="sets">{score(m.a.sets, m.b.sets)}</div>;

  return (
    <li className="row">
      <span className="row-time">{m.start ? clock(m.start) : ''}</span>
      <span className="row-mark"><Mark m={m} /></span>
      <div className="row-main">
        <div className="row-home">
          <span className={m.outcome === 'lost' ? 'lost-name' : undefined}>
            <Names side={m.a} showHomeCode={false} />
          </span>
          {m.status === 'live' && <span className="tag live">Pågår</span>}
          {m.derby && <span className="tag">Svensk duell</span>}
        </div>
        <div className="row-opp">
          <span className="vs">mot </span>
          <Names side={m.b} showHomeCode={m.derby} />
        </div>
        <div className="row-info">{info}</div>
      </div>
      <div className="row-score">
        {sets}
        {m.games.length > 0 && (
          <div className="games" aria-label="game">
            {m.games.map(([a, b], i) => (
              <span key={i} className={i === now ? 'now' : a > b ? 'won' : undefined}>
                {score(a, b)}
              </span>
            ))}
          </div>
        )}
      </div>
    </li>
  );
}
