# 公開前再監査（Codex、2026-10-30）

## 要約

**A＝5件（前回から継続2件、新規3件）、B＝4件、C＝3件。判定：公開不可。** 未解決Aは、購入アカウントの復元時に別アカウントの鍵・クラウド記録を失う経路、購入済み残高消費後に操作記録が失われる経路、歩数・誕生日由来の記録がクラウドに残ること、未知の候補を有料で開く確率の開示・年齢質問票の判断、購入証明の再利用で匿名アカウントの鍵を繰り返し奪えること。審査上の該当性はAppleの判断であり、違反確定とはしない。

重大度：A＝公開／審査前に直すか決める、B＝公開前に直したい、C＝公開後でよい。前回と同一の指摘は前回番号で継続扱いにし、新しい番号は付けない。

対象：`codex/prelaunch-reaudit`、HEAD `2b1251422c876eb16fe2024e188d7d0e8eade102`。前回報告bc8d040以降の指定コミット差分を読み、app/serverへ`npm ci`した同一worktreeで静的検査を行った。コード・画像・依存マニフェストの編集、ビルド、デプロイ、本番データ操作、実購入、通知送信、外部サービスへの実リクエストは行っていない。

## A：公開前に解決する

### 継続 Codex A-02：クラウドに派生データが残り、端末内だけという説明を満たさない

- **場所：** `app/src/services/account/cloudSave.ts:26-33`、`app/src/core/encounter.ts:38-52`。
- **何が起きるか：** 連携アカウントでクラウド保存すると、`reasons` と `owned.firstReason` は消えるが、`days[*].candidates/freePick/extraPicks/opened` と各日付、`owned.firstDay` は残る。猫IDと日付から歩数・誕生日条件の達成や誕生日月日が推定できる。誕生日のfirstDayは年初に丸めるが、その日の候補ID等は残る。保存内容は歩数・誕生日・観測値を「端末内だけ」とする掲載文・プライバシー説明と一致しない。
- **直し方：** ID・日付を含めて派生記録を最小化するか、実際の保存範囲に同意・ポリシー・App Privacy回答を一致させる。
- **確かさ：** 実装で確認。前回Codex A-02の未解決分。

### 継続 Codex A-04：消費ジャーナルの保存・適用が確実でなく、購入残高だけ失う経路が残る

- **場所：** `app/src/core/game.tsx:546-550, 570-585, 605-645, 654-659`、`app/src/core/account.tsx:96-110, 186-199`。
- **何が起きるか：** `spendCurrency` は`pendingSpend`の`AsyncStorage.setItem`失敗を握りつぶして、そのままサーバー消費へ進む。端末保存に失敗した直後にアプリが終了すると、サーバー残高だけ引かれ、再起動時に再送する操作ID・対象猫が存在しない。さらにクラウド記録適用の`replaceState`は現在のローカル`pendingSpend`を引き継がず、消費後の回復effect実行前に空端末へクラウドを適用するとジャーナルが消える。成功応答後、対象日の記録が無い場合も`pickExtra`/`useMatatabi`は効果を適用せずfalseを返す。
- **直し方：** 永続書込み成功を確認できない限り消費APIを呼ばない。消費処理中はクラウド置換・リセット等と直列化し、同一IDの再送結果を必ず対象操作へ適用する。保存失敗・中断の障害注入試験を加える。
- **確かさ：** コードで確認。前回Codex A-04と同一の消費後復旧問題の継続。抽出実行でwallet残高ゼロの場合でも復旧effect自体は同一IDをspenderへ渡せるため、前回の「残高チェックで再送を止める」経路は修正済み。ただし上記の記録喪失は残る。

### 新規 A-03：購入復元が空でないアカウントを置き換え、既存記録へ戻れなくする

