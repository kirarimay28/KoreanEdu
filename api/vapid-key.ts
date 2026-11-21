export default function handler(req: any, res: any) {
  const key = process.env.VITE_VAPID_PUBLIC_KEY;
  if (!key) return res.status(500).json({ error: 'VAPID key not configured' });
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ key });
}
