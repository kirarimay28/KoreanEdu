import { useState } from 'react';
import type { User, CheckStatus } from '../../types';
import { getUsers, getAssignmentCheck, getAssignmentChecksForWeek, upsertAssignmentCheck } from '../../store';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  currentUser: User;
}

interface Item {
  id: string;
  category: string;
  label: string;
  description: string;
}

const ITEMS: Item[] = [
  { id: 'cls_analysis', category: '고전문학', label: '필독 작품 목록 분석', description: '과제 양식에 맞게 성실하게 분석했는지' },
  { id: 'cls_exam',     category: '고전문학', label: '기출 문제 분석',       description: '지문·문제·선지 삼단 구조 + 키워드별 분석' },
  { id: 'cls_vocab',    category: '고전문학', label: '고어 정리',            description: '작품에 나온 고어 정리했는지' },
  { id: 'mod_exam',     category: '현대문학', label: '기출 문제 분석',       description: '지문·문제·선지 삼단 구조 + 키워드별 분석' },
  { id: 'mod_solve',    category: '현대문학', label: '기출 문제 풀이',       description: '사고 과정 흔적 남겼는지' },
  { id: 'grm_read',     category: '현대문법', label: '한문총 회독',          description: '한문총 회독했는지' },
  { id: 'grm_create',   category: '현대문법', label: '문제 창작/기출 분석', description: '문제 창작 또는 기출 분석 완료했는지' },
];

const CATEGORIES = ['고전문학', '현대문학', '현대문법'];

const STATUS_OPTIONS: { value: CheckStatus; label: string }[] = [
  { value: 'O',    label: 'O' },
  { value: '△',   label: '△' },
  { value: 'X',    label: 'X' },
  { value: 'none', label: '없음' },
];

const STATUS_STYLE: Record<string, string> = {
  'O':    'bg-green-500 text-white border-green-500',
  '△':   'bg-amber-400 text-white border-amber-400',
  'X':    'bg-red-400 text-white border-red-400',
  'none': 'bg-gray-200 text-gray-500 border-gray-200',
  '':     'bg-white text-gray-300 border-gray-200',
};

function getWeekStart(offset = 0): string {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const day = now.getDay() || 7;
  now.setDate(now.getDate() - day + 1 + offset * 7);
  return now.toISOString().split('T')[0];
}

function formatWeekLabel(weekKey: string): string {
  const d = new Date(weekKey + 'T00:00:00');
  const end = new Date(d);
  end.setDate(d.getDate() + 6);
  const fmt = (dt: Date) => `${dt.getMonth() + 1}/${dt.getDate()}`;
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${fmt(d)} ~ ${fmt(end)}`;
}

function calcCompletion(checks: Record<string, CheckStatus>): { pct: number; total: number } {
  let total = 0;
  let score = 0;
  for (const item of ITEMS) {
    const s = checks[item.id] ?? '';
    if (s === 'none') continue;
    total++;
    if (s === 'O') score += 1;
    else if (s === '△') score += 0.5;
  }
  return { pct: total === 0 ? 100 : Math.round((score / total) * 100), total };
}

function PctBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? 'bg-green-400' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-bold w-9 text-right ${pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-amber-500' : 'text-red-500'}`}>{pct}%</span>
    </div>
  );
}

function StatusButton({ status, selected, onClick }: { status: CheckStatus; label: string; selected: boolean; onClick: () => void }) {
  const opt = STATUS_OPTIONS.find(o => o.value === status)!;
  return (
    <button
      onClick={onClick}
      className={`w-10 h-7 text-xs font-bold rounded-lg border transition-all ${selected ? STATUS_STYLE[status] : 'bg-white text-gray-300 border-gray-200 hover:border-gray-300'}`}
    >
      {opt.label}
    </button>
  );
}

export default function CheckListTab({ currentUser }: Props) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const weekKey = getWeekStart(weekOffset);
  const myEntry = getAssignmentCheck(currentUser.id, weekKey);
  const myChecks: Record<string, CheckStatus> = myEntry?.checks ?? {};

  function handleCheck(itemId: string, value: CheckStatus) {
    const next = value === (myChecks[itemId] ?? '') ? '' : value;
    const updated = { ...myChecks, [itemId]: next as CheckStatus };
    upsertAssignmentCheck(currentUser.id, currentUser.username, weekKey, updated);
    setTick(t => t + 1);
  }

  const { pct: myPct } = calcCompletion(myChecks);

  const allUsers = getUsers().filter(u => u.id !== currentUser.id);
  const weekEntries = getAssignmentChecksForWeek(weekKey);

  return (
    <div className="space-y-5" key={tick}>
      {/* Week navigator */}
      <div className="flex items-center justify-between">
        <button onClick={() => setWeekOffset(o => o - 1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-semibold text-gray-600">{formatWeekLabel(weekKey)}</span>
        <button
          onClick={() => setWeekOffset(o => o + 1)}
          disabled={weekOffset >= 0}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400 disabled:opacity-30"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* My checklist */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-gray-800">내 체크리스트</p>
          <span className="text-xs text-gray-400">{currentUser.username}</span>
        </div>

        <div className="space-y-4">
          {CATEGORIES.map(cat => (
            <div key={cat}>
              <p className="text-[11px] font-bold text-primary-500 uppercase tracking-wide mb-2">{cat}</p>
              <div className="space-y-2">
                {ITEMS.filter(i => i.category === cat).map(item => (
                  <div key={item.id} className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-700">{item.label}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{item.description}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {STATUS_OPTIONS.map(opt => (
                        <StatusButton
                          key={opt.value}
                          status={opt.value}
                          label={opt.label}
                          selected={(myChecks[item.id] ?? '') === opt.value}
                          onClick={() => handleCheck(item.id, opt.value)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-gray-100">
          <p className="text-[11px] text-gray-400 mb-1.5">완성도 ('과제 없음' 제외)</p>
          <PctBar pct={myPct} />
        </div>
      </div>

      {/* Member overview */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">멤버 완성도</p>
        <div className="space-y-2">
          {allUsers.map(user => {
            const entry = weekEntries.find(e => e.userId === user.id);
            const checks = entry?.checks ?? {};
            const { pct } = calcCompletion(checks);
            const isExpanded = expandedMember === user.id;

            return (
              <div key={user.id} className="card p-3">
                <button
                  className="w-full flex items-center gap-3"
                  onClick={() => setExpandedMember(isExpanded ? null : user.id)}
                >
                  <span className="text-sm font-semibold text-gray-700 flex-1 text-left">{user.username}</span>
                  {!entry ? (
                    <span className="text-[10px] text-gray-300 mr-1">미입력</span>
                  ) : (
                    <div className="w-32">
                      <PctBar pct={pct} />
                    </div>
                  )}
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />}
                </button>

                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                    {CATEGORIES.map(cat => (
                      <div key={cat}>
                        <p className="text-[10px] font-bold text-primary-500 uppercase tracking-wide mb-1.5">{cat}</p>
                        <div className="space-y-1.5">
                          {ITEMS.filter(i => i.category === cat).map(item => {
                            const s = checks[item.id] ?? '';
                            return (
                              <div key={item.id} className="flex items-center gap-2">
                                <span className="flex-1 text-xs text-gray-600">{item.label}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${STATUS_STYLE[s]}`}>
                                  {s === 'none' ? '없음' : s === '' ? '―' : s}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {allUsers.length === 0 && (
            <p className="text-xs text-gray-300 text-center py-4">다른 멤버가 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
}
