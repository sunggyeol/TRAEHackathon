import type { Metadata } from 'next';
import ThemeProvider from '@/components/ThemeProvider';
import { LanguageProvider } from '@/lib/i18n/LanguageContext';
import './globals.scss';

import "normalize.css/normalize.css";
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";

export const metadata: Metadata = {
  title: "SalesLens",
  description: 'AI-powered settlement file analysis for Coupang, Naver, and Gmarket',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
