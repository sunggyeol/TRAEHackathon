'use client';

import { AreaChart, ScaleTypes } from '@carbon/charts-react';
import { SkeletonPlaceholder } from '@carbon/react';
import type { UnifiedRecord } from '@/types';
import { getTrendData } from '@/lib/charts';
import { useLanguage } from '@/lib/i18n/LanguageContext';

import '@carbon/charts-react/styles.css';

interface SalesTrendProps {
  records: UnifiedRecord[];
  loading?: boolean;
}

export default function SalesTrend({ records, loading }: SalesTrendProps) {
  const { t, locale } = useLanguage();

  if (loading) {
    return <SkeletonPlaceholder style={{ height: '400px' }} />;
  }

  const data = getTrendData(records, locale);

  if (data.length === 0) {
    return (
      <div style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem', padding: '60px', textAlign: 'center' }}>
        {t.chartNoTrendData}
      </div>
    );
  }

  const groupLabel = t.chartDailySales;

  return (
    <div className="full-width-chart">
      <div className="chart-title">{t.chartDailyRevenue}</div>
      <AreaChart
        data={data}
        options={{
          theme: 'white' as const,
          axes: {
            bottom: { mapsTo: 'date', scaleType: ScaleTypes.TIME },
            left: { mapsTo: 'value', scaleType: ScaleTypes.LINEAR },
          },
          color: { scale: { [groupLabel]: '#0f62fe' } },
          curve: 'curveMonotoneX' as const,
          toolbar: { enabled: false },
          height: '400px',
        }}
      />
    </div>
  );
}
