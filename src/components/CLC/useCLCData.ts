import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export interface CLCAssignment {
  courseKjkey: string;
  courseName: string;
  title: string;
  deadline: string | null;
  submitted: boolean;
}

export interface CLCLecture {
  courseKjkey: string;
  courseName: string;
  weekNo: number;
  title: string;
  attendStart: string | null;
  attendEnd: string | null;
  completed: boolean;
}

export interface CLCData {
  courses: { kjkey: string; name: string; section: string; schedule: string }[];
  assignments: CLCAssignment[];
  lectures: CLCLecture[];
  notices: { courseKjkey: string; courseName: string; title: string; date: string | null; seq: string }[];
  updatedAt: string;
}

export interface CLCCredMeta {
  connectedAt: string;
  enabled: boolean;
}

export function useCLCData(uid: string) {
  const [credMeta, setCredMeta] = useState<CLCCredMeta | null>(null);
  const [data, setData] = useState<CLCData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    const unsub1 = onSnapshot(doc(db, 'clcCredentials', uid), snap => {
      setCredMeta(snap.exists() ? (snap.data() as CLCCredMeta) : null);
      setLoading(false);
    });
    const unsub2 = onSnapshot(doc(db, 'clcData', uid), snap => {
      setData(snap.exists() ? (snap.data() as CLCData) : null);
    });
    return () => { unsub1(); unsub2(); };
  }, [uid]);

  return { credMeta, data, loading };
}

// Deadlines = assignments + lecture attend-ends, sorted by date
export function getUpcomingDeadlines(data: CLCData | null, now = new Date()) {
  if (!data) return [];

  type Deadline = {
    type: 'assignment' | 'lecture';
    label: string;
    courseName: string;
    deadline: Date;
    done: boolean;
  };

  const items: Deadline[] = [];

  for (const a of data.assignments) {
    if (!a.deadline) continue;
    const d = new Date(a.deadline);
    items.push({ type: 'assignment', label: a.title, courseName: a.courseName, deadline: d, done: a.submitted });
  }

  for (const l of data.lectures) {
    if (!l.attendEnd) continue;
    const d = new Date(l.attendEnd);
    items.push({ type: 'lecture', label: l.title, courseName: l.courseName, deadline: d, done: l.completed });
  }

  return items
    .filter(i => i.deadline >= now || !i.done)
    .sort((a, b) => a.deadline.getTime() - b.deadline.getTime());
}
