# にゃっコレ 公開前監査（Codex、2026-10-30）

## 要約

**A＝4件（新規2件、前回項目の未解決2件）、B＝8件、C＝3件。公開可とは判定しない。** 審査・利用者への影響を優先すると、①匿名購入した有効なサブスクを新端末で復元できない、②「端末内のみ」と説明した歩数・誕生日の情報が派生データとしてクラウドへ出る、③有料アイテムの消費後中断で、最後の1個の効果を復旧できない、の3件が重大。

Aには「修正」だけでなく「審査前に仕様・説明を決める」項目を含む。確率課金の該当性は審査上のリスク判断であり、リジェクト確定とは主張しない。前回と同じ問題には新しい指摘番号を付けず、前回番号で参照する。上記件数は継続項目も含めた未解決件数。

対象：`codex/prelaunch-audit`、開始時 HEAD `02144eb16a38be6eba2c0707e1a56693ad065bad`。作業場所は `D:/mobby-cat/.worktrees/prelaunch-audit` のみ。依頼書、前回2報、公開手順・掲載文・App Privacy・アカウント設計、`app/AGENTS.md` を参照。コード・画像・依存ファイルの変更、依存導入、ビルド、デプロイ、本番DB操作、実購入・通知送信・アプリから外部APIへの実リクエストは行っていない。ネットワーク利用は監査資料（Apple公式）とnpmの脆弱性照会、指定のGit pushに限る。

**検証上の限界：** このworktreeにはapp/serverの `node_modules` がない。サーバーの22テストはNodeの型除去とインメモリSQLiteで実行でき、全成功。app/server型チェック、lint、expo-doctor、Web操作は実施を試みたが実行環境不足で完遂できない。各ネイティブモジュールのPrivacy Manifestも確認できていない。「徹底監査の依頼範囲すべての検証が完了した」という意味ではない。未検証を「異常なし」に含めない。

## A：ビルド・審査の前に直す／決める

### 新規 A-01：Apple未連携で購入した有効なパスを、新端末で復元できない

- **場所：** `app/src/services/account/purchase.ts:122`（settle）、`app/src/services/account/serverClient.ts:69`（authedIfAny）、`server/src/worker.ts:313`（appAccountToken照合）、`app/src/features/shop/ShopScreen.tsx:134`（復元案内）、`server/src/worker.ts:193`（Apple連携済みアカウントだけ検索）。
- **何が起きるか：** 端末AでApple連携せずパス購入→Keychainが共有されない端末Bへ移動→同じApp StoreのApple Accountで「購入を復元」。StoreKitが有効な取引を返しても、Bにアプリの鍵がなければ `authedIfAny` はnullで復元不能。Bで別の匿名アカウントを作ってから試すと、取引のappAccountTokenがAのuserIdなので403。案内された「Appleで引き継ぐ」も、Aで連携していなければ404となる。消耗型をStoreKitから復元できない話とは別に、復元対象の**継続中サブスク**にも起きる。
- **直し方：** StoreKitの正当な所有証明に基づくサブスクの復元・元アカウントの回復経路を設計する。appAccountTokenの照合を無条件で外すのは不可。元端末が無くても回復できることを、匿名購入から通して確かめる。
- **確かさ：** コードで経路を確認。実StoreKitの取引取得は未検証。審査リスクはApple 3.1.1の復元要件からの評価。

### 継続 A：前回 Codex A-02 と同じ（情報の送信停止が不完全）

