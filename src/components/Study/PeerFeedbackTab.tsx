import { useState } from 'react';
import { Send, Trash2, MessageSquare, Inbox } from 'lucide-react';
import type { User, PeerFeedbackCategory } from '../../types';
import {
  getUsers, getVocabTestScoresForDate,
  getPeerFeedbacksForDate, addPeerFeedback, deletePeerFeedback,
} from '../../store';

interface Props {
  date: string;
  currentUser: User;
}

const CATEGORIES: PeerFeedbackCategory[] = ['분석 방향성', '근거 부족/오류', '어휘 부족', '공부법'];

const CAT_COLOR: Record<PeerFeedbackCategory, string> = {
  '분석 방향성':   'bg-indigo-50 text-indigo-600',
  '근거 부족/오류': 'bg-rose-50 text-rose-600',
  '어휘 부족':     'bg-amber-50 text-amber-600',
  '공부법':        'bg-emerald-50 text-emerald-600',
};

export default function PeerFeedbackTab({ date, currentUser }: Props) {
  const [targetId, setTargetId] = useState('');
  const [category, setCategory] = useState<PeerFeedbackCategory>('분석 방향성');
  const [content, setContent] = useState('');
  const [tick, setTick] = useState(0);

  const scores = getVocabTestScoresForDate(date);
  const attendingUsers = getUsers().filter(
    u => u.id !== currentUser.id && scores.some(s => s.userId === u.id)
  );
  const allFeedbacks = getPeerFeedbacksForDate(date);
  const received = allFeedbacks.filter(f => f.targetId === currentUser.id);
  const sent = allFeedbacks.filter(f => f.authorId === currentUser.id);

  function handleSend() {
    if (!targetId || !content.trim()) return;
    const target = attendingUsers.find(u => u.id === targetId);
    if (!target) return;

    const alreadySent = sent.some(f => f.targetId === targetId);
    if (alreadySent) {
      if (!window.confirm(`${target.username}에게 이미 피드백을 보냈습니다. 추가로 보낼까요?`)) return;
    }

    addPeerFeedback({
      id: crypto.randomUUID(),
      date,
      authorId: currentUser.id,
      authorName: currentUser.username,
      targetId,
      targetName: target.username,
      category,
      content: content.trim(),
      createdAt: new Date().toISOString(),
    });
    setContent('');
    setTick(t => t + 1);
  }

  function handleDelete(id: string) {
    if (!window.confirm('피드백을 삭제할까요?')) return;
    deletePeerFeedback(id);
    setTick(t => t + 1);
  }

  return (
    <div className="space-y-4" key={tick}>
      {/* Write feedback */}
      <div className="card space-y-3">
        <p className="text-sm font-bold text-gray-800">피드백 남기기</p>

        {attendingUsers.length === 0 ? (
          <p className="text-xs text-gray-400 py-2">
            오늘 시험 점수를 제출한 다른 멤버가 없습니다.
          </p>
        ) : (
          <>
            {/* Member select */}
            <select
              value={targetId}
              onChange={e => setTargetId(e.target.value)}
              className="input-field w-full text-sm"
            >
              <option value="">멤버 선택</option>
              {attendingUsers.map(u => (
                <option key={u.id} value={u.id}>{u.username}</option>
              ))}
            </select>

            {/* Category */}
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`text-[11px] font-medium px-2.5 py-1 rounded-full transition ${
                    category === cat
                      ? CAT_COLOR[cat] + ' ring-1 ring-current'
                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Content */}
            <textarea
              className="input-field w-full text-sm resize-none"
              rows={3}
              placeholder="구체적인 피드백을 작성해 주세요."
              value={content}
              onChange={e => setContent(e.target.value)}
            />

            <button
              onClick={handleSend}
              disabled={!targetId || !content.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold bg-primary-600 text-white rounded-xl disabled:bg-gray-200 disabled:text-gray-400 transition"
            >
              <Send className="w-3.5 h-3.5" />전송
            </button>
          </>
        )}
      </div>

      {/* Received feedbacks */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
          <Inbox className="w-3.5 h-3.5" />받은 피드백 ({received.length})
        </p>
        {received.length === 0 ? (
          <p className="text-xs text-gray-300 text-center py-4">아직 받은 피드백이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {received.map(f => (
              <div key={f.id} className="card p-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-700">{f.authorName}</span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${CAT_COLOR[f.category as PeerFeedbackCategory]}`}>{f.category}</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">{f.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sent feedbacks */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
          <MessageSquare className="w-3.5 h-3.5" />보낸 피드백 ({sent.length})
        </p>
        {sent.length === 0 ? (
          <p className="text-xs text-gray-300 text-center py-4">보낸 피드백이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {sent.map(f => (
              <div key={f.id} className="card p-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-700">→ {f.targetName}</span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${CAT_COLOR[f.category as PeerFeedbackCategory]}`}>{f.category}</span>
                  <button
                    onClick={() => handleDelete(f.id)}
                    className="ml-auto text-gray-200 hover:text-red-400 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">{f.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
