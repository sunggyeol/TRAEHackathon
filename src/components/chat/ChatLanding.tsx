'use client';

import { useRef } from 'react';
import { Upload, ChartArea, Compare, ShoppingCart, Growth, DocumentDownload } from '@carbon/icons-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface ChatLandingProps {
  onChipClick: (text: string) => void;
  onPreview: (tabIndex: number) => void;
  onFileAttach: (files: File[]) => void;
}

export default function ChatLanding({ onChipClick, onPreview, onFileAttach }: ChatLandingProps) {
  const { t } = useLanguage();
  const fileRef = useRef<HTMLInputElement>(null);

  const TEMPLATES = [
    { label: t.templateRevenue, desc: t.templateRevenueDesc, icon: ChartArea, tab: 0 },
    { label: t.templateFees, desc: t.templateFeesDesc, icon: Compare, tab: 1 },
    { label: t.templateProduct, desc: t.templateProductDesc, icon: ShoppingCart, tab: 2 },
    { label: t.templateTrend, desc: t.templateTrendDesc, icon: Growth, tab: 3 },
  ];

  return (
    <div className="chat-landing">
      <div className="landing-hero">
        <div className="landing-wordmark">
          <span className="wm-data">Sales</span><span className="wm-bridge">Lens</span>
        </div>
        <p className="landing-subtitle">
          {t.landingSubtitle}
        </p>
      </div>

      <div className="landing-templates">
        {TEMPLATES.map(({ label, desc, icon: Icon, tab }) => (
          <button
            key={label}
            className="template-preview-card"
            onClick={() => onPreview(tab)}
          >
            <div className="tpc-icon"><Icon size={20} /></div>
            <div className="tpc-meta">
              <span className="tpc-label">{label}</span>
              <span className="tpc-desc">{desc}</span>
            </div>
            <span className="tpc-arrow">&rarr;</span>
          </button>
        ))}
      </div>

      <div className="landing-divider">{t.orDivider}</div>

      <div className="landing-sample-downloads">
        <div className="sample-download-links">
          <a href="/mockdata/쿠팡_정산현황_2025Q4_2026Q1.csv" download className="sample-link">
            <DocumentDownload size={16} /> {t.sampleCoupang}
          </a>
          <a href="/mockdata/스마트스토어_정산내역_2025Q4_2026Q1.csv" download className="sample-link">
            <DocumentDownload size={16} /> {t.sampleNaver}
          </a>
          <a href="/mockdata/지마켓_정산내역_2025Q4_2026Q1.xlsx" download className="sample-link">
            <DocumentDownload size={16} /> {t.sampleGmarket}
          </a>
        </div>
      </div>

      {/* File upload is handled by the chat input bar below */}
    </div>
  );
}
