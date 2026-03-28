'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@blueprintjs/core';
import type { DashboardSession } from '@/lib/sessions';
import { getSessions, deleteSession } from '@/lib/sessions';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { Translations } from '@/lib/i18n/translations';

interface SessionSidebarProps {
  currentSessionId: string | null;
  onNewSession: () => void;
  onSelectSession: (session: DashboardSession) => void;
  refreshKey: number;
  collapsed: boolean;
  onToggle: () => void;
}

function timeAgo(dateStr: string, t: Translations, locale: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t.timeJustNow;
  if (mins < 60) return t.timeMinutesAgo(mins);
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t.timeHoursAgo(hours);
  const days = Math.floor(hours / 24);
  if (days < 7) return t.timeDaysAgo(days);
  return new Date(dateStr).toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric' });
}

export default function SessionSidebar({ currentSessionId, onNewSession, onSelectSession, refreshKey, collapsed, onToggle }: SessionSidebarProps) {
  const { t, locale } = useLanguage();
  const [sessions, setSessions] = useState<DashboardSession[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) setSessions(getSessions());
  }, [refreshKey, mounted]);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteSession(id);
    setSessions(getSessions());
    if (id === currentSessionId) {
      onNewSession();
    }
  };

  if (collapsed) {
    return (
      <aside className="session-sidebar session-sidebar--collapsed">
        <button className="session-toggle-btn" onClick={onToggle} title={t.sidebarOpen}>
          <Icon icon="menu-open" size={18} />
        </button>
        <button className="session-new-btn-icon" onClick={onNewSession} title={t.newAnalysis}>
        <Icon icon="plus" size={18} />
      </button>
    </aside>
  );
}

return (
  <aside className="session-sidebar">
    <div className="session-sidebar-header">
      <button className="session-new-btn" onClick={onNewSession} title={t.newAnalysis}>
        <Icon icon="plus" size={16} />
        <span style={{ fontSize: '0.75rem' }}>{t.newAnalysis}</span>
      </button>
      <button className="session-toggle-btn" onClick={onToggle} title={t.sidebarClose}>
        <Icon icon="menu-closed" size={16} />
      </button>
    </div>

    <div className="session-list">
      {sessions.length === 0 ? (
        <div className="session-empty">
          <p>{t.sessionEmptyTitle}</p>
          <p className="session-empty-sub">{t.sessionEmptySubtitle}</p>
        </div>
      ) : (
        <>
          <div className="session-list-label">{t.sessionRecent}</div>
          {sessions.map(session => (
            <div
              key={session.id}
              className={`session-item ${session.id === currentSessionId ? 'session-item--active' : ''}`}
              onClick={() => onSelectSession(session)}
              role="button"
              tabIndex={0}
            >
              <div className="session-item-content">
                <span className="session-item-title">{session.title}</span>
                <span className="session-item-meta">
                  <Icon icon="time" size={10} />
                  {timeAgo(session.updatedAt, t, locale)} · {session.recordCount.toLocaleString()} {t.recordUnit}
                </span>
              </div>
              <button
                className="session-item-delete"
                onClick={(e) => handleDelete(e, session.id)}
                title={t.sessionDelete}
              >
                <Icon icon="trash" size={12} />
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  </aside>
);
}
