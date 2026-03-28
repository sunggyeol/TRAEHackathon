import { ScaleTypes } from '@carbon/charts-react';
import type { UnifiedRecord } from '@/types';
import type { Locale } from '@/lib/i18n/translations';
import { translations } from '@/lib/i18n/translations';

function getPlatformLabels(locale: Locale = 'ko') {
  const t = translations[locale];
  return {
    coupang: t.platformCoupang,
    naver: t.platformNaver,
    gmarket: t.platformGmarket,
  } as Record<string, string>;
}

function getPlatformColors(locale: Locale = 'ko') {
  const labels = getPlatformLabels(locale);
  return {
    coupang: '#e88b8b',
    [labels.coupang]: '#e88b8b',
    naver: '#7ec8a0',
    [labels.naver]: '#7ec8a0',
    gmarket: '#7bafd4',
    [labels.gmarket]: '#7bafd4',
  };
}

const baseOptions = {
  theme: 'white' as const,
  resizable: true,
  legend: {
    enabled: false,
  },
  toolbar: {
    enabled: false,
  },
  points: {
    enabled: false,
  },
  height: '340px',
};

export function getKPIData(records: UnifiedRecord[]) {
  const totalRevenue = records.reduce((s, r) => s + r.sales_amount, 0);
  const totalOrders = records.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const totalCommission = records.reduce((s, r) => s + r.commission, 0);
  const totalShipping = records.reduce((s, r) => s + r.shipping_fee, 0);
  const totalDiscount = records.reduce((s, r) => s + r.discount, 0);
  const totalFees = totalCommission + totalShipping + totalDiscount;
  const feeRate = totalRevenue > 0 ? (totalFees / totalRevenue) * 100 : 0;
  const totalSettlement = records.reduce((s, r) => s + r.settlement, 0);

  return { totalRevenue, totalOrders, avgOrderValue, feeRate, totalSettlement };
}

export function getRevenueByPlatform(records: UnifiedRecord[], locale: Locale = 'ko') {
  const labels = getPlatformLabels(locale);
  const platforms = [...new Set(records.map(r => r.platform))];
  return platforms.map(p => {
    const pRecords = records.filter(r => r.platform === p);
    return {
      group: labels[p] || p,
      value: pRecords.reduce((s, r) => s + r.sales_amount, 0),
    };
  });
}

export function getRevenueByDate(records: UnifiedRecord[], locale: Locale = 'ko') {
  const labels = getPlatformLabels(locale);
  const dateMap = new Map<string, Map<string, number>>();
  records.forEach(r => {
    if (!r.order_date) return;
    const date = r.order_date.slice(0, 10);
    if (!dateMap.has(date)) dateMap.set(date, new Map());
    const platform = labels[r.platform] || r.platform;
    const current = dateMap.get(date)!.get(platform) || 0;
    dateMap.get(date)!.set(platform, current + r.sales_amount);
  });

  const data: { group: string; date: string; value: number }[] = [];
  const sortedDates = [...dateMap.keys()].sort();
  for (const date of sortedDates) {
    const platforms = dateMap.get(date)!;
    for (const [group, value] of platforms) {
      data.push({ group, date, value });
    }
  }
  return data;
}

export function getDonutOptions(locale: Locale = 'ko') {
  const t = translations[locale];
  return {
    ...baseOptions,
    color: { scale: getPlatformColors(locale) },
    donut: { 
      center: { label: t.chartDonutCenter },
      alignment: 'center'
    },
    pie: {
      alignment: 'center'
    },
    canvas: {
      padding: {
        top: 20,
        bottom: 20,
        left: 20,
        right: 20
      }
    },
    height: '320px',
  };
}

export function getAreaChartOptions(locale: Locale = 'ko') {
  return {
    ...baseOptions,
    color: { scale: getPlatformColors(locale) },
    axes: {
      bottom: { mapsTo: 'date', scaleType: ScaleTypes.TIME },
      left: { mapsTo: 'value', scaleType: ScaleTypes.LINEAR },
    },
    curve: 'curveMonotoneX' as const,
  };
}

