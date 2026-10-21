import { useState, useEffect, useRef } from 'react';
import type { User, ExamPeriod, ExamDayPlan, Weekday, ExamStudyCheckAssignment, ExamStudyResource, ExamMaterialRequest, ExamResourceCategory, ExamPlanSubject, ExamPlanCategory, ExamPlanCheckMark, ExamPlanItem } from '../../types';
import { isPrivileged } from '../../types';
import {
  subscribeExamPeriodData, getExamPeriod, setExamPeriod, clearExamPeriod,
  getExamSharedSchedule, setExamSharedSchedule,
  getExamStudyCheckAssignments, setExamStudyCheckAssignments,
  getExamStudyResources, saveExamStudyResource, deleteExamStudyResource, uploadExamStudyResourcePdf,
  getExamMaterialRequests, saveExamMaterialRequest, uploadExamRequestRefPdf,
  getExamPlanEntries, saveExamPlanEntry, getExamPlanCheckResults, saveExamPlanCheckResult,
  getAllUserIds, getPrivilegedUserIds, deleteExamStudyResourceFile, getUsers,
} from '../../store';
import { sendPush } from '../../notifications';
import {
  CalendarDays, Trash2, Check, Users, Clock, BookOpen, Upload, FileText,
  MessageSquarePlus, ExternalLink, CheckCircle2, ArrowRight,
} from 'lucide-react';
import StudyPlannerTab from './StudyPlannerTab';
import { getKSTToday } from '../common/DateNavigator';

interface Props { currentUser: User; }

const DAYS: Weekday[] = ['월', '화', '수', '목', '금', '토', '일'];
const CATEGORIES: ExamResourceCategory[] = ['자습서', '평가문제지', '단권화', '기타'];
const PROBLEM_BANK_URL = 'https://claude.ai/artifact/D4Szqu6j3srT7EumUPrtPS';

function calcHours(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  return Math.max(0, Math.round(diff / 60 * 10) / 10);
}

function isActive(period: ExamPeriod | null): boolean {
  if (!period) return false;
  const today = getKSTToday();
  return today >= period.startDate && today <= period.endDate;
}

