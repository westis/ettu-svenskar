'use client';

// Visitor statistics with Vercel Web Analytics: no cookies, nothing stored on the device (a request
// hash, discarded after 24 h), so no consent banner is needed. Enabled per project in Vercel's
// dashboard (Analytics tab).
//
// The filters and the Kommande | Resultat toggle rewrite the URL's query string, which the script
// would count as new page views. Only the first page view of each path per page load is sent, and
// without the query string, so a visit counts once. Custom events (Spelarfilter, SVT-klick, sent with
// track()) always go out. Pro bills $0.03 per 1 000 events from the monthly usage credit.

import { Analytics, type BeforeSendEvent } from '@vercel/analytics/next';

const seen = new Set<string>();

function onePerVisit(event: BeforeSendEvent): BeforeSendEvent | null {
  const u = new URL(event.url);
  const url = `${u.origin}${u.pathname}`;
  // custom events (Spelarfilter, SVT-klick) always go out, also without the query string
  if (event.type !== 'pageview') return { ...event, url };
  if (seen.has(u.pathname)) return null;
  seen.add(u.pathname);
  return { ...event, url };
}

export function Stats() {
  return <Analytics beforeSend={onePerVisit} />;
}
