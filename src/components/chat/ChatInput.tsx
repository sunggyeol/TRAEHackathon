'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Icon } from '@blueprintjs/core';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface ChatInputProps {
  onSend: (text: string, files?: File[]) => void;
  disabled?: boolean;
  placeholder?: string;
  compact?: boolean;
}

function getFileIcon(name: string) {
  const ext = name.toLowerCase().split('.').pop();
  if (ext === 'xlsx' || ext === 'xls') return <Icon icon="document" size={16} />;
  if (ext === 'csv') return <Icon icon="th" size={16} />;
  return <Icon icon="blank" size={16} />;
}

function getFileColor(name: string) {
  const ext = name.toLowerCase().split('.').pop();
  if (ext === 'xlsx' || ext === 'xls') return '#238551';
  if (ext === 'csv') return '#2D72D2';
  return 'var(--text-tertiary)';
}

export default function ChatInput({ onSend, disabled, placeholder, compact }: ChatInputProps) {
  const { t, locale } = useLanguage();
  const [text, setText] = useState('');
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed && stagedFiles.length === 0) return;
    onSend(trimmed, stagedFiles.length > 0 ? stagedFiles : undefined);
    setText('');
    setStagedFiles([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // IME(한글 등) 조합 중에는 Enter 이벤트 무시
    if (e.nativeEvent.isComposing) return;
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setStagedFiles(prev => [...prev, ...newFiles]);
      e.target.value = '';
    }
  };

  const removeFile = (index: number) => {
    setStagedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files).filter(f => {
        const ext = f.name.toLowerCase().split('.').pop();
        return ['csv', 'xlsx', 'xls', 'txt'].includes(ext || '');
      });
      if (newFiles.length > 0) {
        setStagedFiles(prev => [...prev, ...newFiles]);
      }
    }
  }, []);

  const hasContent = text.trim() || stagedFiles.length > 0;

  return (
    <div
      className={compact ? 'sidebar-input' : 'chat-input-area'}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Staged files chips */}
      {stagedFiles.length > 0 && (
        <div className="staged-files">
          {stagedFiles.map((file, i) => (
            <div key={`${file.name}-${i}`} className="staged-file-chip">
              <span className="staged-file-icon" style={{ color: getFileColor(file.name) }}>
                {getFileIcon(file.name)}
              </span>
              <span className="staged-file-name">{file.name}</span>
              <button
                className="staged-file-remove"
                onClick={() => removeFile(i)}
                aria-label={locale === 'ko' ? '제거' : 'Remove'}
              >
                <Icon icon="cross" size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="chat-input-wrapper">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={disabled}
          className="input-icon-btn"
          style={{ color: disabled ? 'var(--text-disabled)' : 'var(--accent)' }}
          aria-label={t.ariaAttach}
        >
          <Icon icon="paperclip" size={compact ? 16 : 18} />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls,.txt"
          multiple
          hidden
          onChange={handleFileChange}
          suppressHydrationWarning
        />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || t.inputPlaceholder}
          disabled={disabled}
          suppressHydrationWarning
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !hasContent}
          className="input-icon-btn"
          style={{ color: disabled || !hasContent ? 'var(--text-disabled)' : 'var(--accent)' }}
          aria-label={t.ariaSend}
        >
          <Icon icon="send-message" size={compact ? 14 : 16} />
        </button>
      </div>
    </div>
  );
}
