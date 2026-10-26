// 世界みんなの記録（静的JSON）を1日1回だけ読む。URL が決まるまでは何も読まない（null）。
import type { WorldStats } from '../core/world';

// 例: https://<配信先>/world.json （Cloudflare Pages などに置く静的ファイル）。サーバー側が整うまで空
export const WORLD_STATS_URL = '';

export async function readWorldStats(): Promise<WorldStats | null> {
  if (!WORLD_STATS_URL) return null;
  try {
    const res = await fetch(WORLD_STATS_URL);
    if (!res.ok) return null;
    const j = await res.json();
    const n = (v: unknown) => (typeof v === 'number' && v >= 0 ? v : 0);
    return { countries: n(j.countries), travelerVisitors: n(j.travelerVisitors), travelerContinents: n(j.travelerContinents), travelerCountries: n(j.travelerCountries) };
  } catch {
    return null;
  }
}
