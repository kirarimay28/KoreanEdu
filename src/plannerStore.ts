import { db } from './firebase';
import { collection, doc, setDoc, onSnapshot } from 'firebase/firestore';
import type { PlannerProfile, PlannerChecklist } from './plannerTypes';

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
