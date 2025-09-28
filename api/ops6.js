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
  "Togawa Sakiko": {
    "zh": "丰川祥子",
    "ja": "トガワ サキコ",
    "ko": "토가와 사키코"
  },
  "Hoshiguma the Breacher": {
    "zh": "斩业星熊",
    "ja": "ホシグマ・ザ・ブリーチャー",
    "ko": "호시구마 더 브리처"
  },
  "Haruka": {
    "zh": "遥",
    "ja": "ハルカ",
    "ko": "하루카"
  },
  "Raidian": {
    "zh": "电弧",
    "ko": "라이디언"
  },
  "Leizi the Thunderbringer": {
    "zh": "司霆惊蛰",
    "ko": "레이즈 더 썬더브링어"
  },
  "Tragodia": {
    "zh": "酒神",
    "ko": "트라고디아"
  },
  "Exusiai the New Covenant": {
    "zh": "新约能天使",
    "ko": "엑시아 더 뉴 커버넌트"
  },
  "Lemuen": {
    "zh": "蕾缪安",
    "ko": "르무엔"
  },
  "Sankta Miksaparato": {
    "zh": "信仰搅拌机",
    "ko": "산크타 믹사파라토"
  },
  "Mon3tr": {
    "zh": "Mon3tr",
    "ko": "Mon3tr"
  },
  "Necrass": {
    "zh": "死芒",
    "ja": "ネクラス",
    "ko": "네크라스"
  },
  "Entelechia": {
    "zh": "隐德来希",
    "ja": "エンテレケイア",
    "ko": "엔텔레키아"
  },
  "Yu": {
    "zh": "余",
    "ja": "ユー",
    "ko": "위"
  },
  "Blaze the Igniting Spark": {
    "zh": "烛煌",
    "ja": "熾炎ブレイズ",
    "ko": "블레이즈 디 이그나이팅 스파크"
  },
  "Thorns the Lodestar": {
    "zh": "引星棘刺",
    "ja": "引星ソーンズ",
    "ko": "쏜즈 더 로드스타"
  },
  "Lappland the Decadenza": {
    "zh": "荒芜拉普兰德",
    "ja": "荒蕪ラップランド",
    "ko": "라플란드 더 데카덴차"
  },
  "Vulpisfoglia": {
    "zh": "忍冬",
    "ja": "ウルピスフォリア",
    "ko": "불피스폴리아"
  },
  "Crownslayer": {
    "zh": "弑君者",
    "ja": "クラウンスレイヤー",
    "ko": "크라운슬레이어"
  },
  "Vina Victoria": {
    "zh": "维娜·维多利亚",
    "ja": "ヴィーナ・ヴィクトリア",
    "ko": "비나 빅토리아"
  },
  "Marcille": {
    "zh": "玛露西尔",
    "ja": "マルシル",
    "ko": "마르실"
  },
  "Pepe": {
    "zh": "佩佩",
    "ja": "ペペ",
    "ko": "페페"
  },
  "Narantuya": {
    "zh": "娜仁图亚",
    "ja": "ナラントゥヤ",
    "ko": "나란투야"
  },
  "Nymph": {
    "zh": "妮芙",
    "ja": "ニンフ",
    "ko": "님프"
  },
  "Ulpianus": {
    "zh": "乌尔比安",
    "ja": "ウルピアヌス",
    "ko": "울피아누스"
  },
  "Wiš'adel": {
    "zh": "维什戴尔",
    "ja": "ウィシャデル",
    "ko": "위셔델"
  },
  "Logos": {
    "zh": "逻各斯",
    "ja": "ロゴス",
    "ko": "로고스"
  },
  "Civilight Eterna": {
    "zh": "魔王",
    "ja": "シヴィライト・エテルナ",
    "ko": "시빌라이트 에테르나"
  },
  "Ascalon": {
    "zh": "阿斯卡纶",
    "ja": "アスカロン",
    "ko": "아스카론"
  },
  "Ela": {
    "zh": "艾拉",
    "ko": "Ela"
  },
  "Shu": {
    "zh": "黍",
    "ja": "シュウ",
    "ko": "슈"
  },
  "Zuo Le": {
    "zh": "左乐",
    "ja": "ズオ・ラウ",
    "ko": "좌락"
  },
  "Ray": {
    "zh": "莱伊",
    "ja": "レイ",
    "ko": "레이"
  },
  "Degenbrecher": {
    "zh": "锏",
    "ja": "デーゲンブレヒャー",
    "ko": "데겐블레허"
  },
  "Virtuosa": {
    "zh": "塑心",
    "ja": "ヴィルトゥオーサ",
    "ko": "비르투오사"
  },
  "Viviana": {
    "zh": "薇薇安娜",
    "ja": "ヴィヴィアナ",
    "ko": "비비아나"
  },
  "Lessing": {
    "zh": "止颂",
    "ja": "レッシング",
    "ko": "레싱"
  },
  "Hoederer": {
    "zh": "赫德雷",
    "ja": "ヘドリー",
    "ko": "외드레르"
  },
  "Jessica the Liberated": {
    "zh": "涤火杰西卡",
    "ja": "滌火ジェシカ",
    "ko": "제시카 더 리버레이티드"
  },
  "Eyjafjalla the Hvít Aska": {
    "zh": "纯烬艾雅法拉",
    "ja": "純燼エイヤフィヤトラ",
    "ko": "에이야퍄들라 더 크비트 아스카"
  },
  "Swire the Elegant Wit": {
    "zh": "琳琅诗怀雅",
    "ja": "琳琅スワイヤー",
    "ko": "스와이어 디 엘리건트 위트"
  },
  "Typhon": {
    "zh": "提丰",
    "ja": "ティフォン",
    "ko": "티폰"
  },
  "Executor the Ex Foedere": {
    "zh": "圣约送葬人",
    "ja": "聖約イグゼキュター",
    "ko": "이그제큐터 디 엑스 포에데레"
  },
  "Muelsyse": {
    "zh": "缪尔赛思",
    "ja": "ミュルジス",
    "ko": "뮤엘시스"
  },
  "Ho'olheyak": {
    "zh": "霍尔海雅",
    "ja": "ホルハイヤ",
    "ko": "오올헤약"
  },
  "Silence the Paradigmatic": {
    "zh": "淬羽赫默",
    "ja": "淬羽サイレンス",
    "ko": "사일런스 더 패러디그매틱"
  },
  "Ines": {
    "zh": "伊内丝",
    "ja": "イネス",
    "ko": "이네스"
  },
  "Kirin R Yato": {
    "zh": "麒麟R夜刀",
    "ja": "キリンRヤトウ",
    "ko": "키린R 야토"
  },
  "Qiubai": {
    "zh": "仇白",
    "ja": "チューバイ",
    "ko": "치우바이"
  },
  "Chongyue": {
    "zh": "重岳",
    "ja": "チョンユエ",
    "ko": "총웨"
  },
  "Lin": {
    "zh": "林",
    "ja": "リン",
    "ko": "린"
  },
  "Reed The Flame Shadow": {
    "zh": "焰影苇草",
    "ja": "焔影リード",
    "ko": "리드 더 플레임 섀도우"
  },
  "Texas the Omertosa": {
    "zh": "缄默德克萨斯",
    "ja": "血掟テキサス",
    "ko": "텍사스 디 오메르토사"
  },
  "Penance": {
    "zh": "斥罪",
    "ja": "ペナンス",
    "ko": "페넌스"
  },
  "Vigil": {
    "zh": "伺夜",
    "ja": "ヴィジェル",
    "ko": "비질"
  },
  "Stainless": {
    "zh": "白铁",
    "ja": "ステインレス",
    "ko": "스테인리스"
  },
  "Młynar": {
    "zh": "玛恩纳",
    "ja": "ムリナール",
    "ko": "무에나"
  },
  "Gavial the Invincible": {
    "zh": "百炼嘉维尔",
    "ja": "百錬ガヴィル",
    "ko": "가비알 디 인빈서블"
  },
  "Pozëmka": {
    "zh": "鸿雪",
    "ja": "パゼオンカ",
    "ko": "파죰카"
  },
  "Dorothy": {
    "zh": "多萝西",
    "ja": "ドロシー",
    "ko": "도로시"
  },
  "Ebenholz": {
    "zh": "黑键",
    "ja": "エーベンホルツ",
    "ko": "에벤홀츠"
  },
  "Specter the Unchained": {
    "zh": "归溟幽灵鲨",
    "ja": "帰溟スペクター",
    "ko": "스펙터 디 언체인드"
  },
  "Irene": {
    "zh": "艾丽妮",
    "ja": "アイリーニ",
    "ko": "아이린"
  },
  "Lumen": {
    "zh": "流明",
    "ja": "ルーメン",
    "ko": "루멘"
  },
  "Horn": {
    "zh": "号角",
    "ja": "ホルン",
    "ko": "혼"
  },
  "Fiammetta": {
    "zh": "菲亚梅塔",
    "ja": "フィアメッタ",
    "ko": "피아메타"
  },
  "Goldenglow": {
    "zh": "澄闪",
    "ja": "ゴールデングロー",
    "ko": "골든글로우"
  },
  "Ling": {
    "zh": "令",
    "ja": "リィン",
    "ko": "링"
  },
  "Lee": {
    "zh": "老鲤",
    "ja": "リー",
    "ko": "리"
  },
  "Gnosis": {
    "zh": "灵知",
    "ja": "ノーシス",
    "ko": "노시스"
  },
  "Nearl the Radiant Knight": {
    "zh": "耀骑士临光",
    "ja": "耀騎士ニアール",
    "ko": "니어 더 래디언트 나이트"
  },
  "Flametail": {
    "zh": "焰尾",
    "ja": "フレイムテイル",
    "ko": "플레임테일"
  },
  "Fartooth": {
    "zh": "远牙",
    "ja": "ファートゥース",
    "ko": "파투스"
  },
  "Saileach": {
    "zh": "琴柳",
    "ja": "サイラッハ",
    "ko": "사일라흐"
  },
  "Ch'en the Holungday": {
    "zh": "假日威龙陈",
    "ja": "遊龍チェン",
    "ko": "첸 더 홀룽데이"
  },
  "Mizuki": {
    "zh": "水月",
    "ja": "ミヅキ",
    "ko": "미즈키"
  },
  "Pallas": {
    "zh": "帕拉斯",
    "ja": "パラス",
    "ko": "팔라스"
  },
  "Carnelian": {
    "zh": "卡涅利安",
    "ja": "カーネリアン",
    "ko": "카넬리안"
  },
  "Skadi the Corrupting Heart": {
    "zh": "浊心斯卡蒂",
    "ja": "濁心スカジ",
    "ko": "스카디 더 커럽팅 하트"
  },
  "Kal'tsit": {
    "zh": "凯尔希",
    "ja": "ケルシー",
    "ko": "켈시"
  },
  "Gladiia": {
    "zh": "歌蕾蒂娅",
    "ja": "グレイディーア",
    "ko": "글래디아"
  },
  "Passenger": {
    "zh": "异客",
    "ja": "パッセンジャー",
    "ko": "패신저"
  },
  "Ash": {
    "zh": "灰烬",
    "ko": "Ash"
  },
  "Dusk": {
    "zh": "夕",
    "ja": "シー",
    "ko": "시"
  },
  "Saga": {
    "zh": "嵯峨",
    "ja": "サガ",
    "ko": "사가"
  },
  "Archetto": {
    "zh": "空弦",
    "ja": "アルケット",
    "ko": "아르케토"
  },
  "Mountain": {
    "zh": "山",
    "ja": "マウンテン",
    "ko": "마운틴"
  },
  "Rosmontis": {
    "zh": "迷迭香",
    "ja": "ロスモンティス",
    "ko": "로즈몬티스"
  },
  "Mudrock": {
    "zh": "泥岩",
    "ja": "マドロック",
    "ko": "머드락"
  },
  "Blemishine": {
    "zh": "瑕光",
    "ja": "ブレミシャイン",
    "ko": "블레미샤인"
  },
  "Surtr": {
    "zh": "史尔特尔",
    "ja": "スルト",
    "ko": "수르트"
  },
  "Eunectes": {
    "zh": "森蚺",
    "ja": "ユーネクテス",
    "ko": "유넥티스"
  },
  "Thorns": {
    "zh": "棘刺",
    "ja": "ソーンズ",
    "ko": "쏜즈"
  },
  "Suzuran": {
    "zh": "铃兰",
    "ja": "スズラン",
    "ko": "스즈란"
  },
  "Rosa": {
    "zh": "早露",
    "ja": "ロサ",
    "ko": "로사"
  },
  "W": {
    "zh": "W",
    "ja": "W",
    "ko": "W"
  },
  "Weedy": {
    "zh": "温蒂",
    "ja": "ウィーディ",
    "ko": "위디"
  },
  "Phantom": {
    "zh": "傀影",
    "ja": "ファントム",
    "ko": "팬텀"
  },
  "Bagpipe": {
    "zh": "风笛",
    "ja": "バグパイプ",
    "ko": "백파이프"
  },
  "Ceobe": {
    "zh": "刻俄柏",
    "ja": "ケオベ",
    "ko": "케오베"
  },
  "Nian": {
    "zh": "年",
    "ja": "ニェン",
    "ko": "니엔"
  },
  "Aak": {
    "zh": "阿",
    "ja": "ア"
  },
  "Blaze": {
    "zh": "煌",
    "ja": "ブレイズ",
    "ko": "블레이즈"
  },
  "Mostima": {
    "zh": "莫斯提马",
    "ja": "モスティマ",
    "ko": "모스티마"
  },
  "Magallan": {
    "zh": "麦哲伦",
    "ja": "マゼラン",
    "ko": "마젤란"
  },
  "Hellagur": {
    "zh": "赫拉格",
    "ja": "ヘラグ",
    "ko": "헬라그"
  },
  "Schwarz": {
    "zh": "黑",
    "ja": "シュヴァルツ",
    "ko": "슈바르츠"
  },
  "Ch'en": {
    "zh": "陈",
    "ja": "チェン",
    "ko": "첸"
  },
  "Skadi": {
    "zh": "斯卡蒂",
    "ja": "スカジ",
    "ko": "스카디"
  },
  "SilverAsh": {
    "zh": "银灰",
    "ja": "シルバーアッシュ",
    "ko": "실버애쉬"
  },
  "Saria": {
    "zh": "塞雷娅",
    "ja": "サリア",
    "ko": "사리아"
  },
  "Hoshiguma": {
    "zh": "星熊",
    "ja": "ホシグマ",
    "ko": "호시구마"
  },
  "Nightingale": {
    "zh": "夜莺",
    "ja": "ナイチンゲール",
    "ko": "나이팅게일"
  },
  "Shining": {
    "zh": "闪灵",
    "ja": "シャイニング",
    "ko": "샤이닝"
  },
  "Angelina": {
    "zh": "安洁莉娜",
    "ja": "アンジェリーナ",
    "ko": "안젤리나"
  },
  "Eyjafjalla": {
    "zh": "艾雅法拉",
    "ja": "エイヤフィヤトラ",
    "ko": "에이야퍄들라"
  },
  "Ifrit": {
    "zh": "伊芙利特",
    "ja": "イフリータ",
    "ko": "이프리트"
  },
  "Siege": {
    "zh": "推进之王",
    "ja": "シージ",
    "ko": "시즈"
  },
  "Exusiai": {
    "zh": "能天使",
    "ja": "エクシア",
    "ko": "엑시아"
  }
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
