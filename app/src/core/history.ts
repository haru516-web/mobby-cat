import type { GameState } from './game';

export const LOCAL_DAY_LIMIT = 90;

// 図鑑・所持数・初めて迎えた日・累計は残す。復旧中の操作の日は、90件とは別に保護する。
export function retainDays(s: GameState): GameState {
  const keys = Object.keys(s.days).sort();
  if (keys.length <= LOCAL_DAY_LIMIT) return s;
  const keep = new Set(keys.slice(-LOCAL_DAY_LIMIT));
  if (s.pendingSpend) keep.add(s.pendingSpend.day);
  return { ...s, days: Object.fromEntries(keys.filter(key => keep.has(key)).map(key => [key, s.days[key]])) };
}
