'use client';

import { PlatformLogo } from '@/components/PlatformLogos';

const PLATFORMS = [
  { key: 'coupang', label: '쿠팡' },
  { key: 'naver', label: '네이버' },
  { key: 'gmarket', label: '지마켓' },
] as const;

const CHART_COLORS: Record<string, string> = {
  coupang: '#e88b8b',
  naver: '#7ec8a0',
  gmarket: '#7bafd4',
};

export default function PlatformLegend({ platforms }: { platforms?: string[] }) {
  const items = platforms
    ? PLATFORMS.filter(p => platforms.includes(p.key) || platforms.includes(p.label))
    : PLATFORMS;

  return (
    <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginTop: '8px' }}>
      {items.map(({ key }) => (
        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '8px', height: '8px', background: CHART_COLORS[key], flexShrink: 0 }} />
          <PlatformLogo platform={key} size={10} />
        </div>
      ))}
    </div>
  );
}
