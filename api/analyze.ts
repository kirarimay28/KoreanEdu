import Anthropic from '@anthropic-ai/sdk';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY가 설정되지 않았습니다.' });
    return;
  }

  const { pdfUrl, notice } = req.body ?? {};
  if (!pdfUrl || typeof pdfUrl !== 'string') {
    res.status(400).json({ error: 'PDF URL이 없습니다.' });
    return;
  }

  const noticeStr = notice
    ? `이번 주 과제 — 고전: ${notice.classicWork || '미정'}, 현대시: ${notice.modernPoetWork || '미정'}, 현대산문: ${notice.modernProseWork || '미정'}`
    : '';

  const client = new Anthropic({ apiKey });

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'url',
              url: pdfUrl,
            } as any,
          },
          {
            type: 'text',
            text: `이 PDF는 국어 임용고시 스터디 구성원의 발표 자료 또는 스터디 일지입니다.${noticeStr ? '\n' + noticeStr : ''}

PDF 내용을 바탕으로 다음 JSON 형식으로 스터디 내용을 정리해주세요.
없는 내용은 빈 문자열("")로 남겨두세요. JSON만 반환하세요.

{
  "classicAnalysis": "고전 작품 분석 내용 요약",
  "classicDifficulty": "고전 작품에서 어려웠던 부분",
  "modernPoetAnalysis": "현대시 분석 내용 요약",
  "modernPoetDifficulty": "현대시에서 어려웠던 부분",
  "modernProseAnalysis": "현대산문 분석 내용 요약",
  "modernProseDifficulty": "현대산문에서 어려웠던 부분",
  "wrongAnswerAnalysis": "오답 원인 분석",
  "examTypeAnalysis": "임용 기출 유형 분석",
  "studyGroupLearnings": "스터디에서 배운 것",
  "selfFeedback": "자가 피드백 및 다음 계획"
}`,
          },
        ],
      },
    ],
  });

  const text = msg.content[0]?.type === 'text' ? (msg.content[0] as any).text : '{}';

  try {
    const match = text.match(/\{[\s\S]*\}/);
    res.status(200).json(match ? JSON.parse(match[0]) : {});
  } catch {
    res.status(500).json({ error: 'AI 응답 파싱에 실패했습니다.' });
  }
}
