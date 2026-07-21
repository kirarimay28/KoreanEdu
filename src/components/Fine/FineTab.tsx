import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Check, Trash2, X, Wallet } from 'lucide-react';
import type { User, FineType } from '../../types';
import {
  getUsers, getFinesForWeek, addFine, markFinePaid, deleteFine,
  getStudySessionNotesForWeek, getStudyLogsForWeek,
} from '../../store';
import NameWithCrown from '../common/NameWithCrown';

interface Props { currentUser: User }

const STUDY_START = '2026-06-29';

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getWeekMonday(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return localDateStr(d);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return localDateStr(d);
}

function getWeekLabel(weekKey: string): string {
  const monday = new Date(getWeekMonday(weekKey) + 'T00:00:00');
  const start  = new Date(STUDY_START + 'T00:00:00');
  const diffDays = Math.round((monday.getTime() - start.getTime()) / 86400000);
  return `${Math.floor(diffDays / 7) + 1}주차`;
}

function calcLatenessFine(timeStr: string): number {
  // timeStr = "HH:MM"
  const [h, m] = timeStr.split(':').map(Number);
  const minutesFrom18 = (h - 18) * 60 + m;
  if (minutesFrom18 < 5) return 0;
  return (Math.floor((minutesFrom18 - 5) / 5) + 1) * 1000;
}

function formatWon(amount: number): string {
  return amount.toLocaleString('ko-KR') + '원';
}

const TYPE_STYLE: Record<FineType, { bg: string; text: string; label: string }> = {
  '지각': { bg: 'bg-orange-100', text: 'text-orange-700', label: '지각' },
  '과제': { bg: 'bg-blue-100',   text: 'text-blue-700',   label: '과제' },
  '일지': { bg: 'bg-primary-100', text: 'text-primary-700', label: '일지' },
};

