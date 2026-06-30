import { useState } from 'react';
import { CheckCircle, AlertTriangle, RefreshCw, Edit2 } from 'lucide-react';
import NameWithCrown from '../common/NameWithCrown';
import type { User } from '../../types';
import { getUsers, getVocabTestScore, getVocabTestScoresForDate, upsertVocabTestScore } from '../../store';

interface Props {
  date: string;
  currentUser: User;
}

function getResult(score: number): { label: string; detail: string; color: string; icon: React.ReactNode } {
  if (score <= 9) return {
    label: '전체 재시험',
    detail: '다음 주 40개 응시 + 경고 자동 부여',
    color: 'text-red-500 bg-red-50 border-red-200',
    icon: <AlertTriangle className="w-4 h-4" />,
  };
  if (score <= 15) return {
    label: '틀린 어휘 재시험',
    detail: '틀린 항목만 다음 주 재시험',
    color: 'text-amber-500 bg-amber-50 border-amber-200',
    icon: <RefreshCw className="w-4 h-4" />,
  };
  return {
    label: '통과',
    detail: '20문항 중 16개 이상 정답',
    color: 'text-green-600 bg-green-50 border-green-200',
    icon: <CheckCircle className="w-4 h-4" />,
  };
}

export default function VocabTestTab({ date, currentUser }: Props) {
  const [input, setInput] = useState('');
  const [editing, setEditing] = useState(false);
  const [tick, setTick] = useState(0);

  const existing = getVocabTestScore(currentUser.id, date);
  const allScores = getVocabTestScoresForDate(date);
  const allUsers = getUsers();

  function handleSubmit() {
    const n = Number(input);
    if (!Number.isInteger(n) || n < 1 || n > 20) return;
    upsertVocabTestScore(currentUser.id, currentUser.username, date, n);
    setInput('');
    setEditing(false);
    setTick(t => t + 1);
  }

  const showForm = !existing || editing;

  return (
    <div className="space-y-4" key={tick}>
      {/* My score */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-gray-800">내 시험 점수</p>
          <span className="text-[11px] text-gray-400">{date}</span>
        </div>

        {!showForm && existing ? (
          <div className="space-y-2">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${getResult(existing.score).color}`}>
              {getResult(existing.score).icon}
              <div className="flex-1">
                <p className="text-sm font-bold">{existing.score} / 20</p>
                <p className="text-[11px]">{getResult(existing.score).label} — {getResult(existing.score).detail}</p>
              </div>
            </div>
            <button
              onClick={() => { setInput(String(existing.score)); setEditing(true); }}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary-500 transition"
            >
              <Edit2 className="w-3 h-3" />수정
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-gray-500">20문항 중 맞힌 개수를 입력하세요.</p>
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                max={20}
                className="input-field flex-1 text-sm"
                placeholder="예: 17"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
              <button
                onClick={handleSubmit}
                disabled={!input || Number(input) < 1 || Number(input) > 20}
                className="px-4 py-2 text-sm font-semibold bg-primary-600 text-white rounded-xl disabled:bg-gray-200 disabled:text-gray-400 transition"
              >
                제출
              </button>
              {editing && (
                <button onClick={() => setEditing(false)} className="px-3 py-2 text-sm text-gray-400 hover:text-gray-600 transition">취소</button>
              )}
            </div>
            {input && Number(input) >= 1 && Number(input) <= 20 && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs ${getResult(Number(input)).color}`}>
                {getResult(Number(input)).icon}
                <span className="font-semibold">{getResult(Number(input)).label}</span>
                <span>— {getResult(Number(input)).detail}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* All members' scores */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">멤버 점수 현황</p>
        <div className="card divide-y divide-gray-50">
          {allUsers.map(user => {
            const s = allScores.find(x => x.userId === user.id);
            const isMe = user.id === currentUser.id;
            return (
              <div key={user.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className={`text-sm font-semibold flex-1 ${isMe ? 'text-primary-600' : 'text-gray-700'}`}>
                  <NameWithCrown name={user.username} />{isMe ? ' (나)' : ''}
                </span>
                {s ? (
                  <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${getResult(s.score).color}`}>
                    {getResult(s.score).icon}
                    <span>{s.score} / 20</span>
                  </div>
                ) : (
                  <span className="text-[11px] text-gray-300 bg-gray-50 px-2.5 py-1 rounded-full">미제출</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {[
          { range: '1–9', label: '전체 재시험', color: 'text-red-500 bg-red-50' },
          { range: '10–15', label: '틀린 어휘 재시험', color: 'text-amber-500 bg-amber-50' },
          { range: '16–20', label: '통과', color: 'text-green-600 bg-green-50' },
        ].map(item => (
          <span key={item.range} className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${item.color}`}>
            {item.range}점 — {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
