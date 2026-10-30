import type { DayRecord, GameState, PendingSpend, SpendResult } from './game';

export const spendBlocked = (s: Pick<GameState, 'pendingSpend'>, busy: boolean) => busy || !!s.pendingSpend;

export async function exclusiveAccountChange<T>(gate: { current: boolean }, blocked: () => boolean, work: () => Promise<T>, unavailable: T): Promise<T> {
  if (gate.current || blocked()) return unavailable;
  gate.current = true;
  try { return await work(); } finally { gate.current = false; }
}

// 通常保存もジャーナルも、呼んだ順に書く。前の保存が失敗しても、次の保存は試す。
export function serializedWriter<T>(write: (value: T) => Promise<void>) {
  let tail = Promise.resolve();
  return (value: T): Promise<void> => {
    const next = tail.then(() => write(value));
    tail = next.catch(() => {});
    return next;
  };
}

const openedOf = (r: DayRecord) => r.opened ?? (r.freePick || r.extraPicks.length || r.matatabiUsed ? r.candidates.slice(0, Math.min(r.candidates.length, r.baseCount + r.matatabiUsed + (r.passBonus ?? 0))) : []);

/** 操作前の日が置換・削除されても、保存した日を使って確定する。 */
export function applySpend(s: GameState, p: PendingSpend): GameState {
  if (p.applied) return { ...s, pendingSpend: undefined };
  const r = s.days[p.day] ?? p.record;
  // 古い版のジャーナルには日がない。対象日も失われていれば、買った分を端末のアイテムとして補償する。
  if (!r) return { ...s, [p.currency]: s[p.currency] + p.fromPaid, pendingSpend: undefined };
  let next = { ...s, [p.currency]: Math.max(0, s[p.currency] - p.fromFree), pendingSpend: undefined };
  if (p.kind === 'extra') {
    const ids = p.ids.filter((id) => !r.extraPicks.includes(id));
    const owned = { ...s.owned };
    for (const id of ids) {
      const o = owned[id];
      owned[id] = o ? { ...o, count: o.count + 1 } : { count: 1, firstDay: p.day, firstReason: r.reasons[id] ?? '' };
    }
    next = { ...next, owned, days: { ...s.days, [p.day]: { ...r, extraPicks: [...r.extraPicks, ...ids] } } };
  } else {
    const opened = openedOf(r);
    next = { ...next, days: { ...s.days, [p.day]: { ...r, matatabiUsed: r.matatabiUsed + 1, opened: opened.includes(p.ids[0]) ? opened : [...opened, p.ids[0]] } } };
  }
  return next;
}

type SpendIO = {
  get(): GameState;
  put(s: GameState): void;
  save(s: GameState): Promise<void>;
  spend(currency: 'tickets' | 'matatabi', amount: number, id: string): Promise<SpendResult>;
};

/** 保存→消費→適用→保存。応答不明・保存失敗では、次の操作へ進まず同じIDを再送する。 */
export async function runSpend(p: PendingSpend, io: SpendIO): Promise<boolean> {
  try {
    if (!io.get().pendingSpend) io.put({ ...io.get(), pendingSpend: p });
    if (io.get().pendingSpend?.id !== p.id) return false;
    await io.save(io.get());
    const result = p.applied ? 'ok' : await io.spend(p.currency, p.fromPaid, p.id);
    if (result === 'offline') return false;
    if (result === 'short') {
      const next = { ...io.get(), pendingSpend: undefined };
      await io.save(next);
      io.put(next);
      return false;
    }
    const next = applySpend(io.get(), p);
    // 保存の失敗後にも、同じセッションで二重に適用しない。
    io.put({ ...next, pendingSpend: { ...p, applied: true } });
    await io.save({ ...io.get(), pendingSpend: undefined });
    io.put({ ...io.get(), pendingSpend: undefined });
    return true;
  } catch {
    return false;
  }
}
