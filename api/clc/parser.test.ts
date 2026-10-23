import { parseCourses, parseWeekNumbers, parseKoreanDatetime } from './parser';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import * as path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const fixture = (name: string) =>
  fs.readFileSync(path.join(__dirname, '../../fixtures/clc', name), 'utf-8');

// ── Course list ───────────────────────────────────────────────────────────────
const mainHtml = fixture('main.html');
const courses = parseCourses(mainHtml);

console.log(`✓ parseCourses: ${courses.length} courses`);
if (courses.length === 0) {
  console.error('✗ expected > 0 courses');
  process.exit(1);
}
const names = courses.map(c => c.name);
console.log('  names:', names.join(', '));

const clc = courses.find(c => c.name.includes('현대소설론'));
if (!clc) {
  console.error('✗ 현대소설론 not found');
  process.exit(1);
}
if (clc.kjkey !== '01202632506801') {
  console.error(`✗ kjkey mismatch: ${clc.kjkey}`);
  process.exit(1);
}
console.log(`✓ 현대소설론 kjkey=${clc.kjkey}`);

// ── Week number parsing ───────────────────────────────────────────────────────
// lectures outer shell (from the pasted HTML)
const lecturesHtml = fixture('main.html'); // reuse main as placeholder (no lectures.html fixture yet)
const weeks = parseWeekNumbers(lecturesHtml);
console.log(`✓ parseWeekNumbers: ${weeks.length} weeks from main.html`);

// ── Korean datetime parsing ───────────────────────────────────────────────────
const cases: [string, string | null][] = [
  ['2026.09.29 오전 12:00', '2026-09-29T00:00:00+09:00'],
  ['2026.10.05 오후 11:59', '2026-10-05T23:59:00+09:00'],
  ['2026.10.05',            '2026-10-05T23:59:00+09:00'],
  ['garbage text',          null],
];

for (const [input, expected] of cases) {
  const got = parseKoreanDatetime(input);
  const ok = got === expected;
  if (ok) {
    console.log(`✓ parseKoreanDatetime("${input}") = ${got}`);
  } else {
    console.error(`✗ parseKoreanDatetime("${input}") expected ${expected}, got ${got}`);
    process.exit(1);
  }
}

console.log('\nAll tests passed ✓');
