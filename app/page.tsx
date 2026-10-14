import { EventPage } from '@/components/EventPage';
import { getEvents } from '@/lib/stupa';
import { defaultEvent } from '@/lib/model';

export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const today = new Date().toISOString().slice(0, 10);
  const ev = defaultEvent(await getEvents(), today);
  if (!ev) return <p className="empty">Inga tävlingar hittades hos ETTU.</p>;
  return <EventPage eventId={ev.id} searchParams={await searchParams} />;
}
