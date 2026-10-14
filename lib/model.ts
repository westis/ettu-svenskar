// Raw Stupa (tenant `ettu`) responses -> the matches this app shows: every match with a Swedish
// player, Swedish side first. Pure functions, no fetching; tested in tests/model.test.ts.
//
// Facts about the data (checked against the 2026 European Individual Championships, event 167):
// - `start_time` is the venue's wall clock with no offset ("2026-10-14T14:15:00"); keep it as text.
// - status: NOT_STARTED / IN_PROGRESS / SCORED, SKIPPED = a bye (no match).
// - `points` holds every game's score, the running game included while IN_PROGRESS.
// - `walkover: true` marks the side that WON on a walkover; its games are fake 11-0s.
// - Each player's association code is in `selected_parents[].parent_abbr`, joined on `user_role_id`
//   ("SWE", "FRA", "ETTU2" for neutral athletes). A pair can have two countries. Events from 2025
//   leave parent_abbr empty and name the country in `parent_name` instead.

import { codeFromCountry, HOME_CODE } from './countries';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Raw = any;

export type Status = 'upcoming' | 'live' | 'done';

export interface Player {
  key: string;
  name: string; // "Truls Moregård"
  short: string; // "T. Moregård", for pairs
  code: string | null; // "SWE"
  home: boolean;
}

export interface Side {
  players: Player[];
  sets: number;
  won: boolean;
  walkover: boolean;
}

export interface Match {
  id: number;
  classId: number;
  classLabel: string; // "Herrsingel"
  round: string; // "Pool 7", "Åttondel", "Kval · 16-del"
  start: string | null; // "2026-10-14T14:15:00", venue time
  /** false: ETTU has a slot but does not publish the time yet; show the day only. */
  timeKnown: boolean;
  table: string | null;
  status: Status;
  a: Side; // a home side (Swedish)
  b: Side;
  /** Games from side a's view; the running game last while live. */
  games: Array<[number, number]>;
  /** won / lost from the Swedish side; null while not done or when both sides are Swedish. */
  outcome: 'won' | 'lost' | null;
  derby: boolean;
  /** From the bracket, not yet in the match list: the opponent may be unknown (see oppLabel). */
  pending: boolean;
  /** Text for an unknown opponent: "vinnaren av A. Dorr / F. Bourrassaud – …". */
  oppLabel: string | null;
  /** For a knockout win: the Swedish side's next match. */
  next: NextInfo | null;
}

export interface NextInfo {
  round: string;
  opp: string;
  start: string | null;
  timeKnown: boolean;
}

export interface ClassInfo {
  id: number;
  label: string;
}

// ---- classes -------------------------------------------------------------------------------

const NAMES: Record<string, [string, string]> = {
  // sex + kind -> [senior, youth]
  MS: ['Herrsingel', 'Pojksingel'],
  FS: ['Damsingel', 'Flicksingel'],
  MD: ['Herrdubbel', 'Pojkdubbel'],
  FD: ['Damdubbel', 'Flickdubbel'],
  XD: ['Mixeddubbel', 'Mixeddubbel'],
  MT: ['Herrlag', 'Pojklag'],
  FT: ['Damlag', 'Flicklag'],
  XT: ['Mixedlag', 'Mixedlag'],
};

/**
 * Swedish class label. ETTU's own label comes in three shapes: "Men's Singles", "U15-BS" (B/G =
 * boys/girls, S/D/T = singles/doubles/team, X = mixed) and "MSU21". Falls back to Stupa's type
 * (1 singles, 3 doubles, 4 mixed) and gender (1 M, 2 F, 3 mixed or unset).
 */
