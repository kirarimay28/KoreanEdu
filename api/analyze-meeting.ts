export const config = {
  api: { bodyParser: { sizeLimit: '1mb' } },
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

  const { transcript } = req.body ?? {};
  if (!transcript || !transcript.trim()) {
    res.status(400).json({ error: '스크립트가 비어 있습니다.' });
    return;
  }

  const prompt = `다음은 스터디 모임 운영 회의 스크립트입니다. 이 내용을 분석하여 규정/결정 변경사항을 카테고리별로 정리해주세요.

--- 스크립트 시작 ---
${transcript.trim()}
--- 스크립트 끝 ---

아래 JSON 형식으로만 응답하세요. 각 카테고리에 해당하는 항목이 없으면 빈 배열([])로 두세요.
각 항목은 간결하고 명확한 한 문장으로 작성하세요.
수정된 규정은 "기존 내용 → 변경 내용" 형식으로 작성하세요.

{
  "new": ["새로 생긴 규정 또는 새로 도입된 정책"],
  "modified": ["기존 규정이 어떻게 바뀌었는지 (이전 → 이후)"],
  "removed": ["삭제되거나 폐지된 규정"],
  "other": ["규정 외 기타 결정사항이나 공지"]
}`;

  const body = JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] });
  const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

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
          try {
            const parsed = match ? JSON.parse(match[0]) : {};
            res.status(200).json({
              new: Array.isArray(parsed.new) ? parsed.new : [],
              modified: Array.isArray(parsed.modified) ? parsed.modified : [],
              removed: Array.isArray(parsed.removed) ? parsed.removed : [],
              other: Array.isArray(parsed.other) ? parsed.other : [],
            });
          } catch {
            res.status(200).json({ new: [], modified: [], removed: [], other: [] });
          }
          return;
        }
        lastError = data?.error?.message ?? `오류 (${response.status})`;
        if (response.status !== 503 && response.status !== 429) break;
        await new Promise(r => setTimeout(r, 1500));
      }
    }
    res.status(500).json({ error: lastError });
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
}
