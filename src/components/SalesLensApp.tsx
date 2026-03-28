'use client';

import { useReducer, useRef, useEffect, useCallback, useState } from 'react';
import { Flash } from '@carbon/icons-react';
import type { AppState, AppAction, ChatMessage, ParsedFile, ColumnMapping, UnifiedRecord } from '@/types';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';
import { parseFile } from '@/lib/parser/fileParser';
import { isFileDuplicate, clearDuplicateCache } from '@/lib/agent/fingerprint';
import { detectPlatform } from '@/lib/agent/mapper';
import { applyMapping, buildInsightPayload } from '@/lib/transform';
import { getMockData } from '@/lib/mock/generateMockData';
import { saveSession, generateSessionTitle, createSessionId, type DashboardSession } from '@/lib/sessions';
import SessionSidebar from './SessionSidebar';
import ChatMessageComp from './chat/ChatMessage';
import ChatInput from './chat/ChatInput';
import ChatLanding from './chat/ChatLanding';
import DashboardLayout from './dashboard/DashboardLayout';

function createMessage(role: 'user' | 'agent', type: ChatMessage['type'], content: string, data?: ChatMessage['data']): ChatMessage {
  return { id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, role, type, content, timestamp: Date.now(), data };
}

const initialState: AppState = {
  phase: 'IDLE',
  messages: [],
  files: [],
  records: [],
  mappings: [],
  currentFingerprint: null,
  selectedTemplates: [],
  activeTab: 0,
  isStreaming: false,
  isPreview: false,
};

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_PHASE': return { ...state, phase: action.phase };
    case 'ADD_MESSAGE': return { ...state, messages: [...state.messages, action.message] };
    case 'UPDATE_MESSAGE': return {
      ...state,
      messages: state.messages.map(m => m.id === action.id ? { ...m, content: action.content } : m),
    };
    case 'ADD_FILES': return { ...state, files: [...state.files, ...action.files] };
    case 'SET_RECORDS': return { ...state, records: action.records };
    case 'ADD_RECORDS': return { ...state, records: [...state.records, ...action.records] };
    case 'SET_MAPPINGS': return { ...state, mappings: action.mappings };
    case 'SET_FINGERPRINT': return { ...state, currentFingerprint: action.fingerprint };
    case 'SET_TEMPLATES': return { ...state, selectedTemplates: action.templates };
    case 'SET_ACTIVE_TAB': return { ...state, activeTab: action.tab };
    case 'SET_STREAMING': return { ...state, isStreaming: action.streaming };
    case 'SET_PREVIEW': return { ...state, isPreview: action.preview };
    case 'RESET': return initialState;
    default: return state;
  }
}

