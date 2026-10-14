import { EventPage } from '@/components/EventPage';
import { getEvents } from '@/lib/stupa';
import { currentEvent } from '@/lib/model';

export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const today = new Date().toISOString().slice(0, 10);
  const event = currentEvent(await getEvents(), today);
  if (!event) return <p className="empty">Inget EM hittades hos ETTU.</p>;
  return <EventPage event={event} searchParams={await searchParams} />;
}
