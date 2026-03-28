'use client';

import { StackedAreaChart, DonutChart } from '@carbon/charts-react';
import { SkeletonPlaceholder } from '@carbon/react';
import type { UnifiedRecord } from '@/types';
import { getRevenueByPlatform, getRevenueByDate, getDonutOptions, getAreaChartOptions } from '@/lib/charts';
import PlatformLegend from './PlatformLegend';
import { useLanguage } from '@/lib/i18n/LanguageContext';

import '@carbon/charts-react/styles.css';

interface RevenueOverviewProps {
  records: UnifiedRecord[];
  loading?: boolean;
}

export default function RevenueOverview({ records, loading }: RevenueOverviewProps) {
  const { t, locale } = useLanguage();

  if (loading) {
    return (
      <div className="charts-row">
        <div className="chart-container"><SkeletonPlaceholder style={{ height: '300px' }} /></div>
        <div className="chart-container"><SkeletonPlaceholder style={{ height: '280px' }} /></div>
      </div>
    );
  }

  const areaData = getRevenueByDate(records, locale);
  const donutData = getRevenueByPlatform(records, locale);
  const platforms = [...new Set(records.map(r => r.platform))];

  const areaOpts = { ...getAreaChartOptions(), legend: { enabled: false } };
  const donutOpts = { ...getDonutOptions(locale), legend: { enabled: false } };

  return (
    <div className="charts-row">
      <div className="chart-container">
        <div className="chart-title">{t.chartDailyRevenue}</div>
        {areaData.length > 0 ? (
          <>
            <StackedAreaChart data={areaData} options={areaOpts} />
            <PlatformLegend platforms={platforms} />
          </>
        ) : (
          <div style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem', padding: '40px', textAlign: 'center' }}>
            {t.chartNoDateData}
          </div>
        )}
      </div>
      <div className="chart-container">
        <div className="chart-title">{t.chartPlatformShare}</div>
        {donutData.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 24px)' }}>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', overflow: 'hidden' }}>
              <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }} className="donut-chart-wrapper">
                <DonutChart data={donutData} options={donutOpts} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <PlatformLegend platforms={platforms} />
            </div>
          </div>
        ) : (
          <div style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem', padding: '40px', textAlign: 'center' }}>
            {t.chartNoData}
          </div>
        )}
      </div>
    </div>
  );
}
