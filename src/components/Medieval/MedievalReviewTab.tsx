import { useState } from 'react';
import type { User, MedievalLesson, MedievalSubjectiveQ, MedievalMCQ } from '../../types';
import { isPrivileged } from '../../types';
import { getMedievalLessons, saveMedievalLesson, deleteMedievalLesson } from '../../store';
import { Plus, Trash2, ChevronDown, ChevronUp, Edit2, ArrowLeft, Check } from 'lucide-react';

interface Props { currentUser: User; tick: number; }

const CIRCLE = ['①', '②', '③', '④', '⑤', '⑥'];

/* ── 기본 양식 ── */
function emptySubjQ(): MedievalSubjectiveQ { return { q: '', answer: '' }; }
function emptyMCQ(): MedievalMCQ { return { q: '', options: ['', '', '', '', ''], answer: 0 }; }

/* ── 업로드/수정 폼 ── */
function LessonForm({
  initial,
  existingNums,
  onSave,
  onCancel,
}: {
  initial?: MedievalLesson;
  existingNums: number[];
  onSave: (l: MedievalLesson) => void;
  onCancel: () => void;
}) {
  const [lessonNum, setLessonNum] = useState(initial?.lessonNum ?? '');
  const [date, setDate] = useState(initial?.date ?? '');
  const [subjQs, setSubjQs] = useState<MedievalSubjectiveQ[]>(
    initial?.subjectiveQuestions.length ? initial.subjectiveQuestions : [emptySubjQ(), emptySubjQ(), emptySubjQ()]
  );
  const [mcQs, setMcQs] = useState<MedievalMCQ[]>(
    initial?.mcQuestions.length ? initial.mcQuestions : Array.from({ length: 5 }, emptyMCQ)
  );
  const [error, setError] = useState('');

  function updateSubj(i: number, field: keyof MedievalSubjectiveQ, val: string) {
    setSubjQs(prev => prev.map((q, idx) => idx === i ? { ...q, [field]: val } : q));
  }
  function addSubj() { setSubjQs(prev => [...prev, emptySubjQ()]); }
  function removeSubj(i: number) { setSubjQs(prev => prev.filter((_, idx) => idx !== i)); }

  function updateMCQ(i: number, field: string, val: string | number) {
    setMcQs(prev => prev.map((q, idx) => {
      if (idx !== i) return q;
      if (field === 'q') return { ...q, q: val as string };
      if (field === 'answer') return { ...q, answer: val as number };
      if (field.startsWith('opt_')) {
        const optIdx = parseInt(field.split('_')[1]);
        const opts = [...q.options];
        opts[optIdx] = val as string;
        return { ...q, options: opts };
      }
      return q;
    }));
  }
  function addMCQ() { setMcQs(prev => [...prev, emptyMCQ()]); }
  function removeMCQ(i: number) { setMcQs(prev => prev.filter((_, idx) => idx !== i)); }

  function handleSave() {
    const num = Number(lessonNum);
    if (!num || num < 1) { setError('차시 번호를 입력해 주세요.'); return; }
    if (!initial && existingNums.includes(num)) { setError(`${num}차시는 이미 있습니다.`); return; }
    if (!date) { setError('날짜를 선택해 주세요.'); return; }
    const now = new Date().toISOString();
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      lessonNum: num,
      date,
      subjectiveQuestions: subjQs.filter(q => q.q.trim()),
      mcQuestions: mcQs.filter(q => q.q.trim()),
      createdAt: initial?.createdAt ?? now,
      createdById: initial?.createdById ?? '',
      createdByName: initial?.createdByName ?? '',
    });
  }

  return (
    <div className="space-y-4">
      {/* 차시 + 날짜 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-[11px] text-gray-400 font-bold mb-1 block">차시 번호</label>
            <input
              type="number" min={1}
              value={lessonNum}
              onChange={e => setLessonNum(e.target.value)}
              placeholder="예: 1"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400"
            />
          </div>
          <div className="flex-1">
            <label className="text-[11px] text-gray-400 font-bold mb-1 block">날짜</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400"
            />
          </div>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      {/* 주관식 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-bold text-gray-600">주관식 문항 <span className="text-gray-400 font-normal">(채점 X, 참고용)</span></p>
          <button onClick={addSubj} className="flex items-center gap-1 text-[11px] text-primary-600 border border-primary-200 rounded-lg px-2 py-1 hover:bg-primary-50 transition">
            <Plus className="w-3 h-3" /> 추가
          </button>
        </div>
        {subjQs.map((sq, i) => (
          <div key={i} className="space-y-1.5 bg-gray-50 rounded-xl p-3">
            <div className="flex items-start gap-2">
              <span className="text-xs text-gray-400 font-bold mt-2.5 shrink-0">Q{i + 1}</span>
              <input
                value={sq.q}
                onChange={e => updateSubj(i, 'q', e.target.value)}
                placeholder="질문 입력"
                className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-primary-400 bg-white"
              />
              {subjQs.length > 1 && (
                <button onClick={() => removeSubj(i)} className="text-gray-300 hover:text-red-400 transition mt-1.5">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 pl-6">
              <span className="text-[11px] text-gray-400 shrink-0">정답</span>
              <input
                value={sq.answer}
                onChange={e => updateSubj(i, 'answer', e.target.value)}
                placeholder="참고용 정답"
                className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-primary-400 bg-white"
              />
            </div>
          </div>
        ))}
      </div>

      {/* 객관식 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-bold text-gray-600">객관식 문항 <span className="text-gray-400 font-normal">(채점 O, 점수용)</span></p>
          <button onClick={addMCQ} className="flex items-center gap-1 text-[11px] text-primary-600 border border-primary-200 rounded-lg px-2 py-1 hover:bg-primary-50 transition">
            <Plus className="w-3 h-3" /> 추가
          </button>
        </div>
        {mcQs.map((mq, i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-xs text-gray-400 font-bold mt-2.5 shrink-0">Q{i + 1}</span>
              <input
                value={mq.q}
                onChange={e => updateMCQ(i, 'q', e.target.value)}
                placeholder="문제 입력"
                className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-primary-400 bg-white"
              />
              {mcQs.length > 1 && (
                <button onClick={() => removeMCQ(i)} className="text-gray-300 hover:text-red-400 transition mt-1.5">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="pl-6 space-y-1.5">
              {mq.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <button
                    onClick={() => updateMCQ(i, 'answer', oi)}
                    className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition ${mq.answer === oi ? 'border-primary-500 bg-primary-500' : 'border-gray-300'}`}
                  >
                    {mq.answer === oi && <Check className="w-3 h-3 text-white" />}
                  </button>
                  <span className="text-[11px] text-gray-400 shrink-0">{CIRCLE[oi]}</span>
                  <input
                    value={opt}
                    onChange={e => updateMCQ(i, `opt_${oi}`, e.target.value)}
                    placeholder={`선택지 ${oi + 1}`}
                    className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-primary-400 bg-white"
                  />
                </div>
              ))}
              <p className="text-[10px] text-primary-600 font-semibold pl-7">● 표시 = 정답</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-3 rounded-xl text-sm font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition">
          취소
        </button>
        <button onClick={handleSave} className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition" style={{ background: 'linear-gradient(135deg,#f9a8c9 0%,#de4e80 100%)' }}>
          {initial ? '수정 완료' : '업로드'}
        </button>
      </div>
    </div>
  );
}

/* ── 차시 상세 ── */
function LessonDetail({ lesson, isAdmin, onBack, onEdit, onDelete }: {
  lesson: MedievalLesson;
  isAdmin: boolean;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [mcAnswers, setMcAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const score = submitted
    ? lesson.mcQuestions.filter((q, i) => mcAnswers[i] === q.answer).length
    : 0;

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition">
          <ArrowLeft className="w-3.5 h-3.5" /> 목록
        </button>
        {isAdmin && (
          <div className="flex gap-2">
            <button onClick={onEdit} className="text-xs text-primary-600 border border-primary-200 rounded-lg px-2.5 py-1 hover:bg-primary-50 transition flex items-center gap-1">
              <Edit2 className="w-3 h-3" /> 수정
            </button>
            <button onClick={onDelete} className="text-xs text-red-400 border border-red-100 rounded-lg px-2.5 py-1 hover:bg-red-50 transition flex items-center gap-1">
              <Trash2 className="w-3 h-3" /> 삭제
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs text-gray-400">{lesson.date}</p>
        <p className="text-lg font-black text-gray-800 mt-0.5">{lesson.lessonNum}차시</p>
      </div>

      {/* 주관식 */}
      {lesson.subjectiveQuestions.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">주관식 <span className="text-gray-300 font-normal normal-case">참고용 정답 포함</span></p>
          {lesson.subjectiveQuestions.map((sq, i) => (
            <div key={i} className="border-b border-gray-50 pb-3 last:border-0 last:pb-0">
              <p className="text-sm font-semibold text-gray-700"><span className="text-primary-500 mr-1">Q{i + 1}.</span>{sq.q}</p>
              <p className="text-xs text-gray-400 mt-1">→ {sq.answer}</p>
            </div>
          ))}
        </div>
      )}

      {/* 객관식 */}
      {lesson.mcQuestions.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">객관식 <span className="text-gray-300 font-normal normal-case">채점용</span></p>
          {lesson.mcQuestions.map((mq, i) => (
            <div key={i} className="space-y-2">
              <p className="text-sm font-semibold text-gray-700"><span className="text-primary-500 mr-1">Q{i + 1}.</span>{mq.q}</p>
              <div className="space-y-1.5 pl-4">
                {mq.options.map((opt, oi) => {
                  const selected = mcAnswers[i] === oi;
                  const isCorrect = mq.answer === oi;
                  let cls = 'border-gray-200 bg-white text-gray-600';
                  if (submitted) {
                    if (isCorrect) cls = 'border-green-400 bg-green-50 text-green-700 font-bold';
                    else if (selected) cls = 'border-red-300 bg-red-50 text-red-600';
                  } else if (selected) {
                    cls = 'border-primary-400 bg-primary-50 text-primary-700 font-semibold';
                  }
                  return (
                    <button
                      key={oi}
                      disabled={submitted}
                      onClick={() => setMcAnswers(prev => ({ ...prev, [i]: oi }))}
                      className={`w-full text-left text-sm px-3 py-2 rounded-xl border-2 transition ${cls}`}
                    >
                      <span className="mr-1.5 font-bold">{CIRCLE[oi]}</span>{opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {!submitted ? (
            <button
              onClick={() => setSubmitted(true)}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition"
              style={{ background: 'linear-gradient(135deg,#f9a8c9 0%,#de4e80 100%)' }}
            >
              채점하기
            </button>
          ) : (
            <div className="bg-primary-50 rounded-xl p-4 text-center">
              <p className="text-lg font-black text-primary-700">{score} / {lesson.mcQuestions.length}</p>
              <p className="text-xs text-primary-500 mt-0.5">정답 수</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── 메인 ── */
export default function MedievalReviewTab({ currentUser, tick }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MedievalLesson | null>(null);
  const [selected, setSelected] = useState<MedievalLesson | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const isAdmin = isPrivileged(currentUser);
  const lessons = getMedievalLessons();

  function handleSave(lesson: MedievalLesson) {
    const now = new Date().toISOString();
    saveMedievalLesson({
      ...lesson,
      createdById: lesson.createdById || currentUser.id,
      createdByName: lesson.createdByName || currentUser.username,
      createdAt: lesson.createdAt || now,
    });
    setShowForm(false);
    setEditing(null);
  }

  function handleDelete(id: string) {
    if (!confirm('이 차시를 삭제하시겠습니까?')) return;
    deleteMedievalLesson(id);
    setSelected(null);
  }

  if (selected) {
    if (editing) {
      return (
        <LessonForm
          initial={editing}
          existingNums={lessons.filter(l => l.id !== editing.id).map(l => l.lessonNum)}
          onSave={l => { handleSave(l); setEditing(null); setSelected(null); }}
          onCancel={() => setEditing(null)}
        />
      );
    }
    return (
      <LessonDetail
        lesson={selected}
        isAdmin={isAdmin}
        onBack={() => setSelected(null)}
        onEdit={() => setEditing(selected)}
        onDelete={() => handleDelete(selected.id)}
      />
    );
  }

  if (showForm) {
    return (
      <LessonForm
        existingNums={lessons.map(l => l.lessonNum)}
        onSave={l => { handleSave(l); setShowForm(false); }}
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
          <Plus className="w-4 h-4" /> 차시 업로드
        </button>
      )}

      {lessons.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm text-gray-300 font-semibold">아직 업로드된 차시가 없습니다</p>
        </div>
      ) : (
        lessons.map(lesson => (
          <div key={lesson.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <button
              className="w-full px-4 py-3.5 flex items-center justify-between text-left"
              onClick={() => setSelected(lesson)}
            >
              <div>
                <p className="text-sm font-black text-gray-800">{lesson.lessonNum}차시</p>
                <p className="text-xs text-gray-400 mt-0.5">{lesson.date}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-400">{lesson.mcQuestions.length}객관 · {lesson.subjectiveQuestions.length}주관</span>
                <ChevronDown className="w-4 h-4 text-gray-300" />
              </div>
            </button>
          </div>
        ))
      )}
    </div>
  );
}
