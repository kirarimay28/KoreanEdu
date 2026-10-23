import * as cheerio from 'cheerio';

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
  deadline: string | null;   // ISO 8601
  submitted: boolean;
}

export interface OnlineLecture {
  courseKjkey: string;
  courseName: string;
  weekNo: number;
  title: string;
  attendStart: string | null;
  attendEnd: string | null;   // 출석인정기간 종료 = deadline
  completed: boolean;
}

export interface Notice {
  courseKjkey: string;
  courseName: string;
  title: string;
  date: string | null;
  seq: string;
}

// Parse course list from main_form.acl
export function parseCourses(html: string): Course[] {
  const $ = cheerio.load(html);
  const courses: Course[] = [];

  $('em.sub_open').each((_, el) => {
    const $el = $(el);
    const kjkey = $el.attr('kj') ?? '';
    if (!kjkey) return;

    const raw = $el.text().trim();
    // "현대소설론\n                (25068-01) " → split at ( for section
    const parenIdx = raw.indexOf('(');
    const name = parenIdx > 0 ? raw.slice(0, parenIdx).trim() : raw;
    const section = parenIdx > 0 ? raw.slice(parenIdx).replace(/[()]/g, '').trim() : '';

    const schedule = $el.next('span').text().trim();

    courses.push({ kjkey, name, section, schedule });
  });

  return courses;
}

// Parse assignment list from POST /ilos/st/course/report_list.acl
export function parseAssignments(html: string, kjkey: string, courseName: string): Assignment[] {
  const $ = cheerio.load(html);
  const items: Assignment[] = [];

  // ILOS report list uses table rows or dl/dt/dd blocks
  // Try table rows first
  $('table tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 2) return;

    const title = cells.eq(0).text().trim() || cells.eq(1).text().trim();
    if (!title) return;

    // Look for date pattern: YYYY.MM.DD HH:MM or YYYY-MM-DD
    const rowText = $(row).text();
    const deadline = extractKoreanDate(rowText);
    const submitted = rowText.includes('제출완료') || rowText.includes('제출함');

    if (title.length > 1) {
      items.push({ courseKjkey: kjkey, courseName, title, deadline, submitted });
    }
  });

  // Fallback: list-style layout (some ILOS versions)
  if (items.length === 0) {
    $('.list-wrap li, .board-list li, .report-list li').each((_, el) => {
      const $el = $(el);
      const title = $el.find('.title, .subject, a').first().text().trim();
      if (!title) return;
      const text = $el.text();
      const deadline = extractKoreanDate(text);
      const submitted = text.includes('제출완료') || text.includes('제출함');
      items.push({ courseKjkey: kjkey, courseName, title, deadline, submitted });
    });
  }

  return items;
}

// Parse online lecture list from POST /ilos/st/course/online_list.acl
export function parseOnlineLectures(
  html: string,
  kjkey: string,
  courseName: string,
  weekNo: number,
): OnlineLecture[] {
  const $ = cheerio.load(html);
  const items: OnlineLecture[] = [];

  // Each lecture slot is typically a div/li with attendance period info
  const lectureBlocks = $('[class*="lecture"], [class*="slot"], tbody tr, .list-wrap li, li');

  lectureBlocks.each((_, el) => {
    const $el = $(el);
    const text = $el.text();

    // Must contain 출석인정기간 to be a lecture item
    if (!text.includes('출석인정기간') && !text.includes('학습')) return;

    const title = $el.find('a, .title, .subject, strong').first().text().trim()
      || $el.children().first().text().trim();
    if (!title) return;

    // 출석인정기간: YYYY.MM.DD 오전/오후 HH:MM ~ YYYY.MM.DD 오전/오후 HH:MM
    const periodMatch = text.match(
      /출석인정기간\s*[:：]?\s*(\d{4}\.\d{2}\.\d{2}[^~]+?)\s*~\s*(\d{4}\.\d{2}\.\d{2}[^\s\n]+)/,
    );
    const attendStart = periodMatch ? parseKoreanDatetime(periodMatch[1].trim()) : null;
    const attendEnd   = periodMatch ? parseKoreanDatetime(periodMatch[2].trim()) : null;

    const completed = text.includes('완료') || $el.find('[class*="complete"], [class*="ok"]').length > 0;

    items.push({ courseKjkey: kjkey, courseName, weekNo, title, attendStart, attendEnd, completed });
  });

  return items;
}

// Parse notice list from POST /ilos/st/course/notice_list.acl
export function parseNotices(html: string, kjkey: string, courseName: string): Notice[] {
  const $ = cheerio.load(html);
  const items: Notice[] = [];

  $('table tbody tr').each((_, row) => {
    const $row = $(row);
    const $link = $row.find('a').first();
    const title = $link.text().trim();
    if (!title) return;

    const href = $link.attr('href') ?? $link.attr('onclick') ?? '';
    const seqMatch = href.match(/seq[=\(](\d+)/i) || href.match(/SEQ[=\(](\d+)/i);
    const seq = seqMatch ? seqMatch[1] : '';

    const rowText = $row.text();
    const date = extractKoreanDate(rowText);

    items.push({ courseKjkey: kjkey, courseName, title, date, seq });
  });

  return items;
}

// Parse week numbers from online_list_form.acl outer shell
export function parseWeekNumbers(html: string): number[] {
  const $ = cheerio.load(html);
  const weeks: number[] = [];
  // Week tabs: <div id="week-5" class="... wb wb-on ...">
  $('[id^="week-"].wb-on, [id^="week-"].wb').each((_, el) => {
    const id = $(el).attr('id') ?? '';
    const n = parseInt(id.replace('week-', ''), 10);
    if (!isNaN(n)) weeks.push(n);
  });
  return weeks;
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function extractKoreanDate(text: string): string | null {
  // Patterns: 2026.10.05 오후 11:59 | 2026-10-05 23:59 | 2026.10.05
  const m =
    text.match(/(\d{4})[.\-](\d{2})[.\-](\d{2})\s*(오전|오후)?\s*(\d{1,2}):(\d{2})/) ||
    text.match(/(\d{4})[.\-](\d{2})[.\-](\d{2})/);
  if (!m) return null;
  const [, y, mo, d, ampm, h, min] = m as string[];
  if (h) return parseKoreanDatetime(`${y}.${mo}.${d} ${ampm ?? ''}${h}:${min}`.trim());
  return `${y}-${mo}-${d}T23:59:00+09:00`;
}

export function parseKoreanDatetime(raw: string): string | null {
  // "2026.09.29 오전 12:00" | "2026.10.05 오후 11:59"
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
