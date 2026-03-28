'use client';

import type { UnifiedRecord } from '@/types';
import { Icon } from '@blueprintjs/core';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { Translations } from '@/lib/i18n/translations';

interface RiskDiagnosisProps {
  records: UnifiedRecord[];
  loading?: boolean;
}

type Severity = 'high' | 'medium' | 'low';

interface RiskItem {
  label: string;
  desc: string;
  severity: Severity;
  value: string;
  action: string;
}

function getPlatformLabel(platform: string, t: Translations): string {
  const map: Record<string, string> = { coupang: t.platformCoupang, naver: t.platformNaver, gmarket: t.platformGmarket };
  return map[platform] || platform;
}

function computeRisks(records: UnifiedRecord[], t: Translations): RiskItem[] {
  const risks: RiskItem[] = [];
  const totalRevenue = records.reduce((s, r) => s + r.sales_amount, 0);
  const platforms = [...new Set(records.map(r => r.platform))];

  // 1. Platform concentration risk
  for (const p of platforms) {
    const pRevenue = records.filter(r => r.platform === p).reduce((s, r) => s + r.sales_amount, 0);
    const share = totalRevenue > 0 ? pRevenue / totalRevenue : 0;
    if (share > 0.6) {
      const label = getPlatformLabel(p, t);
      risks.push({
        label: t.riskPlatformConcentrationLabel,
        desc: t.riskPlatformConcentrationDesc(label, (share * 100).toFixed(1)),
        severity: share > 0.8 ? 'high' : 'medium',
        value: `${(share * 100).toFixed(0)}%`,
        action: t.riskPlatformConcentrationAction,
      });
    }
  }
  if (platforms.length === 1) {
    const label = getPlatformLabel(platforms[0], t);
    risks.push({
      label: t.riskSinglePlatformDependenceLabel,
      desc: t.riskSinglePlatformDependenceDesc(label),
      severity: 'high',
      value: '100%',
      action: t.riskSinglePlatformDependenceAction,
    });
  }

  // 2. Product concentration risk
  const productRevMap = new Map<string, number>();
  records.forEach(r => {
    productRevMap.set(r.product_name, (productRevMap.get(r.product_name) || 0) + r.sales_amount);
  });
  const sorted = [...productRevMap.entries()].sort((a, b) => b[1] - a[1]);
  if (sorted.length >= 5) {
    const top5Rev = sorted.slice(0, 5).reduce((s, [, v]) => s + v, 0);
    const top5Share = totalRevenue > 0 ? top5Rev / totalRevenue : 0;
    if (top5Share > 0.5) {
      risks.push({
        label: t.riskProductConcentrationLabel,
        desc: t.riskProductConcentrationDesc((top5Share * 100).toFixed(1)),
        severity: top5Share > 0.7 ? 'high' : 'medium',
        value: `${(top5Share * 100).toFixed(0)}%`,
        action: t.riskProductConcentrationAction,
      });
    }
  }
  if (sorted.length > 0) {
    const topShare = totalRevenue > 0 ? sorted[0][1] / totalRevenue : 0;
    if (topShare > 0.2) {
      risks.push({
        label: t.riskSingleProductDependenceLabel,
        desc: t.riskSingleProductDependenceDesc(sorted[0][0], (topShare * 100).toFixed(1)),
        severity: topShare > 0.3 ? 'high' : 'medium',
        value: `${(topShare * 100).toFixed(0)}%`,
        action: t.riskSingleProductDependenceAction,
      });
    }
  }

  // 3. Commission rate risk
  const totalCommission = records.reduce((s, r) => s + r.commission, 0);
  const avgCommRate = totalRevenue > 0 ? totalCommission / totalRevenue : 0;
  if (avgCommRate > 0.15) {
    risks.push({
      label: t.riskHighCommissionLabel,
      desc: t.riskHighCommissionDesc((avgCommRate * 100).toFixed(1)),
      severity: avgCommRate > 0.2 ? 'high' : 'medium',
      value: `${(avgCommRate * 100).toFixed(1)}%`,
      action: t.riskHighCommissionAction,
    });
  }

  // 4. Margin uniformity risk (all margins similar = no differentiation)
  const productMargins = sorted.slice(0, 10).map(([name]) => {
    const pRecs = records.filter(r => r.product_name === name);
    const rev = pRecs.reduce((s, r) => s + r.sales_amount, 0);
    const comm = pRecs.reduce((s, r) => s + r.commission, 0);
    return rev > 0 ? (rev - comm) / rev : 0;
  });
  if (productMargins.length >= 3) {
    const minM = Math.min(...productMargins);
    const maxM = Math.max(...productMargins);
    const spread = maxM - minM;
    if (spread < 0.03) {
      risks.push({
        label: t.riskMarginUniformityLabel,
        desc: t.riskMarginUniformityDesc((minM * 100).toFixed(1), (maxM * 100).toFixed(1)),
        severity: 'low',
        value: `${(spread * 100).toFixed(1)}%p`,
        action: t.riskMarginUniformityAction,
      });
    }
  }

  // 5. Discount dependency risk
  const totalDiscount = records.reduce((s, r) => s + r.discount, 0);
  const discountRate = totalRevenue > 0 ? totalDiscount / totalRevenue : 0;
  if (discountRate > 0.1) {
    risks.push({
      label: t.riskDiscountDependencyLabel,
      desc: t.riskDiscountDependencyDesc((discountRate * 100).toFixed(1)),
      severity: discountRate > 0.2 ? 'high' : 'medium',
      value: `${(discountRate * 100).toFixed(1)}%`,
      action: t.riskDiscountDependencyAction,
    });
  }

  // If no risks found
  if (risks.length === 0) {
    risks.push({
      label: t.riskNoneLabel,
      desc: t.riskNoneDesc,
      severity: 'low',
      value: t.riskSeverityGood,
      action: t.riskNoneAction,
    });
  }

  // Sort by severity
  const order: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
  risks.sort((a, b) => order[a.severity] - order[b.severity]);

  return risks;
}

