import { useState, useEffect } from 'react';
import type { User } from '../../types';
import { subscribeMedievalData } from '../../store';
import MedievalReviewTab from './MedievalReviewTab';
import MedievalBlankExamTab from './MedievalBlankExamTab';
import { BookOpen, FileText } from 'lucide-react';

type SubTab = 'review' | 'exam';

interface Props { currentUser: User; }

export default function MedievalTab({ currentUser }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('review');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const unsub = subscribeMedievalData(() => setTick(t => t + 1));
    return unsub;
  }, []);

  return (
    <div>
      <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
        <button
          onClick={() => setSubTab('review')}
          className={`flex-1 py-2 text-sm rounded-lg transition-all font-medium flex items-center justify-center gap-1.5 ${subTab === 'review' ? 'tab-active' : 'tab-inactive'}`}
        >
          <BookOpen className="w-3.5 h-3.5" /> 복습하기
        </button>
        <button
          onClick={() => setSubTab('exam')}
          className={`flex-1 py-2 text-sm rounded-lg transition-all font-medium flex items-center justify-center gap-1.5 ${subTab === 'exam' ? 'tab-active' : 'tab-inactive'}`}
        >
          <FileText className="w-3.5 h-3.5" /> 빈칸 시험
        </button>
      </div>

      {subTab === 'review' && <MedievalReviewTab currentUser={currentUser} tick={tick} />}
      {subTab === 'exam'   && <MedievalBlankExamTab currentUser={currentUser} tick={tick} />}
    </div>
  );
}
