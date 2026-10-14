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
  table: string | null;
  status: Status;
  a: Side; // a home side (Swedish)
  b: Side;
  /** Games from side a's view; the running game last while live. */
  games: Array<[number, number]>;
  /** won / lost from the Swedish side; null while not done or when both sides are Swedish. */
  outcome: 'won' | 'lost' | null;
  derby: boolean;
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

/** "MOREGARD Truls" -> "Truls Moregård", "DE LAS HERAS Rafael" -> "Rafael De Las Heras". */
export function displayName(raw: string, home = false): string {
  const tokens = raw.trim().split(/\s+/);
  const isUpper = (t: string) => /\p{Lu}/u.test(t) && t === t.toUpperCase();
  let n = 0;
  while (n < tokens.length && isUpper(tokens[n])) n++;
  if (n === 0 || n === tokens.length) return titleCase(raw.trim());
  const surnameRaw = tokens.slice(0, n).join(' ');
  const surname = (home && SWEDISH_SPELLING[surnameRaw]) || titleCase(surnameRaw);
  return `${tokens.slice(n).join(' ')} ${surname}`;
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
    table: tableOf(m),
    status,
    a,
    b,
    games,
    outcome,
    derby,
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

const TEST_NAME = /\b(test|demo|copy|temp|dummy|global game|online entry)\b/i;

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

/** Published individual tournaments, no test events, newest first. */
export function listedEvents(raw: Raw[]): EventInfo[] {
  return raw
    .filter((e) => e && e.event_type === 'T' && e.published !== false && !e.is_deleted)
    .map(toEvent)
    .filter((e) => e.name && !TEST_NAME.test(e.name))
    .sort((x, y) => (y.start ?? '').localeCompare(x.start ?? '') || y.id - x.id);
}

/** The event to open by default: one that is on today, else the next one, else the latest. */
export function defaultEvent(events: EventInfo[], today: string): EventInfo | null {
  const on = events.find((e) => e.start && e.end && e.start <= today && today <= e.end);
  if (on) return on;
  const next = events
    .filter((e) => e.start && e.start > today)
    .sort((x, y) => (x.start ?? '').localeCompare(y.start ?? ''))[0];
  return next ?? events[0] ?? null;
}

/** "2026 European Individual Championships" -> "EM 2026"; unknown names stay as they are. */
export function shortEventName(name: string, start?: string | null): string {
  const year = name.match(/\b(20\d\d)\b/)?.[1] ?? start?.slice(0, 4) ?? '';
  const age = name.match(/\bU\s?(\d{2})\b/i)?.[1];
  const rules: Array<[RegExp, string]> = [
    [/youth championships/i, 'Ungdoms-EM'],
    [/team championships/i, 'Lag-EM'],
    [/top\s?16/i, 'Europe Top 16'],
    [/top\s?10/i, 'Europe Youth Top 10'],
    [/u\s?\d{2}.*championships|championships.*u\s?\d{2}/i, `U${age}-EM`],
    [/european (individual )?championships/i, 'EM'],
  ];
  const hit = rules.find(([re]) => re.test(name));
  return hit ? `${hit[1]} ${year}`.trim() : name;
}
