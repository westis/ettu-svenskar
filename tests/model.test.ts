// Run: npm test. The fixture is cut from the real 2026 European Individual Championships responses
// (event 167, fetched 2026-10-14) with personal fields removed.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import fixture from './fixture.json';
import {
  type StageInput,
  applyLive,
  classLabel,
  currentEvent,
  displayName,
  homePlayers,
  emEvents,
  eventTitle,
  isEM,
  roundLabel,
  toMatch,
} from '../lib/model';

/* eslint-disable @typescript-eslint/no-explicit-any */
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

function run(label: string, tweak?: (m: any) => void) {
  const f = (fixture as any[]).find((x) => x.label === label);
  assert.ok(f, label);
  const m = clone(f.match);
  tweak?.(m);
  const stage: StageInput = { classId: 1, classLabel: 'Herrsingel', stageName: f.stageName, groups: [] };
  return toMatch(m, stage, f.groupName);
}

/** Make side i's players Swedish (to test shapes only foreign matches have in the fixture). */
const swedish = (i: number) => (m: any) => {
  for (const s of m.participants[i].selected_parents) s.parent_abbr = 'SWE';
};

test('a Swedish win in a pool', () => {
  const m = run('swe_side_a_won')!;
  assert.equal(m.a.players[0].name, 'Filippa Bergand');
  assert.equal(m.a.players[0].code, 'SWE');
  assert.equal(m.b.players[0].code, 'LAT');
  assert.equal(m.round, 'Pool 10');
  assert.equal(m.status, 'done');
  assert.equal(m.outcome, 'won');
  assert.deepEqual([m.a.sets, m.b.sets], [3, 0]);
  assert.equal(m.start, '2026-10-12T13:20:00');
  assert.equal(m.table, '8');
});

test('the Swedish side is moved first and the games follow it', () => {
  const m = run('swe_side_b_lost')!;
  assert.equal(m.a.players[0].name, 'Anders Eriksson');
  assert.equal(m.outcome, 'lost');
  assert.deepEqual([m.a.sets, m.b.sets], [0, 3]);
  assert.deepEqual(m.games, [[7, 11], [3, 11], [4, 11]]);
});

test('a pair, kval round names', () => {
  const m = run('swe_pair_won')!;
  assert.deepEqual(m.a.players.map((p) => p.name), ['Elias Ranefur', 'Truls Moregård']);
  assert.equal(m.round, 'Kval · 16-del');
  assert.equal(m.outcome, 'won');
});

test('2025 events: the country only in parent_name', () => {
  const m = run('swe_side_b_lost', (x) => {
    for (const p of x.participants) {
      for (const sp of p.selected_parents) {
        sp.parent_name = sp.parent_abbr === 'SWE' ? 'Sweden' : 'Belarus';
        sp.parent_abbr = null;
      }
      for (const d of p.participant_details) d.meta_data = { country: null };
    }
  })!;
  assert.equal(m.a.players[0].name, 'Anders Eriksson');
  assert.equal(m.a.players[0].code, 'SWE');
  assert.equal(m.b.players[0].code, 'BLR');
});

test('byes and foreign matches are not matches', () => {
  assert.equal(run('bye'), null);
  assert.equal(run('foreign'), null);
});

test('an upcoming match has no outcome or games', () => {
  const m = run('moregard_r64')!;
  assert.equal(m.status, 'upcoming');
  assert.equal(m.outcome, null);
  assert.deepEqual(m.games, []);
  assert.equal(m.round, '32-del');
});

test('walkover: the flagged side wins and the fake 11-0s are dropped', () => {
  const lost = run('walkover_foreign', swedish(0))!; // Levenko gave the walkover
  assert.equal(lost.outcome, 'lost');
  assert.equal(lost.b.walkover, true);
  assert.deepEqual(lost.games, []);
  const won = run('walkover_foreign', swedish(1))!;
  assert.equal(won.outcome, 'won');
  assert.equal(won.a.walkover, true);
});

test('a live match keeps the running game', () => {
  const m = run('moregard_r64', (x) => {
    x.status = 'IN_PROGRESS';
    x.participants[0].sets_won = 1;
    x.participants[0].points = [11, 6, 0, 0, 0];
    x.participants[1].points = [9, 8, 0, 0, 0];
  })!;
  assert.equal(m.status, 'live');
  assert.equal(m.outcome, null);
  assert.deepEqual(m.games, [[11, 9], [6, 8]]);
});

test('a Swedish derby has a winner but no outcome', () => {
  const m = run('swe_side_a_won', swedish(1))!;
  assert.equal(m.derby, true);
  assert.equal(m.outcome, null);
  assert.equal(m.a.won, true);
});

test('names', () => {
  assert.equal(displayName('DE LAS HERAS Rafael'), 'Rafael De Las Heras');
  assert.equal(displayName('HO Tin-Tin'), 'Tin-Tin Ho');
  assert.equal(displayName('KALLBERG Christina', true), 'Christina Källberg');
  assert.equal(displayName('KALLBERG Christina', false), 'Christina Kallberg');
  assert.equal(displayName('Someone'), 'Someone');
});

