# 公開までの手順（サーバー・Apple・アプリ）

2026-10-28 作成。「誰が」の列：**あなた**＝アカウントの契約や支払い・秘密鍵など本人でなければできないもの。**私**＝コードや設定ファイルの作成。**どちらでも**＝コマンド操作（実行は頼まれたときだけ）。

## 進め方の順番

Apple Developer Program は、mobidou で登録済み（同じ Team を使う）なので、承認待ちはありません。Cloudflare とアプリ側から進められます。

| 段階 | 内容 | 待ち時間 |
|---|---|---|
| A | Apple Developer Program（登録済み。何もしない） | なし |
| B | Cloudflare にサーバーとデータベースを作る（Apple の承認を待たずにできる） | 当日 |
| C | 運営者名・連絡先を決め、公開ページの URL を確定する | 当日 |
| D | Apple 側の登録（App ID、アプリ、契約、商品、鍵） | 契約・税務の確認に 数日かかることがある |
| E | アプリ側の接続を実装する（私） | 実装期間 |
| F | TestFlight で実機の検証をする | 数日 |
| G | ストア素材と申請の準備 | 並行 |
| H | 審査に出し、通ったら公開する | 審査 1〜2日が目安 |

---

## A. Apple Developer Program

登録済み（mobidou で使用中）。にゃこモビーも同じ Team で出す。新しく申し込む必要はない。年会費の更新日だけ、Apple Developer のアカウントで確認しておく。

## B. Cloudflare のサーバーとデータベース（2026-10-28 実施済み）

実施結果：D1 `nyakomobby`（ID は `server/wrangler.toml`）を作成し、`schema.sql` を適用し、`nyakomobby-server` をデプロイした。公開 URL は `https://nyakomobby-server.mobidou.workers.dev`。`/health` と公開 3 ページが開くことを確認済み。以下は、作り直すときの手順。

**URL の方針（2026-10-28 決定）**：独自ドメインにはせず、`workers.dev` のまま使う。URL の中の `mobidou` は、Cloudflare アカウントのサブドメインで、mobidou と共有している。`mobby.online` は公式サイト（Vercel）とメールで使われ、DNS は お名前.com にあるため、触らない。
- アカウントのサブドメインを変えると、**同じアカウントの全 Worker の URL が変わり、古い URL は使えなくなる**とみなす（公式には明記なし）。変えるなら、**公開前に**行い、mobidou とにゃこモビーの両方で、次を更新する：アプリのサーバー URL、App Store Connect の Server Notifications URL、プライバシーポリシー・サポートの URL。
- にゃこモビーのアプリは、サーバー URL を 1 か所の定数にまとめる。
- 公開ページの運営者名・連絡先（C）が埋まるまでは、アプリからこの URL へリンクしない（今は「【要設定】」の表示が、そのまま見える）。

`wrangler` は、この PC でログイン済み。`server/` の中で、順に実行する。

1. `npx wrangler d1 create nyakomobby`
2. 出力された `database_id` を、`server/wrangler.toml` の `database_id` に入れる（私が書き換える）。
3. `npx wrangler d1 execute nyakomobby --remote --file=./schema.sql`
4. `npx wrangler deploy`
5. 出力された URL（`https://nyakomobby-server.<サブドメイン>.workers.dev`）を控える。
6. 動作確認：`/health` が `{"ok":true}` を返し、`/privacy` `/support` `/legal` が開く。

注意：Cloudflare の無料プランは、Worker の CPU 時間が 1 回 10ms までです。購入の署名検証がこれを超えると、エラーになります。購入の検証を実機で試したときに超えるようなら、月 $5 の有料プランにする。

**2026-10-29 の変更**：購入の記録に列を足した。本番の DB に `server/migrations/0002_purchase_price.sql` を流してから、デプロイする（順番を逆にしない。手順は `server/README.md`「データベースの変更」）。

## C. 運営者名・連絡先・公開 URL