function ProgressBar({ progress }: { progress: number }) {
  if (progress <= 0 || progress >= 100) return null;
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden mt-2">
      <div
        className="h-2 rounded-full transition-all duration-200 theme-gradient"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

/* ── 방장: 기간 설정 ── */
function AdminPeriodForm({ onSave }: { onSave: (start: string, end: string) => void }) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [error, setError] = useState('');

  function handleSave() {
    if (!start || !end) { setError('시작일과 마감일을 모두 입력해 주세요.'); return; }
    if (end < start) { setError('마감일이 시작일보다 빠를 수 없습니다.'); return; }
    onSave(start, end);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
      <p className="text-xs font-bold text-gray-600">시험기간 설정</p>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-[11px] text-gray-400 font-bold mb-1 block">시작일</label>
          <input
            type="date" value={start} onChange={e => setStart(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400"
          />
        </div>
        <div className="flex-1">
          <label className="text-[11px] text-gray-400 font-bold mb-1 block">마감일</label>
          <input
            type="date" value={end} onChange={e => setEnd(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400"
          />
        </div>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        onClick={handleSave}
        className="w-full py-3 rounded-xl text-sm font-bold text-white transition theme-gradient"
      >
        시험기간 설정
      </button>
    </div>
  );
}

/* ── 탭1: 계획표 ── */
function ScheduleTab({
  currentUser,
  isAdmin,
  onSaved,
}: { currentUser: User; isAdmin: boolean; onSaved: () => void }) {
  const sharedSchedule = getExamSharedSchedule();
  const assignments = getExamStudyCheckAssignments();
  const allUsers = getUsers();

  /* 공유 일정 편집 상태 */
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [days, setDays] = useState<ExamDayPlan[]>(() =>
    DAYS.map(day => {
      const found = sharedSchedule?.days.find(d => d.day === day);
      return found ?? { day, willCome: false, startTime: '09:00', endTime: '18:00' };
    })
  );
  const [scheduleSaved, setScheduleSaved] = useState(false);

  /* 담당 배정 편집 상태 (방장용) */
  const [editingAssign, setEditingAssign] = useState(false);
  const [assignMap, setAssignMap] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    assignments.forEach(a => { m[a.checkerId] = a.checkeeId; });
    return m;
  });

  function toggleCome(i: number) {
    setDays(prev => prev.map((d, idx) => idx === i ? { ...d, willCome: !d.willCome } : d));
    setScheduleSaved(false);
  }
  function updateTime(i: number, field: 'startTime' | 'endTime', val: string) {
    setDays(prev => prev.map((d, idx) => idx === i ? { ...d, [field]: val } : d));
    setScheduleSaved(false);
  }
  function handleSaveSchedule() {
    setExamSharedSchedule({
      days,
      updatedAt: new Date().toISOString(),
      updatedById: currentUser.id,
      updatedByName: currentUser.username,
    });
    setScheduleSaved(true);
    setEditingSchedule(false);
    onSaved();
  }

  function handleSaveAssignments() {
    const list: ExamStudyCheckAssignment[] = Object.entries(assignMap)
      .filter(([, checkeeId]) => checkeeId)
      .map(([checkerId, checkeeId]) => {
        const checker = allUsers.find(u => u.id === checkerId)!;
        const checkee = allUsers.find(u => u.id === checkeeId)!;
        return {
          checkerId, checkerName: checker?.username ?? '',
          checkeeId, checkeeName: checkee?.username ?? '',
        };
      });
    setExamStudyCheckAssignments(list);
    setEditingAssign(false);
    onSaved();
  }

  /* 내 담당 정보 */
  const myCheck = assignments.find(a => a.checkerId === currentUser.id);
  const checkingMe = assignments.find(a => a.checkeeId === currentUser.id);

  const totalHours = days.filter(d => d.willCome).reduce((sum, d) => sum + calcHours(d.startTime, d.endTime), 0);

  return (
    <div className="space-y-4">
      {/* ── 스터디 일정 ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-gray-600 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> 스터디 일정
          </p>
          {isAdmin && !editingSchedule && (
            <button
              onClick={() => { setEditingSchedule(true); setScheduleSaved(false); }}
              className="text-xs text-primary-500 font-bold"
            >
              {sharedSchedule ? '수정' : '설정'}
            </button>
          )}
        </div>

        {!sharedSchedule && !editingSchedule ? (
          <p className="text-sm text-gray-300 text-center py-4">
            {isAdmin ? '스터디 일정을 설정해 주세요' : '방장이 아직 일정을 설정하지 않았습니다'}
          </p>
        ) : editingSchedule ? (
          <>
            <p className="text-xs text-gray-400">스터디 진행 요일과 시간을 선택하세요</p>
            {days.map((d, i) => (
              <div key={d.day} className={`rounded-xl border transition ${d.willCome ? 'border-primary-200 bg-primary-50/30' : 'border-gray-100 bg-gray-50'}`}>
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <button
                    onClick={() => toggleCome(i)}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm transition shrink-0 ${d.willCome ? 'text-white theme-gradient' : 'text-gray-400 bg-white border border-gray-200'}`}
                  >
                    {d.day}
                  </button>
                  {d.willCome ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <input
                        type="time" value={d.startTime}
                        onChange={e => updateTime(i, 'startTime', e.target.value)}
                        className="flex-1 min-w-0 border border-primary-200 rounded-lg px-2 py-1 text-sm text-gray-700 focus:outline-none focus:border-primary-400 bg-white"
                      />
                      <span className="text-xs text-gray-400 shrink-0">~</span>
                      <input
                        type="time" value={d.endTime}
                        onChange={e => updateTime(i, 'endTime', e.target.value)}
                        className="flex-1 min-w-0 border border-primary-200 rounded-lg px-2 py-1 text-sm text-gray-700 focus:outline-none focus:border-primary-400 bg-white"
                      />
                      <span className="text-xs text-primary-500 font-bold shrink-0">{calcHours(d.startTime, d.endTime)}h</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-300">탭하면 시간 설정</span>
                  )}
                </div>
              </div>
            ))}
            <div className="flex gap-2">
              <button onClick={() => setEditingSchedule(false)} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-gray-500 border border-gray-200">취소</button>
              <button
                onClick={handleSaveSchedule}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white theme-gradient"
              >
                {scheduleSaved ? <span className="flex items-center justify-center gap-1"><Check className="w-4 h-4" /> 저장됨</span> : '저장'}
              </button>
            </div>
          </>
        ) : sharedSchedule && (
          <>
            <div className="grid grid-cols-7 gap-1">
              {DAYS.map(day => {
                const plan = sharedSchedule.days.find(d => d.day === day);
                const active = plan?.willCome;
                return (
                  <div key={day} className={`rounded-xl p-2 text-center ${active ? 'bg-primary-50' : 'bg-gray-50'}`}>
                    <p className={`text-xs font-bold ${active ? 'text-primary-600' : 'text-gray-300'}`}>{day}</p>
                    {active && plan ? (
                      <p className="text-[9px] text-primary-500 mt-1 leading-tight">
                        {plan.startTime}<br />~{plan.endTime}
                      </p>
                    ) : (
                      <p className="text-[9px] text-gray-200 mt-1">—</p>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-gray-400 text-right">
              주 {totalHours}시간 · {sharedSchedule.updatedByName} 설정
            </p>
          </>
        )}
      </div>

      {/* ── 공부 체크 담당 ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-gray-600 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> 공부 체크 담당
          </p>
          {isAdmin && !editingAssign && (
            <button onClick={() => setEditingAssign(true)} className="text-xs text-primary-500 font-bold">
              {assignments.length > 0 ? '수정' : '배정'}
            </button>
          )}
        </div>

        {editingAssign ? (
          <>
            <p className="text-xs text-gray-400">각 멤버가 체크할 대상을 선택하세요</p>
            <div className="space-y-2">
              {allUsers.map(u => (
                <div key={u.id} className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-700 w-20 shrink-0 truncate">{u.username}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                  <select
                    value={assignMap[u.id] ?? ''}
                    onChange={e => setAssignMap(prev => ({ ...prev, [u.id]: e.target.value }))}
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-primary-400"
                  >
                    <option value="">미지정</option>
                    {allUsers.filter(other => other.id !== u.id).map(other => (
                      <option key={other.id} value={other.id}>{other.username}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditingAssign(false)} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-gray-500 border border-gray-200">취소</button>
              <button
                onClick={handleSaveAssignments}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white theme-gradient"
              >
                저장
              </button>
            </div>
          </>
        ) : assignments.length === 0 ? (
          <p className="text-sm text-gray-300 text-center py-4">
            {isAdmin ? '담당자를 배정해 주세요' : '방장이 아직 담당을 배정하지 않았습니다'}
          </p>
        ) : (
          <>
            {/* 내 담당 하이라이트 */}
            {(myCheck || checkingMe) && (
              <div className="bg-primary-50 rounded-xl p-3 space-y-1.5">
                {myCheck && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-bold text-primary-700">나</span>
                    <ArrowRight className="w-3.5 h-3.5 text-primary-400" />
                    <span className="font-semibold text-primary-600">{myCheck.checkeeName}</span>
                    <span className="text-xs text-primary-400 ml-auto">내가 체크</span>
                  </div>
                )}
                {checkingMe && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-bold text-gray-500">{checkingMe.checkerName}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-300" />
                    <span className="font-semibold text-gray-600">나</span>
                    <span className="text-xs text-gray-400 ml-auto">나를 체크</span>
                  </div>
                )}
              </div>
            )}
            {/* 전체 목록 */}
            <div className="space-y-1.5">
              {assignments.map(a => (
                <div key={a.checkerId} className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-gray-50">
                  <span className="text-sm font-semibold text-gray-700 w-20 truncate shrink-0">{a.checkerName}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                  <span className="text-sm text-gray-600">{a.checkeeName}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── 탭2: 자료 도서관 ── */
function ResourceLibraryTab({ currentUser, isAdmin }: { currentUser: User; isAdmin: boolean }) {
  const resources = getExamStudyResources();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExamResourceCategory>('자습서');
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload() {
    if (!title.trim() || !file) return;
    setUploading(true);
    setProgress(0);
    try {
      const id = crypto.randomUUID();
      const { url, storagePath } = await uploadExamStudyResourcePdf(id, file, pct => setProgress(pct));
      saveExamStudyResource({
        id, title: title.trim(), category, fileUrl: url, storagePath,
        uploadedById: currentUser.id,
        uploadedByName: currentUser.username,
        createdAt: new Date().toISOString(),
      });
      setTitle(''); setCategory('자습서'); setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  async function handleDelete(r: ExamStudyResource) {
    if (!confirm(`"${r.title}" 자료를 삭제하시겠습니까?`)) return;
    await deleteExamStudyResourceFile(r.storagePath);
    deleteExamStudyResource(r.id);
  }

  const byCategory = CATEGORIES.map(cat => ({
    cat,
    items: resources.filter(r => r.category === cat),
  })).filter(g => g.items.length > 0);

  return (
    <div className="space-y-4">
      {/* 업로드 폼 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <p className="text-xs font-bold text-gray-600">자료 업로드</p>
        <input
          type="text" placeholder="자료 제목" value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400"
        />
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${category === cat ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-500 border-gray-200'}`}
            >
              {cat}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 border border-dashed border-gray-200 rounded-xl px-3 py-2.5 cursor-pointer hover:border-primary-300 transition">
          <Upload className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="text-sm text-gray-500 truncate">{file ? file.name : 'PDF 선택'}</span>
          <input ref={fileRef} type="file" accept=".pdf" className="hidden"
            onChange={e => setFile(e.target.files?.[0] ?? null)} />
        </label>
        {uploading && <ProgressBar progress={progress} />}
        <button
          onClick={handleUpload}
          disabled={uploading || !title.trim() || !file}
          className="w-full py-3 rounded-xl text-sm font-bold text-white transition disabled:opacity-50 theme-gradient"
        >
          {uploading ? `업로드 중… ${progress}%` : '업로드'}
        </button>
      </div>

      {/* 자료 목록 */}
      {resources.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-sm text-gray-300 font-semibold">업로드된 자료가 없습니다</p>
        </div>
      ) : (
        byCategory.map(({ cat, items }) => (
          <div key={cat} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
            <p className="text-xs font-bold text-gray-500 mb-2">{cat}</p>
            {items.map(r => (
              <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50">
                <FileText className="w-4 h-4 text-primary-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{r.title}</p>
                  <p className="text-[11px] text-gray-400">{r.uploadedByName}</p>
                </div>
                <a
                  href={r.fileUrl} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-primary-600 font-bold px-2.5 py-1 rounded-lg border border-primary-200 shrink-0"
                >
                  열기
                </a>
                {isAdmin && (
                  <button onClick={() => handleDelete(r)} className="text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}

/* ── 탭3: 자료 요청 ── */
function MaterialRequestTab({ currentUser, isAdmin }: { currentUser: User; isAdmin: boolean }) {
  const requests = getExamMaterialRequests();
  const [category, setCategory] = useState<ExamResourceCategory>('자습서');
  const [description, setDescription] = useState('');
  const [refFile, setRefFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const refFileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit() {
    if (!description.trim()) return;
    setSubmitting(true);
    setUploading(false);
    try {
      const id = crypto.randomUUID();
      let refPdfUrl: string | undefined;
      let refPdfPath: string | undefined;
      if (refFile) {
        setUploading(true);
        setProgress(0);
        const result = await uploadExamRequestRefPdf(id, refFile, pct => setProgress(pct));
        refPdfUrl = result.url;
        refPdfPath = result.storagePath;
        setUploading(false);
      }
      const req: ExamMaterialRequest = {
        id,
        requesterId: currentUser.id,
        requesterName: currentUser.username,
        category,
        description: description.trim(),
        refPdfUrl,
        refPdfPath,
        createdAt: new Date().toISOString(),
        completed: false,
      };
      saveExamMaterialRequest(req);
      sendPush({
        userIds: getPrivilegedUserIds().filter(id => id !== currentUser.id),
        title: '📥 자료 요청',
        body: `${currentUser.username}님이 [${category}] 자료를 요청했습니다.`,
      });
      setDescription(''); setCategory('자습서'); setRefFile(null);
      if (refFileRef.current) refFileRef.current.value = '';
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
      setProgress(0);
    }
  }

  async function handleComplete(req: ExamMaterialRequest) {
    const updated: ExamMaterialRequest = {
      ...req,
      completed: true,
      completedAt: new Date().toISOString(),
      completedById: currentUser.id,
    };
    saveExamMaterialRequest(updated);
    sendPush({
      userIds: [req.requesterId],
      title: '✅ 자료 제공 완료',
      body: `요청하신 [${req.category}] 자료가 준비되었습니다.`,
    });
  }

  const pending = requests.filter(r => !r.completed);
  const done = requests.filter(r => r.completed);

  return (
    <div className="space-y-4">
      {/* 요청 폼 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <p className="text-xs font-bold text-gray-600">자료 요청</p>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${category === cat ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-500 border-gray-200'}`}
            >
              {cat}
            </button>
          ))}
        </div>
        <textarea
          placeholder="어떤 자료가 필요한지 설명해 주세요"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400 resize-none"
        />
        <label className="flex items-center gap-2 border border-dashed border-gray-200 rounded-xl px-3 py-2 cursor-pointer hover:border-primary-300 transition">
          <Upload className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="text-sm text-gray-500 truncate">{refFile ? refFile.name : '참고용 PDF (선택)'}</span>
          <input ref={refFileRef} type="file" accept=".pdf" className="hidden"
            onChange={e => setRefFile(e.target.files?.[0] ?? null)} />
        </label>
        {uploading && <ProgressBar progress={progress} />}
        <button
          onClick={handleSubmit}
          disabled={submitting || !description.trim()}
          className="w-full py-3 rounded-xl text-sm font-bold text-white transition disabled:opacity-50 flex items-center justify-center gap-2 theme-gradient"
        >
          <MessageSquarePlus className="w-4 h-4" />
          {submitting ? '요청 중…' : '요청 올리기'}
        </button>
      </div>

      {/* 대기 중 요청 */}
      {pending.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-500">대기 중 ({pending.length})</p>
          {pending.map(r => (
            <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-bold text-primary-600 bg-primary-50 rounded-full px-2 py-0.5">{r.category}</span>
                    <span className="text-[11px] text-gray-400">{r.requesterName}</span>
                  </div>
                  <p className="text-sm text-gray-700">{r.description}</p>
                  {r.refPdfUrl && (
                    <a href={r.refPdfUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-primary-600 mt-1">
                      <FileText className="w-3 h-3" /> 참고 PDF
                    </a>
                  )}
                </div>
                {isAdmin && (
                  <button
                    onClick={() => handleComplete(r)}
                    className="shrink-0 flex items-center gap-1 text-xs font-bold text-green-600 border border-green-200 rounded-lg px-2.5 py-1 hover:bg-green-50 transition"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> 완료
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 완료된 요청 */}
      {done.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-400">완료된 요청 ({done.length})</p>
          {done.map(r => (
            <div key={r.id} className="bg-gray-50 rounded-2xl border border-gray-100 p-4 opacity-60">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{r.category}</span>
                <span className="text-[11px] text-gray-400">{r.requesterName}</span>
                <span className="ml-auto text-[11px] text-green-600 font-bold flex items-center gap-0.5">
                  <CheckCircle2 className="w-3 h-3" /> 완료
                </span>
              </div>
              <p className="text-sm text-gray-500">{r.description}</p>
            </div>
          ))}
        </div>
      )}

      {requests.length === 0 && (
        <div className="text-center py-10">
          <p className="text-sm text-gray-300 font-semibold">등록된 요청이 없습니다</p>
        </div>
      )}
    </div>
  );
}

/* ── 탭4: 문제 은행 ── */
function ProblemBankTab() {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center space-y-3">
        <BookOpen className="w-8 h-8 text-primary-400 mx-auto" />
        <p className="text-sm font-bold text-gray-700">중세국어 · 교육과정 문제 은행</p>
        <p className="text-xs text-gray-400">외부 문제 풀이 페이지로 이동합니다</p>
        <a
          href={PROBLEM_BANK_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3 rounded-xl text-sm font-bold text-white transition flex items-center justify-center gap-2 theme-gradient"
        >
          <ExternalLink className="w-4 h-4" /> 문제 은행 열기
        </a>
      </div>
    </div>
  );
}

/* ── 탭5: 플래너 ── */
const PLAN_SUBJECTS: ExamPlanSubject[] = ['이교론', '중세국어', '의미론', '교직', '기타'];
const PLAN_CATEGORIES: ExamPlanCategory[] = ['회독', '단권화', '문제풀이', '오답정리', '기타'];
const MARKS: ExamPlanCheckMark[] = ['O', '△', 'X'];
const MARK_STYLE: Record<ExamPlanCheckMark, string> = {
  'O': 'bg-green-100 text-green-700 border-green-300',
  '△': 'bg-amber-100 text-amber-700 border-amber-300',
  'X': 'bg-red-100 text-red-600 border-red-300',
};

function PlannerTab({ currentUser }: { currentUser: User }) {
  const today = getKSTToday();
  const [date, setDate] = useState(today);

  const entries = getExamPlanEntries();
  const checkResults = getExamPlanCheckResults();
  const assignments = getExamStudyCheckAssignments();

  /* 내가 체크해야 할 사람 */
  const myCheckAssignment = assignments.find(a => a.checkerId === currentUser.id);

  /* 오늘 내 계획 */
  const myEntryId = `${currentUser.id}_${date}`;
  const myEntry = entries.find(e => e.id === myEntryId);

  /* 항목 추가 폼 상태 */
  const [subject, setSubject] = useState<ExamPlanSubject>('이교론');
  const [category, setCategory] = useState<ExamPlanCategory>('회독');
  const [detail, setDetail] = useState('');
  const [draftItems, setDraftItems] = useState<ExamPlanItem[]>(() => myEntry?.items ?? []);
  const [planSaved, setPlanSaved] = useState(false);

  /* 날짜 바뀌면 항목 리셋 */
  useEffect(() => {
    const e = entries.find(en => en.id === `${currentUser.id}_${date}`);
    setDraftItems(e?.items ?? []);
    setPlanSaved(false);
  }, [date, entries.length]);

  function addItem() {
    if (!detail.trim()) return;
    const item: ExamPlanItem = { id: crypto.randomUUID(), subject, category, detail: detail.trim() };
    setDraftItems(prev => [...prev, item]);
    setDetail('');
    setPlanSaved(false);
  }
  function removeItem(id: string) {
    setDraftItems(prev => prev.filter(i => i.id !== id));
    setPlanSaved(false);
  }
  function savePlan() {
    saveExamPlanEntry({
      id: myEntryId,
      userId: currentUser.id,
      username: currentUser.username,
      date,
      items: draftItems,
      updatedAt: new Date().toISOString(),
    });
    setPlanSaved(true);
  }

  /* 담당 멤버 체크 */
  const checkeeEntry = myCheckAssignment
    ? entries.find(e => e.userId === myCheckAssignment.checkeeId && e.date === date)
    : null;
  const checkResultId = myCheckAssignment
    ? `${currentUser.id}_${myCheckAssignment.checkeeId}_${date}`
    : '';
  const myCheckResult = checkResults.find(r => r.id === checkResultId);
  const [marks, setMarks] = useState<Record<string, ExamPlanCheckMark>>(() => myCheckResult?.marks ?? {});

  useEffect(() => {
    const r = checkResults.find(r => r.id === checkResultId);
    setMarks(r?.marks ?? {});
  }, [checkResultId, checkResults.length]);

  function toggleMark(itemId: string, mark: ExamPlanCheckMark) {
    setMarks(prev => {
      const next = { ...prev };
      if (next[itemId] === mark) delete next[itemId];
      else next[itemId] = mark;
      return next;
    });
  }
  function saveCheck() {
    if (!myCheckAssignment) return;
    saveExamPlanCheckResult({
      id: checkResultId,
      checkerId: currentUser.id,
      checkeeId: myCheckAssignment.checkeeId,
      date,
      marks,
      updatedAt: new Date().toISOString(),
    });
  }

  return (
    <div className="space-y-4">
      {/* 날짜 선택 */}
      <div className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
        <CalendarDays className="w-4 h-4 text-primary-400 shrink-0" />
        <input
          type="date" value={date} onChange={e => setDate(e.target.value)}
          className="flex-1 text-sm font-semibold text-gray-700 focus:outline-none"
        />
      </div>

      {/* ── 내 공부 계획 ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <p className="text-xs font-bold text-gray-600">내 공부 계획</p>

        {/* 항목 추가 */}
        <div className="space-y-2">
          <div className="flex gap-1.5 flex-wrap">
            {PLAN_SUBJECTS.map(s => (
              <button key={s} onClick={() => setSubject(s)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition ${subject === s ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-500 border-gray-200'}`}>
                {s}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {PLAN_CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition ${category === c ? 'bg-gray-700 text-white border-gray-700' : 'bg-white text-gray-500 border-gray-200'}`}>
                {c}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text" placeholder="내용 입력 (예: 4단원 1회독)" value={detail}
              onChange={e => setDetail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addItem()}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400"
            />
            <button
              onClick={addItem} disabled={!detail.trim()}
              className="px-3 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40 shrink-0 theme-gradient"
            >
              추가
            </button>
          </div>
        </div>

        {/* 항목 목록 */}
        {draftItems.length === 0 ? (
          <p className="text-xs text-gray-300 text-center py-3">계획을 추가해 주세요</p>
        ) : (
          <div className="space-y-1.5">
            {draftItems.map(item => (
              <div key={item.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50">
                <span className="text-[10px] font-bold text-primary-600 bg-primary-50 rounded-full px-2 py-0.5 shrink-0">{item.subject}</span>
                <span className="text-[10px] font-bold text-gray-500 bg-gray-100 rounded-full px-2 py-0.5 shrink-0">{item.category}</span>
                <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{item.detail}</span>
                <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-400 shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={savePlan} disabled={draftItems.length === 0}
          className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 flex items-center justify-center gap-1.5 theme-gradient"
        >
          {planSaved ? <><Check className="w-4 h-4" /> 저장 완료</> : '계획 저장'}
        </button>
      </div>

      {/* ── 담당 멤버 체크 ── */}
      {myCheckAssignment && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-600">
              공부 체크 — <span className="text-primary-600">{myCheckAssignment.checkeeName}</span>
            </p>
            <span className="text-[11px] text-gray-400">O / △ / X</span>
          </div>

          {!checkeeEntry || checkeeEntry.items.length === 0 ? (
            <p className="text-xs text-gray-300 text-center py-4">
              {myCheckAssignment.checkeeName}님이 아직 계획을 작성하지 않았습니다
            </p>
          ) : (
            <>
              <div className="space-y-2">
                {checkeeEntry.items.map(item => {
                  const mark = marks[item.id];
                  return (
                    <div key={item.id} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[10px] font-bold text-primary-600 bg-primary-50 rounded-full px-2 py-0.5 shrink-0">{item.subject}</span>
                          <span className="text-[10px] font-bold text-gray-500 bg-gray-100 rounded-full px-2 py-0.5 shrink-0">{item.category}</span>
                        </div>
                        <p className="text-sm text-gray-700 truncate">{item.detail}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {MARKS.map(m => (
                          <button
                            key={m}
                            onClick={() => toggleMark(item.id, m)}
                            className={`w-8 h-8 rounded-lg text-sm font-bold border transition ${mark === m ? MARK_STYLE[m] : 'bg-white text-gray-300 border-gray-200'}`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={saveCheck}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-white theme-gradient"
              >
                체크 저장
              </button>
            </>
          )}
        </div>
      )}

      {/* 내 체크 결과 (남이 나를 체크한 것) */}
      {(() => {
        const checkerAssignment = assignments.find(a => a.checkeeId === currentUser.id);
        if (!checkerAssignment) return null;
        const myResultId = `${checkerAssignment.checkerId}_${currentUser.id}_${date}`;
        const result = checkResults.find(r => r.id === myResultId);
        if (!result || Object.keys(result.marks).length === 0) return null;
        const myPlanEntry = entries.find(e => e.id === myEntryId);
        if (!myPlanEntry) return null;
        return (
          <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4 space-y-2">
            <p className="text-xs font-bold text-gray-500">
              {checkerAssignment.checkerName}님의 체크 결과
            </p>
            {myPlanEntry.items.map(item => {
              const mark = result.marks[item.id];
              if (!mark) return null;
              return (
                <div key={item.id} className="flex items-center gap-2">
                  <span className={`w-7 h-7 rounded-lg text-sm font-bold border flex items-center justify-center shrink-0 ${MARK_STYLE[mark]}`}>{mark}</span>
                  <span className="text-sm text-gray-600 truncate">{item.detail}</span>
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}

/* ── 메인 ── */
type TabKey = '학습 계획' | '계획표' | '자료 도서관' | '자료 요청' | '문제 은행' | '플래너';
const TABS: TabKey[] = ['학습 계획', '계획표', '자료 도서관', '자료 요청', '문제 은행', '플래너'];

export default function ExamPeriodTab({ currentUser }: Props) {
  const [, setTick] = useState(0);
  const [activeTab, setActiveTab] = useState<TabKey>('계획표');

  useEffect(() => {
    const unsub = subscribeExamPeriodData(() => setTick(t => t + 1));
    return unsub;
  }, []);

  const isAdmin = isPrivileged(currentUser);
  const period = getExamPeriod();
  const active = isActive(period);

  function handleSetPeriod(start: string, end: string) {
    setExamPeriod({
      startDate: start,
      endDate: end,
      createdById: currentUser.id,
      createdByName: currentUser.username,
      createdAt: new Date().toISOString(),
    });
    sendPush({ userIds: getAllUserIds().filter(id => id !== currentUser.id), title: '📅 시험기간', body: `시험기간이 ${start} ~ ${end}으로 설정되었습니다.` });
  }

  return (
    <div className="space-y-4">
      {/* ── 탭 바 (항상 표시) ── */}
      <div className="flex gap-1 overflow-x-auto pb-0.5 bg-gray-100 rounded-2xl p-1" style={{ scrollbarWidth: 'none' }}>
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 flex-1 py-2 rounded-xl text-[10px] font-bold transition min-w-0 ${activeTab === tab ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-400'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── 학습 계획 (항상 접근 가능) ── */}
      {activeTab === '학습 계획' && <StudyPlannerTab currentUser={currentUser} />}

      {/* ── 나머지 탭들 ── */}
      {activeTab !== '학습 계획' && (
        <>
          {/* 시험기간 배너 */}
          {period ? (
            <div className={`rounded-2xl p-4 ${active ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50 border border-gray-100'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarDays className={`w-4 h-4 ${active ? 'text-amber-500' : 'text-gray-400'}`} />
                  <div>
                    <p className={`text-sm font-bold ${active ? 'text-amber-700' : 'text-gray-600'}`}>
                      {active ? '시험기간 진행 중' : '설정된 시험기간'}
                    </p>
                    <p className={`text-xs mt-0.5 ${active ? 'text-amber-600' : 'text-gray-400'}`}>
                      {period.startDate} ~ {period.endDate}
                    </p>
                  </div>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => {
                      if (confirm('시험기간을 삭제하시겠습니까?')) {
                        clearExamPeriod();
                        sendPush({ userIds: getAllUserIds().filter(id => id !== currentUser.id), title: '📅 시험기간 종료', body: '시험기간이 종료되었습니다.' });
                      }
                    }}
                    className="text-xs text-red-400 border border-red-100 rounded-lg px-2.5 py-1 hover:bg-red-50 transition flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> 삭제
                  </button>
                )}
              </div>
              {active && (
                <div className="mt-3 pt-3 border-t border-amber-100">
                  <p className="text-xs text-amber-600">
                    🎓 시험기간 중 <strong>스터디 일지 · 과제 · 체크리스트 · 고어 시험</strong>은 의무 정지됩니다.
                  </p>
                </div>
              )}
            </div>
          ) : (
            isAdmin ? null : (
              <div className="text-center py-6">
                <p className="text-sm text-gray-300 font-semibold">설정된 시험기간이 없습니다</p>
              </div>
            )
          )}

          {/* 방장: 기간 설정 폼 */}
          {isAdmin && !period && <AdminPeriodForm onSave={handleSetPeriod} />}

          {/* 탭별 컨텐츠 */}
          {period && (
            <>
              {activeTab === '계획표' && (
                <ScheduleTab
                  currentUser={currentUser}
                  isAdmin={isAdmin}
                  onSaved={() => setTick(t => t + 1)}
                />
              )}
              {activeTab === '자료 도서관' && (
                <ResourceLibraryTab currentUser={currentUser} isAdmin={isAdmin} />
              )}
              {activeTab === '자료 요청' && (
                <MaterialRequestTab currentUser={currentUser} isAdmin={isAdmin} />
              )}
              {activeTab === '문제 은행' && <ProblemBankTab />}
              {activeTab === '플래너' && <PlannerTab currentUser={currentUser} />}
            </>
          )}
        </>
      )}
    </div>
  );
}