- **場所：** `app/src/services/account/purchase.ts:119-123, 145-157`、`app/src/core/account.tsx:175-199`。
- **何が起きるか：** `isEmptyAccount`はサーバーwalletが0、パスなしだけを見る。Apple連携済みか、クラウド記録・匿名ゲーム記録があるかは判定しない。例：AアカウントにApple連携・猫の記録・クラウド保存があるが、有料walletは0。端末上のStoreKit取引がBアカウントのものなら、Aでtoken mismatch後に「空」と判定し、`/auth/recover-purchase`がBの新しいsecretを返すと`adopt`してBに切り替える。AのApple連携状態はrefresh前のprofile値のままtrueとして扱われ、以後B資格情報でAのクラウド記録を読もうとして失敗する。起動・復帰時の`refresh`もsettleを自動実行し、その結果をユーザーに確認させない。
- **直し方：** 自動復元で鍵を入れ替えず、既存Apple連携・クラウド・ゲーム記録も含めアカウント切替の確認を行う。復元後はprofile/cloud状態を新資格情報で再取得し、切替前後の記録を明示して保護する。
- **確かさ：** 呼出し順・条件をコードで確認。StoreKitに異なるアカウントの取引が返る実端末条件は未試験。

### 継続 Codex A-02（確率課金の開示・質問票判断）：有料開封の「決まった順番」と実装の選び方が一致しない

- **場所：** `app/src/core/encounter.ts:38-52`、`app/src/features/deai/DeaiScreen.tsx:79-123`、`app/src/features/shop/ShopScreen.tsx:197-200`、`docs/app-store-listing.md:49,94`、`docs/app-store-privacy.md:39`、`docs/release-checklist.md:129`。
- **何が起きるか：** 7匹以上の条件成立猫を擬似乱数でシャッフルして6匹にし、候補配列の順番を保存する。UIではユーザーが未開封候補を選び、選んだIDだけを開く。購入で抽選しない点は事実だが、「ひらく順番を進めるだけ」は選択可能なUIと異なる。開くまで結果が未知の有料またたびである点も残り、年齢質問票を「購入時の抽選なし」でよいとする判断は自明ではない。
- **直し方：** 実際の選択・抽選方法と購入前説明を一致させ、Appleの質問票・審査メモ・年齢区分上の扱いを審査前に決定する。規約違反・リジェクト確定とは断定しない。
- **確かさ：** 実装・掲載文の照合で確認。Apple質問票の最終判定は要判断。前回Codex A-02と同一項目。

### 新規 A-04：過去の署名済み取引情報を再送して匿名アカウントの鍵を再取得できる

- **場所：** `server/src/worker.ts:204-223`、`server/src/store.ts:80-83`、`server/tests/server.test.mjs:469-492`。
- **何が起きるか：** `/auth/recover-purchase`は署名・bundle/product・環境・appAccountToken・DBの取引所有者・返金状態を確認する。しかしサブスクの`expiresDate`を確認せず、`original_transaction_id`で結び付く過去取引を恒久的に検索する。期限切れサブスクのApple署名JWSでも、保存された`userId`と一致すればsecretを回転して返す。古い端末などが一度取得した有効な署名データを保持していれば、鍵回転後も同じJWSを繰り返し送信でき、新端末に移したアカウントの鍵を再び取り替えられる。1分10回・1日60回のIP制限はあるが、本人性や証明の一回性にはならない。新テストは成功した回復の新secretが使えること等を確認する一方、期限切れ取引と同一JWSの再回復を試していない。
- **直し方：** 回復時に有効な購入・所有証明を定義し、期限・返金・通知欠落を含む有効性と再利用可能性を扱う。回復による旧端末の失効とデータアクセス影響を利用者へ事前表示する。
- **確かさ：** 認証分岐と欠けている期限確認をコードで確認。期限切れの合成fixtureを用いた実行テストは未実施。実際にJWSを取得・保持できる脅威主体の条件は限定的で、その範囲は推測と区別する。

## B：公開前に直したい

### B-05継続：appの本番依存監査でhigh 3・low 5

