'use client';

import ReactMarkdown from 'react-markdown';
import { Icon } from '@blueprintjs/core';
import type { ChatMessage as ChatMessageType, ParsedFile, ColumnMapping } from '@/types';
import { useLanguage } from '@/lib/i18n/LanguageContext';

function FileCard({ files }: { files: ParsedFile[] }) {
  const { t } = useLanguage();
  if (!files || files.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
      {files.map((f, i) => (
        <div key={i} className="file-card">
          <Icon icon="document" className="file-icon" size={20} />
          <div className="file-info">
            <div className="file-name">{f.name}</div>
            <div className="file-meta">
              {f.rows.toLocaleString()} {t.fileMetaRows} · {f.columns.length} {t.fileMetaCols}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MappingTable({ mappings }: { mappings: ColumnMapping[] }) {
  const { t } = useLanguage();
  if (!mappings || mappings.length === 0) return null;
  return (
    <div className="mapping-table">
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>{t.mappingSourceCol}</th>
            <th style={{ textAlign: 'center', padding: '8px 4px', fontSize: '0.6875rem', color: 'var(--text-disabled)', width: '32px' }}></th>
            <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>{t.mappingTargetField}</th>
            <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>{t.mappingConfidence}</th>
          </tr>
        </thead>
        <tbody>
          {mappings.map((m, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <td style={{ padding: '8px 12px', fontSize: '0.8125rem', fontFamily: "'IBM Plex Mono', monospace", color: '#c6c6c6' }}>{m.source}</td>
              <td style={{ padding: '8px 4px', fontSize: '0.75rem', color: 'var(--text-disabled)', textAlign: 'center' }}>&rarr;</td>
              <td style={{ padding: '8px 12px', fontSize: '0.8125rem', fontFamily: "'IBM Plex Mono', monospace", color: 'var(--accent)' }}>{m.target}</td>
              <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                <span className={`confidence-badge confidence-badge--${m.confidence >= 0.9 ? 'high' : m.confidence >= 0.6 ? 'medium' : 'low'}`}>
                  {(m.confidence * 100).toFixed(0)}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InsightCard({ items }: { items?: string[] }) {
  const { t } = useLanguage();
  if (!items || items.length === 0) return null;
  return (
    <div className="chat-bubble--insight">
      <div className="insight-header">{t.insightHeader}</div>
      {items.map((item, i) => (
        <div key={i} className="insight-item">{item}</div>
      ))}
    </div>
  );
}

function MessageAvatar({ role }: { role: 'user' | 'agent' }) {
  if (role === 'user') {
    return <div className="msg-avatar msg-avatar--user">U</div>;
  }
  return (
    <div className="msg-avatar msg-avatar--agent">
      <Icon icon="pulse" size={14} />
    </div>
  );
}

export default function ChatMessage({ message, onAction }: { message: ChatMessageType; onAction?: (action: string) => void }) {
  const { t } = useLanguage();
  const isUser = message.role === 'user';

  // Step messages don't get avatar wrapper
  if (message.type === 'step') {
    return (
      <div className="msg-row msg-row--agent">
        <div className="msg-avatar-spacer" />
        <div className="chat-bubble--step">
          {message.data?.stepNumber && message.data?.totalSteps && (
            <span style={{ opacity: 0.5 }}>[{message.data.stepNumber}/{message.data.totalSteps}] </span>
          )}
          {message.content}
        </div>
      </div>
    );
  }

  // Insight card
  if (message.type === 'insight') {
    return (
      <div className="msg-row msg-row--agent">
        <MessageAvatar role="agent" />
        <InsightCard items={message.data?.insightItems} />
      </div>
    );
  }

  // Error
  if (message.type === 'error') {
    return (
      <div className="msg-row msg-row--agent">
        <MessageAvatar role="agent" />
        <div className="chat-bubble chat-bubble--error">
          <Icon icon="error" size={16} />
          {message.content}
        </div>
      </div>
    );
  }

  // File card
  if (message.type === 'file' && message.data?.files) {
    return (
      <div className="msg-row msg-row--user">
        <div className="msg-avatar-spacer" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end', width: '100%' }}>
          {message.data.files.map((f, i) => (
            <div key={i} className="file-card">
              <Icon icon="document" className="file-icon" size={20} />
              <div className="file-info">
                <div className="file-name">{f.name}</div>
                <div className="file-meta">
                  {f.rows.toLocaleString()} {t.fileMetaRows} · {f.columns.length} {t.fileMetaCols}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="msg-avatar msg-avatar--user">U</div>
      </div>
    );
  }

  // Mapping table
  if (message.type === 'mapping' && message.data?.mappings) {
    return (
      <div className="msg-row msg-row--agent">
        <MessageAvatar role="agent" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '100%', minWidth: 0 }}>
          <div className="chat-bubble--agent">{message.content}</div>
          <MappingTable mappings={message.data.mappings} />
        </div>
      </div>
    );
  }

  // Download button (from unify workflow)
  if (message.type === 'action' && message.data?.templates?.includes('__download_csv__')) {
    return (
      <div className="msg-row msg-row--agent">
        <MessageAvatar role="agent" />
        <button
          className="download-btn"
          onClick={() => onAction?.('download_csv')}
        >
          <Icon icon="download" size={16} />
          통합 정산 파일 다운로드 (.csv)
        </button>
      </div>
    );
  }

  // Templates
  if (message.type === 'templates' && message.data?.templates) {
    return (
      <div className="msg-row msg-row--agent">
        <div className="msg-avatar-spacer" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="chat-bubble--agent">{message.content}</div>
          <div className="template-cards">
            {message.data.templates.map((t, i) => (
              <button key={i} className="template-card">{t}</button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Regular text message
  const bubbleClass = isUser ? 'chat-bubble--user' : 'chat-bubble--agent';

  return (
    <div className={`msg-row msg-row--${isUser ? 'user' : 'agent'}`}>
      {!isUser && <MessageAvatar role="agent" />}
      <div className={bubbleClass}>
        {isUser ? message.content : (
          <div className="markdown-content">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>
      {isUser && <MessageAvatar role="user" />}
    </div>
  );
}