1. 運営者名（屋号など）と、サポート用のメールアドレスを決める（あなた）。
2. `server/src/operator.ts` の「【要設定】」を埋める。`privacyPolicy.ts` と `legalNotice.ts` の「制定日」「最終更新日」も埋める（私）。
3. `npx wrangler deploy` で、公開ページを更新する。
4. 独自ドメインを使う場合は、Cloudflare でドメインを Worker に結びつける（あなた）。
5. `app/src/data/appInfo.ts` の `SUPPORT_EMAIL`、`PRIVACY_URL`、`TERMS_URL` を埋める（私）。

## D. Apple 側の登録（あなた）

### D1. 契約・税務・口座（有料のアプリ内課金に必須）
App Store Connect → 「契約／税金／銀行口座」で、「有料App」の契約が有効で、口座と税務情報が入っていることを確認する。mobidou で課金を出しているなら、済んでいる可能性が高い。済んでいなければ、同意して入力する（これが済んでいないと、課金の商品は使えない）。

### D2. App ID
Certificates, Identifiers & Profiles → Identifiers で、Bundle ID `com.mobbycat.app` を登録し、次の機能を有効にする。
- Sign in with Apple
- In-App Purchase

### D3. Sign in with Apple の鍵
Keys で、「Sign in with Apple」を有効にした鍵を作り（mobidou の鍵とは別に、にゃこモビーの App ID に結びつけた鍵を新しく作る）、`.p8` ファイルをダウンロードする（**ダウンロードは一度だけ**）。控えるもの：Team ID、Key ID、`.p8` の中身。

### D4. サーバーのシークレット（あなた）
`server/` で、次を登録する（`.p8` の中身は、リポジトリに入れない）。

```bash
npx wrangler secret put APPLE_TEAM_ID
npx wrangler secret put APPLE_SIGN_IN_KEY_ID
npx wrangler secret put APPLE_SIGN_IN_PRIVATE_KEY
```

### D5. アプリの作成
App Store Connect → マイApp → 新規App。プラットフォーム iOS、名前「にゃっコレ」（重複していると使えないので、候補を用意しておく）、プライマリ言語 日本語、Bundle ID `com.mobbycat.app`、SKU は任意。

### D6. アプリ内課金の商品
アプリ → 収益化 → アプリ内課金 / サブスクリプションで登録する。商品 ID は、`server/wrangler.toml` の `PRODUCT_CATALOG_JSON` と**完全に一致**させる。

| 商品 | 種類 | 商品 ID（仮） | 価格 |
|---|---|---|---|
| お迎え券 1 枚 | 消耗型 | `com.mobbycat.app.ticket.1` | ¥200 |
| お迎え券 6 枚 | 消耗型 | `com.mobbycat.app.ticket.6` | ¥1,000 |
| またたびパス | 自動更新サブスク（1か月） | `com.mobbycat.app.matatabipass.monthly` | ¥1,500 |
| またたび 5 個セット | 消耗型 | `com.mobbycat.app.matatabi.5` | ¥300 |

- 価格は、App Store Connect で選べる価格帯にあるか確認する（mobidou では ¥250 が選べなかった）。
- 各商品に、表示名・説明・審査用のスクリーンショットが要る。サブスクは、サブスクリプショングループも作る。

### D7. サーバー通知（App Store Server Notifications V2）
アプリ → 一般 → App情報 → App Store Server Notifications で、本番とサンドボックスの両方に `https://<Worker の URL>/apple/notifications` を設定し、バージョン 2 を選ぶ。

### D8. サンドボックステスター
Users and Access → Sandbox → テスター で、テスト用の Apple Account を作る。TestFlight での購入検証に使う。

## E. アプリ側の接続（私）

2026-10-28 に実装（設計は `docs/account-design.md`）。型チェックと Web 表示、サーバーとの通信までは確認済み。**実機（開発ビルド・TestFlight・サンドボックス）での検証は未実施。**

