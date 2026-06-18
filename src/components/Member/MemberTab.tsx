import { useState } from 'react';
import type { User, Warning, UserRestrictions } from '../../types';
import {
  getUsers, getAttendanceEntries, setUserRole, deleteUser,
  issueWarning, getWarningsForUser, clearWarning, setUserRestrictions,
} from '../../store';
import { UserCircle2, CalendarCheck, Trophy, Star, Shield, ShieldCheck, Trash2, AlertTriangle, X, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import NameWithCrown from '../common/NameWithCrown';

interface Props {
  currentUser: User;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}`;
}

function RoleBadge({ role }: { role?: string }) {
  if (role === 'admin') return (
    <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-0.5">
      <ShieldCheck className="w-2.5 h-2.5" />방장
    </span>
  );
  if (role === 'subadmin') return (
    <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-0.5">
      <Shield className="w-2.5 h-2.5" />부방장
    </span>
  );
  return null;
}

function WarningItem({ w, canClear, onClear }: { w: Warning; canClear: boolean; onClear: () => void }) {
  return (
    <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2 text-xs">
      <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-red-700">{w.reason}</p>
        <p className="text-red-400 mt-0.5">{w.issuedByName} · {formatDate(w.issuedAt)}</p>
      </div>
      {canClear && (
        <button onClick={onClear} className="flex-shrink-0 text-red-300 hover:text-red-500 transition">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

function MemberCard({ user, rank, currentUser, onAction }: {
  user: User;
  rank: number;
  currentUser: User;
  onAction: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [warningReason, setWarningReason] = useState('');
  const [showWarnInput, setShowWarnInput] = useState(false);

  const isMe = user.id === currentUser.id;
  const isAdmin = currentUser.role === 'admin';
  const isSubadmin = currentUser.role === 'subadmin';
  const isPrivileged = isAdmin || isSubadmin;

  const attendanceCount = getAttendanceEntries().filter(e => e.userId === user.id).length;
  const warnings = getWarningsForUser(user.id);

  function handleToggleSubadmin() {
    const newRole = user.role === 'subadmin' ? 'member' : 'subadmin';
    setUserRole(user.id, newRole);
    onAction();
  }

  function handleDelete() {
    if (!window.confirm(`'${user.username}' 멤버를 탈퇴 처리할까요?\n해당 계정으로 더 이상 로그인할 수 없습니다.`)) return;
    deleteUser(user.id);
    onAction();
  }

  function handleIssueWarning() {
    if (!warningReason.trim()) return;
    issueWarning({
      id: crypto.randomUUID(),
      targetUserId: user.id,
      targetUsername: user.username,
      reason: warningReason.trim(),
      issuedAt: new Date().toISOString(),
      issuedById: currentUser.id,
      issuedByName: currentUser.username,
    });
    setWarningReason('');
    setShowWarnInput(false);
    onAction();
  }

  function handleClearWarning(id: string) {
    clearWarning(id);
    onAction();
  }

  function handleToggleRestriction(key: keyof UserRestrictions) {
    const current = user.restrictions ?? {};
    setUserRestrictions(user.id, { ...current, [key]: !current[key] });
    onAction();
  }

  const rankIcon = rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : rank + 1;
  const rankBg = rank === 0 ? 'bg-amber-100 text-amber-600' : rank === 1 ? 'bg-gray-100 text-gray-500' : rank === 2 ? 'bg-orange-100 text-orange-500' : 'bg-gray-50 text-gray-400';

  return (
    <div className={`card ${isMe ? 'ring-2 ring-primary-200 bg-primary-50/30' : ''}`}>
      <div className="flex items-start gap-4">
        {/* Rank */}
        <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold ${rankBg}`}>
          {rankIcon}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <NameWithCrown name={user.username} className="font-semibold text-gray-800 text-sm" />
            {isMe && <span className="text-[10px] font-semibold bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">나</span>}
            <RoleBadge role={user.role} />
            {warnings.length > 0 && (
              <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                <AlertTriangle className="w-2.5 h-2.5" />경고 {warnings.length}
              </span>
            )}
            {Object.values(user.restrictions ?? {}).some(Boolean) && (
              <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                <Lock className="w-2.5 h-2.5" />제한됨
              </span>
            )}
            {attendanceCount > 0 && rank === 0 && (
              <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                <Star className="w-2.5 h-2.5" />출석왕
              </span>
            )}
          </div>
          {user.resolution && (
            <p className="text-xs text-gray-500 italic mt-0.5 line-clamp-2">"{user.resolution}"</p>
          )}
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <CalendarCheck className="w-3.5 h-3.5 text-primary-400" />
              <span>출석 <span className="font-semibold text-gray-600">{attendanceCount}일</span></span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>가입 {formatDate(user.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Admin expand toggle */}
        {isPrivileged && !isMe && (
          <button onClick={() => setExpanded(v => !v)} className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Admin controls */}
      {isPrivileged && !isMe && expanded && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="space-y-2">
              {warnings.map(w => (
                <WarningItem key={w.id} w={w} canClear={isAdmin} onClear={() => handleClearWarning(w.id)} />
              ))}
            </div>
          )}

          {/* Admin action buttons */}
          <div className="flex flex-wrap gap-2">
            {isAdmin && (
              <button
                onClick={handleToggleSubadmin}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl transition ${
                  user.role === 'subadmin'
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                {user.role === 'subadmin' ? '부방장 해제' : '부방장 지정'}
              </button>
            )}
            <button
              onClick={() => setShowWarnInput(v => !v)}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-xl transition"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              경고 부여
            </button>
            {isAdmin && user.role !== 'admin' && (
              <button
                onClick={handleDelete}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                탈퇴 처리
              </button>
            )}
          </div>

          {/* Warning input */}
          {showWarnInput && (
            <div className="flex gap-2">
              <input
                className="input-field flex-1 text-sm"
                placeholder="경고 사유를 입력하세요..."
                value={warningReason}
                onChange={e => setWarningReason(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleIssueWarning()}
                autoFocus
              />
              <button
                onClick={handleIssueWarning}
                disabled={!warningReason.trim()}
                className="text-xs font-semibold bg-amber-500 hover:bg-amber-600 disabled:bg-gray-200 text-white px-3 py-2 rounded-xl transition flex-shrink-0"
              >
                부여
              </button>
            </div>
          )}

          {/* Restriction controls — admin only */}
          {isAdmin && (
            <div className="pt-3 border-t border-gray-100">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                <Lock className="w-3 h-3" />권한 제한
              </p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ['noStudyView',       '스터디 탭 열람'],
                  ['noLibraryDownload', '도서관 다운로드'],
                  ['noVacationRequest', '휴가 신청'],
                  ['noResourceRequest', '자료 요청'],
                ] as [keyof UserRestrictions, string][]).map(([key, label]) => {
                  const active = !!(user.restrictions?.[key]);
                  return (
                    <button
                      key={key}
                      onClick={() => handleToggleRestriction(key)}
                      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-medium transition ${
                        active
                          ? 'bg-red-50 text-red-600 border border-red-200'
                          : 'bg-gray-50 text-gray-500 border border-gray-100 hover:bg-gray-100'
                      }`}
                    >
                      <span>{label}</span>
                      <span className={`w-8 h-4 rounded-full flex-shrink-0 transition-colors relative ${active ? 'bg-red-400' : 'bg-gray-200'}`}>
                        <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${active ? 'left-4' : 'left-0.5'}`} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MemberTab({ currentUser }: Props) {
  const [tick, setTick] = useState(0);

  function refresh() { setTick(t => t + 1); }

  const users = getUsers();
  const attendanceCounts = Object.fromEntries(
    users.map(u => [u.id, getAttendanceEntries().filter(e => e.userId === u.id).length])
  );
  const sorted = users.slice().sort((a, b) => (attendanceCounts[b.id] ?? 0) - (attendanceCounts[a.id] ?? 0));

  return (
    <div className="space-y-3" key={tick}>
      <div className="flex items-center gap-2 mb-1">
        <UserCircle2 className="w-4 h-4 text-primary-500" />
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          스터디 멤버 {users.length}명
        </span>
      </div>

      {sorted.map((user, rank) => (
        <MemberCard
          key={user.id}
          user={user}
          rank={rank}
          currentUser={currentUser}
          onAction={refresh}
        />
      ))}
    </div>
  );
}
