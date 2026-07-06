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

  const chunks: Uint8Array[] = [];
  await new Promise<void>((resolve, reject) => {
    req.on('data', (chunk: Uint8Array) => chunks.push(chunk));
    req.on('end', resolve);
    req.on('error', reject);
  });

  const totalLength = chunks.reduce((n, c) => n + c.byteLength, 0);
  const buffer = Buffer.alloc(totalLength);
  let offset = 0;
  for (const c of chunks) {
    buffer.set(c, offset);
    offset += c.byteLength;
  }

  try {
    const pdfParse = (await import('pdf-parse')).default;
    const data = await pdfParse(buffer);
    res.status(200).json({ text: data.text ?? '' });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: msg });
  }
}
