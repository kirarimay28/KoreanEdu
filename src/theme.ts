export type ThemeId = 'pink' | 'notebook' | 'chick' | 'lofi' | 'mono' | 'celadon';

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  emoji: string;
  desc: string;
  previewFrom: string;
  previewTo: string;
}

export const THEMES: ThemeMeta[] = [
  { id: 'pink',     name: '기본',      emoji: '🌸', desc: '핑크 & 로즈',    previewFrom: '#f9a8c9', previewTo: '#de4e80' },
  { id: 'notebook', name: '공책&연필', emoji: '📓', desc: '인디고 & 크림',   previewFrom: '#a0b4e0', previewTo: '#3355a8' },
  { id: 'chick',    name: '병아리',    emoji: '🐣', desc: '선샤인 옐로우',  previewFrom: '#ffe050', previewTo: '#d49600' },
  { id: 'lofi',     name: '로우파이',  emoji: '🎧', desc: '더스티 퍼플',   previewFrom: '#bba5d8', previewTo: '#6b4d9e' },
  { id: 'mono',     name: '모노',      emoji: '🖤', desc: '블랙 & 화이트', previewFrom: '#bababa', previewTo: '#555555' },
  { id: 'celadon', name: '고려청자',   emoji: '🏺', desc: '비색 청록',     previewFrom: '#72b8a0', previewTo: '#0f5244' },
];

const STORAGE_KEY = 'theme';

export function getTheme(): ThemeId {
  try {
    const v = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    if (v && THEMES.some(t => t.id === v)) return v;
  } catch {}
  return 'pink';
}

export function applyTheme(id: ThemeId): void {
  document.documentElement.setAttribute('data-theme', id);
  try { localStorage.setItem(STORAGE_KEY, id); } catch {}
  window.dispatchEvent(new CustomEvent('themechange', { detail: id }));
}

export function initTheme(): void {
  applyTheme(getTheme());
}