- **場所：** `app/src/services/account/cloudSave.ts:23`、`app/src/core/conditions.ts:94`・`:133`・`:165`、`app/src/core/game.tsx:250`・`:439`、`server/src/privacyPolicy.ts:21`、`docs/app-store-privacy.md:19`。
- **再確認結果：** birthday/totalSteps/obsの元フィールドを除く修正は確認した。しかし `days[*].reasons`、`owned[*].firstDay/firstReason`、`inbox[*].text/day` をそのまま送る。「1日10,000歩」「バッテリー22%と2,222歩」「誕生日」が日付付きで残る。誕生日の月日も `tanjoubi` の出会い日から読み取れる。猫IDだけでも条件が特定できるため、理由文字列だけ消せば十分とは限らない。
- **何が起きるか：** Apple連携後、歩数条件・誕生日条件の猫がいる記録をクラウド保存すると、端末内だけという説明と異なる情報がアカウント付きで保存される。実際の `toRecord` 本体を抽出し、入力例を実行して、元フィールドを除外しても上記文字列と日付が出力に残ることを確認した。
- **直し方：** 派生情報まで含めた最小化か、実際の保存内容に合った同意・ポリシー・App Privacy回答を決定する。歩数由来の記録を「健康・フィットネスは収集しない」のまま出せるかも見直す。
- **確かさ：** コード＋関数の抽出実行で確認。Apple質問票での最終分類は要判断。前回の元データ送信の指摘を別件として再掲したものではなく、対応不足の追跡。

### 継続 A：前回 Codex A-04 と同じ（消費後中断の復旧が不完全）

- **場所：** `app/src/core/game.tsx:487`・`:504`・`:512`・`:543`・`:548`、`app/src/core/account.tsx:186`、`server/src/store.ts:109`。
- **再確認結果：** 操作IDを決定的にする修正とサーバーの重複検出は確認。しかし**再送前の残高チェック**が重複処理への到達を止める。
- **何が起きるか：** 無料券0・有料券1で追加お迎え→サーバー消費成功→猫の追加が永続化される前に強制終了→起動時walletは0、ローカルに猫は未追加。同じ操作でも `ticketsOf < 1` で終了し、同じrequestIdを再送しない。またたび最後の1個も同様。サーバー応答だけが失われ、その後残高更新が入った場合も該当する。サーバーに残高が残っている場合の同一ID再送だけでは解決しない。
- **直し方：** 消費前に操作内容・IDを永続化し、起動時に未完了操作を残高の事前判定より先に照会／再送して効果を確定する。券の対象リスト・またたびで開く猫も回復対象に含める。
- **確かさ：** コード＋ `spendCurrency` 本体の抽出実行。残高0の回復入力では結果null、spender呼び出し0回。React/強制終了の端末試験は未実施。

### 新規 A-02：有料の「中身が見えない候補をひらく」と確率課金なしの申告の整合を決める

- **場所：** `app/src/core/encounter.ts:38`、`app/src/features/deai/DeaiScreen.tsx:25`・`:124`、`app/src/features/shop/ShopScreen.tsx:226`、`docs/app-store-listing.md:48`、`docs/app-store-privacy.md:49`。
- **何が起きるか：** 条件成立猫をシャッフルし最大6匹に絞り、全候補を共通シルエットにして、無料枠後は有料またたびで未知の1匹を開く。ショップの「出会いの仕組み」は条件だけを説明し、シャッフルと選定・開封の確率を説明しない。一方、掲載文・審査メモ・年齢質問票は「確率で結果が決まる課金はありません」と断言。抽選が購入前に確定していても、購入者から未知の結果を有料で開く構造は残る。
- **直し方：** 有料開封をApple 3.1.1のランダムな仮想アイテム提供に該当するか評価し、必要なら購入前の確率・候補選定条件を開示、掲載文と年齢回答も揃える。回避する仕様を選ぶなら、支出前に対象を識別できる形などを検討する。猫ごとの「条件」と「確率」は分ける。
- **確かさ：** 挙動はコードで確認。規約への該当性と審査結果は**推測／要判断**。本項目は審査前の意思決定事項であり、法令違反の断定ではない。

## B：公開前に直したい

### B-01：前回 Codex B-01 と同じ（既存日のパス枠が期限後も残る）

- **場所：** `app/src/core/game.tsx:182`・`:381`・`:615`。
- **何が起きるか：** 加入中に候補6匹・未開封で記録を作り、当日中にパスが失効／返金。activeはfalseになるが、既存日の `passBonus:3` は削られず `openLimit` は6のまま。新規日の生成で期限を調べる修正だけでは既存日を止めない。クラウドのdaysにもpassBonusが残る。
- **直し方：** 既に開いた猫・支出済みの枠を保護しつつ、期限後に未使用のパス枠を使えるか仕様を決めて判定に反映。返金・クラウド復元にも適用。
- **確かさ：** コード確認。日単位で権利を固定する意図なら、その仕様・説明を決める必要がある。

