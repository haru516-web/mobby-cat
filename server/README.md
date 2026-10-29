# にゃっコレ サーバー（Cloudflare Workers + D1）

アカウント・購入・クラウドセーブ・アカウント削除だけを受け持つ小さなサーバーです。無料で得た分、歩数、候補の抽選は端末内のままで、ここには置きません（`docs/game-design.md` 16.）。

## 受け持つもの

| 用途 | エンドポイント |
|---|---|
| 匿名アカウント作成 | `POST /auth/register` → `{ userId, secret }`。以降は `Authorization: Bearer <userId>.<secret>`。secret は SHA-256 のハッシュだけを保存 |
| Apple サインイン | `POST /account/apple/link`（今の端末のアカウントに結ぶ）、`POST /auth/apple`（新しい端末で引き継ぐ。旧端末の secret は無効になる） |
| クラウドセーブ | `GET/POST /save`（Apple 連携済みのアカウントだけ。`baseVersion` が古いと 409） |
| 購入の検証 | `POST /purchases/verify`（StoreKit 2 の JWS。`appAccountToken` はアカウントの `userId` と一致が必須） |
| App Store Server Notifications V2 | `POST /apple/notifications`（更新・返金・取り消し） |
| 残高 | `GET /wallet`（お迎え券 `tickets`・またたび `matatabi`）、`POST /wallet/consume`（`requestId` ごとに1回だけ消費） |
| またたびパス | `GET /plan` |
| 年齢区分と購入上限 | `POST /profile/age-group`（下げるのは可、上げるのは不可）、`GET /limits` |
| アカウント削除 | `POST /account/delete`（`confirm: "delete"`。Apple 連携済みは先に Apple のトークンを取り消し、できなければ削除しない） |
| 公開ページ | `GET /privacy` `/support` `/legal`（文面は `src/privacyPolicy.ts` ほか。運営者名・連絡先は `src/operator.ts`） |

「課金の前に Apple 連携を必須にする」のはアプリ側で行います。サーバーは、すでに支払われた購入は連携の有無にかかわらず付与します（お金だけ取られて何も届かない状態を作らないため）。

## 商品の設定

`wrangler.toml` の `PRODUCT_CATALOG_JSON` です。1つの商品は「お迎え券だけ」「またたびだけ」「プラン（月ごとのお迎え券つき）」のどれか1つで、混ぜるとサーバーが 500 を返します（返金のときに、どの分を取り消すか決められないため）。商品 ID と価格は仮です。App Store Connect の登録と合わせてください。

## 設定名（値はここに書かない）

- `APPLE_ROOT_CERTIFICATES`：Apple の公開ルート証明書（設定済み）
- `APPLE_BUNDLE_ID`：`com.mobbycat.app`
- `PRODUCT_CATALOG_JSON`：上記
- `PURCHASE_ENVIRONMENTS`：既定は `Production` のみ。`wrangler.toml` は TestFlight 用に `Production,Sandbox`。**公開前に `Sandbox` を外す**
- `APPLE_TEAM_ID` / `APPLE_SIGN_IN_KEY_ID` / `APPLE_SIGN_IN_PRIVATE_KEY`：Apple ログインのトークン取り消し用。秘密鍵は Worker の secret に入れる（`npx wrangler secret put APPLE_SIGN_IN_PRIVATE_KEY`）。未設定だと、Apple 連携済みのアカウントは削除できない
- `APPLE_JWKS_JSON`：任意。Apple の公開鍵を上書きする

## 開発

```bash
npm install
npm test           # SQLite 上の D1Store とワーカーを通すテスト
npm run typecheck
npm run dev        # ローカルで起動（先に npm run db:apply）
```

## デプロイ前に人が行うこと

1. `npx wrangler d1 create nyakomobby` で DB を作り、出た ID を `wrangler.toml` の `database_id` に入れる。
2. `npx wrangler d1 execute nyakomobby --remote --file=./schema.sql`
3. 上の secret を登録し、`npx wrangler deploy`。
4. App Store Connect の「App Store Server Notifications」の URL に `https://<worker>/apple/notifications` を設定（Production / Sandbox の両方）。
5. `src/operator.ts` に運営者名と連絡先を入れ、公開ページの「【要設定】」を埋める。
6. 公開前に `PURCHASE_ENVIRONMENTS` から `Sandbox` を外す。

## まだ無いもの

- アプリ側の接続（アカウント作成、Apple 連携画面、購入、クラウドセーブ、アカウント削除の画面）
- 起動時の App Store Server API による購入状態の再照合（通知の取りこぼし対策）
- 認証用 secret の Keychain 保存（アプリ側で `expo-secure-store` を使う）
- 引き継ぎコード（有効期限つき・1回限りのサーバー発行）
