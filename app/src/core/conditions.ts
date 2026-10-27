// 全ユーザー共通の出現条件（docs/appearance-catalog.md）。成立した猫はその日の候補に確定で入る。
// 判定に使う材料（電池・歩数・起動の記録など）は Signals としてまとめて渡す。
import { CATS } from '../data/catalog';
import { daysBetween, fmtDay } from './dates';
import { Env, Weather, evalAtoms, isJapaneseHoliday, isRealCat, recipeOf } from './recipes';

export type Signals = {
  battery: number[]; // その日（出会いの締め切りまで）に観測した残量 %（整数）
  charging: boolean; // 充電中を観測したか
  steps: number | null; // その日の歩数。取れないときは null
  gapDays: number; // 前回起動から何日空いたか（0=同じ日、1=前日）
  streak: number; // 連続で起動した日数
  openHours: number[]; // その日に起動した時刻（時）
  catalogUpdated: boolean; // アプリ更新で新しい猫が増えたか
  birthday: { m: number; d: number } | null;
  weather?: Weather | null; // その日の天気。取れないときは null
  temp?: number | null; // その日の気温（℃）。取れないときは null
  favorites?: string[]; // お気に入りの猫
  installDay?: string; // 遊びはじめた日
  // 端末の中で数えている累計（歩数は出会いの候補を作った日の分から）
  totals?: { steps: number; photos: number; pets: number; openDays: number; cats: number };
};

export type Ctx = {
  owned: Record<string, { count: number }>;
  appearCounts: Record<string, number>; // 候補に現れた回数
};

// parts があるときは、そのうち1つを（均等な確率で）理由として見せる（encounter.ts の buildDay）
export type Guaranteed = { id: string; reason: string; parts?: string[] };

// ---- 暦・天文の計算（近似） -------------------------------------------------

const SYNODIC = 29.530588853;
const NEW_MOON_REF = Date.UTC(2000, 0, 6, 18, 14); // 2000-01-06 18:14 UTC の新月

// 平均朔望月による近似。実際の満月・新月とは最大で半日ほどずれる。
function phaseInstant(day: Date, offset: 0 | 0.5): Date {
  const n = Math.round((day.getTime() - NEW_MOON_REF) / 86400000 / SYNODIC - offset);
  return new Date(NEW_MOON_REF + (n + offset) * SYNODIC * 86400000);
}
const isFullMoon = (key: string, day: Date) => fmtDay(phaseInstant(day, 0.5)) === key;
const isNewMoon = (key: string, day: Date) => fmtDay(phaseInstant(day, 0)) === key;

// 同じ月に満月が2回あるとき、その2回目（暦上のブルームーン）
function isBlueMoon(key: string, day: Date) {
  if (!isFullMoon(key, day)) return false;
  const prev = new Date(phaseInstant(day, 0.5).getTime() - SYNODIC * 86400000);
  return prev.getMonth() === day.getMonth() && prev.getFullYear() === day.getFullYear();
}

// Meeus の平均分点・至点（誤差は数時間）。戻り値は端末ローカルの日付キー
function seasonKeys(year: number): string[] {
  const Y = (year - 2000) / 1000;
  const jde = [
    2451623.80984 + 365242.37404 * Y + 0.05169 * Y ** 2 - 0.00411 * Y ** 3 - 0.00057 * Y ** 4, // 春分
    2451716.56767 + 365241.62603 * Y + 0.00325 * Y ** 2 + 0.00888 * Y ** 3 - 0.0003 * Y ** 4, // 夏至
    2451810.21715 + 365242.01767 * Y - 0.11575 * Y ** 2 + 0.00337 * Y ** 3 + 0.00078 * Y ** 4, // 秋分
    2451900.05952 + 365242.74049 * Y - 0.06223 * Y ** 2 - 0.00823 * Y ** 3 + 0.00032 * Y ** 4, // 冬至
  ];
  return jde.map((j) => fmtDay(new Date((j - 2440587.5) * 86400000)));
}