- **場所：** `app/package-lock.json`内Zod 3.25.76・deepmerge 4.3.1。
- **何が起きるか：** `npm audit --omit=dev`で8依存ノード、high 3・low 5。advisoryはZodのメモリ枯渇とdeepmergeのprototype poisoning。`npm explain`ではZodはExpo CLI系統（expo→@expo/cli→zod）に現れ、アプリの実行ソースではCLIを直接参照する箇所は見つからなかった。ただしExpoのパッケージ依存に含まれ、実配布バンドルを作っていないため、バンドルから除外されることまでは立証できない。server本番依存は0。
- **直し方：** SDK58と整合する安全な更新を選ぶか、影響しない経路を依存グラフ・最終配布物で記録する。監査結果だけで本番アプリへの脆弱性成立を断言しない。
- **確かさ：** audit・explain実行結果。配布物への収録は未検証。

### B-06継続：OSSライセンス通知が依存ごとに揃っている証拠がない

- **場所：** `app/src/data/appInfo.ts:43-48`、`app/package.json`。
- **何が起きるか：** クレジット画面はM PLUSのOFL URLと「React Native、ExpoなどMIT License等」の総称のみ。インストール後の依存は`npm ls --omit=dev --all`で492パッケージ名。実際のライセンスファイル・最終アプリの同梱結果を画面と照合できず、個別MIT著作権表示等が満たされるか不明。ライセンス違反の断定ではない。
- **直し方：** 本番依存のlicense/noticeを各配布条件に応じてまとめ、アプリ内または配布物へ含める。フォントOFL全文も配布で参照可能にする。
- **確かさ：** 依存数と画面記述を確認。配布物未作成のため同梱状況は未確認。

### B-08継続：クライアント回帰テストと既存DB移行・D1競合の自動検証が不足

- **場所：** `app/package.json`、`server/tests/server.test.mjs`、`server/migrations/0002_purchase_price.sql`。
- **何が起きるか：** appに自動test scriptがなく、serverは23件成功するが、pendingSpend保存失敗・クラウド置換との競合・購入回復期限判定等の統合回帰ケースがない。インメモリSQLite testsは本番D1競合・既存DB migrationを保証しない。
- **直し方：** 失敗注入・復旧・アカウント切替と旧schema移行のテストを追加し、非本番D1で競合動作を確認。
- **確かさ：** manifest・テスト内容・実行結果を確認。

### 継続 B-04：未完了購入の片側取得に失敗すると、一部の取引を黙って見落とす

- **場所：** `app/src/services/account/appStore.ts:73-88`。
- **何が起きるか：** `getPendingTransactionsIOS()`が失敗しても`getAvailablePurchases()`が1件以上返れば、失敗フラグを反映せず取得できた配列だけを返す。たとえば有効なパスと未完了のお迎え券があるとき、前者だけ復元されて後者は今回のsettleで見落とされる。空配列のときにstore_errorへ分ける修正は入ったが、片側成功時の不完全結果はUIに出ない。
- **直し方：** 一部取得不能を戻り値に含め、完全な復元と区別して再試行できるようにする。
- **確かさ：** コード確認。StoreKit実機再現は未実施。

## C：公開後でよい

### C-01継続：旧名・旧説明が文書に残る

- **場所：** `docs/account-design.md`、`docs/release-checklist.md`、`server/README.md`等（前回Codex C-01参照）。
- **何が起きるか：** 実装後の購入復元・通信動作と古い設計文書の記述が一致しない箇所がある。公開ユーザーへ直接表示する主要フローの誤りとは分けて扱う。
- **直し方：** 運用手順・設計文書を現行実装へ更新。
- **確かさ：** 前回確認。今回全ドキュメント差分を再調査した結果、公開ゲートに影響する更新漏れは新規発見なし。

### C-02継続：カメラズームのVoiceOver操作

