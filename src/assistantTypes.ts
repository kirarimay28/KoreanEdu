export const ASSISTANT_OWNER = '서연';

export type StudyMode = '방학' | '학기';
export type SpeechStyle = '반말' | '존댓말';
export type AssistantWeekday = '월' | '화' | '수' | '목' | '금' | '토' | '일';
export const ALL_AWEEKDAYS: AssistantWeekday[] = ['월', '화', '수', '목', '금', '토', '일'];

export type ImyongSubject = '문법' | '문학' | '국교론';
export type ASubject = ImyongSubject | '학기과목';
export const ASUBJECTS: ImyongSubject[] = ['문법', '문학', '국교론'];

export type BlockStatus = '예정' | '진행' | '완료' | '부분' | '미완' | '건너뜀';

export type StudyBlockType =
  | '문법_정독' | '문법_카드' | '문법_서술형'
  | '문학_강의복습' | '문학_작품분석' | '문학_기출'
  | '국교론_강의복습' | '국교론_단권화' | '국교론_기출'
  | '주말강의' | '주간복습' | '자투리' | '모의고사'
  | '학기_복습' | '학기_예습';

export interface CustomDndSlot {
  id: string;
  label: string;
  days: AssistantWeekday[];
  start: string;
  end: string;
  enabled: boolean;
}

export interface DndConfig {
  commuteDnd: true;
  classDnd: boolean;
  workDnd: boolean;
  sleepDnd: boolean;
  sleepStart: string;
  sleepEnd: string;
  customSlots: CustomDndSlot[];
}

export interface UrgentConfig {
  deadlineHours: number;
  examMinutes: number;
  conflictHours: number;
  maxUrgentPerDay: number;
}

export interface AssistantSettings {
  userId: string;
  speechStyle: SpeechStyle;
  wakeTime: string;
  blockStartWarningMin: number;
  commuteWarningMin: number;
  dailyNotifLimit: number;
  bufferMinutes: number;
  minBlockMin: number;
  defaultBlockMin: number;
  ratios: Record<ImyongSubject, number>;
  dnd: DndConfig;
  urgent: UrgentConfig;
  updatedAt: string;
}

export function defaultSettings(userId: string): AssistantSettings {
  return {
    userId,
    speechStyle: '반말',
    wakeTime: '07:00',
    blockStartWarningMin: 5,
    commuteWarningMin: 30,
    dailyNotifLimit: 20,
    bufferMinutes: 60,
    minBlockMin: 45,
    defaultBlockMin: 90,
    ratios: { '문법': 3, '문학': 2.5, '국교론': 2.5 },
    dnd: {
      commuteDnd: true,
      classDnd: true,
      workDnd: true,
      sleepDnd: true,
      sleepStart: '23:30',
      sleepEnd: '07:00',
      customSlots: [],
    },
    urgent: { deadlineHours: 3, examMinutes: 60, conflictHours: 2, maxUrgentPerDay: 3 },
    updatedAt: new Date().toISOString(),
  };
}

// ── Class Timetable ──────────────────────────────────────────
export interface ClassTime {
  day: AssistantWeekday;
  start: string;
  end: string;
  location?: string;
}

export interface ClassSubject {
  id: string;
  name: string;
  times: ClassTime[];
}

export interface ClassTimetable {
  userId: string;
  semesterStart: string;
  semesterEnd: string;
  subjects: ClassSubject[];
  updatedAt: string;
}

// ── Work Schedule ────────────────────────────────────────────
export interface WorkDaySlot {
  day: AssistantWeekday;
  start: string;
  end: string;
}

export interface WorkSchedule {
  userId: string;
  slots: WorkDaySlot[];
  commuteMinutes: number;
  returnMinutes: number;
  updatedAt: string;
}

// ── Schedule Exception ───────────────────────────────────────
export type ExceptionType = '휴강' | '대타근무' | '공휴일' | '근무시간변경' | '기타';

export interface ScheduleException {
  id: string;
  userId: string;
  date: string;
  type: ExceptionType;
  description: string;
  workStart?: string;
  workEnd?: string;
  cancelledSubjectId?: string;
  createdAt: string;
}

