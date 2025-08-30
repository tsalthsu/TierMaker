// /api/opsAll.js
// 최신 4~6성 전체 목록 + 아이콘 URL

export const config = { runtime: 'edge' };

function ok(json, ttl = 60) {
  return new Response(JSON.stringify(json), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': `public, max-age=${ttl}`,
    },
  });
}

function bad(status, msg) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

const SRC =
  'https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData/master/zh_CN/gamedata/excel/character_table.json';

const prtsIcon = (cnName) =>
  `https://prts.wiki/w/Special:FilePath/${encodeURIComponent('头像_' + cnName)}.png`;

// 4~6성 판별: rarity 3~5
const isTarget = (r) => {
  if (typeof r === 'number') return r >= 3 && r <= 5; // 4~6성
  if (typeof r === 'string') {
    const s = r.toUpperCase();
    return s.includes('4') || s.includes('5') || s.includes('6');
  }
  return false;
};

export default async function handler() {
  try {
    const res = await fetch(SRC, { cache: 'no-store' });
    if (!res.ok) return bad(res.status, `HTTP ${res.status} on ${SRC}`);
    const data = await res.json();

    const list = [];
    for (const [key, c] of Object.entries(data || {})) {
      if (!c || typeof c !== 'object') continue;

      const prof = (c.profession || '').toUpperCase();
      if (prof === 'TOKEN') continue;

      if (!isTarget(c.rarity)) continue;

      const nameCN = c.name || c.appellation || key;
      const label =
        c.appellation && String(c.appellation).trim().length > 0
          ? c.appellation
          : nameCN;

      list.push({
        id: key,
        label,
        image: prtsIcon(nameCN),
      });
    }

    list.sort((a, b) => a.label.localeCompare(b.label, 'en'));
    return ok(list, 3600);
  } catch (e) {
    return bad(500, 'opsAll: ' + (e?.message || 'unknown error'));
  }
}
