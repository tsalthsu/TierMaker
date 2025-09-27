// /api/ops6.js
// 6성 목록 + PRTS 아이콘 + 다국어 이름(en/ko/ja/zh) 동시 제공

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

// ----- 예외 아이콘 (중문 키 기준) -----
const ICON_OVERRIDES = {
  '电弧': '/src/assets/头像_电弧.png', // Raidian
};

// ----- 간단 다국어 이름 매핑 (필요한 것부터 추가) -----
// 키는 영어명(en) 또는 중문명(zh) 아무거나 가능. 두 개 다 넣으면 매칭률↑
const NAME_L10N = {
  // Raidian
  'Raidian': { ko: '레이디언', ja: 'レイディアン', zh: '电弧' },
  '电弧':     { ko: '레이디언', ja: 'レイディアン', zh: '电弧' },

  // 몇 개 예시
  'SilverAsh': { ko: '실버애쉬', ja: 'シルバーアッシュ', zh: '银灰' },
  "Ch'en":     { ko: '첸',       ja: 'チェン',           zh: '陈' },
};

// 안전 헬퍼: 영문/중문 중 하나로 찾고 zh가 없으면 중문 원본으로 보강
function pickL10n(enName, cnName) {
  const hit = NAME_L10N[enName] || NAME_L10N[cnName] || {};
  return {
    ko: hit.ko || '',
    ja: hit.ja || '',
    zh: hit.zh || cnName || '',
  };
}

// PRTS 아이콘 (예외 우선, 없으면 Special:FilePath)
function prtsIcon(cnName) {
  if (ICON_OVERRIDES[cnName]) return ICON_OVERRIDES[cnName];
  const file = `头像_${cnName || ''}.png`;
  return `https://prts.wiki/w/Special:FilePath/${encodeURIComponent(file)}`;
}

// 6성 판별
const isSixStar = (r) => {
  if (typeof r === 'number') return r >= 5;    // 0~5 → 6성은 5
  if (typeof r === 'string') return r.toUpperCase().includes('6');
  return false;
};

// 예비/테스트/제외 캐릭터 걸러내기
const EXCLUDE_SET = new Set([
  'Mechanist','Misery','Outcast','Pith','Scout','Sharp','Stormeye','Touch','Tulip',
]);
const isReserveOperator = (s) => /^Reserve Operator\s*-\s*/i.test(s || '');
const isExcluded = (c) => {
  const app = (c.appellation || '').trim();
  const nm = (c.name || '').trim();
  return (
    EXCLUDE_SET.has(app) || EXCLUDE_SET.has(nm) ||
    isReserveOperator(app) || isReserveOperator(nm)
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

      // 토큰류 제외
      const prof = (c.profession || '').toUpperCase();
      if (prof === 'TOKEN') continue;

      // 6성 + 제외 목록 필터링
      if (!isSixStar(c.rarity)) continue;
      if (isExcluded(c)) continue;

      // 이름 기본값
      const cnName = c.name || c.appellation || key;               // 중국어(원본)
      const enName = (c.appellation && String(c.appellation).trim()) || key; // 영어
      const l10n = pickL10n(enName, cnName);

      // 프런트(App.jsx)가 label로 정렬/표시 폴백하므로 en을 label에도 넣어줌
      list.push({
        id: key,
        label: enName,                           // ← 정렬 안정화용
        en: enName,
        ko: l10n.ko,
        ja: l10n.ja,
        zh: l10n.zh,
        image: '/api/img?url=' + encodeURIComponent(prtsIcon(cnName)),
      });
    }

    // 영어 기준 정렬
    list.sort((a, b) => String(a.label).localeCompare(String(b.label), 'en'));

    return ok(list, 3600);
  } catch (e) {
    return bad(500, 'ops6: ' + (e?.message || 'unknown error'));
  }
}
