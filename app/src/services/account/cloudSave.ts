import type { GameState } from '../../core/game';
import { checkSaved } from '../../core/saveShape';

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
const KEEP_DAYS = 180; // 出会いの記録は、新しい方から180日分だけ預ける（サーバーの上限に収めるため）
const MAX_CHARS = 380_000;

export function toRecord(state: GameState): string {
  const { debugOffsetDays: _debug, clockSkewMs: _skew, paid: _paid, pass: _pass, birthday: _birthday, totalSteps: _steps, obs: _obs, ...rest } = state;
  const trim = (days: number, inbox: number) => {
    const keys = Object.keys(rest.days).sort().slice(-days);
    return JSON.stringify({ ...rest, days: Object.fromEntries(keys.map((key) => [key, rest.days[key]])), inbox: rest.inbox.slice(0, inbox) });
  };
  const full = trim(KEEP_DAYS, 50);
  return full.length <= MAX_CHARS ? full : trim(60, 20);
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