export function getSankeyOptions(data: { source: string; target: string; value: number }[], locale: Locale = 'ko') {
  const t = translations[locale];
  const labels = getPlatformLabels(locale);

  const sourceNodes = [...new Set(data.map(d => d.source))];
  const targetNodes = [...new Set(data.map(d => d.target))];

  const nodes = [
    ...sourceNodes.map(name => ({ name, category: 'platform' })),
    ...targetNodes.map(name => ({ name, category: 'cost' })),
  ];

  return {
    ...baseOptions,
    height: '520px',
    alluvial: {
      nodes,
      nodeAlignment: 'left' as const,
    },
    color: {
      scale: {
        [labels.coupang]: '#e88b8b',
        [labels.naver]: '#7ec8a0',
        [labels.gmarket]: '#7bafd4',
        [t.sankeyCommission]: '#7961DB',
        [t.sankeyShipping]: '#147EB3',
        [t.sankeyDiscount]: '#C87619',
        [t.sankeyNetProfit]: '#2D72D2',
      },
    },
  };
}

export function getSankeyData(records: UnifiedRecord[], locale: Locale = 'ko') {
  const t = translations[locale];
  const labels = getPlatformLabels(locale);
  const platforms = [...new Set(records.map(r => r.platform))];
  const data: { source: string; target: string; value: number }[] = [];

  for (const p of platforms) {
    const pRecords = records.filter(r => r.platform === p);
    const label = labels[p] || p;
    const totalCommission = pRecords.reduce((s, r) => s + r.commission, 0);
    const totalShipping = pRecords.reduce((s, r) => s + r.shipping_fee, 0);
    const totalDiscount = pRecords.reduce((s, r) => s + r.discount, 0);
    const totalRevenue = pRecords.reduce((s, r) => s + r.sales_amount, 0);
    const net = totalRevenue - totalCommission - totalShipping - totalDiscount;

    if (totalCommission > 0) data.push({ source: label, target: t.sankeyCommission, value: totalCommission });
    if (totalShipping > 0) data.push({ source: label, target: t.sankeyShipping, value: totalShipping });
    if (totalDiscount > 0) data.push({ source: label, target: t.sankeyDiscount, value: totalDiscount });
    if (net > 0) data.push({ source: label, target: t.sankeyNetProfit, value: net });
  }

  return data;
}

export function getProductProfitData(records: UnifiedRecord[], locale: Locale = 'ko') {
  const labels = getPlatformLabels(locale);
  const productMap = new Map<string, { revenue: number; totalFees: number; settlement: number; count: number; platform: string }>();
  records.forEach(r => {
    const existing = productMap.get(r.product_name) || { revenue: 0, totalFees: 0, settlement: 0, count: 0, platform: r.platform };
    existing.revenue += r.sales_amount;
    existing.totalFees += r.commission + r.shipping_fee + r.discount;
    existing.settlement += r.settlement;
    existing.count += r.quantity;
    productMap.set(r.product_name, existing);
  });

  return [...productMap.entries()]
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 20)
    .map(([name, data]) => ({
      name,
      revenue: data.revenue,
      fees: data.totalFees,
      feeRate: data.revenue > 0 ? (data.totalFees / data.revenue * 100) : 0,
      settlement: data.settlement,
      count: data.count,
      platform: labels[data.platform] || data.platform,
    }));
}

export function getTrendData(records: UnifiedRecord[], locale: Locale = 'ko') {
  const t = translations[locale];
  const dateMap = new Map<string, { revenue: number; orders: number }>();
  records.forEach(r => {
    if (!r.order_date) return;
    const date = r.order_date.slice(0, 10);
    const existing = dateMap.get(date) || { revenue: 0, orders: 0 };
    existing.revenue += r.sales_amount;
    existing.orders += 1;
    dateMap.set(date, existing);
  });

  return [...dateMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, data]) => ({
      date,
      group: t.chartDailySales,
      value: data.revenue,
    }));
}
