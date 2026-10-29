import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import type { MessageParam, Tool } from '@anthropic-ai/sdk/resources/messages';

if (!getApps().length) {
  initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!)) });
}

const db = getFirestore();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// ── Types ─────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ProposalData {
  type: 'study_block' | 'deadline' | 'memo';
  action: 'add' | 'edit' | 'delete' | 'skip';
  summary: string;
  reason: string;
  data?: Record<string, unknown>;
}

// ── Tools ─────────────────────────────────────────────────────

const TOOLS: Tool[] = [
  {
    name: 'propose_change',
    description: '일정(공부 블록·마감일) 변경을 제안한다. 사용자가 확인하면 그때 반영되고, 확인 전까지 아무것도 바뀌지 않는다.',
    input_schema: {
      type: 'object' as const,
      properties: {
        type:    { type: 'string', enum: ['study_block', 'deadline'], description: '변경 대상 종류' },
        action:  { type: 'string', enum: ['add', 'edit', 'delete', 'skip'], description: '수행할 동작' },
        summary: { type: 'string', description: '사용자에게 보여줄 변경 요약 (1~2줄)' },
        reason:  { type: 'string', description: '변경 이유' },
        data:    { type: 'object', description: '변경 내용 (선택)' },
      },
      required: ['type', 'action', 'summary', 'reason'],
    },
  },
  {
    name: 'add_memo',
    description: '비서 메모에 중요한 내용을 저장한다. 사용자 선호, 기억해야 할 사항, 학습 패턴 등을 기록할 때 사용.',
    input_schema: {
      type: 'object' as const,
      properties: {
        content:  { type: 'string', description: '저장할 메모 내용' },
        category: { type: 'string', description: '메모 분류 (예: 선호, 패턴, 기타)' },
      },
      required: ['content'],
    },
  },
];

// ── Context loader ────────────────────────────────────────────

async function loadContext(userId: string): Promise<string> {
  const now = new Date();
  const today = now.toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).replace(/\. /g, '-').replace('.', '');

  const lines: string[] = [`오늘: ${today}`];

  // Today's study blocks (label, time, status only — no PII)
  try {
    const blocksSnap = await db.collection('assistantStudyBlocks')
      .where('userId', '==', userId).where('date', '==', today).get();
    const blocks = blocksSnap.docs.map(d => d.data());
    if (blocks.length > 0) {
      lines.push('\n오늘 공부 블록:');
      for (const b of blocks.sort((a, b) => a.start.localeCompare(b.start))) {
        lines.push(`  [${b.status}] ${b.start}~${b.end} ${b.label}`);
      }
    }
  } catch {}

  // Upcoming deadlines (next 14 days)
  try {
    const cutoff = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
      .toISOString().slice(0, 10);
    const dlSnap = await db.collection('assistantDeadlines')
      .where('userId', '==', userId).where('completed', '==', false).get();
    const upcoming = dlSnap.docs.map(d => d.data())
      .filter(d => d.date <= cutoff)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5);
    if (upcoming.length > 0) {
      lines.push('\n마감·행사 (14일 이내):');
      for (const d of upcoming) {
        const diff = Math.ceil((new Date(d.date + 'T00:00:00+09:00').getTime() - now.getTime()) / 86400000);
        lines.push(`  D-${diff} ${d.date} ${d.title}`);
      }
    }
  } catch {}

  // Recent memos
  try {
    const memoSnap = await db.collection('assistantMemos')
      .where('userId', '==', userId).orderBy('createdAt', 'desc').limit(5).get();
    const memos = memoSnap.docs.map(d => d.data());
    if (memos.length > 0) {
      lines.push('\n비서 메모:');
      for (const m of memos) lines.push(`  - ${m.content}`);
    }
  } catch {}

  return lines.join('\n');
}

// ── Handler ───────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { messages, userId, speechStyle } = req.body as {
    messages: ChatMessage[];
    userId: string;
    speechStyle?: '반말' | '존댓말';
  };

  if (!userId || !messages?.length) return res.status(400).json({ error: 'missing fields' });

  // Only allow the assistant owner
  if (userId !== '서연') return res.status(403).json({ error: 'forbidden' });

  try {
    const context = await loadContext(userId);
    const styleNote = speechStyle === '존댓말'
      ? '존댓말로 정중하게 답해.'
      : '반말로 짧고 단정하게 답해. 불필요한 군더더기는 빼.';

    const systemPrompt = `너는 임용 시험 준비생의 AI 비서야. ${styleNote}
공부 블록·마감일을 바꿀 때는 절대 혼자 결정하지 말고, propose_change 툴로 제안만 해. 사용자가 확인 버튼을 누르면 그때 반영돼.
중요한 선호나 패턴을 발견하면 add_memo로 저장해.
모르는 건 모른다고 해. 가이드라인 없는 내용은 추측하지 마.

현재 상황:
${context}`;

    const apiMessages: MessageParam[] = messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      tools: TOOLS,
      messages: apiMessages,
    });

    // Extract text and tool calls
    let text = '';
    let proposal: ProposalData | null = null;
    let memoSaved: string | null = null;

    for (const block of response.content) {
      if (block.type === 'text') {
        text += block.text;
      } else if (block.type === 'tool_use') {
        if (block.name === 'propose_change') {
          proposal = block.input as ProposalData;
        } else if (block.name === 'add_memo') {
          const input = block.input as { content: string; category?: string };
          try {
            const id = `${userId}_memo_${Date.now()}`;
            await db.collection('assistantMemos').doc(id).set({
              id, userId, content: input.content,
              category: input.category ?? '기타',
              source: 'auto',
              createdAt: new Date().toISOString(),
            });
            memoSaved = input.content;
          } catch {}
        }
      }
    }

    // If tool_use with no text, generate a brief follow-up
    if (!text && proposal) {
      text = `이렇게 바꿀까?`;
    }
    if (!text && memoSaved) {
      text = `메모해 뒀어.`;
    }

    return res.status(200).json({
      message: text,
      proposal,
      memoSaved,
      stopReason: response.stop_reason,
    });
  } catch (err: any) {
    console.error('assistant/chat error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
