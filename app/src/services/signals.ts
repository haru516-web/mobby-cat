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

// 歩数の許可を求める。初回の相棒選びの「はじめる」で、説明を読んだあとに1度だけ呼ぶ
export async function requestStepAccess(): Promise<void> {
  try {
    if (!(await Pedometer.isAvailableAsync())) return;
    if (!(await Pedometer.getPermissionsAsync()).granted) await Pedometer.requestPermissionsAsync();
  } catch {}
}

// その日（0:00〜20:00、または今まで）の歩数。iOS は過去7日分まで取得できる。
// 許可はここでは求めない（候補づくりの途中で、説明なしにダイアログが出てしまうため）
export async function readSteps(dayKey: string, now: Date): Promise<number | null> {
  try {
    if (!(await Pedometer.isAvailableAsync())) return null;
    if (!(await Pedometer.getPermissionsAsync()).granted) return null;
    const start = parseDay(dayKey);
    const end = new Date(start);
    end.setHours(REVEAL_HOUR, 0, 0, 0);
    const res = await Pedometer.getStepCountAsync(start, end < now ? end : now);
    return res.steps;
  } catch {
    return null;
  }
}

// 歩数の許可が出ているか（設定画面の案内用）
export async function hasStepAccess(): Promise<boolean> {
  try {
    return (await Pedometer.isAvailableAsync()) && (await Pedometer.getPermissionsAsync()).granted;
  } catch {
    return false;
  }
}
