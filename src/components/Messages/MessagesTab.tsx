import { useState } from 'react';
import type { User, Message } from '../../types';
import {
  getReceivedMessages, getSentMessages, sendMessage, markMessageRead, getUsers,
} from '../../store';
import { Mail, Send, ChevronDown, ChevronUp, Pencil } from 'lucide-react';

interface Props {
  currentUser: User;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

type MsgTab = 'received' | 'sent';

export default function MessagesTab({ currentUser }: Props) {
  const [tab, setTab] = useState<MsgTab>('received');
  const [received, setReceived] = useState<Message[]>(() => getReceivedMessages(currentUser.id));
  const [sent, setSent] = useState<Message[]>(() => getSentMessages(currentUser.id));
  const [openId, setOpenId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [recipientId, setRecipientId] = useState('');
  const [content, setContent] = useState('');

  const allUsers = getUsers().filter(u => u.id !== currentUser.id);
  const unreadCount = received.filter(m => !m.read).length;

  function reload() {
    setReceived(getReceivedMessages(currentUser.id));
    setSent(getSentMessages(currentUser.id));
  }

  function toggleMessage(msg: Message) {
    if (openId === msg.id) {
      setOpenId(null);
    } else {
      setOpenId(msg.id);
      if (!msg.read && msg.receiverId === currentUser.id) {
        markMessageRead(msg.id);
        reload();
      }
    }
  }

  function handleSend() {
    if (!recipientId || !content.trim()) return;
    const recipient = allUsers.find(u => u.id === recipientId);
    if (!recipient) return;
    const msg: Message = {
      id: crypto.randomUUID(),
      senderId: currentUser.id,
      senderName: currentUser.username,
      receiverId: recipient.id,
      receiverName: recipient.username,
      content: content.trim(),
      createdAt: new Date().toISOString(),
      read: false,
    };
    sendMessage(msg);
    setComposing(false);
    setRecipientId('');
    setContent('');
    reload();
    setTab('sent');
  }

  const messages = tab === 'received' ? received : sent;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-primary-500" />
          <h2 className="text-sm font-bold text-gray-800">쪽지</h2>
        </div>
        <button
          onClick={() => setComposing(v => !v)}
          className="flex items-center gap-1 text-[11px] font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 px-2.5 py-1.5 rounded-lg transition"
        >
          <Pencil className="w-3 h-3" />
          쪽지 쓰기
        </button>
      </div>

      {/* Compose form */}
      {composing && (
        <div className="card p-4 space-y-2">
          <p className="text-xs font-semibold text-gray-600">새 쪽지</p>
          <select
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
            value={recipientId}
            onChange={e => setRecipientId(e.target.value)}
          >
            <option value="">받는 사람 선택</option>
            {allUsers.map(u => (
              <option key={u.id} value={u.id}>{u.username}</option>
            ))}
          </select>
          <textarea
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none"
            rows={4}
            placeholder="내용을 입력하세요"
            value={content}
            onChange={e => setContent(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setComposing(false); setRecipientId(''); setContent(''); }}
              className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition"
            >
              취소
            </button>
            <button
              onClick={handleSend}
              disabled={!recipientId || !content.trim()}
              className="flex items-center gap-1.5 text-xs font-semibold bg-primary-600 hover:bg-primary-700 disabled:bg-gray-200 text-white px-3 py-1.5 rounded-lg transition"
            >
              <Send className="w-3 h-3" />
              보내기
            </button>
          </div>
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
        <button
          onClick={() => { setTab('received'); setOpenId(null); }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] rounded-lg font-medium transition-all ${
            tab === 'received' ? 'bg-white text-primary-700 shadow-sm font-semibold' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          받은쪽지
          {unreadCount > 0 && (
            <span className="text-[9px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full leading-none">
              {unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => { setTab('sent'); setOpenId(null); }}
          className={`flex-1 py-2 text-[11px] rounded-lg font-medium transition-all ${
            tab === 'sent' ? 'bg-white text-primary-700 shadow-sm font-semibold' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          보낸쪽지
        </button>
      </div>

      {/* Message list */}
      {messages.length === 0 && (
        <div className="card py-12 text-center">
          <p className="text-sm text-gray-400">
            {tab === 'received' ? '받은 쪽지가 없습니다.' : '보낸 쪽지가 없습니다.'}
          </p>
        </div>
      )}

      <div className="space-y-2">
        {messages.map(msg => {
          const isOpen = openId === msg.id;
          const isUnread = !msg.read && msg.receiverId === currentUser.id;
          const counterpart = tab === 'received' ? msg.senderName : msg.receiverName;

          return (
            <div
              key={msg.id}
              className={`card p-0 overflow-hidden ${isUnread ? 'border-primary-200' : ''}`}
            >
              <button
                onClick={() => toggleMessage(msg)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {isUnread && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0" />
                    )}
                    <p className={`text-sm truncate ${isUnread ? 'font-semibold text-gray-800' : 'text-gray-700'}`}>
                      {tab === 'received' ? `from ${counterpart}` : `to ${counterpart}`}
                    </p>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                    {formatDate(msg.createdAt)} · {msg.content.slice(0, 40)}{msg.content.length > 40 ? '…' : ''}
                  </p>
                </div>
                {isOpen
                  ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                }
              </button>
              {isOpen && (
                <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
