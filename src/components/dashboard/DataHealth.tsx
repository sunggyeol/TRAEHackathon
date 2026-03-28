
'use client';

import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { UnifiedRecord } from '@/types';
import { Icon } from '@blueprintjs/core';
import { Checkmark, Warning, Error as ErrorIcon } from '@carbon/icons-react';

interface DataHealthProps {
  records: UnifiedRecord[];
  loading?: boolean;
}

export default function DataHealth({ records, loading }: DataHealthProps) {
  const { t } = useLanguage();

  if (loading || records.length === 0) {
    return (
      <div className="full-width-chart">
        <div className="chart-title">{t.tabHealth}</div>
        <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
          {t.chartNoData}
        </div>
      </div>
    );
  }

  // 1. Missing Values Analysis
  const total = records.length;
  const missingDates = records.filter(r => !r.order_date).length;
  const missingAmount = records.filter(r => r.sales_amount === 0).length;
  const missingProduct = records.filter(r => !r.product_name).length;

  // 2. Outlier Detection (Price > 3x average or Quantity > 100)
  const avgPrice = records.reduce((s, r) => s + r.sales_amount, 0) / total;
  const priceOutliers = records.filter(r => r.sales_amount > avgPrice * 5).length;
  const qtyOutliers = records.filter(r => r.quantity > 50).length;

  // 3. Duplication Detection
  const seenOrders = new Set<string>();
  const duplicates = records.filter(r => {
    const key = `${r.platform}-${r.order_id}`;
    if (seenOrders.has(key)) return true;
    seenOrders.add(key);
    return false;
  }).length;

  const HealthItem = ({ 
    label, 
    value, 
    status, 
    desc 
  }: { 
    label: string; 
    value: string | number; 
    status: 'good' | 'warn' | 'error'; 
    desc: string;
  }) => (
    <div className="health-item" style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '16px', 
      padding: '16px', 
      background: 'var(--bg-base)',
      borderBottom: '1px solid var(--border-subtle)'
    }}>
      <div className={`health-icon health-icon--${status}`} style={{
        width: '32px', height: '32px', borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: status === 'good' ? 'var(--accent-muted)' : status === 'warn' ? 'rgba(200, 118, 25, 0.08)' : 'rgba(205, 66, 70, 0.08)',
        color: status === 'good' ? 'var(--green)' : status === 'warn' ? 'var(--yellow)' : 'var(--red)'
      }}>
        {status === 'good' ? <Checkmark size={20} /> : status === 'warn' ? <Warning size={20} /> : <ErrorIcon size={20} />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
        <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>{desc}</div>
      </div>
      <div style={{ 
        fontFamily: 'IBM Plex Mono, monospace', 
        fontSize: '1.1rem', 
        fontWeight: 600,
        color: status === 'good' ? 'var(--text-primary)' : status === 'warn' ? 'var(--yellow)' : 'var(--red)'
      }}>
        {value}
      </div>
    </div>
  );

  return (
    <div className="data-health-dashboard">
      <div className="full-width-chart" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="chart-title" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', margin: 0 }}>
          {t.tabHealth} - {total} {t.fileMetaRows}
        </div>
        
        <div className="health-list">
          <HealthItem
            label={t.healthDataIntegrity}
            desc={t.healthDataIntegrityDesc}
            value={`${Math.round(((total - (missingDates + missingAmount + missingProduct)) / total) * 100)}%`}
            status={missingDates + missingAmount + missingProduct > 0 ? 'warn' : 'good'}
          />
          <HealthItem
            label={t.healthDuplicates}
            desc={t.healthDuplicatesDesc}
            value={duplicates}
            status={duplicates > 0 ? 'error' : 'good'}
          />
          <HealthItem
            label={t.healthPriceOutlier}
            desc={t.healthPriceOutlierDesc}
            value={priceOutliers}
            status={priceOutliers > 0 ? 'warn' : 'good'}
          />
          <HealthItem
            label={t.healthQtyOutlier}
            desc={t.healthQtyOutlierDesc}
            value={qtyOutliers}
            status={qtyOutliers > 0 ? 'warn' : 'good'}
          />
        </div>
      </div>

      <div className="health-summary-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
        <div className="full-width-chart" style={{ margin: 0 }}>
          <div className="chart-title">{t.healthMissingFields}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
              <span>{t.healthMissingDate}</span>
              <span style={{ color: missingDates > 0 ? 'var(--red)' : 'var(--text-disabled)' }}>{missingDates}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
              <span>{t.healthMissingAmount}</span>
              <span style={{ color: missingAmount > 0 ? 'var(--red)' : 'var(--text-disabled)' }}>{missingAmount}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
              <span>{t.healthMissingProduct}</span>
              <span style={{ color: missingProduct > 0 ? 'var(--red)' : 'var(--text-disabled)' }}>{missingProduct}</span>
            </div>
          </div>
        </div>
        <div className="full-width-chart" style={{ margin: 0 }}>
          <div className="chart-title">{t.healthRecommendation}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {duplicates > 0 ? `• ${t.healthDuplicateWarn}\n` : ''}
            {priceOutliers > 0 ? `• ${t.healthPriceWarn}\n` : ''}
            {missingDates > 0 ? `• ${t.healthDateWarn}\n` : ''}
            {(duplicates === 0 && priceOutliers === 0 && missingDates === 0) ? `• ${t.healthClean}` : ''}
          </div>
        </div>
      </div>
    </div>
  );
}
