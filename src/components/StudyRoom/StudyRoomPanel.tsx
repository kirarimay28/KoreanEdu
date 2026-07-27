import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, ExternalLink } from 'lucide-react';
import type { User } from '../../types';

const RTDB = 'https://foryourgoal-7f49e-default-rtdb.firebaseio.com';
const FORGOAL_URL = 'https://kirarimay28.github.io/ForYourGoal/';

interface LiveEntry {
  name: string;
  running: boolean;
  sec: number;
  at: number;
}

interface Props {
  currentUser: User;
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtTime(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

async function dbGet(path: string): Promise<unknown> {
  try {
    const r = await fetch(`${RTDB}/${path}.json`);
    return r.ok ? r.json() : null;
  } catch { return null; }
}

async function dbPut(path: string, val: unknown): Promise<void> {
  try {
    await fetch(`${RTDB}/${path}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(val),
    });
  } catch { /* network error — ignore */ }
}

// Firebase path keys cannot contain . $ # [ ] /
function toUid(username: string) {
  return username.replace(/[.#$[\]/]/g, '_');
}

export default function StudyRoomPanel({ currentUser }: Props) {
  const uid = toUid(currentUser.username);
  const name = currentUser.username;

  const [running, setRunning] = useState(false);
  const [displaySec, setDisplaySec] = useState(0);
  const [live, setLive] = useState<Record<string, LiveEntry>>({});

  const baseRef = useRef(0);       // accumulated seconds before current run
  const startRef = useRef(0);      // timestamp when current run started
  const runningRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function currentTotal() {
    return runningRef.current
      ? baseRef.current + Math.floor((Date.now() - startRef.current) / 1000)
      : baseRef.current;
  }

  function stopIntervals() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (syncRef.current)  { clearInterval(syncRef.current);  syncRef.current = null; }
  }

  function fetchLive() {
    dbGet('app/live').then(data => {
      if (data && typeof data === 'object') setLive(data as Record<string, LiveEntry>);
    });
  }

  useEffect(() => {
    fetchLive();
    const poll = setInterval(fetchLive, 15000);
    return () => {
      clearInterval(poll);
      stopIntervals();
      if (runningRef.current) {
        dbPut(`app/live/${uid}`, { name, running: false, sec: currentTotal(), at: Date.now() });
      }
    };
  }, [uid, name]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleStart() {
    if (runningRef.current) return;

    // Register in ForYourGoal on first timer start
    const existing = await dbGet(`app/users/${uid}`);
    if (!existing) {
      await dbPut(`app/users/${uid}`, { name, pw: '', createdAt: Date.now() });
    }

    startRef.current = Date.now();
    runningRef.current = true;
    setRunning(true);

    timerRef.current = setInterval(() => {
      setDisplaySec(baseRef.current + Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);

    // Sync live status to RTDB every 30 s
    syncRef.current = setInterval(() => {
      dbPut(`app/live/${uid}`, { name, running: true, sec: currentTotal(), at: Date.now() });
    }, 30000);

    dbPut(`app/live/${uid}`, { name, running: true, sec: baseRef.current, at: Date.now() });
    fetchLive();
  }

  function handlePause() {
    if (!runningRef.current) return;
    baseRef.current = currentTotal();
    runningRef.current = false;
    setRunning(false);
    setDisplaySec(baseRef.current);
    stopIntervals();
    dbPut(`app/live/${uid}`, { name, running: false, sec: baseRef.current, at: Date.now() });
    fetchLive();
  }

  async function handleStop() {
    const total = currentTotal();
    runningRef.current = false;
    setRunning(false);
    stopIntervals();

    // Accumulate study seconds for today in ForYourGoal DB
    const today = todayKey();
    const prev = await dbGet(`app/study/${uid}/${today}`);
    const prevSec = typeof prev === 'number' ? prev : 0;
    await dbPut(`app/study/${uid}/${today}`, prevSec + total);
    await dbPut(`app/live/${uid}`, { name, running: false, sec: 0, at: Date.now() });

    baseRef.current = 0;
    setDisplaySec(0);
    fetchLive();
  }

  const activeMembers = Object.entries(live).filter(([, v]) => v.running);
  const isSelf = (id: string) => id === uid;

  return (
    <div className="mb-4 bg-primary-50 border border-primary-200 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-1">
        <span className="text-[10px] font-bold text-primary-500 uppercase tracking-wide flex-1">
          온라인 스터디룸
        </span>
        <a
          href={FORGOAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-0.5 text-[10px] text-primary-400 hover:text-primary-600 transition"
        >
          <ExternalLink className="w-2.5 h-2.5" />
          전체화면
        </a>
      </div>

      {/* Timer */}
      <div className="flex items-center gap-3 px-4 pb-3 pt-1">
        <span className="text-3xl font-black text-primary-800 tabular-nums flex-1 leading-none">
          {fmtTime(displaySec)}
        </span>
        <div className="flex gap-1.5">
          {!running ? (
            <button
              onClick={handleStart}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm transition active:scale-95"
              style={{ background: 'linear-gradient(135deg, #f02570, #ff70a8)' }}
            >
              <Play className="w-4 h-4 ml-0.5" />
            </button>
          ) : (
            <button
              onClick={handlePause}
              className="w-10 h-10 rounded-full bg-primary-200 text-primary-700 flex items-center justify-center shadow-sm transition active:scale-95"
            >
              <Pause className="w-4 h-4" />
            </button>
          )}
          {displaySec > 0 && (
            <button
              onClick={handleStop}
              className="w-10 h-10 rounded-full bg-white border border-primary-100 text-primary-400 flex items-center justify-center shadow-sm transition active:scale-95"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Live members */}
      <div className="border-t border-primary-100 px-4 py-2">
        {activeMembers.length > 0 ? (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            {activeMembers.map(([id, v]) => (
              <span
                key={id}
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  isSelf(id)
                    ? 'bg-primary-200 text-primary-800'
                    : 'bg-white border border-primary-100 text-primary-600'
                }`}
              >
                {v.name} · {fmtTime(v.sec)}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-primary-300 italic">
            공부 중인 멤버가 없어요. 첫 번째로 시작해 보세요!
          </p>
        )}
      </div>
    </div>
  );
}
