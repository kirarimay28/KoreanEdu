import { useState } from 'react';
import type { User, StudySubTab } from '../../types';
import VocabTestTab from './VocabTestTab';
import PeerFeedbackTab from './PeerFeedbackTab';
import StudyLogTab from './StudyLogTab';
import { Lock } from 'lucide-react';

interface Props {
  date: string;
  currentUser: User;
}

const TABS: { id: StudySubTab; label: string }[] = [
  { id: 'vocab',    label: '고어 시험' },
  { id: 'feedback', label: '상호 피드백' },
  { id: 'journal',  label: '스터디 일지' },
];

export default function StudyTab({ date, currentUser }: Props) {
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

      {subTab === 'vocab'    && <VocabTestTab    date={date} currentUser={currentUser} />}
      {subTab === 'feedback' && <PeerFeedbackTab date={date} currentUser={currentUser} />}
      {subTab === 'journal'  && <StudyLogTab     date={date} currentUser={currentUser} />}
    </div>
  );
}
