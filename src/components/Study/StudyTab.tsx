import { useState } from 'react';
import type { User, StudySubTab } from '../../types';
import VocabTestTab from './VocabTestTab';
import VocabExamTab from './VocabExamTab';
import { Lock, PauseCircle } from 'lucide-react';

interface Props {
  date: string;
  currentUser: User;
  isExamPeriod?: boolean;
}

const TABS: { id: StudySubTab; label: string }[] = [
  { id: 'vocab', label: '고어 시험' },
  { id: 'exam',  label: '시험 응시' },
];

export default function StudyTab({ date, currentUser, isExamPeriod }: Props) {
  const [subTab, setSubTab] = useState<StudySubTab>('vocab');

  if (currentUser.restrictions?.noStudyView) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <Lock className="w-10 h-10 text-gray-200" />
        <p className="text-sm font-semibold text-gray-400">접근이 제한되었습니다</p>
        <p className="text-xs text-gray-300">스터디 탭 열람 권한이 없습니다.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`flex-1 py-2 text-sm rounded-lg transition-all font-medium ${subTab === t.id ? 'tab-active' : 'tab-inactive'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'vocab' && <VocabTestTab date={date} currentUser={currentUser} />}
      {subTab === 'exam' && (
        <>
          {isExamPeriod && (
            <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-4">
              <PauseCircle className="w-4 h-4 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-700 font-semibold">시험기간 중 — 고어 시험 의무가 일시 정지됩니다.</p>
            </div>
          )}
          <VocabExamTab currentUser={currentUser} />
        </>
      )}
    </div>
  );
}
