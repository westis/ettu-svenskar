import type { Metadata, Viewport } from 'next';
import { Familjen_Grotesk, Instrument_Sans } from 'next/font/google';
import Link from 'next/link';
import './globals.css';
import { SITE_NAME } from '@/lib/site';

// The same type pair as STTR: Familjen Grotesk for titles and figures, Instrument Sans for the rest.
const display = Familjen_Grotesk({ subsets: ['latin', 'latin-ext'], variable: '--font-display-face', display: 'swap' });
const body = Instrument_Sans({ subsets: ['latin', 'latin-ext'], variable: '--font-body-face', display: 'swap' });

export const metadata: Metadata = {
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: 'Alla svenska matcher i bordtennis-EM: tider, motståndare och resultat.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
    { media: '(prefers-color-scheme: dark)', color: '#1A1917' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv" className={`${display.variable} ${body.variable}`}>
      <body>
        <header className="header">
          <div className="header-in">
            <Link href="/" className="logo">
              <span className="logo-dot" aria-hidden />
              {SITE_NAME}
            </Link>
          </div>
        </header>
        <main id="main" className="page">{children}</main>
        <footer className="footer">
          <div className="footer-in">
            <p>
              Data från <a href="https://www.ettu.tv/">ettu.tv</a>, uppdateras var 30:e sekund. Tider i arrangörens lokala tid.
            </p>
            <p>Ingen officiell tjänst från ETTU eller Svenska Bordtennisförbundet.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