export function classLabel(cat: Raw): string {
  const raw = String(cat.category_display_label || cat.category_description || '').trim();
  const age = raw.match(/U\s?(\d{2})/i)?.[1];
  let sex = '';
  let kind = '';
  let youth = false;
  if (/\b(singles?|doubles?|team)\b/i.test(raw)) {
    if (/\bmixed\b/i.test(raw)) sex = 'X';
    else if (/\b(women'?s?|girls?|ladies)\b/i.test(raw)) sex = 'F';
    else if (/\b(men'?s?|boys?)\b/i.test(raw)) sex = 'M';
    youth = /\b(boys?|girls?)\b/i.test(raw);
    kind = /singles?/i.test(raw) ? 'S' : /doubles?/i.test(raw) ? 'D' : 'T';
  } else {
    const code = raw.replace(/U\s?\d{2}/gi, '').replace(/[^A-Za-z]/g, '').toUpperCase();
    if (/^[BGMWX][SDT]$/.test(code)) {
      sex = { B: 'M', M: 'M', G: 'F', W: 'F', X: 'X' }[code[0]]!;
      youth = code[0] === 'B' || code[0] === 'G';
      kind = code[1];
    }
  }
  if (!sex || !kind) {
    const type = cat.participant_type_id;
    const g = cat.gender_id;
    kind = type === 1 ? 'S' : type === 2 ? 'T' : 'D';
    sex = type === 4 || g === 3 ? (type === 1 ? 'M' : 'X') : g === 2 ? 'F' : 'M';
  }
  const names = NAMES[sex + kind];
  const base = names ? names[youth ? 1 : 0] : String(cat.name ?? 'Klass');
  return age ? `${base} U${age}` : base;
}

const CLASS_ORDER = [
  'Herrsingel', 'Pojksingel', 'Damsingel', 'Flicksingel', 'Herrdubbel', 'Pojkdubbel',
  'Damdubbel', 'Flickdubbel', 'Mixeddubbel',
];

export function classSort(label: string): number {
  const i = CLASS_ORDER.findIndex((c) => label.startsWith(c));
  return i < 0 ? CLASS_ORDER.length : i;
}

/** Individual classes only: team events (type 2) play their singles inside ties, not handled here. */
export function isIndividual(cat: Raw): boolean {
  return [1, 3, 4].includes(cat.participant_type_id);
}

// ---- rounds --------------------------------------------------------------------------------

const KO_ROUNDS: Array<[RegExp, string]> = [
  [/round of 128/i, '64-del'],
  [/round of 64/i, '32-del'],
  [/round of 32/i, '16-del'],
  [/round of 16/i, 'Åttondel'],
  [/quarter/i, 'Kvartsfinal'],
  [/semi/i, 'Semifinal'],
  [/^final$/i, 'Final'],
];

export function roundLabel(stageName: string, groupName: string | null, round: Raw): string {
  const group = groupName ?? '';
  const g = group.match(/group\s*(\d+)/i);
  if (g) return `Pool ${g[1]}`;
  const conf = round?.configuration ?? {};
  let label = '';
  if (conf.is_position_match && conf.position_range_start && conf.position_range_end) {
    label = `Plats ${conf.position_range_start}–${conf.position_range_end}`;
  } else {
    const name = String(round?.name ?? '').trim();
    label = KO_ROUNDS.find(([re]) => re.test(name))?.[1] ?? name;
  }
  return /qual/i.test(stageName) ? `Kval · ${label}` : label;
}

// ---- players -------------------------------------------------------------------------------

// The ETTU register has no Swedish letters; the Swedish players' own spellings.
const SWEDISH_SPELLING: Record<string, string> = {
  MOREGARD: 'Moregård',
  KALLBERG: 'Källberg',
  BENJEGARD: 'Benjegård',
};

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/(^|[\s\-'’])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

/** "MOREGARD Truls" -> first "Truls", last "Moregård"; "DE LAS HERAS Rafael" -> "Rafael", "De Las Heras". */
export function nameParts(raw: string, home = false): { first: string; last: string } {
  const tokens = raw.trim().split(/\s+/);
  const isUpper = (t: string) => /\p{Lu}/u.test(t) && t === t.toUpperCase();
  let n = 0;
  while (n < tokens.length && isUpper(tokens[n])) n++;
  if (n === 0 || n === tokens.length) return { first: '', last: titleCase(raw.trim()) };
  const surnameRaw = tokens.slice(0, n).join(' ');
  const last = (home && SWEDISH_SPELLING[surnameRaw]) || titleCase(surnameRaw);
  return { first: tokens.slice(n).join(' '), last };
}

/** "MOREGARD Truls" -> "Truls Moregård". */
export function displayName(raw: string, home = false): string {
  const { first, last } = nameParts(raw, home);
  return first ? `${first} ${last}` : last;
}

/** "T. Moregård": pairs are shown with initials. */
export function shortName(raw: string, home = false): string {
  const { first, last } = nameParts(raw, home);
  return first ? `${first[0]}. ${last}` : last;
}

function playersOf(p: Raw): Player[] {
  const parents: Raw[] = p.selected_parents ?? [];
  return (p.participant_details ?? []).map((d: Raw, i: number) => {
    const parent = parents.find((x) => x.user_role_id === d.user_role_id) ?? parents[i];
    // 2026 events fill parent_abbr; 2025 events only parent_name ("Hungary") or meta_data.country.
    const code: string | null =
      parent?.parent_abbr || codeFromCountry(parent?.parent_name) || codeFromCountry(d.meta_data?.country) || null;
    const home = code === HOME_CODE;
    return {
      key: String(d.user_role_id ?? d.name),
      name: displayName(String(d.name ?? '?'), home),
      short: shortName(String(d.name ?? '?'), home),
      code: home ? HOME_CODE : code,
      home,
    };
  });
}

// ---- matches -------------------------------------------------------------------------------

function statusOf(raw: string | null | undefined, anyScore: boolean): Status | null {
  switch (raw) {
    case 'SKIPPED':
      return null;
    case 'SCORED':
    case 'COMPLETED':
    case 'FINISHED':
      return 'done';
    case 'IN_PROGRESS':
    case 'LIVE':
      return 'live';
    case 'NOT_STARTED':
    case 'SCHEDULED':
      return anyScore ? 'live' : 'upcoming';
    default:
      return anyScore ? 'done' : 'upcoming';
  }
}

function gamesOf(pa: Raw, pb: Raw): Array<[number, number]> {
  const a: number[] = pa.points ?? [];
  const b: number[] = pb.points ?? [];
  const out: Array<[number, number]> = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = Number(a[i] ?? 0);
    const y = Number(b[i] ?? 0);
    if (x === 0 && y === 0) continue;
    out.push([x, y]);
  }
  return out;
}

function tableOf(m: Raw): string | null {
  const labels = m.meta?.table_labels;
  const ids: number[] = m.table_ids ?? [];
  if (ids.length) return ids.map(String).join(', ');
  if (labels && typeof labels === 'object') {
    const first = Object.keys(labels)[0];
    if (first) return first;
  }
  return null;
}

export interface StageInput {
  classId: number;
  classLabel: string;
  stageName: string;
  /** `get_group_matches` data: a list of groups, each with `matches`. */
  groups: Raw[];
}

/** One raw match -> a Match if a Swedish player is in it and it is a real match (not a bye). */
export function toMatch(m: Raw, stage: StageInput, groupName: string | null): Match | null {
  const ps: Raw[] = m.participants ?? [];
  if (ps.length !== 2) return null;
  if (!ps.every((p) => (p.participant_details ?? []).length > 0)) return null;
  const [pa, pb] = ps;
  const playersA = playersOf(pa);
  const playersB = playersOf(pb);
  const homeA = playersA.some((p) => p.home);
  const homeB = playersB.some((p) => p.home);
  if (!homeA && !homeB) return null;

  const gamesRaw = gamesOf(pa, pb);
  const status = statusOf(m.status, gamesRaw.length > 0);
  if (!status) return null;

  const woA = !!pa.walkover;
  const woB = !!pb.walkover;
  const walkover = woA || woB;
  const setsA = Number(pa.sets_won ?? 0);
  const setsB = Number(pb.sets_won ?? 0);
  let wonA = false;
  let wonB = false;
  if (status === 'done') {
    if (walkover) {
      wonA = woA;
      wonB = woB;
    } else if (setsA !== setsB) {
      wonA = setsA > setsB;
      wonB = !wonA;
    }
  }

  let a: Side = { players: playersA, sets: setsA, won: wonA, walkover: walkover && woA };
  let b: Side = { players: playersB, sets: setsB, won: wonB, walkover: walkover && woB };
  let games = walkover ? [] : gamesRaw;
  if (!homeA) {
    [a, b] = [b, a];
    games = games.map(([x, y]) => [y, x]);
  }
  const derby = homeA && homeB;
  const outcome = status !== 'done' || derby || (!a.won && !b.won) ? null : a.won ? 'won' : 'lost';

  return {
    id: Number(m.id),
    classId: stage.classId,
    classLabel: stage.classLabel,
    round: roundLabel(stage.stageName, groupName, m.round),
    start: m.start_time ?? m.slot?.start_time ?? null,
    timeKnown: m.show_schedule_details !== false,
    table: tableOf(m),
    status,
    a,
    b,
    games,
    outcome,
    derby,
    pending: false,
    oppLabel: null,
    next: null,
  };
}

export function stageMatches(stage: StageInput): Match[] {
  const out: Match[] = [];
  for (const g of stage.groups ?? []) {
    const groupName: string | null = g.name ?? null;
    for (const m of g.matches ?? []) {
      const x = toMatch(m, stage, groupName);
      if (x) out.push(x);
    }
  }
  return out;
}

/** Earliest first; matches without a time last. */
export function byStart(x: Match, y: Match): number {
  const a = x.start ?? '9999';
  const b = y.start ?? '9999';
  if (a !== b) return a < b ? -1 : 1;
  return classSort(x.classLabel) - classSort(y.classLabel) || x.id - y.id;
}

// ---- live scores ---------------------------------------------------------------------------------

/**
 * Overlays the live feed (`get_live_scored_matches?only_in_progress=true`, point by point) on the
 * match list, which ETTU syncs only every minute or two. Same match shape; status, sets and games
 * come from the feed, everything else (round, next match) stays.
 */
export function applyLive(matches: Match[], live: Raw[]): Match[] {
  const byId = new Map<number, Raw>((live ?? []).map((m: Raw) => [Number(m?.id), m]));
  if (!byId.size) return matches;
  return matches.map((x) => {
    const raw = byId.get(x.id);
    if (!raw) return x;
    const y = toMatch(raw, { classId: x.classId, classLabel: x.classLabel, stageName: '', groups: [] }, null);
    if (!y || y.status === 'upcoming') return x;
    return { ...x, status: y.status, a: y.a, b: y.b, games: y.games, outcome: y.outcome };
  });
}

// ---- next match from the bracket --------------------------------------------------------------

export interface BracketInput {
  classId: number;
  classLabel: string;
  stageName: string;
  /** `get_knockout_matches` data.main_bracket: rounds in order, each with `round_name` and `matches`. */
  rounds: Raw[];
}

/** "Truls Moregård" for one player, "E. Dorr / F. Bourrassaud" for a pair. */
export function sideText(players: Player[]): string {
  if (players.length === 1) return players[0].name;
  return players.map((p) => p.short).join(' / ');
}

function filled(p: Raw): boolean {
  return (p?.participant_details ?? []).length > 0;
}

/**
 * Adds what the bracket knows about each Swede's next knockout match: a `next` line on the match
 * they won, and the next match itself (`pending`) when it is not in the match list yet, with the
 * opponent if decided, else "vinnaren av A – B". A bye counts as a win. The last round has no next.
 */
export function withNext(matches: Match[], brackets: BracketInput[]): Match[] {
  const byId = new Map(matches.map((m) => [m.id, m]));
  const out = new Map(matches.map((m) => [m.id, m]));

  for (const b of brackets) {
    const rounds: Raw[] = b.rounds ?? [];
    for (let ri = 0; ri < rounds.length - 1; ri++) {
      for (const bm of rounds[ri].matches ?? []) {
        const ours = byId.get(Number(bm.id));
        let adv: Side | null = null;
        if (ours && ours.status === 'done') {
          adv = ours.a.won ? ours.a : ours.b.won ? ours.b : null;
        } else if (!ours) {
          // a bye: one filled slot, the other empty or "BYE", nothing played
          const ps: Raw[] = bm.participants ?? [];
          const status = bm.leg_details?.[0]?.status;
          const real = ps.filter(filled);
          if (status === 'SKIPPED' && real.length === 1) {
            adv = { players: playersOf(real[0]), sets: 0, won: true, walkover: false };
          }
        }
        if (!adv || !adv.players.some((p) => p.home)) continue;

        const order = Number(bm.order);
        const nm = (rounds[ri + 1].matches ?? []).find((x: Raw) => Number(x.order) === Math.ceil(order / 2));
        if (!nm) continue;
        const existing = byId.get(Number(nm.id));
        if (existing && existing.status !== 'upcoming') continue;

        const advKeys = new Set(adv.players.map((p) => p.key));
        const oppSlot = (nm.participants ?? []).find(
          (p: Raw) => filled(p) && !playersOf(p).some((x) => advKeys.has(x.key)),
        );
        let oppPlayers: Player[] = oppSlot ? playersOf(oppSlot) : [];
        let oppLabel: string | null = null;
        if (!oppPlayers.length) {
          const sib = (rounds[ri].matches ?? []).find(
            (x: Raw) => Number(x.order) === (order % 2 ? order + 1 : order - 1),
          );
          const sides: Raw[] = (sib?.participants ?? []).filter(filled);
          const sibBye = sib?.leg_details?.[0]?.status === 'SKIPPED';
          if (sides.length === 1 && sibBye) oppPlayers = playersOf(sides[0]);
          else if (sides.length === 2) {
            oppLabel = `vinnaren av ${sideText(playersOf(sides[0]))} – ${sideText(playersOf(sides[1]))}`;
          } else oppLabel = 'motståndare inte klar';
        }

        const leg = nm.leg_details?.[0] ?? {};
        const start: string | null = leg.start_time ?? null;
        const timeKnown = nm.show_schedule_details !== false && !!start;
        const round = roundLabel(b.stageName, null, { name: rounds[ri + 1].round_name ?? rounds[ri + 1].name });
        const next: NextInfo = { round, opp: oppPlayers.length ? sideText(oppPlayers) : oppLabel!, start, timeKnown };

        if (ours) out.set(ours.id, { ...ours, next });
        if (!existing) {
          const tables: number[] = leg.tables ?? [];
          out.set(Number(nm.id), {
            id: Number(nm.id),
            classId: b.classId,
            classLabel: b.classLabel,
            round,
            start,
            timeKnown,
            table: tables.length ? tables.join(', ') : null,
            status: 'upcoming',
            a: { players: adv.players, sets: 0, won: false, walkover: false },
            b: { players: oppPlayers, sets: 0, won: false, walkover: false },
            games: [],
            outcome: null,
            derby: oppPlayers.some((p) => p.home),
            pending: true,
            oppLabel,
            next: null,
          });
        }
      }
    }
  }
  return [...out.values()].sort(byStart);
}

// ---- the Swedish players -------------------------------------------------------------------

export interface HomePlayer {
  key: string;
  name: string;
  won: number;
  lost: number;
}

/** Every Swedish player with their wins and losses (doubles count for both partners). */
export function homePlayers(matches: Match[]): HomePlayer[] {
  const map = new Map<string, HomePlayer>();
  for (const m of matches) {
    for (const side of [m.a, m.b]) {
      for (const p of side.players) {
        if (!p.home) continue;
        const hp = map.get(p.key) ?? { key: p.key, name: p.name, won: 0, lost: 0 };
        if (m.status === 'done' && (m.a.won || m.b.won)) {
          if (side.won) hp.won++;
          else hp.lost++;
        }
        map.set(p.key, hp);
      }
    }
  }
  const surname = (n: string) => n.split(' ').slice(-1)[0];
  return [...map.values()].sort((x, y) => surname(x.name).localeCompare(surname(y.name), 'sv'));
}

// ---- events --------------------------------------------------------------------------------

export interface EventInfo {
  id: number;
  name: string;
  start: string | null;
  end: string | null;
  statusText: string;
  type: string;
}

const NOT_SENIOR_EM = /\b(youth|junior|cadet|team|veteran|para|test|demo|copy)\b|\bu\s?\d{2}\b/i;

/** The senior individual European Championships ("2026 European Individual Championships"). */
export function isEM(name: string): boolean {
  return /\beuropean (individual )?championships\b/i.test(name) && !NOT_SENIOR_EM.test(name);
}

export function toEvent(e: Raw): EventInfo {
  return {
    id: Number(e.id),
    name: String(e.name ?? '').trim(),
    start: e.event_start_date ?? null,
    end: e.event_end_date ?? null,
    statusText: String(e.event_status_description ?? ''),
    type: String(e.event_type ?? ''),
  };
}

/** The EMs among ETTU's published events, newest first. */
export function emEvents(raw: Raw[]): EventInfo[] {
  return raw
    .filter((e) => e && e.event_type === 'T' && e.published !== false && !e.is_deleted)
    .map(toEvent)
    .filter((e) => isEM(e.name))
    .sort((x, y) => (y.start ?? '').localeCompare(x.start ?? '') || y.id - x.id);
}

/** The EM to show: the one on today, else the next one, else the latest. */
export function currentEvent(events: EventInfo[], today: string): EventInfo | null {
  const on = events.find((e) => e.start && e.end && e.start <= today && today <= e.end);
  if (on) return on;
  const next = events
    .filter((e) => e.start && e.start > today)
    .sort((x, y) => (x.start ?? '').localeCompare(y.start ?? ''))[0];
  return next ?? events[0] ?? null;
}

/** "EM 2026" */
export function eventTitle(e: EventInfo): string {
  const year = e.name.match(/\b(20\d\d)\b/)?.[1] ?? e.start?.slice(0, 4) ?? '';
  return `EM ${year}`.trim();
}
