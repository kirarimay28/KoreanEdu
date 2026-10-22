// Security: Firebase Storage rules should restrict reads to authenticated users.
// Set rules: allow read, write: if request.auth != null;
// Download URLs from getDownloadURL() require auth token in production.
import { useState, useEffect, useRef, useCallback } from 'react';
import type { User, VideoLecture, VideoMemo } from '../../types';
import { isPrivileged } from '../../types';
import {
  subscribeVideoLectures, getVideoLectures,
  createVideoLecture, updateVideoLecture, deleteVideoLecture,
  uploadVideoFile,
  saveVideoProgress, loadVideoProgress,
  subscribeVideoMemos, getVideoMemos,
  createVideoMemo, updateVideoMemo, deleteVideoMemo,
} from '../../store';
import { getDownloadURL, ref as storageRef } from 'firebase/storage';
import { storage } from '../../firebase';
import {
  Play, Plus, Trash2, Edit2, ArrowLeft, Check,
  ExternalLink, Clock, MessageSquare, Share2, Lock,
} from 'lucide-react';

interface Props { currentUser: User }

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

async function generateThumbnail(file: File): Promise<string | undefined> {
  return new Promise(resolve => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = URL.createObjectURL(file);
    video.onloadeddata = () => { video.currentTime = 5; };
    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 160; canvas.height = 90;
      canvas.getContext('2d')?.drawImage(video, 0, 0, 160, 90);
      URL.revokeObjectURL(video.src);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    video.onerror = () => resolve(undefined);
    setTimeout(() => resolve(undefined), 5000);
  });
}