// ── Lecture Slot ─────────────────────────────────────────────
export type LectureSource =
  | '이환_문학키워드' | '이환_문학지식구조'
  | '이환_국교론키워드' | '이환_국교론지식구조'
  | '박세현_문법' | 'THE합격문제' | '기타';

export interface LectureSlot {
  id: string;
  userId: string;
  source: LectureSource;
  day: AssistantWeekday;
  start: string;
  end: string;
  subject: ASubject;
  notes?: string;
  updatedAt: string;
}

// ── Deadline ─────────────────────────────────────────────────
export type DeadlineType = '모의고사' | '강의신청' | '원서접수' | '시험일' | '2차일정' | '과제제출' | '기타';

export interface AssistantDeadline {
  id: string;
  userId: string;
  title: string;
  date: string;
  time?: string;
  type: DeadlineType;
  urgentHoursBefore: number;
  reminderDaysBefore: number[];
  isUrgent?: boolean;
  completed: boolean;
  createdAt: string;
}

// ── Study Config ─────────────────────────────────────────────
export interface StudyConfig {
  userId: string;
  mode: StudyMode;
  vacationStartDate?: string;
  minBlockMin: number;
  defaultBlockMin: number;
  bufferMinutes: number;
  ratios: Record<ImyongSubject, number>;
  studyStartTime: string;
  studyEndTime: string;
  updatedAt: string;
}

export function defaultStudyConfig(userId: string): StudyConfig {
  return {
    userId,
    mode: '방학',
    minBlockMin: 45,
    defaultBlockMin: 90,
    bufferMinutes: 60,
    ratios: { '문법': 3, '문학': 2.5, '국교론': 2.5 },
    studyStartTime: '09:00',
    studyEndTime: '23:30',
    updatedAt: new Date().toISOString(),
  };
}

