/*
 * The privacy policy, in one place. The server shows it at /privacy.
 * When the app's handling of data changes, change this text and `docs/app-store-privacy.md` together.
 */
import { CONTACT_EMAIL, OPERATOR_NAME } from "./operator.ts";

export const PRIVACY_POLICY_TITLE = "プライバシーポリシー";

export const PRIVACY_MARKDOWN = `# プライバシーポリシー

制定日：2026年10月28日
最終更新日：2026年10月29日
運営者：${OPERATOR_NAME}
連絡先：${CONTACT_EMAIL}

「にゃこモビー」（以下「本アプリ」）は、歩数・電池・天気・暦など、毎日の暮らしに合わせて猫と出会うアプリです。本アプリが取り扱う情報と、その使い道を説明します。

## 1. 端末の中だけで使う情報

次の情報は、その日に出会える猫を決めるために端末の中で読み取ります。運営者のサーバーには送りません（位置は、下の説明のとおり、天気を調べるときだけ外へ送ります）。

- 歩数（iPhoneの「モーションとフィットネス」から読み取ります）
- 電池の残量と充電の状態、端末の時刻
- おおまかな位置（その日の天気を調べるためにだけ使い、端末にも保存しません）
- 誕生日の月と日（その日に特別な猫を呼ぶためにだけ使います）

位置情報を許可すると、その日の天気を調べるために、おおまかな位置（緯度・経度を小数第1位、約10kmに丸めた値）を、1日1回、ノルウェー気象研究所（MET Norway）の天気予報サービスに送ります。このとき、接続元のIPアドレスも先方に届きます。運営者のサーバーには送りません。許可しなくても遊べますが、天気に関わる出会いは起きません。

カメラは、猫と一緒に写真を撮るときにだけ使います。撮った写真は、保存や共有の操作をしたときだけ、写真アプリや共有先に渡されます。

毎日20時の出会いのお知らせは、端末の中だけで予約します。設定または端末の設定で、いつでも切れます。

## 2. サーバーに保存する情報

遊ぶだけであれば、記録は端末の中にだけ保存されます。次の場合に限り、運営者のサーバー（Cloudflare）に保存します。

- **アカウント**：起動すると、ランダムな番号のアカウント（個人を特定しません）が作られます。端末には、サーバーに接続するための鍵が保存されます。
- **購入**：お迎え券・またたび・またたびパスを購入すると、Appleの取引番号、商品、日時、持っている券とまたたびの数をアカウントに結びつけて保存します。
- **Appleでサインイン**：つなぐと、Appleが発行するこのアプリ専用の識別子と、削除のときにAppleへ取り消しを伝えるための認可情報を保存します。メールアドレスや名前は受け取りません。購入には、このサインインが必要です。
- **記録のバックアップ**：Appleでサインインしたアカウントだけ、遊んだ記録（迎えた猫、図鑑、持っているアイテム、設定）を保存します。機種変更で新しい端末に戻すために使います。
- **年齢の区分**：自己申告で選んでいただきます。年齢に応じた毎月の購入上限のために使います。
- **接続元のIPアドレス**：連続した不正なアクセスを防ぐために一時的に使い、最長で73時間後に消えます。

## 3. 使わないもの

広告の表示、アクセス解析、他社アプリをまたいだ追跡、ほかのアプリとのデータ共有はありません。保存した情報を、販売したり、上記以外の目的に使ったりしません。

## 4. 外部サービス

- Apple（アプリ内課金、Appleでサインイン）
- Cloudflare（サーバーの運用）
- MET Norway（天気予報の取得。位置を許可した場合だけ）

## 5. 削除

設定の「アカウントを削除する」から、サーバーに保存した情報（アカウント、購入の記録、バックアップ）をすべて削除できます。削除すると元に戻せません。アプリを削除しても、サーバーの情報は自動では消えません。先にアカウントを削除してください。

データベースの復旧用の保管に、削除済みの情報が最長30日残ることがあります。

## 6. 未成年の方へ

年齢の区分に応じて、毎月の購入に上限があります。保護者の方は、端末の「スクリーンタイム」でも購入を制限できます。

## 7. 変更

この文面を変えるときは、アプリ内とこのページでお知らせします。サーバーと通信する機能を増やす場合は、先にこの文面を更新します。

## 8. お問い合わせ

${CONTACT_EMAIL}
`;

const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const inline = (text: string) => escapeHtml(text).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

/** Just enough Markdown for the policy: headings, paragraphs, bullet lists, tables and bold. Everything is escaped first. */
export function markdownToHtml(markdown: string): string {
  const out: string[] = [];
  const lines = markdown.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    if (line.startsWith("# ")) { out.push(`<h1>${inline(line.slice(2))}</h1>`); continue; }
    if (line.startsWith("### ")) { out.push(`<h3>${inline(line.slice(4))}</h3>`); continue; }
    if (line.startsWith("## ")) { out.push(`<h2>${inline(line.slice(3))}</h2>`); continue; }
    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) items.push(`<li>${inline(lines[i].slice(2))}</li>`), i++;
      i--;
      out.push(`<ul>${items.join("")}</ul>`);
      continue;
    }
    if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        const cells = lines[i].split("|").slice(1, -1).map((cell) => cell.trim());
        if (!cells.every((cell) => /^-+$/.test(cell))) rows.push(cells);
        i++;
      }
      i--;
      const [head, ...body] = rows;
      out.push(`<table><thead><tr>${head.map((cell) => `<th>${inline(cell)}</th>`).join("")}</tr></thead><tbody>${body.map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>`);
      continue;
    }
    // Consecutive plain lines belong to one paragraph, kept on separate lines.
    const paragraph: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#|- |\|)/.test(lines[i])) paragraph.push(inline(lines[i])), i++;
    i--;
    out.push(`<p>${paragraph.join("<br>")}</p>`);
  }
  return out.join("\n");
}

/** A plain, readable page for a legal document. */
export function documentPageHtml(title: string, markdown: string): string {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>にゃこモビー ${escapeHtml(title)}</title>
<style>body{font-family:-apple-system,"Hiragino Sans","Noto Sans JP",sans-serif;background:#FFF8F0;color:#3a2e28;margin:0;padding:24px 16px 56px;line-height:1.8}main{max-width:720px;margin:0 auto}h1{font-size:24px}h2{font-size:18px;margin-top:32px;border-bottom:1px solid #ecd9c6;padding-bottom:4px}table{border-collapse:collapse;width:100%;font-size:14px;margin:12px 0}th,td{border:1px solid #ecd9c6;padding:8px;text-align:left;vertical-align:top}th{background:#f8e8d6}ul{padding-left:1.4em}</style></head>
<body><main>${markdownToHtml(markdown)}</main></body></html>`;
}

export const privacyPageHtml = (): string => documentPageHtml(PRIVACY_POLICY_TITLE, PRIVACY_MARKDOWN);
