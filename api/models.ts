export default async function handler(req: any, res: any) {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'GOOGLE_AI_API_KEY 없음' });
    return;
  }
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`
  );
  const data = await response.json();
  res.status(response.status).json(data);
}
