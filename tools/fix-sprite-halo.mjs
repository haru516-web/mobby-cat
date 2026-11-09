// 猫の素材の縁に残った「背景のベージュのにじみ（切り抜き残り）」を取り除く。
// 原因: 透明度（alpha）が猫の形でなく、ぼかした大きな塊になっていて、背景色が縁に不透明のまま残っている。
// 直し方: 縁の色から背景色を見積もり、外側から「その色に近くて、なめらか（毛のきめがない）」画素を、内側へたどって透明にする。
//   猫の毛に届いたところで止まる。にじみの幅が小さい（ふつうの縁）素材は触らない。
// 使い方: node tools/fix-sprite-halo.mjs <出力フォルダ> [--apply]
//   <出力フォルダ>/<種類>/<ファイル>.webp に直したものを書く。--apply を付けると app/assets の元ファイルも置き換える（元は git で戻せる）。
//   出力: <出力フォルダ>/fix-report.json（直した素材と、にじみの幅 px）
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const app = path.resolve(import.meta.dirname, '../app');
const outDir = path.resolve(process.argv[2] ?? path.resolve(import.meta.dirname, '../tmp-halo-fix'));
const APPLY = process.argv.includes('--apply');
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) ?? '').slice(7); // 名前の一部（試し用）
const TOL = 40; // 半透明のにじみ（alpha<=ALPHA_MAX）の色の許容
const TOL_SOLID = 24; // 不透明な背景残りは、体と間違えないよう厳しめ // 背景色との各チャンネルの差の許容
const GRAD = 30;
const GRAD_SOLID = 12; // 隣との色の差の許容（毛のきめは、これより大きい）
const MAX_DEPTH = 28;
const ALPHA_MAX = 250; // 体の毛は alpha がほぼ最大。にじみは半透明（これ以下）のことが多い。ここを超える画素は、体として守る // 縁から内側へ、最大これだけ
const MIN_MID = 0.18; // 半透明（alpha 9〜245）の画素が、絵の面積のこの割合以上あるコマだけ直す。きれいな素材は 0.07〜0.10、にじみのある素材は 0.2〜0.5
const MAX_LOST = 0.025; // 体（不透明な部分）をこれ以上削ってしまった素材は、直したことにしない
const MIN_WIDTH = 2.5; // にじみの平均の幅がこれ未満なら、ふつうの縁として触らない
const CLEAR_ALPHA_BELOW = new Map([['act/munchkin-sleep.webp', 230]]); // 各コマの外周につながる低アルファのピンクマット

const run = (cmd, args, input) => new Promise((resolve, reject) => {
  const p = spawn(cmd, args);
  const chunks = [];
  p.stdout.on('data', (c) => chunks.push(c));
  p.on('close', (code) => (code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(`${cmd} ${code}`))));
  if (input) { p.stdin.on('error', () => {}); p.stdin.end(input); }
});

