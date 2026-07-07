export const config = {
  api: {
    bodyParser: false,
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

  const chunks: Uint8Array[] = [];
  await new Promise<void>((resolve, reject) => {
    req.on('data', (chunk: Uint8Array) => chunks.push(chunk));
    req.on('end', resolve);
    req.on('error', reject);
  });

  const totalLength = chunks.reduce((n, c) => n + c.byteLength, 0);
  const bodyBuffer = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    bodyBuffer.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const fileName: string = (req.headers['x-file-name'] as string) ?? 'upload.pdf';

  let noticeStr = '';
  try {
    const noticeRaw = req.headers['x-notice'] as string;
    if (noticeRaw) {
      const notice = JSON.parse(noticeRaw);
      const classicParts: string[] = [];
      if (notice.classicPoetWork && notice.classicPoetWork !== '없음') classicParts.push(`고전 시가: ${notice.classicPoetWork}`);
      if (notice.classicProseWork && notice.classicProseWork !== '없음') classicParts.push(`고전 산문: ${notice.classicProseWork}`);
      const modernPoet = notice.modernPoetWork !== '없음' ? (notice.modernPoetWork || '미정') : '없음';
      const modernProse = notice.modernProseWork !== '없음' ? (notice.modernProseWork || '미정') : '없음';
      noticeStr = `이번 주 과제 — ${classicParts.length ? classicParts.join(', ') : '고전: 미정'}, 현대시: ${modernPoet}, 현대산문: ${modernProse}`;
    }
  } catch {}

  try {
    // Upload PDF to Gemini File API
    const initRes = await fetch(
      `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'X-Goog-Upload-Protocol': 'resumable',
          'X-Goog-Upload-Command': 'start',
          'X-Goog-Upload-Header-Content-Length': String(totalLength),
          'X-Goog-Upload-Header-Content-Type': 'application/pdf',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ file: { displayName: fileName } }),
      }
    );

    const uploadUrl = initRes.headers.get('x-goog-upload-url');
    if (!uploadUrl) {
      res.status(500).json({ error: '업로드 URL을 받을 수 없습니다.' });
      return;
    }

    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/pdf',
        'X-Goog-Upload-Command': 'upload, finalize',
        'X-Goog-Upload-Offset': '0',
      },
      body: bodyBuffer,
    });

    if (!uploadRes.ok) {
      res.status(500).json({ error: `파일 업로드 오류 (${uploadRes.status})` });
      return;
    }

    const fileData = await uploadRes.json() as any;
    const fileUri: string = fileData.uri ?? fileData.file?.uri;
    if (!fileUri) {
      res.status(500).json({ error: '파일 URI를 받을 수 없습니다.' });
      return;
    }

    // Wait for file to be processed
    await new Promise(r => setTimeout(r, 2000));

    const prompt = `다음은 국어 임용고시 스터디 구성원의 발표 자료 또는 스터디 일지 PDF입니다.${noticeStr ? '\n' + noticeStr : ''}

【핵심 원칙】
- PDF에 명시적으로 기재된 내용만 정리하세요.
- PDF에 없는 내용은 절대 추가하거나 추측하지 마세요.
- 풀지 않은 문제를 오답으로 처리하거나, 언급되지 않은 약점을 임의로 추가하지 마세요.
- 해당 항목의 내용이 PDF에 없으면 반드시 빈 문자열("")로 남기세요.

각 필드는 **단권화 스타일**로 작성해주세요:
- 핵심 키워드나 개념은 **굵게** 표시 (예: **화자**, **주제**)
- 각 항목은 줄바꿈으로 구분
- 줄글 대신 간결한 불릿(•) 형식

JSON만 반환하세요.

{
  "classicAnalysis": "PDF에 있는 고전 작품 분석 내용만. 없으면 \"\"",
  "classicDifficulty": "PDF에 명시된 어려웠던 부분만. 없으면 \"\"",
  "modernPoetAnalysis": "PDF에 있는 현대시 분석 내용만. 없으면 \"\"",
  "modernPoetDifficulty": "PDF에 명시된 어려웠던 부분만. 없으면 \"\"",
  "modernProseAnalysis": "PDF에 있는 현대산문 분석 내용만. 없으면 \"\"",
  "modernProseDifficulty": "PDF에 명시된 어려웠던 부분만. 없으면 \"\"",
  "wrongAnswerAnalysis": "PDF에 실제로 기재된 오답 분석만. 문제를 풀지 않았거나 언급이 없으면 반드시 \"\"",
  "examTypeAnalysis": "PDF에 있는 기출 유형 분석만. 없으면 \"\"",
  "studyGroupLearnings": "PDF에 기재된 스터디에서 배운 점만. 없으면 \"\"",
  "selfFeedback": "PDF에 실제로 작성된 자기 피드백과 계획만. 없는 내용을 임의로 추가하지 말 것. 없으면 \"\""
}`;

    const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];
    const body = JSON.stringify({
      contents: [{
        parts: [
          { fileData: { mimeType: 'application/pdf', fileUri } },
          { text: prompt },
        ],
      }],
    });

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
