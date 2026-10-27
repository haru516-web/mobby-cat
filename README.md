# にゃこモビー

毎日の暮らし（歩数・スマホの電池・暦・月）が、そのままにゃこモビーとの出会いになるコレクションゲーム（iOS / Expo）。

## まず見る場所

| 知りたいこと | 見る場所 |
|---|---|
| 企画・仕様 | [docs/game-design.md](docs/game-design.md)（企画書）、[docs/appearance-catalog.md](docs/appearance-catalog.md)（猫の名前・出現条件） |
| 公開に向けた考え方と残りのタスク | [docs/growth-plan.md](docs/growth-plan.md) |
| 「この機能のコードはどこ？」 | [app/src/README.md](app/src/README.md) |
| 画像はどこにある？どう作る？ | [assets/README.md](assets/README.md) |
| スクリプトの使い方 | [tools/README.md](tools/README.md) |
| Codex への依頼書 | [docs/codex/](docs/codex) |
| 目標とするUIの参考画像 | [docs/ui-reference/](docs/ui-reference) |

## フォルダの地図

```
mobby-cat/
├─ app/                  Expo アプリ本体（これだけがアプリになる）
│  ├─ App.tsx            起動と画面の切り替え
│  ├─ app.json           アプリの設定（名前・アイコン・権限の説明文）
│  ├─ src/               コード（機能ごとに分けてある）
│  └─ assets/            アプリに入る画像
│     ├─ ui/             UI画像211枚（ボタン・カード・背景など）と manifest.json
│     ├─ cats/           にゃこモビー270匹の画像（自動生成。手で編集しない）
│     └─ system/         OS用のアイコン（Android）
├─ assets/               アプリに入らない素材と記録
│  ├─ cat-mobbies/       にゃこモビーの元画像（1254px）。new/ は新規100匹
│  └─ ui-records/        UI画像の確認用プレビューと生成記録（Codexの納品記録）
├─ docs/                 企画書・計画・Codex依頼書
└─ tools/                画像の変換・一覧生成のスクリプト
```

## 動かす

```bash
cd app
npm install
npm run web      # ブラウザで確認（http://localhost:8081）
npx tsc --noEmit # 型チェック（未使用コードもエラーになる設定）
```

iPhone実機は Expo Go で確認する。ビルド（EAS / Xcode）は、必要なときに依頼してから行う。

## ブランチと作業フォルダ

- 作業は `git worktree` で、ブランチごとに別フォルダを使う（`.worktrees/<名前>`）。
- Codex に頼む作業は、必ず専用のブランチ `codex/<名前>` と専用の worktree を用意し、`D:\mobby-cat` 本体のフォルダは使わせない。
- 画像を作る流れ：Codex が `codex/*` ブランチで画像を納品 → `tools/` のスクリプトでアプリ用に変換 → アプリのブランチへ取り込む。