export default function SalesLensApp() {
  const { t } = useLanguage();
  const [state, dispatch] = useReducer(reducer, initialState);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentFileRef = useRef<ParsedFile | null>(null);
  const currentPlatformRef = useRef<string>('coupang');
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages]);

  // Auto-save session when dashboard has records
  useEffect(() => {
    if (state.phase === 'DASHBOARD' && state.records.length > 0 && !state.isPreview) {
      const sessionId = currentSessionId || createSessionId();
      if (!currentSessionId) setCurrentSessionId(sessionId);
      saveSession({
        id: sessionId,
        title: generateSessionTitle(state.records),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        platforms: [...new Set(state.records.map(r => r.platform))],
        recordCount: state.records.length,
        records: state.records,
        messages: state.messages,
      });
      setSidebarRefreshKey(k => k + 1);
    }
  }, [state.records, state.phase, state.isPreview]);

  const handleNewSession = () => {
    dispatch({ type: 'RESET' });
    setCurrentSessionId(null);
    clearDuplicateCache();
  };

  const handleSelectSession = (session: DashboardSession) => {
    dispatch({ type: 'RESET' });
    clearDuplicateCache();
    setCurrentSessionId(session.id);
    dispatch({ type: 'SET_RECORDS', records: session.records });
    // Restore messages
    session.messages.forEach(m => dispatch({ type: 'ADD_MESSAGE', message: m }));
    dispatch({ type: 'SET_PHASE', phase: 'DASHBOARD' });
  };

  const addStep = (content: string, step: number, total: number) => {
    dispatch({ type: 'ADD_MESSAGE', message: createMessage('agent', 'step', content, { stepNumber: step, totalSteps: total }) });
  };

  // Pending files that need LLM mapping (not in cache)
  const pendingFilesRef = useRef<{ parsed: ParsedFile; platform: string }[]>([]);
  const allCollectedRecordsRef = useRef<UnifiedRecord[]>([]);

  const processFiles = useCallback(async (files: File[]) => {
    pendingFilesRef.current = [];
    allCollectedRecordsRef.current = [];
    const existingRecords = stateRef.current.records;

    const totalFiles = files.length;
    let fileIndex = 0;

    for (const file of files) {
      fileIndex++;
      const isDup = await isFileDuplicate(file);
      if (isDup) {
        dispatch({ type: 'ADD_MESSAGE', message: createMessage('agent', 'error', t.fileDuplicate(file.name)) });
        continue;
      }

      dispatch({ type: 'ADD_MESSAGE', message: createMessage('user', 'text', t.fileAttached(file.name)) });
      dispatch({ type: 'SET_PHASE', phase: 'PARSING' });

      try {
        // Parse
        addStep(`[${fileIndex}/${totalFiles}] ${t.stepEncoding}`, 1, 4);
        const parsed = await parseFile(file);

        if (parsed.rows === 0) {
          dispatch({ type: 'ADD_MESSAGE', message: createMessage('agent', 'error', `${file.name}: 데이터가 없습니다 (0행).`) });
          continue;
        }

        dispatch({ type: 'ADD_FILES', files: [parsed] });
        dispatch({
          type: 'ADD_MESSAGE',
          message: createMessage('agent', 'file', '', { files: [parsed] }),
        });
        console.log('[PARSE]', { name: parsed.name, rows: parsed.rows, cols: parsed.columns.length, encoding: parsed.encoding });

        // Detect platform
        addStep(`[${fileIndex}/${totalFiles}] ${t.stepPlatform}`, 2, 4);
        const platform = detectPlatform(parsed.columns) || 'coupang';
        console.log('[PLATFORM]', platform);

        // LLM mapping
        addStep(`[${fileIndex}/${totalFiles}] ${t.stepMapping}`, 3, 4);
        const response = await fetch('/api/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'mapping',
            columns: parsed.columns,
            sampleRows: parsed.sampleRows,
            platform,
          }),
        });

        if (!response.ok) {
          const errBody = await response.text().catch(() => '');
          console.error('[MAPPING API ERROR]', response.status, errBody);
          throw new Error(`${t.mappingApiError} (${response.status})`);
        }

        const { mappings } = await response.json();

        if (!mappings || mappings.length === 0) {
          dispatch({ type: 'ADD_MESSAGE', message: createMessage('agent', 'error', `${file.name}: 컬럼 매핑을 찾을 수 없습니다.`) });
          continue;
        }

        // Small delay between API calls to avoid rate limiting
        if (fileIndex < totalFiles) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Show mapping table for this file
        dispatch({
          type: 'ADD_MESSAGE',
          message: createMessage('agent', 'mapping', `${file.name} ${t.mappingResult}`, { mappings }),
        });

        // Transform with the mapping
        const records = applyMapping(parsed.rawData, mappings, platform as 'coupang' | 'naver' | 'gmarket');
        allCollectedRecordsRef.current = [...allCollectedRecordsRef.current, ...records];
        console.log('[MAPPED]', { file: file.name, records: records.length });

      } catch (error) {
        console.error('[ERROR]', error);
        dispatch({
          type: 'ADD_MESSAGE',
          message: createMessage('agent', 'error', `${file.name}: ${error instanceof Error ? error.message : t.fileProcessError}`),
        });
      }
    }

    // All files processed, now build dashboard with combined records
    const newRecords = allCollectedRecordsRef.current;
    if (newRecords.length > 0) {
      addStep(t.stepTransform, 4, 4);

      // If we had existing records, merge; otherwise replace
      if (existingRecords.length > 0) {
        dispatch({ type: 'ADD_RECORDS', records: newRecords });
      } else {
        dispatch({ type: 'SET_RECORDS', records: newRecords });
      }

      addStep(`${t.stepDone}`, 4, 4);
      await new Promise(resolve => setTimeout(resolve, 500));

      dispatch({ type: 'SET_PHASE', phase: 'DASHBOARD' });
      dispatch({ type: 'SET_PREVIEW', preview: false });
      // Use the full combined dataset for insights
      const fullDataset = existingRecords.length > 0
        ? [...existingRecords, ...newRecords]
        : newRecords;
      console.log('[DASHBOARD]', { totalRecords: fullDataset.length, platforms: [...new Set(fullDataset.map(r => r.platform))] });

      generateInsights(fullDataset);
    } else {
      dispatch({ type: 'SET_PHASE', phase: 'IDLE' });
    }
  }, []);

  const generateInsights = async (records: Parameters<typeof buildInsightPayload>[0]) => {
    try {
      const payload = buildInsightPayload(records);
      dispatch({ type: 'SET_STREAMING', streaming: true });

      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'insights', data: JSON.stringify(payload) }),
      });

      if (!response.ok || !response.body) {
        dispatch({ type: 'SET_STREAMING', streaming: false });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let insightText = '';
      const msgId = `insight-${Date.now()}`;

      dispatch({
        type: 'ADD_MESSAGE',
        message: { id: msgId, role: 'agent', type: 'text', content: `🔍 ${t.analyzingData}`, timestamp: Date.now() },
      });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

        for (const line of lines) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              insightText += parsed.text;
              dispatch({ type: 'UPDATE_MESSAGE', id: msgId, content: insightText });
            }
          } catch {}
        }
      }

      // Parse insight items from the streamed text
      const items = insightText
        .split(/\n/)
        .filter(l => /^\d+\./.test(l.trim()))
        .map(l => l.trim());

      if (items.length > 0) {
        dispatch({
          type: 'ADD_MESSAGE',
          message: createMessage('agent', 'insight', '', { insightItems: items }),
        });
        // Remove the streaming message
        dispatch({ type: 'UPDATE_MESSAGE', id: msgId, content: '' });
      }

      dispatch({ type: 'SET_STREAMING', streaming: false });
    } catch (error) {
      console.error('[INSIGHTS]', error);
      dispatch({ type: 'SET_STREAMING', streaming: false });
    }
  };

  const handleSend = async (text: string, files?: File[]) => {
    // If files are attached, process them
    if (files && files.length > 0) {
      if (text) {
        dispatch({ type: 'ADD_MESSAGE', message: createMessage('user', 'text', text) });

        // 질문에 대한 답변 먼저 제공
        dispatch({ type: 'SET_STREAMING', streaming: true });
        const msgId = `chat-${Date.now()}`;
        dispatch({
          type: 'ADD_MESSAGE',
          message: { id: msgId, role: 'agent', type: 'text', content: '', timestamp: Date.now() },
        });

        try {
          const fileNames = files.map(f => f.name).join(', ');
          const response = await fetch('/api/agent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'chat',
              message: text,
              context: `업로드된 파일: ${fileNames}. 당신은 한국 이커머스 정산 파일 분석 에이전트입니다. 사용자가 정산 파일과 함께 질문을 했습니다. 질문에 대한 친절한 답변을 제공한 후, "이제 첨부해주신 파일의 데이터 분석 및 대시보드 생성을 바로 시작할게요!"라는 뉘앙스로 자연스럽게 마무리해주세요.`,
            }),
          });

          if (response.ok && response.body) {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let responseText = '';

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value);
              const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

              for (const line of lines) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.text) {
                    responseText += parsed.text;
                    dispatch({ type: 'UPDATE_MESSAGE', id: msgId, content: responseText });
                  }
                } catch {}
              }
            }
          }
        } catch (error) {
          console.error('[CHAT WITH FILE]', error);
        }
        dispatch({ type: 'SET_STREAMING', streaming: false });
      }
      
      await processFiles(files);
      return;
    }

    if (!text) return;
    dispatch({ type: 'ADD_MESSAGE', message: createMessage('user', 'text', text) });

    // If in DASHBOARD phase, handle chat questions
    if (state.phase === 'DASHBOARD') {
      dispatch({ type: 'SET_STREAMING', streaming: true });
      const msgId = `chat-${Date.now()}`;
      dispatch({
        type: 'ADD_MESSAGE',
        message: { id: msgId, role: 'agent', type: 'text', content: '', timestamp: Date.now() },
      });

      try {
        const payload = buildInsightPayload(state.records);
        const response = await fetch('/api/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'chat',
            message: text,
            context: JSON.stringify(payload),
          }),
        });

        if (!response.ok || !response.body) {
          dispatch({ type: 'UPDATE_MESSAGE', id: msgId, content: t.noResponse });
          dispatch({ type: 'SET_STREAMING', streaming: false });
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let responseText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

          for (const line of lines) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                responseText += parsed.text;
                dispatch({ type: 'UPDATE_MESSAGE', id: msgId, content: responseText });
              }
            } catch {}
          }
        }
      } catch (error) {
        dispatch({ type: 'UPDATE_MESSAGE', id: msgId, content: t.errorOccurred });
      }

      dispatch({ type: 'SET_STREAMING', streaming: false });
      return;
    }

    // Default: prompt to upload a file
    if (state.phase === 'IDLE') {
      dispatch({
        type: 'ADD_MESSAGE',
        message: createMessage('agent', 'text', `📎 ${t.uploadFirst}`),
      });
    }
  };

  const handlePreview = (tabIndex: number) => {
    const mockRecords = getMockData();
    dispatch({ type: 'SET_RECORDS', records: mockRecords });
    dispatch({ type: 'SET_ACTIVE_TAB', tab: tabIndex });
    dispatch({ type: 'SET_PREVIEW', preview: true });
    dispatch({ type: 'SET_PHASE', phase: 'DASHBOARD' });
    dispatch({
      type: 'ADD_MESSAGE',
      message: createMessage('agent', 'text', t.previewMessage),
    });
  };

  const handleMultiAgent = async (workflow: string, label: string) => {
    if (state.isStreaming || state.records.length === 0) return;
    dispatch({ type: 'SET_STREAMING', streaming: true });
    dispatch({ type: 'ADD_MESSAGE', message: createMessage('user', 'text', label) });

    // Build context from current records
    const payload = buildInsightPayload(state.records);
    const context = JSON.stringify(payload);

    // Agent state tracking
    const agentTexts: Record<string, string> = {};
    const agentMsgIds: Record<string, string> = {};
    let synthMsgId = '';
    let synthText = '';

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'multi-agent', workflow, context }),
      });

      if (!response.ok || !response.body) {
        dispatch({ type: 'ADD_MESSAGE', message: createMessage('agent', 'error', 'Multi-agent 분석에 실패했습니다.') });
        dispatch({ type: 'SET_STREAMING', streaming: false });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

        for (const line of lines) {
          const raw = line.slice(6);
          if (raw === '[DONE]') continue;
          try {
            const evt = JSON.parse(raw);

            if (evt.type === 'orchestrator') {
              dispatch({ type: 'ADD_MESSAGE', message: createMessage('agent', 'step', `🤖 ${evt.agentCount}개 전문 에이전트 디스패치 중...`, { stepNumber: 1, totalSteps: evt.agentCount + 1 }) });
            } else if (evt.type === 'agent-start') {
              const msgId = `agent-${evt.agentId}-${Date.now()}`;
              agentMsgIds[evt.agentId] = msgId;
              agentTexts[evt.agentId] = '';
              dispatch({ type: 'ADD_MESSAGE', message: { id: msgId, role: 'agent', type: 'text', content: `${evt.emoji} **${evt.name}** 분석 중...`, timestamp: Date.now() } });
            } else if (evt.type === 'agent-delta') {
              agentTexts[evt.agentId] = (agentTexts[evt.agentId] || '') + evt.text;
              const msgId = agentMsgIds[evt.agentId];
              if (msgId) {
                dispatch({ type: 'UPDATE_MESSAGE', id: msgId, content: agentTexts[evt.agentId] });
              }
            } else if (evt.type === 'agent-done') {
              // Agent completed, text is already streamed
            } else if (evt.type === 'synthesizer-start') {
              synthMsgId = `synth-${Date.now()}`;
              dispatch({ type: 'ADD_MESSAGE', message: { id: synthMsgId, role: 'agent', type: 'text', content: '🧠 **종합 분석 에이전트** 결과를 통합하는 중...', timestamp: Date.now() } });
            } else if (evt.type === 'synthesizer-delta') {
              synthText += evt.text;
              if (synthMsgId) {
                dispatch({ type: 'UPDATE_MESSAGE', id: synthMsgId, content: synthText });
              }
            } else if (evt.type === 'synthesizer-done') {
              // Done
            } else if (evt.type === 'error') {
              dispatch({ type: 'ADD_MESSAGE', message: createMessage('agent', 'error', evt.error) });
            }
          } catch {}
        }
      }
    } catch (error) {
      dispatch({ type: 'ADD_MESSAGE', message: createMessage('agent', 'error', 'Multi-agent 연결에 실패했습니다.') });
    }

    dispatch({ type: 'SET_STREAMING', streaming: false });
  };

  const handleBackToChat = () => {
    dispatch({ type: 'RESET' });
  };

  const handleChipClick = (text: string) => {
    if (state.phase === 'IDLE') {
      dispatch({
        type: 'ADD_MESSAGE',
        message: createMessage('agent', 'text', t.chipAnalysisPrompt(text)),
      });
    }
  };

  const sidebar = (
    <SessionSidebar
      currentSessionId={currentSessionId}
      onNewSession={handleNewSession}
      onSelectSession={handleSelectSession}
      refreshKey={sidebarRefreshKey}
      collapsed={sidebarCollapsed}
      onToggle={() => setSidebarCollapsed(c => !c)}
    />
  );

  // PHASE 1: Full-screen chat
  if (state.phase !== 'DASHBOARD') {
    return (
      <div className="app-with-sidebar">
        {sidebar}
        <div className="app-main">
        <div className="chat-phase">
          <div className="chat-header">
            <LanguageSwitcher />
          </div>
          {state.messages.length === 0 ? (
            <ChatLanding onChipClick={handleChipClick} onPreview={handlePreview} onFileAttach={processFiles} />
          ) : (
            <div className="chat-messages">
              {state.messages.filter(m => m.content || m.type !== 'text').map(m => (
                <ChatMessageComp key={m.id} message={m} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
          <ChatInput
            onSend={handleSend}
            disabled={state.isStreaming}
          />
        </div>
        </div>
      </div>
    );
  }

  // PHASE 2: Dashboard + Side chat
  return (
    <div className="app-with-sidebar">
      {sidebar}
      <div className="app-main">
      <div className="dashboard-phase">
        <DashboardLayout
          records={state.records}
          activeTab={state.activeTab}
          onTabChange={(tab) => dispatch({ type: 'SET_ACTIVE_TAB', tab })}
          isPreview={state.isPreview}
          onBack={handleBackToChat}
        />
        <div className="dashboard-sidebar">
          <div className="sidebar-header">
            💬 {t.sidebarTitle}
          </div>
          <div className="sidebar-messages">
            {state.messages.filter(m => m.content || m.type !== 'text').slice(-20).map(m => (
              <ChatMessageComp key={m.id} message={m} />
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="action-chips">
            <button className="action-chip" onClick={() => handleMultiAgent('comprehensive', '🔍 종합 분석')} disabled={state.isStreaming}>
              🔍 종합 분석
            </button>
            <button className="action-chip" onClick={() => handleMultiAgent('optimization', '⚡ 최적화 제안')} disabled={state.isStreaming}>
              ⚡ 최적화 제안
            </button>
            <button className="action-chip" onClick={() => handleMultiAgent('risk', '📊 리스크 진단')} disabled={state.isStreaming}>
              📊 리스크 진단
            </button>
          </div>
          <ChatInput
            onSend={handleSend}
            disabled={state.isStreaming}
            compact
            placeholder={t.sidebarPlaceholder}
          />
        </div>
      </div>
      </div>
    </div>
  );
}