// ── Upload / link form ────────────────────────────────────────
function UploadForm({
  currentUser, onDone, onCancel, editing,
}: {
  currentUser: User;
  onDone: () => void;
  onCancel: () => void;
  editing?: VideoLecture;
}) {
  const [tab, setTab] = useState<'file' | 'link'>(editing?.linkUrl ? 'link' : 'file');
  const [title, setTitle] = useState(editing?.title ?? '');
  const [week, setWeek] = useState(editing?.week ?? 1);
  const [classDate, setClassDate] = useState(editing?.classDate ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [linkUrl, setLinkUrl] = useState(editing?.linkUrl ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [sizeError, setSizeError] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setSizeError('');
    if (f && f.size > 1_073_741_824) {
      setSizeError('파일이 너무 커요 (최대 1GB)');
      setFile(null);
      e.target.value = '';
      return;
    }
    setFile(f);
  }

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        // Edit: only metadata, not re-upload
        await updateVideoLecture({
          ...editing,
          title: title.trim(),
          week,
          classDate: classDate || undefined,
          description: description.trim() || undefined,
          linkUrl: tab === 'link' ? linkUrl.trim() : editing.linkUrl,
        });
      } else {
        const id = crypto.randomUUID();
        if (tab === 'file') {
          if (!file) return;
          setProgress(0);
          const [thumbnail, { storagePath }] = await Promise.all([
            generateThumbnail(file),
            uploadVideoFile(file, id, pct => setProgress(pct)),
          ]);
          await createVideoLecture({
            id,
            title: title.trim(),
            week,
            classDate: classDate || undefined,
            description: description.trim() || undefined,
            uploadedBy: currentUser.id,
            uploadedByName: currentUser.username,
            createdAt: new Date().toISOString(),
            storagePath,
            thumbnailUrl: thumbnail,
          });
        } else {
          if (!linkUrl.trim().startsWith('http')) return;
          await createVideoLecture({
            id,
            title: title.trim(),
            week,
            classDate: classDate || undefined,
            description: description.trim() || undefined,
            uploadedBy: currentUser.id,
            uploadedByName: currentUser.username,
            createdAt: new Date().toISOString(),
            linkUrl: linkUrl.trim(),
          });
        }
      }
      onDone();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
      setProgress(null);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3 mb-4">
      <p className="text-sm font-bold text-gray-700">{editing ? '영상 수정' : '강의 영상 추가'}</p>

      <input
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400"
        placeholder="제목 *"
        value={title}
        onChange={e => setTitle(e.target.value)}
      />

      <div className="flex gap-2">
        <div className="flex-1">
          <p className="text-[11px] text-gray-400 mb-1">주차 *</p>
          <select
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400"
            value={week}
            onChange={e => setWeek(Number(e.target.value))}
          >
            {Array.from({ length: 16 }, (_, i) => i + 1).map(w => (
              <option key={w} value={w}>{w}주차</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <p className="text-[11px] text-gray-400 mb-1">수업 날짜</p>
          <input
            type="date"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400"
            value={classDate}
            onChange={e => setClassDate(e.target.value)}
          />
        </div>
      </div>

      <textarea
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400 resize-none"
        rows={2}
        placeholder="설명 (선택)"
        value={description}
        onChange={e => setDescription(e.target.value)}
      />

      {!editing && (
        <>
          <div className="flex bg-gray-100 p-0.5 rounded-xl">
            <button
              onClick={() => setTab('file')}
              className={`flex-1 py-1.5 text-xs rounded-lg font-medium transition ${tab === 'file' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500'}`}
            >파일 업로드</button>
            <button
              onClick={() => setTab('link')}
              className={`flex-1 py-1.5 text-xs rounded-lg font-medium transition ${tab === 'link' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500'}`}
            >링크 추가</button>
          </div>

          {tab === 'file' && (
            <div className="space-y-2">
              <input
                type="file"
                accept="video/mp4,video/quicktime,video/webm"
                onChange={handleFile}
                className="text-sm text-gray-600 w-full"
              />
              {sizeError && <p className="text-xs text-red-500">{sizeError}</p>}
              {progress !== null && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>업로드 중...</span><span>{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-primary-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'link' && (
            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400"
              placeholder="https://..."
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
            />
          )}
        </>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={saving || !title.trim() || (tab === 'file' && !file && !editing) || (tab === 'link' && !linkUrl.trim().startsWith('http') && !editing)}
          className="flex-1 bg-primary-500 text-white py-2 rounded-xl text-sm font-bold disabled:opacity-40"
        >
          {saving ? '저장 중...' : '저장'}
        </button>
        <button onClick={onCancel} className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-xl text-sm font-bold">
          취소
        </button>
      </div>
    </div>
  );
}

// ── Memo form ─────────────────────────────────────────────────
function MemoForm({
  onSave, onCancel,
}: { onSave: (text: string, shared: boolean) => void; onCancel: () => void }) {
  const [text, setText] = useState('');
  const [shared, setShared] = useState(false);
  return (
    <div className="bg-gray-50 rounded-xl p-3 space-y-2 border border-gray-200">
      <textarea
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400 resize-none bg-white"
        rows={2}
        placeholder="메모 내용"
        value={text}
        onChange={e => setText(e.target.value)}
        autoFocus
      />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
          <input type="checkbox" checked={shared} onChange={e => setShared(e.target.checked)} className="rounded" />
          스터디 공유
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => text.trim() && onSave(text.trim(), shared)}
            disabled={!text.trim()}
            className="px-3 py-1 bg-primary-500 text-white rounded-lg text-xs font-bold disabled:opacity-40"
          >저장</button>
          <button onClick={onCancel} className="px-3 py-1 bg-gray-200 text-gray-600 rounded-lg text-xs">취소</button>
        </div>
      </div>
    </div>
  );
}

// ── Video Player view ─────────────────────────────────────────
function VideoPlayer({
  lecture, currentUser, onBack,
}: { lecture: VideoLecture; currentUser: User; onBack: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1);
  const [completed, setCompleted] = useState(false);
  const [showMemoForm, setShowMemoForm] = useState(false);
  const [memos, setMemos] = useState<VideoMemo[]>([]);
  const [tick, setTick] = useState(0);
  const lastSaveRef = useRef(0);

  const isYoutube = lecture.linkUrl &&
    (lecture.linkUrl.includes('youtube.com') || lecture.linkUrl.includes('youtu.be'));

  // Load download URL for file-based videos
  useEffect(() => {
    if (!lecture.storagePath) return;
    getDownloadURL(storageRef(storage, lecture.storagePath))
      .then(url => setVideoSrc(url))
      .catch(e => console.error('getDownloadURL', e));
  }, [lecture.storagePath]);

  // Load progress
  useEffect(() => {
    loadVideoProgress(currentUser.id, lecture.id).then(p => {
      if (!p) return;
      setCompleted(p.completed);
      const v = videoRef.current;
      if (v && p.positionSeconds > 0) {
        const seek = () => { v.currentTime = p.positionSeconds; };
        if (v.readyState >= 1) seek();
        else v.addEventListener('loadedmetadata', seek, { once: true });
      }
    });
  }, [currentUser.id, lecture.id]);

  // Subscribe memos
  useEffect(() => {
    const unsub = subscribeVideoMemos(lecture.id, () => {
      setMemos(getVideoMemos(lecture.id, currentUser.id));
      setTick(t => t + 1);
    });
    return unsub;
  }, [lecture.id, currentUser.id]);

  // Refresh memos when tick changes
  useEffect(() => {
    setMemos(getVideoMemos(lecture.id, currentUser.id));
  }, [tick, lecture.id, currentUser.id]);

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const now = Date.now();
    if (now - lastSaveRef.current < 5000) return;
    lastSaveRef.current = now;
    const isComplete = v.duration > 0 && v.currentTime / v.duration >= 0.9;
    saveVideoProgress({
      userId: currentUser.id,
      videoId: lecture.id,
      positionSeconds: v.currentTime,
      completed: isComplete || completed,
      updatedAt: new Date().toISOString(),
    });
    if (isComplete && !completed) setCompleted(true);
  }, [currentUser.id, lecture.id, completed]);

  function handleSpeedChange(s: number) {
    setSpeed(s);
    if (videoRef.current) videoRef.current.playbackRate = s;
  }

  function toggleCompleted() {
    const next = !completed;
    setCompleted(next);
    const v = videoRef.current;
    saveVideoProgress({
      userId: currentUser.id,
      videoId: lecture.id,
      positionSeconds: v?.currentTime ?? 0,
      completed: next,
      updatedAt: new Date().toISOString(),
    });
  }

  function seekTo(seconds: number) {
    const v = videoRef.current;
    if (v) { v.currentTime = seconds; v.play(); }
  }

  async function handleMemoSave(text: string, shared: boolean) {
    const v = videoRef.current;
    const pos = v?.currentTime ?? 0;
    await createVideoMemo({
      id: crypto.randomUUID(),
      videoId: lecture.id,
      userId: currentUser.id,
      username: currentUser.username,
      positionSeconds: pos,
      text,
      shared,
      createdAt: new Date().toISOString(),
    });
    setShowMemoForm(false);
  }

  async function handleMemoToggleShare(memo: VideoMemo) {
    await updateVideoMemo({ ...memo, shared: !memo.shared });
  }

  async function handleMemoDelete(id: string) {
    if (!window.confirm('메모를 삭제할까요?')) return;
    await deleteVideoMemo(id);
  }

  return (
    <div className="space-y-3">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-primary-600 font-medium">
        <ArrowLeft className="w-4 h-4" /> 목록
      </button>

      <div>
        <p className="font-bold text-gray-800">{lecture.title}</p>
        <p className="text-xs text-gray-400">{lecture.week}주차 · {lecture.uploadedByName}</p>
        {lecture.description && <p className="text-xs text-gray-500 mt-1">{lecture.description}</p>}
      </div>

      {/* Player */}
      {lecture.storagePath && (
        <div className="space-y-2">
          {!videoSrc ? (
            <div className="w-full aspect-video bg-gray-100 rounded-xl flex items-center justify-center">
              <p className="text-xs text-gray-400">영상 불러오는 중...</p>
            </div>
          ) : (
            <video
              ref={videoRef}
              src={videoSrc}
              controls
              className="w-full rounded-xl bg-black"
              onTimeUpdate={handleTimeUpdate}
            />
          )}

          {/* Speed */}
          <div className="flex gap-1 flex-wrap">
            {[0.75, 1, 1.25, 1.5, 2].map(s => (
              <button
                key={s}
                onClick={() => handleSpeedChange(s)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${speed === s ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'}`}
              >{s}×</button>
            ))}
            <button
              onClick={toggleCompleted}
              className={`ml-auto flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition ${completed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
            >
              <Check className="w-3 h-3" /> 봤어요
            </button>
          </div>
        </div>
      )}

      {lecture.linkUrl && isYoutube && (
        <div className="space-y-2">
          <div className="w-full aspect-video rounded-xl overflow-hidden">
            <iframe
              src={lecture.linkUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'www.youtube.com/embed/')}
              className="w-full h-full"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
          <button
            onClick={toggleCompleted}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition ${completed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
          >
            <Check className="w-3 h-3" /> 봤어요
          </button>
        </div>
      )}

      {lecture.linkUrl && !isYoutube && (
        <div className="bg-gray-50 rounded-xl p-4 text-center space-y-2">
          <p className="text-xs text-gray-400">앱 안에서 열 수 없어 외부 링크로 연결돼요</p>
          <a
            href={lecture.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 bg-primary-500 text-white px-4 py-2 rounded-xl text-sm font-bold"
          >
            <ExternalLink className="w-3.5 h-3.5" /> 외부에서 열기
          </a>
        </div>
      )}

      {/* Memos */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-gray-600 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" />타임스탬프 메모
          </p>
          <button
            onClick={() => setShowMemoForm(v => !v)}
            className="flex items-center gap-1 px-2.5 py-1 bg-primary-50 text-primary-600 rounded-lg text-xs font-bold"
          >
            <Plus className="w-3 h-3" />메모
          </button>
        </div>

        {showMemoForm && (
          <MemoForm onSave={handleMemoSave} onCancel={() => setShowMemoForm(false)} />
        )}

        {memos.length === 0 && !showMemoForm && (
          <p className="text-xs text-gray-300 text-center py-2">메모가 없어요</p>
        )}

        {memos.map(m => (
          <div
            key={m.id}
            className="flex items-start gap-2 bg-gray-50 rounded-xl p-3 cursor-pointer hover:bg-gray-100 transition"
            onClick={() => seekTo(m.positionSeconds)}
          >
            <span className="text-[11px] font-mono text-primary-500 shrink-0 mt-0.5">{fmtTime(m.positionSeconds)}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-700 break-words">{m.text}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{m.username}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
              {m.userId === currentUser.id && (
                <button
                  onClick={() => handleMemoToggleShare(m)}
                  className={`p-1 rounded-lg text-[10px] flex items-center gap-0.5 ${m.shared ? 'text-blue-500' : 'text-gray-400'}`}
                  title={m.shared ? '공유 중' : '나만 보기'}
                >
                  {m.shared ? <Share2 className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                </button>
              )}
              {(m.userId === currentUser.id || isPrivileged(currentUser)) && (
                <button
                  onClick={() => handleMemoDelete(m.id)}
                  className="p-1 rounded-lg text-gray-300 hover:text-red-400"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main MedievalVideoTab ─────────────────────────────────────
export default function MedievalVideoTab({ currentUser }: Props) {
  const [lectures, setLectures] = useState<VideoLecture[]>([]);
  const [tick, setTick] = useState(0);
  const [selectedVideo, setSelectedVideo] = useState<VideoLecture | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingLecture, setEditingLecture] = useState<VideoLecture | undefined>();

  useEffect(() => {
    const unsub = subscribeVideoLectures(() => {
      setLectures(getVideoLectures());
      setTick(t => t + 1);
    });
    return unsub;
  }, []);

  useEffect(() => {
    setLectures(getVideoLectures());
  }, [tick]);

  async function handleDelete(lec: VideoLecture) {
    if (!window.confirm(`"${lec.title}" 영상을 삭제할까요?`)) return;
    await deleteVideoLecture(lec.id, lec.storagePath);
  }

  function handleEdit(lec: VideoLecture) {
    setEditingLecture(lec);
    setShowForm(true);
  }

  function handleFormDone() {
    setShowForm(false);
    setEditingLecture(undefined);
  }

  if (selectedVideo) {
    return (
      <VideoPlayer
        lecture={selectedVideo}
        currentUser={currentUser}
        onBack={() => setSelectedVideo(null)}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
          <Play className="w-4 h-4 text-primary-500" />강의 영상
        </p>
        <button
          onClick={() => { setEditingLecture(undefined); setShowForm(v => !v); }}
          className="flex items-center gap-1 px-3 py-1.5 bg-primary-500 text-white rounded-xl text-xs font-bold"
        >
          <Plus className="w-3.5 h-3.5" />추가
        </button>
      </div>

      {showForm && (
        <UploadForm
          currentUser={currentUser}
          editing={editingLecture}
          onDone={handleFormDone}
          onCancel={handleFormDone}
        />
      )}

      {lectures.length === 0 && !showForm && (
        <div className="text-center py-10">
          <Play className="w-10 h-10 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-300">등록된 강의 영상이 없어요</p>
        </div>
      )}

      <div className="space-y-2">
        {lectures.map(lec => (
          <div
            key={lec.id}
            className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-3 cursor-pointer hover:border-primary-200 transition"
            onClick={() => setSelectedVideo(lec)}
          >
            {/* Thumbnail */}
            <div className="w-20 h-12 rounded-xl overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
              {lec.thumbnailUrl ? (
                <img src={lec.thumbnailUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <Play className="w-5 h-5 text-gray-300" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-800 truncate">{lec.title}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-[10px] bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full font-bold">{lec.week}주차</span>
                {lec.durationSeconds && (
                  <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" />{fmtTime(lec.durationSeconds)}
                  </span>
                )}
                <span className="text-[10px] text-gray-400">{lec.uploadedByName}</span>
              </div>
            </div>

            {/* Actions */}
            {(currentUser.id === lec.uploadedBy || isPrivileged(currentUser)) && (
              <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => handleEdit(lec)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-primary-500 hover:bg-primary-50"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(lec)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
