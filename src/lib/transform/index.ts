import type { ColumnMapping, UnifiedRecord, InsightPayload, SankeyLink } from '@/types';
import { parseKoreanDate, parseKoreanCurrency } from '@/lib/parser/koreanUtils';

export function applyMapping(
  rawData: Record<string, unknown>[],
  mappings: ColumnMapping[],
  platform: 'coupang' | 'naver' | 'gmarket'
): UnifiedRecord[] {
  const mappingMap = new Map(mappings.map(m => [m.target, m.source]));

  return rawData.map((row, idx) => {
    const get = (target: string): unknown => {
      const source = mappingMap.get(target);
      return source ? row[source] : undefined;
    };

    return {
      order_id: String(get('order_id') || `${platform}-${idx}`),
      order_date: parseKoreanDate(get('order_date') as string),
      product_name: String(get('product_name') || ''),
      option: get('option') ? String(get('option')) : undefined,
      quantity: parseKoreanCurrency(get('quantity') as string | number) || 1,
      sales_amount: parseKoreanCurrency(get('sales_amount') as string | number),
      payment_amount: parseKoreanCurrency(get('payment_amount') as string | number),
      discount: parseKoreanCurrency(get('discount') as string | number),
      shipping_fee: parseKoreanCurrency(get('shipping_fee') as string | number),
      commission: parseKoreanCurrency(get('commission') as string | number),
      settlement: parseKoreanCurrency(get('settlement') as string | number),
      platform,
      category: get('category') ? String(get('category')) : undefined,
      status: get('status') ? String(get('status')) : undefined,
    };
  });
}

export function aggregateForSankey(records: UnifiedRecord[]): { nodes: string[]; links: SankeyLink[] } {
  const platforms = [...new Set(records.map(r => r.platform))];
  const platformLabels: Record<string, string> = {
    coupang: '쿠팡',
    naver: '네이버',
    gmarket: '지마켓',
  };

  const links: SankeyLink[] = [];

  for (const p of platforms) {
    const platformRecords = records.filter(r => r.platform === p);
    const label = platformLabels[p] || p;
    const totalCommission = platformRecords.reduce((s, r) => s + r.commission, 0);
    const totalShipping = platformRecords.reduce((s, r) => s + r.shipping_fee, 0);
    const totalDiscount = platformRecords.reduce((s, r) => s + r.discount, 0);
    const totalRevenue = platformRecords.reduce((s, r) => s + r.sales_amount, 0);
    const net = totalRevenue - totalCommission - totalShipping - totalDiscount;

    if (totalCommission > 0) links.push({ source: label, target: '판매수수료', value: totalCommission });
    if (totalShipping > 0) links.push({ source: label, target: '배송비', value: totalShipping });
    if (totalDiscount > 0) links.push({ source: label, target: '할인', value: totalDiscount });
    if (net > 0) links.push({ source: label, target: '순이익', value: net });
  }

  const nodeSet = new Set<string>();
  links.forEach(l => { nodeSet.add(l.source); nodeSet.add(l.target); });

  return { nodes: [...nodeSet], links };
}

export function buildInsightPayload(records: UnifiedRecord[]): InsightPayload {
  const platforms = [...new Set(records.map(r => r.platform))];
  const dates = records.map(r => r.order_date).filter(Boolean).sort();

  const perPlatform = platforms.map(p => {
    const pRecords = records.filter(r => r.platform === p);
    const totalRevenue = pRecords.reduce((s, r) => s + r.sales_amount, 0);
    const totalCommission = pRecords.reduce((s, r) => s + r.commission, 0);
    return {
      platform: p,
      totalRevenue,
      totalCommission,
      commissionRate: totalRevenue > 0 ? totalCommission / totalRevenue : 0,
      orderCount: pRecords.length,
      avgOrderValue: pRecords.length > 0 ? totalRevenue / pRecords.length : 0,
    };
  });

  // Top 5 products by revenue
  const productMap = new Map<string, { revenue: number; commission: number }>();
  records.forEach(r => {
    const existing = productMap.get(r.product_name) || { revenue: 0, commission: 0 };
    existing.revenue += r.sales_amount;
    existing.commission += r.commission;
    productMap.set(r.product_name, existing);
  });

  const topProducts = [...productMap.entries()]
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5)
    .map(([name, data]) => ({
      name,
      revenue: data.revenue,
      commission: data.commission,
      margin: data.revenue > 0 ? (data.revenue - data.commission) / data.revenue : 0,
    }));

  return {
    platforms,
    dateRange: { from: dates[0] || '', to: dates[dates.length - 1] || '' },
    perPlatform,
    topProducts,
    totalRecords: records.length,
  };
}
