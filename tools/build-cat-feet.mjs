// ホームの猫の影を足元に合わせるための、足の位置の表を作る（app/src/data/catFeet.json）。
// 画像の透明でない部分（alpha）を調べて、[足元の下端 y, 足元の中心 cx, 足元の幅 w, 頭の上端 top, 左端 left, 右端 right, 猫の面積 area] を、1コマ（または画像）に対する割合で出す。
// 足元は影の位置合わせに、top/left/right は猫どうしが（アニメーション中も）重ならない配置に、area は立ち姿と動きの絵の大きさをそろえるのに使う。
// 使い方: node tools/build-cat-feet.mjs   （ffmpeg が必要。素材を差し替えたら、もう一度実行する）
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const app = path.resolve(import.meta.dirname, '../app');
const THRESH = 140; // しっかり不透明な部分だけを見る（素材に焼き込まれた薄い影は、足元に数えない）

function alphaOf(file, w, h) {
  const buf = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-vf', `scale=${w}:${h},format=rgba,alphaextract`, '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], { maxBuffer: 1 << 26 });
  return buf;
}
// buf の中の (x0,y0,cw,ch) の範囲を調べる
function feet(buf, stride, x0, y0, cw, ch) {
  const rows = [];
  for (let y = 0; y < ch; y++) {
    let n = 0, lo = cw, hi = -1;
    for (let x = 0; x < cw; x++) {
      if (buf[(y0 + y) * stride + x0 + x] > THRESH) { n++; if (x < lo) lo = x; if (x > hi) hi = x; }
    }
    rows.push(n >= 3 ? [lo, hi] : null);
  }
  const ys = rows.map((r, i) => (r ? i : -1)).filter((i) => i >= 0);
  if (!ys.length) return [0.9, 0.5, 0.5, 0.1, 0.1, 0.9, 0];
  const top = ys[0], bottom = ys[ys.length - 1];
  const band = Math.max(1, Math.round((bottom - top) * 0.2));
  let lo = cw, hi = -1;
  for (let y = bottom - band; y <= bottom; y++) if (rows[y]) { lo = Math.min(lo, rows[y][0]); hi = Math.max(hi, rows[y][1]); }
  const r3 = (v) => Math.round(v * 1000) / 1000;
  let L = cw, R = -1;
  for (const r of rows) if (r) { L = Math.min(L, r[0]); R = Math.max(R, r[1]); }
  let area = 0;
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (buf[(y0 + y) * stride + x0 + x] > THRESH) area++;
  return [r3((bottom + 1) / ch), r3((lo + hi + 1) / 2 / cw), r3((hi - lo + 1) / cw), r3(top / ch), r3(L / cw), r3((R + 1) / cw), r3(area / (cw * ch))];
}
const sheet = (file) => {
  const W = 1024, H = 512, buf = alphaOf(file, W, H);
  const out = [];
  for (let i = 0; i < 8; i++) out.push(feet(buf, W, (i % 4) * 256, Math.floor(i / 4) * 256, 256, 256));
  return out;
};

const result = { still: {}, roll: {}, act: {} };
for (const f of fs.readdirSync(path.join(app, 'assets/cats'))) {
  if (!f.endsWith('.webp')) continue;
  result.still[f.replace('.webp', '')] = feet(alphaOf(path.join(app, 'assets/cats', f), 256, 256), 256, 0, 0, 256, 256);
}
for (const f of fs.readdirSync(path.join(app, 'assets/cat-roll'))) {
  if (f.endsWith('.webp')) result.roll[f.replace('.webp', '')] = sheet(path.join(app, 'assets/cat-roll', f));
}
for (const f of fs.readdirSync(path.join(app, 'assets/cat-act'))) {
  if (f.endsWith('.webp')) result.act[f.replace('.webp', '')] = sheet(path.join(app, 'assets/cat-act', f));
}
fs.writeFileSync(path.join(app, 'src/data/catFeet.json'), JSON.stringify(result));
console.log(Object.keys(result.still).length, Object.keys(result.roll).length, Object.keys(result.act).length);
