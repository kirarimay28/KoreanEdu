import { useState } from 'react';
import { Link2, Link2Off, RefreshCw, ChevronRight, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useCLCData } from './useCLCData';

interface Props {
  uid: string;
}

export default function CLCSettings({ uid }: Props) {
  const { credMeta, data, loading } = useCLCData(uid);
  const [section, setSection] = useState<'consent' | 'form' | null>(null);
  const [clcId, setClcId] = useState('');
  const [clcPwd, setClcPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [syncMsg, setSyncMsg] = useState('');

  const isConnected = !!credMeta?.enabled;

  async function handleConnect() {
    if (!clcId.trim() || !clcPwd) { setError('아이디와 비밀번호를 입력해 주세요.'); return; }
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/clc/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, clcId: clcId.trim(), clcPwd }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? '연결 실패');
      setSection(null);
      setClcId(''); setClcPwd('');
      // Auto-sync after connect
      await fetch('/api/clc/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid }),
      });
    } catch (e: any) {
      setError(e.message ?? '연결 중 오류가 발생했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSync() {
    setBusy(true); setSyncMsg('');
    try {
      const res = await fetch('/api/clc/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? '동기화 실패');
      setSyncMsg('동기화 완료!');
      setTimeout(() => setSyncMsg(''), 4000);
    } catch (e: any) {
      setSyncMsg(e.message ?? '동기화 오류');
    } finally {
      setBusy(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm('CLC 연동을 해제하면 저장된 과제·강의 데이터가 삭제됩니다.\n계속하시겠습니까?')) return;
    setBusy(true);
    try {
      await fetch('/api/clc/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid }),
      });
      setSection(null);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return null;

  return (
    <div className="space-y-3">
      {/* Connected state */}
      {isConnected ? (
        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">조선대 사이버캠퍼스 연동됨</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {data ? `마지막 동기화: ${new Date(data.updatedAt).toLocaleString('ko-KR')}` : '동기화 대기 중'}
              </p>
            </div>
          </div>
          {data && (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-blue-50 rounded-xl py-2">
                <p className="text-lg font-bold text-blue-600">{data.assignments.length}</p>
                <p className="text-xs text-blue-500">과제</p>
              </div>
              <div className="bg-purple-50 rounded-xl py-2">
                <p className="text-lg font-bold text-purple-600">{data.lectures.length}</p>
                <p className="text-xs text-purple-500">온라인강의</p>
              </div>
              <div className="bg-orange-50 rounded-xl py-2">
                <p className="text-lg font-bold text-orange-600">{data.notices.length}</p>
                <p className="text-xs text-orange-500">공지사항</p>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleSync}
              disabled={busy}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-xl bg-primary-50 text-primary-600 hover:bg-primary-100 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />
              {busy ? '동기화 중...' : '지금 동기화'}
            </button>
            <button
              onClick={handleDisconnect}
              disabled={busy}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition disabled:opacity-50"
            >
              <Link2Off className="w-3.5 h-3.5" />
              연동 해제
            </button>
          </div>
          {syncMsg && (
            <p className={`text-xs text-center font-medium ${syncMsg.includes('완료') ? 'text-green-600' : 'text-red-500'}`}>
              {syncMsg}
            </p>
          )}
        </div>
      ) : (
        /* Not connected */
        <>
          {section === null && (
            <button
              onClick={() => setSection('consent')}
              className="w-full flex items-center gap-3 px-4 py-4 card hover:bg-gray-50 transition"
            >
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                <Link2 className="w-4.5 h-4.5 text-indigo-500" style={{ width: '18px', height: '18px' }} />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-gray-800">사이버캠퍼스(CLC) 연동</p>
                <p className="text-xs text-gray-400 mt-0.5">과제·강의 마감일 자동 수집</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
            </button>
          )}

          {/* Consent screen */}
          {section === 'consent' && (
            <div className="card space-y-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-800 mb-2">연동 전 확인해 주세요</p>
                  <ul className="space-y-1.5 text-xs text-gray-600 list-disc list-inside">
                    <li>아이디·비밀번호는 서버에서만 사용되며, 앱에 저장되지 않습니다.</li>
                    <li>비밀번호는 AES-256 암호화 후 저장되며, 원문은 어디에도 기록되지 않습니다.</li>
                    <li>수집 데이터: 과제 마감일, 온라인강의 출석기간, 공지사항 제목</li>
                    <li>하루 3회(07:00, 13:00, 21:00) 자동 동기화됩니다.</li>
                    <li>언제든 설정에서 연동을 해제하면 모든 데이터가 삭제됩니다.</li>
                  </ul>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSection(null)}
                  className="flex-1 py-2 text-xs font-medium rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
                >
                  취소
                </button>
                <button
                  onClick={() => setSection('form')}
                  className="flex-1 py-2 text-xs font-semibold rounded-xl bg-primary-500 text-white hover:bg-primary-600 transition"
                >
                  동의하고 계속
                </button>
              </div>
            </div>
          )}

          {/* Credential form */}
          {section === 'form' && (
            <div className="card space-y-3">
              <p className="text-sm font-semibold text-gray-800">CLC 로그인 정보 입력</p>
              <input
                type="text"
                placeholder="학번 (예: A20253350)"
                value={clcId}
                onChange={e => setClcId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary-400"
                autoComplete="off"
              />
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="비밀번호"
                  value={clcPwd}
                  onChange={e => setClcPwd(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleConnect()}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary-400 pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {error && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />{error}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => { setSection('consent'); setError(''); }}
                  className="flex-1 py-2 text-xs font-medium rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
                >
                  이전
                </button>
                <button
                  onClick={handleConnect}
                  disabled={busy}
                  className="flex-1 py-2 text-xs font-semibold rounded-xl bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50 transition"
                >
                  {busy ? '연결 중...' : '연결'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
