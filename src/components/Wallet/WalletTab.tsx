import { useState } from 'react';
import { ChevronLeft, ChevronRight, Wallet, Check, Trash2 } from 'lucide-react';
import type { User, FineRecord, FineExemptionRequest } from '../../types';
import { isPrivileged } from '../../types';
import {
  getAllFines, getFinesForWeek, addFine, markFinePaid, deleteFine,
  getUsers, getFineCumulativeCount,
  getFineExemptionRequests, getExemptionRequestForFine,
  submitFineExemptionRequest, reviewFineExemptionRequest,
  getVocabTestScoresForWeek, getAssignmentChecksForWeek, weekMondayKey,
} from '../../store';
import { getKSTToday } from '../common/DateNavigator';

interface Props { currentUser: User; }
interface FormProps { weekKey: string; currentUser: User; onRefresh: () => void; }

type WalletSubTab = '현황' | '내 지갑' | '부과' | '면제 요청';
type FineIssueType = '지각' | '과제' | '국교론' | '체크리스트';

const PAYMENT_ACCOUNT = '3333380818456 카카오뱅크';

const TYPE_COLORS: Record<string, string> = {
  '지각': 'bg-orange-100 text-orange-600',
  '과제': 'bg-red-100 text-red-600',
  '국교론': 'bg-violet-100 text-violet-600',
  '체크리스트': 'bg-blue-100 text-blue-600',
  '일지': 'bg-gray-100 text-gray-600',
};