// ── Study Block ──────────────────────────────────────────────
export interface StudyBlock {
  id: string;
  userId: string;
  date: string;
  start: string;
  end: string;
  subject: ASubject;
  blockType: StudyBlockType;
  label: string;
  weekNum?: number;
  status: BlockStatus;
  actualMinutes?: number;
  skipReason?: string;
  carriedFrom?: string;
  timerStartedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Weekly Check ─────────────────────────────────────────────
export const WEEKLY_CHECKS = [
  { id: 'grammar_read', label: '문법 범위 정독 완료 + 쟁점 카드 백지 통과' },
  { id: 'lecture_4',    label: '이환 강의 4개 + 복습 완료' },
  { id: 'lit_cards_5',  label: '문학 작품 키워드 카드 5편 이상 추가' },
  { id: 'speech_map',   label: '화법 지식구조도 갱신' },
  { id: 'essay_12',     label: '서술형 12문항 이상 + 오답 재작성 통과' },
] as const;

export interface WeeklyCheckResult {
  id: string;
  userId: string;
  weekKey: string;
  checks: Record<string, boolean>;
  note?: string;
  updatedAt: string;
}

// ── Card Checklist ───────────────────────────────────────────
export interface CardCheckItem {
  id: string;
  userId: string;
  subject: ASubject;
  chapter: string;
  items: string[];
  completedItems: string[];
  updatedAt: string;
}

// ── Grades ───────────────────────────────────────────────────
export type GrammarTag = '음운' | '형태' | '통사' | '의미·화용' | '규범' | '국어사';
export type LiteratureTag = '고전시가' | '고전산문' | '현대시' | '현대소설' | '극·수필';
export type KorEduTag = '화법' | '독서' | '작문' | '매체';
export type SubjectAreaTag = GrammarTag | LiteratureTag | KorEduTag;

export interface SubjectScore {
  subject: ASubject;
  score: number;
  maxScore: number;
  tag?: SubjectAreaTag;
}

export interface MockScore {
  id: string;
  userId: string;
  source: string;
  round: string;
  date: string;
  subjectScores: SubjectScore[];
  totalScore: number;
  totalMaxScore: number;
  createdAt: string;
}

export interface EssayElement {
  id: string;
  name: string;
  met: boolean;
  note?: string;
}

export interface EssayGrade {
  id: string;
  userId: string;
  source: '기출' | '문제집';
  examYear?: string;
  examType?: '전공A' | '전공B';
  examNum?: number;
  subject: ASubject;
  tag: SubjectAreaTag;
  timeLimitSec: number;
  actualSec: number;
  elements: EssayElement[];
  rewritePassed?: boolean;
  createdAt: string;
}

export interface CourseGrade {
  id: string;
  userId: string;
  semester: string;
  courseName: string;
  credits: number;
  grade: string;
  gradePoint: number;
  createdAt: string;
}

// ── Memo ─────────────────────────────────────────────────────
export interface AssistantMemo {
  id: string;
  userId: string;
  content: string;
  category?: string;
  createdAt: string;
  source?: 'auto' | 'user';
}

// ── Vacation Curriculum ──────────────────────────────────────
export interface WeekCurriculum {
  weekNum: number;
  grammar: string;
  literature: string;
  korEdu: string;
  hasMockExam: boolean;
}

export const VACATION_CURRICULUM: WeekCurriculum[] = [
  { weekNum: 1, grammar: '1권 1장~2장 앞: 음운 체계, 음절', literature: '고전시가 개관, 상대 가요·향가', korEdu: '화법 교육과정 성취기준, 의사소통 모형', hasMockExam: false },
  { weekNum: 2, grammar: '1권 2장 뒤: 음운 변동, 적용 순서', literature: '고려가요, 경기체가', korEdu: '자아 노출, 대화 원리(협력·공손)', hasMockExam: false },
  { weekNum: 3, grammar: '1권 3장 앞: 형태소, 품사, 활용', literature: '시조(평시조 → 사설시조)', korEdu: '면담, 협상', hasMockExam: false },
  { weekNum: 4, grammar: '1권 3장 뒤: 파생·합성', literature: '가사, 악장·한시', korEdu: '토의, 토론', hasMockExam: true },
  { weekNum: 5, grammar: '1권 4장 앞: 문장 성분, 문장 짜임', literature: '설화·가전체·한문 산문', korEdu: '발표·연설, 청중 분석', hasMockExam: false },
  { weekNum: 6, grammar: '1권 4장 뒤: 높임·시간·피사동·부정', literature: '고전소설(영웅·애정·가정)', korEdu: '듣기 교육, 불안·비언어', hasMockExam: false },
  { weekNum: 7, grammar: '2권 5~8장: 의미·화용·텍스트·어휘', literature: '판소리·판소리계 소설, 민속극', korEdu: '화법 평가·지도 방법', hasMockExam: false },
  { weekNum: 8, grammar: '2권 9장: 어문 규범', literature: '고전문학 기출 총정리', korEdu: '화법 기출 총정리', hasMockExam: true },
];

export const CARD_CHECKLIST_SEED: Array<{ subject: ASubject; chapter: string }> = [
  { subject: '문법', chapter: '음운 체계·음절' },
  { subject: '문법', chapter: '음운 변동' },
  { subject: '문법', chapter: '형태소·품사·활용' },
  { subject: '문법', chapter: '파생·합성' },
  { subject: '문법', chapter: '문장 성분·짜임' },
  { subject: '문법', chapter: '높임·시간·피사동·부정' },
  { subject: '문법', chapter: '의미·화용·텍스트·어휘' },
  { subject: '문법', chapter: '어문 규범' },
  { subject: '문학', chapter: '고전시가 개관·상대가요·향가' },
  { subject: '문학', chapter: '고려가요·경기체가' },
  { subject: '문학', chapter: '시조' },
  { subject: '문학', chapter: '가사·악장·한시' },
  { subject: '문학', chapter: '설화·가전체·한문산문' },
  { subject: '문학', chapter: '고전소설' },
  { subject: '문학', chapter: '판소리·판소리계소설·민속극' },
  { subject: '국교론', chapter: '화법 교육과정·의사소통' },
  { subject: '국교론', chapter: '자아노출·대화원리' },
  { subject: '국교론', chapter: '면담·협상' },
  { subject: '국교론', chapter: '토의·토론' },
  { subject: '국교론', chapter: '발표·연설' },
  { subject: '국교론', chapter: '듣기교육' },
  { subject: '국교론', chapter: '화법 평가·지도 방법' },
  { subject: '국교론', chapter: '화법 기출 총정리' },
];

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ProposalData {
  type: 'study_block' | 'deadline' | 'memo';
  action: 'add' | 'edit' | 'delete' | 'skip';
  summary: string;
  reason: string;
  data?: Record<string, unknown>;
}
