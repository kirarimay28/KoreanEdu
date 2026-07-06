import { useState } from 'react';
import { Pencil, X, Check, Share2 } from 'lucide-react';
import type { User } from '../../types';
import { getAssignmentNotice, getAssignmentNoticeForWeek, setAssignmentNotice, clearAssignmentNotice } from '../../store';
import { shareAssignmentNotice } from '../../kakao';
import NameWithCrown from '../common/NameWithCrown';

interface Props {
  currentUser: User;
}

const NUMS = Array.from({ length: 100 }, (_, i) => i + 1);

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${DAYS[d.getDay()]})`;
}

const CLASSIC_METHOD = `1. 수능 기출 풀이

1) 문제 풀기

2) 채점하기 (오답 있을 경우 →정답 체크 금지)

3) 오답 정리
-틀린 이유/오답이 오답인 이유/새로 고른 선지가
맞는 선지라고 판단한 근거

4) 선지 단권화
→작품 분석의 근거 추출하기 (문제 푸는 용도 XXX)

2. 임용 기출 문제 유형 분석
→키워드 위주로 분석합니다!
지문/문제/선지 삼단 구조로 꼼꼼히!!

3. 고어 암기 ▶ 매주 20개씩!
→모이는 날에 10분 간 시험 봅니다!`;

const MODERN_METHOD = `1. 수능 기출 풀이

1) 문제 풀기

2) 채점하기 (오답 있을 경우 →정답 체크 금지)

3) 오답 정리
-틀린 이유/오답이 오답인 이유/새로 고른 선지가
맞는 선지라고 판단한 근거

4) 선지 단권화
→작품 분석의 근거 추출하기 (문제 푸는 용도 XXX)