### B-02：前回 Codex C-03 の新演出への適用漏れ

- **場所：** `app/src/features/deai/RevealOverlay.tsx:81`・`:115`、`app/src/ui/base.tsx:46`。
- **何が起きるか：** Reduce Motion対応はBobbingとopeningにはあるが、新しい開封演出は `useReduceMotion` を使わない。OS設定がオンでも回転・震え・飛散・拡大がすべて動き続ける。Modalはvisibleがfalseでも直前のRevealを子として保持するため、閉じた後のマウント／描画コストも実機確認が必要。
- **直し方：** 新演出も設定に追従し、静止した結果表示にする。非表示時の演出停止・アンマウントも確認。
- **確かさ：** 設定無視はコード確認。非表示ModalのCPU負荷はプラットフォーム依存で未計測。

### B-03：サブスク確認の長文が固定高の非スクロール領域に入る

- **場所：** `app/src/ui/ConfirmPopup.tsx:36`・`:60`、`app/src/ui/Popup.tsx:16`・`:25`、`app/src/features/shop/ShopScreen.tsx:202`。
- **何が起きるか：** 画像なし確認は画面高の40%。375×667では約267pt。その内側に上下36ptの余白、見出し、数百字の自動更新説明、48ptボタンを配置し、外側はoverflow:hidden。文字拡大時を含め、文面や加入ボタンが切れる危険が高い。前回A6のホーム修正とは別の箇所。
- **直し方：** 説明をスクロール可能にし、操作ボタンを見える範囲に確保。375×667/812と文字拡大で確認する。
- **確かさ：** レイアウト値からの**推測**。今回Webを起動できず、切れ方・実タップは未確認。

### B-04：未完了購入の読み取り失敗を空配列へ変換する

- **場所：** `app/src/services/account/appStore.ts:79`、`app/src/services/account/purchase.ts:122`。
- **何が起きるか：** `getPendingTransactionsIOS` だけが失敗し `getAvailablePurchases` は空で成功すると、unfinishedは[]を返し、復元UIは「購入なし」。未完了消耗型が残っていても、取得失敗と区別できない。前回A-05のAPI追加は入っているが、前回B-15の失敗区別をこの経路では満たさない。
- **直し方：** 片側失敗を結果に残し、再試行または一部確認不能と伝える。
- **確かさ：** コード確認。

### B-05：依存の脆弱性照会でhigh 3・low 5

- **場所：** `app/package-lock.json:4178`・`:10868`、`app/package.json:10`。
- **何が起きるか：** `npm audit --omit=dev --json` は8依存ノード（high 3、low 5）を報告。根本のadvisoryはdeepmergeのprototype poisoningとZodのメモリ枯渇で、Expo/CLI等への伝播も件数に含む。8種類の独立した攻撃ではない。lock上Zodは3.25.76、deepmergeは4.3.1。
- **直し方：** advisoryの該当コード・利用経路を検証し、SDK58と整合する更新または適用外の記録を作る。npmが提示したExpo51へのダウングレードをそのまま実行しない。
- **確かさ：** npm照会で確認。主にCLI/設定処理の経路で、配布iOSアプリの遠隔攻撃成立までは確認していない。

### B-06：OSSライセンスの配布物への同梱を確認できない

- **場所：** `app/src/data/appInfo.ts:47`、`app/LICENSE:1`、`app/package.json:6`。
- **何が起きるか：** クレジットはフォントの著作権とOFLへのURL、その他は「MIT License等」の総称のみ。追跡済みappファイルにはExpoのMIT本文しか見当たらず、各ライブラリ・フォントの必要なnotice/全文が最終配布に含まれるか証拠がない。
- **直し方：** 導入した実依存とフォントから通知を収集し、ライセンス要件ごとに配布物へ含める。既にネイティブ側が自動同梱するものは成果物で確認する。
- **確かさ：** リポジトリの記述不足は確認。実依存・配布物が無いため、ライセンス違反成立までは断定しない。

### B-07：アカウント削除後も返金取引IDが残る説明がない

