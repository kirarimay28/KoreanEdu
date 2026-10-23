import { parse } from 'node-html-parser';

export interface Course {
  kjkey: string;
  name: string;
  section: string;
  schedule: string;
}

export interface Assignment {
  courseKjkey: string;
  courseName: string;
  title: string;
  deadline: string | null;
  submitted: boolean;
}

export interface OnlineLecture {
  courseKjkey: string;
  courseName: string;
  weekNo: number;
  title: string;
  attendStart: string | null;
  attendEnd: string | null;
  completed: boolean;
}

export interface Notice {
  courseKjkey: string;
  courseName: string;
  title: string;
  date: string | null;
  seq: string;
}

export function parseCourses(html: string): Course[] {
  const root = parse(html);
  const courses: Course[] = [];

  for (const el of root.querySelectorAll('em.sub_open')) {
    const kjkey = el.getAttribute('kj') ?? '';
    if (!kjkey) continue;

    const raw = el.text.trim();
    const parenIdx = raw.indexOf('(');
    const name = parenIdx > 0 ? raw.slice(0, parenIdx).trim() : raw;
    const section = parenIdx > 0 ? raw.slice(parenIdx).replace(/[()]/g, '').trim() : '';

    const next = el.nextElementSibling;
    const schedule = next ? next.text.trim() : '';

    courses.push({ kjkey, name, section, schedule });
  }

  return courses;
}

export function parseAssignments(html: string, kjkey: string, courseName: string): Assignment[] {
  const root = parse(html);
  const items: Assignment[] = [];

  for (const row of root.querySelectorAll('table tbody tr')) {
    const cells = row.querySelectorAll('td');
    if (cells.length < 2) continue;

    const title = cells[0].text.trim() || cells[1].text.trim();
    if (!title || title.length < 2) continue;

    const rowText = row.text;
    const deadline = extractKoreanDate(rowText);
    const submitted = rowText.includes('제출완료') || rowText.includes('제출함');

    items.push({ courseKjkey: kjkey, courseName, title, deadline, submitted });
  }

  if (items.length === 0) {
    for (const el of root.querySelectorAll('.list-wrap li, .board-list li, .report-list li')) {
      const titleEl = el.querySelector('.title, .subject, a');
      const title = titleEl ? titleEl.text.trim() : '';
      if (!title) continue;
      const text = el.text;
      const deadline = extractKoreanDate(text);
      const submitted = text.includes('제출완료') || text.includes('제출함');
      items.push({ courseKjkey: kjkey, courseName, title, deadline, submitted });
    }
  }

  return items;
}

export function parseOnlineLectures(
  html: string,
  kjkey: string,
  courseName: string,
  weekNo: number,
): OnlineLecture[] {
  const root = parse(html);
  const items: OnlineLecture[] = [];

  const blocks = root.querySelectorAll('tbody tr, .list-wrap li, li');

  for (const el of blocks) {
    const text = el.text;
    if (!text.includes('출석인정기간') && !text.includes('학습')) continue;

    const titleEl = el.querySelector('a, .title, .subject, strong');
    const title = titleEl ? titleEl.text.trim() : el.childNodes[0]?.text?.trim() ?? '';
    if (!title) continue;

    const periodMatch = text.match(
      /출석인정기간\s*[:：]?\s*(\d{4}\.\d{2}\.\d{2}[^~]+?)\s*~\s*(\d{4}\.\d{2}\.\d{2}[^\s\n]+)/,
    );
    const attendStart = periodMatch ? parseKoreanDatetime(periodMatch[1].trim()) : null;
    const attendEnd   = periodMatch ? parseKoreanDatetime(periodMatch[2].trim()) : null;

    const completed = text.includes('완료') || el.querySelectorAll('[class*="complete"], [class*="ok"]').length > 0;

    items.push({ courseKjkey: kjkey, courseName, weekNo, title, attendStart, attendEnd, completed });
  }

  return items;
}

export function parseNotices(html: string, kjkey: string, courseName: string): Notice[] {
  const root = parse(html);
  const items: Notice[] = [];

  for (const row of root.querySelectorAll('table tbody tr')) {
    const link = row.querySelector('a');
    if (!link) continue;
    const title = link.text.trim();
    if (!title) continue;

    const href = link.getAttribute('href') ?? link.getAttribute('onclick') ?? '';
    const seqMatch = href.match(/seq[=\(](\d+)/i) || href.match(/SEQ[=\(](\d+)/i);
    const seq = seqMatch ? seqMatch[1] : '';

    const date = extractKoreanDate(row.text);
    items.push({ courseKjkey: kjkey, courseName, title, date, seq });
  }

  return items;
}

export function parseWeekNumbers(html: string): number[] {
  const root = parse(html);
  const weeks: number[] = [];
  for (const el of root.querySelectorAll('[id^="week-"]')) {
    const cls = el.getAttribute('class') ?? '';
    if (!cls.includes('wb-on') && !cls.includes('wb')) continue;
    const id = el.getAttribute('id') ?? '';
    const n = parseInt(id.replace('week-', ''), 10);
    if (!isNaN(n)) weeks.push(n);
  }
  return weeks;
}

function extractKoreanDate(text: string): string | null {
  const m =
    text.match(/(\d{4})[.\-](\d{2})[.\-](\d{2})\s*(오전|오후)?\s*(\d{1,2}):(\d{2})/) ||
    text.match(/(\d{4})[.\-](\d{2})[.\-](\d{2})/);
  if (!m) return null;
  const [, y, mo, d, ampm, h, min] = m as string[];
  if (h) return parseKoreanDatetime(`${y}.${mo}.${d} ${ampm ?? ''}${h}:${min}`.trim());
  return `${y}-${mo}-${d}T23:59:00+09:00`;
}

export function parseKoreanDatetime(raw: string): string | null {
  const m = raw.match(/(\d{4})[.\-](\d{2})[.\-](\d{2})\s*(오전|오후)?\s*(\d{1,2}):(\d{2})/);
  if (!m) {
    const dm = raw.match(/(\d{4})[.\-](\d{2})[.\-](\d{2})/);
    if (!dm) return null;
    return `${dm[1]}-${dm[2]}-${dm[3]}T23:59:00+09:00`;
  }
  const [, y, mo, d, ampm, rawH, min] = m;
  let hour = parseInt(rawH, 10);
  if (ampm === '오후' && hour < 12) hour += 12;
  if (ampm === '오전' && hour === 12) hour = 0;
  const hh = String(hour).padStart(2, '0');
  return `${y}-${mo}-${d}T${hh}:${min}:00+09:00`;
}
