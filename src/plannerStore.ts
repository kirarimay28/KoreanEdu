import { db } from './firebase';
import { collection, doc, setDoc, onSnapshot } from 'firebase/firestore';
import type { PlannerProfile, PlannerChecklist, ManualWeekTemplate, ManualDayOverride } from './plannerTypes';

const PROFILE_KEY = (uid: string) => `planner_v1_${uid}`;

// ── Personal profile (localStorage) ─────────────────────────
export function loadPlannerProfile(userId: string): PlannerProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY(userId));
    if (raw) return JSON.parse(raw) as PlannerProfile;
  } catch {}
  return null;
}

export function savePlannerProfile(profile: PlannerProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY(profile.userId), JSON.stringify({
      ...profile,
      updatedAt: new Date().toISOString(),
    }));
  } catch {}
}

// ── Checklist completions (Firestore — shared) ───────────────
export async function savePlannerChecklist(cl: PlannerChecklist): Promise<void> {
  try {
    await setDoc(doc(db, 'plannerChecklists', cl.userId), {
      ...cl, updatedAt: new Date().toISOString(),
    });
  } catch (e) { console.warn('savePlannerChecklist', e); }
}

export function subscribePlannerChecklists(
  cb: (list: PlannerChecklist[]) => void
): () => void {
  return onSnapshot(
    collection(db, 'plannerChecklists'),
    snap => cb(snap.docs.map(d => d.data() as PlannerChecklist)),
    err => console.warn('plannerChecklists listener', err)
  );
}

// ── Manual planning storage (localStorage) ───────────────────
const TEMPLATE_KEY = (uid: string) => `manual_template_v1_${uid}`;
const OVERRIDE_KEY = (uid: string, date: string) => `manual_override_v1_${uid}_${date}`;

export function loadManualTemplate(userId: string): ManualWeekTemplate | null {
  try {
    const raw = localStorage.getItem(TEMPLATE_KEY(userId));
    if (raw) return JSON.parse(raw) as ManualWeekTemplate;
  } catch {}
  return null;
}

export function saveManualTemplate(t: ManualWeekTemplate): void {
  try {
    localStorage.setItem(TEMPLATE_KEY(t.userId), JSON.stringify({
      ...t, updatedAt: new Date().toISOString(),
    }));
  } catch {}
}

export function loadManualOverride(userId: string, date: string): ManualDayOverride | null {
  try {
    const raw = localStorage.getItem(OVERRIDE_KEY(userId, date));
    if (raw) return JSON.parse(raw) as ManualDayOverride;
  } catch {}
  return null;
}

export function saveManualOverride(o: ManualDayOverride): void {
  try {
    localStorage.setItem(OVERRIDE_KEY(o.userId, o.date), JSON.stringify({
      ...o, updatedAt: new Date().toISOString(),
    }));
  } catch {}
}

export function loadAllManualOverrides(userId: string): ManualDayOverride[] {
  const prefix = `manual_override_v1_${userId}_`;
  const result: ManualDayOverride[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const raw = localStorage.getItem(key);
        if (raw) result.push(JSON.parse(raw) as ManualDayOverride);
      }
    }
  } catch {}
  return result;
}
