export const config = { runtime: 'edge' };

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

async function fetchJSON(url) {
  try {
    const r = await fetch(url + (url.includes('?') ? '&' : '?') + 'origin=*');
    if (r.ok) return await r.json();
  } catch {}
  try {
    const r = await fetch('https://r.jina.ai/http/' + url.replace(/^https?:\/\//, ''));
    if (r.ok) return JSON.parse(await r.text());
  } catch {}
  throw new Error('prts api unreachable');
}
async function fetchTEXT(url) {
  try {
    const r = await fetch(url, { headers: { 'accept': 'text/html' } });
    if (r.ok) return await r.text();
  } catch {}
  // text proxy
  const prox = 'https://r.jina.ai/http/' + url.replace(/^https?:\/\//, '');
  const r = await fetch(prox);
  if (!r.ok) throw new Error('html fetch failed');
  return await r.text();
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

/** 3) HTML 스크랩 폴백 (干员一览?rarity=1-6) */
async function scrapeListPage() {
  const url = 'https://prts.wiki/w/%E5%B9%B2%E5%91%98%E4%B8%80%E8%A7%88?rarity=1-6';
  const html = await fetchTEXT(url);

  // 이미지와 타이틀(상위 a title)을 수집
  // 头像_*.png 만 대상으로 수집 (원본/썸네일 모두 허용)
  const imgRegex = /<a[^>]*?\s+title="([^"]+)"[^>]*>\s*<img[^>]+?(?:src|data-src)="([^"]+头像_[^"]+\.png)"/gim;
  const map = new Map(); // title -> image
  let m;
  while ((m = imgRegex.exec(html))) {
    const title = decodeHTMLEntities(m[1]).trim();
    let src = m[2];
    if (src.startsWith('//')) src = 'https:' + src;
    map.set(title, src);
  }

  // 타이틀 목록으로 영문명 보강 시도
  const titles = [...map.keys()];
  let enMap = {};
  if (titles.length) {
    enMap = await queryEnglishNames(titles);
  }

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
  // 시맨틱 ask는 타이틀별로도 가능하므로 50개 단위로 질의
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
  // pageimages 로 원본 이미지가 있으면 우선 사용
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
      const img = map[e.title] || e.image || '';
      const label = e.en || e.title;
      out.push({ label, image: img });
    }
  }
  // 이미지 없는 건 버림
  return out.filter((x) => x.image);
}

export default async function handler(req) {
  try {
    // 1) ASK
    let entries = await askSixStar();
    // 2) 카테고리
    if (!entries.length) entries = await categorySixStar();
    // 3) HTML 스크랩
    let scraped = [];
    if (!entries.length) scraped = await scrapeListPage();

    if (!entries.length && !scraped.length) return ok([]);

    // entries가 비면 scraped로 대체
    if (!entries.length) {
      const list = scraped.map((s) => ({ title: s.title, en: s.en, image: s.image }));
      return ok(await withImages(list));
    } else {
      // entries가 있으면 이미지/영문명 보강
      const list = entries.map((e) => ({ title: e.title, en: e.en, image: '' }));
      return ok(await withImages(list));
    }
  } catch (err) {
    return bad(500, err.message || 'server error');
  }
}
