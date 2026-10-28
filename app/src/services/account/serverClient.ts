// サーバー（server/）との通信。React Native に依存しないので、そのまま Node でも動かして確かめられる。
// 画面には例外を投げない。つながらないときは null、サーバーの答えは { status, data } で返す。

export type Credentials = { userId: string; secret: string };
export type CredentialStore = { read(): Promise<Credentials | null>; write(value: Credentials | null): Promise<void> };
export type Reply = { status: number; data: Record<string, unknown> | null } | null;

const TIMEOUT_MS = 8000;

export function createClient(baseUrl: string, store: CredentialStore, fetchImpl: typeof fetch = fetch) {
  async function raw(path: string, init: { method?: string; body?: unknown; auth?: Credentials | null }): Promise<Reply> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (init.auth) headers.Authorization = `Bearer ${init.auth.userId}.${init.auth.secret}`;
      const response = await fetchImpl(baseUrl + path, {
        method: init.method ?? 'POST',
        headers,
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => null);
      return { status: response.status, data: data as Record<string, unknown> | null };
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  // 登録は同時に1回だけ（画面が続けて呼んでも、アカウントが増えない）
  let registering: Promise<Credentials | null> | null = null;

  /** この端末のアカウント。まだ無ければ、いま作る（作れなければ null）。 */
  function account(): Promise<Credentials | null> {
    return (registering ??= (async () => {
      try {
        const saved = await store.read();
        if (saved) return saved;
        const reply = await raw('/auth/register', { body: {} });
        const data = reply?.data;
        if (reply?.status !== 201 || !data || typeof data.userId !== 'string' || typeof data.secret !== 'string') return null;
        const created = { userId: data.userId, secret: data.secret };
        await store.write(created);
        return created;
      } finally {
        registering = null;
      }
    })());
  }

  return {
    raw,
    account,
    /** アカウントがあるか（作らずに見るだけ）。 */
    existing: () => store.read(),
    /** 認証つきの呼び出し。401 のときも、勝手にアカウントを捨てない（呼んだ側が案内する）。 */
    async authed(path: string, init: { method?: string; body?: unknown } = {}): Promise<Reply> {
      const auth = await account();
      return auth ? raw(path, { ...init, auth }) : null;
    },
    /** すでにあるアカウントだけで呼ぶ。無ければ作らずに null（起動時の確認で、空のアカウントを作らないため）。 */
    async authedIfAny(path: string, init: { method?: string; body?: unknown } = {}): Promise<Reply> {
      const auth = await store.read();
      return auth ? raw(path, { ...init, auth }) : null;
    },
    /** 別の端末のアカウントを引き継いだ・アカウントを捨てるとき。 */
    adopt: (value: Credentials | null) => store.write(value),
  };
}
export type Client = ReturnType<typeof createClient>;

/** 成功の返事（2xx）か。null（つながらなかった）は成功ではない。 */
export const ok = (reply: Reply): boolean => reply !== null && reply.status >= 200 && reply.status < 300;
