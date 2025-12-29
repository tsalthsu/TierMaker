// api/ops.js
export const config = { runtime: 'edge' };

// 데이터 소스
const DATA_URL = 'https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData/master/zh_CN/gamedata/excel/character_table.json';

// 예외 처리 목록
const EXCLUDE_SET = new Set(['Mechanist', 'Misery', 'Outcast', 'Pith', 'Scout', 'Sharp', 'Stormeye', 'Touch', 'Tulip']);
const ICON_OVERRIDES = { '电弧': 'https://media.prts.wiki/5/56/%E5%A4%B4%E5%83%8F_%E7%94%B5%E5%BC%A7.png' };

// 다국어 매핑 (필요시 추가)
const NAME_MAP = {
  "Eyjafjalla": { ko: "에이야퍄들라", zh: "艾雅法拉", ja: "エイヤフィヤトラ" },
  "Exusiai": { ko: "엑시아", zh: "能天使", ja: "エクシア" },
  // ... (기존 데이터 참고하여 필요한 만큼 추가)
};

const getPrtsIcon = (cnName) => ICON_OVERRIDES[cnName] || `https://prts.wiki/w/Special:FilePath/${encodeURIComponent('头像_' + cnName)}.png`;

export default async function handler(req) {
  try {
    const { searchParams } = new URL(req.url);
    const rarityParam = searchParams.get('rarity') || 'all'; // '4', '5', '6', 'all'

    const res = await fetch(DATA_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch data');
    const data = await res.json();

    const list = [];
    
    for (const [id, char] of Object.entries(data)) {
      if (char.profession === 'TOKEN') continue; // 토큰 제외
      
      // 희귀도 필터 (Arknights 데이터는 0부터 시작, 5가 6성)
      const star = char.rarity + 1; 
      const isTarget = rarityParam === 'all' 
        ? (star >= 4 && star <= 6) 
        : star === parseInt(rarityParam);

      if (!isTarget) continue;

      // 예외 캐릭터 필터
      const nameCN = char.name.trim();
      const nameEn = char.appellation.trim();
      if (EXCLUDE_SET.has(nameEn) || EXCLUDE_SET.has(nameCN)) continue;
      if (/^Reserve Operator/.test(nameEn)) continue;

      // 다국어 처리
      const l10n = NAME_MAP[nameEn] || {};
      
      list.push({
        id: id,
        rarity: star,
        names: {
          en: nameEn || nameCN,
          zh: nameCN,
          ko: l10n.ko || nameCN, // 한국어 데이터가 없으면 중문/영문 대체
          ja: l10n.ja || nameEn
        },
        // 이미지 프록시 처리 (CORS 문제 방지)
        image: `/api/img?url=${encodeURIComponent(getPrtsIcon(nameCN))}`
      });
    }

    // 이름(영문) 순 정렬
    list.sort((a, b) => a.names.en.localeCompare(b.names.en));

    return new Response(JSON.stringify(list), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
