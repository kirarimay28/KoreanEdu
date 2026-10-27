import { createDecipheriv } from 'crypto';
import https from 'https';
import { IncomingMessage } from 'http';

// ── Types ──────────────────────────────────────────────────────────────────

interface Course { kjkey: string; name: string; section: string; schedule: string }
interface Assignment { courseKjkey: string; courseName: string; title: string; deadline: string | null; submitted: boolean }
interface OnlineLecture { courseKjkey: string; courseName: string; weekNo: number; title: string; attendStart: string | null; attendEnd: string | null; completed: boolean }
interface Notice { courseKjkey: string; courseName: string; title: string; date: string | null; seq: string }

// ── Crypto ─────────────────────────────────────────────────────────────────

function getKey(): Buffer {
  const raw = process.env.CLC_ENCRYPTION_KEY ?? '';
  if (!raw) throw new Error('CLC_ENCRYPTION_KEY env var not set');
  const buf = Buffer.from(raw, 'hex');
  if (buf.length !== 32) throw new Error('CLC_ENCRYPTION_KEY must be 32 bytes (64 hex chars)');
  return buf;
}

function decrypt(token: string): string {
  const key = getKey();
  const parts = token.split(':');
  if (parts.length !== 3) throw new Error('invalid token format');
  const [ivHex, tagHex, ctHex] = parts;
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const plain = Buffer.concat([decipher.update(Buffer.from(ctHex, 'hex')), decipher.final()]);
  return plain.toString('utf8');
}

// ── Firebase ───────────────────────────────────────────────────────────────

async function getDb() {
  const { initializeApp, getApps, cert } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  if (getApps().length === 0) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT env var not set');
    initializeApp({ credential: cert(JSON.parse(raw)) });
  }
  return getFirestore();
}

// ── HTTP helpers ───────────────────────────────────────────────────────────

const BASE_HOST = 'clc.chosun.ac.kr';
const BASE = `https://${BASE_HOST}`;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Use https module (not fetch/undici) to avoid TLS compat issues with older servers
function httpsReq(opts: https.RequestOptions, body?: string): Promise<{ statusCode: number; rawCookies: string[]; text: string }> {
  return new Promise((resolve, reject) => {
    const req = https.request({ host: BASE_HOST, secureProtocol: 'TLSv1_2_method', rejectUnauthorized: false, ...opts }, (res: IncomingMessage) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => resolve({
        statusCode: res.statusCode ?? 0,
        rawCookies: (res.headers['set-cookie'] ?? []) as string[],
        text: Buffer.concat(chunks).toString('utf8'),
      }));
    });
    req.setTimeout(9000, () => req.destroy(new Error('timeout')));
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function clcGet(path: string, cookie: string): Promise<string> {
  const { text } = await httpsReq({ path, method: 'GET', headers: { Cookie: cookie, 'User-Agent': UA, Referer: BASE } });
  return text;
}

async function clcPost(path: string, cookie: string, bodyObj: Record<string, string>): Promise<string> {
  const body = new URLSearchParams(bodyObj).toString();
  const { text } = await httpsReq({
    path,
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body), 'User-Agent': UA, Referer: BASE },
  }, body);
  return text;
}

// ── CLC Login ──────────────────────────────────────────────────────────────

async function clcLogin(userId: string, password: string): Promise<string> {
  const body = new URLSearchParams({ usr_id: userId, usr_pwd: password, encoding: 'utf-8' }).toString();
  const { rawCookies } = await httpsReq({
    path: '/ilos/lo/login.acl',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body),
      'User-Agent': UA,
      Referer: `${BASE}/ilos/lo/login_form.acl`,
    },
  }, body);

  if (rawCookies.length === 0) throw new Error('로그인 실패: 쿠키 없음');
  const cookie = rawCookies.map((c: string) => c.split(';')[0]).join('; ');

  const check = await clcGet('/ilos/main/main_form.acl', cookie);
  if (!check.includes('sub_open') && !check.includes('logout') && !check.includes('로그아웃')) {
    throw new Error('로그인 실패: 아이디/비밀번호를 확인해 주세요');
  }
  return cookie;
}

// ── Regex-based HTML parsers ───────────────────────────────────────────────

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

function extractKoreanDate(text: string): string | null {
  const m = text.match(/(\d{4})[.\-](\d{2})[.\-](\d{2})\s*(오전|오후)?\s*(\d{1,2}):(\d{2})/) ||
            text.match(/(\d{4})[.\-](\d{2})[.\-](\d{2})/);
  if (!m) return null;
  const [, y, mo, d, ampm, h, min] = m as string[];
  if (h) {
    let hour = parseInt(h, 10);
    if (ampm === '오후' && hour < 12) hour += 12;
    if (ampm === '오전' && hour === 12) hour = 0;
    return `${y}-${mo}-${d}T${String(hour).padStart(2,'0')}:${min}:00+09:00`;
  }
  return `${y}-${mo}-${d}T23:59:00+09:00`;
}

