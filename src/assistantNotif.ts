import type {
  AssistantSettings,
  AssistantDeadline,
  StudyBlock,
  SpeechStyle,
  AssistantWeekday,
  CustomDndSlot,
} from './assistantTypes';

// ── Types ─────────────────────────────────────────────────────

export type NotifType =
  | 'block_start'
  | 'commute'
  | 'deadline_reminder'
  | 'deadline_urgent'
  | 'weekly_check'
  | 'morning_brief';

export interface NotifPayload {
  title: string;
  body: string;
  type: NotifType;
  urgentOverride: boolean;
  data?: Record<string, unknown>;
}

export interface WorkSlotInfo {
  start: string;
  end: string;
  commuteMin: number;
  returnMin: number;
}

// ── Seoul time helpers ────────────────────────────────────────

export function nowSeoulHHMM(now: Date = new Date()): string {
  return now.toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false });
}

export function nowSeoulDate(now: Date = new Date()): string {
  return now.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' })
    .replace(/\. /g, '-').replace('.', '');
}

export function seoulWeekday(now: Date = new Date()): AssistantWeekday {
  const day = now.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', weekday: 'short' });
  // '월요일' → '월'
  return day.slice(0, 1) as AssistantWeekday;
}

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function inRange(timeMin: number, startMin: number, endMin: number): boolean {
  if (startMin <= endMin) return timeMin >= startMin && timeMin < endMin;
  // overnight: e.g. 23:30 - 07:00
  return timeMin >= startMin || timeMin < endMin;
}

// ── DND check ─────────────────────────────────────────────────

export interface DndContext {
  nowHHMM: string;
  weekday: AssistantWeekday;
  classTimes: Array<{ start: string; end: string }>;
  workSlot: WorkSlotInfo | null;
}

export function isDndActive(settings: AssistantSettings, ctx: DndContext): boolean {
  const nowMin = toMin(ctx.nowHHMM);
  const dnd = settings.dnd;

  // Sleep DND (always a risk for overnight)
  if (dnd.sleepDnd) {
    if (inRange(nowMin, toMin(dnd.sleepStart), toMin(dnd.sleepEnd))) return true;
  }

  // Commute DND — always enabled per spec (commuteDnd is always true)
  if (ctx.workSlot) {
    const commuteStartMin = toMin(ctx.workSlot.start) - ctx.workSlot.commuteMin;
    const commuteEndMin = toMin(ctx.workSlot.start);
    const returnStartMin = toMin(ctx.workSlot.end);
    const returnEndMin = toMin(ctx.workSlot.end) + ctx.workSlot.returnMin;
    if (inRange(nowMin, commuteStartMin, commuteEndMin)) return true;
    if (inRange(nowMin, returnStartMin, returnEndMin)) return true;
  }

  // Work DND
  if (dnd.workDnd && ctx.workSlot) {
    if (inRange(nowMin, toMin(ctx.workSlot.start), toMin(ctx.workSlot.end))) return true;
  }

  // Class DND
  if (dnd.classDnd) {
    for (const c of ctx.classTimes) {
      if (inRange(nowMin, toMin(c.start), toMin(c.end))) return true;
    }
  }

  // Custom slots
  for (const slot of dnd.customSlots) {
    if (!slot.enabled) continue;
    if (!slot.days.includes(ctx.weekday)) continue;
    if (inRange(nowMin, toMin(slot.start), toMin(slot.end))) return true;
  }

  return false;
}

// ── Urgent check ──────────────────────────────────────────────

export function isDeadlineUrgent(
  deadline: AssistantDeadline,
  nowISO: string,
  urgentHours: number,
): boolean {
  const deadlineMs = new Date(
    deadline.time ? `${deadline.date}T${deadline.time}:00+09:00` : `${deadline.date}T23:59:00+09:00`,
  ).getTime();
  const nowMs = new Date(nowISO).getTime();
  const diffMs = deadlineMs - nowMs;
  return diffMs >= 0 && diffMs <= urgentHours * 60 * 60 * 1000;
}

// ── Message builders ──────────────────────────────────────────

function say(반말: string, 존댓말: string, style: SpeechStyle): string {
  return style === '반말' ? 반말 : 존댓말;
}

export function buildBlockStartAlert(
  block: StudyBlock,
  nowHHMM: string,
  warnMin: number,
  style: SpeechStyle,
): NotifPayload | null {
  const diffMin = toMin(block.start) - toMin(nowHHMM);
  if (diffMin < 0 || diffMin > warnMin) return null;
  const label = block.label;
  const title = `📚 ${label}`;
  const body = diffMin === 0
    ? say(`${label} 시작할 시간이야`, `${label} 시작할 시간입니다`, style)
    : say(`${diffMin}분 후 ${label} 시작해`, `${diffMin}분 후 ${label} 시작됩니다`, style);
  return { title, body, type: 'block_start', urgentOverride: false };
}

