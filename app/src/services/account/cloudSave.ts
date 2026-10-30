import type { GameState } from '../../core/game';
import { checkSaved } from '../../core/saveShape';
import { encounterDayKey, prevDayKey } from '../../core/dates';

/*
 * クラウドに預ける「記録」。Apple でサインインしたアカウントだけが使う。
 * 記録の全体を1つの文字列にして、サーバーに預ける。サーバーは、版（version）が合うときだけ上書きを受け付けるので、
 * 古い端末が新しい記録を消すことはない。
 *
 * 預けないもの：
 *  - 開発用の日付のずれ（debugOffsetDays）と、この端末の時計のずれ（clockSkewMs）
 *  - 買った分の残高のコピー（paid）と、またたびパスの状態（pass）。正しい値はサーバーが持つ（古い写しで上書きしないため）
 *  - 端末の中だけで使うと説明している情報：誕生日（birthday）、歩数の合計（totalSteps）、電池・起動時刻の観測（obs）
 *    （プライバシーポリシーと App Privacy の回答に合わせる。機種変更のあとは、新しい端末で入れ直す）
 */
const KEEP_DAYS = 3; // 出会いの記録（どの猫が候補に出たか）は、直近の3日分だけ預ける（きのうの分を戻せれば足りる。歩数などを推し量れる材料を、サーバーに残さないため）

export function toRecord(state: GameState, now = new Date(Date.now() + (state.clockSkewMs ?? 0))): string {
  const { debugOffsetDays: _debug, clockSkewMs: _skew, paid: _paid, pass: _pass, birthday: _birthday, totalSteps: _steps, obs: _obs, pendingSpend: _pending, encounterMisses: _misses, ...rest } = state;
  // 出会えた条件の文（「1日1万歩」「誕生日」など、歩数・誕生日から分かるもの）と、お知らせの本文は預けない。
  // 誕生日の猫を迎えた日も、月日から誕生日が分かるので、年だけ残す（戻したあと、迎えた日は年始として出る）
  const owned = Object.fromEntries(
    Object.entries(rest.owned).map(([id, o]) => {
      const birthday = o.firstReason === '誕生日' || Object.values(rest.days).some((d) => d.reasons?.[id] === '誕生日');
      return [id, { ...o, firstReason: '', firstDay: birthday ? `${o.firstDay.slice(0, 4)}-01-01` : o.firstDay }];
    }),
  );
  const trim = (days: number) => {
    const latest = encounterDayKey(now);
    let earliest = latest;
    for (let i = 1; i < days; i++) earliest = prevDayKey(earliest);
    const keys = Object.keys(rest.days).filter((key) => key >= earliest && key <= latest).sort();
    return JSON.stringify({ ...rest, owned, days: Object.fromEntries(keys.map((key) => [key, { ...Object.fromEntries(Object.entries(rest.days[key]).filter(([field]) => field !== 'eligible')), reasons: {} }])), inbox: [], inboxRead: 0 });
  };
  const full = trim(KEEP_DAYS);
  return full;
}

/** 預けた記録を読む。読めない・形の合わない項目があるときは null（壊れた記録で、いまの記録を上書きしないため。B-02）。 */
export function fromRecord(text: string): Partial<GameState> | null {
  try {
    const checked = checkSaved(JSON.parse(text));
    return checked && !checked.repaired ? checked.saved : null;
  } catch {
    return null;
  }
}

/** 記録が変わったかを見分ける短い指紋（cyrb53）。安全のためのものではない。 */
export function fingerprint(text: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}

export type CloudMeta = {
  /** この端末が最後に見た、サーバーの版。サーバーに記録が無ければ 0。 */
  version: number;
  /** 最後に預けた（または受け取った）記録の指紋。 */
  hash: string;
  /** 最後に預けた時刻（ms）。 */
  at: number;
};
export const emptyCloudMeta = (): CloudMeta => ({ version: 0, hash: '', at: 0 });

export function normalizeCloudMeta(value: unknown): CloudMeta {
  const v = value && typeof value === 'object' ? (value as Partial<CloudMeta>) : {};
  return {
    version: Number.isSafeInteger(v.version) && Number(v.version) >= 0 ? Number(v.version) : 0,
    hash: typeof v.hash === 'string' ? v.hash : '',
    at: Number.isFinite(v.at) ? Number(v.at) : 0,
  };
}

/** 預けるべきか。変わっていなければ預けない。続けて預けすぎないよう、間をあける（force のときは、あけない）。 */
export const MIN_UPLOAD_GAP_MS = 60_000;
export function shouldUpload(meta: CloudMeta, hash: string, now: number, force: boolean): boolean {
  return uploadWaitMs(meta, hash, now, force) === 0;
}
/** あと何 ms 待てば預けられるか（0 ならいま。変わっていなければ null）。間をあけるために見送ったら、この時間のあとに預け直す（B-06）。 */
export function uploadWaitMs(meta: CloudMeta, hash: string, now: number, force: boolean): number | null {
  if (hash === meta.hash) return null;
  return force ? 0 : Math.max(0, MIN_UPLOAD_GAP_MS - (now - meta.at));
}

/** 記録が空に近いか（新しく入れたばかりの端末）。空なら、クラウドの記録をそのまま使って困らない。 */
export function isEmptyRecord(state: Pick<GameState, 'starterChosen' | 'owned'>): boolean {
  return !state.starterChosen && Object.keys(state.owned).length === 0;
}
