import {
  parseCourses, parseAssignments, parseOnlineLectures,
  parseNotices, parseWeekNumbers,
  type Assignment, type OnlineLecture, type Notice, type Course,
} from './parser';

const BASE = 'https://clc.chosun.ac.kr';

export interface ScrapeResult {
  courses: Course[];
  assignments: Assignment[];
  lectures: OnlineLecture[];
  notices: Notice[];
  scrapedAt: string;
}

// Login → returns cookie string, throws on failure
export async function clcLogin(userId: string, password: string): Promise<string> {
  const res = await fetch(`${BASE}/ilos/lo/login.acl`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      usr_id: userId,
      usr_pwd: password,
      encoding: 'utf-8',
    }),
    redirect: 'manual',
    signal: AbortSignal.timeout(8000),
  });

  // On success ILOS issues a redirect; collect Set-Cookie headers
  const rawCookies = res.headers.getSetCookie?.() ?? [];
  if (rawCookies.length === 0) throw new Error('로그인 실패: 쿠키 없음');

  const cookie = rawCookies.map(c => c.split(';')[0]).join('; ');

  // Verify: fetch main page and check for logged-in marker
  const check = await clcGet('/ilos/main/main_form.acl', cookie);
  if (!check.includes('sub_open') && !check.includes('logout') && !check.includes('로그아웃')) {
    throw new Error('로그인 실패: 아이디/비밀번호를 확인해 주세요');
  }

  return cookie;
}

// Scrape all data for a logged-in session
export async function scrapeAll(cookie: string): Promise<ScrapeResult> {
  const mainHtml = await clcGet('/ilos/main/main_form.acl', cookie);
  const courses = parseCourses(mainHtml);

  const assignments: Assignment[] = [];
  const lectures: OnlineLecture[] = [];
  const notices: Notice[] = [];

  // Extract student ID from page (ud param used in AJAX calls)
  const udMatch = mainHtml.match(/["']ud["']\s*:\s*["']([^"']+)["']/);
  const ud = udMatch ? udMatch[1] : '';

  for (const course of courses) {
    const { kjkey, name } = course;

    // ── 과제 ─────────────────────────────────────────────────────────────
    try {
      const html = await clcPost('/ilos/st/course/report_list.acl', cookie, {
        ud, ky: kjkey, start: '', display: '1', SCH_VALUE: '', encoding: 'utf-8',
      });
      assignments.push(...parseAssignments(html, kjkey, name));
    } catch { /* ignore per-course errors */ }

    // ── 온라인강의 ────────────────────────────────────────────────────────
    try {
      const outerHtml = await clcGet(
        `/ilos/st/course/online_list_form.acl?ky=${kjkey}`,
        cookie,
      );
      const weeks = parseWeekNumbers(outerHtml);
      // If no week tabs found, try week 1 as fallback
      const weekList = weeks.length > 0 ? weeks : [1];

      for (const weekNo of weekList) {
        try {
          const html = await clcPost('/ilos/st/course/online_list.acl', cookie, {
            ud, ky: kjkey, WEEK_NO: String(weekNo), encoding: 'utf-8',
          });
          lectures.push(...parseOnlineLectures(html, kjkey, name, weekNo));
        } catch { /* ignore per-week errors */ }
      }
    } catch { /* ignore per-course errors */ }

    // ── 공지사항 ──────────────────────────────────────────────────────────
    try {
      const html = await clcPost('/ilos/st/course/notice_list.acl', cookie, {
        ud, ky: kjkey, start: '', display: '1', encoding: 'utf-8',
      });
      notices.push(...parseNotices(html, kjkey, name));
    } catch { /* ignore per-course errors */ }
  }

  return { courses, assignments, lectures, notices, scrapedAt: new Date().toISOString() };
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function timeout(ms: number): AbortSignal {
  return AbortSignal.timeout(ms);
}

async function clcGet(path: string, cookie: string): Promise<string> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Cookie: cookie },
    signal: timeout(8000),
  });
  return res.text();
}

async function clcPost(
  path: string,
  cookie: string,
  body: Record<string, string>,
): Promise<string> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body),
    signal: timeout(8000),
  });
  return res.text();
}
