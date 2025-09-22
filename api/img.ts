import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = (req.query.url as string) || '';
  if (!url) {
    res.status(400).json({ error: 'Missing url param' });
    return;
  }

  try {
    const upstream = await fetch(url);
    if (!upstream.ok) {
      res.status(upstream.status).send('Upstream error');
      return;
    }

    const ct = upstream.headers.get('content-type') ?? 'application/octet-stream';
    const buf = Buffer.from(await (await upstream.blob()).arrayBuffer());

    res.setHeader('Content-Type', ct);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, s-maxage=86400, max-age=86400, immutable');
    res.status(200).send(buf);
  } catch (e) {
    res.status(500).send('Proxy fetch failed');
  }
}
