'use client';

import { SkeletonText } from '@carbon/react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { formatCurrency, formatPercent, formatNumber } from '@/lib/parser/koreanUtils';

interface KPICardsProps {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  feeRate: number;
  totalSettlement: number;
  loading?: boolean;
}

export default function KPICards({ totalRevenue, totalOrders, avgOrderValue, feeRate, totalSettlement, loading }: KPICardsProps) {
  const { t, locale } = useLanguage();

  const cards = [
    { label: t.kpiTotalRevenue, value: formatCurrency(totalRevenue, true, locale), sub: formatCurrency(totalRevenue, false, locale) },
    { label: t.kpiOrders, value: formatNumber(totalOrders), sub: t.kpiOrderUnit },
    { label: t.kpiAvgOrder, value: formatCurrency(avgOrderValue, true, locale), sub: formatCurrency(Math.round(avgOrderValue), false, locale) },
    { label: t.kpiTotalFeeRate, value: formatPercent(feeRate), sub: t.kpiSettlement(formatCurrency(totalSettlement, true, locale)) },
  ];

  return (
    <div className="kpi-grid">
      {cards.map((card, i) => (
        <div key={i} className="kpi-card">
          <div className="kpi-label">{card.label}</div>
          {loading ? (
            <SkeletonText heading width="60%" />
          ) : (
            <>
              <div className="kpi-value">{card.value}</div>
              <div className="kpi-sub">{card.sub}</div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
