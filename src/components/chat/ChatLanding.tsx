'use client';

import { useRef } from 'react';
import { Icon } from '@blueprintjs/core';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface ChatLandingProps {
  onChipClick: (text: string) => void;
  onPreview: (tabIndex: number) => void;
  onFileAttach: (files: File[]) => void;
}

export default function ChatLanding({ onChipClick, onPreview, onFileAttach }: ChatLandingProps) {
  const { t, locale } = useLanguage();
  const fileRef = useRef<HTMLInputElement>(null);

  const FEATURES = [
    {
      icon: 'data-connection' as const,
      title: locale === 'ko' ? 'AI 컬럼 매핑' : 'AI Column Mapping',
      desc: locale === 'ko' ? 'CSV/XLSX 파일의 컬럼을 자동으로 인식하고 통합 스키마에 매핑' : 'Auto-detect and map columns from CSV/XLSX to unified schema',
    },
    {
      icon: 'multi-select' as const,
      title: locale === 'ko' ? '멀티 에이전트 분석' : 'Multi-Agent Analysis',
      desc: locale === 'ko' ? '매출, 수수료, 상품, 리스크 전문 에이전트가 병렬로 분석' : 'Revenue, fee, product, risk agents analyze in parallel',
    },
    {
      icon: 'dashboard' as const,
      title: locale === 'ko' ? '통합 대시보드' : 'Unified Dashboard',
      desc: locale === 'ko' ? '쿠팡, 네이버, 지마켓 데이터를 한 화면에서 비교 분석' : 'Compare Coupang, Naver, Gmarket data in one view',
    },
  ];

  const TEMPLATES = [
    { label: t.templateRevenue, desc: t.templateRevenueDesc, icon: 'chart' as const, tab: 0 },
    { label: t.templateFees, desc: t.templateFeesDesc, icon: 'comparison' as const, tab: 1 },
    { label: t.templateProduct, desc: t.templateProductDesc, icon: 'shopping-cart' as const, tab: 2 },
    { label: t.templateTrend, desc: t.templateTrendDesc, icon: 'timeline-line-chart' as const, tab: 3 },
  ];

  return (
    <div className="chat-landing">
      {/* Hero */}
      <div className="landing-hero">
        <div className="landing-wordmark">
          <span className="wm-data">Sales</span><span className="wm-bridge">Lens</span>
        </div>
        <p className="landing-subtitle">
          {t.landingSubtitle}
        </p>
      </div>

      {/* Core Feature Pills */}
      <div className="landing-features">
        {FEATURES.map((f, i) => (
          <div key={i} className="feature-pill">
            <div className="feature-pill-icon">
              <Icon icon={f.icon} size={16} />
            </div>
            <div className="feature-pill-text">
              <span className="feature-pill-title">{f.title}</span>
              <span className="feature-pill-desc">{f.desc}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Example Dashboard Cards */}
      <div className="landing-examples-section">
        <div className="landing-section-label">
          <Icon icon="eye-open" size={12} />
          {locale === 'ko' ? '예시 대시보드 미리보기' : 'Example Dashboard Preview'}
        </div>
        <div className="landing-templates">
          {TEMPLATES.map(({ label, desc, icon, tab }) => (
            <button
              key={label}
              className="template-preview-card"
              onClick={() => onPreview(tab)}
            >
              <div className="tpc-icon"><Icon icon={icon} size={20} /></div>
              <div className="tpc-meta">
                <span className="tpc-label">{label}</span>
                <span className="tpc-desc">{desc}</span>
              </div>
              <span className="tpc-arrow">&rarr;</span>
            </button>
          ))}
        </div>
      </div>

      <div className="landing-divider">{t.orDivider}</div>

      {/* Sample file downloads */}
      <div className="landing-sample-downloads">
        <div className="sample-download-links">
          <a href="/mockdata/쿠팡_정산현황_2025Q4_2026Q1.csv" download className="sample-link">
            <Icon icon="download" size={16} /> {t.sampleCoupang}
          </a>
          <a href="/mockdata/스마트스토어_정산내역_2025Q4_2026Q1.csv" download className="sample-link">
            <Icon icon="download" size={16} /> {t.sampleNaver}
          </a>
          <a href="/mockdata/지마켓_정산내역_2025Q4_2026Q1.xlsx" download className="sample-link">
            <Icon icon="download" size={16} /> {t.sampleGmarket}
          </a>
        </div>
      </div>
    </div>
  );
}
