import { useState, useRef } from 'react';
import { FileText, Download, Lock, Plus, X, Trash2, Upload, Loader2, BookOpen, BookText, ClipboardList, Bookmark, Book, FolderOpen } from 'lucide-react';
import type { User, LibraryItem } from '../../types';
import { getLibraryItems, addLibraryItem, removeLibraryItem } from '../../store';
import NameWithCrown from '../common/NameWithCrown';

interface Props {
  currentUser: User;
}

const TAG_OPTIONS = ['작품 목록', '어휘', '학습지', '기출 문제', '문법', '기타'];

const TAG_COLOR: Record<string, string> = {
  '작품 목록': 'bg-primary-50 text-primary-600',
  '어휘':      'bg-emerald-50 text-emerald-600',
  '학습지':    'bg-amber-50 text-amber-600',
  '기출 문제': 'bg-rose-50 text-rose-600',
  '문법':      'bg-sky-50 text-sky-600',
  '기타':      'bg-gray-100 text-gray-500',
};

const TAG_BORDER: Record<string, string> = {
  '작품 목록': 'border-primary-300',
  '어휘':      'border-emerald-300',
  '학습지':    'border-amber-300',
  '기출 문제': 'border-rose-300',
  '문법':      'border-sky-300',
  '기타':      'border-gray-300',
};

const TAG_ICON: Record<string, React.ReactNode> = {
  '작품 목록': <BookOpen className="w-3.5 h-3.5" />,
  '어휘':      <Book className="w-3.5 h-3.5" />,
  '학습지':    <BookText className="w-3.5 h-3.5" />,
  '기출 문제': <ClipboardList className="w-3.5 h-3.5" />,
  '문법':      <Bookmark className="w-3.5 h-3.5" />,
  '기타':      <FolderOpen className="w-3.5 h-3.5" />,
};

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string;

const STATIC_ITEMS: (LibraryItem & { href: string; size: string; isStatic: true })[] = [
  { id: 'static-1', title: '고전문학 필독 작품 목록', description: '조선대 국어교육과 고전문학 필독 작품 목록 — 갈래별 정리', href: '/고전문학-필독작품목록.pdf', size: '319KB', tag: '작품 목록', downloadUrl: '/고전문학-필독작품목록.pdf', storagePath: '', fileName: '', fileSize: 0, uploadedAt: '', uploadedById: '', uploadedByName: '', isStatic: true },
  { id: 'static-2', title: '고전어 어휘 100개', description: '달콤한 국어 — 필수 고전어 어휘 100개, 현대어 풀이 및 예문', href: '/고전어-어휘100.pdf', size: '353KB', tag: '어휘', downloadUrl: '/고전어-어휘100.pdf', storagePath: '', fileName: '', fileSize: 0, uploadedAt: '', uploadedById: '', uploadedByName: '', isStatic: true },
  { id: 'static-3', title: '고전문학 작품 학습지', description: '개별 작품 분석 학습지 — 갈래, 시적 화자, 배경, 정서·태도, 표현 등', href: '/고전문학-작품학습지.pdf', size: '620KB', tag: '학습지', downloadUrl: '/고전문학-작품학습지.pdf', storagePath: '', fileName: '', fileSize: 0, uploadedAt: '', uploadedById: '', uploadedByName: '', isStatic: true },
];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

type AnyItem = LibraryItem & { href?: string; size?: string; isStatic?: boolean };

function ItemCard({ item, restricted, isAdmin, onDelete }: {
  item: AnyItem;
  restricted: boolean;
  isAdmin: boolean;
  onDelete?: () => void;
}) {
  const inner = (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border border-gray-100 shadow-sm transition-all ${restricted ? 'opacity-60' : 'hover:shadow-md hover:border-primary-200 group'}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${restricted ? 'bg-gray-100' : 'bg-primary-50 group-hover:bg-primary-100 transition'}`}>
        {restricted ? <Lock className="w-4 h-4 text-gray-300" /> : <FileText className="w-4 h-4 text-primary-500" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold leading-snug truncate ${restricted ? 'text-gray-400' : 'text-gray-800'}`}>{item.title}</p>
        {item.description && <p className="text-xs text-gray-400 truncate mt-0.5">{item.description}</p>}
        <p className="text-[10px] text-gray-300 mt-0.5">
          {item.isStatic
            ? item.size
            : <><NameWithCrown name={item.uploadedByName} />{item.fileSize ? ` · ${formatBytes(item.fileSize)}` : ''}</>}
        </p>
      </div>
      {isAdmin && !item.isStatic && onDelete ? (
        <button
          onClick={e => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
          className="flex-shrink-0 text-gray-200 hover:text-red-400 transition"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ) : !restricted ? (
        <Download className="w-4 h-4 text-gray-300 group-hover:text-primary-400 transition flex-shrink-0" />
      ) : null}
    </div>
  );

  if (restricted || (!item.downloadUrl && !item.href)) return <div>{inner}</div>;
  return (
    <a href={(item.href ?? item.downloadUrl)!} target="_blank" rel="noopener noreferrer">
      {inner}
    </a>
  );
}

