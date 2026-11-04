# にゃこもビー アニメーション試作

キャラクター：ノーマル（レア度1）のブリティッシュショートヘア。元のモビー画像を参照し、内蔵 image_gen で各アニメーションのポーズを作成。

## 1. すやすや鼻ちょうちん（改訂版）

横長の姿勢で床に体を預けて寝ています。手足としっぽも床に沿って休み、顔と操作パネルは見える向きです。元のモビーのゲーム機型ボディ、カメラレンズ、Dパッドとボタンを保っています。全コマで本体の姿勢と位置は固定し、鼻ちょうちんだけを小→大→小へ変化させます。6秒ループ。

- 透過RGBAスプライトシート：`sleep-bubble/spritesheet.png`（2048×1024、4列×2行、1コマ512×512）
- 確認用MP4：`sleep-bubble/preview-horizontal-lying.mp4`（512×512、30fps、6秒）
- 個別フレーム：`sleep-bubble/frames/00.png`〜`07.png`
- 素材レイヤー：`sleep-bubble/lying-base.png` と `bubble-master.png`

## 2. とことこ歩き

足と腕を交互に動かしてその場で歩く8コマ。5秒ループ。

- `walk/spritesheet.png`
- `walk/preview.mp4`
- `walk/frames/00.png`〜`07.png`

## 3. アクション

立ち姿のブリティッシュショートヘアで、次の3動作を作成。各シートは透過RGBA、2048×1024、4列×2行、1コマ512×512。確認用MP4は512×512、30fpsのワンショットです。目隠しは2.0秒、転倒は約1.87秒、怒りは1.6秒で、目隠しと転倒後の動きを長めにしています。

### いないいないばあ

両目（カメラレンズを含む）を隠したまま前足を左右に動かして擦り、隠す時間を長めに取ってから正面立ち姿に戻ります。

- `peekaboo/spritesheet.png`
- `peekaboo/preview.mp4`
- `peekaboo/frames/00.png`〜`07.png`

### 後ろにひっくり返る

正面の立ち姿から後ろへ倒れ、仰向けになってから目を見開き、手足をばたつかせて慌てます。

- `fall-back/spritesheet.png`
- `fall-back/preview.mp4`
- `fall-back/frames/00.png`〜`07.png`

### 両手を上げて怒る

怒った表情で両手を上げ、少し震えてポーズを保ちます。

- `angry-hands/spritesheet.png`
- `angry-hands/preview.mp4`
- `angry-hands/frames/00.png`〜`07.png`

