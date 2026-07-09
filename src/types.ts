export type UserRole = 'admin' | 'subadmin' | 'member';

export interface UserRestrictions {
  noStudyView?: boolean;
  noLibraryDownload?: boolean;
  noVacationRequest?: boolean;
  noResourceRequest?: boolean;
}

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  resolution: string;
  createdAt: string;
  role?: UserRole;
  restrictions?: UserRestrictions;
}

export type ExamStatus = 'O' | '△' | 'X' | '';

export interface ClassicalLiteratureEntry {
  id: string;
  date: string;
  userId: string;
  workName: string;
  author: string;
  examYear: string;
  genre: string;
  literatureType: '서정' | '서사' | '';

  // 서정 — 시적 화자
  speaker: string;
  speakerTarget: string;
  speakerConcern: string;
  speakerSituation: string;
  poeticSituation: string;
  bgTime: string;
  bgSpace: string;
  emotion: string;
  tone1: string;
  tone2: string;
  character1: string;
  character2: string;
  theme: string;
  rhythm: string;
  imagery: string;
  significance: string;

  // 서정 — 표현
  poeticDevelopment: string;
  expressiveFeatures: string;

  // 서정 — 시의 언어
  poeticDiction: string;
  phrases: string;

  // 서사 fields
  authorDescription: string;
  workCharacter: string;
  titleMeaning: string;
  characters: string;
  viewpoint: string;
  event1: string;
  event2: string;
  event3: string;
  narrativeConflict: string;
  narrativeFeature1: string;
  narrativeFeature2: string;
  narrativeFeature3: string;
  keyMaterials: string;
  literaryMeaning: string;
  intertextuality: string;
  examPoints: string;

  examAnswer: string;
  feedbacks: Feedback[];
}

export interface ModernLiteratureEntry {
  id: string;
  date: string;
  userId: string;
  workName: string;
  author: string;
  examYear: string;
  answerDraft: string;
  modelAnswerReview: string;
  thoughtProcess: string;
  feedbacks: Feedback[];
}

export interface Feedback {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export type PersonalSubject = '국교론' | '교육학' | '중세문법' | '현대문법' | '한능검' | '기타';

export interface PersonalStudyEntry {
  id: string;
  date: string;
  userId: string;
  subject: string;        // kept as string for backward compat with old data
  customSubject: string;
  plannerActivity: string;   // replaces curriculum; '회독'|'기출풀이'|'기출분석'|'강의수강'|'단권화'|'오답정리'|'기타'
  customActivity: string;    // for 기타 planner
  examStatus: ExamStatus;
  feedbackCategories: string[];  // multi-select: '집중 부족'|'오답 다수 발생'|'개념 이해 부족'|'키워드 오류'
  feedback: string;
  studySeconds: number;      // timer-based net study time in seconds
  studyHours: number | '';   // kept for backward compat
  studyContent?: string;     // what to study today (per subject)
  estimatedMinutes?: number; // estimated study time in minutes
  manuallyCompleted?: boolean; // user clicked 완료 before reaching goal → △
}

export interface ReflectionEntry {
  id: string;
  date: string;
  userId: string;
  insufficientParts: string;
  improvementDirection: string;
}

export interface AttendanceEntry {
  id: string;
  date: string;
  userId: string;
  username: string;
  markedAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  pinned?: boolean;
}

export interface QnAPost {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

export interface QnAComment {
  id: string;
  postId: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  content: string;
  createdAt: string;
  read: boolean;
}

export interface Warning {
  id: string;
  targetUserId: string;
  targetUsername: string;
  reason: string;
  issuedAt: string;
  issuedById: string;
  issuedByName: string;
}

export type VacationReason = '질병' | '여행' | '가족 모임' | '기타';
export type VacationStatus = '대기중' | '승인' | '거절';

export interface VacationRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  createdAt: string;
  vacationDate: string;
  reason: VacationReason;
  customReason: string;
  makeupDate: string;
  status: VacationStatus;
  reviewedAt?: string;
  reviewedById?: string;
  reviewedByName?: string;
}

export interface EducationAnswer {
  id: string;
  weekKey: string;
  userId: string;
  username: string;
  answer: string;
  createdAt: string;
  updatedAt?: string;
  likes: string[];
  dislikes: string[];
}

export interface LocationNotice {
  id: 'current';
  spaceName: string;
  customSpace: string;
  startTime: string;
  endTime: string;
  notes: string;
  createdAt: string;
  createdById: string;
  createdByName: string;
}

export interface AssignmentNotice {
  id: string;              // weekKey (YYYY-MM-DD, Monday)
  date: string;            // YYYY-MM-DD
  classicWork?: string;    // deprecated — kept for backward compat
  classicPoetWork: string; // 고전 시가 작품명 ('없음' = 과제 없음)
  classicProseWork: string;// 고전 산문 작품명 ('없음' = 과제 없음)
  modernPoetWork: string;  // 현대시 작품명 ('없음' = 과제 없음)
  modernProseWork: string; // 현대산문 작품명 ('없음' = 과제 없음)
  goeoStart: number;       // 고어 시작 번호 1-100
  goeoEnd: number;         // 고어 끝 번호 1-100
  createdAt: string;
  createdById: string;
  createdByName: string;
}

export interface StudySessionNote {
  id: string;       // `${userId}_${date}`
  date: string;
  userId: string;
  username: string;
  content: string;  // JSON string of AI analysis fields
  createdAt: string;
  updatedAt: string;
  createdById: string;
  createdByName: string;
}

export type FineType = '지각' | '과제' | '일지';

export interface FineRecord {
  id: string;
  type: FineType;
  targetUserId: string;
  targetUsername: string;
  amount: number;        // 원 단위
  reason: string;        // 세부 사유 (ex: "18:12 도착", "미수행 2작품")
  weekKey: string;       // YYYY-MM-DD (해당 주 월요일)
  issuedAt: string;
  issuedById: string;
  issuedByName: string;
  paid: boolean;
  paidAt?: string;
}

export interface AppData {
  users: User[];
  classicalEntries: ClassicalLiteratureEntry[];
  modernEntries: ModernLiteratureEntry[];
  personalStudyEntries: PersonalStudyEntry[];
  reflectionEntries: ReflectionEntry[];
  attendanceEntries: AttendanceEntry[];
  resourceRequests: ResourceRequest[];
  announcements: Announcement[];
  warnings: Warning[];
  vacations: VacationRequest[];
  educationAnswers: EducationAnswer[];
  qnaPosts: QnAPost[];
  qnaComments: QnAComment[];
  messages: Message[];
  assignmentChecks: AssignmentCheck[];
  calendarEvents: CalendarEvent[];
  libraryItems: LibraryItem[];
  vocabTestScores: VocabTestScore[];
  peerFeedbacks: PeerFeedback[];
  studyLogs: StudyLog[];
  locationNotice: LocationNotice | null;
  assignmentNotices: AssignmentNotice[];
  vocabExamRecords: VocabExamRecord[];
  studySessionNotes: StudySessionNote[];
  fines: FineRecord[];
}

export interface LibraryItem {
  id: string;
  title: string;
  description: string;
  tag: string;
  downloadUrl: string;
  storagePath: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  uploadedById: string;
  uploadedByName: string;
}

export type EventColor = 'blue' | 'green' | 'red' | 'orange' | 'purple';

export interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  color: EventColor;
  createdAt: string;
  createdById: string;
  createdByName: string;
}