- **場所：** `server/schema.sql:66`（revoked_transactions）、`server/src/store.ts:35`・`:169`、`server/src/privacyPolicy.ts:63`。
- **何が起きるか：** 返金後アカウント削除するとユーザー参照テーブルはCASCADEで消えるが、user_idを持たない `revoked_transactions` の取引ID・返金時刻は残り続ける。ポリシーは「購入の記録をすべて削除」とし、例外は復旧用保管30日のみ。これは運用DBに残る別の記録。
- **直し方：** 再付与防止のため残す最小記録・保持期間・削除との関係を決定し説明する。単純削除して返金済み取引を再付与可能にしない。
- **確かさ：** スキーマ・削除コード確認。個人情報該当性や必要保持期間の法的結論は出していない。

### B-08：重要なクライアント処理と移行の回帰検証がない

- **場所：** `app/package.json:45`、`server/tests/server.test.mjs:37`・`:157`、`server/migrations/0002_purchase_price.sql:3`。
- **何が起きるか：** appにtestスクリプトがなく、22件のserverテストにも開封・保存・クラウド変換・消費復旧の統合ケースがない。SQLite模擬D1は直列のbatchで、新規schemaから作るだけなので本番D1同時処理と既存DB移行は保証しない。今回のAの不具合を検出できていない。
- **直し方：** 最後の有料1個の消費中断、3/6匹の一括開封、保存前終了、無料→有料の混在、クラウド衝突とアカウント切替、失効、旧DB→移行のケースを追加。D1競合は非本番で確認する。
- **確かさ：** スクリプト・テスト内容確認。今回テストファイルは追加していない。

## C：公開後でよい

### C-01：旧名・旧仕様の説明が文書と共有ファイル名に残る

- **場所：** `app/src/services/share.ts:84`、`app/src/services/weather.ts:66`、`docs/account-design.md:5`・`:25`、`docs/release-checklist.md:123`、`server/README.md` の購入前Apple連携・未実装一覧。
- **何が起きるか：** 共有画像のファイル名はnekomobby、天気User-Agentも旧名。アカウント設計は「起動時に通信しない」とする一方/time通信があり、「購入前にApple連携」の古い流れも残る。READMEには実装済み機能が未実装と書かれる。これは新アプリ名の表示不良と、手順書の更新漏れを分けて扱う。
- **直し方：** 表示用名称・ファイル名・仕様説明を更新。slug、bundleId、Worker URL、保存キーは互換性・登録に関わるので機械置換しない。「にゃこモビー」はprovenanceに猫の呼び名として維持する決定があり、キャラクター名の用例は取り残しに数えない。
- **確かさ：** コード・文書確認。

### C-02：VoiceOverのカメラズーム操作が不足

- **場所：** `app/src/features/camera/CameraScreen.tsx:259`。
- **何が起きるか：** adjustableロールと「ズーム」の名はあるが、値・increment/decrementのaccessibilityActionsとハンドラーがない。操作はPanResponderのみ。
- **直し方：** 読み上げ値と増減アクションを実装し、VoiceOverで確認。
- **確かさ：** コード確認、読み上げ実機未確認。

### C-03：ローカルの出会い履歴が無制限に増える

- **場所：** `app/src/core/game.tsx:436`、`app/src/services/account/cloudSave.ts:18`。
- **何が起きるか：** クラウド送信は180日（大きい場合60日）に絞るが、ローカルdaysには日次追加し続ける。状態変更ごとの全体JSON保存とクラウド用の再シリアライズも増える。短期での障害は確認していない。
- **直し方：** 所持猫など長期成果を維持し、ローカル履歴の保持上限または分割保存を決める。
- **確かさ：** コード確認。長期性能への程度は推測。

## 10観点の確認範囲と判定

