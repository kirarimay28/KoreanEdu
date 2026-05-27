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
  poeticNarrator: string;
  poeticObject: string;
  genre: string;
  theme: string;
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

export interface AppData {
  users: User[];
  classicalEntries: ClassicalLiteratureEntry[];
  modernEntries: ModernLiteratureEntry[];
  personalStudyEntries: PersonalStudyEntry[];
  reflectionEntries: ReflectionEntry[];
}

export type MainTab = 'study' | 'personal' | 'reflection';
export type StudySubTab = 'classical' | 'modern';
