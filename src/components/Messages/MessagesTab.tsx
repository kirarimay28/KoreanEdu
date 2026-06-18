import { useState, useRef, useEffect } from 'react';
import type { User, Message } from '../../types';
import {
  getReceivedMessages, getSentMessages, sendMessage, markMessageRead, deleteMessage, getUsers,
} from '../../store';
import { ChevronLeft, Send, Pencil, Trash2, MessageCircle } from 'lucide-react';
import NameWithCrown from '../common/NameWithCrown';

interface Props {
  currentUser: User;
}

interface Conversation {
  partnerId: string;
  partnerName: string;
  messages: Message[];
  unreadCount: number;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatFull(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function buildConversations(currentUserId: string): Conversation[] {
  const all = [
    ...getReceivedMessages(currentUserId),
    ...getSentMessages(currentUserId),
  ];
  const map = new Map<string, Conversation>();

  for (const msg of all) {
    const isMine = msg.senderId === currentUserId;
    const partnerId   = isMine ? msg.receiverId   : msg.senderId;
    const partnerName = isMine ? msg.receiverName : msg.senderName;

    if (!map.has(partnerId)) {
      map.set(partnerId, { partnerId, partnerName, messages: [], unreadCount: 0 });
    }
    const conv = map.get(partnerId)!;
    conv.messages.push(msg);
    if (!isMine && !msg.read) conv.unreadCount++;
  }

  for (const conv of map.values()) {
    conv.messages.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  return [...map.values()].sort((a, b) => {
    const aLast = a.messages.at(-1)?.createdAt ?? '';
    const bLast = b.messages.at(-1)?.createdAt ?? '';
    return bLast.localeCompare(aLast);
  });
}

export default function MessagesTab({ currentUser }: Props) {
  const [tick, setTick] = useState(0);
  const [view, setView] = useState<'list' | 'chat' | 'compose'>('list');
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [newRecipId, setNewRecipId] = useState('');
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const conversations = buildConversations(currentUser.id);
  const allUsers = getUsers().filter(u => u.id !== currentUser.id);
  const conv = partnerId ? conversations.find(c => c.partnerId === partnerId) ?? null : null;
  const totalUnread = conversations.reduce((n, c) => n + c.unreadCount, 0);

  function reload() { setTick(t => t + 1); }

  useEffect(() => {
    if (view === 'chat') {
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 50);
    }
  }, [view, tick, partnerId]);

  function openChat(c: Conversation) {
    c.messages.forEach(m => {
      if (!m.read && m.receiverId === currentUser.id) markMessageRead(m.id);
    });
    setPartnerId(c.partnerId);
    setView('chat');
    setInput('');
    reload();
  }

  function handleSend() {
    const toId = view === 'compose' ? newRecipId : partnerId;
    if (!toId || !input.trim()) return;
    const recipient = allUsers.find(u => u.id === toId);
    if (!recipient) return;

    sendMessage({
      id: crypto.randomUUID(),
      senderId: currentUser.id,
      senderName: currentUser.username,
      receiverId: recipient.id,
      receiverName: recipient.username,
      content: input.trim(),
      createdAt: new Date().toISOString(),
      read: false,
    });

    setInput('');
    if (view === 'compose') {
      setPartnerId(toId);
      setView('chat');
      setNewRecipId('');
    }
    reload();
  }

  function handleDelete(id: string) {
    deleteMessage(id);
    reload();
  }

  /* ── CHAT VIEW ───────────────────────────────────────── */
  if (view === 'chat' && conv) {
    return (
      <div className="flex flex-col" style={{ height: 'calc(100svh - 150px)' }}>

        {/* Header */}
        <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100 flex-shrink-0">
          <button
            onClick={() => { setView('list'); setPartnerId(null); reload(); }}
            className="p-1.5 -ml-1 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-primary-600">{conv.partnerName[0]}</span>
          </div>
          <NameWithCrown name={conv.partnerName} className="text-sm font-bold text-gray-800" />
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto py-3 space-y-1 min-h-0">
          {conv.messages.map((msg, idx) => {
            const isMine = msg.senderId === currentUser.id;
            const prevMsg = conv.messages[idx - 1];
            const showTime = !prevMsg || new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() > 5 * 60 * 1000;

            return (
              <div key={msg.id}>
                {showTime && (
                  <p className="text-center text-[10px] text-gray-300 my-2">{formatFull(msg.createdAt)}</p>
                )}
                <div className={`flex items-end gap-1.5 group ${isMine ? 'justify-end' : 'justify-start'}`}>
                  {!isMine && (
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mb-0.5">
                      <span className="text-[10px] font-bold text-gray-500">{conv.partnerName[0]}</span>
                    </div>
                  )}

                  <div className={`flex flex-col gap-0.5 max-w-[70%] ${isMine ? 'items-end' : 'items-start'}`}>
                    <div className={`px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                      isMine
                        ? 'bg-primary-600 text-white rounded-2xl rounded-br-sm'
                        : 'bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-bl-sm shadow-sm'
                    }`}>
                      {msg.content}
                    </div>
                    <div className={`flex items-center gap-1 px-0.5 ${isMine ? 'flex-row-reverse' : ''}`}>
                      {isMine && msg.read && (
                        <span className="text-[10px] text-primary-400 font-medium">읽음</span>
                      )}
                      <button
                        onClick={() => handleDelete(msg.id)}
                        className="opacity-0 group-hover:opacity-100 transition text-gray-300 hover:text-red-400 p-0.5"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Input bar */}
        <div className="flex-shrink-0 pt-2 border-t border-gray-100 flex gap-2 items-end">
          <textarea
            className="flex-1 text-sm border border-gray-200 rounded-2xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none bg-white leading-relaxed"
            rows={1}
            placeholder="메시지 입력..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-primary-600 hover:bg-primary-700 disabled:bg-gray-200 text-white rounded-2xl transition"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  /* ── COMPOSE VIEW ────────────────────────────────────── */
  if (view === 'compose') {
    return (
      <div className="flex flex-col" style={{ height: 'calc(100svh - 150px)' }}>
        {/* Header */}
        <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100 flex-shrink-0">
          <button
            onClick={() => { setView('list'); setNewRecipId(''); setInput(''); }}
            className="p-1.5 -ml-1 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <p className="text-sm font-bold text-gray-800">새 쪽지</p>
        </div>

        {/* To: selector */}
        <div className="flex items-center gap-2 py-3 border-b border-gray-100 flex-shrink-0">
          <span className="text-xs font-semibold text-gray-400 flex-shrink-0 w-8">받는이</span>
          <select
            className="flex-1 text-sm text-gray-700 bg-transparent focus:outline-none"
            value={newRecipId}
            onChange={e => setNewRecipId(e.target.value)}
            autoFocus
          >
            <option value="">선택...</option>
            {allUsers.map(u => (
              <option key={u.id} value={u.id}>{u.username}</option>
            ))}
          </select>
        </div>

        <div className="flex-1" />

        {/* Input bar */}
        <div className="flex-shrink-0 pt-2 border-t border-gray-100 flex gap-2 items-end">
          <textarea
            className="flex-1 text-sm border border-gray-200 rounded-2xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none bg-white leading-relaxed"
            rows={3}
            placeholder="메시지 입력..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
          />
          <button
            onClick={handleSend}
            disabled={!newRecipId || !input.trim()}
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-primary-600 hover:bg-primary-700 disabled:bg-gray-200 text-white rounded-2xl transition"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  /* ── LIST VIEW ───────────────────────────────────────── */
  return (
    <div className="space-y-2" key={tick}>
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-primary-500" />
          <h2 className="text-sm font-bold text-gray-800">쪽지</h2>
          {totalUnread > 0 && (
            <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full leading-none">
              {totalUnread}
            </span>
          )}
        </div>
        <button
          onClick={() => setView('compose')}
          className="flex items-center gap-1 text-[11px] font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 px-2.5 py-1.5 rounded-lg transition"
        >
          <Pencil className="w-3 h-3" />
          새 쪽지
        </button>
      </div>

      {/* Empty state */}
      {conversations.length === 0 ? (
        <div className="card py-14 flex flex-col items-center gap-3">
          <MessageCircle className="w-10 h-10 text-gray-200" />
          <p className="text-sm text-gray-400">주고받은 쪽지가 없습니다.</p>
          <button
            onClick={() => setView('compose')}
            className="text-xs font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition"
          >
            첫 쪽지 보내기
          </button>
        </div>
      ) : (
        <div className="space-y-1.5">
          {conversations.map(c => {
            const lastMsg = c.messages.at(-1)!;
            const isMine = lastMsg.senderId === currentUser.id;
            return (
              <button
                key={c.partnerId}
                onClick={() => openChat(c)}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white border border-gray-100 shadow-sm hover:bg-gray-50 active:bg-gray-100 transition text-left"
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center ${
                    c.unreadCount > 0 ? 'bg-primary-100' : 'bg-gray-100'
                  }`}>
                    <span className={`text-base font-bold ${
                      c.unreadCount > 0 ? 'text-primary-600' : 'text-gray-500'
                    }`}>
                      {c.partnerName[0]}
                    </span>
                  </div>
                  {c.unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                      {c.unreadCount}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between mb-0.5">
                    <NameWithCrown
                      name={c.partnerName}
                      className={`text-sm ${c.unreadCount > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}
                    />
                    <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">
                      {formatTime(lastMsg.createdAt)}
                    </span>
                  </div>
                  <p className={`text-xs truncate ${c.unreadCount > 0 ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                    {isMine && <span className="text-gray-300 mr-1">나:</span>}
                    {lastMsg.content}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
