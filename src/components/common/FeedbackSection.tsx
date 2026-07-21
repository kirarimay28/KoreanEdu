import { useState } from 'react';
import type { Feedback, User } from '../../types';
import { isPrivileged } from '../../types';
import { MessageSquare, Send, Trash2 } from 'lucide-react';

interface Props {
  feedbacks: Feedback[];
  currentUser: User;
  entryOwnerId: string;
  onAddFeedback: (content: string) => void;
  onDeleteFeedback?: (feedbackId: string) => void;
}

export default function FeedbackSection({ feedbacks, currentUser, entryOwnerId, onAddFeedback, onDeleteFeedback }: Props) {
  const [draft, setDraft] = useState('');
  const canComment = currentUser.id !== entryOwnerId;
  const canDeleteAny = isPrivileged(currentUser);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    onAddFeedback(draft.trim());
    setDraft('');
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-primary-500" />
        <span className="text-sm font-semibold text-gray-700">상호 피드백</span>
        {feedbacks.length > 0 && (
          <span className="bg-primary-100 text-primary-700 text-xs font-bold px-2 py-0.5 rounded-full">
            {feedbacks.length}
          </span>
        )}
      </div>

      {feedbacks.length === 0 && (
        <p className="text-sm text-gray-400 italic py-2">아직 피드백이 없습니다.</p>
      )}

      <div className="space-y-2">
        {feedbacks.map(fb => (
          <div key={fb.id} className="bg-primary-50 rounded-xl px-4 py-3 border border-primary-100">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-primary-700">{fb.authorName}</span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-400">{formatTime(fb.createdAt)}</span>
                {canDeleteAny && onDeleteFeedback && (
                  <button
                    onClick={() => { if (window.confirm('이 피드백을 삭제할까요?')) onDeleteFeedback(fb.id); }}
                    className="p-0.5 text-gray-300 hover:text-red-400 transition rounded"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{fb.content}</p>
          </div>
        ))}
      </div>

      {canComment ? (
        <form onSubmit={handleSubmit} className="flex gap-2 mt-2">
          <input
            className="input-field flex-1"
            placeholder="피드백을 입력하세요..."
            value={draft}
            onChange={e => setDraft(e.target.value)}
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            className="p-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-200 text-white rounded-xl transition flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      ) : (
        <p className="text-xs text-gray-400 italic">본인 글에는 피드백을 작성할 수 없습니다.</p>
      )}
    </div>
  );
}