const inRange = (m: number, d: number, from: [number, number], to: [number, number]) => {
  const v = m * 100 + d;
  return v >= from[0] * 100 + from[1] && v <= to[0] * 100 + to[1];
};

// ---- 猫の分類 ---------------------------------------------------------------

const BLACK_CATS = ['bombay', 'noroware', 'shingetsu', 'yami', 'mayonaka', 'maboroshi-kuroneko', 'yofukashi', 'shoku'];
const WHITE_CATS = ['persian', 'turkish-angora', 'santa', 'yukidaruma', 'country-01', 'oiwai'];
// 「特定の3種類」は企画で未決定。仮に最初の3種（ブリティッシュ・シャム・ベンガル）にしている
const SANBIKI_SET = ['british-shorthair', 'siamese-seal-point', 'bengal'];
// 「あまやどり」: 雨の日に、この3種（レアの猫）を迎えていると会える
// 「ひみつ」: お気に入りにこの3匹を入れて部屋に並べると会える
const HIMITSU_SET = ['rea-mobby', 'uyu-mobby', 'mike-neko'];
const AMAYADORI_SET = ['egyptian-mau', 'sphynx', 'savannah'];
// 日食（皆既・金環・ハイブリッド）の日付。部分日食は含めない。世界のどこかで起きる日で、日付は UTC。2035年まで
// 月食の猫は別に追加する予定なので、ここには入れない
const SOLAR_ECLIPSES = [
  '2026-02-17', '2026-08-12', '2027-02-06', '2027-08-02', '2028-01-26', '2028-07-22',
  '2030-06-01', '2030-11-25', '2031-05-21', '2031-11-14', '2032-05-09', '2033-03-30',
  '2034-03-20', '2034-09-12', '2035-03-09', '2035-09-02',
];
// 季節イベントの期間は企画で未決定。仮の期間
const SEASONS: { id: string; reason: string; from: [number, number]; to: [number, number] }[] = [
  { id: 'sakura', reason: '桜の季節', from: [3, 25], to: [4, 10] },
  { id: 'tsuyu', reason: '梅雨の季節', from: [6, 10], to: [7, 10] },
  { id: 'halloween', reason: 'ハロウィン', from: [10, 25], to: [10, 31] },
];
// 歩数は「その日の最高到達ライン」の猫を1匹だけ確定させる（全部出すと候補があふれるため）
const STEP_LINES: [number, string, string][] = [
  [10000, 'tekuteku', '1日10,000歩'],
  [5000, 'osanpo', '1日5,000歩'],
  [2222, 'zorome', '1日2,222歩'],
  [1000, 'hodohodo', '1日1,000歩'],
  [777, 'lucky', '1日777歩'],
  [500, 'chokotto', '1日500歩'],
  [222, 'nyanpo', '1日222歩'],
];

