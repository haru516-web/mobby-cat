// 出現条件の材料になる端末の情報（電池・歩数）。取れない環境では null を返す。
import * as Battery from 'expo-battery';
import { Pedometer } from 'expo-sensors';
import { parseDay, REVEAL_HOUR } from '../core/dates';

export async function readBattery(): Promise<{ level: number; charging: boolean } | null> {
  try {
    if (!(await Battery.isAvailableAsync())) return null;
    const [lv, st] = await Promise.all([Battery.getBatteryLevelAsync(), Battery.getBatteryStateAsync()]);
    if (lv < 0) return null;
    return {
      level: Math.round(lv * 100),
      charging: st === Battery.BatteryState.CHARGING || st === Battery.BatteryState.FULL,
    };
  } catch {
    return null;
  }
}

// その日（0:00〜20:00、または今まで）の歩数。iOS は過去7日分まで取得できる
export async function readSteps(dayKey: string, now: Date): Promise<number | null> {
  try {
    if (!(await Pedometer.isAvailableAsync())) return null;
    const perm = await Pedometer.getPermissionsAsync();
    if (!perm.granted && !(await Pedometer.requestPermissionsAsync()).granted) return null;
    const start = parseDay(dayKey);
    const end = new Date(start);
    end.setHours(REVEAL_HOUR, 0, 0, 0);
    const res = await Pedometer.getStepCountAsync(start, end < now ? end : now);
    return res.steps;
  } catch {
    return null;
  }
}
