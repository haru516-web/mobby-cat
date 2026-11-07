// 猫の素材（立ち姿 app/assets/cats、ごろごろ cat-roll、動き cat-act）の「縁の白いにじみ・切り抜き残り」を調べる。
// 使い方: node tools/audit-sprite-alpha.mjs [出力フォルダ]   （ffmpeg が必要。8並列で数分）
// 出力: <フォルダ>/report.json（シート／コマごとの点数）と、疑わしい順の一覧。
// 見方: 縁（透明に接する外側3px）が、すぐ内側の体より「白っぽい」割合と、半透明の帯の太さを出す。点数が高いほど、白いふちが付いている。
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const app = path.resolve(import.meta.dirname, '../app');
const out = process.argv[2] ?? path.resolve(import.meta.dirname, '../tmp-alpha-audit');
fs.mkdirSync(out, { recursive: true });

const light = (r, g, b) => Math.min(r, g, b) >= 190 && Math.max(r, g, b) - Math.min(r, g, b) <= 40;

function decode(file, w, h) {
  return new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', ['-v', 'error', '-i', file, '-vf', `scale=${w}:${h}:flags=bilinear,format=rgba`, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-']);
    const chunks = [];
    p.stdout.on('data', (c) => chunks.push(c));
    p.on('close', (code) => (code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(`ffmpeg ${code} ${file}`))));
  });
}

// 1コマ（x0,y0,cw,ch）の点数
function scoreCell(buf, stride, x0, y0, cw, ch) {
  const A = (x, y) => buf[((y0 + y) * stride + x0 + x) * 4 + 3];
  // 透明までの距離（チェビシェフ、最大R）。透明=alpha<=8
  const R = 14;
  const dist = new Uint8Array(cw * ch).fill(R);
  // 透明画素から広げる（簡易：8近傍を R 回）
  let frontier = [];
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (A(x, y) <= 8) { dist[y * cw + x] = 0; frontier.push(y * cw + x); }
  for (let d = 1; d < R && frontier.length; d++) {
    const next = [];
    for (const i of frontier) {
      const x = i % cw, y = (i - x) / cw;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= cw || ny >= ch) continue;
        const j = ny * cw + nx;
        if (dist[j] > d) { dist[j] = d; next.push(j); }
      }
    }
    frontier = next;
  }
  let outer = 0, outerLight = 0, inner = 0, innerLight = 0, semi = 0, solid = 0, perim = 0, mid = 0;
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const o = ((y0 + y) * stride + x0 + x) * 4;
    const a = buf[o + 3];
    if (a <= 8) continue;
    if (a >= 200) solid++; else semi++;
    const d = dist[y * cw + x];
    if (d === 1) perim++;
    if (a >= 24 && a <= 230) mid++;
    const lt = light(buf[o], buf[o + 1], buf[o + 2]);
    if (d <= 3 && a >= 24) { outer++; if (lt) outerLight++; }
    else if (d >= 7 && d < R && a >= 200) { inner++; if (lt) innerLight++; }
  }
  if (solid < 200 || outer < 30) return { halo: 0, semi: 0, solid, soft: 0 };
  const ol = outerLight / outer, il = inner ? innerLight / inner : 0;
  return { halo: Math.max(0, ol - il), semi: semi / solid, solid, soft: mid / Math.max(1, perim) };
}

async function pool(items, n, fn) {
  const res = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) { const k = i++; res[k] = await fn(items[k]); }
  }));
  return res;
}

const jobs = [];
for (const f of fs.readdirSync(path.join(app, 'assets/cats'))) if (f.endsWith('.webp')) jobs.push({ kind: 'still', name: f, file: path.join(app, 'assets/cats', f), W: 256, H: 256, cells: 1 });
for (const f of fs.readdirSync(path.join(app, 'assets/cat-roll'))) if (f.endsWith('.webp')) jobs.push({ kind: 'roll', name: f, file: path.join(app, 'assets/cat-roll', f), W: 1024, H: 512, cells: 8 });
for (const f of fs.readdirSync(path.join(app, 'assets/cat-act'))) if (f.endsWith('.webp')) jobs.push({ kind: 'act', name: f, file: path.join(app, 'assets/cat-act', f), W: 768, H: 384, cells: 8 });

const results = await pool(jobs, 8, async (j) => {
  const buf = await decode(j.file, j.W, j.H);
  const frames = [];
  if (j.cells === 1) frames.push(scoreCell(buf, j.W, 0, 0, j.W, j.H));
  else { const cw = j.W / 4, ch = j.H / 2; for (let i = 0; i < 8; i++) frames.push(scoreCell(buf, j.W, (i % 4) * cw, Math.floor(i / 4) * ch, cw, ch)); }
  const halo = frames.map((f) => +f.halo.toFixed(3));
  const semi = frames.map((f) => +f.semi.toFixed(3));
  const soft = frames.map((f) => +f.soft.toFixed(2));
  return { kind: j.kind, name: j.name, haloMax: Math.max(...halo), haloMean: +(halo.reduce((a, b) => a + b, 0) / halo.length).toFixed(3), semiMean: +(semi.reduce((a, b) => a + b, 0) / semi.length).toFixed(3), softMean: +(soft.reduce((a, b) => a + b, 0) / soft.length).toFixed(2), softMax: Math.max(...soft), halo, semi, soft };
});
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(results, null, 1));
results.sort((a, b) => b.softMean - a.softMean);
console.log('files', results.length);
for (const r of results.slice(0, 40)) console.log(r.kind.padEnd(5), r.name.padEnd(48), 'soft', r.softMean, 'halo', r.haloMean);