function extractCourseName(raw: string): { name: string; section: string } {
  const text = raw.trim();
  const parenIdx = text.indexOf('(');
  if (parenIdx > 0) {
    return { name: text.slice(0, parenIdx).trim(), section: text.slice(parenIdx).replace(/[()]/g, '').trim() };
  }
  return { name: text, section: '' };
}

function parseCourses(html: string): Course[] {
  const courses: Course[] = [];
  const seen = new Set<string>();

  function addCourse(kjkey: string, rawName: string) {
    const k = kjkey.trim();
    if (!k || seen.has(k)) return;
    const raw = stripTags(rawName).trim();
    if (!raw || raw.length < 2) return;
    seen.add(k);
    const { name, section } = extractCourseName(raw);
    courses.push({ kjkey: k, name, section, schedule: '' });
  }

  // Pattern A: any element with kj="..." attribute that also has sub_open nearby
  const tagRe = /<([a-z]+)\b([^>]*)\b(?:kj|KJ)\s*=\s*["']([^"']+)["']([^>]*)>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(html)) !== null) {
    const fullAttrs = m[2] + m[4];
    const inner = m[5];
    if (!fullAttrs.toLowerCase().includes('sub_open') && !inner.toLowerCase().includes('sub_open')) continue;
    addCourse(m[3], inner);
  }

  // Pattern B: onclick="sub_open('KJKEY', ...)" — extract kj from JS call, name from surrounding element
  if (courses.length === 0) {
    const onclickRe = /<([a-z]+)\b[^>]*onclick\s*=\s*["'][^"']*sub_open\s*\(\s*['"]([A-Za-z0-9_\-]+)['"]/gi;
    while ((m = onclickRe.exec(html)) !== null) {
      const tag = m[1];
      const kjkey = m[2];
      // Try to grab text up to closing tag
      const afterTag = html.slice((m.index ?? 0) + m[0].length);
      const closeM = afterTag.match(new RegExp(`<\\/${tag}>`, 'i'));
      const inner = closeM ? afterTag.slice(0, closeM.index) : m[0];
      addCourse(kjkey, inner);
    }
  }

  // Pattern C: JavaScript sub_open('KJKEY', ...) calls anywhere in script blocks
  if (courses.length === 0) {
    const scriptRe = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    while ((m = scriptRe.exec(html)) !== null) {
      const scriptBody = m[1];
      const callRe = /sub_open\s*\(\s*['"]([A-Za-z0-9_\-]+)['"]/gi;
      let cm: RegExpExecArray | null;
      while ((cm = callRe.exec(scriptBody)) !== null) {
        // No course name available from script alone; use kjkey as placeholder
        if (!seen.has(cm[1])) {
          seen.add(cm[1]);
          courses.push({ kjkey: cm[1], name: cm[1], section: '', schedule: '' });
        }
      }
    }
  }

  // Pattern D: href links like ky=KJKEY in course URLs
  if (courses.length === 0) {
    const hrefRe = /<a\b[^>]*href=["'][^"']*[?&]ky=([A-Za-z0-9_\-]+)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi;
    while ((m = hrefRe.exec(html)) !== null) {
      addCourse(m[1], m[2]);
    }
  }

  return courses;
}

function parseAssignments(html: string, kjkey: string, courseName: string): Assignment[] {
  const items: Assignment[] = [];
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rm: RegExpExecArray | null;
  while ((rm = rowRe.exec(html)) !== null) {
    const row = rm[1];
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(c => stripTags(c[1]));
    if (cells.length < 2) continue;
    const title = cells[0] || cells[1];
    if (!title || title.length < 2) continue;
    const rowText = stripTags(row);
    const deadline = extractKoreanDate(rowText);
    const submitted = rowText.includes('제출완료') || rowText.includes('제출함');
    items.push({ courseKjkey: kjkey, courseName, title, deadline, submitted });
  }
  return items;
}

function parseWeekNumbers(html: string): number[] {
  const weeks: number[] = [];
  const re = /id="week-(\d+)"[^>]*class="[^"]*wb[^"]*"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const n = parseInt(m[1], 10);
    if (!isNaN(n)) weeks.push(n);
  }
  return weeks;
}

function parseOnlineLectures(html: string, kjkey: string, courseName: string, weekNo: number): OnlineLecture[] {
  const items: OnlineLecture[] = [];
  const rowRe = /<(?:tr|li)[^>]*>([\s\S]*?)<\/(?:tr|li)>/gi;
  let rm: RegExpExecArray | null;
  while ((rm = rowRe.exec(html)) !== null) {
    const text = stripTags(rm[1]);
    if (!text.includes('출석인정기간') && !text.includes('학습')) continue;
    const titleM = rm[1].match(/<(?:a|strong)[^>]*>([\s\S]*?)<\/(?:a|strong)>/i);
    const title = titleM ? stripTags(titleM[1]) : text.slice(0, 50);
    if (!title) continue;
    const periodM = text.match(/출석인정기간\s*[:：]?\s*(\d{4}\.\d{2}\.\d{2}[^~]*?)\s*~\s*(\d{4}\.\d{2}\.\d{2}[^\s\n]*)/);
    const attendStart = periodM ? extractKoreanDate(periodM[1].trim()) : null;
    const attendEnd   = periodM ? extractKoreanDate(periodM[2].trim()) : null;
    const completed = text.includes('완료');
    items.push({ courseKjkey: kjkey, courseName, weekNo, title, attendStart, attendEnd, completed });
  }
  return items;
}

function parseNotices(html: string, kjkey: string, courseName: string): Notice[] {
  const items: Notice[] = [];
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rm: RegExpExecArray | null;
  while ((rm = rowRe.exec(html)) !== null) {
    const linkM = rm[1].match(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i) ||
                  rm[1].match(/<a[^>]*onclick="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!linkM) continue;
    const title = stripTags(linkM[2]);
    if (!title) continue;
    const href = linkM[1];
    const seqM = href.match(/seq[=\(](\d+)/i) || href.match(/SEQ[=\(](\d+)/i);
    const seq = seqM ? seqM[1] : '';
    const date = extractKoreanDate(stripTags(rm[1]));
    items.push({ courseKjkey: kjkey, courseName, title, date, seq });
  }
  return items;
}

// ── Scrape all ─────────────────────────────────────────────────────────────

async function scrapeAll(cookie: string) {
  const mainHtml = await clcGet('/ilos/main/main_form.acl', cookie);
  // Course list is dynamically loaded — fetch the actual course list page
  const courseListHtml = await clcGet('/ilos/st/main/course_ing_list_form.acl', cookie);
  const courses = parseCourses(courseListHtml);
  const udMatch = mainHtml.match(/["']ud["']\s*:\s*["']([^"']+)["']/) ||
                  courseListHtml.match(/["']ud["']\s*:\s*["']([^"']+)["']/);
  const ud = udMatch ? udMatch[1] : '';

  const assignments: Assignment[] = [];
  const lectures: OnlineLecture[] = [];
  const notices: Notice[] = [];

  for (const { kjkey, name } of courses) {
    try {
      const html = await clcPost('/ilos/st/course/report_list.acl', cookie, {
        ud, ky: kjkey, start: '', display: '1', SCH_VALUE: '', encoding: 'utf-8',
      });
      assignments.push(...parseAssignments(html, kjkey, name));
    } catch { /* ignore */ }

    try {
      const outerHtml = await clcGet(`/ilos/st/course/online_list_form.acl?ky=${kjkey}`, cookie);
      const weeks = parseWeekNumbers(outerHtml);
      for (const weekNo of (weeks.length ? weeks : [1])) {
        try {
          const html = await clcPost('/ilos/st/course/online_list.acl', cookie, {
            ud, ky: kjkey, WEEK_NO: String(weekNo), encoding: 'utf-8',
          });
          lectures.push(...parseOnlineLectures(html, kjkey, name, weekNo));
        } catch { /* ignore */ }
      }
    } catch { /* ignore */ }

    try {
      const html = await clcPost('/ilos/st/course/notice_list.acl', cookie, {
        ud, ky: kjkey, start: '', display: '1', encoding: 'utf-8',
      });
      notices.push(...parseNotices(html, kjkey, name));
    } catch { /* ignore */ }
  }

  return { courses, assignments, lectures, notices, scrapedAt: new Date().toISOString(), mainHtml, courseListHtml };
}

// ── Handler ────────────────────────────────────────────────────────────────

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  const { uid } = req.body ?? {};
  if (!uid) return res.status(400).json({ error: 'missing uid' });
  try {
    const db = await getDb();
    const credDoc = await db.collection('clcCredentials').doc(uid).get();
    if (!credDoc.exists || !credDoc.data()?.enabled) {
      return res.status(404).json({ error: 'CLC 연동이 설정되지 않았습니다' });
    }
    let creds: { id: string; pwd: string };
    try { creds = JSON.parse(decrypt(credDoc.data()!.token)); }
    catch { return res.status(500).json({ error: '자격증명 복호화 실패' }); }
    const cookie = await clcLogin(creds.id, creds.pwd);
    const result = await scrapeAll(cookie);
    const clHtml = result.courseListHtml;
    const clIlosUrls = [...new Set([...clHtml.matchAll(/["'`](\/?ilos\/[^"'`\s?#]{4,60}\.acl)[^"'`]*/gi)].map(m => m[1]))];
    await db.collection('clcData').doc(uid).set({ ...result, updatedAt: new Date().toISOString() });
    res.status(200).json({
      ok: true,
      scrapedAt: result.scrapedAt,
      _d: {
        courses: result.courses.length,
        clLen: clHtml.length,
        clIlosUrls,
      },
    });
  } catch (e: any) {
    console.error('[clc/sync]', e?.message ?? e);
    const cause = (e?.cause as any)?.message ?? (e?.cause as any)?.code ?? '';
    const base = String(e?.message ?? '');
    const msg = base.includes('로그인 실패') ? base : '동기화 실패: ' + base + (cause ? ` [${cause}]` : '');
    res.status(500).json({ error: msg });
  }
}