// 個性のある猫ごとの条件（そのまま「難しい1個」になる）。簡単な条件は guaranteedCats で重ねる
function signatureCats(dayKey: string, s: Signals, ctx: Ctx, forecast: boolean): Guaranteed[] {
  const [y, m, d] = dayKey.split('-').map(Number);
  const day = new Date(y, m - 1, d, 20, 0, 0); // 判定はその日の20:00時点
  const dow = day.getDay();
  const ownedIds = Object.keys(ctx.owned);
  const owns = (id: string) => !!ctx.owned[id];
  const kinds = ownedIds.length;
  const out: Guaranteed[] = [];
  const add = (cond: boolean, id: string, reason: string) => {
    if (cond && !out.some((o) => o.id === id)) out.push({ id, reason });
  };
  // 所持数などの「達成」系は、まだ持っていない間だけ出す
  const addOnce = (cond: boolean, id: string, reason: string) => add(cond && !owns(id), id, reason);

  // スマホの状態
  const lv = s.battery;
  add(lv.includes(1), 'genkai', 'バッテリー1%');
  add(lv.some((v) => v <= 10), 'denchigire', 'バッテリー10%以下');
  add(lv.includes(22), 'nyannyan', 'バッテリー22%');
  add(lv.includes(50), 'hanbun', 'バッテリー50%');
  add(lv.includes(100), 'mantan', 'バッテリー100%');
  add(s.charging, 'juuden', '充電中');

  // 歩数
  if (s.steps != null) {
    const reached = STEP_LINES.filter(([n]) => s.steps! >= n);
    const pick = reached.find(([, id]) => !owns(id)) ?? reached[0];
    if (pick) add(true, pick[1], pick[2]);
  }
  add(lv.includes(22) && (s.steps ?? 0) >= 2222, 'kiseki', 'バッテリー22%と2,222歩');

  // アプリの利用
  add(s.gapDays === 2, 'nebosuke', 'ひと晩お休みした翌日');
  add(s.gapDays >= 3 && s.gapDays < 7, 'samishigari', '3日ぶりの起動');
  add(s.gapDays >= 7 && s.gapDays < 30, 'ijike', '7日ぶりの起動');
  add(s.gapDays >= 30 && s.gapDays < 100, 'hisashiburi', '30日ぶりの起動');
  add(s.gapDays >= 100, 'kikan', '100日ぶりの起動');
  add(s.streak > 0 && s.streak % 7 === 0, 'mainichi', '7日連続の起動');
  add(s.openHours.some((h) => h >= 5 && h < 10), 'asa', '朝の起動');
  add(s.openHours.some((h) => h >= 16 && h < 19), 'yuugure', '夕暮れの起動');
  add(s.openHours.some((h) => h >= 23 || h < 4), 'yofukashi', '夜ふかしの起動');
  add(s.catalogUpdated, 'shinirimobby', '新しい猫が来た日');

  // 曜日・暦
  const full = isFullMoon(dayKey, day);
  const newMoon = isNewMoon(dayKey, day);
  add(dow === 5 && d === 13, 'noroware', '13日の金曜日');
  add(dow === 5 && d !== 13, 'hanakin', '金曜日');
  add(m === 2 && d === 22, 'nekonohi', '猫の日');
  add(m === 2 && d === 29, 'uruu', 'うるう日');
  add(m === 4 && d === 1, 'usotsuki', 'エイプリルフール');
  add(m === 7 && d === 7, 'tanabata', '七夕');
  add(m === 11 && d === 11, 'ichiichi', '11月11日');
  add(m === 12 && d === 25, 'santa', 'クリスマス');
  add(m === 12 && d === 31, 'toshikoshi', '大みそか');
  add(m === 1 && d === 1, 'hatsuhinode', '元日');
  add(d === 29, 'nikukyuu', '肉球の日（毎月29日）');
  const ymd = `${y}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}`;
  add(ymd === [...ymd].reverse().join(''), 'sakasama', '回文の日付');
  const digits = `${y % 100}${m}${d}`;
  add(/^(\d)\1*$/.test(digits), 'pittari', '年・月・日がゾロ目');
  add(!!s.birthday && s.birthday.m === m && s.birthday.d === d, 'tanjoubi', '誕生日');
  const seasons = seasonKeys(y);
  add(dayKey === seasons[0] || dayKey === seasons[2], 'hiruyoru', dayKey === seasons[0] ? '春分' : '秋分');
  add(dayKey === seasons[1] || dayKey === seasons[3], 'taiyou', dayKey === seasons[1] ? '夏至' : '冬至');
  for (const se of SEASONS) add(inRange(m, d, se.from, se.to), se.id, se.reason);

  // 月・天文（流星群は極大日を固定した仮の判定）
  add(full, 'mangetsu', '満月');
  add(newMoon, 'shingetsu', '新月');
  add(isBlueMoon(dayKey, day), 'aotsuki', 'ひと月に2回目の満月');
  add(SOLAR_ECLIPSES.includes(dayKey), 'shoku', '日食の日');
  add((m === 1 && d === 4) || (m === 8 && d === 13) || (m === 12 && d === 14), 'hoshizora', '流星群の夜');

  // コレクション
  const blackCount = BLACK_CATS.reduce((n, id) => n + (ctx.owned[id]?.count ?? 0), 0);
  addOnce(kinds >= 10, 'juunyan', '10種類の猫と暮らした');
  addOnce(kinds >= 20, 'tomodachizure', '20種類の猫と暮らした');
  addOnce(kinds >= 50, 'collector', '50種類の猫と暮らした');
  addOnce(BLACK_CATS.some(owns) && WHITE_CATS.some(owns), 'shirokuro', '黒猫と白猫がそろった');
  addOnce(Object.values(ctx.owned).some((o) => o.count >= 3), 'bunshin', '同じ猫が3匹そろった');
  addOnce(SANBIKI_SET.every(owns), 'sanbiki', '特別な3匹がそろった');
  addOnce(Object.values(ctx.appearCounts).some((n) => n >= 3), 'shitsukoi', '同じ猫が3回訪ねてきた');

  // 気温・お気に入り・図鑑・遊んだ日数
  if (!forecast && s.temp != null) addOnce(Math.round(s.temp) === 22, 'ondo', '気温が22℃');
  addOnce(HIMITSU_SET.every((id) => (s.favorites ?? []).includes(id) && owns(id)), 'himitsu', 'お気に入りに3匹がそろった');
  addOnce(CATS.filter((c) => isRealCat(c) && owns(c.id)).length >= 100, 'hakubutsukan', '実在の猫を100種迎えた');
  addOnce(!!s.installDay && daysBetween(s.installDay, dayKey) >= 365, 'oiwai', '遊びはじめて1年');

  // 端末の中で数える累計（世界の猫だった子たち。通信しない）
  const t = s.totals;
  addOnce(!!t && t.steps >= 1_000_000, 'world-marathon', '累計100万歩');
  addOnce(!!t && t.openDays >= 100, 'pyonpyon', '100日会いに来た');
  addOnce(!!t && t.cats >= 100, 'omatsuri', '累計100匹の猫を迎えた');
  addOnce(!!t && t.photos >= 100, 'cameraman', '100枚撮影した');
  addOnce(!!t && t.pets >= 1000, 'gorogoro', '1,000回なでた');
  add(s.charging && s.openHours.some((h) => h >= 23 || h < 5), 'nemurio', '夜、充電しながら会いに来た');

  // 複合・隠し条件
  add(dow === 5 && d === 13 && full, 'maboroshi-kuroneko', '13日の金曜日の満月');
  add(newMoon && blackCount >= 3, 'yami', '新月の夜に黒猫が3匹');
  add(full && kinds >= 50, 'ousama', '満月の夜に50種類');

  // 天気（取れた日だけ）
  if (!forecast) {
    const w = s.weather;
    add(w === 'rain', 'bishonure', '雨の日');
    add(w === 'snow', 'yukidaruma', '雪の日');
    addOnce(w === 'snow' && (m === 11 || m === 12 || m <= 2), 'hatsuyuki', 'その冬はじめての雪');
    add(w === 'sunny', 'hinata', 'よく晴れた日');
    addOnce(w === 'rain' && AMAYADORI_SET.every(owns), 'amayadori', '雨の日に、3匹の猫がそろっていた');
    add(w === 'rain' && dow === 5 && (s.openHours.some((h) => h >= 23 || h < 4)), 'mayonaka', '雨の金曜日の夜');
  }

  return out;
}