export type CheckStatus = 'O' | '△' | 'X' | 'none' | '';

export interface AssignmentCheck {
  id: string;       // `${userId}_${weekKey}`
  userId: string;
  username: string;
  weekKey: string;  // YYYY-MM-DD (해당 주 월요일)
  checks: Record<string, CheckStatus>;
  updatedAt: string;
}

export type MainTab = 'study' | 'personal' | 'reflection' | 'fine' | 'qna' | 'calendar' | 'attendance' | 'resource' | 'member' | 'vacation' | 'vaclist' | 'messages' | 'library' | 'tutorial' | 'assignment' | 'settings' | 'vocab_study';
export type StudySubTab = 'vocab' | 'feedback' | 'journal' | 'exam';

export interface VocabExamRecord {
  id: string;
  userId: string;
  username: string;
  date: string;
  startNum: number;
  endNum: number;
  carryoverNums: number[];
  score: number;
  total: number;
  createdAt: string;
}

export interface VocabTestScore {
  id: string;        // `${userId}_${date}`
  userId: string;
  username: string;
  date: string;
  score: number;     // 1–20
  submittedAt: string;
}

export type PeerFeedbackCategory = '분석 방향성' | '근거 부족/오류' | '어휘 부족' | '공부법';

export interface PeerFeedback {
  id: string;
  date: string;
  authorId: string;
  authorName: string;
  targetId: string;
  targetName: string;
  category: PeerFeedbackCategory;
  content: string;
  createdAt: string;
}

export interface StudyLog {
  id: string;        // `${userId}_${date}`
  userId: string;
  username: string;
  date: string;
  // 작품별 분석 (저번 주 과제 기준)
  classicAnalysis?: string;
  classicDifficulty?: string;
  modernPoetAnalysis?: string;
  modernPoetDifficulty?: string;
  modernProseAnalysis?: string;
  modernProseDifficulty?: string;
  // 기출 풀이
  wrongAnswerAnalysis?: string;
  examTypeAnalysis?: string;
  // 스터디 소감
  studyGroupLearnings?: string;
  selfFeedback: string;
  // 이전 버전 호환
  workType?: string;
  workName: string;
  newInsights?: string;
  difficulties: string;
  assignedQuestions?: string;
  updatedAt: string;
}

export type ResourceCategory = '기출 문제' | '작품 자료' | '기타 자료';

export interface ResourceRequest {
  id: string;
  createdAt: string;
  requesterId: string;
  requesterName: string;
  recipientId: string;
  recipientName: string;
  category: ResourceCategory;
  detail: string;
  status: '대기중' | '완료';
}

export function isPrivileged(user: User): boolean {
  return user.role === 'admin' || user.role === 'subadmin';
}