export default function FineTab({ currentUser }: Props) {
  const isPriv = currentUser.role === 'admin' || currentUser.role === 'subadmin';
  const today = localDateStr(new Date());
  const [weekKey, setWeekKey] = useState(getWeekMonday(today));
  const [tick, setTick] = useState(0);
  const [showForm, setShowForm] = useState(false);

  // form state
  const [fineType, setFineType]           = useState<FineType>('지각');
  const [targetUserId, setTargetUserId]   = useState('');
  const [arrivalTime, setArrivalTime]     = useState('18:05');
  const [workCount, setWorkCount]         = useState(1);
  const [logTargets, setLogTargets]       = useState<string[]>([]);
  const [extraNote, setExtraNote]         = useState('');

  const allUsers = getUsers();
  const fines    = getFinesForWeek(weekKey);
  const canGoForward = addDays(weekKey, 7) <= today;

  // 일지 미업로드 멤버 — studySessionNotes 또는 studyLogs 둘 중 하나라도 있으면 제출된 것으로 간주
  const weekNotes   = getStudySessionNotesForWeek(weekKey);
  const weekLogs    = getStudyLogsForWeek(weekKey);
  const uploadedIds = new Set([...weekNotes.map(n => n.userId), ...weekLogs.map(l => l.userId)]);
  const logEligibleUsers = allUsers.filter(u => !u.restrictions?.noStudyLogRequired);
  const missingLogUsers  = logEligibleUsers.filter(u => !uploadedIds.has(u.id));

  // 총액 per member
  const totalByUser: Record<string, { name: string; total: number; unpaid: number }> = {};
  for (const f of fines) {
    if (!totalByUser[f.targetUserId]) {
      totalByUser[f.targetUserId] = { name: f.targetUsername, total: 0, unpaid: 0 };
    }
    totalByUser[f.targetUserId].total += f.amount;
    if (!f.paid) totalByUser[f.targetUserId].unpaid += f.amount;
  }

  function resetForm() {
    setFineType('지각');
    setTargetUserId('');
    setArrivalTime('18:05');
    setWorkCount(1);
    setLogTargets([]);
    setExtraNote('');
  }

  function handleSubmit() {
    const now = new Date().toISOString();
    if (fineType === '지각') {
      if (!targetUserId) return alert('멤버를 선택하세요.');
      const amount = calcLatenessFine(arrivalTime);
      if (amount === 0) return alert('18:05 이전은 지각비가 없습니다.');
      const target = allUsers.find(u => u.id === targetUserId)!;
      addFine({
        type: '지각',
        targetUserId: target.id,
        targetUsername: target.username,
        amount,
        reason: `${arrivalTime} 도착${extraNote ? ` · ${extraNote}` : ''}`,
        weekKey,
        issuedAt: now,
        issuedById: currentUser.id,
        issuedByName: currentUser.username,
        paid: false,
      });
    } else if (fineType === '과제') {
      if (!targetUserId) return alert('멤버를 선택하세요.');
      const amount = workCount * 5000;
      const target = allUsers.find(u => u.id === targetUserId)!;
      addFine({
        type: '과제',
        targetUserId: target.id,
        targetUsername: target.username,
        amount,
        reason: `미수행 ${workCount}작품${extraNote ? ` · ${extraNote}` : ''}`,
        weekKey,
        issuedAt: now,
        issuedById: currentUser.id,
        issuedByName: currentUser.username,
        paid: false,
      });
    } else {
      // 일지
      if (logTargets.length === 0) return alert('대상 멤버를 선택하세요.');
      for (const uid of logTargets) {
        const target = allUsers.find(u => u.id === uid)!;
        addFine({
          type: '일지',
          targetUserId: target.id,
          targetUsername: target.username,
          amount: 10000,
          reason: `일지 미업로드${extraNote ? ` · ${extraNote}` : ''}`,
          weekKey,
          issuedAt: now,
          issuedById: currentUser.id,
          issuedByName: currentUser.username,
          paid: false,
        });
      }
    }
    resetForm();
    setShowForm(false);
    setTick(t => t + 1);
  }

  const latenessAmount = calcLatenessFine(arrivalTime);

  return (
    <div className="space-y-4" key={tick}>
      {/* 주차 네비게이터 */}
      <div className="flex items-center gap-2">
        <button onClick={() => setWeekKey(addDays(weekKey, -7))} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="flex-1 text-sm font-bold text-gray-700 text-center">{getWeekLabel(weekKey)}</span>
        <button onClick={() => setWeekKey(addDays(weekKey, 7))} disabled={!canGoForward} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 disabled:opacity-30">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 벌금 요약 */}
      {Object.keys(totalByUser).length > 0 && (
        <div className="card p-3 space-y-1.5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">이번 주 벌금 현황</p>
          {Object.entries(totalByUser).map(([uid, info]) => (
            <div key={uid} className="flex items-center justify-between">
              <NameWithCrown name={info.name} className="text-xs font-semibold text-gray-700" />
              <div className="flex items-center gap-2 text-xs">
                {info.unpaid > 0 && (
                  <span className="text-red-500 font-bold">{formatWon(info.unpaid)} 미납</span>
                )}
                {info.unpaid < info.total && (
                  <span className="text-green-500 text-[10px]">(일부 납부)</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 부과 버튼 (관리자) */}
      {isPriv && !showForm && (
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-1.5 text-xs font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 px-3 py-2 rounded-xl transition"
        >
          <Plus className="w-3.5 h-3.5" />벌금 부과
        </button>
      )}

      {/* 벌금 부과 폼 */}
      {isPriv && showForm && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-gray-800">벌금 부과</p>
            <button onClick={() => setShowForm(false)} className="text-gray-300 hover:text-gray-500">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 종류 선택 */}
          <div className="flex bg-gray-100 p-1 rounded-xl gap-0.5">
            {(['지각', '과제', '일지'] as FineType[]).map(t => (
              <button
                key={t}
                onClick={() => setFineType(t)}
                className={`flex-1 py-1.5 text-xs rounded-lg font-medium transition ${fineType === t ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* 지각 */}
          {fineType === '지각' && (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-gray-500 mb-1 block">멤버</label>
                <select value={targetUserId} onChange={e => setTargetUserId(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary-300">
                  <option value="">선택</option>
                  {allUsers.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500 mb-1 block">도착 시간</label>
                <input type="time" value={arrivalTime} onChange={e => setArrivalTime(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary-300" />
              </div>
              <div className={`text-center py-2 rounded-xl font-bold text-sm ${latenessAmount > 0 ? 'bg-orange-50 text-orange-600' : 'bg-gray-50 text-gray-400'}`}>
                {latenessAmount > 0 ? `지각비: ${formatWon(latenessAmount)}` : '지각비 없음 (18:05 미만)'}
              </div>
            </div>
          )}

          {/* 과제 */}
          {fineType === '과제' && (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-gray-500 mb-1 block">멤버</label>
                <select value={targetUserId} onChange={e => setTargetUserId(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary-300">
                  <option value="">선택</option>
                  {allUsers.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500 mb-1 block">미수행 작품 수</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setWorkCount(c => Math.max(1, c - 1))}
                    className="w-8 h-8 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 text-lg font-bold flex items-center justify-center">−</button>
                  <span className="text-sm font-bold text-gray-800 w-8 text-center">{workCount}개</span>
                  <button onClick={() => setWorkCount(c => Math.min(4, c + 1))}
                    className="w-8 h-8 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 text-lg font-bold flex items-center justify-center">+</button>
                </div>
              </div>
              <div className="text-center py-2 rounded-xl font-bold text-sm bg-blue-50 text-blue-600">
                과제 벌금: {formatWon(workCount * 5000)}
              </div>
            </div>
          )}

          {/* 일지 */}
          {fineType === '일지' && (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-gray-500 mb-1.5 block">
                  미업로드 멤버 선택 <span className="font-normal text-gray-400">(복수 선택 가능)</span>
                </label>
                <div className="space-y-1.5">
                  {logEligibleUsers.map(u => {
                    const isMissing = !uploadedIds.has(u.id);
                    const selected = logTargets.includes(u.id);
                    return (
                      <button
                        key={u.id}
                        onClick={() => setLogTargets(prev =>
                          prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id]
                        )}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition ${
                          selected ? 'bg-primary-50 border-primary-200' : 'border-gray-100 hover:bg-gray-50'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                          selected ? 'bg-primary-500 border-primary-500' : 'border-gray-300'
                        }`}>
                          {selected && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <NameWithCrown name={u.username} className="text-xs font-semibold text-gray-700 flex-1" />
                        {isMissing && (
                          <span className="text-[9px] bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full font-semibold">미업로드</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              {logTargets.length > 0 && (
                <div className="text-center py-2 rounded-xl font-bold text-sm bg-primary-50 text-primary-600">
                  일지 벌금: {formatWon(logTargets.length * 10000)} ({logTargets.length}명 × 10,000원)
                </div>
              )}
            </div>
          )}

          {/* 메모 */}
          <div>
            <label className="text-[11px] font-semibold text-gray-500 mb-1 block">메모 (선택)</label>
            <input
              type="text"
              placeholder="추가 메모"
              value={extraNote}
              onChange={e => setExtraNote(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>

          <button
            onClick={handleSubmit}
            className="w-full py-2.5 text-sm font-semibold bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition"
          >
            벌금 부과
          </button>
        </div>
      )}

      {/* 벌금 목록 */}
      <div className="space-y-2">
        {fines.length === 0 ? (
          <div className="text-center py-10">
            <Wallet className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-xs text-gray-400">이번 주 부과된 벌금이 없어요</p>
          </div>
        ) : (
          fines.map(fine => {
            const style = TYPE_STYLE[fine.type];
            return (
              <div key={fine.id} className="card p-3">
                <div className="flex items-start gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${style.bg} ${style.text}`}>
                    {style.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <NameWithCrown name={fine.targetUsername} className="text-xs font-bold text-gray-800" />
                      <span className={`text-xs font-bold ml-auto ${fine.paid ? 'text-green-500' : 'text-red-500'}`}>
                        {formatWon(fine.amount)}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400">{fine.reason}</p>
                    <p className="text-[10px] text-gray-300 mt-0.5">{fine.issuedByName} 부과 · {new Date(fine.issuedAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
                {isPriv && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-50">
                    <button
                      onClick={() => { markFinePaid(fine.id, !fine.paid); setTick(t => t + 1); }}
                      className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg transition ${
                        fine.paid
                          ? 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500'
                          : 'bg-green-50 text-green-600 hover:bg-green-100'
                      }`}
                    >
                      <Check className="w-3 h-3" />
                      {fine.paid ? '납부 취소' : '납부 완료'}
                    </button>
                    <button
                      onClick={() => { if (window.confirm('벌금을 삭제할까요?')) { deleteFine(fine.id); setTick(t => t + 1); } }}
                      className="flex items-center gap-1 text-[10px] text-gray-300 hover:text-red-400 px-2 py-1 rounded-lg hover:bg-red-50 transition ml-auto"
                    >
                      <Trash2 className="w-3 h-3" />삭제
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 일지 벌금 안내 */}
      {isPriv && missingLogUsers.length > 0 && (
        <div className="bg-primary-50 border border-primary-100 rounded-xl px-3 py-2.5">
          <p className="text-[11px] font-bold text-primary-700 mb-1">이번 주 일지 미업로드</p>
          <div className="flex flex-wrap gap-1">
            {missingLogUsers.map(u => (
              <span key={u.id} className="text-[10px] bg-primary-100 text-primary-600 px-2 py-0.5 rounded-full font-semibold">
                {u.username}
              </span>
            ))}
          </div>
          <p className="text-[10px] text-primary-400 mt-1.5">위 멤버에게 일지 벌금(10,000원)을 부과하려면 '벌금 부과' 버튼을 이용하세요.</p>
        </div>
      )}
    </div>
  );
}
