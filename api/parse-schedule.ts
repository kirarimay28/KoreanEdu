import { GoogleGenerativeAI } from '@google/generative-ai';

export const config = { api: { bodyParser: { sizeLimit: '20mb' } } };

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end();

  const { imageBase64, mimeType, type } = req.body as {
    imageBase64: string;
    mimeType: string;
    type: 'timetable' | 'work';
  };

  if (!imageBase64 || !type) return res.status(400).json({ error: 'missing fields' });

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  let prompt = '';
  if (type === 'timetable') {
    prompt = `이 이미지는 대학교 강의 시간표입니다. 시간표를 분석해서 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요:
{"semesterStart":"YYYY-MM-DD","semesterEnd":"YYYY-MM-DD","subjects":[{"name":"과목명","times":[{"day":"월","start":"HH:MM","end":"HH:MM"}]}]}
- 요일은 반드시 월/화/수/목/금/토/일 중 하나
- 시간은 24시간 HH:MM 형식
- semesterStart/semesterEnd를 알 수 없으면 빈 문자열로`;
  } else {
    prompt = `이 이미지에서 출근 일정을 분석해서 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요:
{"workDays":["월","화","수","목","금"],"workStart":"HH:MM","workEnd":"HH:MM","commuteMinutes":0,"returnMinutes":0}
- 요일은 반드시 월/화/수/목/금/토/일 중 하나
- 시간은 24시간 HH:MM 형식
- 알 수 없는 값은 기본값으로`;
  }

  try {
    const result = await model.generateContent([
      { inlineData: { data: imageBase64, mimeType: mimeType ?? 'image/jpeg' } },
      { text: prompt },
    ]);
    const raw = result.response.text().trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('JSON 파싱 실패: ' + raw.slice(0, 200));
    const json = JSON.parse(match[0]);
    return res.status(200).json(json);
  } catch (err: any) {
    console.error('parse-schedule error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