// その日に出会える猫。個性条件がある猫は「個性条件＋簡単な条件」、それ以外は猫ごとのレシピを満たしたときに確定で入る。
// forecast（日付だけの予告）のときは、端末の状態に依存する簡単な条件を無視する
export function guaranteedCats(dayKey: string, s: Signals, ctx: Ctx, forecast = false): Guaranteed[] {
  const [y, m, d] = dayKey.split('-').map(Number);
  const day = new Date(y, m - 1, d, 20, 0, 0);
  const env: Env = {
    steps: s.steps,
    battery: s.battery,
    charging: s.charging,
    streak: s.streak,
    openHours: s.openHours,
    weather: s.weather ?? null,
    kinds: Object.keys(ctx.owned).length,
    m,
    d,
    dow: day.getDay(),
    holiday: isJapaneseHoliday(y, m, d),
    moonAge: (((day.getTime() - NEW_MOON_REF) / 86400000) % SYNODIC + SYNODIC) % SYNODIC,
    fullMoon: isFullMoon(dayKey, day),
    newMoon: isNewMoon(dayKey, day),
  };
  const sig = signatureCats(dayKey, s, ctx, forecast);
  const out: Guaranteed[] = [];
  const sigIds = new Set(sig.map((g) => g.id));
  for (const c of CATS) {
    const rec = recipeOf(c);
    if (!rec) continue;
    if (c.kind === 'condition') {
      const g = sig.find((x) => x.id === c.id);
      if (g && (forecast || evalAtoms(rec.atoms, env))) out.push(g);
    } else if (!forecast && !sigIds.has(c.id) && evalAtoms(rec.atoms, env)) {
      const parts = rec.atoms.map((a) => a.label);
      out.push({ id: c.id, reason: parts.join('・'), parts });
    }
  }
  return out;
}

