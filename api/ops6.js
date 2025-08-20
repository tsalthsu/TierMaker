// api/ops6.js
// Source: Kengxxiao GameData (up-to-date) + PRTS Special:FilePath

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

const EN_URL =
  "https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData/master/en_US/gamedata/excel/character_table.json";
const ZH_URL =
  "https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData/master/zh_CN/gamedata/excel/character_table.json";

async function fetchJSON(url) {
  const r = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" } });
  if (!r.ok) throw new Error(`HTTP ${r.status} on ${url}`);
  return r.json();
}
const esc = encodeURIComponent;

export default async function handler(req, res) {
  try {
    const [en, zh] = await Promise.all([fetchJSON(EN_URL), fetchJSON(ZH_URL)]);

    // id -> 중국어 이름
    const zhName = {};
    Object.values(zh).forEach((c) => {
      if (c && typeof c === "object" && c.id && c.name) {
        zhName[c.id] = String(c.name);
      }
    });

    // rarity: 0~5 (5 == 6성)
    const out = [];
    Object.values(en).forEach((c) => {
      if (!c || typeof c !== "object") return;
      if (c.rarity !== 5) return;
      const id = c.id;
      const label = String(c.name || c.appellation || id);
      const zname = zhName[id];
      if (!zname) return;

      // Special:FilePath → 해시폴더 몰라도 원본으로 리다이렉트
      const image = `https://prts.wiki/w/Special:FilePath/${esc("头像_" + zname + ".png")}`;
      out.push({ label, image });
    });

    out.sort((a, b) => a.label.localeCompare(b.label));
    res.setHeader("cache-control", "public, max-age=3600, s-maxage=3600");
    res.status(200).json(out);
  } catch (e) {
    res.status(500).json({ error: e.message || "fetch failed" });
  }
}
