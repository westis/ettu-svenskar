import type { Metadata, Viewport } from 'next';
import { Familjen_Grotesk, Instrument_Sans } from 'next/font/google';
import Link from 'next/link';
import './globals.css';
import { SITE_NAME } from '@/lib/site';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { THEME_SCRIPT } from '@/lib/theme';

// The same type pair as STTR: Familjen Grotesk for titles and figures, Instrument Sans for the rest.
const display = Familjen_Grotesk({ subsets: ['latin', 'latin-ext'], variable: '--font-display-face', display: 'swap' });
const body = Instrument_Sans({ subsets: ['latin', 'latin-ext'], variable: '--font-body-face', display: 'swap' });

const DESCRIPTION = 'Alla svenska matcher i bordtennis-EM: tider, motståndare, liveresultat och SVT-sändningar.';

// Absolute URLs for og:image / og:url (Facebook needs them). Vercel sets the production domain.
const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : 'https://ettu-svenskar.vercel.app';

// og:image and twitter:image come from app/opengraph-image.png and app/twitter-image.png (1200 × 630).
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: DESCRIPTION,
    locale: 'sv_SE',
  },
  twitter: { card: 'summary_large_image', title: SITE_NAME, description: DESCRIPTION },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
    { media: '(prefers-color-scheme: dark)', color: '#1A1917' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <header className="header">
          <div className="header-in">
            <Link href="/" className="logo">
              <Logo />
              {SITE_NAME}
            </Link>
            <ThemeToggle />
          </div>
        </header>
        <main id="main" className="page">{children}</main>
        <footer className="footer">
          <div className="footer-in">
            <p>
              Data från <a href="https://www.ettu.tv/" target="_blank" rel="noopener noreferrer">ettu.tv</a>, uppdateras var 10:e sekund under pågående matcher. TV-tider från <a href="https://www.svt.se/sport/bordtennis/guide-bordtennis-em-2026" target="_blank" rel="noopener noreferrer">SVT</a>. Tider i arrangörens lokala tid.
            </p>
            <p>Ingen officiell tjänst från ETTU eller Svenska Bordtennisförbundet.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