2. 임용 기출 문제 유형 분석
→키워드 위주로 분석합니다!
지문/문제/선지 삼단 구조로 꼼꼼히!!`;

function getThisWeekMonday(): string {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d.toISOString().slice(0, 10);
}

function WorkRow({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const isNone = value === '없음';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">{label}</span>
        <button
          onClick={() => onChange(isNone ? '' : '없음')}
          className={`text-[10px] px-2 py-0.5 rounded-lg border transition ${
            isNone
              ? 'bg-gray-200 text-gray-600 border-gray-300 font-semibold'
              : 'text-gray-300 border-gray-200 hover:border-gray-300 hover:text-gray-500'
          }`}
        >
          없음
        </button>
      </div>
      <input
        disabled={isNone}
        className={`w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300 transition ${isNone ? 'bg-gray-50 text-gray-300' : 'bg-white'}`}
        placeholder={isNone ? '' : placeholder}
        value={isNone ? '' : value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

function WorkDisplay({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <p className="text-sm text-primary-700">
      <span className="font-semibold">{label}</span> ·{' '}
      {value === '없음' ? <span className="text-gray-400 font-normal">없음</span> : value}
    </p>
  );
}

export default function AssignmentNoticeTab({ currentUser }: Props) {
  const canEdit = currentUser.role === 'admin' || currentUser.role === 'subadmin';
  const [editing, setEditing] = useState(false);
  const [tick, setTick] = useState(0);

  const thisWeekMonday = getThisWeekMonday();
  const [date, setDate] = useState(thisWeekMonday);
  const [classicPoetWork, setClassicPoetWork] = useState('');
  const [classicProseWork, setClassicProseWork] = useState('');
  const [modernPoetWork, setModernPoetWork] = useState('');
  const [modernProseWork, setModernProseWork] = useState('');
  const [goeoStart, setGoeoStart] = useState(1);
  const [goeoEnd, setGoeoEnd] = useState(20);

  const notice = getAssignmentNotice();
  const thisWeekNotice = getAssignmentNoticeForWeek(thisWeekMonday);

  function startEdit(editExisting = false) {
    const src = editExisting ? thisWeekNotice : null;
    if (src) {
      setDate(src.date);
      setClassicPoetWork(src.classicPoetWork ?? src.classicWork ?? '');
      setClassicProseWork(src.classicProseWork ?? '');
      setModernPoetWork(src.modernPoetWork);
      setModernProseWork(src.modernProseWork);
      setGoeoStart(src.goeoStart);
      setGoeoEnd(src.goeoEnd);
    } else {
      setDate(thisWeekMonday);
      setClassicPoetWork('');
      setClassicProseWork('');
      setModernPoetWork('');
      setModernProseWork('');
      setGoeoStart(1);
      setGoeoEnd(20);
    }
    setEditing(true);
  }

  function handleSave() {
    setAssignmentNotice({
      date,
      classicPoetWork: classicPoetWork.trim() || (classicPoetWork === '없음' ? '없음' : ''),
      classicProseWork: classicProseWork.trim() || (classicProseWork === '없음' ? '없음' : ''),
      modernPoetWork: modernPoetWork.trim() || (modernPoetWork === '없음' ? '없음' : ''),
      modernProseWork: modernProseWork.trim() || (modernProseWork === '없음' ? '없음' : ''),
      goeoStart,
      goeoEnd,
      createdAt: new Date().toISOString(),
      createdById: currentUser.id,
      createdByName: currentUser.username,
    });
    setEditing(false);
    setTick(t => t + 1);
  }

  function handleClear() {
    if (!window.confirm('과제 공지를 삭제할까요?')) return;
    clearAssignmentNotice(thisWeekNotice?.id);
    setEditing(false);
    setTick(t => t + 1);
  }

  return (
    <div key={tick} className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-700">이번 주 과제</h2>
        {canEdit && !editing && (
          <div className="flex gap-2">
            {thisWeekNotice && (
              <button
                onClick={() => startEdit(true)}
                className="flex items-center gap-1 text-xs font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition"
              >
                <Pencil className="w-3 h-3" />수정
              </button>
            )}
            {!thisWeekNotice && (
              <button
                onClick={() => startEdit(false)}
                className="flex items-center gap-1 text-xs font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition"
              >
                <Pencil className="w-3 h-3" />이번 주 입력
              </button>
            )}
          </div>
        )}
      </div>

      {editing && canEdit ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4 shadow-sm">
          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">날짜</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
            />
          </div>

          {/* Works */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1">작품 <span className="font-normal text-gray-400">(과제 없으면 '없음' 선택)</span></label>
            <WorkRow label="고전 시가" value={classicPoetWork} onChange={setClassicPoetWork} placeholder="고전 시가 작품명 입력" />
            <WorkRow label="고전 산문" value={classicProseWork} onChange={setClassicProseWork} placeholder="고전 산문 작품명 입력" />
            <WorkRow label="현대시" value={modernPoetWork} onChange={setModernPoetWork} placeholder="현대시 작품명 입력" />
            <WorkRow label="현대산문" value={modernProseWork} onChange={setModernProseWork} placeholder="현대산문 작품명 입력" />
          </div>

          {/* Goeo range */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">고어 번호</label>
            <div className="flex items-center gap-2">
              <select
                value={goeoStart}
                onChange={e => setGoeoStart(Number(e.target.value))}
                className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
              >
                {NUMS.map(n => <option key={n} value={n}>{n}번</option>)}
              </select>
              <span className="text-xs text-gray-400 flex-shrink-0">~</span>
              <select
                value={goeoEnd}
                onChange={e => setGoeoEnd(Number(e.target.value))}
                className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
              >
                {NUMS.map(n => <option key={n} value={n}>{n}번</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-1">
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
              className="text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded-lg transition flex items-center gap-1"
            >
              <Check className="w-3 h-3" />등록
            </button>
          </div>
        </div>
      ) : notice ? (
        <div className="space-y-3">
          {!thisWeekNotice && canEdit && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 flex items-center justify-between">
              <p className="text-xs text-amber-700">이번 주 과제가 아직 등록되지 않았습니다.</p>
              <button
                onClick={() => startEdit(false)}
                className="text-xs font-semibold text-amber-700 hover:text-amber-900 underline ml-2 flex-shrink-0"
              >
                이번 주 입력
              </button>
            </div>
          )}
          {/* Date + works summary */}
          <div className="bg-primary-50 border border-primary-100 rounded-2xl px-4 py-3">
            <p className="text-sm font-bold text-primary-800 mb-2">{formatDate(notice.date)}</p>
            <div className="space-y-1">
              {/* New fields: classicPoetWork / classicProseWork */}
              {(notice.classicPoetWork || notice.classicProseWork) ? (
                <>
                  <WorkDisplay label="고전 시가" value={notice.classicPoetWork} />
                  <WorkDisplay label="고전 산문" value={notice.classicProseWork} />
                </>
              ) : notice.classicWork ? (
                <p className="text-sm text-primary-700"><span className="font-semibold">고전</span> · {notice.classicWork}</p>
              ) : null}
              <WorkDisplay label="현대시" value={notice.modernPoetWork} />
              <WorkDisplay label="현대산문" value={notice.modernProseWork} />
            </div>
            <p className="text-[10px] text-primary-400 mt-2"><NameWithCrown name={notice.createdByName} /> 등록</p>
          </div>

          {/* Classic method */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-amber-50 border-b border-amber-100 px-4 py-2">
              <p className="text-xs font-bold text-amber-700">[고전]</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed">{CLASSIC_METHOD}</p>
            </div>
          </div>

          {/* Modern method */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-sky-50 border-b border-sky-100 px-4 py-2">
              <p className="text-xs font-bold text-sky-700">[현대]</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed">{MODERN_METHOD}</p>
            </div>
          </div>

          {/* Warnings */}
          <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 space-y-1">
            <p className="text-xs font-semibold text-red-600">★ 과제 불성실하게 해 오시면 경고 들어갑니다!!</p>
            <p className="text-xs font-semibold text-red-600">★ 이번 주 고전 어휘는 {notice.goeoStart}번부터 {notice.goeoEnd}번까지입니다.</p>
          </div>

          {/* Share button */}
          <button
            onClick={() => shareAssignmentNotice({
              date: notice.date,
              classicPoetWork: notice.classicPoetWork ?? '',
              classicProseWork: notice.classicProseWork ?? '',
              classicWork: notice.classicWork,
              modernPoetWork: notice.modernPoetWork,
              modernProseWork: notice.modernProseWork,
              goeoStart: notice.goeoStart,
              goeoEnd: notice.goeoEnd,
            })}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 px-3 py-2 rounded-xl transition"
          >
            <Share2 className="w-3.5 h-3.5" />카카오톡 공유
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-8 text-center">
          <p className="text-sm text-gray-400 italic">등록된 과제가 없습니다.</p>
          {canEdit && (
            <button
              onClick={() => startEdit(false)}
              className="mt-3 text-xs font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 px-4 py-2 rounded-xl transition"
            >
              과제 입력하기
            </button>
          )}
        </div>
      )}
    </div>
  );
}
