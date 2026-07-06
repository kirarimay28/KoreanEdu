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

  const { fileSize, fileName } = req.body ?? {};

  const response = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': String(fileSize ?? 0),
        'X-Goog-Upload-Header-Content-Type': 'application/pdf',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ file: { displayName: fileName ?? 'upload.pdf' } }),
    }
  );

  const uploadUrl = response.headers.get('x-goog-upload-url');
  if (!uploadUrl) {
    res.status(500).json({ error: '업로드 URL을 받을 수 없습니다.' });
    return;
  }

  res.status(200).json({ uploadUrl });
}
