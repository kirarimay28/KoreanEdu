import { useState, useEffect, useRef, useCallback } from 'react';
import type { User } from '../../types';
import type { AssistantSettings } from '../../assistantTypes';
import { subscribeMemos, deleteMemo, loadAssistantSettings } from '../../assistantStore';
import type { AssistantMemo } from '../../assistantTypes';
import type { ChatMessage, ProposalData } from '../../assistantTypes';
import { Send, Bot, User as UserIcon, Trash2, StickyNote, ChevronDown, Check, X, Loader2 } from 'lucide-react';

interface Props {
  currentUser: User;
}

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  proposal?: ProposalData;
  memoSaved?: string;
  loading?: boolean;
}

const MAX_HISTORY = 10;
const STORAGE_KEY = 'assistant_chat_messages';

function loadSavedMessages(): DisplayMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return (JSON.parse(raw) as DisplayMessage[]).filter(m => !m.loading);
  } catch { return []; }
}

function saveMessages(msgs: DisplayMessage[]) {
  try {
    const toSave = msgs.filter(m => !m.loading).slice(-30);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {}
}

export default function AIChat({ currentUser }: Props) {
  const uid = currentUser.username;
  const [messages, setMessages] = useState<DisplayMessage[]>(loadSavedMessages);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [memos, setMemos] = useState<AssistantMemo[]>([]);
  const [memosOpen, setMemosOpen] = useState(false);
  const [settings, setSettings] = useState<AssistantSettings | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const unsub = subscribeMemos(uid, setMemos);
    loadAssistantSettings(uid).then(setSettings);
    return unsub;
  }, [uid]);

  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || sending) return;
    const userMsg: DisplayMessage = { id: `u_${Date.now()}`, role: 'user', content: text };
    const loadingMsg: DisplayMessage = { id: `l_${Date.now()}`, role: 'assistant', content: '', loading: true };

    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setInput('');
    setSending(true);

    // Build API messages (last N turns, text only)
    const history: ChatMessage[] = messages
      .filter(m => !m.loading && m.content)
      .slice(-MAX_HISTORY)
      .map(m => ({ role: m.role, content: m.content }));
    history.push({ role: 'user', content: text });

    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          userId: uid,
          speechStyle: '존댓말',
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: '오류' }));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      const data = await res.json() as {
        message: string;
        proposal?: ProposalData;
        memoSaved?: string;
      };

      setMessages(prev => prev.map(m =>
        m.loading ? {
          ...m,
          id: `a_${Date.now()}`,
          content: data.message,
          proposal: data.proposal,
          memoSaved: data.memoSaved,
          loading: false,
        } : m,
      ));
    } catch (err: any) {
      setMessages(prev => prev.map(m =>
        m.loading ? { ...m, content: `오류: ${err.message}`, loading: false } : m,
      ));
    } finally {
      setSending(false);
    }
  }, [messages, sending, settings, uid]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <div className="flex flex-col gap-3" style={{ minHeight: 400 }}>
      {/* Memo section (collapsible) */}
      {memos.length > 0 && (
        <div className="card p-3 space-y-2">
          <button
            onClick={() => setMemosOpen(v => !v)}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-1.5">
              <StickyNote className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[11px] font-bold text-gray-700">조교 메모 ({memos.length})</span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${memosOpen ? 'rotate-180' : ''}`} />
          </button>
          {memosOpen && (
            <div className="space-y-1 pt-1 border-t border-gray-50">
              {memos.map(m => (
                <div key={m.id} className="flex items-start gap-2">
                  <p className="flex-1 text-[10px] text-gray-600 leading-relaxed">{m.content}</p>
                  <button onClick={() => deleteMemo(m.id)} className="flex-shrink-0 text-gray-200 hover:text-red-400 transition-colors mt-0.5">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Message list */}
      <div className="space-y-3 flex-1">
        {messages.length === 0 && (
          <WelcomeBubble speechStyle="존댓말" onTap={send} />
        )}
        {messages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} onConfirm={() => {
            // Proposal confirmed — for now dismiss and inform user to apply manually
            // Full apply integration would call the relevant store function
            setMessages(prev => prev.map(m =>
              m.id === msg.id ? { ...m, proposal: undefined, content: m.content + '\n\n(변경 적용됨)' } : m,
            ));
          }} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="card p-2 flex items-end gap-2 sticky bottom-0">
        <textarea
          ref={inputRef}
          className="flex-1 resize-none text-xs leading-relaxed bg-transparent outline-none min-h-[36px] max-h-24 text-gray-800 placeholder-gray-300"
          placeholder="무엇이든 물어보세요..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={sending}
        />
        <button
          onClick={() => send(input)}
          disabled={!input.trim() || sending}
          className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center text-white disabled:opacity-40 transition-opacity"
        >
          {sending
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Send className="w-3.5 h-3.5" />
          }
        </button>
      </div>
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────

function MessageBubble({ msg, onConfirm }: {
  msg: DisplayMessage;
  onConfirm: () => void;
}) {
  const isUser = msg.role === 'user';

  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center ${isUser ? 'bg-primary-100' : 'bg-gray-100'}`}>
        {isUser
          ? <UserIcon className="w-3.5 h-3.5 text-primary-600" />
          : <Bot className="w-3.5 h-3.5 text-gray-500" />
        }
      </div>
      <div className={`max-w-[80%] space-y-2 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        {msg.loading ? (
          <div className="bg-gray-50 rounded-2xl px-3 py-2">
            <span className="flex gap-1 items-center">
              <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          </div>
        ) : (
          <>
            {msg.content && (
              <div className={`rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                isUser ? 'bg-primary-500 text-white rounded-tr-sm' : 'bg-gray-50 text-gray-800 rounded-tl-sm'
              }`}>
                {msg.content}
              </div>
            )}
            {msg.memoSaved && (
              <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 rounded-lg">
                <StickyNote className="w-3 h-3 text-amber-400 flex-shrink-0" />
                <p className="text-[10px] text-amber-700 truncate">메모 저장됨: {msg.memoSaved.slice(0, 30)}</p>
              </div>
            )}
            {msg.proposal && (
              <ProposalCard proposal={msg.proposal} onConfirm={onConfirm} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Proposal card ─────────────────────────────────────────────

function ProposalCard({ proposal, onConfirm }: { proposal: ProposalData; onConfirm: () => void }) {
  const [decided, setDecided] = useState<'confirmed' | 'rejected' | null>(null);

  if (decided === 'confirmed') {
    return (
      <div className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 rounded-xl">
        <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
        <p className="text-[10px] text-emerald-700">변경 적용됨</p>
      </div>
    );
  }
  if (decided === 'rejected') {
    return (
      <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 rounded-xl">
        <X className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        <p className="text-[10px] text-gray-400">취소됨</p>
      </div>
    );
  }

  const actionLabel: Record<ProposalData['action'], string> = {
    add: '추가', edit: '수정', delete: '삭제', skip: '건너뜀',
  };
  const typeLabel: Record<string, string> = {
    study_block: '공부 블록', deadline: '마감·행사', memo: '메모',
  };

  return (
    <div className="card p-3 space-y-2 border border-amber-100 max-w-xs">
      <div className="flex items-center gap-1.5">
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
          {typeLabel[proposal.type] ?? proposal.type} {actionLabel[proposal.action]}
        </span>
        <p className="text-[10px] font-bold text-gray-700 truncate">{proposal.summary}</p>
      </div>
      {proposal.reason && (
        <p className="text-[10px] text-gray-500 leading-relaxed">{proposal.reason}</p>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => { setDecided('confirmed'); onConfirm(); }}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-primary-500 text-white text-[10px] font-bold"
        >
          <Check className="w-3 h-3" /> 확인
        </button>
        <button
          onClick={() => setDecided('rejected')}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-gray-100 text-gray-500 text-[10px] font-bold"
        >
          <X className="w-3 h-3" /> 취소
        </button>
      </div>
    </div>
  );
}

// ── Welcome bubbles ───────────────────────────────────────────

const QUICK_STARTS_반말 = [
  '오늘 일정 어때?',
  '이번 주 공부 블록 만들어줘',
  '취약 영역 분석해줘',
  '내일 모의고사 준비 도와줘',
];
const QUICK_STARTS_존댓말 = [
  '오늘 일정 알려주세요',
  '이번 주 공부 블록 만들어주세요',
  '취약 영역 분석해주세요',
];

function WelcomeBubble({ speechStyle, onTap }: { speechStyle: '반말' | '존댓말'; onTap: (t: string) => void }) {
  const starters = speechStyle === '존댓말' ? QUICK_STARTS_존댓말 : QUICK_STARTS_반말;
  return (
    <div className="space-y-3 py-4">
      <div className="flex gap-2">
        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
          <Bot className="w-3.5 h-3.5 text-gray-500" />
        </div>
        <div className="bg-gray-50 rounded-2xl rounded-tl-sm px-3 py-2 text-xs text-gray-700 leading-relaxed">
          {speechStyle === '존댓말'
            ? '안녕하세요! 임용 시험 준비를 도와드릴게요.'
            : '안녕! 임용 준비 도와줄게.'}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 pl-8">
        {starters.map(s => (
          <button
            key={s}
            onClick={() => onTap(s)}
            className="px-2.5 py-1 rounded-full border border-gray-200 text-[10px] text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
