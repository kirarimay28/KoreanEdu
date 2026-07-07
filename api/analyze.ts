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

  const { pdfText, fileUri, notice } = req.body ?? {};
  if (!pdfText && !fileUri) {
    res.status(400).json({ error: 'PDF 텍스트 또는 파일 URI가 없습니다.' });
    return;
  }

  let noticeStr = '';
  if (notice) {
    const classicParts: string[] = [];
    if (notice.classicPoetWork && notice.classicPoetWork !== '없음') classicParts.push(`고전 시가: ${notice.classicPoetWork}`);
    if (notice.classicProseWork && notice.classicProseWork !== '없음') classicParts.push(`고전 산문: ${notice.classicProseWork}`);
    const modernPoet  = notice.modernPoetWork  !== '없음' ? (notice.modernPoetWork  || '미정') : '없음';
    const modernProse = notice.modernProseWork !== '없음' ? (notice.modernProseWork || '미정') : '없음';
    noticeStr = `이번 주 과제 — ${classicParts.length ? classicParts.join(', ') : '고전: 미정'}, 현대시: ${modernPoet}, 현대산문: ${modernProse}`;
  }

  const promptBase = `다음은 국어 임용고시 스터디 구성원의 발표 자료 또는 스터디 일지입니다.${noticeStr ? '\n' + noticeStr : ''}

【핵심 원칙】
- 자료에 명시적으로 기재된 내용만 정리하세요.
- 자료에 없는 내용은 절대 추가하거나 추측하지 마세요.
- 풀지 않은 문제를 오답으로 처리하거나, 언급되지 않은 약점을 임의로 추가하지 마세요.
- 해당 항목의 내용이 없으면 반드시 빈 문자열("")로 남기세요.

각 필드는 **단권화 스타일**로 작성해주세요:
- 핵심 키워드나 개념은 **굵게** 표시 (예: **화자**, **주제**)
- 각 항목은 줄바꿈으로 구분
- 줄글 대신 간결한 불릿(•) 형식

JSON만 반환하세요.

{
  "classicAnalysis": "자료에 있는 고전 작품 분석 내용만. 없으면 \"\"",
  "classicDifficulty": "자료에 명시된 어려웠던 부분만. 없으면 \"\"",
  "modernPoetAnalysis": "자료에 있는 현대시 분석 내용만. 없으면 \"\"",
  "modernPoetDifficulty": "자료에 명시된 어려웠던 부분만. 없으면 \"\"",
  "modernProseAnalysis": "자료에 있는 현대산문 분석 내용만. 없으면 \"\"",
  "modernProseDifficulty": "자료에 명시된 어려웠던 부분만. 없으면 \"\"",
  "wrongAnswerAnalysis": "자료에 실제로 기재된 오답 분석만. 문제를 풀지 않았거나 언급이 없으면 반드시 \"\"",
  "examTypeAnalysis": "자료에 있는 기출 유형 분석만. 없으면 \"\"",
  "studyGroupLearnings": "자료에 기재된 스터디에서 배운 점만. 없으면 \"\"",
  "selfFeedback": "자료에 실제로 작성된 자기 피드백과 계획만. 없는 내용을 임의로 추가하지 말 것. 없으면 \"\""
}`;

  const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

  let parts: object[];
  if (fileUri) {
    parts = [
      { fileData: { mimeType: 'application/pdf', fileUri } },
      { text: promptBase },
    ];
  } else {
    const textPrompt = `다음은 국어 임용고시 스터디 구성원의 발표 자료 또는 스터디 일지 내용입니다.${noticeStr ? '\n' + noticeStr : ''}

--- 자료 내용 시작 ---
${pdfText}
--- 자료 내용 끝 ---

위 내용을 바탕으로 다음 JSON 형식으로 스터디 내용을 정리해주세요.
각 필드는 **단권화 스타일**로 작성해주세요:
- 핵심 키워드나 개념은 **굵게** 표시 (예: **화자**, **주제**)
- 각 항목은 줄바꿈으로 구분
- 줄글 대신 간결한 불릿(•) 형식
없는 내용은 빈 문자열("")로 남겨두세요. JSON만 반환하세요.

{
  "classicAnalysis": "• **핵심어**: 설명\\n• **핵심어**: 설명",
  "classicDifficulty": "• 어려웠던 부분 요점",
  "modernPoetAnalysis": "• **핵심어**: 설명\\n• **핵심어**: 설명",
  "modernPoetDifficulty": "• 어려웠던 부분 요점",
  "modernProseAnalysis": "• **핵심어**: 설명\\n• **핵심어**: 설명",
  "modernProseDifficulty": "• 어려웠던 부분 요점",
  "wrongAnswerAnalysis": "• 오답 원인 요점",
  "examTypeAnalysis": "• 기출 유형 요점",
  "studyGroupLearnings": "• 배운 점 요점",
  "selfFeedback": "• 피드백 및 계획 요점"
}`;
    parts = [{ text: textPrompt }];
  }

  const body = JSON.stringify({ contents: [{ parts }] });

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
