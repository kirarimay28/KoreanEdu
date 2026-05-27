export interface User {
  id: string;
  username: string;
  passwordHash: string;
  resolution: string;
  createdAt: string;
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

export interface AppData {
  users: User[];
  classicalEntries: ClassicalLiteratureEntry[];
  modernEntries: ModernLiteratureEntry[];
  personalStudyEntries: PersonalStudyEntry[];
  reflectionEntries: ReflectionEntry[];
  attendanceEntries: AttendanceEntry[];
  resourceRequests: ResourceRequest[];
}

export type MainTab = 'study' | 'personal' | 'reflection' | 'attendance' | 'resource';
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