test('class and round labels', () => {
  // the shapes ETTU uses (events 167, 133, 22, 67)
  const lbl = (label: string, type = 1, gender = 3) =>
    classLabel({ participant_type_id: type, gender_id: gender, category_display_label: label, name: 'x' });
  assert.equal(lbl("Men's Singles", 1, 1), 'Herrsingel');
  assert.equal(lbl("Women's Doubles", 3, 2), 'Damdubbel');
  assert.equal(lbl('Mixed Doubles', 4), 'Mixeddubbel');
  assert.equal(lbl('U15-BS'), 'Pojksingel U15');
  assert.equal(lbl('U19-GD', 3), 'Flickdubbel U19');
  assert.equal(lbl('U13-XD', 4), 'Mixeddubbel U13');
  assert.equal(lbl('MSU21'), 'Herrsingel U21');
  assert.equal(lbl('WDU21', 3, 2), 'Damdubbel U21');
  // no usable label: type + gender
  assert.equal(classLabel({ participant_type_id: 1, gender_id: 2, name: 'x' }), 'Damsingel');
  assert.equal(classLabel({ participant_type_id: 3, gender_id: 1, name: 'x' }), 'Herrdubbel');
  assert.equal(roundLabel('Main Draw', 'Knockout', { name: 'Quarter Finals' }), 'Kvartsfinal');
  assert.equal(roundLabel('Main Draw', 'Knockout', { name: 'Round of 16' }), 'Åttondel');
  assert.equal(roundLabel('Main Draw', 'Knockout', { name: 'Final' }), 'Final');
  assert.equal(
    roundLabel('Main Draw', 'Knockout', { name: 'x', configuration: { is_position_match: true, position_range_start: 5, position_range_end: 8 } }),
    'Plats 5–8',
  );
});

test('players with wins and losses', () => {
  const ms = ['swe_side_a_won', 'swe_side_b_lost', 'swe_pair_won', 'moregard_r64'].map((l) => run(l)!);
  const hp = homePlayers(ms);
  const by = Object.fromEntries(hp.map((p) => [p.name, `${p.won}-${p.lost}`]));
  assert.deepEqual(by, {
    'Filippa Bergand': '1-0',
    'Anders Eriksson': '0-1',
    'Truls Moregård': '1-0',
    'Elias Ranefur': '1-0',
  });
  assert.deepEqual(hp.map((p) => p.name), ['Filippa Bergand', 'Anders Eriksson', 'Truls Moregård', 'Elias Ranefur']);
});

test('only the senior individual EM; the one on now by default', () => {
  const raw = [
    { id: 159, event_type: 'T', name: 'TEST ( ETTU Ljubljana)', event_start_date: '2026-10-11', event_end_date: '2026-10-18' },
    { id: 167, event_type: 'T', name: '2026 European Individual Championships', event_start_date: '2026-10-11', event_end_date: '2026-10-18' },
    { id: 139, event_type: 'L', name: '2026/27 HYLO ETTU Champions League Men', event_start_date: '2026-09-01', event_end_date: '2027-05-01' },
    { id: 133, event_type: 'T', name: '2026 European Youth Championships', event_start_date: '2026-07-10', event_end_date: '2026-07-19' },
    { id: 71, event_type: 'T', name: '2025 European Team Championships', event_start_date: '2025-10-12', event_end_date: '2025-10-19' },
    { id: 22, event_type: 'T', name: 'European U21 Championships', event_start_date: '2025-03-01', event_end_date: '2025-03-05' },
    { id: 96, event_type: 'T', name: '2026 CCB Europe Top16 Cup', event_start_date: '2026-02-07', event_end_date: '2026-02-08' },
    { id: 900, event_type: 'T', name: '2027 European Championships', event_start_date: '2027-09-01', event_end_date: '2027-09-08' },
  ];
  const ev = emEvents(raw);
  assert.deepEqual(ev.map((e) => e.id), [900, 167]);
  assert.equal(currentEvent(ev, '2026-10-14')?.id, 167);
  assert.equal(currentEvent(ev, '2026-11-01')?.id, 900);
  assert.equal(currentEvent(emEvents(raw.filter((e) => e.id !== 900)), '2026-11-01')?.id, 167);
  assert.equal(eventTitle(ev[1]), 'EM 2026');
  assert.equal(isEM('2026 European Individual Championships'), true);
  assert.equal(isEM('European Veterans Championships 2027'), false);
});

test('the live feed overrides the lagging list: status, sets and games', () => {
  const listed = run('moregard_r64')!; // the list still says NOT_STARTED
  const f = (fixture as any[]).find((x) => x.label === 'moregard_r64');
  const feed = clone(f.match);
  feed.status = 'IN_PROGRESS';
  feed.participants[0].sets_won = 1;
  feed.participants[0].points = [11, 6, 0, 0, 0];
  feed.participants[1].points = [9, 8, 0, 0, 0];
  const other = { ...listed, id: listed.id + 1 };
  const [m, untouched] = applyLive([{ ...listed, next: null }, other], [feed]);
  assert.equal(m.status, 'live');
  assert.deepEqual([m.a.sets, m.b.sets], [1, 0]);
  assert.deepEqual(m.games, [[11, 9], [6, 8]]);
  assert.equal(m.round, '32-del'); // kept from the list
  assert.equal(untouched, other);
  assert.deepEqual(applyLive([listed], []), [listed]);
});