| 観点 | 見た範囲・結果 |
|---|---|
| 1 審査 | Shopの購入・復元・EULA/Privacy、設定の削除、world非表示、チュートリアル、掲載文を照合。A-01/A-02、B-03/B-04。1.2は公開UGC/チャットがなく、写真はOS共有。4.2は収集・撮影・継続日課があり、コードから最低機能不足を断定しない。2.1/2.3/3.1.1/3.1.2/4.0/5.1.1/5.1.2/5.1.3/5.1.5を確認。 |
| 2 プライバシー・法務 | 下表のデータ経路を照合。前回A-02継続、B-07。legalの価格・支払・自動更新・解約・返金・未成年上限は記載あり。屋号Mobby、所在地等請求開示方式は、実際に遅滞なく開示できる運用と販売主体を本人が確定する必要がある。法的適法性の保証はしない。ネイティブPrivacy Manifestは未確認。 |
| 3 サーバー安全 | worker/store/crypto/schema/migration、認証、body上限、署名鎖、bundle、環境、token、付与/返金、レート制限、CORS、HTMLエスケープを確認。22テスト成功。他人のuserIdを本文で選んで残高やsaveに触れる経路は見つからない。署名はStoreKit OIDと3枚の鎖を検証。証明書のOCSP/CRL照会は無く、実Apple署名・失効運用は未検証。CORS * はCookie認証でなくBearer必須なので、それだけで認可不備とはしない。エラー応答は汎用、ログはerror.message。 |
| 4 正しさ・耐障害性 | game/saveShape/dates/encounter/account/credentials/client/cloudSave/purchaseを追跡。前回A-04/B-01継続、B-08、C-03。セーブ破損退避・CAS版管理・無料優先・spendingロックはある。saveShapeは型中心で、候補重複/日付範囲/開封と候補の整合まで保証するものではない。 |
| 5 安定性・性能 | require参照、PNGヘッダー、起動、共有、通信期限、演出解除、タイマー・購読を確認。UI require 166件は全パス存在。app/assets 455ファイル・58,855,524 bytes、PNG169枚。全PNGをRGBA展開した単純合計約164.9MiBは常駐実測ではない。最大背景は1179×2556。開封はnative driver、seq/loop/timerのcleanupあり。6匹時のFPS・ピークメモリは未測定。 |
| 6 アクセシビリティ・表示 | T/Tap/ImgButton/Popup/Header、Home/Deai/Reveal/Cameraを静的確認。TはallowFontScalingをfalseにしないが、固定高・numberOfLinesで拡大対応は保証されない。B-02/B-03、C-02。閉じる36/40ptや購入40ptなど44pt未満の見た目があり、実hitSlopを含む操作領域とコントラストは実機確認が残る。portrait/light固定、SafeArea利用は確認。375×667/812の実操作は未実施。 |
| 7 設定・依存 | app.json/eas.json/両package・lock/wrangler/git追跡ファイルを確認。bundleIdはサーバーと一致、supportsTablet false、expo-assetあり。開発入口は__DEV__。公開サーバーURLはEXPO_PUBLIC_SERVER_URLで本番でも上書きできるので、配布プロファイルの値を提出前確認。秘密鍵の追跡ファイルなし。秘密パターン一致はテスト内の生成鍵とパースコードで、実秘密の混入は発見せず。全Git履歴・外部EAS設定は未監査。B-05。 |
| 8 素材・権利 | provenance（home更新・logo・reveal）、app/assets一覧、クレジット、app/LICENSE、音源生成toolsを確認。アイコンを目視し1024×1024・PNGヘッダーにalphaチャンネルなし、文字・他社ロゴは見当たらない。猫種名は名称であり、商標・各生成物の第三者権利非侵害を保証しない。B-06。ストア提出用の最終スクリーンショット一式は未確認。 |
| 9 文言 | 商品内容・開封3/6匹・通知・旧名・チュートリアル・掲載文・READMEを照合。猫名とアプリ名を区別。C-01とA-02。新しい一括選択に対しtutorialの「タップしてひらく」は実操作の確認ボタンの説明が足りない。個別端末での改行は未確認。 |
| 10 テスト・手順 | server22件、リリース手順、migration、実機チェックを確認。既存DBは0002を先に流してからdeployする明記がある。適用済み証拠はなくREADME表は未のまま。新DBはschemaに列があるので0002重ね適用不可。B-08。本人のApp Store商品/価格/秘密設定・実機チェック完了記録が必要。 |

### 実際の送信情報との逐項照合

