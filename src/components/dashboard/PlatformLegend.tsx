'use client';

import { PlatformLogo } from '@/components/PlatformLogos';
import { useLanguage } from '@/lib/i18n/LanguageContext';

const PLATFORM_KEYS = ['coupang', 'naver', 'gmarket'] as const;

const CHART_COLORS: Record<string, string> = {
  coupang: '#e88b8b',
  naver: '#7ec8a0',
  gmarket: '#7bafd4',
};

export default function PlatformLegend({ platforms }: { platforms?: string[] }) {
  const { t } = useLanguage();
  const labelMap: Record<string, string> = { coupang: t.platformCoupang, naver: t.platformNaver, gmarket: t.platformGmarket };
  const allPlatforms = PLATFORM_KEYS.map(key => ({ key, label: labelMap[key] }));
  const items = platforms
    ? allPlatforms.filter(p => platforms.includes(p.key) || platforms.includes(p.label))
    : allPlatforms;

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
