export function adjustZoom(value: number, action: string): number {
  if (action !== 'increment' && action !== 'decrement') return value;
  return Math.max(0, Math.min(1, Math.round((value + (action === 'increment' ? 0.1 : -0.1)) * 10) / 10));
}

export const zoomValue = (value: number) => ({ min: 0, max: 100, now: Math.round(value * 100), text: value === 0 ? '等倍' : `ズーム ${Math.round(value * 100)}パーセント` });
