// withNext(): the next knockout match of each Swede who won. The fixture is the real men's doubles
// main draw of the 2026 European Individual Championships (stage 2519, fetched 2026-10-14 ~12:10),
// personal fields removed: Källberg/Karlsson won their åttondel (order 7) and meet Duda/Qiu in the
// quarter-final (order 4, already scheduled); Ranefur/Moregård lost their åttondel.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import bracket from './bracket.json';
import { type BracketInput, type Match, stageMatches, withNext } from '../lib/model';

/* eslint-disable @typescript-eslint/no-explicit-any */
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

function build(tweak?: (b: any) => void): Match[] {
  const b = clone(bracket as any);
  tweak?.(b);
  const stage = { classId: 789, classLabel: 'Herrdubbel', stageName: b.stageName };
  const matches = stageMatches({ ...stage, groups: b.groups });
  const input: BracketInput = { ...stage, rounds: b.rounds };
  return withNext(matches, [input]);
}

const round = (b: any, name: string) => b.rounds.find((r: any) => r.round_name === name);
const qf4 = (b: any) => round(b, 'Quarter Finals').matches.find((m: any) => m.order === 4);
const swe = (m: Match) => m.a.players.map((p) => p.short).join(' / ');

test('a won match points to the scheduled next one; nothing is added', () => {
  const plain = stageMatches({ classId: 789, classLabel: 'Herrdubbel', stageName: 'Main Draw', groups: (bracket as any).groups });
  const ms = build();
  assert.equal(ms.length, plain.length);
  const r16 = ms.find((m) => m.round === 'Åttondel' && swe(m) === 'A. Källberg / K. Karlsson')!;
  assert.equal(r16.outcome, 'won');
  assert.deepEqual(r16.next, { round: 'Kvartsfinal', opp: 'B. Duda / D. Qiu', start: r16.next!.start, timeKnown: r16.next!.timeKnown });
  // a loss and an earlier win whose next match is already played get no next line
  assert.equal(ms.find((m) => m.round === 'Åttondel' && swe(m) === 'E. Ranefur / T. Moregård')!.next, null);
  assert.equal(ms.find((m) => m.round === '16-del' && swe(m) === 'A. Källberg / K. Karlsson')!.next, null);
});

test('a next match not in the list yet is added from the bracket', () => {
  const ms = build((b) => {
    const id = qf4(b).id;
    for (const g of b.groups) g.matches = g.matches.filter((m: any) => m.id !== id);
    qf4(b).leg_details[0].start_time = '2026-10-15T11:15:00';
    qf4(b).leg_details[0].tables = [1];
    qf4(b).show_schedule_details = true;
  });
  const qf = ms.find((m) => m.pending)!;
  assert.equal(qf.round, 'Kvartsfinal');
  assert.equal(qf.status, 'upcoming');
  assert.equal(swe(qf), 'A. Källberg / K. Karlsson');
  assert.equal(qf.b.players.map((p) => p.short).join(' / '), 'B. Duda / D. Qiu');
  assert.equal(qf.b.players[0].code, 'GER');
  assert.equal(qf.start, '2026-10-15T11:15:00');
  assert.equal(qf.timeKnown, true);
  assert.equal(qf.table, '1');
  assert.equal(qf.oppLabel, null);
});

test('an undecided opponent: "vinnaren av A – B", and a hidden time keeps only the day', () => {
  const ms = build((b) => {
    const id = qf4(b).id;
    for (const g of b.groups) g.matches = g.matches.filter((m: any) => m.id !== id);
    qf4(b).participants = qf4(b).participants.filter((p: any) => /KALLBERG/.test(p.participant_details[0]?.name ?? ''));
    round(b, 'Round of 16').matches.find((m: any) => m.order === 8).leg_details[0].status = 'IN_PROGRESS';
    qf4(b).leg_details[0].start_time = '2026-10-15T11:15:00';
    qf4(b).show_schedule_details = false;
  });
  const qf = ms.find((m) => m.pending)!;
  assert.deepEqual(qf.b.players, []);
  assert.equal(qf.oppLabel, 'vinnaren av E. Tikhonov / V. Sidorenko – B. Duda / D. Qiu');
  assert.equal(qf.timeKnown, false);
  const r16 = ms.find((m) => m.round === 'Åttondel' && swe(m) === 'A. Källberg / K. Karlsson')!;
  assert.equal(r16.next!.opp, 'vinnaren av E. Tikhonov / V. Sidorenko – B. Duda / D. Qiu');
});

test('a bye counts as a win', () => {
  const ms = build((b) => {
    // Källberg/Karlsson get a bye in their 16-del; their åttondel is then not scheduled yet
    const r32 = round(b, 'Round of 32').matches.find((m: any) => m.order === 13);
    const r16 = round(b, 'Round of 16').matches.find((m: any) => m.order === 7);
    for (const g of b.groups) g.matches = g.matches.filter((m: any) => m.id !== r32.id && m.id !== r16.id);
    r32.leg_details[0].status = 'SKIPPED';
    r32.participants = [r32.participants[0], { participant_details: [] }];
    r16.participants = [];
  });
  const r16 = ms.find((m) => m.pending && m.round === 'Åttondel')!;
  assert.equal(swe(r16), 'A. Källberg / K. Karlsson');
  assert.equal(r16.oppLabel, 'vinnaren av M. Van Dessel / L. Mladenovic – M. Freitas / T. Apolonia');
});
