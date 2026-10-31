# Codex 依頼プロンプト（ヘッダーの「＋」ボタン画像）

出会い画面などの見出しにある所持品（お迎え券・またたび）の右に、「押すとショップが開く」ことを伝える **「＋」の丸い画像** を1枚作る。いまは代わりに、コードで丸と文字を描いている。

ブランチ `codex/plus-round`（作成済み）。**worktree はあなた（Codex）が作る**。作業フォルダは **`D:\mobby-cat\.worktrees\plus-round`**。

```bash
git -C D:/mobby-cat worktree add D:/mobby-cat/.worktrees/plus-round codex/plus-round
```

そのフォルダの中だけで作業し、`D:\mobby-cat` 本体や他のブランチ・worktree は触らず、ブランチも切り替えない。

**コード（`app/src`, `App.tsx`, `app/app.json`）は変更しない。** 画像と `app/assets/ui/manifest.json`、`assets/ui-records/provenance/` の更新だけ（`app/src/ui/uiAssets.ts` は `tools/build-ui-registry.ps1` で再生成。既存項目の並びだけが変わる差分が出るなら、追加した項目の行だけ手で足してよい）。既存素材と同じ built-in image_gen、同じビジュアルルール（`docs/codex/CODEX_PROMPT.md` の「ビジュアルルール」）を守る。**文字は焼き込まない**（「＋」は図形として描く）。

## `icon/plus-round.png`（新規・必須）

- 透過PNG、150×150px（`icon/ticket-paw.png` などと同じ）。
- クリーム色のふち付きの**丸**の中に、**オレンジ `#F08A5D` の「＋」**。「＋」は線の端が丸く、やわらかい太さ。丸は、`button/bell-round.png` と同じふちと影の付け方（小さく表示されるので、影は控えめに）。
- 小さく（22pt 前後）表示されても「＋」と読めること。細すぎない。
- 色：クリーム `#FFF8F0`、こげ茶 `#4A3B32`、オレンジ `#F08A5D`。

## 登録

- `manifest.json` に `icon/plus-round` を追加し、provenance を記録する。
- 登録は画像の追加だけ。コードの切り替えは、こちらで行う。

## 完了条件

- `app/assets/ui/icon/plus-round.png` が 150×150 の透過PNGである。
- 他のアイコンと並べて、ふち・影・色味がなじむ。
- コードの差分がない。
