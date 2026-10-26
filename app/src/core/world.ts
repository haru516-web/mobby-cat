// 世界みんなの記録で届く猫。数字は1日1回読む静的なJSON（自前のサーバーにユーザーごとのDBは持たない）。
// - countries: 利用者がいる国の数。端末の国が一覧になければ、その国の最初の1人だけが1回登録する
// - traveler*: 旅猫のこれまでの記録（訪れた人数・大陸・国）。運営が更新する
export type WorldStats = { countries: number; travelerVisitors: number; travelerContinents: number; travelerCountries: number };

const COUNTRY_CATS: [string, number][] = [
  ['country-01', 1], ['country-02', 2], ['country-03', 3], ['country-04', 4], ['country-05', 5],
  ['country-06', 6], ['country-07', 7], ['country-08', 8], ['country-09', 9], ['country-10', 10],
  ['country-20', 11], ['country-30', 12], ['country-50', 13], ['country-75', 14], ['country-100', 15],
];

// 数字がそろった猫のうち、まだ持っていない子（全員に無料で届ける）
export function worldGifts(w: WorldStats, owned: Record<string, unknown>): { id: string; reason: string }[] {
  const out: { id: string; reason: string }[] = [];
  for (const [id, n] of COUNTRY_CATS) if (w.countries >= n) out.push({ id, reason: `世界の${n}か国に仲間がそろった` });
  if (w.travelerVisitors >= 100) out.push({ id: 'hyakunin', reason: '旅猫が100人のもとを訪れた' });
  if (w.travelerContinents >= 7) out.push({ id: 'bouken-ou', reason: '旅猫が7つの大陸をめぐった' });
  if (w.travelerCountries >= 10) out.push({ id: 'world-traveler', reason: '旅猫が10か国をめぐった' });
  return out.filter((g) => !owned[g.id]);
}
