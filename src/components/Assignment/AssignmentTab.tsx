import { useState } from 'react';
import type { User } from '../../types';
import { ClipboardList, ClipboardCheck, PauseCircle } from 'lucide-react';
import CheckListTab from './CheckListTab';
import AssignmentNoticeTab from './AssignmentNoticeTab';

interface Props {
  currentUser: User;
  isExamPeriod?: boolean;
}

type SubTab = 'notice' | 'checklist';

export default function AssignmentTab({ currentUser, isExamPeriod }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('notice');

  return (
    <div>
      {isExamPeriod && (
        <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-4">
          <PauseCircle className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-xs text-amber-700 font-semibold">시험기간 중 — 과제 · 체크리스트 의무가 일시 정지됩니다.</p>
        </div>
      )}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl">
        <button
          onClick={() => setSubTab('notice')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-all ${subTab === 'notice' ? 'tab-active' : 'tab-inactive'}`}
        >
          <ClipboardList className="w-3.5 h-3.5" />
          이번 주 과제
        </button>
        <button
          onClick={() => setSubTab('checklist')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-all ${subTab === 'checklist' ? 'tab-active' : 'tab-inactive'}`}
        >
          <ClipboardCheck className="w-3.5 h-3.5" />
          체크리스트
        </button>
      </div>

      {subTab === 'notice' && <AssignmentNoticeTab currentUser={currentUser} />}
      {subTab === 'checklist' && <CheckListTab currentUser={currentUser} />}
    </div>
  );
}
