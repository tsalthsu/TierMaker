export default async function handler(req, res) {
  try {
    const { rarity = '6' } = req.query;

    // 1) Ask API to list operators with specified rarity and English name
    const ask = encodeURIComponent('[[分类:干员]][[稀有度::' + rarity + '||★' + rarity + ']]|?干员外文名|limit=500');
    const askUrl = `https://prts.wiki/api.php?action=ask&api_version=3&format=json&origin=*&query=${ask}`;
    const listRes = await fetch(askUrl);
    const listJson = await listRes.json();
    const results = Array.isArray(listJson?.results) ? listJson.results : [];
    if (!results.length) {
      return res.status(200).json([]);
    }

    const entries = results.map(r => ({
      title: r.fulltext,
      en: (r.printouts?.["干员外文名"]?.[0] || '').toString().trim()
    }));

    // 2) PageImages to get original image
    const chunk = (arr, n) => arr.length ? [arr.slice(0, n), ...chunk(arr.slice(n), n)] : [];
    const batches = chunk(entries, 30);
    const out = [];

    for (const batch of batches) {
      const titles = batch.map(e => e.title).join('|');
      const qiUrl = `https://prts.wiki/api.php?action=query&prop=pageimages&piprop=original&format=json&origin=*&titles=${encodeURIComponent(titles)}`;
      const qiRes = await fetch(qiUrl);
      const qi = await qiRes.json();
      const pages = qi?.query?.pages || {};
      const map = {};
      Object.values(pages).forEach(p => {
        if (p?.title) map[p.title] = p?.original?.source || '';
      });
      for (const e of batch) {
        const img = map[e.title] || '';
        const label = e.en || e.title;
        out.push({ label, image: img });
      }
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(out);
  } catch (err) {
    console.error(err);
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ error: 'proxy-failed' });
  }
}
