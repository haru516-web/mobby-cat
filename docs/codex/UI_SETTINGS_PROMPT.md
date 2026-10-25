# Codex 依頼プロンプト（設定画面の画像）

作業フォルダ: **`D:\mobby-cat\.worktrees\settings-ui`**（git worktree。ブランチは `codex/settings-ui`、`feature/next` から分岐）。このフォルダの中だけで作業し、`D:\mobby-cat` 本体や他のブランチ（`codex/ui-fixes` `codex/new-mobbies-2` など）は触らず、ブランチも切り替えない。

作り方（初回だけ）:

```bash
git -C D:/mobby-cat worktree add D:/mobby-cat/.worktrees/settings-ui -b codex/settings-ui feature/next
```

**コード（`app/src`, `App.tsx`）は変更しない。** 画像と `app/assets/ui/manifest.json`、`assets/ui-records/provenance/` の更新だけを行う（`app/src/ui/uiAssets.ts` は自動生成なので、`tools/build-ui-registry.ps1` を実行し直す）。
既存素材と同じ built-in image_gen、同じビジュアルルール（`docs/codex/CODEX_PROMPT.md` の「ビジュアルルール」）を守る。文字は焼き込まない。

---

## 1. `button/settings-round.png`（新規・必須）

- 全画面のヘッダー右端（お知らせのベル `button/bell-round` の右隣）に置く、設定を開く丸ボタン。
- **`button/bell-round.png` と同じ質感・同じ縁取り・同じ大きさ・同じ光源**で、ベルのところを**歯車**にしたもの。歯車は6〜8枚歯のやわらかい丸みのある形（ぷっくり、角を立てない）。
- サイズ 168×168、透過PNG。丸の外側と落ち影だけ透過。
- 押し込み状態や未読バッジは要らない。

## 2. 足りなければ（任意・提案があれば）

設定画面は、今は文字だけの見出し（通知と誕生日／音とバイブ／使い方とサポート／このアプリについて）で区切っている。見出し用の小さな飾り（`panel/divider-h` と同じ系統の細い区切り）があるとよい場合は、`panel/section-header.png`（9slice、高さ 90px、文字なし）を足して、`provenance` に理由を書く。

## 確認

- `bell-round` と並べたとき、大きさと質感が揃っているか（`assets/ui-records/previews/` に並べた確認画像を1枚作る）。
- 完了したら `git push origin codex/settings-ui` まで行い、追加したファイル名を報告する。
