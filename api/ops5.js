// /api/ops5.js
// 최신 5성 목록 + 아이콘 URL (PRTS Special:FilePath 이용)

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

// 5성 판별: rarity 4(0~5)
const isFiveStar = (r) => {
  if (typeof r === 'number') return r === 4;
  if (typeof r === 'string') return r.toUpperCase().includes('5');
  return false;
};

// ===== 예외 캐릭터 필터 =====
const EXCLUDE_SET = new Set([
  'Mechanist',
  'Misery',
  'Outcast',
  'Pith',
  'Scout',
  'Sharp',
  'Stormeye',
  'Touch',
]);
const isReserveOperator = (s) => /^Reserve Operator\s*-\s*/i.test(s || '');
const isExcluded = (c) => {
  const app = (c.appellation || '').trim();
  const nm = (c.name || '').trim();
  return (
    EXCLUDE_SET.has(app) ||
    EXCLUDE_SET.has(nm) ||
    isReserveOperator(app) ||
    isReserveOperator(nm)
  );
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

      if (!isFiveStar(c.rarity)) continue;
      if (isExcluded(c)) continue; // ★ 예외 필터 적용

      const nameCN = c.name || c.appellation || key;
      const label =
        c.appellation && String(c.appellation).trim().length > 0
          ? c.appellation
          : nameCN;

      list.push({
        id: key,
        label,
        image: '/api/img?url=' + encodeURIComponent(prtsIcon(nameCN)),
      });
    }

    list.sort((a, b) => a.label.localeCompare(b.label, 'en'));
    return ok(list, 3600);
  } catch (e) {
    return bad(500, 'ops5: ' + (e?.message || 'unknown error'));
  }
}
