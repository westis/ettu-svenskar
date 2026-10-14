import 'server-only';

// Stupa's public API behind ettu.tv (the same backend STTR reads with tenant `sbtf`). Its CORS rules
// reject other sites, so every call is made here, on the server.
//
// The API sometimes answers {"msg": "SOME_ERROR_OCCURRED"} (about 1 call in 3 on 2026-10-14), so
// each call is retried, and a cache keeps the last good answer: a failed refresh shows slightly
// older data instead of an error page.

import {
  type BracketInput,
  type ClassInfo,
  type EventInfo,
  type Match,
  classLabel,
  classSort,
  isIndividual,
  emEvents,
  stageMatches,
  withNext,
} from './model';

const BASE = 'https://testbackend.stupaevents.com';
const TENANT = 'ettu';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Raw = any;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson(path: string): Promise<Raw> {
  let last = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await sleep(600 * attempt);
    try {
      const r = await fetch(BASE + path, {
        headers: { tenant: TENANT, accept: 'application/json' },
        cache: 'no-store',
        signal: AbortSignal.timeout(20_000),
      });
      if (!r.ok) {
        last = `HTTP ${r.status}`;
        continue;
      }
      const j = await r.json();
      if (j && typeof j === 'object' && 'data' in j) return j.data;
      last = String(j?.msg ?? 'no data');
    } catch (e) {
      last = e instanceof Error ? e.message : String(e);
    }
  }
  throw new Error(`Stupa ${path}: ${last}`);
}

// ---- a small stale-if-error cache (per server instance) --------------------------------------

interface Entry {
  value: unknown;
  at: number;
  pending?: Promise<unknown>;
}
const cache = new Map<string, Entry>();

async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<{ value: T; stale: boolean }> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return { value: hit.value as T, stale: false };
  const pending =
    (hit?.pending as Promise<T> | undefined) ??
    load().then(
      (value) => {
        cache.set(key, { value, at: Date.now() });
        return value;
      },
      (err) => {
        const e = cache.get(key);
        if (e) e.pending = undefined;
        throw err;
      },
    );
  if (hit) hit.pending = pending;
  else cache.set(key, { value: undefined, at: 0, pending });
  try {
    return { value: await pending, stale: false };
  } catch (err) {
    if (hit && hit.at > 0) return { value: hit.value as T, stale: true };
    cache.delete(key);
    throw err;
  }
}

// ---- public functions ----------------------------------------------------------------------

/** ETTU's EMs (senior, individual), newest first. */
export async function getEvents(): Promise<EventInfo[]> {
  const { value } = await cached('events', 10 * 60_000, async () =>
    emEvents((await getJson('/ott/v1/get_events?published=true')) ?? []),
  );
  return value;
}

export interface EventData {
  event: EventInfo;
  classes: ClassInfo[];
  matches: Match[];
  /** When the oldest part of the shown data was fetched (ms). */
  fetchedAt: number;
  /** A part could not be refreshed and older data is shown. */
  stale: boolean;
}

export async function getEventData(event: EventInfo): Promise<EventData> {
  const eventId = event.id;
  const cats = await cached(`cats:${eventId}`, 10 * 60_000, async () =>
    ((await getJson(`/ott/v1/get_events_categories?event_id=${eventId}&sort_by_id=true&include_subcategories=true`)) ?? []) as Raw[],
  );
  const classes: ClassInfo[] = cats.value
    .filter(isIndividual)
    .map((c: Raw) => ({ id: Number(c.id), label: classLabel(c) }))
    .sort((x: ClassInfo, y: ClassInfo) => classSort(x.label) - classSort(y.label) || x.label.localeCompare(y.label) || x.id - y.id);

  let stale = cats.stale;
  const stageLists = await Promise.all(
    classes.map(async (c) => {
      const r = await cached(`stages:${c.id}`, 60_000, async () =>
        ((await getJson(`/ott/v1/get_stages?event_category_id=${c.id}`)) ?? []) as Raw[],
      );
      stale ||= r.stale;
      return r.value.map((s: Raw) => ({ cls: c, stage: s }));
    }),
  );

  const perStage = await Promise.all(
    stageLists.flat().map(async ({ cls, stage }) => {
      // A finished stage no longer changes.
      const ttl = stage.status === 'COMPLETED' ? 10 * 60_000 : 30_000;
      const stageName = String(stage.name ?? '');
      const r = await cached(`gm:${stage.id}`, ttl, async () => {
        const groups = ((await getJson(`/ott/v1/get_group_matches?stage_id=${stage.id}`)) ?? []) as Raw[];
        return {
          matches: stageMatches({ classId: cls.id, classLabel: cls.label, stageName, groups }),
          knockout: groups.some((g: Raw) => /knock/i.test(String(g?.name ?? ''))),
        };
      });
      stale ||= r.stale;

      // The bracket says where a winner goes next. Optional: without it the page just has no "Nästa".
      let bracket: BracketInput | null = null;
      if (r.value.knockout) {
        const kb = await cached(`ko:${stage.id}`, ttl, async () => {
          const d = await getJson(`/ott/v1/get_knockout_matches?stage_id=${stage.id}&only_published_rounds=true`);
          return (d?.main_bracket ?? []) as Raw[];
        }).catch(() => null);
        if (kb) bracket = { classId: cls.id, classLabel: cls.label, stageName, rounds: kb.value };
      }
      return { matches: r.value.matches, bracket, at: cache.get(`gm:${stage.id}`)?.at ?? Date.now() };
    }),
  );

  const fetchedAt = perStage.length ? Math.min(...perStage.map((s) => s.at)) : Date.now();
  const matches = withNext(
    perStage.flatMap((s) => s.matches),
    perStage.flatMap((s) => (s.bracket ? [s.bracket] : [])),
  );
  return { event, classes, matches, fetchedAt, stale };
}
