// The SVT guide's text as fetched on 2026-10-14 (tests/svt-guide.json: the "TV-tider" section).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import guide from './svt-guide.json';
import { htmlToLines, parseTvGuide, tvWindowOf } from '../lib/tv';

const windows = parseTvGuide(guide as string[], '2026-10-11', '2026-10-18');

test('broadcast windows per day', () => {
  const day = (d: string) => windows.filter((w) => w.date === d).map((w) => `${w.from}-${w.to}`);
  assert.deepEqual(day('2026-10-14'), ['09:20-12:00', '13:00-13:45', '15:45-17:30', '19:00-21:30']);
  assert.deepEqual(day('2026-10-15'), ['09:30-12:15', '12:40-13:30', '13:40-17:15', '17:35-21:30']);
  assert.equal(windows[0].channel, 'SVT Play');
  // "Söndag 19 oktober" is the final day, Sunday 18 October
  assert.deepEqual(day('2026-10-18'), ['11:30-14:45', '17:00-18:50']);
  assert.equal(windows.filter((w) => w.date === '2026-10-19').length, 0);
});

test('a match is on TV when it starts inside a window', () => {
  const at = (start: string, timeKnown = true) => tvWindowOf({ start, timeKnown }, windows);
  assert.equal(at('2026-10-14T16:45:00')?.from, '15:45');
  assert.equal(at('2026-10-14T13:05:00')?.to, '13:45');
  assert.equal(at('2026-10-14T14:15:00'), null);
  assert.equal(at('2026-10-15T11:15:00', false), null); // time not published
});

test('html to lines', () => {
  assert.deepEqual(htmlToLines('<p>Onsdag&nbsp;14 oktober</p><script>x</script><li>9.20-12.00 SVT&#32;Play</li>'),
    ['Onsdag 14 oktober', '9.20-12.00 SVT Play']);
  assert.deepEqual(parseTvGuide(['Måndag 12 oktober', '9.20-12.00 SVT2'], '2026-10-11', '2026-10-18'),
    [{ date: '2026-10-12', from: '09:20', to: '12:00', channel: 'SVT2' }]);
});