| 情報 | 実装経路／送信先 | ポリシー・App Privacy・許可文との照合 |
|---|---|---|
| 歩数 | signals.tsのPedometer→conditions/recipes、元値はローカル。派生理由・猫ID・日付がcloudSave→Cloudflare | NSMotion文あり。元値除外は一致、派生情報の送信は前回A-02継続 |
| 電池・充電・起動時間 | Battery→obs（非送信）、条件理由・出会い・ログイン記録はクラウドへ | 「端末情報を含めない」という説明を派生情報まで照合する必要あり |
| 誕生日 | birthday自体は除外、tanjoubiの猫・日付・理由は保存 | 元データ非送信だけでは誕生日を隠せない（前回A-02） |
| 位置 | weather.ts、小数1桁→MET Norway、IPも接続先へ | locationWhenInUsePermissionに送信目的あり、公開文にMETとIP記載あり。恒久端末保存なし。成功時のみメモリcacheなので、失敗・再起動で1日複数リクエストし得る。「1日1回」は厳密な上限ではない |
| カメラ・写真 | CameraView/takePictureAsync、view-shot、saveView/OS共有 | ポリシーに保存・共有時のみ渡す説明、Camera/Photos/Add許可文あり。運営サーバーへ画像uploadする実装は見つからない |
| 通知 | expo-notificationsのローカルDAILY 20時 | タイトルはにゃっコレ。push token取得・運営への送信なし |
| アカウント | ランダムUUID/secret、Apple sub/認可コード、SecureStore | 氏名・メールの要求なし。ユーザID分類と認可情報の説明あり。秘密鍵はサーバーsecret設定前提 |
| クラウド | Apple連携時だけゲーム記録・版→/save | ユーザコンテンツ申告あり。ただし派生健康情報の扱いは未解決 |
| 購入 | signed transaction、商品・取引・時刻・price/currency・appAccountToken→Apple/Cloudflare | 購入履歴・ユーザIDと一致。申告用途はApp機能。取引の保持・削除例外はB-07 |
| 年齢区分 | 自己申告→/profile/age-group | その他データの申告あり。月額上限はclient購入前検査で、サーバーは検証後の付与を止めない。自動更新は停止できず、新アカウントでも上限が別枠となる。絶対的な課金抑止とは説明しない |
| IP・時刻照会 | /timeはDB保存しない。登録/Apple認証のIPキーはDB rate_limits、他はedge制限 | 収集対象の最終分類が文書で「要判断」のまま。hourly purgeは500×20行/回の上限があり、高負荷時は最長73時間の説明を超え得る。運用監視と申告画面での判断が残る |

## 前回の対応済み項目の再確認

参照元は `docs/audit/claude-2026-10-29.md` の対応表。Codex旧報告本文はこのbranchにないため、下記は対応表の主張を現コードで照合した結果であり、旧番号の内容を推測で増やしていない。

