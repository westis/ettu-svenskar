# Svenskarna i pingis-EM

Every Swedish match in the table tennis European Championships (EM, the senior individual
championships): class, round, time, table, opponents, results and each winner's next match,
refreshed every 30 seconds. Swedish UI, same look as the STTR app.

- `/` – the EM that is on now (else the next one, else the latest); picked by name from ETTU's
  events (`lib/model.ts` `isEM`: youth, U21, team, veteran and test events are left out)
- Filters: class and player (`?klass=<id>&spelare=<id>`, shareable)

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
- Country: `selected_parents[].parent_abbr` ("SWE", "ETTU2" for neutral athletes); 2025 events only
  fill `parent_name` ("Sweden").
- Class: `category_display_label` – "Men's Singles" (other ETTU events use "U15-BS", "MSU21").
- Knockout rounds appear in `get_group_matches` once both players are known.
  `get_knockout_matches?stage_id=…&only_published_rounds=true` has the whole bracket in advance
  (times and tables included; `show_schedule_details: false` = time not published yet). The next
  match of a winner is round + 1, position ⌈order/2⌉; its other slot is fed by the neighbouring
  match (order ± 1). The app uses this for "Nästa: …" and for Kommande rows whose opponent is not
  decided yet ("vinnaren av A – B"). An empty slot has no `participant_details`; a bye is "BYE".
- The API sometimes answers `{"msg":"SOME_ERROR_OCCURRED"}`; every call is retried and the last good
  answer is kept, so a failed refresh shows slightly older data with a notice.
- Its CORS rules reject other sites, so all calls are made on the server (Next.js route rendering).

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
