import { useState } from 'react';
import { MapPin, ChevronDown, ChevronUp, Pencil, X, Check, Share2 } from 'lucide-react';
import type { User } from '../../types';
import { getLocationNotice, setLocationNotice, clearLocationNotice } from '../../store';
import { shareLocationNotice } from '../../kakao';
import NameWithCrown from '../common/NameWithCrown';

interface Props {
  currentUser: User;
}

const SPACES = ['스터디실1', '스터디실2', '스터디실3', '스터디실4', '기타'];

const TIMES: string[] = [];
for (let h = 6; h <= 23; h++) {
  TIMES.push(`${String(h).padStart(2, '0')}:00`);
  TIMES.push(`${String(h).padStart(2, '0')}:30`);
}
TIMES.push('24:00');

export default function LocationNoticeBar({ currentUser }: Props) {
  const canEdit = currentUser.role === 'admin' || currentUser.role === 'subadmin';

  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [tick, setTick] = useState(0);

  const [spaceName, setSpaceName] = useState('스터디실1');
  const [customSpace, setCustomSpace] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('12:00');
  const [notes, setNotes] = useState('');

  const notice = getLocationNotice();

  function startEdit() {
    if (notice) {
      setSpaceName(notice.spaceName);
      setCustomSpace(notice.customSpace);
      setStartTime(notice.startTime);
      setEndTime(notice.endTime);
      setNotes(notice.notes);
    } else {
      setSpaceName('스터디실1');
      setCustomSpace('');
      setStartTime('09:00');
      setEndTime('12:00');
      setNotes('');
    }
    setEditing(true);
    setExpanded(true);
  }

  function handleSave() {
    const display = spaceName === '기타' ? (customSpace || '기타') : spaceName;
    setLocationNotice({
      spaceName,
      customSpace: spaceName === '기타' ? customSpace : '',
      startTime,
      endTime,
      notes,
      createdAt: new Date().toISOString(),
      createdById: currentUser.id,
      createdByName: currentUser.username,
    });
    setEditing(false);
    setTick(t => t + 1);
    shareLocationNotice({ spaceName: display, startTime, endTime, notes, authorName: currentUser.username });
  }

  function handleClear() {
    if (!window.confirm('장소 공지를 삭제할까요?')) return;
    clearLocationNotice();
    setEditing(false);
    setTick(t => t + 1);
  }

  const displaySpace = notice
    ? (notice.spaceName === '기타' ? notice.customSpace || '기타' : notice.spaceName)
    : null;

  return (
    <div className="mb-3 bg-teal-50 border border-teal-200 rounded-2xl overflow-hidden" key={tick}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-2 flex-1 min-w-0"
        >
          <MapPin className="w-4 h-4 text-teal-500 flex-shrink-0" />
          <span className="text-xs font-bold text-teal-700 uppercase tracking-wide">장소 공지</span>
          {notice && !expanded && (
            <span className="text-xs text-teal-600 font-semibold ml-1 truncate">
              — {displaySpace} {notice.startTime}~{notice.endTime}
            </span>
          )}
          {notice && (
            <span className="text-[10px] text-teal-400 ml-1 flex-shrink-0">by <NameWithCrown name={notice.createdByName} /></span>
          )}
          {expanded
            ? <ChevronUp className="w-3.5 h-3.5 text-teal-400 ml-auto flex-shrink-0" />
            : <ChevronDown className="w-3.5 h-3.5 text-teal-400 ml-auto flex-shrink-0" />}
        </button>
        {canEdit && !editing && (
          <button
            onClick={startEdit}
            className="ml-2 flex items-center gap-1 text-[10px] font-semibold text-teal-600 bg-teal-100 hover:bg-teal-200 px-2 py-1 rounded-lg transition flex-shrink-0"
          >
            <Pencil className="w-3 h-3" />입력
          </button>
        )}
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-teal-100">
          {editing && canEdit ? (
            <div className="px-4 py-3 space-y-2.5">
              {/* Space name */}
              <div>
                <label className="text-[11px] font-semibold text-teal-600 block mb-1">공간명</label>
                <select
                  value={spaceName}
                  onChange={e => setSpaceName(e.target.value)}
                  className="w-full text-sm border border-teal-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-300 bg-white"
                >
                  {SPACES.map(s => <option key={s}>{s}</option>)}
                </select>
                {spaceName === '기타' && (
                  <input
                    className="mt-1.5 w-full text-sm border border-teal-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-300 bg-white"
                    placeholder="장소 직접 입력"
                    value={customSpace}
                    onChange={e => setCustomSpace(e.target.value)}
                  />
                )}
              </div>

              {/* Time */}
              <div>
                <label className="text-[11px] font-semibold text-teal-600 block mb-1">시간</label>
                <div className="flex items-center gap-2">
                  <select
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="flex-1 text-sm border border-teal-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-300 bg-white"
                  >
                    {TIMES.map(t => <option key={t}>{t}</option>)}
                  </select>
                  <span className="text-xs text-teal-400 font-semibold flex-shrink-0">~</span>
                  <select
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="flex-1 text-sm border border-teal-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-300 bg-white"
                  >
                    {TIMES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-[11px] font-semibold text-teal-600 block mb-1">특이사항</label>
                <textarea
                  className="w-full text-sm border border-teal-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-300 bg-white resize-none"
                  rows={2}
                  placeholder="특이사항 (선택)"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>

              <div className="flex gap-2 justify-end">
                {notice && (
                  <button onClick={handleClear} className="text-xs text-red-400 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition flex items-center gap-1">
                    <X className="w-3 h-3" />삭제
                  </button>
                )}
                <button onClick={() => setEditing(false)} className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition">
                  취소
                </button>
                <button
                  onClick={handleSave}
                  disabled={spaceName === '기타' && !customSpace.trim()}
                  className="text-xs font-semibold bg-teal-600 hover:bg-teal-700 disabled:bg-gray-200 disabled:text-gray-400 text-white px-3 py-1.5 rounded-lg transition flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />등록
                </button>
              </div>
            </div>
          ) : notice ? (
            <div className="px-4 py-3 space-y-1.5">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-bold text-teal-800">{displaySpace}</span>
                <span className="text-sm text-teal-700 font-semibold">{notice.startTime} ~ {notice.endTime}</span>
              </div>
              {notice.notes && (
                <p className="text-xs text-teal-700 whitespace-pre-wrap leading-relaxed">{notice.notes}</p>
              )}
              <p className="text-[10px] text-teal-400">{notice.createdByName} · {new Date(notice.createdAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              <button
                onClick={() => shareLocationNotice({ spaceName: displaySpace!, startTime: notice.startTime, endTime: notice.endTime, notes: notice.notes, authorName: notice.createdByName })}
                className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-teal-600 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg transition w-fit"
              >
                <Share2 className="w-3 h-3" />공유하기
              </button>
            </div>
          ) : (
            <p className="px-4 py-3 text-xs text-teal-400 italic">등록된 장소 공지가 없습니다.</p>
          )}
        </div>
      )}
    </div>
  );
}
