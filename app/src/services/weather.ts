// その日の天気（出会いの条件の材料）。端末のおおまかな位置から、無料の天気予報API（MET Norway、キー不要）を1日1回だけ呼ぶ。
// 位置は小数第1位（約10km）に丸めて送り、保存しない。許可がない・通信できないときは null。
import * as Location from 'expo-location';
import type { Weather } from '../core/recipes';

// 初回の相棒選びの「はじめる」で、説明を読んだあとに1度だけ呼ぶ（歩数の許可と同じ流れ）
export async function requestWeatherAccess(): Promise<void> {
  try {
    if (!(await Location.getForegroundPermissionsAsync()).granted) await Location.requestForegroundPermissionsAsync();
  } catch {}
}

const cache = new Map<string, Weather | null>();

// MET Norway の symbol_code（例: clearsky_day, lightrain, heavysnowshowers_night）を4種類にまとめる
export function weatherFromSymbol(code: string): Weather {
  const c = code.replace(/_(day|night|polartwilight)$/, '');
  if (c.includes('snow') || c.includes('sleet')) return 'snow';
  if (c.includes('rain') || c.includes('thunder')) return 'rain';
  if (c === 'clearsky' || c === 'fair') return 'sunny';
  return 'cloudy';
}

// 判定は、その日の 20:00 に近い時刻の予報を使う。過去の日は取れないので、今日以外は null
export async function readWeather(dayKey: string, todayKey: string): Promise<Weather | null> {
  if (dayKey !== todayKey) return null;
  if (cache.has(dayKey)) return cache.get(dayKey) ?? null;
  try {
    if (!(await Location.getForegroundPermissionsAsync()).granted) return null;
    const pos =
      (await Location.getLastKnownPositionAsync()) ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }));
    if (!pos) return null;
    const lat = pos.coords.latitude.toFixed(1);
    const lon = pos.coords.longitude.toFixed(1);
    const res = await fetch(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`, {
      headers: { 'User-Agent': 'nekomobby/1.0 github.com/haru516-web/mobby-cat' },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const t = new Date(`${dayKey}T20:00:00`).getTime();
    const series: { time: string; data: { next_1_hours?: { summary: { symbol_code: string } }; next_6_hours?: { summary: { symbol_code: string } } } }[] =
      json?.properties?.timeseries ?? [];
    let best = series[0];
    for (const s of series) if (Math.abs(new Date(s.time).getTime() - t) < Math.abs(new Date(best.time).getTime() - t)) best = s;
    const code = best?.data?.next_1_hours?.summary.symbol_code ?? best?.data?.next_6_hours?.summary.symbol_code;
    const w = code ? weatherFromSymbol(code) : null;
    cache.set(dayKey, w);
    return w;
  } catch {
    return null;
  }
}