function fixCell(buf, stride, x0, y0, cw, ch) {
  const N = cw * ch;
  const px = (x, y) => ((y0 + y) * stride + x0 + x) * 4;
  const A = new Uint8Array(N);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) A[y * cw + x] = buf[px(x, y) + 3];
  // 透明（alpha<=8）からの距離 1,2 を作る
  const d = new Uint8Array(N).fill(99);
  let fr = [];
  for (let i = 0; i < N; i++) if (A[i] <= 8) { d[i] = 0; fr.push(i); }
  for (let k = 1; k <= 2; k++) {
    const nx = [];
    for (const i of fr) {
      const x = i % cw, y = (i - x) / cw;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const X = x + dx, Y = y + dy;
        if (X < 0 || Y < 0 || X >= cw || Y >= ch) continue;
        const j = Y * cw + X;
        if (d[j] > k) { d[j] = k; nx.push(j); }
      }
    }
    fr = nx;
  }
  // コマの枠にかかっているにじみも、外側として扱う（枠で切れていて、透明に触れていないことがある）
  for (let x = 0; x < cw; x++) for (const y of [0, ch - 1]) if (A[y * cw + x] > 8) d[y * cw + x] = 1;
  for (let y = 0; y < ch; y++) for (const x of [0, cw - 1]) if (A[y * cw + x] > 8) d[y * cw + x] = 1;
  let nz = 0, mid = 0;
  for (let i = 0; i < N; i++) if (A[i] > 8) { nz++; if (A[i] <= 245) mid++; }
  if (nz < 200 || mid / nz < MIN_MID) return { width: 0, changed: false, mid: nz ? mid / nz : 0 };
  const grad = new Uint8Array(N);
  for (let y = 1; y < ch - 1; y++) for (let x = 1; x < cw - 1; x++) {
    const o = px(x, y);
    let g = 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const q = px(x + dx, y + dy);
      g = Math.max(g, Math.abs(buf[o] - buf[q]), Math.abs(buf[o + 1] - buf[q + 1]), Math.abs(buf[o + 2] - buf[q + 2]));
    }
    grad[y * cw + x] = Math.min(255, g);
  }
  const ring = [];
  let ringAll = 0;
  for (let i = 0; i < N; i++) if (A[i] >= 100 && d[i] <= 2) { ringAll++; if (grad[i] <= GRAD && A[i] <= ALPHA_MAX) ring.push(i); }
  if (ringAll < 60 || ring.length < ringAll * 0.3) return null;
  const med = (ch_) => { const v = ring.map((i) => buf[px(i % cw, (i - (i % cw)) / cw) + ch_]).sort((p, q) => p - q); return v[v.length >> 1]; };
  const bg = [med(0), med(1), med(2)];
  const bglike = (i) => {
    if (A[i] <= 8) return false;
    const solid = A[i] > ALPHA_MAX;
    if (grad[i] > (solid ? GRAD_SOLID : GRAD)) return false;
    const o = px(i % cw, (i - (i % cw)) / cw);
    const t = solid ? TOL_SOLID : TOL;
    return Math.abs(buf[o] - bg[0]) <= t && Math.abs(buf[o + 1] - bg[1]) <= t && Math.abs(buf[o + 2] - bg[2]) <= t;
  };
  // 外側（d==1）から、背景色に近いなめらかな画素を内側へたどる
  const removed = new Uint8Array(N);
  let layer = [];
  let perim = 0;
  for (let i = 0; i < N; i++) if (d[i] === 1 && A[i] > 8) { perim++; if (bglike(i)) { removed[i] = 1; layer.push(i); } }
  let count = layer.length;
  for (let depth = 1; depth < MAX_DEPTH && layer.length; depth++) {
    const nx = [];
    for (const i of layer) {
      const x = i % cw, y = (i - x) / cw;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const X = x + dx, Y = y + dy;
        if (X < 0 || Y < 0 || X >= cw || Y >= ch) continue;
        const j = Y * cw + X;
        if (!removed[j] && bglike(j)) { removed[j] = 1; nx.push(j); count++; }
      }
    }
    layer = nx;
  }
  const width = perim ? count / perim : 0;
  if (width < MIN_WIDTH) return { width, changed: false, mid: mid / nz };
  let lostN = 0, opq = 0, remMid = 0;
  for (let i = 0; i < N; i++) {
    if (A[i] > ALPHA_MAX) { opq++; if (removed[i]) lostN++; }
    else if (A[i] > 8 && !removed[i]) remMid++;
  }
  const lost = opq ? lostN / opq : 0;
  const residual = remMid / Math.max(1, nz - count);
  // 透明にして、のこった縁は1pxだけ半透明にする
  const keep = removed.slice();
  for (let i = 0; i < N; i++) if (removed[i]) buf[px(i % cw, (i - (i % cw)) / cw) + 3] = 0;
  for (let i = 0; i < N; i++) {
    if (keep[i] || A[i] <= 8) continue;
    const x = i % cw, y = (i - x) / cw;
    let near = false;
    for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) {
      const X = x + dx, Y = y + dy;
      if (X >= 0 && Y >= 0 && X < cw && Y < ch && keep[Y * cw + X]) { near = true; break; }
    }
    if (near) { const o = px(x, y) + 3; buf[o] = Math.min(buf[o], 170); }
  }
  return { width, changed: true, lost, residual };
}

function clearBorderConnectedLowAlpha(buf, stride, x0, y0, cw, ch, maxAlpha) {
  const N = cw * ch, seen = new Uint8Array(N), queue = new Int32Array(N);
  let head = 0, tail = 0;
  const offset = (x, y) => ((y0 + y) * stride + x0 + x) * 4;
  const seed = (x, y) => {
    const k = y * cw + x;
    if (seen[k] || buf[offset(x, y) + 3] > maxAlpha) return;
    seen[k] = 1; queue[tail++] = k;
  };
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    if (x === 0 || y === 0 || x === cw - 1 || y === ch - 1 || buf[offset(x, y) + 3] === 0) seed(x, y);
  }
  while (head < tail) {
    const k = queue[head++], x = k % cw, y = (k - x) / cw;
    if (x > 0) seed(x - 1, y);
    if (x < cw - 1) seed(x + 1, y);
    if (y > 0) seed(x, y - 1);
    if (y < ch - 1) seed(x, y + 1);
  }
  for (let k = 0; k < N; k++) if (seen[k]) buf[offset(k % cw, Math.floor(k / cw)) + 3] = 0;
  return tail;
}

