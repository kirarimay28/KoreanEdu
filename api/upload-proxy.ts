export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key missing' }), { status: 500 });
  }

  const fileName = req.headers.get('x-file-name') ?? 'upload.pdf';
  const bodyBuffer = await req.arrayBuffer();
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
    return new Response(JSON.stringify({ error: '업로드 URL을 받을 수 없습니다.' }), { status: 500 });
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
    return new Response(JSON.stringify({ error: `Gemini 업로드 오류 (${uploadRes.status})` }), { status: 500 });
  }

  const fileData = await uploadRes.json() as any;
  const fileUri = fileData.uri ?? fileData.file?.uri;
  if (!fileUri) {
    return new Response(JSON.stringify({ error: '파일 URI를 받을 수 없습니다.' }), { status: 500 });
  }

  return new Response(JSON.stringify({ fileUri }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
