import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EventPage } from '@/components/EventPage';
import { getEvents } from '@/lib/stupa';
import { shortEventName } from '@/lib/model';

export const dynamic = 'force-dynamic';

type Params = { id: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const id = Number((await params).id);
  const ev = (await getEvents().catch(() => [])).find((e) => e.id === id);
  return { title: ev ? shortEventName(ev.name, ev.start) : 'Tävling' };
}

export default async function Page({ params, searchParams }: {
  params: Promise<Params>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return <EventPage eventId={id} searchParams={await searchParams} />;
}
