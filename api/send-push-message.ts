import type { VercelRequest, VercelResponse } from '@vercel/node';
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:lil146588@gmail.com',
  'BBeATcMUNmkXIHG4wE3R_POt4_l6cuVCFBWi_qf99B90ivyyi8al2E7K4UVWp9mw3RllPZ6z7pEoyODFh0LJOMQ',
  'BsYS40Uw3E8vnsnOpghen5AfVzeMxRUpnVrswKxntZ4',
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { subscription, title, body } = req.body as {
    subscription: webpush.PushSubscription;
    title: string;
    body: string;
  };
  if (!subscription || !title) return res.status(400).json({ error: 'missing fields' });
  try {
    await webpush.sendNotification(subscription, JSON.stringify({ title, body }));
    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error('web-push error:', err.statusCode, err.message);
    if (err.statusCode === 410 || err.statusCode === 404) {
      return res.status(410).json({ gone: true });
    }
    return res.status(500).json({ error: String(err.message), statusCode: err.statusCode });
  }
}