// 暦・月・季節など「日付だけで決まる」条件猫の予告。今日から days 日分
export function upcoming(fromKey: string, days: number, birthday: Signals['birthday']): { day: string; cats: Guaranteed[] }[] {
  const neutral: Signals = { battery: [], charging: false, steps: null, gapDays: 0, streak: 0, openHours: [], catalogUpdated: false, birthday };
  const [y, m, d] = fromKey.split('-').map(Number);
  const out: { day: string; cats: Guaranteed[] }[] = [];
  let prev = new Set(guaranteedCats(fromKey, neutral, { owned: {}, appearCounts: {} }, true).map((c) => c.id));
  const listed = new Set<string>();
  for (let i = 1; i <= days; i++) {
    const key = fmtDay(new Date(y, m - 1, d + i));
    const all = guaranteedCats(key, neutral, { owned: {}, appearCounts: {} }, true);
    // 季節イベントのように何日も続く条件は、始まった日だけ載せる。
    // 毎週の金曜日のようにくり返す条件は、いちばん近い日だけ載せる（一覧が同じ子で埋まらないように）
    const cats = all.filter((c) => !prev.has(c.id) && !listed.has(c.id));
    prev = new Set(all.map((c) => c.id));
    cats.forEach((c) => listed.add(c.id));
    if (cats.length) out.push({ day: key, cats });
  }
  return out;
}

// 図鑑で未所持の条件猫に出すヒント（条件そのものは伏せる）。
// PENDING の猫は判定の仕組みがまだなく、いまは出会えない。
export const PENDING: Record<string, string> = {};

