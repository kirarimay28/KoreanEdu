import { useState } from 'react';
import type { VacationRequest } from '../../types';
import { getApprovedVacations } from '../../store';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default function VacationListTab() {
  const [vacations] = useState<VacationRequest[]>(() => getApprovedVacations());

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">승인된 휴가 명단</p>

      {vacations.length === 0 ? (
        <div className="flex items-center justify-center py-12 bg-gray-50 rounded-2xl">
          <p className="text-gray-400 text-sm">승인된 휴가가 없습니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {vacations.map(v => (
            <div key={v.id} className="card border border-gray-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-800">{v.requesterName}</span>
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
                    승인자: {v.reviewedByName}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
