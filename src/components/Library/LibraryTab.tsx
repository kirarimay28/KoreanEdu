import { useState } from 'react';
import { FileText, Download, Lock, Plus, X, Trash2, Link } from 'lucide-react';
import type { User, LibraryItem } from '../../types';
import { getLibraryItems, addLibraryItem, removeLibraryItem } from '../../store';

interface Props {
  currentUser: User;
}

const TAG_OPTIONS = ['작품 목록', '어휘', '학습지', '기출 문제', '문법', '기타'];

const TAG_COLOR: Record<string, string> = {
  '작품 목록': 'bg-indigo-50 text-indigo-600',
  '어휘':      'bg-emerald-50 text-emerald-600',
  '학습지':    'bg-amber-50 text-amber-600',
  '기출 문제': 'bg-rose-50 text-rose-600',
  '문법':      'bg-sky-50 text-sky-600',
  '기타':      'bg-gray-100 text-gray-500',
};

const STATIC_ITEMS = [
  { title: '고전문학 필독 작품 목록', description: '조선대 국어교육과 고전문학 필독 작품 목록 — 갈래별 정리', href: '/고전문학-필독작품목록.pdf', size: '319KB', tag: '작품 목록' },
  { title: '고전어 어휘 100개', description: '달콤한 국어 — 필수 고전어 어휘 100개, 현대어 풀이 및 예문', href: '/고전어-어휘100.pdf', size: '353KB', tag: '어휘' },
  { title: '고전문학 작품 학습지', description: '개별 작품 분석 학습지 — 갈래, 시적 화자, 배경, 정서·태도, 표현 등', href: '/고전문학-작품학습지.pdf', size: '620KB', tag: '학습지' },
];

