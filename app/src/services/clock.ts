// 端末の時計が、サーバーの時計からどれだけずれているか（ms）。端末の時刻を進めて、先の日の猫に会えないようにする（C2）。
// 送るものはない（時刻を聞くだけ）。つながらない・遅すぎるときは null（前回のずれのまま使う）。
import { SERVER_URL } from '../data/appInfo';

const LIMIT_MS = 5000;
// 往復に時間がかかると、差を正しく測れない。それより遅い答えは使わない
const MAX_ROUND_TRIP_MS = 3000;
// 数分のずれは、ふつうの時計の誤差。日付の判定には関係しないので、0 とみなす（測るたびに少しずつ動かないように）
const IGNORE_MS = 5 * 60_000;

export async function readServerClockOffset(): Promise<number | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LIMIT_MS);
  try {
    const sent = Date.now();
    const res = await fetch(`${SERVER_URL}/time`, { signal: controller.signal, cache: 'no-store' });
    const received = Date.now();
    if (!res.ok || received - sent > MAX_ROUND_TRIP_MS) return null;
    const server = (await res.json())?.now;
    if (typeof server !== 'number' || !Number.isFinite(server)) return null;
    const offset = server - (sent + received) / 2;
    return Math.abs(offset) < IGNORE_MS ? 0 : Math.round(offset);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
