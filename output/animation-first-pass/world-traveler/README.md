# World Traveler アクションスプライト

対象：`world-traveler`。ゴロゴロアニメーションの [スプライトシート](../../../assets/cat-mobbies/animations/world-traveler-floor-roll-v1/spritesheet-aligned.png) と立ち絵を参照しています。黒白の毛色、緑の有機眼、カメラレンズ眼、コンパス柄の首巻きと金色のコンパスペンダントを維持し、地図とスーツケースは含めていません。

全シート共通：透過RGBA、2048×1024、4列×2行、各コマ512×512。各動作に個別フレームと確認用MP4を用意しています。

## 目を隠して擦る

両目を隠したまま左右の前足を交互に動かして擦り、隠す時間を長めにした後、正面へ戻ります。

- `peekaboo/spritesheet.png`
- `peekaboo/frames/00.png`〜`07.png`
- `peekaboo/preview.mp4`（2秒、30fps）
- `peekaboo/generated-sheet.png`（生成元）

## 後ろに倒れて慌てる

正面から後ろへ倒れて仰向けになり、その後は目を見開いて手足をばたつかせます。

- `fall-back/spritesheet.png`
- `fall-back/frames/00.png`〜`07.png`
- `fall-back/preview.mp4`（約1.87秒、30fps）
- `fall-back/generated-sheet.png`（生成元）

## 怒って両手を上げる

怒った表情で両手を上げ、少し震えてポーズを保ちます。

- `angry-hands/spritesheet.png`
- `angry-hands/frames/00.png`〜`07.png`
- `angry-hands/preview.mp4`（1.6秒、30fps）
- `angry-hands/generated-sheet.png`（生成元）
