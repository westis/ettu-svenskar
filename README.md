# Svenskarna i pingis-EM

Every Swedish match in the table tennis European Championships (EM, the senior individual
championships): class, round, time, table, opponents, results and each winner's next match,
refreshed every 10 seconds while a match is live (else 30). Swedish UI, same look as the STTR app.

- `/` – the EM that is on now (else the next one, else the latest); picked by name from ETTU's
  events (`lib/model.ts` `isEM`: youth, U21, team, veteran and test events are left out)
- A toggle Kommande | Resultat and two filters, class and player (`?visa=resultat&klass=<id>&spelare=<id>`, shareable)

## Data

ettu.tv is built by Stupa. Its API is public, needs no login, and is the same one STTR reads for
Swedish events, here with the header `tenant: ettu`:

```
GET https://testbackend.stupaevents.com/ott/v1/get_events?published=true
GET …/ott/v1/get_events_categories?event_id=167&sort_by_id=true&include_subcategories=true
GET …/ott/v1/get_stages?event_category_id=787
GET …/ott/v1/get_group_matches?stage_id=2515     # every match of a stage, knockout included
```

What the code relies on (details in `lib/model.ts`):

- `start_time` is the venue's local wall clock without an offset (the venue record's "GMT+1" label is
  wrong); it is shown as is.
- Status `NOT_STARTED` / `IN_PROGRESS` / `SCORED`; `SKIPPED` is a bye. While a match is live, `points`
  carries every game including the running one.
- `walkover: true` marks the side that **won** on a walkover; its 11-0 games are not real.
- Country: `selected_parents[].parent_abbr` ("SWE"; neutral athletes are "ETTU1" (Belarus) and "ETTU2"
  (Russia), shown as AIN with ETTU's own flag); 2025 events only
  fill `parent_name` ("Sweden").
- Class: `category_display_label` – "Men's Singles" (other ETTU events use "U15-BS", "MSU21").
- Knockout rounds appear in `get_group_matches` once both players are known.
  `get_knockout_matches?stage_id=…&only_published_rounds=true` has the whole bracket in advance
  (times and tables included; `show_schedule_details: false` = time not published yet). The next
  match of a winner is round + 1, position ⌈order/2⌉; its other slot is fed by the neighbouring
  match (order ± 1). The app uses this for "Nästa: …" and for Kommande rows whose opponent is not
  decided yet ("vinnaren av A – B"). An empty slot has no `participant_details`; a bye is "BYE".
- Live scores: `get_live_scored_matches?event_id=…&only_in_progress=true` is point by point
  (`sequence_number` +1 per point) and is overlaid on the match list, which ETTU syncs only every
  1–2 minutes. The page refreshes every 10 s while a Swedish match is live (else 30 s); the feed is
  cached 5 s on the server.
- The API sometimes answers `{"msg":"SOME_ERROR_OCCURRED"}`; every call is retried and the last good
  answer is kept, so a failed refresh shows slightly older data with a notice.
- Its CORS rules reject other sites, so all calls are made on the server (Next.js route rendering).

## TV (SVT)

Matches that start inside an SVT broadcast window get a "▶ SVT Play" link (svtplay.se/bordtennis-em-1),
and the page lists today's broadcast times. The windows come from SVT's guide
(svt.se/sport/bordtennis/guide-bordtennis-em-2026). SVT's CDN (Akamai) refuses requests from Node,
so the server's live attempt usually fails and the schedule bundled in `lib/tv-schedule.json` is
used. When SVT changes the guide, rebuild it with curl and commit:

```bash
curl -s https://www.svt.se/sport/bordtennis/guide-bordtennis-em-2026 | npm run --silent tv
```

## Visitor statistics

Vercel Web Analytics (`components/Stats.tsx`): no cookies and nothing stored on the device (a request
hash, discarded after 24 h), so no consent banner. It must be enabled once in the Vercel dashboard
(project → Analytics → Enable). The filters rewrite the query string, so only the first page view
per path and page load is sent, without the query string: one visit = one event (the Hobby plan
includes 50 000 events a month, shared by all projects on the account; reports cover one month).

Not covered: EMs before 2025, which are only on results.ettu.site.

This is not an official ETTU or SBTF service. Be gentle with the API: the server caches each stage
for 30 s (finished stages 10 min).

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # model tests on a trimmed real response (tests/fixture.json)
npm run typecheck
npm run build && npm start
```

Deploys to Vercel as a plain Next.js app (no environment variables).
