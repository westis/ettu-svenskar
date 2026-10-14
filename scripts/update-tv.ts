// Rebuilds lib/tv-schedule.json from SVT's TV guide. SVT's CDN refuses Node's requests (Akamai), so
// the page is fetched with curl and piped in:
//
//   curl -s https://www.svt.se/sport/bordtennis/guide-bordtennis-em-2026 | npm run --silent tv
//
// Prints the windows it found; writes nothing if it finds none.
import { writeFileSync } from 'node:fs';
import { htmlToLines, parseTvGuide } from '../lib/tv';

const START = process.env.EM_START ?? '2026-10-11';
const END = process.env.EM_END ?? '2026-10-18';

let html = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => (html += c));
process.stdin.on('end', () => {
  const windows = parseTvGuide(htmlToLines(html), START, END);
  if (!windows.length) {
    console.error('No TV windows found; lib/tv-schedule.json left as it was.');
    process.exit(1);
  }
  const out = { source: 'https://www.svt.se/sport/bordtennis/guide-bordtennis-em-2026', fetched: new Date().toISOString().slice(0, 10), windows };
  writeFileSync(new URL('../lib/tv-schedule.json', import.meta.url), JSON.stringify(out, null, 1) + '\n');
  for (const w of windows) console.log(`${w.date} ${w.from}–${w.to} ${w.channel}`);
});
