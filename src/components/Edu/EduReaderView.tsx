import { useState, useEffect, useRef, useCallback } from 'react';
import type { User, EduChapter, EduReaderBookmark, EduExamDraft } from '../../types';
import {
  getEduChapters, saveEduChapter, deleteEduChapter,
  getEduBookmark, saveEduBookmark,
  getMyEduExamDrafts, saveEduExamDraft, deleteEduExamDraft,
} from '../../store';

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string;
import { ChevronLeft, BookOpen, FileText, Bookmark, Plus, Trash2, BookMarked, ClipboardList, Pencil } from 'lucide-react';
import { isPrivileged } from '../../types';

interface Props {
  currentUser: User;
  onBack: () => void;
  tick: number;
}

export default function EduReaderView({ currentUser, onBack, tick: parentTick }: Props) {
  const [localTick, setLocalTick] = useState(0);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [editingChapter, setEditingChapter] = useState<EduChapter | null>(null);
  const [readMode, setReadMode] = useState<'text' | 'pdf'>('text');
  const [selectedPassage, setSelectedPassage] = useState('');
  const [showDraftPanel, setShowDraftPanel] = useState(false);
  const [draftNote, setDraftNote] = useState('');
  const [showDrafts, setShowDrafts] = useState(false);
  const [bookmarkMsg, setBookmarkMsg] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [formTitle, setFormTitle] = useState('');
  const [formText, setFormText] = useState('');
  const [formPdfFile, setFormPdfFile] = useState<File | null>(null);
  const [formError, setFormError] = useState('');

  const readerRef = useRef<HTMLDivElement>(null);
  const isAdmin = isPrivileged(currentUser);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tick = localTick + parentTick;

  const chapters = getEduChapters();
  const selectedChapter = chapters.find(c => c.id === selectedChapterId) ?? null;
  const bookmark = selectedChapterId ? getEduBookmark(currentUser.id, selectedChapterId) : undefined;
  const myDrafts = selectedChapterId ? getMyEduExamDrafts(currentUser.id, selectedChapterId) : [];

  useEffect(() => {
    if (!selectedChapter || !readerRef.current || readMode !== 'text') return;
    if (!bookmark) return;
    const el = readerRef.current;
    requestAnimationFrame(() => {
      const target = (bookmark.scrollPercent / 100) * Math.max(0, el.scrollHeight - el.clientHeight);
      el.scrollTop = target;
    });
  }, [selectedChapterId, readMode]);

  const handleTextSelection = useCallback(() => {
    const text = window.getSelection()?.toString().trim() ?? '';
    if (text.length > 0) setSelectedPassage(text);
  }, []);

  const handleSaveBookmark = () => {
    if (!selectedChapter || !readerRef.current) return;
    const el = readerRef.current;
    const maxScroll = Math.max(1, el.scrollHeight - el.clientHeight);
    const percent = (el.scrollTop / maxScroll) * 100;
    const bm: EduReaderBookmark = {
      id: `${currentUser.id}_${selectedChapter.id}`,
      userId: currentUser.id,
      chapterId: selectedChapter.id,
      scrollPercent: Math.min(100, percent),
      updatedAt: new Date().toISOString(),
    };
    saveEduBookmark(bm);
    setLocalTick(t => t + 1);
    setBookmarkMsg('북마크 저장 완료!');
    setTimeout(() => setBookmarkMsg(''), 2000);
  };

  const handleSaveDraft = () => {
    if (!selectedChapter || !selectedPassage.trim()) return;
    const draft: EduExamDraft = {
      id: crypto.randomUUID(),
      userId: currentUser.id,
      chapterId: selectedChapter.id,
      chapterTitle: selectedChapter.title,
      passage: selectedPassage,
      note: draftNote,
      createdAt: new Date().toISOString(),
    };
    saveEduExamDraft(draft);
    setLocalTick(t => t + 1);
    setShowDraftPanel(false);
    setSelectedPassage('');
    setDraftNote('');
    alert('빈칸 시험 임시 저장 완료!');
  };

  const resetForm = () => {
    setFormTitle('');
    setFormText('');
    setFormPdfFile(null);
    setFormError('');
  };

  const handleUploadChapter = async () => {
    if (!formTitle.trim()) { setFormError('제목을 입력해 주세요.'); return; }
    if (!formText.trim() && !formPdfFile && !editingChapter?.pdfUrl) {
      setFormError('텍스트 내용 또는 PDF 파일을 입력/업로드해 주세요.');
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    setFormError('');
    try {
      const chapterId = editingChapter?.id ?? crypto.randomUUID();
      let pdfUrl = editingChapter?.pdfUrl;
      let pdfStoragePath = editingChapter?.pdfStoragePath;
      let pdfFileName = editingChapter?.pdfFileName;

      if (formPdfFile) {
        const formData = new FormData();
        formData.append('file', formPdfFile);
        formData.append('upload_preset', UPLOAD_PRESET);
        formData.append('folder', 'korean-edu-chapters');
        formData.append('access_mode', 'public');

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`);
          xhr.upload.onprogress = e => {
            if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
          };
          xhr.onload = () => {
            if (xhr.status === 200) {
              const data = JSON.parse(xhr.responseText);
              pdfUrl = data.secure_url;
              pdfStoragePath = data.public_id;
              pdfFileName = formPdfFile.name;
              resolve();
            } else {
              reject(new Error(`업로드 실패 (${xhr.status})`));
            }
          };
          xhr.onerror = () => reject(new Error('네트워크 오류'));
          xhr.send(formData);
        });
      }

      const now = new Date().toISOString();
      const chapter: EduChapter = {
        id: chapterId,
        title: formTitle.trim(),
        orderIndex: editingChapter?.orderIndex ?? chapters.length,
        textContent: formText.trim(),
        pdfUrl,
        pdfStoragePath,
        pdfFileName,
        createdAt: editingChapter?.createdAt ?? now,
        createdById: editingChapter?.createdById ?? currentUser.id,
        createdByName: editingChapter?.createdByName ?? currentUser.username,
        updatedAt: now,
      };

      saveEduChapter(chapter);
      setLocalTick(t => t + 1);
      setShowUploadForm(false);
      setEditingChapter(null);
      resetForm();
    } catch (e) {
      setFormError('업로드 실패: ' + (e instanceof Error ? e.message : '알 수 없는 오류'));
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleEditChapter = (chapter: EduChapter) => {
    setEditingChapter(chapter);
    setFormTitle(chapter.title);
    setFormText(chapter.textContent);
    setFormPdfFile(null);
    setFormError('');
    setShowUploadForm(true);
  };

  const handleDeleteChapter = (chapter: EduChapter) => {
    if (!window.confirm(`'${chapter.title}' 챕터를 삭제합니까? 북마크와 임시 저장도 함께 삭제됩니다.`)) return;
    deleteEduChapter(chapter.id);
    setLocalTick(t => t + 1);
    if (selectedChapterId === chapter.id) setSelectedChapterId(null);
  };

  void tick; // suppress unused warning — triggers re-renders

  // ── UPLOAD FORM ─────────────────────────────────────────
  if (showUploadForm) {
    return (
      <div className="pb-20">
        <button
          onClick={() => { setShowUploadForm(false); setEditingChapter(null); resetForm(); }}
          className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-800 font-medium mb-4 px-2 py-1 rounded-lg hover:bg-primary-50 transition"
        >
          <ChevronLeft className="w-4 h-4" /> 돌아가기
        </button>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h2 className="font-bold text-gray-900 text-base mb-4">
            {editingChapter ? '챕터 수정' : '교재 업로드'}
          </h2>
          {formError && <p className="text-xs text-red-500 mb-3">{formError}</p>}
          <div className="space-y-3">
            <div>
              <label className="text-[11px] text-gray-500 mb-1 block">챕터 제목</label>
              <input
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                placeholder="예: 1단원 — 교수학습론 개요"
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-200"
              />
            </div>
            <div>
              <label className="text-[11px] text-gray-500 mb-1 block">텍스트 내용 (앱으로 읽기)</label>
              <textarea
                value={formText}
                onChange={e => setFormText(e.target.value)}
                placeholder="교재 텍스트를 붙여넣으세요"
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-200 resize-none"
                rows={8}
              />
            </div>
            <div>
              <label className="text-[11px] text-gray-500 mb-1 block">PDF 파일 (PDF로 읽기)</label>
              {editingChapter?.pdfFileName && !formPdfFile && (
                <p className="text-xs text-gray-400 mb-1.5">현재: {editingChapter.pdfFileName}</p>
              )}
              <input
                type="file"
                accept="application/pdf"
                onChange={e => setFormPdfFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 cursor-pointer"
              />
              {formPdfFile && <p className="text-xs text-gray-400 mt-1">{formPdfFile.name}</p>}
            </div>
          </div>
          {uploading && formPdfFile && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>PDF 업로드 중...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%`, background: 'linear-gradient(135deg,#f9a8c9 0%,#de4e80 100%)' }}
                />
              </div>
            </div>
          )}
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleUploadChapter}
              disabled={uploading}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#f9a8c9 0%,#de4e80 100%)' }}
            >
              {uploading ? (formPdfFile ? `업로드 중 ${uploadProgress}%` : '저장 중...') : editingChapter ? '수정 완료' : '업로드'}
            </button>
            <button
              onClick={() => { setShowUploadForm(false); setEditingChapter(null); resetForm(); }}
              disabled={uploading}
              className="px-4 py-2.5 rounded-xl text-sm text-gray-500 border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
            >
              취소
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── CHAPTER DETAIL ──────────────────────────────────────
  if (selectedChapter) {
    const hasPdf = !!selectedChapter.pdfUrl;
    const hasText = !!selectedChapter.textContent;
    const showTextTab = hasText && (readMode === 'text' || !hasPdf);
    const showPdfTab = hasPdf && (readMode === 'pdf' || !hasText);

    return (
      <div className="pb-20">
        <button
          onClick={() => { setSelectedChapterId(null); setShowDrafts(false); setReadMode('text'); setSelectedPassage(''); }}
          className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-800 font-medium mb-4 px-2 py-1 rounded-lg hover:bg-primary-50 transition"
        >
          <ChevronLeft className="w-4 h-4" /> 챕터 목록
        </button>

        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="font-bold text-gray-900">{selectedChapter.title}</h2>
            {bookmark && (
              <p className="text-[11px] text-primary-500 mt-0.5 flex items-center gap-1">
                <BookMarked className="w-3 h-3" />
                북마크: {Math.round(bookmark.scrollPercent)}% 지점
              </p>
            )}
          </div>
          {isAdmin && (
            <button
              onClick={() => handleEditChapter(selectedChapter)}
              className="flex items-center gap-1 text-xs text-gray-500 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"
            >
              <Pencil className="w-3 h-3" /> 수정
            </button>
          )}
        </div>

        {hasPdf && hasText && (
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-3">
            <button
              onClick={() => setReadMode('text')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition ${readMode === 'text' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
            >
              앱으로 읽기
            </button>
            <button
              onClick={() => setReadMode('pdf')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition ${readMode === 'pdf' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
            >
              PDF로 읽기
            </button>
          </div>
        )}

        {showTextTab && (
          <div className="mb-3">
            <div
              ref={readerRef}
              onMouseUp={handleTextSelection}
              onTouchEnd={handleTextSelection}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 overflow-y-auto"
              style={{ maxHeight: '52vh', whiteSpace: 'pre-wrap', lineHeight: '1.85', fontSize: '14px', color: '#374151', userSelect: 'text' }}
            >
              {selectedChapter.textContent || <span className="text-gray-400 text-sm">텍스트가 없습니다.</span>}
            </div>

            <div className="flex gap-2 mt-2">
              <button
                onClick={handleSaveBookmark}
                className="flex items-center gap-1.5 text-xs text-primary-600 px-3 py-2 rounded-xl border border-primary-200 hover:bg-primary-50 transition"
              >
                <Bookmark className="w-3.5 h-3.5" /> 북마크 저장
              </button>
              {selectedPassage && (
                <button
                  onClick={() => setShowDraftPanel(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-violet-600 px-3 py-2 rounded-xl border border-violet-200 hover:bg-violet-50 transition"
                >
                  <ClipboardList className="w-3.5 h-3.5" /> 빈칸 시험 임시 저장
                </button>
              )}
            </div>
            {bookmarkMsg && <p className="text-[11px] text-primary-500 text-center mt-1.5">{bookmarkMsg}</p>}
          </div>
        )}

        {showPdfTab && (
          <div className="mb-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
            <FileText className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-500 mb-4">{selectedChapter.pdfFileName ?? 'PDF 파일'}</p>
            <a
              href={selectedChapter.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm font-bold text-white px-6 py-2.5 rounded-xl"
              style={{ background: 'linear-gradient(135deg,#f9a8c9 0%,#de4e80 100%)' }}
            >
              PDF 열기
            </a>
          </div>
        )}

        {showDraftPanel && (
          <div className="bg-violet-50 rounded-2xl border border-violet-100 p-4 mb-3">
            <p className="text-xs font-bold text-violet-700 mb-2">빈칸 시험 임시 저장</p>
            <div className="bg-white rounded-xl p-3 border border-violet-100 mb-2 max-h-32 overflow-y-auto">
              <p className="text-xs text-gray-600" style={{ whiteSpace: 'pre-wrap' }}>{selectedPassage}</p>
            </div>
            <textarea
              value={draftNote}
              onChange={e => setDraftNote(e.target.value)}
              placeholder="메모 (선택사항)"
              className="w-full text-sm border border-violet-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-200 bg-white resize-none mb-2"
              rows={2}
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveDraft}
                className="flex-1 py-2 rounded-xl text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg,#a78bfa 0%,#7c3aed 100%)' }}
              >
                저장
              </button>
              <button
                onClick={() => { setShowDraftPanel(false); setSelectedPassage(''); setDraftNote(''); }}
                className="px-4 py-2 rounded-xl text-sm text-gray-500 border border-gray-200 hover:bg-gray-50"
              >
                취소
              </button>
            </div>
          </div>
        )}

        <div className="mt-2">
          <button
            onClick={() => setShowDrafts(v => !v)}
            className="flex items-center justify-between w-full text-sm font-medium text-gray-700 py-2 px-1"
          >
            <span className="flex items-center gap-1.5">
              <ClipboardList className="w-4 h-4 text-violet-400" />
              내 임시 저장 ({myDrafts.length})
            </span>
            <span className="text-xs text-gray-400">{showDrafts ? '접기' : '펼치기'}</span>
          </button>

          {showDrafts && (
            <div className="space-y-2 mt-1">
              {myDrafts.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">저장된 구절이 없습니다.</p>
              )}
              {myDrafts.map(draft => (
                <div key={draft.id} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
                  <p className="text-xs text-gray-700 mb-1" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                    {draft.passage}
                  </p>
                  {draft.note && (
                    <p className="text-[11px] text-gray-400 mb-1">메모: {draft.note}</p>
                  )}
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-[10px] text-gray-300">
                      {new Date(draft.createdAt).toLocaleDateString('ko-KR')}
                    </p>
                    <button
                      onClick={() => {
                        if (window.confirm('삭제하시겠습니까?')) {
                          deleteEduExamDraft(draft.id);
                          setLocalTick(t => t + 1);
                        }
                      }}
                      className="text-red-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── CHAPTER LIST ────────────────────────────────────────
  return (
    <div className="pb-20">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-800 font-medium px-2 py-1 rounded-lg hover:bg-primary-50 transition"
        >
          <ChevronLeft className="w-4 h-4" /> 돌아가기
        </button>
        {isAdmin && (
          <button
            onClick={() => { setEditingChapter(null); resetForm(); setShowUploadForm(true); }}
            className="flex items-center gap-1.5 text-xs font-medium text-primary-600 px-3 py-1.5 rounded-xl border border-primary-200 hover:bg-primary-50 transition"
          >
            <Plus className="w-3.5 h-3.5" /> 교재 업로드
          </button>
        )}
      </div>

      <h2 className="font-bold text-gray-900 mb-3">교재 읽기</h2>

      {chapters.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
          <BookOpen className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">
            {isAdmin
              ? '업로드된 교재가 없습니다. 상단 [교재 업로드]를 눌러 추가하세요.'
              : '아직 업로드된 교재가 없습니다.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {chapters.map(chapter => {
            const myBm = getEduBookmark(currentUser.id, chapter.id);
            return (
              <div
                key={chapter.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-3"
              >
                <button
                  onClick={() => {
                    setSelectedChapterId(chapter.id);
                    setReadMode(chapter.textContent ? 'text' : 'pdf');
                    setSelectedPassage('');
                    setShowDraftPanel(false);
                  }}
                  className="flex-1 text-left"
                >
                  <p className="font-medium text-gray-800 text-sm">{chapter.title}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {chapter.textContent && (
                      <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">텍스트</span>
                    )}
                    {chapter.pdfUrl && (
                      <span className="text-[10px] text-red-500 bg-red-50 px-1.5 py-0.5 rounded">PDF</span>
                    )}
                    {myBm && (
                      <span className="text-[10px] text-primary-400 flex items-center gap-0.5">
                        <BookMarked className="w-2.5 h-2.5" />
                        {Math.round(myBm.scrollPercent)}% 읽음
                      </span>
                    )}
                  </div>
                </button>
                {isAdmin && (
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => handleEditChapter(chapter)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteChapter(chapter)}
                      className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
