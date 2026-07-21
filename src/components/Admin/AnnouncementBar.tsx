import { useState } from 'react';
import type { User, Announcement } from '../../types';
import { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } from '../../store';
import { Megaphone, X, Plus, ChevronDown, ChevronUp, Pin, Pencil, Check, Share2 } from 'lucide-react';
import { shareAnnouncement } from '../../kakao';
import NameWithCrown from '../common/NameWithCrown';
import { getWeekQuestion } from '../../data/educationQuestions';

interface Props {
  currentUser: User;
  onShowWrite: () => void;
  onShowRead: () => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export default function AnnouncementBar({ currentUser, onShowWrite, onShowRead }: Props) {
  const [announcements, setAnnouncements] = useState<Announcement[]>(getAnnouncements);
  const [expanded, setExpanded] = useState(true);
  const [writing, setWriting] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  const isAdmin = currentUser.role === 'admin';
  const canWrite = currentUser.role === 'admin' || currentUser.role === 'subadmin';

  function reload() { setAnnouncements(getAnnouncements()); }

  function toggleAnn(id: string) {
    setOpenIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function handleCreate() {
    if (!draftTitle.trim()) return;
    const ann: Announcement = {
      id: crypto.randomUUID(),
      title: draftTitle.trim(),
      content: draftContent.trim(),
      createdAt: new Date().toISOString(),
      authorId: currentUser.id,
      authorName: currentUser.username,
    };
    createAnnouncement(ann);
    setDraftTitle('');
    setDraftContent('');
    setWriting(false);
    reload();
  }

  function handleDelete(id: string) {
    if (!window.confirm('공지사항을 삭제할까요?')) return;
    deleteAnnouncement(id);
    reload();
  }

  function startEdit(ann: Announcement) {
    setEditingId(ann.id);
    setEditTitle(ann.title || '');
    setEditContent(ann.content || '');
    setOpenIds(prev => new Set([...prev, ann.id]));
  }

  function handleSaveEdit(ann: Announcement) {
    if (!editTitle.trim()) return;
    updateAnnouncement({ ...ann, title: editTitle.trim(), content: editContent.trim() });
    setEditingId(null);
    reload();
  }

  function handleTogglePin(ann: Announcement) {
    updateAnnouncement({ ...ann, pinned: !ann.pinned });
    reload();
  }

  return (
    <div className="mb-4 bg-primary-50 border border-primary-200 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-2 flex-1"
        >
          <Megaphone className="w-4 h-4 text-primary-500 flex-shrink-0" />
          <span className="text-xs font-bold text-primary-700 uppercase tracking-wide">
            공지사항 {announcements.length > 0 && `(${announcements.length})`}
          </span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-primary-400 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 text-primary-400 ml-1" />}
        </button>
        {canWrite && (
          <button
            onClick={() => { setWriting(v => !v); setExpanded(true); }}
            className="flex items-center gap-1 text-[10px] font-semibold text-primary-600 bg-primary-100 hover:bg-primary-200 px-2 py-1 rounded-lg transition"
          >
            <Plus className="w-3 h-3" />
            작성
          </button>
        )}
      </div>

      {/* Write form */}
      {writing && canWrite && (
        <div className="px-4 pb-3 border-t border-primary-100 space-y-2 pt-3">
          <input
            className="w-full text-sm border border-primary-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white font-semibold"
            placeholder="제목"
            value={draftTitle}
            onChange={e => setDraftTitle(e.target.value)}
            autoFocus
          />
          <textarea
            className="w-full text-sm border border-primary-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white resize-none"
            rows={4}
            placeholder="내용 (선택)"
            value={draftContent}
            onChange={e => setDraftContent(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setWriting(false); setDraftTitle(''); setDraftContent(''); }}
              className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition"
            >
              취소
            </button>
            <button
              onClick={handleCreate}
              disabled={!draftTitle.trim()}
              className="text-xs font-semibold bg-primary-600 hover:bg-primary-700 disabled:bg-gray-200 text-white px-3 py-1.5 rounded-lg transition"
            >
              등록
            </button>
          </div>
        </div>
      )}

      {/* Announcements list */}
      {expanded && announcements.length > 0 && (
        <div className="border-t border-primary-100 divide-y divide-primary-100">
          {announcements.map(ann => {
            const isOpen = openIds.has(ann.id);
            const title = ann.title || ann.content.split('\n')[0];
            const hasBody = !!ann.content;
            const isEditing = editingId === ann.id;
            return (
              <div key={ann.id} className="px-4 py-2.5">
                <div className="flex items-center gap-2">
                  {ann.pinned && <Pin className="w-3 h-3 text-primary-400 flex-shrink-0" />}
                  <button
                    onClick={() => !isEditing && hasBody && toggleAnn(ann.id)}
                    className={`flex-1 flex items-center gap-1.5 text-left min-w-0 ${hasBody && !isEditing ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <span className={`text-sm font-semibold flex-1 ${ann.pinned ? 'text-primary-700' : 'text-primary-900'}`}>{title}</span>
                    {hasBody && !isEditing && (
                      isOpen
                        ? <ChevronUp className="w-3.5 h-3.5 text-primary-400 flex-shrink-0" />
                        : <ChevronDown className="w-3.5 h-3.5 text-primary-400 flex-shrink-0" />
                    )}
                  </button>
                  {!isEditing && (
                    <button
                      onClick={() => shareAnnouncement({ title, content: ann.content, authorName: ann.authorName })}
                      className="flex-shrink-0 p-1 text-primary-300 hover:text-primary-500 transition rounded"
                      title="공유하기"
                    >
                      <Share2 className="w-3 h-3" />
                    </button>
                  )}
                  {canWrite && !isEditing && (
                    <button
                      onClick={() => startEdit(ann)}
                      className="flex-shrink-0 p-1 text-primary-300 hover:text-primary-500 transition rounded"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                  {isAdmin && !isEditing && (
                    <button
                      onClick={() => handleTogglePin(ann)}
                      className={`flex-shrink-0 p-1 transition rounded ${ann.pinned ? 'text-primary-500' : 'text-primary-300 hover:text-primary-500'}`}
                      title={ann.pinned ? '고정 해제' : '상단 고정'}
                    >
                      <Pin className="w-3 h-3" />
                    </button>
                  )}
                  {isAdmin && !isEditing && (
                    <button
                      onClick={() => handleDelete(ann.id)}
                      className="flex-shrink-0 p-1 text-primary-300 hover:text-red-400 transition rounded"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {isEditing && (
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex-shrink-0 text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded transition"
                    >
                      취소
                    </button>
                  )}
                  {isEditing && (
                    <button
                      onClick={() => handleSaveEdit(ann)}
                      disabled={!editTitle.trim()}
                      className="flex-shrink-0 p-1 text-primary-500 hover:text-primary-700 disabled:text-gray-300 transition rounded"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div className="mt-2 space-y-1.5">
                    <input
                      className="w-full text-sm border border-primary-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white font-semibold"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      autoFocus
                    />
                    <textarea
                      className="w-full text-sm border border-primary-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white resize-none"
                      rows={3}
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                    />
                  </div>
                ) : (
                  <>
                    <p className="text-[10px] text-primary-400 mt-0.5"><NameWithCrown name={ann.authorName} /> · {formatDate(ann.createdAt)}</p>
                    {isOpen && hasBody && (
                      <p className="text-sm text-primary-800 whitespace-pre-wrap mt-2 leading-relaxed">{ann.content}</p>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {expanded && announcements.length === 0 && (
        <div className="px-4 pb-3 border-t border-primary-100">
          <p className="text-xs text-primary-400 italic py-2">등록된 공지사항이 없습니다.</p>
        </div>
      )}

      {/* 이번 주 교육관 형성 질문 */}
      <div className="border-t border-primary-100 px-4 py-3 bg-primary-50/50">
        <p className="text-[10px] font-bold text-primary-500 uppercase tracking-wide mb-1.5">
          📚 이번 주 교육관 형성 질문
        </p>
        <p className="text-sm text-primary-800 leading-relaxed mb-2.5">{getWeekQuestion()}</p>
        <div className="flex gap-2">
          <button
            onClick={onShowWrite}
            className="text-xs font-semibold text-primary-600 bg-primary-100 hover:bg-primary-200 px-3 py-1.5 rounded-lg transition"
          >
            내 답변 작성
          </button>
          <button
            onClick={onShowRead}
            className="text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition"
          >
            다른 답변 보러 가기
          </button>
        </div>
      </div>
    </div>
  );
}
