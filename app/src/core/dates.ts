export const REVEAL_HOUR = 20;

const pad = (n: number) => String(n).padStart(2, '0');
export const fmtDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const parseDay = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

// 20:00 (local) に切り替わる「出会いの日」のキー。20:00前は前日分。
// 時間を引き算せず、その土地の時刻と暦で決める（夏時間のある地域でも、通知の20時とずれない）
export function encounterDayKey(now: Date): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (now.getHours() < REVEAL_HOUR) d.setDate(d.getDate() - 1);
  return fmtDay(d);
}

export function prevDayKey(key: string): string {
  const d = parseDay(key);
  d.setDate(d.getDate() - 1);
  return fmtDay(d);
}

// 2つの日付キーの間の日数（b - a）
export function daysBetween(a: string, b: string): number {
  return Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / 86400000);
}

export function msUntilNextReveal(now: Date): number {
  const next = new Date(now);
  next.setHours(REVEAL_HOUR, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}
