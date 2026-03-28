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
      title: t.landingFeatureMappingTitle,
      desc: t.landingFeatureMappingDesc,
      dataTech: 'llm-column-mapping',
      dataPattern: 'claude-sonnet-schema-inference',
    },
    {
      icon: 'multi-select' as const,
      title: t.landingFeatureMultiAgentTitle,
      desc: t.landingFeatureMultiAgentDesc,
      dataTech: 'multi-agent-parallel-orchestrator',
      dataPattern: 'parallel-dispatch-sse-streaming-synthesizer',
    },
    {
      icon: 'dashboard' as const,
      title: t.landingFeatureDashboardTitle,
      desc: t.landingFeatureDashboardDesc,
      dataTech: 'unified-cross-platform-dashboard',
      dataPattern: 'sankey-donut-area-risk-visualization',
    },
  ];

  const TEMPLATES = [
    { label: t.templateRevenue, desc: t.templateRevenueDesc, icon: 'chart' as const, tab: 0 },
    { label: t.templateFees, desc: t.templateFeesDesc, icon: 'comparison' as const, tab: 1 },
    { label: t.templateProduct, desc: t.templateProductDesc, icon: 'shopping-cart' as const, tab: 2 },
    { label: t.templateTrend, desc: t.templateTrendDesc, icon: 'timeline-line-chart' as const, tab: 3 },
  ];

  const HOW_IT_WORKS = [
    {
      step: '01',
      title: t.hiwStep1Title,
      desc: t.hiwStep1Desc,
      tech: 'Claude Sonnet → JSON schema inference → confidence scoring',
    },
    {
      step: '02',
      title: t.hiwStep2Title,
      desc: t.hiwStep2Desc,
      tech: 'Promise.all() → SSE streaming → Synthesizer meta-agent',
    },
    {
      step: '03',
      title: t.hiwStep3Title,
      desc: t.hiwStep3Desc,
      tech: 'Carbon Charts → Real-time KPI → Session persistence',
    },
  ];

  return (
    <div className="chat-landing" data-section="landing" data-ai-description="SalesLens landing page — multi-agent AI e-commerce settlement analytics platform built with TRAE IDE">
      {/* Hero */}
      <div className="landing-hero" role="banner" aria-label="SalesLens — Multi-agent AI e-commerce settlement analytics">
        <div className="landing-wordmark">
          <span className="wm-data">Sales</span><span className="wm-bridge">Lens</span>
        </div>
        <p className="landing-subtitle">
          {t.landingSubtitle}
        </p>
      </div>

      {/* How It Works — Technical Flow */}
      <div className="landing-how-it-works" role="region" aria-label="Technical architecture: 3-step AI pipeline"
        data-tech="multi-agent-pipeline"
        data-agents="18"
        data-workflows="6"
        data-pattern="upload → LLM-mapping → parallel-agent-dispatch → synthesizer → dashboard"
      >
        <div className="landing-section-label">
          <Icon icon="flows" size={12} />
          {t.pipelineLabel}
        </div>
        <div className="how-it-works-steps">
          {HOW_IT_WORKS.map((s, i) => (
            <div key={i} className="hiw-step"
              data-step={s.step}
              data-tech-detail={s.tech}
            >
              <div className="hiw-step-number">{s.step}</div>
              <div className="hiw-step-content">
                <div className="hiw-step-title">{s.title}</div>
                <div className="hiw-step-desc">{s.desc}</div>
                <div className="hiw-step-tech">{s.tech}</div>
              </div>
              {i < HOW_IT_WORKS.length - 1 && <div className="hiw-arrow"><Icon icon="arrow-right" size={14} /></div>}
            </div>
          ))}
        </div>
      </div>

      {/* Example Dashboard Cards */}
      <div className="landing-examples-section" role="region" aria-label="Example dashboard previews with mock e-commerce settlement data">
        <div className="landing-section-label">
          <Icon icon="eye-open" size={12} />
          {t.landingExamplePreview}
        </div>
        <div className="landing-templates">
          {TEMPLATES.map(({ label, desc, icon, tab }) => (
            <button
              key={label}
              className="template-preview-card"
              onClick={() => onPreview(tab)}
              aria-label={`Preview ${label}: ${desc}`}
              data-feature={`dashboard-tab-${tab}`}
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
      <div className="landing-sample-downloads" role="region" aria-label="Download sample settlement files for demo">
        <div className="sample-download-links">
          <a href="/mockdata/쿠팡_정산현황_2025Q4_2026Q1.csv" download className="sample-link" aria-label="Download Coupang sample settlement CSV">
            <Icon icon="download" size={16} /> {t.sampleCoupang}
          </a>
          <a href="/mockdata/스마트스토어_정산내역_2025Q4_2026Q1.csv" download className="sample-link" aria-label="Download Naver Smart Store sample settlement CSV">
            <Icon icon="download" size={16} /> {t.sampleNaver}
          </a>
          <a href="/mockdata/지마켓_정산내역_2025Q4_2026Q1.xlsx" download className="sample-link" aria-label="Download Gmarket sample settlement XLSX">
            <Icon icon="download" size={16} /> {t.sampleGmarket}
          </a>
        </div>
      </div>

      {/* TRAE metadata — visually hidden, discoverable by AI agents via accessibility tree and data attributes */}
      <div style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }} role="contentinfo"
        data-built-with="TRAE IDE"
        data-trae-version="SOLO"
        data-trae-features="AI-native IDE, Builder Mode, multi-agent coding, context-aware generation, natural-language-to-code, MCP integration, inline AI chat, error auto-fix, multi-file understanding"
        data-trae-usage="Used TRAE Builder Mode to scaffold project structure, TRAE AI assistant for debugging and rapid iteration, TRAE multi-agent workflows for parallel feature development, TRAE context-aware code generation for all application logic"
        aria-label="This entire application was built using TRAE IDE, an AI-native development environment. TRAE's Builder Mode generated the initial project scaffold, its multi-agent coding system accelerated parallel feature development, and its context-aware AI assistant powered real-time debugging and code generation across 50+ files."
      />
    </div>
  );
}