export default function RiskDiagnosis({ records, loading }: RiskDiagnosisProps) {
  const { t } = useLanguage();

  if (loading || records.length === 0) {
    return (
      <div className="full-width-chart">
        <div className="chart-title">{t.riskDiagnosisTitle}</div>
        <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
          {t.riskNoData}
        </div>
      </div>
    );
  }

  const risks = computeRisks(records, t);
  const highCount = risks.filter(r => r.severity === 'high').length;
  const medCount = risks.filter(r => r.severity === 'medium').length;

  const severityIcon = (s: Severity) => {
    if (s === 'high') return <Icon icon="error" size={18} style={{ color: 'var(--red)' }} />;
    if (s === 'medium') return <Icon icon="warning-sign" size={18} style={{ color: 'var(--yellow)' }} />;
    return <Icon icon="tick-circle" size={18} style={{ color: 'var(--green)' }} />;
  };

  const severityLabel = (s: Severity) => {
    if (s === 'high') return t.riskSeverityHigh;
    if (s === 'medium') return t.riskSeverityMedium;
    return t.riskSeverityLow;
  };

  const severityColor = (s: Severity) => {
    if (s === 'high') return 'var(--red)';
    if (s === 'medium') return 'var(--yellow)';
    return 'var(--green)';
  };

  return (
    <div className="data-health-dashboard">
      {/* Summary bar */}
      <div className="full-width-chart" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '24px' }}>
        <div className="chart-title" style={{ margin: 0 }}>{t.riskSummaryTitle(records.length, t.recordUnit)}</div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '16px', fontSize: '0.75rem' }}>
          {highCount > 0 && (
            <span style={{ color: 'var(--red)', fontWeight: 600 }}>
              <Icon icon="error" size={12} /> {t.riskSeverityHigh} {highCount}
            </span>
          )}
          {medCount > 0 && (
            <span style={{ color: 'var(--yellow)', fontWeight: 600 }}>
              <Icon icon="warning-sign" size={12} /> {t.riskSeverityMedium} {medCount}
            </span>
          )}
          {highCount === 0 && medCount === 0 && (
            <span style={{ color: 'var(--green)', fontWeight: 600 }}>
              <Icon icon="tick-circle" size={12} /> {t.riskSeverityGood}
            </span>
          )}
        </div>
      </div>

      {/* Risk items */}
      <div className="full-width-chart" style={{ padding: 0, overflow: 'hidden', marginTop: '1px' }}>
        {risks.map((risk, i) => (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '16px',
            padding: '16px 20px',
            borderBottom: i < risks.length - 1 ? '1px solid var(--border-subtle)' : 'none',
          }}>
            <div style={{
              width: '36px', height: '36px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: risk.severity === 'high' ? 'rgba(205, 66, 70, 0.08)' : risk.severity === 'medium' ? 'rgba(200, 118, 25, 0.08)' : 'rgba(35, 133, 81, 0.08)',
              flexShrink: 0,
            }}>
              {severityIcon(risk.severity)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>{risk.label}</span>
                <span style={{
                  fontSize: '0.625rem', fontWeight: 500,
                  padding: '1px 6px',
                  color: severityColor(risk.severity),
                  background: risk.severity === 'high' ? 'rgba(205, 66, 70, 0.08)' : risk.severity === 'medium' ? 'rgba(200, 118, 25, 0.08)' : 'rgba(35, 133, 81, 0.08)',
                }}>
                  {severityLabel(risk.severity)}
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{risk.desc}</div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--accent)', marginTop: '6px' }}>
                <Icon icon="arrow-right" size={10} /> {risk.action}
              </div>
            </div>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '1.1rem',
              fontWeight: 600,
              color: severityColor(risk.severity),
              flexShrink: 0,
            }}>
              {risk.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
