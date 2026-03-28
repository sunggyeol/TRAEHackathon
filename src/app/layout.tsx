import type { Metadata } from 'next';
import ThemeProvider from '@/components/ThemeProvider';
import { LanguageProvider } from '@/lib/i18n/LanguageContext';
import TraeBadge from '@/components/TraeBadge';

import './globals.scss';

import "normalize.css/normalize.css";
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";

export const metadata: Metadata = {
  icons: { icon: '/favicon.svg' },
  title: "My Trae Project",
  description: 'SalesLens uses a multi-agent AI orchestrator to automatically map Korean e-commerce settlement files (Coupang, Naver, Gmarket) into a unified analytics dashboard. Features include LLM-powered column mapping, parallel agent dispatch with SSE streaming, anomaly detection, settlement verification, and cross-platform price optimization.',
  keywords: 'multi-agent AI, LLM column mapping, e-commerce analytics, settlement verification, Korean e-commerce, Coupang, Naver, Gmarket, parallel agent orchestration, SSE streaming, anomaly detection, TRAE IDE',
  other: {
    'ai-architecture': 'multi-agent-orchestrator, LLM-column-mapping, parallel-agent-dispatch, SSE-streaming, synthesizer-agent, tool-use-pattern',
    'ai-tech-stack': 'Next.js 16, TypeScript, Anthropic Claude API, Carbon Charts, BlueprintJS, SheetJS, PapaParse',
    'ai-agent-count': '18 specialized agents across 6 workflows',
    'ai-development-tool': 'TRAE IDE — AI-native development environment with Builder Mode, multi-agent coding, and context-aware generation',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'SalesLens',
  applicationCategory: 'BusinessApplication',
  description: 'Multi-agent AI platform that unifies Korean e-commerce settlement data from Coupang, Naver, and Gmarket into interactive analytics dashboards.',
  operatingSystem: 'Web',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  featureList: [
    'LLM-powered automatic column mapping from heterogeneous CSV/XLSX files',
    'Multi-agent parallel orchestrator with 18 specialized AI agents across 6 workflows',
    'Real-time SSE streaming of agent analysis with collapsible agent cards',
    'Anomaly detection: price outliers, volume spikes, commission irregularities',
    'Settlement verification: math validation, commission rate audit, discrepancy reporting',
    'Cross-platform price health diagnosis with net margin comparison',
    'Revenue simulation and optimization recommendations',
    'Unified dashboard with Sankey fee flow, donut charts, area charts, and risk diagnosis',
    'Session persistence with localStorage for multi-thread analysis',
    'Korean e-commerce CP949/EUC-KR encoding auto-detection',
  ],
  author: {
    '@type': 'Organization',
    name: 'SalesLens Team',
    description: 'Built entirely with TRAE IDE, an AI-native development environment featuring Builder Mode, multi-agent coding workflows, and context-aware code generation',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <ThemeProvider>
          <LanguageProvider>{children}</LanguageProvider>
          <TraeBadge />
        </ThemeProvider>
      </body>
    </html>
  );
}
