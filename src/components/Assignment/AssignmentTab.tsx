import { useState } from 'react';
import type { User } from '../../types';
import { ExternalLink, TableProperties, ClipboardCheck } from 'lucide-react';
import CheckListTab from './CheckListTab';

interface Props {
  currentUser: User;
}

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1rPRuuV52CVxT3-nsb8n5xFx_KXXe02BRMDveB5n0fyc/edit?usp=drive_link';
const SHEET_EMBED = 'https://docs.google.com/spreadsheets/d/1rPRuuV52CVxT3-nsb8n5xFx_KXXe02BRMDveB5n0fyc/htmlview?widget=true&headers=false';

type SubTab = 'sheet' | 'checklist';

export default function AssignmentTab({ currentUser }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('sheet');

  return (
    <div>
      {/* Sub-tab bar */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl">
        <button
          onClick={() => setSubTab('sheet')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-all ${subTab === 'sheet' ? 'tab-active' : 'tab-inactive'}`}
        >
          <TableProperties className="w-3.5 h-3.5" />
          스프레드시트
        </button>
        <button
          onClick={() => setSubTab('checklist')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-all ${subTab === 'checklist' ? 'tab-active' : 'tab-inactive'}`}
        >
          <ClipboardCheck className="w-3.5 h-3.5" />
          체크리스트
        </button>
      </div>

      {subTab === 'sheet' && (
        <div className="space-y-4">
          <a
            href={SHEET_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md hover:border-primary-200 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0 group-hover:bg-green-100 transition">
              <TableProperties className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-800">과제 스프레드시트</p>
              <p className="text-xs text-gray-400 mt-0.5">Google Sheets에서 열기</p>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-primary-400 transition flex-shrink-0" />
          </a>

          <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-white">
            <iframe
              src={SHEET_EMBED}
              className="w-full"
              style={{ height: '70vh', minHeight: 400 }}
              title="과제 스프레드시트"
            />
          </div>
        </div>
      )}

      {subTab === 'checklist' && <CheckListTab currentUser={currentUser} />}
    </div>
  );
}
