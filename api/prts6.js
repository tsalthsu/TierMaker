// api/prts6.js
export const config = { runtime: 'edge' };

function ok(json) {
  return new Response(JSON.stringify(json), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // CDN 캐시 (1분) — 너무 오래 캐시하면 신캐 반영 지연됨
      'cache-control': 'max-age=60, s-maxage=60',
    },
  });
}
function bad(status, msg) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

async function fetchJSON(url) {
  // try origin=*
  try {
    const r = await fetch(url + (url.includes('?') ? '&' : '?') + 'origin=*');
    if (r.ok) return await r.json();
  } catch {}
  // fallback text proxy
  try {
    const r = await fetch('https://r.jina.ai/http/' + url.replace(/^https?:\/\//, ''));
    if (r.ok) return JSON.parse(await r.text());
  } catch {}
  throw new Error('prts api unreachable');
}

const chunk = (arr, n) => (arr.length ? [arr.slice(0, n), ...chunk(arr.slice(n), n)] : []);

async function askSixStar() {
  // Semantic MediaWiki ASK: 분류=干员 이고, 稀有度=6 (또는 ★6)
  const query = encodeURIComponent('[[分类:干员]][[稀有度::6||★6]]|?干员外文名|limit=500');
  const url = `https://prts.wiki/api.php?action=ask&api_version=3&format=json&query=${query}`;
  const data = await fetchJSON(url);
  const results = Array.isArray(data?.results) ? data.results : [];
  return results.map((r) => ({
    title: r.fulltext,
    en: (r.printouts?.['干员外文名']?.[0] || '').toString().trim(),
  }));
}

async function categorySixStar() {
  // 카테고리: 六星干员
  const cmtitle = encodeURIComponent('Category:六星干员');
  const url = `https://prts.wiki/api.php?action=query&list=categorymembers&cmtitle=${cmtitle}&cmlimit=500&format=json`;
  const data = await fetchJSON(url);
  const arr = Array.isArray(data?.query?.categorymembers) ? data.query.categorymembers : [];
  return arr.map((m) => ({ title: m.title, en: '' }));
}

async function withImages(entries) {
  const out = [];
  for (const batch of chunk(entries, 30)) {
    const titles = batch.map((e) => e.title).join('|');
    const qi = await fetchJSON(
      `https://prts.wiki/api.php?action=query&prop=pageimages&piprop=original&format=json&titles=${encodeURIComponent(
        titles
      )}`
    );
    const pages = qi?.query?.pages || {};
    const map = {};
    Object.values(pages).forEach((p) => {
      if (p?.title) map[p.title] = p?.original?.source || '';
    });
    for (const e of batch) {
      const img = map[e.title] || '';
      const label = e.en || e.title;
      out.push({ label, image: img });
    }
  }
  // 이미지가 없는 건 제외
  return out.filter((x) => x.image);
}

export default async function handler(req) {
  try {
    // 1) ASK 시도
    let entries = await askSixStar();
    // 2) 비면 카테고리 폴백
    if (!entries.length) entries = await categorySixStar();
    if (!entries.length) return ok([]);

    const list = await withImages(entries);
    return ok(list);
  } catch (err) {
    return bad(500, err.message || 'server error');
  }
}
