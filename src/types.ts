export type UserRole = 'admin' | 'subadmin' | 'member';

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  resolution: string;
  createdAt: string;
  role?: UserRole;
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

export type PersonalSubject = '국교론' | '현대 문법' | '중세 문법' | '개론서' | '기타';

export interface PersonalStudyEntry {
  id: string;
  date: string;
  userId: string;
  subject: PersonalSubject;
  customSubject: string;
  curriculum: string;
  examStatus: ExamStatus;
  feedback: string;
  studyHours: number | '';
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
}

export type MainTab = 'study' | 'personal' | 'reflection' | 'qna' | 'calendar' | 'attendance' | 'resource' | 'member' | 'vacation' | 'vaclist' | 'messages' | 'library';
export type StudySubTab = 'classical' | 'modern';

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
