import type { Metadata } from 'next';
import Link from 'next/link';
import { getEvents } from '@/lib/stupa';
import { shortEventName } from '@/lib/model';
import { dateRange } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Tävlingar' };

export default async function Events() {
  const events = await getEvents();
  return (
    <>
      <h1 className="title">Tävlingar</h1>
      <p className="meta">ETTU:s individuella tävlingar på ettu.tv</p>
      <ul className="events">
        {events.map((e) => {
          const short = shortEventName(e.name, e.start);
          return (
            <li key={e.id}>
              <Link href={`/tavling/${e.id}`}>
                <span>
                  <span className="ev-name">{short}</span>
                  {short !== e.name && <span className="ev-sub"><br />{e.name}</span>}
                </span>
                <span className="ev-date">{e.start ? dateRange(e.start, e.end) : ''}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
