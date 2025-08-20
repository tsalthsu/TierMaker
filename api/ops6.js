// api/ops6.js
export const config = { runtime: "nodejs" };

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

const OPS_URL =
  "https://raw.githubusercontent.com/Aceship/AN-EN-Tags/master/json/operators.json";
const AVATAR_BASE =
  "https://raw.githubusercontent.com/Aceship/Arknight-Images/main/avatars/";

function ok(json) {
  return new Response(JSON.stringify(json), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600",
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
  const r = await fetch(url, {
    headers: { "user-agent": UA, accept: "application/json" },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}
async function urlExists(url) {
  try {
    const r = await fetch(url, { method: "HEAD", headers: { "user-agent": UA } });
    return r.ok;
  } catch { return false; }
}

export default async function handler() {
  try {
    const data = await fetchJSON(OPS_URL);
    // rarity: 0~5 (5 == 6★)
    const six = Object.values(data)
      .filter((op) => op && typeof op === "object" && op.rarity === 5)
      .map((op) => ({ id: op.id, label: op.name || op.en })); // ex) id: char_103_angel

    const results = [];
    await Promise.all(
      six.map(async (op) => {
        const img = `${AVATAR_BASE}${op.id}.png`;
        if (await urlExists(img)) results.push({ label: op.label, image: img });
      })
    );

    results.sort((a, b) => a.label.localeCompare(b.label));
    return ok(results);
  } catch (e) {
    return bad(500, e.message || "github fetch failed");
  }
}
