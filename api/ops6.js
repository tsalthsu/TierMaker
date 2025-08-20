// pages/api/ops6.js
export default async function handler(req, res) {
  try {
    // PRTS 위키의 6성 오퍼레이터 목록 불러오기
    const response = await fetch("https://prts.wiki/api.php?action=query&list=categorymembers&cmtitle=Category:六星干员&cmlimit=500&format=json");
    const data = await response.json();

    // 각 오퍼레이터의 파일명(아이콘) 얻기
    const members = data?.query?.categorymembers || [];

    // File:头像_캐릭터명.png -> 실제 media.prts.wiki URL 로 매핑
    const ops = members.map(m => {
      const name = m.title.replace("干员/", ""); // "干员/凯尔希" → "凯尔希"
      const filename = `头像_${name}.png`;
      const url = `https://media.prts.wiki/commons/${encodeURIComponent(filename[0])}/${encodeURIComponent(filename[1])}/${encodeURIComponent(filename)}`;

      return {
        name,
        icon: url
      };
    });

    res.status(200).json({ operators: ops });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "PRTS 데이터 불러오기 실패" });
  }
}
