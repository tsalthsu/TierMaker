// /api/ops6.js
// Arknights 6성 오퍼레이터 아이콘 불러오기 (PRTS + GameData)

export const config = { runtime: "nodejs" };

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

// GameData (Kengxxiao GitHub 미러)
const EN_URL =
  "https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData/master/en_US/gamedata/excel/character_table.json";
const ZH_URL =
  "https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData/master/zh_CN/gamedata/excel/character_table.json";

function ok(json) {
  return new Response(JSON.stringify(json), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600", // 1시간 캐시
    },
  });
}

function bad(status, msg) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

async function fetchJSON(url) {
  const r = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" } });
  if (!r.ok) throw new Error(`HTTP ${r.status} on ${url}`);
  return r.json();
}

const esc = encodeURIComponent;

export default async function handler() {
  try {
    // GameData 불러오기 (영문 + 중문)
    const [en, zh] = await Promise.all([fetchJSON(EN_URL), fetchJSON(ZH_URL)]);

    // id → 중국어 이름 맵
    const zhName = {};
    Object.values(zh).forEach((c) => {
      if (c && typeof c === "object" && c.id && c.name) {
        zhName[c.id] = String(c.name);
      }
    });

    // 6성만 추출 (rarity: 0~5 → 5가 6성)
    const out = [];
    Object.values(en).forEach((c) => {
      if (!c || typeof c !== "object") return;
      if (c.rarity !== 5) return;

      const id = c.id;
      const label = String(c.name || c.appellation || id);
      const zname = zhName[id];
      if (!zname) return;

      // Special:FilePath로 아이콘 URL 생성
      const image = `https://prts.wiki/w/Special:FilePath/${esc("头像_" + zname + ".png")}`;

      out.push({ label, image });
    });

    // 이름순 정렬
    out.sort((a, b) => a.label.localeCompare(b.label));

    return ok(out);
  } catch (e) {
    return bad(500, e.message || "fetch failed");
  }
}
