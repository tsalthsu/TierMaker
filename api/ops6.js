// /api/ops6.js
// 최신 6성 목록 + 아이콘 URL (PRTS Special:FilePath 이용)

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

// PRTS 아이콘: 언어 무관 Special:FilePath로 원본 파일 경로 자동 리다이렉트
const prtsIcon = (cnName) =>
  `https://prts.wiki/w/Special:FilePath/${encodeURIComponent('头像_' + cnName)}.png`;

// 6성 판별: rarity가 5(0~5 스케일) 이거나 'TIER_6'/'6' 같은 문자열 대비
const isSixStar = (r) => {
  if (typeof r === 'number') return r >= 5;        // 0~5 스케일
  if (typeof r === 'string') {
    const s = r.toUpperCase();
    return s.includes('6');                        // 'TIER_6', '6' 등
  }
  return false;
};

export default async function handler(req) {
  try {
    const res = await fetch(SRC, { cache: 'no-store' });
    if (!res.ok) return bad(res.status, `HTTP ${res.status} on ${SRC}`);
    const data = await res.json();

    // character_table.json은 { char_***: { ... }, ... } 형태의 오브젝트
    const list = [];
    for (const [key, c] of Object.entries(data || {})) {
      if (!c || typeof c !== 'object') continue;

      // 토큰/소환물 등 제외(가능한 넓게 방지)
      const prof = (c.profession || '').toUpperCase();
      if (prof === 'TOKEN') continue;

      if (!isSixStar(c.rarity)) continue;

      const nameCN = c.name || c.appellation || key; // CN 이름이 항상 존재
      const label =
        c.appellation && String(c.appellation).trim().length > 0
          ? c.appellation
          : nameCN;

      list.push({
        id: key,                     // char_****
        label,                       // 라벨: 영문 Appellation 우선
        image: prtsIcon(nameCN),     // PRTS Special:FilePath 경유 원본 아이콘
      });
    }

    // 이름순 정렬(보기 좋게)
    list.sort((a, b) => a.label.localeCompare(b.label, 'en'));

    return ok(list, 3600); // 1시간 캐시
  } catch (e) {
    return bad(500, 'ops6: ' + (e?.message || 'unknown error'));
  }
}
