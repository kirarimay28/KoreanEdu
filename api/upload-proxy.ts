export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
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
    res.status(500).json({ error: 'API key missing' });
    return;
  }

  const fileName = req.headers['x-file-name'] ?? 'upload.pdf';

  // req.body is a Buffer when Content-Type is application/pdf
  const bodyBuffer: Buffer = Buffer.isBuffer(req.body)
    ? req.body
    : Buffer.from(req.body);

  const contentLength = String(bodyBuffer.byteLength);

  const initRes = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': contentLength,
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
    res.status(500).json({ error: `Gemini 업로드 오류 (${uploadRes.status})` });
    return;
  }

  const fileData = await uploadRes.json() as any;
  const fileUri = fileData.uri ?? fileData.file?.uri;
  if (!fileUri) {
    res.status(500).json({ error: '파일 URI를 받을 수 없습니다.' });
    return;
  }

  res.status(200).json({ fileUri });
}