- **場所：** `app/src/features/camera/CameraScreen.tsx`（前回Codex C-02参照）。
- **何が起きるか：** 値の読み上げ・増減accessibility actionの実機確認が必要。
- **直し方：** VoiceOver操作と値読み上げを追加して実機確認。
- **確かさ：** 前回のコード確認。実機未確認。

### C-03継続：ローカル出会い履歴に上限がない

- **場所：** `app/src/core/game.tsx`（前回Codex C-03参照）。
- **何が起きるか：** ローカル`days`は日次生成で増え続ける。長期性能への影響は未計測。
- **直し方：** 猫の所持記録を保ちながら履歴保持上限を決める。
- **確かさ：** 前回コード確認。長期影響は推測。

## 前回の指摘の再確認

| 項目 | 判定 | 足りない点 |
|---|---|---|
| Codex A-01 匿名購入パス復元 | **修正を確認** | 新しい購入署名による匿名アカウント回復経路、StoreKit settle、UI案内、テストを確認。期限切れ取引の再利用・既存アカウント置換は新規A-04/A-03として残る。 |
| Codex A-02 クラウド派生情報 | **未修正** | 理由文・誕生日月日を一部除去したが、候補ID・日付等が残る。継続A-02。 |
| Codex A-04 消費後復旧 | **一部修正** | 事前にpendingSpendを書く。同一requestIdの再送も行う。しかし保存失敗を無視、クラウド置換はpendingSpendを落とし、対象日消失時は付与されない。継続A-04。 |
| Codex A-02 確率開示 | **未解決** | 購入時抽選なしは正しいが、候補順に関する説明はUIと不一致。質問票判断を要する。 |
| B-01 パス失効日の枠 | **修正を確認** | inactive/expired時にdaysの未使用passBonusを除き、開いた分だけ残す。無限更新はコード上なし。復元競合は端末試験なし。 |
| B-02 Reduce Motion | **修正を確認** | RevealOverlay/WelcomeFxで設定を読み、終了時cleanupあり。設定の動的切替・実機動作は未確認。 |
| B-03 確認ポップ長文 | **修正を確認** | メッセージにScrollView、ボタンを別領域に配置。Web表示を完了できず実寸・文字拡大は未確認。 |
| B-04 未完了購入読取失敗 | **一部修正** | 全件失敗かつavailable空はstore_errorになるが、pending取得失敗かつavailableが非空なら一部結果を黙って返す。継続B-04参照。 |
| B-05 npm audit | **継続** | B-05参照。配布バンドルへの収録は未確定。 |
| B-06 OSS通知 | **継続** | B-06参照。配布物での同梱要確認。 |
| B-07 削除後返金ID保持 | **修正を確認** | privacyPolicyに取引識別子・時刻の保持説明が追加された。運用上の保持期間は別途決定。 |
| B-08 テスト不足 | **継続** | B-08参照。 |
| 新設：初回出会い20時待機 | **コード上の通常経路は整合** | 初回20時前のencounterDayは前日、20時で今日へ移り候補生成effectが走る。`loginDays[0]`は時刻の証明ではなく400日上限後や記録移行・時計変更の境界でinstallDayとの比較が不安定。通知は相棒決定時に毎日20時の文面を追加。きのう表示・通知実時刻・20時切替を実機未確認。チュートリアルの「毎日20時」は翌日以降の出会いについておおむね一致するが、初回待機の案内はチュートリアルにない。 |
| 新演出・まとめ開封 | **静的確認のみ** | 2段6匹レイアウト、写真対象DiscoveryCardはWelcomeFx内でAnimated scaleに包まれるが、card refは内側Viewで、CaptureRefの実挙動確認が必要。演出のskip/cleanupと音・触覚が二重になる経路はコード上見つからず、Web・実機未確認。 |

## 実行したコマンドと結果