1. アカウント：起動時に匿名アカウントを作る。認証の secret は `expo-secure-store`（Keychain）に保存する。
2. Apple でサインイン（`expo-apple-authentication`）：連携と、新しい端末での引き継ぎ。
3. ~~課金の前に、Apple 連携を必須にする。~~ **やめた（2026-10-29）**：Apple 連携は任意。購入は匿名のアカウントのままでき、購入のあとに任意で案内する（ガイドライン 5.1.1）。
4. 購入（`expo-iap`、StoreKit 2）：`appAccountToken` にアカウントの `userId` を付け、サーバーで検証してから付与する。購入の復元も実装する。
5. クラウドセーブ：Apple 連携後に、記録を保存・復元する。
6. アカウント削除の画面。
7. ショップの「無料付与」を削除する（テスト用の分岐）。
8. `app.json` に `ITSAppUsesNonExemptEncryption: false`、Sign in with Apple の設定を追加する。
9. App Privacy・プライバシーポリシーを、実際の通信に合わせて更新する。

`expo-iap` と `expo-apple-authentication` は、ネイティブコードを含むため、Expo Go では動かない。開発ビルドが必要になる。**ビルドは、あなたがその場で頼んだときだけ実行する。**

## F. ビルドと TestFlight

1. `eas.json` を作る（development / preview / production。`production` は build 番号の自動加算）（私）。
2. Expo のアカウントで `eas init` し、Apple の認証情報を設定する（あなた）。
3. TestFlight 向けのビルドを作って、アップロードする（**頼まれたときだけ実行**）。
4. 実機で確認する：歩数、位置情報、カメラ、20 時の通知、Apple 連携、購入（サンドボックス）、購入の復元、アカウント削除、機種変更の引き継ぎ。
5. Cloudflare の CPU 時間（B の注意）を、購入の検証で実測する。

## G. ストア素材と申請の準備

- 紹介文、キーワード、サブタイトル（日本語。多言語化は公開後）。
- スクリーンショット（iPhone 6.9 インチ、iPad を対応するなら iPad も）。`marketing/` の素材を使える。
- App Privacy の回答（`docs/app-store-privacy.md` を、にゃこモビー向けに作る）。
- 年齢区分：購入した瞬間の抽選は無い（お迎え券は確実に迎えられる。またたびは、決まっている候補をひらける数を増やすだけ）。その旨で回答し、「出会いの仕組み」の開示を、審査メモにも書く。
- 審査用メモ：歩数・位置情報・カメラ・通知の使い道、サンドボックスでの購入手順、審査用のアカウントは不要（匿名で使える）。
- プライバシーポリシー URL（`/privacy`）、サポート URL（`/support`）。

## H. 審査と公開

1. 審査に提出する。このとき `PURCHASE_ENVIRONMENTS` は `Production,Sandbox` のままにする（審査はサンドボックスで購入する）。
2. 通ったら公開する。
3. **`PURCHASE_ENVIRONMENTS` は、公開後も `Production,Sandbox` のままにする**（2026-10-29 変更）。アップデートの審査でも、審査員はサンドボックスで購入するので、外すと次の審査で購入が失敗する。サンドボックスの購入ができるのは、開発者が作ったテスターと TestFlight・審査だけで、一般の利用者はできない。サンドボックスの購入は `purchases.environment = Sandbox` で記録されるので、売上の集計から除く。

## 公開後

- 多言語化（英語、韓国語、中国語）。
- 起動時の App Store Server API による、購入状態の再照合。
- 引き継ぎコード（有効期限つき・1回限り）。
- クラッシュ・購入の監視。

### 2026-10-30 消費復旧・購入証明の再利用防止

- 本番DBはバックアップ後、`0002_purchase_price.sql`（未適用の場合）、`0003_purchase_recovery_date.sql` の順で適用し、サーバーをデプロイしてからアプリを公開します。Codexは適用・デプロイしません。
- 購入による匿名アカウント復元は、同じ購入日時または以前の証明では再実行できません。再引継ぎは新しい更新取引か、利用可能な端末でApple連携してからの引継ぎを使います。応答喪失時も証明は使用済みになるため、サポート手順を確認します。
