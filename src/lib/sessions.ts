import type { UnifiedRecord, ChatMessage } from '@/types';

export interface DashboardSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  platforms: string[];
  recordCount: number;
  records: UnifiedRecord[];
  messages: ChatMessage[];
}

const STORAGE_KEY = 'saleslens_sessions';

export function getSessions(): DashboardSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveSession(session: DashboardSession): void {
  try {
    const sessions = getSessions();
    const idx = sessions.findIndex(s => s.id === session.id);
    if (idx >= 0) {
      sessions[idx] = session;
    } else {
      sessions.unshift(session);
    }
    // Keep max 20 sessions
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, 20)));
  } catch {
    console.warn('[SESSIONS] Failed to save');
  }
}

export function deleteSession(id: string): void {
  try {
    const sessions = getSessions().filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {}
}

export function generateSessionTitle(records: UnifiedRecord[]): string {
  const platforms = [...new Set(records.map(r => r.platform))];
  const platformNames: Record<string, string> = { coupang: '쿠팡', naver: '네이버', gmarket: '지마켓' };
  const names = platforms.map(p => platformNames[p] || p);
  const dates = records.map(r => r.order_date).filter(Boolean).sort();
  const dateRange = dates.length > 0
    ? `${dates[0].slice(0, 7)} ~ ${dates[dates.length - 1].slice(0, 7)}`
    : '';
  return `${names.join(' + ')} ${dateRange}`.trim();
}

export function createSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}