| コマンド・確認 | 結果 |
|---|---|
| 指定worktree作成 | `D:\mobby-cat\.worktrees\prelaunch-reaudit`に作成、branch `codex/prelaunch-reaudit`。 |
| `npm ci --no-audit --no-fund`（app/server） | 両方成功。lockfile変更なし。 |
| `npx --no-install tsc --noEmit`（app/server） | 両方成功。 |
| `npm test`（server） | **23/23成功**、失敗・skip 0。合成Apple署名・SQLite試験で、本番Apple/D1ではない。 |
| `npx --no-install eslint . --format json`（app） | **152 errors / 7 warnings**。errors: `react-hooks/refs` 141、`set-state-in-effect` 9、`immutability` 1、`purity` 1。warnings: `exhaustive-deps` 1、ruleIdなし2、`no-require-imports` 4。 |
| 同 lintの従前16件をbc8d040で個別確認 | purity 8（RevealOverlay内の乱数7、Homeのイベントhandler内乱数1）、set-state-in-effect 7（条件付きログイン記録、pass終了・pass枠整理、スターター補充、日付変更時の選択リセット、Reduce Motion完了状態、onboarding選択補正、tutorial target更新）、immutability 1（callbackをrefに登録する`syncRef.current`）。読み取った範囲で無限更新・描画中乱数・ゲーム状態破壊は確認せず。現HEADの同ルール11件も列挙して確認し、同様に有限条件またはevent handler/ref登録で、単独で不具合とは判定しない。 |
| `npx --yes expo-doctor`（app） | **20/20成功**。 |
| `npm audit --omit=dev --json`（app/server） | app high3/low5（B-05）、server 0。 |
| `npm explain zod @expo/cli` | Zod 3.25.76はExpo CLI経由。bundle作成なしのため配布物混入は未確定。 |
| `npm ls --omit=dev --all`相当の依存列挙 | appのunique package名492。アプリ内クレジットは個別OSS noticeを列挙しない（B-06）。 |
| Web `npm --prefix app run web`、375×812/375×667 DOM・screenshot操作 | Webサーバーは起動を試みたが、sandbox/localhost接続が拒否・timeoutし、アプリDOMに到達しなかった。画面フロー実施済みとは扱わない。 |
| `git diff bc8d040..HEAD` | 指定された4コミットの全差分を読み、重点コードと報告・掲載文を照合。 |

## 実機・TestFlightでないと確かめられないこと

- StoreKitで匿名購入→別端末復元、未完了取引、期限切れ・返金済み・Sandbox/Productionの挙動。鍵回転後に旧端末がどう見えるか。
- 375×667/812、Dynamic Type、VoiceOver、Reduce Motion、長い確認ポップ、6匹演出・撮影共有・アニメーション中キャプチャ。
- 20時またぎ、通知許可・予約・旅行/DST、端末時刻変更、日付送り、昨日タブ、初回の待機説明。
- Health歩数・位置・天候・写真・通知の権限を拒否／再許可した実機挙動。
- TestFlight購入・更新・失効・返金と本物のApple署名。本番データ・Cloudflare migration/limits/cronsは未操作。
- 最終iOS成果物のPrivacy Manifest統合、OSSライセンスnotice同梱。今回ビルドしていないため未検証。

## 公開までに残る作業

1. A-03/A-04のアカウント復元と消費復旧を解決し、競合・保存失敗を含むテストを追加する。
2. 派生データのクラウド保存を修正するか、説明・同意・App Privacy回答を実態に合わせる。
3. 未知アイテム有料開封の抽選・候補選定表示と年齢区分をApple提出前に確定し、ショップ・掲載文・審査メモを揃える。
4. audit advisoryの影響根拠と全本番依存のlicense/noticeを整理する。
5. Webの指定画面サイズ、Apple Sandbox/TestFlight、実機アクセシビリティ、写真、通知を検証する。
6. リリースチェックリストどおりにサポート/プライバシーURL、App Store審査情報・スクリーンショット・年齢質問票を最終確認する。本監査ではビルド・デプロイ・本番DB操作を実施していない。