export function buildCommuteAlert(
  workSlot: WorkSlotInfo,
  nowHHMM: string,
  warnMin: number,
  style: SpeechStyle,
): NotifPayload | null {
  const diffMin = toMin(workSlot.start) - workSlot.commuteMin - toMin(nowHHMM);
  if (diffMin < 0 || diffMin > warnMin) return null;
  const body = diffMin === 0
    ? say('지금 나가야 해', '지금 나가셔야 합니다', style)
    : say(`${diffMin}분 후 출발해야 해`, `${diffMin}분 후 출발하셔야 합니다`, style);
  return { title: '🚌 출근', body, type: 'commute', urgentOverride: false };
}

export function buildDeadlineAlerts(
  deadlines: AssistantDeadline[],
  today: string,
  nowHHMM: string,
  settings: AssistantSettings,
  style: SpeechStyle,
): NotifPayload[] {
  const payloads: NotifPayload[] = [];
  const nowISO = `${today}T${nowHHMM}:00+09:00`;

  for (const d of deadlines) {
    if (d.completed) continue;

    // Urgent override check
    const urgent = isDeadlineUrgent(d, nowISO, settings.urgent.deadlineHours);
    if (urgent) {
      const body = say(
        `'${d.title}' 마감 ${settings.urgent.deadlineHours}시간 이내야!`,
        `'${d.title}' 마감 ${settings.urgent.deadlineHours}시간 이내입니다!`,
        style,
      );
      payloads.push({ title: `🚨 긴급: ${d.title}`, body, type: 'deadline_urgent', urgentOverride: true });
      continue;
    }

    // Day-before reminders (fire at 09:00)
    if (nowHHMM !== '09:00') continue;
    const deadlineDate = new Date(d.date + 'T00:00:00+09:00').getTime();
    const todayDate = new Date(today + 'T00:00:00+09:00').getTime();
    const daysLeft = Math.round((deadlineDate - todayDate) / (1000 * 60 * 60 * 24));
    if (d.reminderDaysBefore.includes(daysLeft)) {
      const body = say(
        `'${d.title}' D-${daysLeft}`,
        `'${d.title}' D-${daysLeft} 남았습니다`,
        style,
      );
      payloads.push({ title: `📅 ${d.title}`, body, type: 'deadline_reminder', urgentOverride: false });
    }
  }

  return payloads;
}

// ── Daily throttle ────────────────────────────────────────────

export function throttleNotifs(
  payloads: NotifPayload[],
  dailyLimit: number,
  sentCountToday: number,
): NotifPayload[] {
  const urgents = payloads.filter(p => p.urgentOverride);
  const normals = payloads.filter(p => !p.urgentOverride);
  const remaining = Math.max(0, dailyLimit - sentCountToday);
  return [...urgents, ...normals.slice(0, remaining)];
}

// ── Main gate ─────────────────────────────────────────────────

export interface NotifGateInput {
  settings: AssistantSettings;
  ctx: DndContext;
  blocks: StudyBlock[];
  deadlines: AssistantDeadline[];
  today: string;
  nowHHMM: string;
  nowISO: string;
  sentCountToday: number;
}

export function judgeNotifications(input: NotifGateInput): NotifPayload[] {
  const { settings, ctx, blocks, deadlines, today, nowHHMM, nowISO, sentCountToday } = input;
  const style = settings.speechStyle;
  const dndOn = isDndActive(settings, ctx);
  const payloads: NotifPayload[] = [];

  // Blocks starting soon
  for (const b of blocks) {
    if (b.date !== today || b.status === '완료' || b.status === '건너뜀') continue;
    const alert = buildBlockStartAlert(b, nowHHMM, settings.blockStartWarningMin, style);
    if (alert) payloads.push(alert);
  }

  // Commute warning
  if (ctx.workSlot) {
    const commuteAlert = buildCommuteAlert(ctx.workSlot, nowHHMM, settings.commuteWarningMin, style);
    if (commuteAlert) payloads.push(commuteAlert);
  }

  // Deadlines
  payloads.push(...buildDeadlineAlerts(deadlines, today, nowHHMM, settings, style));

  // Filter DND — urgent always passes
  const filtered = dndOn ? payloads.filter(p => p.urgentOverride) : payloads;

  return throttleNotifs(filtered, settings.dailyNotifLimit, sentCountToday);
}
