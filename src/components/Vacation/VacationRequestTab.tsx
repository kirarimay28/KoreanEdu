import { useState } from 'react';
import type { User, VacationRequest, VacationReason } from '../../types';
import { isPrivileged } from '../../types';
import {
  createVacationRequest,
  getVacationRequests,
  reviewVacation,
  hasVacationInWeek,
} from '../../store';
import { getKSTToday } from '../common/DateNavigator';
import CalendarPopup from '../common/CalendarPopup';
import { CalendarDays } from 'lucide-react';

interface Props {
  currentUser: User;
}

function addDays(dateStr: string, delta: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  return d.toISOString().split('T')[0];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

const REASONS: VacationReason[] = ['질병', '여행', '가족 모임', '기타'];

const STATUS_STYLE: Record<string, string> = {
  '대기중': 'bg-amber-100 text-amber-700',
  '승인': 'bg-green-100 text-green-700',
  '거절': 'bg-red-100 text-red-700',
};

export default function VacationRequestTab({ currentUser }: Props) {
  const today = getKSTToday();
  const tomorrow = addDays(today, 1);

  const [vacationDate, setVacationDate] = useState<string>(tomorrow);
  const [makeupDate, setMakeupDate] = useState<string>(addDays(tomorrow, 1));
  const [reason, setReason] = useState<VacationReason>('질병');
  const [customReason, setCustomReason] = useState('');
  const [showVacationCal, setShowVacationCal] = useState(false);
  const [showMakeupCal, setShowMakeupCal] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [requests, setRequests] = useState<VacationRequest[]>(() => getVacationRequests());

  function reload() {
    setRequests(getVacationRequests());
  }

  function handleSubmit() {
    if (hasVacationInWeek(currentUser.id, vacationDate)) {
      alert('이미 해당 주에 휴가 신청이 있습니다.');
      return;
    }
    if (makeupDate === vacationDate) {
      alert('보강 날짜는 휴가 날짜와 달라야 합니다.');
      return;
    }
    if (makeupDate <= today) {
      alert('보강 날짜는 오늘 이후여야 합니다.');
      return;
    }
    const req: VacationRequest = {
      id: crypto.randomUUID(),
      requesterId: currentUser.id,
      requesterName: currentUser.username,
      createdAt: new Date().toISOString(),
      vacationDate,
      reason,
      customReason: reason === '기타' ? customReason : '',
      makeupDate,
      status: '대기중',
    };
    createVacationRequest(req);
    setSubmitted(true);
    reload();
    setTimeout(() => setSubmitted(false), 3000);
  }

  function handleReview(id: string, status: '승인' | '거절') {
    reviewVacation(id, status, currentUser.id, currentUser.username);
    reload();
  }

  const myRequests = requests
    .filter(r => r.requesterId === currentUser.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const pendingOthers = requests.filter(
    r => r.requesterId !== currentUser.id && r.status === '대기중'
  );

  const alreadyHasThisWeek = hasVacationInWeek(currentUser.id, vacationDate);

  return (
    <div className="space-y-6">
      {/* 휴가 신청 폼 */}
      <div className="card border border-gray-100">
        <p className="section-title">휴가 신청</p>

        {alreadyHasThisWeek && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <p className="text-sm text-amber-700">해당 주에 이미 휴가 신청이 있습니다.</p>
          </div>
        )}

        <div className="space-y-4">
          {/* 신청 날짜 */}
          <div>
            <label className="label">신청 날짜 (휴가 날짜)</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => { setShowVacationCal(v => !v); setShowMakeupCal(false); }}
                className="flex items-center gap-2 w-full input-field text-left"
              >
                <CalendarDays className="w-4 h-4 text-primary-500 flex-shrink-0" />
                <span>{formatDate(vacationDate)}</span>
              </button>
              {showVacationCal && (
                <CalendarPopup
                  selectedDate={vacationDate}
                  today={today}
                  allowFuture
                  minDate={tomorrow}
                  onSelect={d => {
                    setVacationDate(d);
                    setShowVacationCal(false);
                  }}
                  onClose={() => setShowVacationCal(false)}
                />
              )}
            </div>
          </div>

          {/* 신청 사유 */}
          <div>
            <label className="label">신청 사유</label>
            <div className="flex flex-wrap gap-2">
              {REASONS.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    reason === r
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            {reason === '기타' && (
              <input
                className="input-field mt-2"
                placeholder="사유를 입력하세요"
                value={customReason}
                onChange={e => setCustomReason(e.target.value)}
              />
            )}
          </div>

          {/* 보강 날짜 */}
          <div>
            <label className="label">보강 날짜</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => { setShowMakeupCal(v => !v); setShowVacationCal(false); }}
                className="flex items-center gap-2 w-full input-field text-left"
              >
                <CalendarDays className="w-4 h-4 text-primary-500 flex-shrink-0" />
                <span>{formatDate(makeupDate)}</span>
              </button>
              {showMakeupCal && (
                <CalendarPopup
                  selectedDate={makeupDate}
                  today={today}
                  allowFuture
                  minDate={tomorrow}
                  onSelect={d => {
                    setMakeupDate(d);
                    setShowMakeupCal(false);
                  }}
                  onClose={() => setShowMakeupCal(false)}
                />
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={alreadyHasThisWeek || (reason === '기타' && !customReason.trim())}
              className="btn-primary text-sm py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitted ? '신청 완료!' : '제출'}
            </button>
          </div>
        </div>
      </div>

      {/* 나의 신청 내역 */}
      {myRequests.length > 0 && (
        <div className="card border border-gray-100">
          <p className="section-title">나의 신청 내역</p>
          <div className="space-y-3">
            {myRequests.map(req => (
              <div key={req.id} className="bg-gray-50 rounded-xl px-4 py-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-800">{formatDate(req.vacationDate)}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[req.status]}`}>
                    {req.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  사유: {req.reason === '기타' ? req.customReason || '기타' : req.reason}
                </p>
                <p className="text-xs text-gray-500">보강: {formatDate(req.makeupDate)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 관리자: 대기중 신청 목록 */}
      {isPrivileged(currentUser) && pendingOthers.length > 0 && (
        <div className="card border border-gray-100">
          <p className="section-title">대기중 신청 목록</p>
          <div className="space-y-3">
            {pendingOthers.map(req => (
              <div key={req.id} className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-800">{req.requesterName}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReview(req.id, '승인')}
                      className="text-xs font-semibold bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg transition"
                    >
                      승인
                    </button>
                    <button
                      onClick={() => handleReview(req.id, '거절')}
                      className="text-xs font-semibold bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg transition"
                    >
                      거절
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-600">휴가: {formatDate(req.vacationDate)}</p>
                <p className="text-xs text-gray-600">
                  사유: {req.reason === '기타' ? req.customReason || '기타' : req.reason}
                </p>
                <p className="text-xs text-gray-600">보강: {formatDate(req.makeupDate)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
