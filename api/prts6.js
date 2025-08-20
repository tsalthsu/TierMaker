// api/prts6.js
// 임시 어댑터: /api/prts6 -> /api/ops6 프록시
export default async function handler(req, res) {
  try {
    const base = req.headers["x-forwarded-proto"] && req.headers.host
      ? `${req.headers["x-forwarded-proto"]}://${req.headers.host}`
      : `https://${req.headers.host}`;
    const r = await fetch(`${base}/api/ops6`);
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e) {
    res.status(500).json({ error: "adapter failed", detail: e.message });
  }
}
