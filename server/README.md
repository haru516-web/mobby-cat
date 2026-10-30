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
| 匿名購入の引継ぎ | `POST /auth/recover-purchase`（期限内サブスクの署名つき取引。Apple未連携のみ。同じ購入日時・以前の証明は拒否し、鍵回転と使用日時記録を原子的に更新） |
| 残高 | `GET /wallet`（お迎え券 `tickets`・またたび `matatabi`）、`POST /wallet/consume`（`requestId` ごとに1回だけ消費） |
| またたびパス | `GET /plan` |
| 年齢区分と購入上限 | `POST /profile/age-group`（下げるのは可、上げるのは不可）、`GET /limits` |
| アカウント削除 | `POST /account/delete`（`confirm: "delete"`。Apple 連携済みは先に Apple のトークンを取り消し、できなければ削除しない） |
| 公開ページ | `GET /privacy` `/support` `/legal`（文面は `src/privacyPolicy.ts` ほか。運営者名・連絡先は `src/operator.ts`） |

購入は匿名アカウントのままでできます。Apple連携は任意です。アプリのアカウント作成・購入・クラウドセーブ・削除画面とKeychain保存は実装済みですが、実機検証は残っています。

## 商品の設定

`wrangler.toml` の `PRODUCT_CATALOG_JSON` です。1つの商品は「お迎え券だけ」「またたびだけ」「プラン（月ごとのお迎え券つき）」のどれか1つで、混ぜるとサーバーが 500 を返します（返金のときに、どの分を取り消すか決められないため）。商品 ID と価格は仮です。App Store Connect の登録と合わせてください。

## 設定名（値はここに書かない）

- `APPLE_ROOT_CERTIFICATES`：Apple の公開ルート証明書（設定済み）
- `APPLE_BUNDLE_ID`：`com.mobbycat.app`
- `PRODUCT_CATALOG_JSON`：上記
- `PURCHASE_ENVIRONMENTS`：既定は `Production` のみ。`wrangler.toml` は TestFlight 用に `Production,Sandbox`。**公開後も `Sandbox` は外さない**（アップデートの審査も、サンドボックスで購入するため。サンドボックスの購入は `purchases.environment` で見分けて、売上の集計から除く）
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
6. `PURCHASE_ENVIRONMENTS` は `Production,Sandbox` のまま運用する（上の理由）。

## データベースの変更（すでに動いている DB に）

`schema.sql` は新しく作るときだけ使う（`CREATE TABLE IF NOT EXISTS` なので、列は足されない）。動いている DB には、`migrations/` の SQL を**デプロイより先に**1回だけ流す。先にデプロイすると、新しい列に書き込む購入の記録が失敗する。

| ファイル | 内容 | 本番に適用 |
|---|---|---|
| `migrations/0003_purchase_recovery_date.sql` | 購入の証明の再利用を拒否するため、最後に引き継いだ購入日時を記録 | 未 |
| `migrations/0002_purchase_price.sql` | 購入した日時と、Apple が請求した金額（円）を記録する（月の購入上限の計算に使う） | 未 |

```bash
npx wrangler d1 execute nyakomobby --remote --file=./migrations/0002_purchase_price.sql
npx wrangler d1 execute nyakomobby --remote --file=./migrations/0003_purchase_recovery_date.sql
npx wrangler deploy
```

上記は運営者の適用手順です。Codexは本番操作を行っていません。0002、0003の順に、未適用の移行だけを実行します。匿名購入の証明は同じ購入日時・以前のものを再利用できないため、再引継ぎと応答喪失時には新しい更新取引またはApple連携の案内が必要です。

回数制限：送信元のアドレスごとの制限は Cloudflare の Rate Limiting（`wrangler.toml` の `[[ratelimits]]`。DB には残らない）。アカウントごとの制限（購入の確認、Apple 連携、記録の保存・読み込み、残高の消費、年齢の区分）は DB の `rate_limits`。

## まだ無いもの

- 起動時の App Store Server API による購入状態の再照合（通知の取りこぼし対策）
- 引き継ぎコード（有効期限つき・1回限りのサーバー発行）
