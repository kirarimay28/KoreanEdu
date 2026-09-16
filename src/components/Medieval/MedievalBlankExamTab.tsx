import { useState, useRef } from 'react';
import type { User, MedievalBlankExam } from '../../types';
import { isPrivileged } from '../../types';
import { getMedievalBlankExams, saveMedievalBlankExam, deleteMedievalBlankExam } from '../../store';
import { Plus, Trash2, ArrowLeft, FileText, CheckCircle, XCircle, Upload } from 'lucide-react';

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string;

interface Props { currentUser: User; tick: number; }

/* ── 업로드 폼 ── */
function BlankExamForm({
  existingNums,
  onSave,
  onCancel,
}: {
  existingNums: number[];
  onSave: (exam: MedievalBlankExam) => void;
  onCancel: () => void;
}) {
  const [lessonNum, setLessonNum] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [blanks, setBlanks] = useState<string[]>(['']);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function addBlank() { setBlanks(prev => [...prev, '']); }
  function removeBlank(i: number) { setBlanks(prev => prev.filter((_, idx) => idx !== i)); }
  function updateBlank(i: number, val: string) { setBlanks(prev => prev.map((b, idx) => idx === i ? val : b)); }

  async function handleSave() {
    const num = Number(lessonNum);
    if (!num || num < 1) { setError('차시 번호를 입력해 주세요.'); return; }
    if (existingNums.includes(num)) { setError(`${num}차시 빈칸 시험이 이미 있습니다.`); return; }
    if (!pdfFile) { setError('PDF 파일을 선택해 주세요.'); return; }

    setUploading(true);
    setProgress(0);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', pdfFile);
      formData.append('upload_preset', UPLOAD_PRESET);
      formData.append('folder', 'korean-edu-library');

      const pdfUrl = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`);
        xhr.upload.onprogress = e => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status === 200) resolve(JSON.parse(xhr.responseText).secure_url);
          else reject(new Error(`업로드 실패 (${xhr.status})`));
        };
        xhr.onerror = () => reject(new Error('네트워크 오류'));
        xhr.send(formData);
      });

      const now = new Date().toISOString();
      onSave({
        id: crypto.randomUUID(),
        lessonNum: num,
        pdfUrl,
        pdfFileName: pdfFile.name,
        blanks: blanks.filter(b => b.trim()),
        createdAt: now,
        createdById: '',
        createdByName: '',
      });
    } catch (e) {
      setError('업로드 실패: ' + (e instanceof Error ? e.message : '알 수 없는 오류'));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div>
          <label className="text-[11px] text-gray-400 font-bold mb-1 block">차시 번호</label>
          <input
            type="number" min={1}
            value={lessonNum}
            onChange={e => setLessonNum(e.target.value)}
            placeholder="예: 1"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400"
          />
        </div>
        <div>
          <label className="text-[11px] text-gray-400 font-bold mb-1 block">빈칸 시험지 PDF</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition"
            >
              <Upload className="w-3.5 h-3.5" /> 파일 선택
            </button>
            <span className="text-xs text-gray-400 truncate">{pdfFile?.name ?? '선택된 파일 없음'}</span>
          </div>
          <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={e => setPdfFile(e.target.files?.[0] ?? null)} />
          {uploading && (
            <div className="mt-2">
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-200" style={{ width: `${progress}%`, background: 'linear-gradient(135deg,#f9a8c9 0%,#de4e80 100%)' }} />
              </div>
              <p className="text-[11px] text-gray-400 mt-1 text-center">{progress}%</p>
            </div>
          )}
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      {/* 빈칸 정답 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-bold text-gray-600">빈칸 정답 <span className="text-gray-400 font-normal">(순서대로)</span></p>
          <button onClick={addBlank} className="flex items-center gap-1 text-[11px] text-primary-600 border border-primary-200 rounded-lg px-2 py-1 hover:bg-primary-50 transition">
            <Plus className="w-3 h-3" /> 추가
          </button>
        </div>
        {blanks.map((b, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-bold w-6 shrink-0">({i + 1})</span>
            <input
              value={b}
              onChange={e => updateBlank(i, e.target.value)}
              placeholder={`빈칸 ${i + 1} 정답`}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary-400"
            />
            {blanks.length > 1 && (
              <button onClick={() => removeBlank(i)} className="text-gray-300 hover:text-red-400 transition">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-3 rounded-xl text-sm font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition">
          취소
        </button>
        <button
          onClick={handleSave}
          disabled={uploading}
          className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60 transition"
          style={{ background: 'linear-gradient(135deg,#f9a8c9 0%,#de4e80 100%)' }}
        >
          {uploading ? `업로드 중 ${progress}%` : '업로드'}
        </button>
      </div>
    </div>
  );
}

/* ── 시험 풀기 ── */
type ExamPhase = 'exam' | 'result';

function BlankExamView({ exam, onBack }: { exam: MedievalBlankExam; onBack: () => void }) {
  const [phase, setPhase] = useState<ExamPhase>('exam');
  const [answers, setAnswers] = useState<Record<number, string>>({});

  function updateAnswer(i: number, val: string) {
    setAnswers(prev => ({ ...prev, [i]: val }));
  }

  const results = exam.blanks.map((correct, i) => ({
    correct,
    user: (answers[i] ?? '').trim(),
    isCorrect: (answers[i] ?? '').trim() === correct.trim(),
  }));
  const score = results.filter(r => r.isCorrect).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition">
          <ArrowLeft className="w-3.5 h-3.5" /> 목록
        </button>
        <span className="text-xs font-bold text-gray-600">{exam.lessonNum}차시 빈칸 시험</span>
        <span className="text-xs text-gray-400">{exam.blanks.length}문항</span>
      </div>

      {/* PDF 뷰어 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-red-400" />
            <span className="text-xs text-gray-500 truncate">{exam.pdfFileName}</span>
          </div>
          <a href={exam.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-primary-500 underline">새 탭으로 열기</a>
        </div>
        <iframe src={exam.pdfUrl} title="빈칸 시험지" className="w-full" style={{ height: '55vh', border: 'none' }} />
      </div>

      {/* 빈칸 입력 */}
      {phase === 'exam' ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
          <p className="text-xs font-bold text-gray-600 mb-3">빈칸 채우기</p>
          {exam.blanks.map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-sm font-bold text-gray-400 w-8 shrink-0">({i + 1})</span>
              <input
                value={answers[i] ?? ''}
                onChange={e => updateAnswer(i, e.target.value)}
                placeholder={`빈칸 ${i + 1}`}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400"
              />
            </div>
          ))}
          <button
            onClick={() => setPhase('result')}
            className="w-full mt-3 py-3.5 rounded-2xl text-sm font-bold text-white transition"
            style={{ background: 'linear-gradient(135deg,#f9a8c9 0%,#de4e80 100%)' }}
          >
            채점하기
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <div className="text-center py-3">
            <p className="text-3xl font-black text-primary-600">{score} / {exam.blanks.length}</p>
            <p className="text-xs text-gray-400 mt-1">정답 수</p>
          </div>
          <div className="space-y-2">
            {results.map((r, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${r.isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
                {r.isCorrect
                  ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  : <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-gray-500 font-bold">({i + 1}) </span>
                  <span className="text-sm font-semibold text-gray-700">{r.user || '—'}</span>
                  {!r.isCorrect && <p className="text-xs text-red-500 mt-0.5">정답: {r.correct}</p>}
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => { setPhase('exam'); setAnswers({}); }}
            className="w-full py-3 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
          >
            다시 풀기
          </button>
        </div>
      )}
    </div>
  );
}

/* ── 메인 ── */
export default function MedievalBlankExamTab({ currentUser }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<MedievalBlankExam | null>(null);

  const isAdmin = isPrivileged(currentUser);
  const exams = getMedievalBlankExams();

  function handleSave(exam: MedievalBlankExam) {
    saveMedievalBlankExam({
      ...exam,
      createdById: currentUser.id,
      createdByName: currentUser.username,
    });
    setShowForm(false);
  }

  function handleDelete(id: string) {
    if (!confirm('이 시험을 삭제하시겠습니까?')) return;
    deleteMedievalBlankExam(id);
    setSelected(null);
  }

  if (selected) {
    return (
      <div>
        {isAdmin && (
          <div className="mb-3 flex justify-end">
            <button
              onClick={() => handleDelete(selected.id)}
              className="text-xs text-red-400 border border-red-100 rounded-lg px-2.5 py-1 hover:bg-red-50 transition flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" /> 삭제
            </button>
          </div>
        )}
        <BlankExamView exam={selected} onBack={() => setSelected(null)} />
      </div>
    );
  }

  if (showForm) {
    return (
      <BlankExamForm
        existingNums={exams.map(e => e.lessonNum)}
        onSave={handleSave}
        onCancel={() => setShowForm(false)}
      />
    );
  }

  return (
    <div className="space-y-3">
      {isAdmin && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 border-2 border-primary-200 text-primary-600 hover:bg-primary-50 transition"
        >
          <Plus className="w-4 h-4" /> 빈칸 시험 업로드
        </button>
      )}

      {exams.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm text-gray-300 font-semibold">아직 업로드된 시험지가 없습니다</p>
        </div>
      ) : (
        exams.map(exam => (
          <button
            key={exam.id}
            onClick={() => setSelected(exam)}
            className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5 flex items-center justify-between text-left hover:shadow-md transition"
          >
            <div>
              <p className="text-sm font-black text-gray-800">{exam.lessonNum}차시 빈칸 시험</p>
              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
                <FileText className="w-3 h-3" />
                {exam.pdfFileName} · {exam.blanks.length}문항
              </p>
            </div>
            <span className="text-[11px] text-primary-500 font-bold border border-primary-200 rounded-lg px-2 py-1">풀기</span>
          </button>
        ))
      )}
    </div>
  );
}
