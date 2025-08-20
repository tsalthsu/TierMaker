// api/ops6.js
export default async function handler(req, res) {
  const UA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";
  const ZH_URL =
    "https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData/master/zh_CN/gamedata/excel/character_table.json";

  const esc = encodeURIComponent;
  async function fetchJSON(url) {
    const r = await fetch(url, { headers: { "user-agent": UA } });
    if (!r.ok) throw new Error(`HTTP ${r.status} on ${url}`);
    return r.json();
  }

  try {
    const zh = await fetchJSON(ZH_URL);

    const out = [];
    Object.values(zh).forEach((c) => {
      if (!c || typeof c !== "object") return;
      if (c.rarity !== 5) return; // 5 == 6성
      const label = String(c.name || c.appellation || c.id);
      const image = `https://prts.wiki/w/Special:FilePath/${esc("头像_" + label + ".png")}`;
      out.push({ label, image });
    });

    out.sort((a, b) => a.label.localeCompare(b.label, "zh-Hans"));
    res.setHeader("cache-control", "public, max-age=3600, s-maxage=3600");
    res.status(200).json(out);
  } catch (e) {
    res.status(500).json({ error: e.message || "fetch failed" });
  }
}
