import type { Locale } from '@/lib/i18n/translations';

// Parse Korean date formats: 2026.03.15, 2026-03-15, 2026/03/15, 2026년 3월 15일
export function parseKoreanDate(dateStr: string | number | undefined): string {
  if (!dateStr) return '';
  const s = String(dateStr).trim();

  // Already ISO format
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

  // 2026.03.15 or 2026/03/15
  const dotSlash = s.match(/^(\d{4})[./](\d{1,2})[./](\d{1,2})/);
  if (dotSlash) {
    return `${dotSlash[1]}-${dotSlash[2].padStart(2, '0')}-${dotSlash[3].padStart(2, '0')}`;
  }

  // 2026년 3월 15일
  const korean = s.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
  if (korean) {
    return `${korean[1]}-${korean[2].padStart(2, '0')}-${korean[3].padStart(2, '0')}`;
  }

  // Fallback: try native Date parse
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }

  return s;
}

// Parse Korean currency: "53,600원" → 53600, "2,568만원" → 25680000
export function parseKoreanCurrency(value: string | number | undefined): number {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return Math.round(value);

  const s = String(value).trim().replace(/\s/g, '');

  // Remove 원 suffix
  const cleaned = s.replace(/원$/, '');

  // Check for 만 (10,000) or 억 (100,000,000)
  const manMatch = cleaned.match(/^([\d,.]+)만$/);
  if (manMatch) {
    return Math.round(parseFloat(manMatch[1].replace(/,/g, '')) * 10000);
  }

  const eokMatch = cleaned.match(/^([\d,.]+)억$/);
  if (eokMatch) {
    return Math.round(parseFloat(eokMatch[1].replace(/,/g, '')) * 100000000);
  }

  // Plain number with commas
  const num = parseFloat(cleaned.replace(/,/g, ''));
  return isNaN(num) ? 0 : Math.round(num);
}

// Format number to currency (locale-aware)
export function formatCurrency(value: number, abbreviated = false, locale: Locale = 'ko'): string {
  if (locale === 'en') {
    if (abbreviated) {
      if (Math.abs(value) >= 1000000000) {
        return `₩${(value / 1000000000).toFixed(1)}B`;
      }
      if (Math.abs(value) >= 1000000) {
        return `₩${(value / 1000000).toFixed(1)}M`;
      }
      if (Math.abs(value) >= 1000) {
        return `₩${(value / 1000).toFixed(1)}K`;
      }
    }
    return `₩${value.toLocaleString()}`;
  }

  // Korean
  if (abbreviated) {
    if (Math.abs(value) >= 100000000) {
      return `${(value / 100000000).toFixed(1)}억원`;
    }
    if (Math.abs(value) >= 10000) {
      return `${Math.round(value / 10000).toLocaleString()}만원`;
    }
  }
  return `${value.toLocaleString()}원`;
}

// Legacy alias for backward compatibility
export function formatKRW(value: number, abbreviated = false): string {
  return formatCurrency(value, abbreviated, 'ko');
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString();
}