export default function LibraryTab({ currentUser }: Props) {
  const restricted = !!currentUser.restrictions?.noLibraryDownload;
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'subadmin';

  const [items, setItems] = useState<LibraryItem[]>(() => getLibraryItems());
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tag, setTag] = useState('기타');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  function resetForm() {
    setTitle(''); setDescription(''); setTag('기타'); setUrl(''); setError('');
    setShowForm(false);
  }

  function handleAdd() {
    if (!title.trim() || !url.trim()) {
      setError('제목과 링크를 모두 입력해 주세요.');
      return;
    }
    const item: LibraryItem = {
      id: crypto.randomUUID(),
      title: title.trim(),
      description: description.trim(),
      tag,
      downloadUrl: url.trim(),
      storagePath: '',
      fileName: '',
      fileSize: 0,
      uploadedAt: new Date().toISOString(),
      uploadedById: currentUser.id,
      uploadedByName: currentUser.username,
    };
    addLibraryItem(item);
    setItems(getLibraryItems());
    resetForm();
  }

  function handleDelete(item: LibraryItem) {
    if (!window.confirm(`'${item.title}' 을(를) 삭제할까요?`)) return;
    removeLibraryItem(item.id);
    setItems(getLibraryItems());
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        {restricted ? (
          <p className="text-xs text-red-400 flex items-center gap-1">
            <Lock className="w-3 h-3" />다운로드 권한이 제한되어 있습니다.
          </p>
        ) : (
          <p className="text-xs text-gray-400">클릭하면 새 탭에서 열립니다.</p>
        )}
        {isAdmin && !restricted && (
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 transition px-2 py-1 rounded-lg hover:bg-primary-50"
          >
            <Plus className="w-3.5 h-3.5" />자료 추가
          </button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card border border-primary-100 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
              <Link className="w-4 h-4 text-primary-500" />자료 링크 추가
            </p>
            <button onClick={resetForm} className="text-gray-300 hover:text-gray-500 transition">
              <X className="w-4 h-4" />
            </button>
          </div>

          <input
            className="input-field w-full text-sm"
            placeholder="자료 제목"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <input
            className="input-field w-full text-sm"
            placeholder="설명 (선택)"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
          <input
            className="input-field w-full text-sm"
            placeholder="링크 (Google Drive, Dropbox 등 공유 URL)"
            value={url}
            onChange={e => setUrl(e.target.value)}
          />

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500">태그</span>
            {TAG_OPTIONS.map(t => (
              <button
                key={t}
                onClick={() => setTag(t)}
                className={`text-[11px] font-medium px-2.5 py-1 rounded-full transition ${
                  tag === t
                    ? (TAG_COLOR[t] ?? 'bg-gray-100') + ' ring-1 ring-current'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <p className="text-[11px] text-gray-400">
            Google Drive: 공유 → &quot;링크가 있는 모든 사용자&quot; 설정 후 링크 복사
          </p>

          <button
            onClick={handleAdd}
            disabled={!title.trim() || !url.trim()}
            className="w-full py-2.5 text-sm font-semibold bg-primary-600 hover:bg-primary-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl transition"
          >
            추가
          </button>
        </div>
      )}

      {/* Dynamic items */}
      {items.map(item => (
        <div key={item.id} className={`flex items-start gap-4 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm transition-all ${restricted ? 'opacity-60' : 'hover:shadow-md hover:border-primary-200 group'}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition ${restricted ? 'bg-gray-100' : 'bg-primary-50 group-hover:bg-primary-100'}`}>
            {restricted ? <Lock className="w-5 h-5 text-gray-300" /> : <FileText className="w-5 h-5 text-primary-500" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {restricted ? (
                <span className="font-semibold text-sm text-gray-400">{item.title}</span>
              ) : (
                <a href={item.downloadUrl} target="_blank" rel="noopener noreferrer"
                  className="font-semibold text-sm text-gray-800 hover:text-primary-600 transition">
                  {item.title}
                </a>
              )}
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${TAG_COLOR[item.tag] ?? 'bg-gray-100 text-gray-500'}`}>{item.tag}</span>
            </div>
            {item.description && <p className="text-xs text-gray-500 leading-relaxed">{item.description}</p>}
            <p className="text-[10px] text-gray-400 mt-1">{item.uploadedByName}</p>
          </div>
          {isAdmin ? (
            <button onClick={() => handleDelete(item)} className="flex-shrink-0 text-gray-200 hover:text-red-400 transition mt-1">
              <Trash2 className="w-4 h-4" />
            </button>
          ) : !restricted ? (
            <Download className="w-4 h-4 text-gray-300 group-hover:text-primary-400 transition flex-shrink-0 mt-1" />
          ) : null}
        </div>
      ))}

      {/* Static built-in items */}
      {STATIC_ITEMS.map(item => {
        const content = (
          <>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition ${restricted ? 'bg-gray-100' : 'bg-primary-50 group-hover:bg-primary-100'}`}>
              {restricted ? <Lock className="w-5 h-5 text-gray-300" /> : <FileText className="w-5 h-5 text-primary-500" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`font-semibold text-sm ${restricted ? 'text-gray-400' : 'text-gray-800'}`}>{item.title}</span>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${restricted ? 'bg-gray-100 text-gray-400' : (TAG_COLOR[item.tag] ?? 'bg-gray-100 text-gray-500')}`}>{item.tag}</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">{item.description}</p>
              <p className="text-[10px] text-gray-400 mt-1">{item.size}</p>
            </div>
            {!restricted && <Download className="w-4 h-4 text-gray-300 group-hover:text-primary-400 transition flex-shrink-0 mt-1" />}
          </>
        );

        return restricted ? (
          <div key={item.title} className="flex items-start gap-4 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm opacity-60 cursor-not-allowed">
            {content}
          </div>
        ) : (
          <a key={item.title} href={item.href} target="_blank" rel="noopener noreferrer"
            className="flex items-start gap-4 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md hover:border-primary-200 transition-all group">
            {content}
          </a>
        );
      })}
    </div>
  );
}
