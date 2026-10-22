import type { Weekday } from './types';
export type { Weekday };

export type PlannerTag =
  | '통암기·분량 많음'
  | '강조 부분 출제'
  | '예시 중요'
  | '서술형'
  | '다른 작품·자료 출제'
  | '문제 풀이형'
  | '특이사항 없음';

export type SubjectType = 'major' | 'teaching' | 'elective';

export interface SubjectClassTime {
  day: Weekday;
  start: string;
  end: string;
}

export interface PlannerSubject {
  id: string;
  name: string;
  type: SubjectType;
  isCommon: boolean;
  classTimes: SubjectClassTime[];
  examDate?: string;
  noExam: boolean;
  isOnline: boolean;
  tags: PlannerTag[];
  notes: string;
}

export interface PlannerFixedSchedule {
  id: string;
  name: string;
  day: Weekday;
  start: string;
  end: string;
  travelMinutes: number;
  duringExam: boolean;
}

export interface PlannerPersonalSettings {
  studyStart: string;
  studyEnd: string;
  lunchStart: string;
  lunchEnd: string;
  dinnerStart: string;
  dinnerEnd: string;
  sundayRestAfter: string;
}

export const DEFAULT_SETTINGS: PlannerPersonalSettings = {
  studyStart: '09:00',
  studyEnd: '23:30',
  lunchStart: '12:30',
  lunchEnd: '13:30',
  dinnerStart: '18:30',
  dinnerEnd: '19:30',
  sundayRestAfter: '19:30',
};

export interface PlannerProfile {
  userId: string;
  subjects: PlannerSubject[];
  fixedSchedules: PlannerFixedSchedule[];
  settings: PlannerPersonalSettings;
  planMode?: PlanMode;
  updatedAt: string;
}

export type Phase = 0 | 1 | 2 | 3 | 4;

export interface DayStudyBlock {
  start: string;
  end: string;
  subjectId: string;
  subjectName: string;
  label: string;
  blockType: 'class_review' | 'memorize' | 'transit' | 'supplement' | 'study';
}

export interface GeneratedDayPlan {
  date: string;
  dayOfWeek: Weekday;
  studyBlocks: DayStudyBlock[];
  totalStudyMinutes: number;
  hasWarning?: boolean;
  warningText?: string;
}

export interface ChecklistItem {
  id: string;
  phase: Phase;
  subjectId: string;
  subjectName: string;
  isCommon: boolean;
  text: string;
}

export interface PlannerChecklist {
  userId: string;
  username: string;
  completedIds: string[];
  updatedAt: string;
}

// ── Manual planning types ───────────────────────────────────
export type PlanMode = 'auto' | 'manual' | 'auto+edit';

export interface ManualBlock {
  id: string;
  subjectId: string;
  subjectName: string;
  label: string;
  start: string;
  end: string;
  pinned?: boolean;
}

export interface ManualDayPlan {
  date: string;
  blocks: ManualBlock[];
}

export interface ManualWeekTemplate {
  userId: string;
  template: Partial<Record<Weekday, ManualBlock[]>>;
  updatedAt: string;
}

export interface ManualDayOverride {
  userId: string;
  date: string;
  blocks: ManualBlock[];
  updatedAt: string;
}