function TypeBadge({ type }: { type: string }) {
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${TYPE_COLORS[type] ?? 'bg-gray-100 text-gray-600'}`}>
      {type}
    </span>
  );
}

function fmtAmount(amount: number): string {
  return amount.toLocaleString('ko-KR') + '원';
}

function formatWeekRange(weekKey: string): string {
  const d = new Date(weekKey + 'T00:00:00');
  const end = new Date(d.getTime() + 6 * 86400000);
  return `${d.getMonth()+1}/${d.getDate()} ~ ${end.getMonth()+1}/${end.getDate()}`;
}

function shiftWeek(weekKey: string, delta: number): string {
  const d = new Date(weekKey + 'T00:00:00');
  d.setDate(d.getDate() + delta * 7);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function calcLatenessFine(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return 0;
  const minutesFrom20 = (h - 20) * 60 + m;
  if (minutesFrom20 < 0) return 0;
  return (Math.floor(minutesFrom20 / 5) + 1) * 1000;
}

// ── FineRow ──────────────────────────────────────────────────────────────────

function FineRow({ fine, isAdmin, onRefresh }: { fine: FineRecord; isAdmin: boolean; onRefresh: () => void }) {
  const req = getExemptionRequestForFine(fine.id);
  const statusLabel = fine.exempted ? '면제'
    : fine.paid ? '완납'
    : req?.status === '대기중' ? '심사중'
    : req?.status === '반려' ? '반려'
    : '미납';
  const statusColor = fine.exempted ? 'text-blue-500'
    : fine.paid ? 'text-green-500'
    : req?.status === '대기중' ? 'text-yellow-500'
    : req?.status === '반려' ? 'text-orange-500'
    : 'text-red-500';

  return (
    <div className="flex items-center gap-2 px-4 py-2.5">
      <TypeBadge type={fine.type} />
      <span className="flex-1 text-xs text-gray-500 truncate min-w-0">{fine.reason}</span>
      <span className="text-sm font-bold text-gray-800 flex-shrink-0">{fmtAmount(fine.amount)}</span>
      <span className={`text-[10px] font-semibold flex-shrink-0 ${statusColor}`}>{statusLabel}</span>
      {isAdmin && !fine.exempted && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => { markFinePaid(fine.id, !fine.paid); onRefresh(); }}
            className={`text-[10px] px-1.5 py-0.5 rounded-full transition ${
              fine.paid ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-green-100 hover:text-green-600'
            }`}
          >
            {fine.paid ? '✓납' : '납부'}
          </button>
          <button
            onClick={() => { if (confirm('이 벌금을 삭제하시겠습니까?')) { deleteFine(fine.id); onRefresh(); } }}
            className="text-gray-300 hover:text-red-400 transition"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── OverviewSection ───────────────────────────────────────────────────────────

function OverviewSection({ weekKey, currentUser, onRefresh }: FormProps) {
  const isAdmin = isPrivileged(currentUser);
  const fines = getFinesForWeek(weekKey);

  const byUser = new Map<string, { username: string; fines: FineRecord[] }>();
  for (const fine of fines) {
    if (!byUser.has(fine.targetUserId)) byUser.set(fine.targetUserId, { username: fine.targetUsername, fines: [] });
    byUser.get(fine.targetUserId)!.fines.push(fine);
  }

  if (byUser.size === 0) {
    return <div className="text-center py-10 text-gray-400 text-sm">이번 주 부과된 벌금이 없습니다.</div>;
  }

  return (
    <div className="space-y-3">
      {Array.from(byUser.entries()).map(([userId, data]) => {
        const unpaid = data.fines.filter(f => !f.paid && !f.exempted).reduce((s, f) => s + f.amount, 0);
        const total = data.fines.reduce((s, f) => s + f.amount, 0);
        return (
          <div key={userId} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
              <span className="font-semibold text-sm text-gray-800">{data.username}</span>
              <div className="flex items-center gap-2">
                {unpaid > 0 && <span className="text-xs font-bold text-red-500">미납 {fmtAmount(unpaid)}</span>}
                <span className="text-xs text-gray-400">총 {fmtAmount(total)}</span>
              </div>
            </div>
            <div className="divide-y divide-gray-50">
              {data.fines.map(fine => (
                <FineRow key={fine.id} fine={fine} isAdmin={isAdmin} onRefresh={onRefresh} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── MyWalletSection ───────────────────────────────────────────────────────────

function MyWalletSection({ currentUser, onRefresh }: { currentUser: User; onRefresh: () => void }) {
  const allFines = getAllFines().filter(f => f.targetUserId === currentUser.id);
  const unpaidTotal = allFines.filter(f => !f.paid && !f.exempted).reduce((s, f) => s + f.amount, 0);
  const [exemptingId, setExemptingId] = useState<string | null>(null);
  const [exemptionReason, setExemptionReason] = useState('');

  function requestExemption(fine: FineRecord) {
    if (!exemptionReason.trim()) return;
    submitFineExemptionRequest({
      id: crypto.randomUUID(),
      fineId: fine.id,
      requesterId: currentUser.id,
      requesterName: currentUser.username,
      fineType: fine.type,
      fineAmount: fine.amount,
      fineReason: fine.reason,
      exemptionReason: exemptionReason.trim(),
      status: '대기중',
      createdAt: new Date().toISOString(),
    });
    setExemptingId(null);
    setExemptionReason('');
    onRefresh();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-4 text-white shadow-lg" style={{ background: 'linear-gradient(135deg, #de4e80 0%, #c43b6a 100%)' }}>
        <div className="flex items-center gap-2 mb-1">
          <Wallet className="w-4 h-4 opacity-80" />
          <span className="text-xs opacity-80">미납 총액</span>
        </div>
        <p className="text-2xl font-bold">{fmtAmount(unpaidTotal)}</p>
        {unpaidTotal > 0 && (
          <div className="mt-3 bg-white/20 rounded-xl p-2.5">
            <p className="text-[10px] opacity-80 mb-0.5">납부 계좌</p>
            <p className="text-sm font-bold">{PAYMENT_ACCOUNT}</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-700">나의 벌금 내역</span>
        </div>
        {allFines.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">벌금 내역이 없습니다. 😊</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {allFines.map(fine => {
              const req = getExemptionRequestForFine(fine.id);
              const canRequest = !fine.paid && !fine.exempted && !req;
              const isExempting = exemptingId === fine.id;

              return (
                <div key={fine.id} className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <TypeBadge type={fine.type} />
                    <span className="flex-1 text-xs text-gray-600 truncate">{fine.reason}</span>
                    <span className="text-sm font-bold text-gray-800">{fmtAmount(fine.amount)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-gray-400">
                      {new Date(fine.issuedAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {fine.exempted && <span className="text-[10px] font-semibold text-blue-500">면제</span>}
                      {fine.paid && !fine.exempted && <span className="text-[10px] font-semibold text-green-500">완납</span>}
                      {!fine.paid && !fine.exempted && (
                        req ? (
                          <span className={`text-[10px] font-semibold ${
                            req.status === '대기중' ? 'text-yellow-500' :
                            req.status === '반려' ? 'text-orange-500' : 'text-blue-500'
                          }`}>
                            면제{req.status === '대기중' ? ' 심사중' : req.status === '반려' ? ` 반려됨` : ''}
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-red-500">미납</span>
                        )
                      )}
                      {canRequest && !isExempting && (
                        <button
                          onClick={() => { setExemptingId(fine.id); setExemptionReason(''); }}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-primary-50 text-primary-600 hover:bg-primary-100 transition"
                        >
                          면제 요청
                        </button>
                      )}
                    </div>
                  </div>
                  {req?.status === '반려' && req.rejectReason && (
                    <p className="text-[10px] text-orange-500 mt-1 pl-0.5">반려 사유: {req.rejectReason}</p>
                  )}
                  {isExempting && (
                    <div className="mt-2 space-y-1.5">
                      <textarea
                        value={exemptionReason}
                        onChange={e => setExemptionReason(e.target.value)}
                        placeholder="면제 요청 사유를 입력하세요"
                        className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 resize-none h-14 focus:outline-none focus:ring-1 focus:ring-primary-300"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => requestExemption(fine)}
                          disabled={!exemptionReason.trim()}
                          className="flex-1 text-xs py-1.5 bg-primary-600 text-white rounded-lg disabled:opacity-40 font-medium"
                        >
                          요청하기
                        </button>
                        <button
                          onClick={() => setExemptingId(null)}
                          className="text-xs py-1.5 px-3 bg-gray-100 text-gray-600 rounded-lg"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── LatenessForm ──────────────────────────────────────────────────────────────

function LatenessForm({ weekKey, currentUser, onRefresh }: FormProps) {
  const allUsers = getUsers();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [times, setTimes] = useState<Record<string, string>>({});

  function toggleUser(id: string) {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function issue() {
    let issued = 0;
    for (const userId of Array.from(selected)) {
      const user = allUsers.find(u => u.id === userId);
      if (!user) continue;
      const amount = calcLatenessFine(times[userId] ?? '');
      if (amount === 0) continue;
      addFine({ type: '지각', targetUserId: userId, targetUsername: user.username, amount, reason: `${times[userId]} 도착`, weekKey, issuedAt: new Date().toISOString(), issuedById: currentUser.id, issuedByName: currentUser.username, paid: false });
      issued++;
    }
    if (issued > 0) { setSelected(new Set()); setTimes({}); onRefresh(); alert(`지각비가 부과되었습니다. (${issued}명)`); }
    else alert('20:00 이후 도착한 인원의 시간을 입력해 주세요.');
  }

  const canIssue = Array.from(selected).some(id => calcLatenessFine(times[id] ?? '') > 0);

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">지각한 인원을 선택하고 도착 시간을 입력하세요. (20:00부터 부과, 5분마다 +1,000원)</p>
      <div className="space-y-2">
        {allUsers.map(user => {
          const isSel = selected.has(user.id);
          const time = times[user.id] ?? '';
          const fine = isSel ? calcLatenessFine(time) : 0;
          return (
            <div key={user.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <button onClick={() => toggleUser(user.id)} className="w-full flex items-center gap-3 px-4 py-2.5">
                <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition ${isSel ? 'bg-primary-600' : 'border-2 border-gray-300'}`}>
                  {isSel && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="flex-1 text-left text-sm font-medium text-gray-700">{user.username}</span>
                {isSel && fine > 0 && <span className="text-sm font-bold text-red-500">{fmtAmount(fine)}</span>}
                {isSel && time && fine === 0 && <span className="text-xs text-gray-400">벌금 없음</span>}
              </button>
              {isSel && (
                <div className="px-4 pb-3">
                  <input
                    type="time"
                    value={time}
                    onChange={e => setTimes(t => ({ ...t, [user.id]: e.target.value }))}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-300"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <button onClick={issue} disabled={!canIssue} className="w-full py-3 bg-primary-600 text-white text-sm font-semibold rounded-xl disabled:opacity-40">
        지각비 부과
      </button>
    </div>
  );
}

// ── AssignmentFineForm ────────────────────────────────────────────────────────

function AssignmentFineForm({ weekKey, currentUser, onRefresh }: FormProps) {
  const allUsers = getUsers();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function getAmount(userId: string): number {
    return getFineCumulativeCount(userId, '과제') >= 2 ? 10000 : 5000;
  }

  function toggleUser(id: string) {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function issue() {
    for (const userId of Array.from(selected)) {
      const user = allUsers.find(u => u.id === userId);
      if (!user) continue;
      addFine({ type: '과제', targetUserId: userId, targetUsername: user.username, amount: getAmount(userId), reason: '과제 미수행', weekKey, issuedAt: new Date().toISOString(), issuedById: currentUser.id, issuedByName: currentUser.username, paid: false });
    }
    setSelected(new Set()); onRefresh(); alert(`과제비가 부과되었습니다. (${selected.size}명)`);
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">과제 미수행 인원을 선택하세요. (3회 누적 시 10,000원으로 인상)</p>
      <div className="space-y-1.5">
        {allUsers.map(user => {
          const isSel = selected.has(user.id);
          const cumCount = getFineCumulativeCount(user.id, '과제');
          const amount = getAmount(user.id);
          return (
            <button
              key={user.id}
              onClick={() => toggleUser(user.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border transition ${isSel ? 'bg-primary-50 border-primary-200' : 'bg-white border-gray-100 hover:border-gray-200'}`}
            >
              <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition ${isSel ? 'bg-primary-600' : 'border-2 border-gray-300'}`}>
                {isSel && <Check className="w-3 h-3 text-white" />}
              </div>
              <span className="flex-1 text-left text-sm font-medium text-gray-700">{user.username}</span>
              <span className="text-[11px] text-gray-400">{cumCount}회 누적</span>
              <span className={`text-sm font-bold ${cumCount >= 2 ? 'text-red-500' : 'text-gray-700'}`}>{fmtAmount(amount)}</span>
            </button>
          );
        })}
      </div>
      <button onClick={issue} disabled={selected.size === 0} className="w-full py-3 bg-primary-600 text-white text-sm font-semibold rounded-xl disabled:opacity-40">
        과제비 부과 ({selected.size}명)
      </button>
    </div>
  );
}

// ── GogyoronForm ──────────────────────────────────────────────────────────────

function GogyoronForm({ weekKey, currentUser, onRefresh }: FormProps) {
  const scores = getVocabTestScoresForWeek(weekKey).sort((a, b) => a.score - b.score);
  const eligible = scores.filter(s => s.score < 20);
  const autoIds = new Set(eligible.slice(0, 2).map(s => s.userId));
  const [selected, setSelected] = useState<Set<string>>(new Set(autoIds));

  function getAmount(userId: string): number {
    return getFineCumulativeCount(userId, '국교론') >= 2 ? 2000 : 1000;
  }

  function issue() {
    const alreadyFined = new Set(getFinesForWeek(weekKey).filter(f => f.type === '국교론').map(f => f.targetUserId));
    let issued = 0;
    for (const userId of Array.from(selected)) {
      if (alreadyFined.has(userId)) continue;
      const s = scores.find(x => x.userId === userId);
      if (!s) continue;
      addFine({ type: '국교론', targetUserId: userId, targetUsername: s.username, amount: getAmount(userId), reason: `고어 시험 ${s.score}/20점`, weekKey, issuedAt: new Date().toISOString(), issuedById: currentUser.id, issuedByName: currentUser.username, paid: false });
      issued++;
    }
    onRefresh();
    alert(issued > 0 ? `국교론 벌금이 부과되었습니다. (${issued}명)` : '이미 부과된 인원입니다.');
  }

  if (scores.length === 0) {
    return <div className="text-center py-8 text-gray-400 text-sm bg-white rounded-xl border border-gray-100">이번 주 고어 시험 점수가 없습니다.</div>;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">이번 주 고어 시험 하위 2명 (100점 제외). 3회 누적 시 2,000원으로 인상.</p>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-600">이번 주 고어 시험 점수 (낮은 순)</div>
        <div className="divide-y divide-gray-50">
          {scores.map(s => {
            const isPerfect = s.score >= 20;
            const isSel = selected.has(s.userId);
            const isAuto = autoIds.has(s.userId);
            return (
              <button
                key={s.userId}
                disabled={isPerfect}
                onClick={() => {
                  if (isPerfect) return;
                  setSelected(prev => { const n = new Set(prev); n.has(s.userId) ? n.delete(s.userId) : n.add(s.userId); return n; });
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 transition text-left ${isPerfect ? 'opacity-40 cursor-default' : isSel ? 'bg-red-50' : 'hover:bg-gray-50'}`}
              >
                <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${isPerfect ? 'border-2 border-gray-200' : isSel ? 'bg-red-500' : 'border-2 border-gray-300'}`}>
                  {isSel && !isPerfect && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="flex-1 text-sm text-gray-700">{s.username}</span>
                {isAuto && !isPerfect && <span className="text-[10px] text-red-400">하위</span>}
                <span className={`text-sm font-bold ${isPerfect ? 'text-green-500' : isAuto ? 'text-red-500' : 'text-gray-700'}`}>
                  {s.score}/20{isPerfect ? ' 🎉' : ''}
                </span>
                {isSel && !isPerfect && <span className="text-xs font-bold text-red-500 flex-shrink-0">{fmtAmount(getAmount(s.userId))}</span>}
              </button>
            );
          })}
        </div>
      </div>
      <button onClick={issue} disabled={selected.size === 0} className="w-full py-3 bg-primary-600 text-white text-sm font-semibold rounded-xl disabled:opacity-40">
        국교론 벌금 부과 ({selected.size}명)
      </button>
    </div>
  );
}

// ── ChecklistFineForm ─────────────────────────────────────────────────────────

function ChecklistFineForm({ weekKey, currentUser, onRefresh }: FormProps) {
  const allUsers = getUsers();
  const checks = getAssignmentChecksForWeek(weekKey);
  const submittedIds = new Set(checks.map(c => c.userId));
  const alreadyFinedIds = new Set(getFinesForWeek(weekKey).filter(f => f.type === '체크리스트').map(f => f.targetUserId));
  const notSubmitted = allUsers.filter(u => !submittedIds.has(u.id));
  const issuable = notSubmitted.filter(u => !alreadyFinedIds.has(u.id));

  const [selected, setSelected] = useState<Set<string>>(new Set(issuable.map(u => u.id)));

  function issue() {
    let issued = 0;
    for (const userId of Array.from(selected)) {
      if (alreadyFinedIds.has(userId)) continue;
      const user = allUsers.find(u => u.id === userId);
      if (!user) continue;
      addFine({ type: '체크리스트', targetUserId: userId, targetUsername: user.username, amount: 1000, reason: '체크리스트 미입력', weekKey, issuedAt: new Date().toISOString(), issuedById: currentUser.id, issuedByName: currentUser.username, paid: false });
      issued++;
    }
    onRefresh();
    alert(issued > 0 ? `체크리스트 벌금이 부과되었습니다. (${issued}명)` : '부과할 인원이 없습니다.');
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">체크리스트 미입력 인원 자동 탐지. 다음 주 월요일 20시 전 입력 시 면제 요청 가능.</p>
      {notSubmitted.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm bg-white rounded-xl border border-gray-100">모든 멤버가 이번 주 체크리스트를 입력했습니다!</div>
      ) : (
        <div className="space-y-1.5">
          {notSubmitted.map(user => {
            const alreadyFined = alreadyFinedIds.has(user.id);
            const isSel = selected.has(user.id);
            return (
              <button
                key={user.id}
                disabled={alreadyFined}
                onClick={() => {
                  if (alreadyFined) return;
                  setSelected(prev => { const n = new Set(prev); n.has(user.id) ? n.delete(user.id) : n.add(user.id); return n; });
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border transition ${alreadyFined ? 'bg-gray-50 border-gray-100 opacity-60 cursor-default' : isSel ? 'bg-primary-50 border-primary-200' : 'bg-white border-gray-100 hover:border-gray-200'}`}
              >
                <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${alreadyFined ? 'bg-gray-300' : isSel ? 'bg-primary-600' : 'border-2 border-gray-300'}`}>
                  {(isSel || alreadyFined) && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="flex-1 text-left text-sm font-medium text-gray-700">{user.username}</span>
                {alreadyFined ? <span className="text-xs text-gray-400">이미 부과됨</span> : <span className="text-sm font-bold text-gray-700">1,000원</span>}
              </button>
            );
          })}
        </div>
      )}
      {issuable.length > 0 && (
        <button onClick={issue} disabled={selected.size === 0} className="w-full py-3 bg-primary-600 text-white text-sm font-semibold rounded-xl disabled:opacity-40">
          체크리스트 벌금 부과 ({selected.size}명)
        </button>
      )}
    </div>
  );
}

// ── IssueSection ──────────────────────────────────────────────────────────────

function IssueSection({ weekKey, currentUser, onRefresh }: FormProps) {
  const [fineType, setFineType] = useState<FineIssueType>('지각');
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-1 bg-gray-100 p-1 rounded-xl">
        {(['지각', '과제', '국교론', '체크리스트'] as FineIssueType[]).map(t => (
          <button key={t} onClick={() => setFineType(t)} className={`py-1.5 text-[11px] font-medium rounded-lg transition-all ${fineType === t ? 'tab-active' : 'tab-inactive'}`}>
            {t}
          </button>
        ))}
      </div>
      <div key={`${fineType}-${weekKey}`}>
        {fineType === '지각'      && <LatenessForm weekKey={weekKey} currentUser={currentUser} onRefresh={onRefresh} />}
        {fineType === '과제'      && <AssignmentFineForm weekKey={weekKey} currentUser={currentUser} onRefresh={onRefresh} />}
        {fineType === '국교론'    && <GogyoronForm weekKey={weekKey} currentUser={currentUser} onRefresh={onRefresh} />}
        {fineType === '체크리스트' && <ChecklistFineForm weekKey={weekKey} currentUser={currentUser} onRefresh={onRefresh} />}
      </div>
    </div>
  );
}

// ── ExemptionSection ──────────────────────────────────────────────────────────

function ExemptionSection({ currentUser, onRefresh }: { currentUser: User; onRefresh: () => void }) {
  const pending = getFineExemptionRequests().filter(r => r.status === '대기중');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  function approve(req: FineExemptionRequest) {
    reviewFineExemptionRequest(req.id, '승인', currentUser.id, currentUser.username);
    onRefresh();
  }

  function reject(req: FineExemptionRequest) {
    if (!rejectReason.trim()) return;
    reviewFineExemptionRequest(req.id, '반려', currentUser.id, currentUser.username, rejectReason.trim());
    setRejectingId(null); setRejectReason(''); onRefresh();
  }

  if (pending.length === 0) {
    return <div className="text-center py-10 text-gray-400 text-sm bg-white rounded-xl border border-gray-100">대기중인 면제 요청이 없습니다.</div>;
  }

  return (
    <div className="space-y-3">
      {pending.map(req => (
        <div key={req.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <TypeBadge type={req.fineType} />
                <span className="text-sm font-semibold text-gray-800">{req.requesterName}</span>
              </div>
              <p className="text-xs text-gray-500">{req.fineReason} — <span className="font-semibold text-gray-700">{fmtAmount(req.fineAmount)}</span></p>
            </div>
            <span className="text-[10px] text-gray-400 flex-shrink-0">
              {new Date(req.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
            </span>
          </div>
          <div className="bg-gray-50 rounded-lg px-3 py-2">
            <p className="text-[10px] text-gray-400 mb-0.5">면제 요청 사유</p>
            <p className="text-sm text-gray-700 leading-relaxed">{req.exemptionReason}</p>
          </div>
          {rejectingId === req.id ? (
            <div className="space-y-1.5">
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="반려 사유를 입력하세요"
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 resize-none h-14 focus:outline-none focus:ring-1 focus:ring-red-200"
              />
              <div className="flex gap-2">
                <button onClick={() => reject(req)} disabled={!rejectReason.trim()} className="flex-1 py-1.5 text-xs bg-red-500 text-white rounded-lg disabled:opacity-40 font-medium">
                  반려 확인
                </button>
                <button onClick={() => { setRejectingId(null); setRejectReason(''); }} className="text-xs py-1.5 px-3 bg-gray-100 text-gray-600 rounded-lg">
                  취소
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => approve(req)} className="flex-1 py-2 text-xs font-semibold bg-green-500 text-white rounded-lg hover:bg-green-600 transition">
                승인 (면제)
              </button>
              <button onClick={() => { setRejectingId(req.id); setRejectReason(''); }} className="flex-1 py-2 text-xs font-semibold bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition">
                반려
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main WalletTab ────────────────────────────────────────────────────────────

export default function WalletTab({ currentUser }: Props) {
  const isAdmin = isPrivileged(currentUser);
  const tabs: WalletSubTab[] = isAdmin ? ['현황', '내 지갑', '부과', '면제 요청'] : ['현황', '내 지갑'];
  const [subTab, setSubTab] = useState<WalletSubTab>('현황');
  const [weekKey, setWeekKey] = useState(() => weekMondayKey(getKSTToday()));
  const [tick, setTick] = useState(0);

  const exemptionCount = isAdmin ? getFineExemptionRequests().filter(r => r.status === '대기중').length : 0;

  function refresh() { setTick(t => t + 1); }

  return (
    <div>
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className={`flex-1 py-2 text-[11px] font-medium rounded-lg transition-all relative ${subTab === t ? 'tab-active' : 'tab-inactive'}`}
          >
            {t}
            {t === '면제 요청' && exemptionCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {exemptionCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {(subTab === '현황' || subTab === '부과') && (
        <div className="flex items-center justify-between mb-4 bg-white rounded-xl px-3 py-2 shadow-sm border border-gray-100">
          <button onClick={() => setWeekKey(shiftWeek(weekKey, -1))} className="p-1 text-gray-400 hover:text-gray-600 transition">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-gray-700">{formatWeekRange(weekKey)}</span>
          <button onClick={() => setWeekKey(shiftWeek(weekKey, 1))} className="p-1 text-gray-400 hover:text-gray-600 transition">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <div key={`${subTab}-${weekKey}-${tick}`}>
        {subTab === '현황'     && <OverviewSection weekKey={weekKey} currentUser={currentUser} onRefresh={refresh} />}
        {subTab === '내 지갑'  && <MyWalletSection currentUser={currentUser} onRefresh={refresh} />}
        {subTab === '부과'     && isAdmin && <IssueSection weekKey={weekKey} currentUser={currentUser} onRefresh={refresh} />}
        {subTab === '면제 요청' && isAdmin && <ExemptionSection currentUser={currentUser} onRefresh={refresh} />}
      </div>
    </div>
  );
}
