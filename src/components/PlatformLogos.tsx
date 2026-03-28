'use client';

// Pastel palette
export const PLATFORM_BRAND_COLORS = {
  coupang: '#e88b8b',
  naver: '#7ec8a0',
  gmarket: '#7bafd4',
} as const;

// All logos constrained to same visual box so they look uniform in tables
export function PlatformLogo({ platform, size = 12 }: { platform: string; size?: number }) {
  const style = { display: 'block', height: size, maxWidth: size * 4, objectFit: 'contain' as const };

  switch (platform) {
    case 'coupang':
    case '쿠팡':
      return <img src="/logos/coupang.svg" alt="Coupang" style={style} />;
    case 'naver':
    case '네이버':
      return <img src="/logos/naver.svg" alt="Naver" style={style} />;
    case 'gmarket':
    case '지마켓':
      return <img src="/logos/gmarket.svg" alt="Gmarket" style={style} />;
    default:
      return null;
  }
}
