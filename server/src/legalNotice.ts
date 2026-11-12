/*
 * 特定商取引法に基づく表記. The server shows it at /legal.
 * Name, address and phone number are given on request: the operator must answer such a request without delay.
 */
import { CONTACT_EMAIL, OPERATOR_NAME } from "./operator.ts";

export const LEGAL_NOTICE_TITLE = "特定商取引法に基づく表記";

const ON_REQUEST = "請求があった場合、遅滞なく開示します";

export const LEGAL_MARKDOWN = `# 特定商取引法に基づく表記

最終更新日：2026年10月30日

| 項目 | 内容 |
|---|---|
| 販売業者 | ${OPERATOR_NAME} |
| 運営責任者 | ${ON_REQUEST} |
| 所在地 | ${ON_REQUEST} |
| 電話番号 | ${ON_REQUEST} |
| 連絡先 | ${CONTACT_EMAIL}（上の事項のご請求も、こちらで受け付けます） |
| 販売価格 | アプリ内の購入画面に表示します（税込） |
| 商品 | お迎え券（今日の候補から猫を追加で迎えられる券） |
| 代金以外の必要料金 | 通信料は、お客様のご負担です |
| お支払い方法・時期 | Appleの決済です。購入の確定時に、Apple Accountに登録した方法でお支払いいただきます |
| 引渡し時期 | 購入の完了後、すぐにアプリ内でご利用いただけます |
| 申込みの有効期限 | ありません |
| 返品・キャンセル | デジタルの商品の性質上、購入後の返品・キャンセルはお受けできません。なお、Appleへの返金のご申請は、Appleの規約と手続きによります |
| お迎え券の取り扱い | 購入した分に有効期限はありません。アカウントを削除すると、残りは失われます |
| 返金があった場合 | Appleによる返金があった場合、その購入で付与した分のうち、使っていない分は取り消します。すでに使った分は、取り消しません。迎えた猫は、そのまま残ります。返金が繰り返された場合は、購入をお断りすることがあります |
| 未成年のお客様 | 年齢の区分に応じて、毎月の購入に上限があります（15歳以下は月5,000円、16〜19歳は月10,000円まで） |
`;
