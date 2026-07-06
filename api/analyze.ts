export const config = {
  maxDuration: 60,
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

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'GOOGLE_AI_API_KEY가 설정되지 않았습니다.' });
    return;
  }

  const { pdfUrl, notice } = req.body ?? {};
  if (!pdfUrl || typeof pdfUrl !== 'string') {
    res.status(400).json({ error: 'PDF URL이 없습니다.' });
    return;
  }

  // Fetch PDF from Firebase Storage
  const pdfResponse = await fetch(pdfUrl);
  if (!pdfResponse.ok) {
    res.status(400).json({ error: 'PDF를 가져올 수 없습니다.' });
    return;
  }
  const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());
  const pdfBase64 = pdfBuffer.toString('base64');

  let noticeStr = '';
  if (notice) {
    const classicParts: string[] = [];
    if (notice.classicPoetWork && notice.classicPoetWork !== '없음') classicParts.push(`고전 시가: ${notice.classicPoetWork}`);
    if (notice.classicProseWork && notice.classicProseWork !== '없음') classicParts.push(`고전 산문: ${notice.classicProseWork}`);
    const modernPoet  = notice.modernPoetWork  !== '없음' ? (notice.modernPoetWork  || '미정') : '없음';
    const modernProse = notice.modernProseWork !== '없음' ? (notice.modernProseWork || '미정') : '없음';
    noticeStr = `이번 주 과제 — ${classicParts.length ? classicParts.join(', ') : '고전: 미정'}, 현대시: ${modernPoet}, 현대산문: ${modernProse}`;
  }

  const prompt = `다음 PDF는 국어 임용고시 스터디 구성원의 발표 자료 또는 스터디 일지입니다.${noticeStr ? '\n' + noticeStr : ''}

위 PDF 내용을 바탕으로 다음 JSON 형식으로 스터디 내용을 정리해주세요.
각 필드는 **단권화 스타일**로 작성해주세요:
- 핵심 키워드나 개념은 **굵게** 표시 (예: **화자**, **주제**)
- 각 항목은 줄바꿈으로 구분
- 줄글 대신 간결한 불릿(•) 형식
없는 내용은 빈 문자열("")로 남겨두세요. JSON만 반환하세요.

{
  "classicAnalysis": "• **핵심어**: 설명\n• **핵심어**: 설명",
  "classicDifficulty": "• 어려웠던 부분 요점",
  "modernPoetAnalysis": "• **핵심어**: 설명\n• **핵심어**: 설명",
  "modernPoetDifficulty": "• 어려웠던 부분 요점",
  "modernProseAnalysis": "• **핵심어**: 설명\n• **핵심어**: 설명",
  "modernProseDifficulty": "• 어려웠던 부분 요점",
  "wrongAnswerAnalysis": "• 오답 원인 요점",
  "examTypeAnalysis": "• 기출 유형 요점",
  "studyGroupLearnings": "• 배운 점 요점",
  "selfFeedback": "• 피드백 및 계획 요점"
}`;

  const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
  const body = JSON.stringify({
    contents: [{
      parts: [
        { text: prompt },
        { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
      ],
    }],
  });

  try {
    let lastError = '';

    for (const model of MODELS) {
      for (let attempt = 0; attempt < 2; attempt++) {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }
        );
        const data = await response.json() as any;
        if (response.ok) {
          const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
          const match = text.match(/\{[\s\S]*\}/);
          res.status(200).json(match ? JSON.parse(match[0]) : {});
          return;
        }
        lastError = data?.error?.message ?? `오류 (${response.status})`;
        if (response.status !== 503 && response.status !== 429) break;
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    res.status(500).json({ error: lastError });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: msg });
  }
}
