import type { MetadataRoute } from 'next';
import { SITE_NAME } from '@/lib/site';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: 'Pingis-EM',
    description: 'Alla svenska matcher i bordtennis-EM: tider, motståndare och resultat.',
    start_url: '/',
    display: 'standalone',
    background_color: '#121110',
    theme_color: '#005B99',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