| 前回項目 | 確認結果・根拠 |
|---|---|
| Claude A1 / Codex A-01 | Shop末尾にEULA/Privacyリンク、EULA定数も確認。実URLタップ未確認 |
| A2 / A-03 | WORLD_ON=false、ナビ・Home・Zukan・tutorialで非表示分岐。WORLD_STATS_URLも空 |
| A3 | buyOnceにApple連携必須なし、購入後の任意案内あり。新規A-01の復元問題は別途残る |
| A4 / B-17 | expo-assetとexpo-dev-clientがpackage/pluginに存在。依存導入状態・doctorは未確認 |
| A5 | supportsTablet=false |
| A6 | Homeは部屋をflexにし下部paddingにtab padを使用。修正は確認、SE実表示未確認 |
| B1 / C4 | Onboarding最後に通知許可、gameにensureDailyNotificationあり。OS予約未確認 |
| B2 / B-14 | wrangler/checklist/READMEでProduction,Sandbox維持 |
| B3 | Expo58.0.21/RN0.88.1等へ更新。今回doctorで整合判定は取れていない |
| B4 / C-01 | 現在UI require166件、参照欠落なし。削除61枚の歴史的差分や未使用全件の再算出はしていない |
| B5 | 位置許可文に外部天気サービスへの粗位置送信を記載 |
| C1 | 20時後はいまに近い予報を使うコメントとMath.maxあり |
| C3 | Deai案内を6匹までに修正 |
| Codex A-02 | 元データは除外、派生理由等が残る。継続A参照 |
| A-04 | 決定的spendIdあり、残高0の復旧不可。継続A参照 |
| A-05 | pending APIを追加。取得失敗を隠すB-04が残る |
| A-07 | 匿名もdeleteAccount→/account/delete。Apple連携済みのみrevoke必須。serverテスト成功 |
| B-04 | 設定の全消去とdeleteAccountで通知cancelあり |
| B-07 | 位置各処理・fetchに8秒タイムアウト、lastKnown maxAge12時間。各段階別の制限で合計8秒ではない。fetch本文res.jsonにはこの期限がない |
| B-08 | datesはローカル暦を使用。DSTは端末実測なし |
| B-11 | SettingsのAppState復帰で歩数・位置・通知許可を再取得 |
| B-15 | settle/UIはoffline/store_error/failed/noneを区別。ただしpending失敗はB-04 |
| B-16 | SwitchにaccessibilityLabel/checkedあり |
| C-02 | 設定のアプリ名修正、Sandbox保持も確認。残り文書はC-01 |
| C-04 | Cameraの撮影中refで連打防止、失敗案内あり。撮影は未実施 |
| A-06 | 商品説明は最大3/6、候補不足を埋めない。空候補の案内あり |
| B-01 | until・定期更新・新規生成時失効判定あり。既存日のpassBonusが残る（今回B-01） |
| B-02 | checkSaved追加・破損退避・クラウドrepaired拒否・未知猫画像ガードあり。関係整合までは未保証 |
| B-03 | 保存失敗通知と30秒再試行、起動ごとのbackup読取あり。並行保存の順序・強制終了は未試験 |
| B-05 | cloud状態・時刻・再試行UIとok_unsavedあり |
| B-06 | uploadWaitMsに従う再予約、失敗時2分retryあり |
| B-09 | 歩数は前日20時〜当日20時、観測も出会い日単位。遅れた日には現在値を足さない分岐あり |
| B-10 | 設定に次20時／誕生日前登録の案内。再生成なしの仕様維持 |
| B-12 | priceYen/purchaseDate列・Tokyo月・自己申告を下げる制約・client buyingロックあり。更新購入を強制停止する仕組みではない |
| B-13 | edge120/600、account別limit、hourly purgeあり。実Cloudflare binding/cron運用は未検証 |
| C-03 | 既存アニメーションとErrorBoundaryに対応。新RevealOverlayは対応漏れ（B-02） |
| C2 | /time照会・clockSkew使用あり。初回候補生成と時刻補正は並行なので、補正前の生成を防ぐ保証はない。圏外の時計変更は防げない |

## 実行したコマンドと結果

| コマンド／検査 | 結果 |
|---|---|
| 指定 `git worktree add ... codex/prelaunch-audit` | 成功。最初はGit管理領域の権限で失敗し、昇格して作成 |
| `npm --prefix app run` | 成功。typecheck/testスクリプトなし、web/lint等あり |
| app `npx --no-install tsc --noEmit` | 失敗。ローカルtscなし、npm lookupがENOTFOUND。型エラーを検出した結果ではない |
| app `npx --no-install eslint .` | 失敗。ローカルeslintなし、ENOTFOUND。ルール別件数は**算出不能（0件ではない）** |
| app `npx --no-install expo-doctor` | 失敗。未導入、ENOTFOUND。依存整合を正常とは判定しない |
| app `npm audit --omit=dev --json` | 最初はENOTFOUND、読み取りネットワーク許可後の再実行でhigh3/low5、計8依存ノード。B-05 |
| server `npm audit --omit=dev --json` | exit0、脆弱性0。本番依存がほぼ無いためで、devDependenciesのwrangler等の無脆弱性を意味しない |
| `npm --prefix server test` | **22/22成功**、失敗・skip0、約3.28秒。インメモリSQLite、合成署名証明書／Apple fixture。本番・Appleにアクセスしない |
| server `npx --no-install tsc --noEmit` | 失敗。ローカルtscなし、ENOTFOUND |
| `npm --prefix app run web` | 失敗。expo実行ファイルなし。375×812/667の起動→相棒→Home→開封のUI検証は未実施 |
| NodeでtoRecord実装を読取・抽出して実行 | 歩数・誕生日理由と日付が出力に残る。通信・ファイル生成なし |
| NodeでspendCurrency本体を読取・抽出して実行 | 消費済みwallet0の場合null、spender0回。React統合試験ではない |
| NodeでPNGヘッダー・require参照を検査 | UI参照欠落0。PNG169、合計43,225,688 pixels。全RGBA展開の理論合計164.9MiB |
| git追跡秘密ファイル・パターン検索 | 実秘密の混入は発見せず。テスト生成鍵文字列と実装のPEMパーサーが一致。履歴全体は未調査 |

