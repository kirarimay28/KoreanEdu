import { useState } from 'react';
import type { VacationRequest } from '../../types';
import { getApprovedVacations } from '../../store';
import NameWithCrown from '../common/NameWithCrown';
import { Share2, Check, Users } from 'lucide-react';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function buildShareText(name: string, vacations: VacationRequest[]): string {
  const lines = vacations.map(v => {
    const reason = v.reason === '기타' ? v.customReason || '기타' : v.reason;
    return `• 휴가일: ${formatDate(v.vacationDate)}\n  사유: ${reason}\n  보강일: ${formatDate(v.makeupDate)}`;
  }).join('\n\n');
  return `[나랏말ᄊᆞ미] ${name}님 휴가 일정\n\n${lines}`;
}

export default function VacationListTab() {
  const [vacations] = useState<VacationRequest[]>(() => getApprovedVacations());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const members = [...new Map(vacations.map(v => [v.requesterId, v.requesterName])).entries()];

  const displayed = selectedId
    ? vacations.filter(v => v.requesterId === selectedId)
    : vacations;

  const selectedName = selectedId
    ? vacations.find(v => v.requesterId === selectedId)?.requesterName ?? ''
    : '';

  async function handleShare() {
    const targets = selectedId
      ? vacations.filter(v => v.requesterId === selectedId)
      : vacations;
    const name = selectedId ? selectedName : '전체 멤버';
    const text = buildShareText(name, targets);

    if (navigator.share) {
      try { await navigator.share({ text }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(text).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">승인된 휴가 명단</p>

      {vacations.length === 0 ? (
        <div className="flex items-center justify-center py-12 rounded-2xl" style={{ background: 'rgba(255,255,255,0.45)' }}>
          <p className="text-gray-400 text-sm">승인된 휴가가 없습니다</p>
        </div>
      ) : (
        <>
          {/* Member filter chips */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedId(null)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                selectedId === null ? 'tab-active' : 'tab-inactive'
              }`}
            >
              <Users className="w-3 h-3" />
              전체
            </button>
            {members.map(([id, name]) => (
              <button
                key={id}
                onClick={() => setSelectedId(selectedId === id ? null : id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  selectedId === id ? 'tab-active' : 'tab-inactive'
                }`}
              >
                {name}
              </button>
            ))}
          </div>

          {/* Share button */}
          <button
            onClick={handleShare}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: copied
                ? 'linear-gradient(135deg, #52988c, #2b6460)'
                : 'linear-gradient(135deg, #FEE500, #F9D100)',
              color: copied ? '#fff' : '#1a1a1a',
              boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
            }}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                클립보드에 복사됨
              </>
            ) : (
              <>
                {/* KakaoTalk bubble icon */}
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 1.5C4.86 1.5 1.5 4.16 1.5 7.44c0 2.08 1.3 3.91 3.27 5.01l-.83 3.07a.3.3 0 0 0 .45.33L8.1 13.4c.29.03.59.05.9.05 4.14 0 7.5-2.66 7.5-5.94S13.14 1.5 9 1.5Z" fill="#1a1a1a"/>
                </svg>
                {selectedId ? `${selectedName}님 일정 카카오톡 공유` : '전체 휴가 일정 카카오톡 공유'}
                <Share2 className="w-3.5 h-3.5" />
              </>
            )}
          </button>

          {/* Vacation cards */}
          <div className="space-y-3">
            {displayed.map(v => (
              <div key={v.id} className="card space-y-2">
                <div className="flex items-center justify-between">
                  <NameWithCrown name={v.requesterName} className="text-sm font-semibold text-gray-800" />
                  <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">
                    승인
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-600">
                    <span className="font-medium">휴가 날짜:</span> {formatDate(v.vacationDate)}
                  </p>
                  <p className="text-xs text-gray-600">
                    <span className="font-medium">사유:</span>{' '}
                    {v.reason === '기타' ? v.customReason || '기타' : v.reason}
                  </p>
                  <p className="text-xs text-gray-600">
                    <span className="font-medium">보강 날짜:</span> {formatDate(v.makeupDate)}
                  </p>
                  {v.reviewedByName && (
                    <p className="text-xs text-gray-400">
                      승인자: <NameWithCrown name={v.reviewedByName} />
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
