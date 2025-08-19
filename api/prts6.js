// api/prts6.js
// ─────────────────────────────────────────────────────────────
// Vercel 서버리스(Node)에서 PRTS 6★ 목록(영문명 + 头像_*.png) 가져오기
// - 외부 호출 타임아웃(7s) + 병렬 폴백(Promise.any): origin, Jina, cors
// - 1) Semantic ASK → 2) Category → 3) HTML 스크랩 순서
// - pageimages 로 원본 이미지 보강, label은 영문명 우선
// ─────────────────────────────────────────────────────────────

export const config = { runtime: "nodejs" };

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

function ok(json) {
  return new Response(JSON.stringify(json), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "max-age=60, s-maxage=180",
    },
  });
}

function bad(status, msg) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function decodeHTMLEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

const chunk = (arr, n) =>
  arr.length ? [arr.slice(0, n), ...chunk(arr.slice(n), n)] : [];

// ── fetch 유틸: 타임아웃 + 병렬 폴백 ──────────────────────────────
async function fetchWithTimeout(url, opts = {}, timeoutMs = 7000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    clearTimeout(id);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

async function fetchJSONany(url) {
  const targets = [
    // origin
    url + (url.includes("?") ? "&" : "?") + "origin=*",
    // Jina proxy
    "https://r.jina.ai/http/" + url.replace(/^https?:\/\//, ""),
    // isomorphic-git CORS proxy
    "https://cors.isomorphic-git.org/" + url,
  ];
  const headers = {
    "user-agent": UA,
    accept: "application/json,text/plain;q=0.9,*/*;q=0.8",
    "accept-language": "en-US,en;q=0.8,ko;q=0.7,zh;q=0.6",
    referer: "https://prts.wiki/",
  };
  const racers = targets.map((u) =>
    fetchWithTimeout(u, { headers }, 7000).then((r) => r.json())
  );
  return Promise.any(racers);
}

async function fetchTEXTany(url) {
  const targets = [
    url,
    "https://r.jina.ai/http/" + url.replace(/^https?:\/\//, ""),
    "https://cors.isomorphic-git.org/" + url,
  ];
  const headers = {
    "user-agent": UA,
    accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
    "accept-language": "en-US,en;q=0.8,ko;q=0.7,zh;q=0.6",
    referer: "https://prts.wiki/",
  };
  const racers = targets.map((u) =>
    fetchWithTimeout(u, { headers }, 7000).then((r) => r.text())
  );
  return Promise.any(racers);
}

// ── 1) Semantic ASK (영문명 포함) ────────────────────────────────
async function askSixStar() {
  const query = encodeURIComponent(
    "[[分类:干员]][[稀有度::6||★6]]|?干员外文名|limit=500"
  );
  const url = `https://prts.wiki/api.php?action=ask&api_version=3&format=json&query=${query}`;
  const data = await fetchJSONany(url);
  const results = Array.isArray(data?.results) ? data.results : [];
  return results.map((r) => ({
    title: r.fulltext,
    en: (r.printouts?.["干员外文名"]?.[0] || "").toString().trim(),
  }));
}

// ── 2) Category 폴백 ────────────────────────────────────────────
async function categorySixStar() {
  const cmtitle = encodeURIComponent("Category:六星干员");
  const url = `https://prts.wiki/api.php?action=query&list=categorymembers&cmtitle=${cmtitle}&cmlimit=500&format=json`;
  const data = await fetchJSONany(url);
  const arr = Array.isArray(data?.query?.categorymembers)
    ? data.query.categorymembers
    : [];
  return arr.map((m) => ({ title: m.title, en: "" }));
}

// ── 3) HTML 스크랩 폴백 (干员一览?rarity=1-6) ─────────────────────
async function scrapeListPage() {
  const url =
    "https://prts.wiki/w/%E5%B9%B2%E5%91%98%E4%B8%80%E8%A7%88?rarity=1-6";
  const html = await fetchTEXTany(url);

  // <a title="이름"><img ... src|data-src="...头像_...png">
  const imgRegex =
    /<a[^>]*?\s+title="([^"]+)"[^>]*>\s*<img[^>]+?(?:src|data-src)="([^"]+头像_[^"]+\.png)"/gim;

  const map = new Map(); // title -> image
  let m;
  while ((m = imgRegex.exec(html))) {
    const title = decodeHTMLEntities(m[1]).trim();
    let src = m[2];
    if (src.startsWith("//")) src = "https:" + src;
    map.set(title, src);
  }

  const titles = [...map.keys()];
  let enMap = {};
  if (titles.length) enMap = await queryEnglishNames(titles);

  return titles.map((t) => ({
    title: t,
    en: (enMap[t] || "").trim(),
    image: map.get(t),
  }));
}

// ── 타이틀별 영문명 조회(50개씩 ASK) ─────────────────────────────
async function queryEnglishNames(titles) {
  const out = {};
  for (const batch of chunk(titles, 50)) {
    const filters = batch.map((t) => `[[${t}]]`).join("");
    const query = encodeURIComponent(`${filters}|?干员外文名|limit=500`);
    const url = `https://prts.wiki/api.php?action=ask&api_version=3&format=json&query=${query}`;
    try {
      const data = await fetchJSONany(url);
      const results = Array.isArray(data?.results) ? data.results : [];
      results.forEach((r) => {
        const title = r.fulltext;
        const en = (r.printouts?.["干员外文名"]?.[0] || "").toString();
        if (title) out[title] = en;
      });
    } catch {
      // 무시하고 다음 배치
    }
  }
  return out;
}

// ── 이미지 보강(pageimages) + 최종 정리 ──────────────────────────
async function withImages(entries) {
  const out = [];
  for (const batch of chunk(entries, 30)) {
    const titles = batch.map((e) => e.title).join("|");
    const url = `https://prts.wiki/api.php?action=query&prop=pageimages&piprop=original&format=json&titles=${encodeURIComponent(
      titles
    )}`;
    const qi = await fetchJSONany(url);
    const pages = qi?.query?.pages || {};
    const imgMap = {};
    Object.values(pages).forEach((p) => {
      if (p?.title) imgMap[p.title] = p?.original?.source || "";
    });
    for (const e of batch) {
      const img = imgMap[e.title] || e.image || "";
      const label = e.en || e.title;
      if (img) out.push({ label, image: img });
    }
  }
  return out;
}

// ── 핸들러 ───────────────────────────────────────────────────────
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

    if (!entries.length) {
      // scraped만 있을 때
      const list = scraped.map((s) => ({
        title: s.title,
        en: s.en,
        image: s.image,
      }));
      return ok(await withImages(list));
    } else {
      // entries가 있으면 이미지 보강
      const list = entries.map((e) => ({
        title: e.title,
        en: e.en,
        image: "",
      }));
      return ok(await withImages(list));
    }
  } catch (err) {
    return bad(504, err.message || "proxy timeout");
  }
}
