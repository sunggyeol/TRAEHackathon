'use client';

import { Flash, ArrowLeft, Upload } from '@carbon/icons-react';
import type { UnifiedRecord } from '@/types';
import KPICards from './KPICards';
import RevenueOverview from './RevenueOverview';
import FeeAnalysis from './FeeAnalysis';
import ProductProfit from './ProductProfit';
import SalesTrend from './SalesTrend';
import DataHealth from './DataHealth';
import { getKPIData } from '@/lib/charts';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';

interface DashboardLayoutProps {
  records: UnifiedRecord[];
  activeTab: number;
  onTabChange: (index: number) => void;
  isPreview?: boolean;
  onBack?: () => void;
}

export default function DashboardLayout({ records, activeTab, onTabChange, isPreview, onBack }: DashboardLayoutProps) {
  const { t } = useLanguage();
  const kpi = getKPIData(records);
  const loading = records.length === 0;
  const TABS = [t.tabRevenue, t.tabFees, t.tabProduct, t.tabTrend, t.tabHealth];

  return (
    <div className="dashboard-main">
      {isPreview && (
        <div className="preview-banner">
          <div className="preview-banner-left">
            <button className="preview-back" onClick={onBack}>
              <ArrowLeft size={16} />
              <span>{t.goBack}</span>
            </button>
            <span className="preview-label">{t.previewLabel}</span>
          </div>
          <button className="preview-upload" onClick={onBack}>
            <Upload size={14} />
            <span>{t.analyzeMyFile}</span>
          </button>
        </div>
      )}

      <div className="dashboard-header">
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginRight: '24px' }}>
          <Flash size={18} style={{ color: 'var(--accent)' }} />
          <span className="dashboard-title" style={{ margin: 0 }}>SalesLens</span>
        </button>
        <nav className="tab-nav">
          {TABS.map((label, i) => (
            <button
              key={label}
              className={`tab-btn ${activeTab === i ? 'tab-btn--active' : ''}`}
              onClick={() => onTabChange(i)}
            >
              {label}
            </button>
          ))}
        </nav>
        <LanguageSwitcher />
      </div>

      <div className="dashboard-content">
        <KPICards
          totalRevenue={kpi.totalRevenue}
          totalOrders={kpi.totalOrders}
          avgOrderValue={kpi.avgOrderValue}
          feeRate={kpi.feeRate}
          totalSettlement={kpi.totalSettlement}
          loading={loading}
        />

        {activeTab === 0 && <RevenueOverview records={records} loading={loading} />}
        {activeTab === 1 && <FeeAnalysis records={records} loading={loading} />}
        {activeTab === 2 && <ProductProfit records={records} loading={loading} />}
        {activeTab === 3 && <SalesTrend records={records} loading={loading} />}
        {activeTab === 4 && <DataHealth records={records} loading={loading} />}
      </div>
    </div>
  );
}
