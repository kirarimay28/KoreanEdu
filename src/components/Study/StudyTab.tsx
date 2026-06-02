import { useState } from 'react';
import type { User, StudySubTab } from '../../types';
import ClassicalLiterature from './ClassicalLiterature';
import ModernLiterature from './ModernLiterature';
import { usePdfExport } from '../../hooks/usePdfExport';
import { FileDown, Lock } from 'lucide-react';

interface Props {
  date: string;
  currentUser: User;
}

export default function StudyTab({ date, currentUser }: Props) {
  const [subTab, setSubTab] = useState<StudySubTab>('classical');
  const { contentRef, exportToPDF, isExporting } = usePdfExport(
    `스터디_${subTab === 'classical' ? '고전문학' : '현대문학'}_${date}.pdf`
  );

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
      <div className="flex items-center gap-2 mb-4">
        <div className="flex flex-1 bg-gray-100 p-1 rounded-xl">
          <button
            className={`flex-1 py-2 text-sm rounded-lg transition-all font-medium ${subTab === 'classical' ? 'tab-active' : 'tab-inactive'}`}
            onClick={() => setSubTab('classical')}
          >
            고전 문학
          </button>
          <button
            className={`flex-1 py-2 text-sm rounded-lg transition-all font-medium ${subTab === 'modern' ? 'tab-active' : 'tab-inactive'}`}
            onClick={() => setSubTab('modern')}
          >
            현대 문학
          </button>
        </div>
        <button
          onClick={exportToPDF}
          disabled={isExporting}
          className="flex items-center gap-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs px-3 py-2 rounded-xl transition disabled:opacity-50 flex-shrink-0"
        >
          <FileDown className="w-3.5 h-3.5" />
          {isExporting ? '생성 중...' : 'PDF'}
        </button>
      </div>

      <div ref={contentRef}>
        {subTab === 'classical' && <ClassicalLiterature date={date} currentUser={currentUser} />}
        {subTab === 'modern' && <ModernLiterature date={date} currentUser={currentUser} />}
      </div>
    </div>
  );
}
