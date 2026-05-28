import { useState } from 'react';
import type { User, Announcement } from '../../types';
import { getAnnouncements, createAnnouncement, deleteAnnouncement } from '../../store';
import { Megaphone, X, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { getWeekQuestion } from '../../data/educationQuestions';

interface Props {
  currentUser: User;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export default function AnnouncementBar({ currentUser }: Props) {
  const [announcements, setAnnouncements] = useState<Announcement[]>(getAnnouncements);
  const [expanded, setExpanded] = useState(true);
  const [writing, setWriting] = useState(false);
  const [draft, setDraft] = useState('');

  const isAdmin = currentUser.role === 'admin';
  const canWrite = currentUser.role === 'admin' || currentUser.role === 'subadmin';

  function reload() {
    setAnnouncements(getAnnouncements());
  }

  function handleCreate() {
    if (!draft.trim()) return;
    const ann: Announcement = {
      id: crypto.randomUUID(),
      content: draft.trim(),
      createdAt: new Date().toISOString(),
      authorId: currentUser.id,
      authorName: currentUser.username,
    };
    createAnnouncement(ann);
    setDraft('');
    setWriting(false);
    reload();
  }

  function handleDelete(id: string) {
    if (!window.confirm('공지사항을 삭제할까요?')) return;
    deleteAnnouncement(id);
    reload();
  }

  return (
    <div className="mb-4 bg-indigo-50 border border-indigo-200 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-2 flex-1"
        >
          <Megaphone className="w-4 h-4 text-indigo-500 flex-shrink-0" />
          <span className="text-xs font-bold text-indigo-700 uppercase tracking-wide">
            공지사항 {announcements.length > 0 && `(${announcements.length})`}
          </span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-indigo-400 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 text-indigo-400 ml-1" />}
        </button>
        {canWrite && (
          <button
            onClick={() => { setWriting(v => !v); setExpanded(true); }}
            className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 bg-indigo-100 hover:bg-indigo-200 px-2 py-1 rounded-lg transition"
          >
            <Plus className="w-3 h-3" />
            작성
          </button>
        )}
      </div>

      {/* Write form */}
      {writing && canWrite && (
        <div className="px-4 pb-3 border-t border-indigo-100">
          <textarea
            className="w-full mt-3 text-sm border border-indigo-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white resize-none"
            rows={3}
            placeholder="공지사항 내용을 입력하세요..."
            value={draft}
            onChange={e => setDraft(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => { setWriting(false); setDraft(''); }}
              className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition"
            >
              취소
            </button>
            <button
              onClick={handleCreate}
              disabled={!draft.trim()}
              className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 text-white px-3 py-1.5 rounded-lg transition"
            >
              등록
            </button>
          </div>
        </div>
      )}

      {/* Announcements list */}
      {expanded && announcements.length > 0 && (
        <div className="border-t border-indigo-100 divide-y divide-indigo-100">
          {announcements.map(ann => (
            <div key={ann.id} className="px-4 py-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-indigo-900 whitespace-pre-wrap">{ann.content}</p>
                <p className="text-[10px] text-indigo-400 mt-1">
                  {ann.authorName} · {formatDate(ann.createdAt)}
                </p>
              </div>
              {isAdmin && (
                <button
                  onClick={() => handleDelete(ann.id)}
                  className="flex-shrink-0 p-1 text-indigo-300 hover:text-red-400 transition rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {expanded && announcements.length === 0 && (
        <div className="px-4 pb-3 border-t border-indigo-100">
          <p className="text-xs text-indigo-400 italic py-2">등록된 공지사항이 없습니다.</p>
        </div>
      )}

      {/* 이번 주 교육관 형성 질문 */}
      <div className="border-t border-indigo-100 px-4 py-3 bg-indigo-50/50">
        <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide mb-1.5">
          📚 이번 주 교육관 형성 질문
        </p>
        <p className="text-sm text-indigo-800 leading-relaxed">{getWeekQuestion()}</p>
      </div>
    </div>
  );
}
