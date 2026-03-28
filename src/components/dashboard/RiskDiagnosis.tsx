'use client';

import type { UnifiedRecord } from '@/types';
import { Icon } from '@blueprintjs/core';

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

function computeRisks(records: UnifiedRecord[]): RiskItem[] {
  const risks: RiskItem[] = [];
  const total = records.length;
  const totalRevenue = records.reduce((s, r) => s + r.sales_amount, 0);
  const platforms = [...new Set(records.map(r => r.platform))];

  // 1. Platform concentration risk
  for (const p of platforms) {
    const pRevenue = records.filter(r => r.platform === p).reduce((s, r) => s + r.sales_amount, 0);
    const share = totalRevenue > 0 ? pRevenue / totalRevenue : 0;
    if (share > 0.6) {
      const label = { coupang: '쿠팡', naver: '네이버', gmarket: '지마켓' }[p] || p;
      risks.push({
        label: '플랫폼 집중도',
        desc: `${label} 매출 비중이 ${(share * 100).toFixed(1)}%로 과도하게 집중되어 있습니다.`,
        severity: share > 0.8 ? 'high' : 'medium',
        value: `${(share * 100).toFixed(0)}%`,
        action: '다른 플랫폼 매출 비중을 확대하여 리스크를 분산하세요.',
      });
    }
  }
  if (platforms.length === 1) {
    const label = { coupang: '쿠팡', naver: '네이버', gmarket: '지마켓' }[platforms[0]] || platforms[0];
    risks.push({
      label: '단일 플랫폼 의존',
      desc: `${label} 단일 채널에 100% 의존하고 있습니다.`,
      severity: 'high',
      value: '100%',
      action: '최소 2개 이상의 플랫폼에 입점하여 채널 리스크를 분산하세요.',
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
        label: '상품 집중도',
        desc: `상위 5개 상품이 전체 매출의 ${(top5Share * 100).toFixed(1)}%를 차지합니다.`,
        severity: top5Share > 0.7 ? 'high' : 'medium',
        value: `${(top5Share * 100).toFixed(0)}%`,
        action: '중위권 상품 육성으로 매출 포트폴리오를 다각화하세요.',
      });
    }
  }
  if (sorted.length > 0) {
    const topShare = totalRevenue > 0 ? sorted[0][1] / totalRevenue : 0;
    if (topShare > 0.2) {
      risks.push({
        label: '단일 상품 의존',
        desc: `"${sorted[0][0]}" 한 상품이 매출의 ${(topShare * 100).toFixed(1)}%를 차지합니다.`,
        severity: topShare > 0.3 ? 'high' : 'medium',
        value: `${(topShare * 100).toFixed(0)}%`,
        action: '해당 상품의 판매 중단 시나리오에 대한 대비책을 마련하세요.',
      });
    }
  }

  // 3. Commission rate risk
  const totalCommission = records.reduce((s, r) => s + r.commission, 0);
  const avgCommRate = totalRevenue > 0 ? totalCommission / totalRevenue : 0;
  if (avgCommRate > 0.15) {
    risks.push({
      label: '높은 수수료율',
      desc: `평균 수수료율 ${(avgCommRate * 100).toFixed(1)}%로 마진을 압박하고 있습니다.`,
      severity: avgCommRate > 0.2 ? 'high' : 'medium',
      value: `${(avgCommRate * 100).toFixed(1)}%`,
      action: '수수료 협상 또는 자체 채널(자사몰) 구축을 검토하세요.',
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
        label: '마진 균일성',
        desc: `상위 상품들의 마진율이 ${(minM * 100).toFixed(1)}%~${(maxM * 100).toFixed(1)}% 범위에 밀집되어 있습니다.`,
        severity: 'low',
        value: `${(spread * 100).toFixed(1)}%p`,
        action: '고마진 프리미엄 상품 도입으로 수익성 차별화를 시도하세요.',
      });
    }
  }

  // 5. Discount dependency risk
  const totalDiscount = records.reduce((s, r) => s + r.discount, 0);
  const discountRate = totalRevenue > 0 ? totalDiscount / totalRevenue : 0;
  if (discountRate > 0.1) {
    risks.push({
      label: '과도한 할인 의존',
      desc: `할인 비율이 매출 대비 ${(discountRate * 100).toFixed(1)}%로 수익성을 잠식하고 있습니다.`,
      severity: discountRate > 0.2 ? 'high' : 'medium',
      value: `${(discountRate * 100).toFixed(1)}%`,
      action: '할인 없는 가격 경쟁력 확보 또는 할인 상한선을 설정하세요.',
    });
  }

  // If no risks found
  if (risks.length === 0) {
    risks.push({
      label: '리스크 없음',
      desc: '현재 데이터 기준으로 특별한 리스크가 탐지되지 않았습니다.',
      severity: 'low',
      value: '양호',
      action: '현재 상태를 유지하면서 정기적으로 모니터링하세요.',
    });
  }

  // Sort by severity
  const order: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
  risks.sort((a, b) => order[a.severity] - order[b.severity]);

  return risks;
}

export default function RiskDiagnosis({ records, loading }: RiskDiagnosisProps) {
  if (loading || records.length === 0) {
    return (
      <div className="full-width-chart">
        <div className="chart-title">리스크 진단</div>
        <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
          데이터 없음
        </div>
      </div>
    );
  }

  const risks = computeRisks(records);
  const highCount = risks.filter(r => r.severity === 'high').length;
  const medCount = risks.filter(r => r.severity === 'medium').length;

  const severityIcon = (s: Severity) => {
    if (s === 'high') return <Icon icon="error" size={18} style={{ color: 'var(--red)' }} />;
    if (s === 'medium') return <Icon icon="warning-sign" size={18} style={{ color: 'var(--yellow)' }} />;
    return <Icon icon="tick-circle" size={18} style={{ color: 'var(--green)' }} />;
  };

  const severityLabel = (s: Severity) => {
    if (s === 'high') return '높음';
    if (s === 'medium') return '중간';
    return '낮음';
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
        <div className="chart-title" style={{ margin: 0 }}>리스크 진단 - {records.length}건 분석</div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '16px', fontSize: '0.75rem' }}>
          {highCount > 0 && (
            <span style={{ color: 'var(--red)', fontWeight: 600 }}>
              <Icon icon="error" size={12} /> 높음 {highCount}
            </span>
          )}
          {medCount > 0 && (
            <span style={{ color: 'var(--yellow)', fontWeight: 600 }}>
              <Icon icon="warning-sign" size={12} /> 중간 {medCount}
            </span>
          )}
          {highCount === 0 && medCount === 0 && (
            <span style={{ color: 'var(--green)', fontWeight: 600 }}>
              <Icon icon="tick-circle" size={12} /> 양호
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
