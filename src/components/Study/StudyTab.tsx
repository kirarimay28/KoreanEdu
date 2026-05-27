import { useState } from 'react';
import type { User, StudySubTab } from '../../types';
import ClassicalLiterature from './ClassicalLiterature';
import ModernLiterature from './ModernLiterature';

interface Props {
  date: string;
  currentUser: User;
}

export default function StudyTab({ date, currentUser }: Props) {
  const [subTab, setSubTab] = useState<StudySubTab>('classical');

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-xl">
        <button
          className={`flex-1 py-2 text-sm rounded-lg transition-all font-medium ${
            subTab === 'classical' ? 'tab-active' : 'tab-inactive'
          }`}
          onClick={() => setSubTab('classical')}
        >
          고전 문학
        </button>
        <button
          className={`flex-1 py-2 text-sm rounded-lg transition-all font-medium ${
            subTab === 'modern' ? 'tab-active' : 'tab-inactive'
          }`}
          onClick={() => setSubTab('modern')}
        >
          현대 문학
        </button>
      </div>

      {subTab === 'classical' && <ClassicalLiterature date={date} currentUser={currentUser} />}
      {subTab === 'modern' && <ModernLiterature date={date} currentUser={currentUser} />}
    </div>
  );
}
