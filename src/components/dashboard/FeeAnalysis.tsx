'use client';

import { AlluvialChart, SimpleBarChart } from '@carbon/charts-react';
import { ScaleTypes } from '@carbon/charts-react';
import { SkeletonPlaceholder } from '@carbon/react';
import type { UnifiedRecord } from '@/types';
import { getSankeyData, getSankeyOptions } from '@/lib/charts';
import { useLanguage } from '@/lib/i18n/LanguageContext';

import '@carbon/charts-react/styles.css';

interface FeeAnalysisProps {
  records: UnifiedRecord[];
  loading?: boolean;
}

export default function FeeAnalysis({ records, loading }: FeeAnalysisProps) {
  const { t, locale } = useLanguage();

  if (loading) {
    return (
      <div>
        <div className="full-width-chart"><SkeletonPlaceholder style={{ height: '400px' }} /></div>
        <div className="chart-container"><SkeletonPlaceholder style={{ height: '300px' }} /></div>
      </div>
    );
  }

  const sankeyData = getSankeyData(records, locale);

  // Fee comparison bar chart
  const platforms = [...new Set(records.map(r => r.platform))];
  const platformLabels: Record<string, string> = {
    coupang: t.platformCoupang,
    naver: t.platformNaver,
    gmarket: t.platformGmarket,
  };
  const barData = platforms.map(p => {
    const pRecords = records.filter(r => r.platform === p);
    const totalRevenue = pRecords.reduce((s, r) => s + r.sales_amount, 0);
    const totalCommission = pRecords.reduce((s, r) => s + r.commission, 0);
    const rate = totalRevenue > 0 ? (totalCommission / totalRevenue) * 100 : 0;
    return {
      group: platformLabels[p] || p,
      value: Math.round(rate * 10) / 10,
    };
  });

  const barColorScale: Record<string, string> = {
    [t.platformCoupang]: '#e88b8b',
    [t.platformNaver]: '#7ec8a0',
    [t.platformGmarket]: '#7bafd4',
  };

  return (
    <div>
      <div className="full-width-chart" style={{ paddingBottom: '32px' }}>
        <div className="chart-title">{t.chartFeeFlow}</div>
        {sankeyData.length > 0 ? (
          <AlluvialChart data={sankeyData} options={getSankeyOptions(sankeyData, locale)} />
        ) : (
          <div style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem', padding: '60px', textAlign: 'center' }}>
            {t.chartNoFeeData}
          </div>
        )}
      </div>
      <div className="chart-container" style={{ marginTop: '24px' }}>
        <div className="chart-title">{t.chartFeeRateByPlatform}</div>
        {barData.length > 0 ? (
          <SimpleBarChart
            data={barData}
            options={{
              theme: 'white' as const,
              axes: {
                left: { mapsTo: 'group', scaleType: ScaleTypes.LABELS },
                bottom: { mapsTo: 'value', scaleType: ScaleTypes.LINEAR },
              },
              color: { scale: barColorScale },
              toolbar: { enabled: false },
              height: '200px',
            }}
          />
        ) : (
          <div style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem', padding: '40px', textAlign: 'center' }}>
            {t.chartNoData}
          </div>
        )}
      </div>
    </div>
  );
}
