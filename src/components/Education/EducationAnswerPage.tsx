import { useState } from 'react';
import type { User, EducationAnswer } from '../../types';
import { getWeekQuestion, getWeekKey } from '../../data/educationQuestions';
import { upsertEducationAnswer, getMyEducationAnswer, getEducationAnswersForWeek, toggleReaction } from '../../store';
import { ChevronLeft, ThumbsUp, ThumbsDown } from 'lucide-react';
import NameWithCrown from '../common/NameWithCrown';

interface Props {
  mode: 'write' | 'read';
  onBack: () => void;
  currentUser: User;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function EducationAnswerPage({ mode, onBack, currentUser }: Props) {
  const weekKey = getWeekKey();
  const question = getWeekQuestion();

  const existing = getMyEducationAnswer(weekKey, currentUser.id);
  const [draft, setDraft] = useState(existing?.answer ?? '');
  const [saved, setSaved] = useState(false);
  const [answers, setAnswers] = useState<EducationAnswer[]>(() => getEducationAnswersForWeek(weekKey));

  function handleReaction(answerId: string, type: 'like' | 'dislike') {
    const updated = toggleReaction(answerId, currentUser.id, type);
    if (updated) {
      setAnswers(prev => prev.map(a => a.id === answerId ? { ...updated } : a));
    }
  }

  function handleSave() {
    if (!draft.trim()) return;
    const answer: EducationAnswer = {
      id: existing?.id ?? crypto.randomUUID(),
      weekKey,
      userId: currentUser.id,
      username: currentUser.username,
      answer: draft.trim(),
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      likes: existing?.likes ?? [],
      dislikes: existing?.dislikes ?? [],
    };
    upsertEducationAnswer(answer);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition font-medium"
      >
        <ChevronLeft className="w-4 h-4" />
        로비로 돌아가기
      </button>

      <div className="bg-primary-50 border border-primary-200 rounded-2xl px-4 py-3">
        <p className="text-[10px] font-bold text-primary-500 uppercase tracking-wide mb-1.5">
          📚 이번 주 교육관 형성 질문
        </p>
        <p className="text-sm text-primary-800 leading-relaxed">{question}</p>
      </div>

      {mode === 'write' ? (
        <div className="card border border-gray-100">
          <p className="section-title">내 답변 {existing ? '수정' : '작성'}</p>
          <textarea
            className="w-full input-field resize-none text-sm leading-relaxed"
            rows={9}
            placeholder="이번 주 질문에 대한 나의 생각을 작성해 보세요..."
            value={draft}
            onChange={e => setDraft(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end mt-3">
            <button
              onClick={handleSave}
              disabled={!draft.trim()}
              className="btn-primary text-sm py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saved ? '저장됨!' : existing ? '수정 저장' : '저장'}
            </button>
          </div>
        </div>
      ) : (
        <div className="card border border-gray-100">
          <p className="section-title">멤버들의 답변 ({answers.length})</p>
          {answers.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-2 text-center">아직 작성된 답변이 없습니다.</p>
          ) : (
            <div className="space-y-4">
              {answers.map(a => (
                <div key={a.id} className="bg-gray-50 rounded-xl px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-primary-600"><NameWithCrown name={a.username} /></span>
                    <span className="text-[10px] text-gray-400">
                      {formatDate(a.updatedAt ?? a.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{a.answer}</p>
                  <div className="flex items-center gap-3 mt-2.5">
                    <button
                      onClick={() => handleReaction(a.id, 'like')}
                      className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition ${
                        (a.likes ?? []).includes(currentUser.id)
                          ? 'bg-primary-100 text-primary-600'
                          : 'bg-gray-100 text-gray-500 hover:bg-primary-50 hover:text-primary-500'
                      }`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      {(a.likes ?? []).length}
                    </button>
                    <button
                      onClick={() => handleReaction(a.id, 'dislike')}
                      className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition ${
                        (a.dislikes ?? []).includes(currentUser.id)
                          ? 'bg-red-100 text-red-500'
                          : 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-400'
                      }`}
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                      {(a.dislikes ?? []).length}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