export const HINTS: Record<string, string> = {
  genkai: 'スマホの元気がなくなったとき…',
  denchigire: 'スマホがくたびれてきたとき…',
  nyannyan: 'スマホの元気が「にゃんにゃん」のとき…',
  hanbun: 'スマホの元気がちょうど半分のとき…',
  mantan: 'スマホの元気がいっぱいのとき…',
  juuden: 'スマホがごはんを食べているとき…',
  nyanpo: 'ほんの少し歩いた日に…',
  chokotto: 'ちょこっと歩いた日に…',
  lucky: '縁起のいい数だけ歩いた日に…',
  hodohodo: 'ほどほどに歩いた日に…',
  zorome: '2がそろうほど歩いた日に…',
  osanpo: 'お散歩した日に…',
  tekuteku: 'たくさん歩いた日に…',
  kiseki: 'スマホと歩数の「2」がそろったとき…',
  nebosuke: 'ひと晩会えなかった翌日に…',
  samishigari: 'しばらく会えなかったら…',
  ijike: '1週間ほど会えなかったら…',
  hisashiburi: 'ひと月ぶりに会えたら…',
  kikan: 'とても長い留守のあとに…',
  mainichi: '毎日会いに来てくれたら…',
  asa: '朝のうちに会いに来たら…',
  yuugure: '夕方に会いに来たら…',
  yofukashi: '夜ふかししたら…',
  shinirimobby: '新しい仲間がふえた日に…',
  noroware: '不吉といわれる金曜日に…',
  hanakin: '週末の手前の夜に…',
  nekonohi: '猫にとって特別な日に…',
  uruu: '4年に1度しか来ない日に…',
  usotsuki: 'うそをついてもいい日に…',
  tanabata: '星に願いをかける夜に…',
  ichiichi: '1がならぶ日に…',
  santa: 'プレゼントの夜に…',
  toshikoshi: '一年の終わりに…',
  hatsuhinode: '一年のはじまりに…',
  nikukyuu: '毎月、肉球の日に…',
  sakasama: '逆から読んでも同じ日に…',
  pittari: '数字がぴったりそろう日に…',
  tanjoubi: 'あなたの特別な日に…（設定で誕生日を登録）',
  hiruyoru: '昼と夜が同じ長さの日に…',
  taiyou: '昼がいちばん長い日・短い日に…',
  sakura: '桜の季節に…',
  tsuyu: '雨の季節に…',
  halloween: 'おばけの季節に…',
  mangetsu: 'まあるい月の夜に…',
  shingetsu: '月が見えない夜に…',
  aotsuki: 'めずらしい月の夜に…',
  hoshizora: '星が流れる夜に…',
  juunyan: 'たくさんの猫と暮らすと…',
  tomodachizure: 'もっとたくさんの猫と暮らすと…',
  collector: 'さらにたくさんの猫と暮らすと…',
  shirokuro: '黒い猫と白い猫がそろうと…',
  bunshin: '同じ猫がたくさんいると…',
  sanbiki: '特別な3匹がそろうと…',
  shitsukoi: '同じ猫が何度も訪ねてきたら…',
  'maboroshi-kuroneko': '不吉な金曜日に、まあるい月が重なると…',
  yami: '月のない夜に黒い猫たちが集まると…',
  ousama: 'まあるい月の夜、たくさんの猫と暮らしていると…',
  shoku: '昼の空が暗くなる日に…',
  'world-marathon': 'たくさん、たくさん歩いたら…',
  pyonpyon: 'ぴょんぴょん、通い続けたら…',
  omatsuri: 'おうちが猫でいっぱいになったら…',
  cameraman: 'たくさん写真を撮ったら…',
  gorogoro: 'たくさんなでてあげたら…',
  nemurio: 'おやすみ前のスマホのそばで…',
  bishonure: '雨の日に…',
  yukidaruma: '雪の日に…',
  hatsuyuki: 'その冬はじめての雪の日に…',
  hinata: 'よく晴れた日に…',
  ondo: '気温が、ある数字になった日に…',
  mayonaka: '雨の金曜日の夜に…',
  amayadori: '雨の日、あの子たちが一緒にいると…',
  himitsu: '特定の猫たちを同じ部屋に置くと…',
};

// 発見カード・共有文に載せる条件。単純な条件はそのまま載せ、複合条件は片方だけ見せて
// 残りを SNS で考察してもらう（game-design.md 16.）
const CARD_REASON: Record<string, string> = {
  kiseki: 'スマホと歩数の数字がそろった日',
  'maboroshi-kuroneko': '13日の金曜日に、もうひとつ何かが重なった日',
  yami: '新月の夜に、ある猫たちがそろった日',
  ousama: '満月の夜に、ある条件がそろった日',
};
// その猫の出会いの条件の数。2つ以上あるときは、見せている理由はそのうちの1つだけ
export const conditionTotal = (id: string): number => {
  const cat = CATS.find((c) => c.id === id);
  return (cat && cat.kind === 'breed' && recipeOf(cat)?.atoms.length) || 1;
};
export const cardReason = (id: string, reason: string) => CARD_REASON[id] ?? reason;

// 世界共通の報酬・旅猫（サーバー接続後に配布）
export const WORLD_HINT = '世界のみんなで目標を達成すると届く猫です（サーバー接続後に配布）';
export const TRAVEL_HINT = '世界に1匹だけの旅猫。いつか、あなたのもとへ訪ねてきます';
