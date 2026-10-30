// 誕生日は月・日だけを端末内に保存する（年は持たない）。2月29日も選べる。
// 一度登録したら、あとから変えられない（誕生日の猫を何度も呼べてしまわないように）。
export type Birthday = { m: number; d: number };

/** 各月の日数（2月は29日まで） */
export const DAYS_IN = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

export const daysInMonth = (m: number): number => DAYS_IN[m - 1] ?? 0;

export const isValidBirthday = (b: { m: unknown; d: unknown } | null | undefined): b is Birthday =>
  !!b && Number.isInteger(b.m) && Number.isInteger(b.d) && (b.m as number) >= 1 && (b.m as number) <= 12 && (b.d as number) >= 1 && (b.d as number) <= daysInMonth(b.m as number);

const isLeapYear = (y: number): boolean => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** その日（y年m月d日）が、誕生日か。2月29日生まれは、うるう年でない年は2月28日に祝う */
export function isBirthdayOn(b: Birthday | null | undefined, y: number, m: number, d: number): boolean {
  if (!b) return false;
  if (b.m === 2 && b.d === 29 && !isLeapYear(y)) return m === 2 && d === 28;
  return b.m === m && b.d === d;
}

/** 登録してよいか：まだ登録しておらず、選んだ日が正しいときだけ */
export const canRegisterBirthday = (current: Birthday | null | undefined, next: { m: number; d: number }): boolean => !current && isValidBirthday(next);
