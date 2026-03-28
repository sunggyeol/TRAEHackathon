'use client';

import { SkeletonPlaceholder } from '@carbon/react';
import type { UnifiedRecord } from '@/types';
import { getProductProfitData } from '@/lib/charts';
import { PlatformLogo } from '@/components/PlatformLogos';
import { formatCurrency, formatPercent } from '@/lib/parser/koreanUtils';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface ProductProfitProps {
  records: UnifiedRecord[];
  loading?: boolean;
}

export default function ProductProfit({ records, loading }: ProductProfitProps) {
  const { t, locale } = useLanguage();

  if (loading) {
    return <SkeletonPlaceholder style={{ height: '400px' }} />;
  }

  const products = getProductProfitData(records, locale);

  if (products.length === 0) {
    return (
      <div style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem', padding: '60px', textAlign: 'center' }}>
        {t.chartNoTabData}
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>{t.colProductName}</th>
            <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>{t.colPlatform}</th>
            <th style={{ textAlign: 'right', padding: '10px 16px', fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>{t.colRevenue}</th>
            <th style={{ textAlign: 'right', padding: '10px 16px', fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>{t.colTotalFees}</th>
            <th style={{ textAlign: 'right', padding: '10px 16px', fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>{t.colFeeRate}</th>
            <th style={{ textAlign: 'right', padding: '10px 16px', fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>{t.colSettlement}</th>
            <th style={{ textAlign: 'right', padding: '10px 16px', fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>{t.colQuantity}</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <td style={{ padding: '10px 16px', fontSize: '0.8125rem', color: 'var(--text-primary)', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.name}
              </td>
              <td style={{ padding: '10px 16px' }}>
                <PlatformLogo platform={p.platform} size={12} />
              </td>
              <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
                {formatCurrency(p.revenue, false, locale)}
              </td>
              <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                {formatCurrency(p.fees, false, locale)}
              </td>
              <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8125rem', color: p.feeRate > 15 ? '#CD4246' : p.feeRate > 10 ? '#C87619' : '#238551' }}>
                {formatPercent(p.feeRate)}
              </td>
              <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
                {formatCurrency(p.settlement, false, locale)}
              </td>
              <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                {p.count.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