const jobs = [];
for (const [kind, dir, W, H, cells] of [['still', 'cats', 512, 512, 1], ['roll', 'cat-roll', 1024, 512, 8], ['act', 'cat-act', 768, 384, 8]]) {
  for (const f of fs.readdirSync(path.join(app, 'assets', dir))) if (f.endsWith('.webp') && !f.endsWith('-cover.webp') && f.includes(ONLY)) jobs.push({ kind, dir, f, W, H, cells });
}

const report = [];
let next = 0;
await Promise.all(Array.from({ length: 8 }, async () => {
  while (next < jobs.length) {
    const j = jobs[next++];
    const file = path.join(app, 'assets', j.dir, j.f);
    const buf = await run('ffmpeg', ['-v', 'error', '-i', file, '-vf', 'format=rgba', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-']);
    let forcedFrames = 0, forcedPixels = 0;
    const alphaThreshold = CLEAR_ALPHA_BELOW.get(`${j.kind}/${j.f}`);
    if (alphaThreshold) {
      const cw = j.W / 4, ch = j.H / 2;
      for (let i = 0; i < 8; i++) {
        const cleared = clearBorderConnectedLowAlpha(buf, j.W, (i % 4) * cw, Math.floor(i / 4) * ch, cw, ch, alphaThreshold);
        if (cleared) forcedFrames++;
        forcedPixels += cleared;
      }
    }
    const res = [];
    if (j.cells === 1) res.push(fixCell(buf, j.W, 0, 0, j.W, j.H));
    else { const cw = j.W / 4, ch = j.H / 2; for (let i = 0; i < 8; i++) res.push(fixCell(buf, j.W, (i % 4) * cw, Math.floor(i / 4) * ch, cw, ch)); }
    const changed = res.filter((r) => r?.changed).length + forcedFrames;
    const widths = res.map((r) => (r ? +r.width.toFixed(1) : 0));
    const needs = forcedFrames > 0 || res.some((r) => r && (r.changed || (r.mid ?? 0) >= MIN_MID)); // にじみがあるコマを含む
    const unfixed = res.some((r) => r && !r.changed && (r.mid ?? 0) >= MIN_MID); // にじみがあるのに、直せなかったコマ
    const lost = Math.max(0, ...res.map((r) => r?.lost ?? 0));
    const residual = Math.max(0, ...res.map((r) => r?.residual ?? 0));
    const status = !needs ? 'clean' : unfixed || lost > MAX_LOST ? 'regen' : 'fixed';
    report.push({ kind: j.kind, name: j.f, status, changedFrames: changed, forcedPixels, lost: +lost.toFixed(3), residual: +residual.toFixed(3), widths });
    if (status === 'fixed') {
      const dest = path.join(outDir, j.kind, j.f);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      const webp = await run('ffmpeg', ['-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${j.W}x${j.H}`, '-i', '-', '-c:v', 'libwebp', '-quality', '90', '-compression_level', '6', '-f', 'webp', '-'], buf);
      fs.writeFileSync(dest, webp);
      if (APPLY) fs.writeFileSync(file, webp);
    }
  }
}));
fs.mkdirSync(outDir, { recursive: true });
report.sort((a, b) => b.changedFrames - a.changedFrames || Math.max(...b.widths) - Math.max(...a.widths));
fs.writeFileSync(path.join(outDir, 'fix-report.json'), JSON.stringify(report, null, 1));
const fixed = report.filter((r) => r.status === 'fixed');
const regen = report.filter((r) => r.status === 'regen');
console.log(`checked ${report.length}, fixed ${fixed.length}${APPLY ? ' (applied)' : ' (dry: written to ' + outDir + ')'}, need regeneration ${regen.length}`);
console.log('--- regen'); for (const r of regen) console.log(r.kind.padEnd(5), r.name.padEnd(46), 'lost', r.lost, 'residual', r.residual);
console.log('--- fixed'); for (const r of fixed) console.log(r.kind.padEnd(5), r.name.padEnd(46), 'lost', r.lost, 'residual', r.residual);
