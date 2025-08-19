// NOTE: Node 런타임으로 전환 (Edge에서 외부호출이 튀는 케이스 회피)
export const config = { runtime: 'nodejs' };

function ok(json) {
  return new Response(JSON.stringify(json), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'max-age=60, s-maxage=180',
    },
  });
}
function bad(status, msg) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

async function fetchJSON(url) {
  // 1) 원본 API 시도 (강한 UA/Accept)
  try {
    const r = await fetch(
      url + (url.includes('?') ? '&' : '?') + 'origin=*',
      {
        headers: {
          'user-agent': UA,
          accept: 'application/json,text/plain;q=0.9,*/*;q=0.8',
          'accept-language': 'en-US,en;q=0.8,ko;q=0.7,zh;q=0.6',
          referer: 'https://prts.wiki/',
        },
      }
    );
    if (r.ok) return await r.json();
  } catch {}

  // 2) Jina proxy (http) — 스킴 제거 형태
  try {
    const prox = 'https://r.jina.ai/http/' + url.replace(/^https?:\/\//, '');
    const r = await fetch(prox, { headers: { 'user-agent': UA } });
    if (r.ok) return JSON.parse(await r.text());
  } catch {}

  // 3) isomorphic-git CORS proxy
  try {
    const r = await fetch('https://cors.isomorphic-git.org/' + url, {
      headers: { 'user-agent': UA },
    });
    if (r.ok) return await r.json();
  } catch {}

  throw new Error('prts api unreachable');
}

async function fetchTEXT(url) {
  // 1) 원본
  try {
    const r = await fetch(url, {
      headers: {
        'user-agent': UA,
        accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.8,ko;q=0.7,zh;q=0.6',
        referer: 'https://prts.wiki/',
      },
    });
    if (r.ok) return await r.text();
  } catch {}
  // 2) Jina
  try {
    const prox = 'https://r.jina.ai/http/' + url.replace(/^https?:\/\//, '');
    const r = await fetch(prox, { headers: { 'user-agent': UA } });
    if (r.ok) return await r.text();
  } catch {}
  // 3) isomorphic-git
  try {
    const r = await fetch('https://cors.isomorphic-git.org/' + url, {
      headers: { 'user-agent': UA },
    });
    if (r.ok) return await r.text();
  } catch {}

  throw new Error('html fetch failed');
}

const chunk = (arr, n) => (arr.length ? [arr.slice(0, n), ...chunk(arr.slice(n), n)] : []);

/** 1) 시맨틱 ASK (가능하면 영문명까지) */
async function askSixStar() {
  const query = encodeURIComponent('[[分类:干员]][[稀有度::6||★6]]|?干员外文名|limit=500');
  const url = `https://prts.wiki/api.php?action=ask&api_version=3&format=json&query=${query}`;
  const data = await fetchJSON(url);
  const results = Array.isArray(data?.results) ? data.results : [];
  return results.map((r) => ({
    title: r.fulltext,
    en: (r.printouts?.['干员外文名']?.[0] || '').toString().trim(),
  }));
}

/** 2) 카테고리 폴백 */
async function categorySixStar() {
  const cmtitle = encodeURIComponent('Category:六星干员');
  const url = `https://prts.wiki/api.php?action=query&list=categorymembers&cmtitle=${cmtitle}&cmlimit=500&format=json`;
  const data = await fetchJSON(url);
  const arr = Array.isArray(data?.query?.categorymembers) ? data.query.categorymembers : [];
  return arr.map((m) => ({ title: m.title, en: '' }));
}

/** 3) HTML 스크랩 폴백 */
async function scrapeListPage() {
  const url = 'https://prts.wiki/w/%E5%B9%B2%E5%91%98%E4%B8%80%E8%A7%88?rarity=1-6';
  const html = await fetchTEXT(url);

  const imgRegex = /<a[^>]*?\s+title="([^"]+)"[^>]*>\s*<img[^>]+?(?:src|data-src)="([^"]+头像_[^"]+\.png)"/gim;
  const map = new Map();
  let m;
  while ((m = imgRegex.exec(html))) {
    const title = decodeHTMLEntities(m[1]).trim();
    let src = m[2];
    if (src.startsWith('//')) src = 'https:' + src;
    map.set(title, src);
  }

  const titles = [...map.keys()];
  let enMap = {};
  if (titles.length) enMap = await queryEnglishNames(titles);

  return titles.map((t) => ({
    title: t,
    en: (enMap[t] || '').trim(),
    image: map.get(t),
  }));
}

function decodeHTMLEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

async function queryEnglishNames(titles) {
  const out = {};
  for (const batch of chunk(titles, 50)) {
    const filters = batch.map((t) => `[[${t}]]`).join('');
    const query = encodeURIComponent(`${filters}|?干员外文名|limit=500`);
    const url = `https://prts.wiki/api.php?action=ask&api_version=3&format=json&query=${query}`;
    try {
      const data = await fetchJSON(url);
      const results = Array.isArray(data?.results) ? data.results : [];
      results.forEach((r) => {
        const title = r.fulltext;
        const en = (r.printouts?.['干员外文名']?.[0] || '').toString();
        if (title) out[title] = en;
      });
    } catch {}
  }
  return out;
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
    const imgMap = {};
    Object.values(pages).forEach((p) => {
      if (p?.title) imgMap[p.title] = p?.original?.source || '';
    });
    for (const e of batch) {
      const img = imgMap[e.title] || e.image || '';
      const label = e.en || e.title;
      out.push({ label, image: img });
    }
  }
  return out.filter((x) => x.image);
}

export default async function handler(req) {
  try {
    let entries = await askSixStar();
    if (!entries.length) entries = await categorySixStar();

    let scraped = [];
    if (!entries.length) scraped = await scrapeListPage();

    if (!entries.length && !scraped.length) return ok([]);

    if (!entries.length) {
      const list = scraped.map((s) => ({ title: s.title, en: s.en, image: s.image }));
      return ok(await withImages(list));
    } else {
      const list = entries.map((e) => ({ title: e.title, en: e.en, image: '' }));
      return ok(await withImages(list));
    }
  } catch (err) {
    return bad(500, err.message || 'server error');
  }
}
