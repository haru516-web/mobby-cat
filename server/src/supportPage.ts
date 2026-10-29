/*
 * The support page, shown by the server at /support. Its address is the support URL given to App Store Connect.
 */
import { CONTACT_EMAIL, OPERATOR_NAME } from "./operator.ts";

export const SUPPORT_TITLE = "サポート";

export const SUPPORT_MARKDOWN = `# にゃっコレ サポート

運営者：${OPERATOR_NAME}　連絡先：${CONTACT_EMAIL}

お問い合わせは、上のメールアドレスにお送りください。順に確認して、お返事します。

## よくある質問

### 購入したのに、お迎え券やまたたびが増えません
アプリを開き直してください。購入の確認は、次の起動時にも自動でやり直します。それでも増えない場合は、ショップの「購入を復元する」を押してください。

### 機種変更で、記録を引き継ぎたい
設定の「アカウント」から、Appleでサインインしてください。新しい端末でも同じAppleアカウントでサインインすると、猫・図鑑・購入したアイテムが戻ります。Appleでサインインしていない記録は、引き継げません。

### またたびパスを解約したい
iPhoneの「設定」→ 上部の名前 →「サブスクリプション」から解約できます。解約しても、期間の終わりまで使えます。アカウントを削除しても、自動では解約されません。

### 購入の返金を受けたい
返金は、Appleが受け付けています。reportaproblem.apple.com から、ご申請ください。

### アカウントと記録を削除したい
設定の「アカウント」→「アカウントを削除する」から、削除できます。削除すると、サーバーの情報が消え、元に戻せません。

## 関連ページ

- プライバシーポリシー：/privacy
- 特定商取引法に基づく表記：/legal
`;
