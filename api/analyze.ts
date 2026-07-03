import { GoogleGenerativeAI } from '@google/generative-ai';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'GOOGLE_AI_API_KEY가 설정되지 않았습니다.' });
    return;
  }

  const { pdfText, notice } = req.body ?? {};
  if (!pdfText || typeof pdfText !== 'string') {
    res.status(400).json({ error: 'PDF 텍스트가 없습니다.' });
    return;
  }

  const noticeStr = notice
    ? `이번 주 과제 — 고전: ${notice.classicWork || '미정'}, 현대시: ${notice.modernPoetWork || '미정'}, 현대산문: ${notice.modernProseWork || '미정'}`
    : '';

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `다음은 국어 임용고시 스터디 구성원의 발표 자료 또는 스터디 일지 내용입니다.${noticeStr ? '\n' + noticeStr : ''}

--- 자료 내용 시작 ---
${pdfText}
--- 자료 내용 끝 ---

위 내용을 바탕으로 다음 JSON 형식으로 스터디 내용을 정리해주세요.
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
}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const match = text.match(/\{[\s\S]*\}/);
    res.status(200).json(match ? JSON.parse(match[0]) : {});
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: msg });
  }
}