export default function LibraryTab({ currentUser }: Props) {
  const restricted = !!currentUser.restrictions?.noLibraryDownload;
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'subadmin';

  const [items, setItems] = useState<LibraryItem[]>(() => getLibraryItems());
  const [selectedTag, setSelectedTag] = useState('전체');
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tag, setTag] = useState('기타');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const allItems: AnyItem[] = [...STATIC_ITEMS, ...items];

  function resetForm() {
    setTitle(''); setDescription(''); setTag('기타');
    setFile(null); setError(''); setProgress(0);
    setShowForm(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleUpload() {
    if (!title.trim()) { setError('제목을 입력해 주세요.'); return; }
    if (!file) { setError('PDF 파일을 선택해 주세요.'); return; }
    if (!CLOUD_NAME || !UPLOAD_PRESET) { setError('Cloudinary 환경 변수가 설정되지 않았습니다.'); return; }

    setUploading(true); setError(''); setProgress(10);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);
      formData.append('folder', 'korean-edu-library');
      setProgress(30);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`, { method: 'POST', body: formData });
      setProgress(80);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as { error?: { message?: string } }).error?.message ?? '업로드 실패');
      }
      const data = await res.json() as { secure_url: string; public_id: string; bytes: number };
      setProgress(100);
      const item: LibraryItem = {
        id: crypto.randomUUID(),
        title: title.trim(), description: description.trim(), tag,
        downloadUrl: data.secure_url, storagePath: data.public_id,
        fileName: file.name, fileSize: data.bytes,
        uploadedAt: new Date().toISOString(),
        uploadedById: currentUser.id, uploadedByName: currentUser.username,
      };
      addLibraryItem(item);
      setItems(getLibraryItems());
      resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : '업로드 중 오류가 발생했습니다.');
      setProgress(0);
    } finally {
      setUploading(false);
    }
  }

  function handleDelete(item: LibraryItem) {
    if (!window.confirm(`'${item.title}' 을(를) 삭제할까요?`)) return;
    removeLibraryItem(item.id);
    setItems(getLibraryItems());
  }

  const tagsWithItems = ['전체', ...TAG_OPTIONS.filter(t => allItems.some(i => i.tag === t))];

  const visibleItems = selectedTag === '전체' ? allItems : allItems.filter(i => i.tag === selectedTag);

  const grouped: [string, AnyItem[]][] =
    selectedTag === '전체'
      ? TAG_OPTIONS
          .filter(t => allItems.some(i => i.tag === t))
          .map(t => [t, allItems.filter(i => i.tag === t)])
      : [[selectedTag, visibleItems]];

  return (
    <div className="space-y-4">
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
              <Upload className="w-4 h-4 text-primary-500" />PDF 업로드
            </p>
            <button onClick={resetForm} className="text-gray-300 hover:text-gray-500 transition"><X className="w-4 h-4" /></button>
          </div>
          <input className="input-field w-full text-sm" placeholder="자료 제목" value={title} onChange={e => setTitle(e.target.value)} />
          <input className="input-field w-full text-sm" placeholder="설명 (선택)" value={description} onChange={e => setDescription(e.target.value)} />
          <div>
            <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
            <button type="button" onClick={() => fileRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-400 hover:border-primary-300 hover:text-primary-500 transition">
              <FileText className="w-4 h-4" />
              {file ? <span className="text-gray-700 font-medium">{file.name} <span className="text-gray-400 font-normal">({formatBytes(file.size)})</span></span> : 'PDF 파일 선택'}
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500">태그</span>
            {TAG_OPTIONS.map(t => (
              <button key={t} onClick={() => setTag(t)}
                className={`text-[11px] font-medium px-2.5 py-1 rounded-full transition ${tag === t ? (TAG_COLOR[t] ?? 'bg-gray-100') + ' ring-1 ring-current' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
                {t}
              </button>
            ))}
          </div>
          {uploading && (
            <div className="space-y-1">
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-[11px] text-gray-400 text-center">업로드 중... {progress}%</p>
            </div>
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button onClick={handleUpload} disabled={uploading || !title.trim() || !file}
            className="w-full py-2.5 text-sm font-semibold bg-primary-600 hover:bg-primary-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl transition flex items-center justify-center gap-2">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? '업로드 중...' : '업로드'}
          </button>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
        {tagsWithItems.map(t => (
          <button
            key={t}
            onClick={() => setSelectedTag(t)}
            className={`flex-shrink-0 flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full transition ${
              selectedTag === t
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {t !== '전체' && TAG_ICON[t]}
            {t}
          </button>
        ))}
      </div>

      {/* Shelves */}
      <div className="space-y-5">
        {grouped.map(([shelfTag, shelfItems]) => (
          <div key={shelfTag}>
            {/* Shelf label */}
            <div className={`flex items-center gap-2 mb-2.5 pl-3 border-l-4 ${TAG_BORDER[shelfTag] ?? 'border-gray-300'}`}>
              <span className={`flex items-center gap-1.5 text-xs font-bold ${TAG_COLOR[shelfTag]?.split(' ')[1] ?? 'text-gray-600'}`}>
                {TAG_ICON[shelfTag]}
                {shelfTag}
              </span>
              <span className="text-[10px] text-gray-300 font-medium">{shelfItems.length}개</span>
            </div>

            {/* Items on shelf */}
            <div className="space-y-2">
              {shelfItems.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  restricted={restricted}
                  isAdmin={isAdmin}
                  onDelete={item.isStatic ? undefined : () => handleDelete(item as LibraryItem)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {allItems.length === 0 && (
        <div className="text-center py-14">
          <BookOpen className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">등록된 자료가 없습니다.</p>
        </div>
      )}
    </div>
  );
}
