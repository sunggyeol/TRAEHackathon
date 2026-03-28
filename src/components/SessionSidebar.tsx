'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@blueprintjs/core';
import type { DashboardSession } from '@/lib/sessions';
import { getSessions, deleteSession } from '@/lib/sessions';

interface SessionSidebarProps {
  currentSessionId: string | null;
  onNewSession: () => void;
  onSelectSession: (session: DashboardSession) => void;
  refreshKey: number;
  collapsed: boolean;
  onToggle: () => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '방금';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

export default function SessionSidebar({ currentSessionId, onNewSession, onSelectSession, refreshKey, collapsed, onToggle }: SessionSidebarProps) {
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
        <button className="session-toggle-btn" onClick={onToggle} title="사이드바 열기">
          <Icon icon="menu-open" size={18} />
        </button>
        <button className="session-new-btn-icon" onClick={onNewSession} title="새 분석">
        <Icon icon="plus" size={18} />
      </button>
    </aside>
  );
}

return (
  <aside className="session-sidebar">
    <div className="session-sidebar-header">
      <button className="session-new-btn" onClick={onNewSession} title="새 분석">
        <Icon icon="plus" size={16} />
        <span style={{ fontSize: '0.75rem' }}>새 분석</span>
      </button>
      <button className="session-toggle-btn" onClick={onToggle} title="사이드바 닫기">
        <Icon icon="menu-closed" size={16} />
      </button>
    </div>

    <div className="session-list">
      {sessions.length === 0 ? (
        <div className="session-empty">
          <p>저장된 분석이 없습니다</p>
          <p className="session-empty-sub">파일을 업로드하면 자동으로 저장됩니다</p>
        </div>
      ) : (
        <>
          <div className="session-list-label">최근 분석</div>
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
                  {timeAgo(session.updatedAt)} · {session.recordCount.toLocaleString()}건
                </span>
              </div>
              <button
                className="session-item-delete"
                onClick={(e) => handleDelete(e, session.id)}
                title="삭제"
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