lintの区分：実行できていないのでreact-hooks（動作影響）とunused/import等（整理中心）の**現在件数はどちらも不明**。前回の件数を流用しない。react-hooks違反は依存配列・条件付き呼び出しを個別評価し、unused/importだけでバグと断定しない。`eslint . -f json` を依存導入済みの同一HEADで実行し、ruleId×severityで集計する作業が残る。

ネイティブPrivacy Manifest：追跡ファイルに独自xcprivacyなし。未導入のため、AsyncStorage、Expo FileSystem/Font/Asset/SecureStore/Notifications、React Native、expo-iap等の実ネイティブコード・podに含まれるUserDefaults/ファイル時刻/容量/起動時間の理由コード・SDK署名は**未確認**。独自manifestが無いことだけで不適合とは言えない。依存導入済みの同一lock環境で各PrivacyInfo.xcprivacyと実API利用を対応付け、最終提出物の集約結果を確認する必要がある。

## 実機・TestFlight等でしか確かめられないこと／残る公開ゲート

1. 匿名のまま購入→元端末を失う→新端末で有効パスを復元、Apple連携済みの機種変更、別Appleアカウント、Keychain書込み失敗／401からの回復。
2. 有料券／またたび最後の1個で、送信直後・応答直後・保存直前の強制終了、通信断、復帰。猫・opened・無料残高・有料残高が一度だけ確定すること。
3. 候補0/1/2/3/6匹、3匹一括・パス6匹一括、連打、確認キャンセル、演出skip／途中バックグラウンド、20時またぎ、無料お迎え後、期限後／返金後の未開封枠。
4. 375×667/812と大画面、Safe Area、Dynamic Type最大、VoiceOver全フロー、Reduce Motion、購入確認長文の最後とボタン。6匹演出のFPS・メモリ・発熱。
5. 歩数・位置・カメラ・写真・通知の許可、拒否、後から許可／取消。DAILY20時の実通知・旅行／DST、写真の前後カメラの左右・保存向き、音・触覚。
6. Sandboxの支払完了／保留／キャンセル／未完了取引／復元、サブスク更新・失効・返金先着、通知取りこぼし。本物のApple JWS／証明書・環境・appAccountToken検証、WorkerのCPU時間。
7. 同一HEADで依存を導入した環境の型チェック・lintルール別集計・expo-doctor、各ネイティブmanifestとOSS notices。今回は他ファイル不変更を守るため導入せず。
8. **既存DBに0002を適用済みと確認してから対応サーバーをdeploy**。新規DBは最新schemaを作り0002を重ねない。secret・商品ID/実価格・V2通知URLのProduction/Sandbox・edge limit/cronを非本番と管理画面で確認。今回これらは操作していない。
9. App Privacy（派生歩数・年齢・IPを含む）と年齢質問票、確率開封の扱い、販売主体・請求開示の実務、削除後保持の説明を確定する。App Store用の最終スクリーンショットと表示価格も確認する。

## 外部根拠

2026-10-30参照。法令の適法性認定や審査結果の保証ではない。

- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)：3.1.1（復元、購入によるランダムな仮想アイテムの確率開示）、3.1.2、5.1系。判断は上記コード事実と区別した。
- [Apple Required Reason API](https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api)：manifest検査の公式入口。今回の環境では依存内の充足確認まではできていない。
- npm auditのadvisory：[deepmerge GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4)、[Zod GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)。件数は照会結果であり、実アプリでの攻撃成立件数ではない。
