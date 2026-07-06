export default function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ geminiKey: process.env.GOOGLE_AI_API_KEY ?? '' });
}
