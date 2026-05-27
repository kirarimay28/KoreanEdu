import { useState, useEffect } from 'react';
import type { ReflectionEntry, User } from '../../types';
import { getReflectionEntryForDate, upsertReflectionEntry } from '../../store';
import { Save, CheckCircle } from 'lucide-react';

interface Props {
  date: string;
  currentUser: User;
}

function emptyEntry(date: string, userId: string): ReflectionEntry {
  return {
    id: crypto.randomUUID(),
    date,
    userId,
    insufficientParts: '',
    improvementDirection: '',
  };
}

export default function ReflectionTab({ date, currentUser }: Props) {
  const [entry, setEntry] = useState<ReflectionEntry>(emptyEntry(date, currentUser.id));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const existing = getReflectionEntryForDate(date, currentUser.id);
    setEntry(existing ?? emptyEntry(date, currentUser.id));
    setSaved(false);
  }, [date, currentUser.id]);

  function handleSave() {
    upsertReflectionEntry(entry);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const hasContent = entry.insufficientParts.trim() || entry.improvementDirection.trim();

  return (
    <div className="space-y-4">
      {saved && (
        <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-3 rounded-xl border border-green-100">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-medium">오늘의 반성이 저장되었습니다.</span>
        </div>
      )}

      <div className="card">
        <div className="space-y-5">
          <div>
            <label className="label text-base font-semibold text-gray-800">
              부족했던 부분
            </label>
            <p className="text-xs text-gray-400 mb-2">오늘 공부하면서 부족하거나 아쉬웠던 점을 솔직하게 적어보세요.</p>
            <textarea
              className="textarea-field"
              rows={5}
              placeholder="예: 고전 문법 분석이 여전히 어렵다. 시간 배분이 제대로 되지 않았다..."
              value={entry.insufficientParts}
              onChange={e => setEntry(prev => ({ ...prev, insufficientParts: e.target.value }))}
            />
          </div>

          <div>
            <label className="label text-base font-semibold text-gray-800">
              보완 방향성
            </label>
            <p className="text-xs text-gray-400 mb-2">내일 혹은 앞으로 어떻게 보완할지 구체적인 방향을 적어보세요.</p>
            <textarea
              className="textarea-field"
              rows={5}
              placeholder="예: 내일은 고전 문법 핵심 정리 노트를 반드시 복습한다. 시간표를 미리 짜서 과목별 시간을 배분한다..."
              value={entry.improvementDirection}
              onChange={e => setEntry(prev => ({ ...prev, improvementDirection: e.target.value }))}
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={!hasContent}
              className="flex items-center gap-2 btn-primary text-sm py-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              저장
            </button>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-4">
        <p className="text-xs font-semibold text-amber-700 mb-1">오늘의 다짐</p>
        <p className="text-sm text-amber-800 italic">"{currentUser.resolution}"</p>
      </div>
    </div>
  );
}
