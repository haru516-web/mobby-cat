// ねこモビーの BGM（3曲）と効果音（12個）を、プログラムで合成して作る。
// 使い方: node tools/make-audio.cjs   （ffmpeg が必要）
// 出力: app/assets/audio/bgm/*.m4a, app/assets/audio/sfx/*.m4a
// 素材はすべてこのスクリプトで一から作ったオリジナル（外部の音源・サンプルは使わない）。
// 楽器: ウクレレ風（Karplus-Strong）、マリンバ風、ベル（FM）、やわらかいパッド、木のタップ、
// BGM 用にキック・クラップ・ハイハット、跳ねるベース、やわらかいリード。
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const SR = 44100;
const root = path.join(__dirname, '..', 'app', 'assets', 'audio');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mobby-audio-'));

// ---------- 基本部品 ----------
let seed = 12345;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const arr = (sec) => new Float32Array(Math.max(1, Math.round(sec * SR)));
const TAU = Math.PI * 2;

function fadeEdges(a, inMs = 2, outMs = 8) {
  const i = Math.round((inMs / 1000) * SR), o = Math.round((outMs / 1000) * SR);
  for (let k = 0; k < i && k < a.length; k++) a[k] *= k / i;
  for (let k = 0; k < o && k < a.length; k++) a[a.length - 1 - k] *= k / o;
  return a;
}

// 各楽器は「波形の配列」を返す
function marimba(f, dur, amp = 1) {
  const a = arr(dur), d = 3.5 + f / 260;
  for (let n = 0; n < a.length; n++) {
    const t = n / SR;
    a[n] = amp * (Math.sin(TAU * f * t) * Math.exp(-t * d) + 0.28 * Math.sin(TAU * f * 3.97 * t) * Math.exp(-t * (d * 4.5)) + 0.08 * Math.sin(TAU * f * 9.2 * t) * Math.exp(-t * 60));
  }
  return fadeEdges(a, 1.5, 15);
}
function bell(f, dur, amp = 1) {
  const a = arr(dur);
  for (let n = 0; n < a.length; n++) {
    const t = n / SR;
    const mod = 1.6 * Math.exp(-t * 7) * Math.sin(TAU * f * 2.76 * t);
    a[n] = amp * (0.7 * Math.sin(TAU * f * t + mod) * Math.exp(-t * 3.2) + 0.25 * Math.sin(TAU * f * 2 * t) * Math.exp(-t * 5));
  }
  return fadeEdges(a, 1, 20);
}
function pluck(f, dur, amp = 1, bright = 0.5) {
  const N = Math.max(2, Math.round(SR / f)), line = new Float32Array(N);
  let lp = 0;
  for (let i = 0; i < N; i++) { lp = lp * (1 - bright) + rnd() * bright; line[i] = lp * 1.8; }
  const a = arr(dur);
  let p = 0, prev = 0;
  for (let n = 0; n < a.length; n++) {
    const cur = line[p], nxt = line[(p + 1) % N];
    const v = 0.9975 * 0.5 * (cur + nxt);
    line[p] = v; p = (p + 1) % N;
    prev = prev * 0.3 + v * 0.7; // 角を丸める
    a[n] = amp * prev;
  }
  return fadeEdges(a, 1, 25);
}
function pad(f, dur, amp = 1) {
  const a = arr(dur);
  for (let n = 0; n < a.length; n++) {
    const t = n / SR, x = n / a.length;
    const env = Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, x))), 1.6);
    a[n] = amp * env * (Math.sin(TAU * f * t) + 0.5 * Math.sin(TAU * f * 1.003 * t) + 0.18 * Math.sin(TAU * f * 2 * t)) / 1.7;
  }
  return a;
}
function tick(f = 900, dur = 0.05, amp = 1) {
  const a = arr(dur);
  for (let n = 0; n < a.length; n++) { const t = n / SR; a[n] = amp * Math.sin(TAU * f * t) * Math.exp(-t * 90); }
  return a;
}
function noise(dur, amp, lowpass, env = (x) => 1 - x) {
  const a = arr(dur);
  let y = 0;
  for (let n = 0; n < a.length; n++) { y += (rnd() - y) * lowpass; a[n] = amp * y * env(n / a.length); }
  return a;
}
// 猫の「にゃ」のような声（基本周波数の曲線に母音の山をつけた加算合成）
function nya(f0, dur, amp = 1) {
  const a = arr(dur);
  let ph = 0;
  for (let n = 0; n < a.length; n++) {
    const x = n / a.length;
    const f = f0 * (0.85 + 0.45 * Math.sin(Math.PI * Math.min(1, x * 1.4)) + 0.05 * Math.sin(TAU * 6 * x));
    ph += (TAU * f) / SR;
    const open = Math.min(1, x * 3); // n → a と口がひらく
    const f1 = 450 + 450 * open, f2 = 1500 + 500 * open;
    let s = 0;
    for (let h = 1; h <= 14; h++) {
      const fh = h * f;
      if (fh > 5000) break;
      const g = Math.exp(-Math.pow((fh - f1) / 300, 2)) + 0.6 * Math.exp(-Math.pow((fh - f2) / 400, 2)) + 0.05;
      s += (g / h) * Math.sin(h * ph);
    }
    a[n] = amp * s * Math.pow(Math.sin(Math.PI * x), 0.7) * 0.5;
  }
  return fadeEdges(a, 6, 25);
}

// ---------- ミックス ----------
function stereoBuf(sec) { return { l: arr(sec), r: arr(sec), n: Math.round(sec * SR) }; }
// 巻き戻して書き込む（ループの継ぎ目をなくすため）
function put(buf, t, wave, pan = 0, circular = true) {
  const gl = Math.cos(((pan + 1) * Math.PI) / 4), gr = Math.sin(((pan + 1) * Math.PI) / 4);
  const i0 = Math.round(t * SR);
  for (let k = 0; k < wave.length; k++) {
    let i = i0 + k;
    if (circular) i %= buf.n; else if (i >= buf.n) break;
    buf.l[i] += wave[k] * gl; buf.r[i] += wave[k] * gr;
  }
}
function reverbChannel(x, wet, offset) {
  const n = x.length, doubled = new Float32Array(n * 2);
  doubled.set(x, 0); doubled.set(x, n);
  const combs = [0.0297, 0.0371, 0.0411, 0.0437].map((d) => Math.round(d * SR) + offset);
  const out = new Float32Array(n * 2);
  for (const d of combs) {
    const line = new Float32Array(d); let p = 0, lp = 0;
    for (let i = 0; i < n * 2; i++) {
      const y = line[p]; lp = lp * 0.55 + y * 0.45;
      line[p] = doubled[i] + lp * 0.78; p = (p + 1) % d;
      out[i] += y * 0.25;
    }
  }
  for (const d0 of [0.005, 0.0017]) {
    const d = Math.round(d0 * SR) + offset % 7, line = new Float32Array(d); let p = 0;
    for (let i = 0; i < n * 2; i++) {
      const bufv = line[p], v = out[i] + bufv * -0.5;
      line[p] = out[i] + bufv * 0.5 * 1; p = (p + 1) % d; out[i] = bufv + v * 0.5;
    }
  }
  const res = new Float32Array(n);
  for (let i = 0; i < n; i++) res[i] = x[i] * (1 - wet * 0.3) + out[n + i] * wet;
  return res;
}
// 響きは room だけにかけ、dry（キック・ベース・ハイハット）は乾いたまま足す。最後にやわらかく頭を抑える
function finishBgm(dry, room, wet) {
  const l = reverbChannel(room.l, wet, 0), r = reverbChannel(room.r, wet, 23);
  for (let i = 0; i < l.length; i++) { l[i] += dry.l[i]; r[i] += dry.r[i]; }
  let sum = 0;
  for (let i = 0; i < l.length; i++) sum += l[i] * l[i] + r[i] * r[i];
  const g = Math.pow(10, -14 / 20) / (Math.sqrt(sum / (l.length * 2)) || 1);
  for (let i = 0; i < l.length; i++) { l[i] = Math.tanh(l[i] * g); r[i] = Math.tanh(r[i] * g); }
  return [l, r];
}
// ffmpeg で測ったラウドネスに合わせて音量をそろえる（BGM は -20 LUFS、ピークは -1 dBFS 以下）
function measureLufs(chans) {
  const wav = path.join(tmp, 'measure.wav');
  writeWav(wav, chans);
  const res = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', wav, '-af', 'ebur128', '-f', 'null', '-'], { encoding: 'utf8' });
  const m = [...res.stderr.matchAll(/I:\s+(-?[\d.]+) LUFS/g)].pop();
  return m ? Number(m[1]) : -20;
}
function normalizeLufs(chans, target) {
  let g = Math.pow(10, (target - measureLufs(chans)) / 20), peak = 0;
  for (const c of chans) for (const v of c) peak = Math.max(peak, Math.abs(v));
  g = Math.min(g, 0.89 / (peak || 1));
  for (const c of chans) for (let i = 0; i < c.length; i++) c[i] *= g;
  return chans;
}

function writeWav(file, chans) {
  const n = chans[0].length, ch = chans.length, data = Buffer.alloc(n * ch * 2);
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(chans[c][i] * 32767))), (i * ch + c) * 2);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); h.writeUInt16LE(ch, 22); h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * ch * 2, 28);
  h.writeUInt16LE(ch * 2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([h, data]));
}
function encode(kind, id, chans, bitrate) {
  const wav = path.join(tmp, id + '.wav');
  writeWav(wav, chans);
  const dir = path.join(root, kind);
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, id + '.m4a');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-c:a', 'aac', '-b:a', bitrate, out]);
  const sec = (chans[0].length / SR).toFixed(2);
  console.log(id.padEnd(18), sec + 's', (fs.statSync(out).size / 1024).toFixed(0) + 'KB');
}

// ---------- BGM ----------
// ポップで軽快に。キック・クラップ・16分のハイハット、跳ねるベース、裏拍のウクレレ刻み、
// マリンバとリードの旋律。パッドはキックに合わせて少し沈ませて、ノリを出す。
function kick(amp = 1) {
  const a = arr(0.26);
  let ph = 0;
  for (let n = 0; n < a.length; n++) {
    const t = n / SR, f = 50 + 120 * Math.exp(-t * 30);
    ph += (TAU * f) / SR;
    a[n] = amp * (Math.tanh(1.8 * Math.sin(ph)) * Math.exp(-t * 12) + 0.2 * rnd() * Math.exp(-t * 500));
  }
  return fadeEdges(a, 0.3, 20);
}
function clap(amp = 1) {
  const a = arr(0.2);
  let lp = 0;
  for (let n = 0; n < a.length; n++) {
    const t = n / SR, r = rnd();
    lp += (r - lp) * 0.35;
    const env = t < 0.03 ? Math.exp(-((t * 1000) % 10) * 0.35) : Math.exp(-(t - 0.03) * 30);
    a[n] = amp * ((r - lp) * env * 0.8 + 0.3 * Math.sin(TAU * 190 * t) * Math.exp(-t * 40));
  }
  return fadeEdges(a, 0.3, 15);
}
function hat(amp = 1, dur = 0.035) {
  const a = arr(dur), decay = dur < 0.06 ? 110 : 28;
  let lp = 0;
  for (let n = 0; n < a.length; n++) { const r = rnd(); lp += (r - lp) * 0.6; a[n] = amp * (r - lp) * Math.exp(-(n / SR) * decay); }
  return fadeEdges(a, 0.2, 5);
}
function bassNote(f, dur, amp = 1) {
  const a = arr(dur);
  for (let n = 0; n < a.length; n++) {
    const t = n / SR, env = Math.min(1, t * 300) * Math.exp(-t * 5);
    a[n] = amp * env * Math.tanh(1.6 * Math.sin(TAU * f * t) + 0.4 * Math.sin(TAU * 2 * f * t));
  }
  return fadeEdges(a, 1, 18);
}
function lead(f, dur, amp = 1) {
  const a = arr(dur);
  let ph = 0;
  for (let n = 0; n < a.length; n++) {
    const t = n / SR;
    ph += (TAU * f * (1 + 0.004 * Math.sin(TAU * 5.5 * t) * Math.min(1, t * 4))) / SR;
    const env = Math.min(1, t * 200) * (0.55 + 0.45 * Math.exp(-t * 9));
    a[n] = (amp * env * (Math.sin(ph) + 0.35 * Math.sin(2 * ph) + 0.18 * Math.sin(3 * ph) + 0.08 * Math.sin(4 * ph))) / 1.4;
  }
  return fadeEdges(a, 1, 30);
}

const CH = {
  C: { root: 36, tri: [60, 64, 67] }, Am: { root: 33, tri: [57, 60, 64] }, F: { root: 41, tri: [57, 60, 65] },
  G: { root: 43, tri: [59, 62, 67] }, Em: { root: 40, tri: [59, 64, 67] }, Dm: { root: 38, tri: [57, 62, 65] },
};
// キックの置き方（8分の何番目か）。pop = 1拍目・2拍目の裏・3拍目、four = 4つ打ち
const KICK = { pop: [0, 3, 4], four: [0, 2, 4, 6] };
// ベース: [8分の位置, ルートからの半音, 長さ（8分いくつ分）]
const BASS = [[0, 0, 1.4], [3, 0, 0.8], [4, 0, 1], [6, 12, 0.7], [7, 7, 0.6]];

// layers(b) が返すもの: kick('pop'|'four') clap hat('8'|'16') openHat bass chop pad melody lead sparkle riser
function bgm({ id, bpm, prog, melody, layers, wet = 0.28, swing = 0 }) {
  const beat = 60 / bpm, bar = beat * 4, e = beat / 2, s16 = beat / 4, bars = prog.length;
  const dry = stereoBuf(bar * bars), room = stereoBuf(bar * bars), duck = stereoBuf(bar * bars);
  for (let b = 0; b < bars; b++) {
    const c = CH[prog[b]], t0 = b * bar, on = layers(b);
    if (on.kick) for (const s of KICK[on.kick]) put(dry, t0 + s * e, kick(0.9), 0);
    if (on.clap) for (const s of [2, 6]) put(room, t0 + s * e, clap(0.5), 0.05);
    if (on.hat) {
      for (let s = 0; s < 16; s++) {
        if (on.hat === '8' && s % 2) continue;
        const acc = s % 4 === 2 ? 0.3 : s % 2 === 0 ? 0.15 : 0.08;
        put(dry, t0 + s * s16 + (s % 2 ? swing * s16 : 0), hat(acc, on.openHat && s % 4 === 2 ? 0.12 : 0.035), s % 2 ? 0.3 : -0.2);
      }
    }
    if (on.riser) put(room, t0 + bar / 2, noise(bar / 2, 0.1, 0.35, (x) => x * x), 0);
    if (on.bass) for (const [s, d, l] of BASS) put(dry, t0 + s * e, bassNote(hz(c.root + 12 + d), e * l * 0.95, 0.5), 0);
    if (on.chop) for (const s of [1, 3, 5, 7]) c.tri.forEach((m, k) => put(room, t0 + s * e + k * 0.006, pluck(hz(m), e * 0.75, 0.15, 0.7), -0.35));
    if (on.pad) for (const m of c.tri) put(duck, t0, pad(hz(m), bar * 1.1, 0.06), 0.2);
    const mel = melody[b];
    if (mel && on.melody) {
      mel.forEach((m, s) => {
        if (!m) return;
        let gap = 1;
        while (gap < 3 && s + gap < 8 && !mel[s + gap]) gap++;
        put(room, t0 + s * e, marimba(hz(m), beat * 1.2, 0.36), 0.2);
        if (on.lead) put(room, t0 + s * e, lead(hz(m), e * gap * 0.8, 0.18), -0.1);
        if (on.sparkle && s % 4 === 0) put(room, t0 + s * e, bell(hz(m + 12), 0.8, 0.07), 0.45);
      });
    }
  }
  // パッドを拍ごとに沈ませる（サイドチェイン風）
  for (let i = 0; i < duck.n; i++) {
    const g = 1 - 0.6 * Math.exp(-((i / SR) % beat) * 10);
    room.l[i] += duck.l[i] * g; room.r[i] += duck.r[i] * g;
  }
  encode('bgm', id, normalizeLufs(finishBgm(dry, room, wet), -20), '96k');
}

const PH = {
  // ホーム
  hA: [[72, 0, 76, 0, 79, 0, 76, 79], [81, 0, 79, 76, 0, 72, 0, 0], [77, 0, 77, 76, 77, 0, 81, 0], [79, 0, 0, 74, 0, 71, 74, 0],
    [72, 0, 76, 0, 79, 0, 84, 0], [83, 81, 0, 79, 0, 76, 0, 0], [77, 0, 74, 0, 77, 81, 0, 79], [79, 0, 0, 0, 74, 0, 0, 0]],
  hB: [[0, 72, 77, 0, 81, 0, 77, 0], [0, 74, 79, 0, 83, 0, 79, 0], [0, 71, 76, 0, 79, 0, 83, 0], [84, 0, 83, 81, 0, 76, 0, 0],
    [0, 77, 81, 0, 84, 0, 81, 77], [0, 74, 77, 0, 81, 0, 77, 74], [79, 0, 79, 0, 81, 0, 83, 0], [86, 0, 0, 0, 0, 0, 0, 0]],
  hC: [[84, 0, 84, 79, 0, 84, 86, 0], [86, 0, 83, 0, 79, 0, 74, 0], [76, 0, 81, 0, 0, 79, 81, 0], [84, 0, 0, 81, 0, 77, 79, 0],
    [84, 0, 84, 79, 0, 84, 86, 0], [88, 0, 86, 0, 83, 0, 79, 0], [81, 0, 84, 0, 81, 0, 77, 0], [79, 0, 74, 0, 77, 79, 81, 83]],
  hC2end: [[79, 0, 74, 0, 71, 0, 0, 0]],
  // 出会い
  dV: [[76, 0, 76, 0, 72, 74, 76, 0], [77, 0, 76, 0, 72, 0, 69, 0], [72, 0, 72, 0, 67, 69, 72, 0], [74, 0, 0, 71, 0, 74, 0, 0],
    [76, 0, 76, 0, 79, 0, 81, 0], [81, 0, 79, 77, 0, 76, 77, 0], [79, 0, 76, 0, 72, 0, 76, 0], [74, 0, 0, 0, 71, 72, 74, 0]],
  dP: [[77, 0, 74, 77, 0, 81, 0, 0], [79, 0, 76, 79, 0, 83, 0, 0], [84, 0, 81, 0, 77, 0, 81, 0], [83, 0, 79, 0, 74, 0, 0, 0],
    [77, 0, 74, 77, 0, 81, 0, 84], [83, 0, 79, 83, 0, 86, 0, 0], [84, 0, 81, 84, 0, 88, 0, 0], [86, 0, 0, 0, 79, 81, 83, 0]],
  dC: [[84, 0, 83, 84, 0, 79, 0, 76], [79, 0, 74, 79, 0, 83, 86, 0], [84, 0, 83, 81, 0, 76, 0, 79], [81, 0, 0, 77, 0, 81, 84, 0],
    [84, 0, 83, 84, 0, 79, 0, 84], [86, 0, 88, 0, 86, 0, 83, 0]],
  dC1end: [[84, 0, 81, 0, 77, 0, 81, 0], [79, 0, 0, 0, 74, 76, 79, 83]],
  dC2end: [[84, 0, 81, 0, 77, 0, 76, 0], [72, 0, 0, 0, 0, 0, 0, 0]],
  // はじめまして
  w: [[72, 0, 0, 0, 76, 0, 79, 0], [79, 0, 0, 0, 74, 0, 0, 0], [72, 0, 0, 0, 76, 0, 81, 0], [79, 0, 0, 0, 77, 0, 0, 0],
    [72, 0, 76, 0, 79, 0, 84, 0], [83, 0, 79, 0, 74, 0, 79, 0], [81, 0, 76, 0, 72, 0, 76, 0], [77, 0, 0, 76, 0, 74, 0, 0],
    [0, 77, 81, 0, 84, 0, 81, 0], [0, 79, 83, 0, 86, 0, 83, 0], [0, 79, 83, 0, 88, 0, 86, 83], [84, 0, 0, 0, 81, 0, 83, 0],
    [84, 0, 84, 0, 81, 84, 0, 86], [86, 0, 83, 0, 79, 0, 83, 0], [84, 0, 0, 79, 0, 76, 0, 79], [84, 0, 0, 0, 0, 0, 0, 0]],
};
const rep = (a, n) => Array.from({ length: n }, () => a).flat();

// 日だまりの猫部屋（ホームなど）。112BPM・32小節 = 68.6秒。A → B → サビ ×2
bgm({
  id: 'bgm_home', bpm: 112, swing: 0.12,
  prog: [...rep(['C', 'Am', 'F', 'G'], 1), 'C', 'Am', 'Dm', 'G', 'F', 'G', 'Em', 'Am', 'F', 'Dm', 'G', 'G', ...rep(['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'G'], 2)],
  melody: [...PH.hA, ...PH.hB, ...PH.hC, ...PH.hC.slice(0, 7), ...PH.hC2end],
  layers: (b) => ({
    kick: 'pop', hat: b < 8 ? '8' : '16', clap: b >= 8, bass: 1, chop: 1, pad: 1, melody: 1,
    lead: b >= 16, sparkle: b >= 24, riser: b === 15,
  }),
});
// わくわくする出会い画面。128BPM・32小節 = 60秒。サビは4つ打ち
bgm({
  id: 'bgm_deai', bpm: 128,
  prog: [...rep(['Am', 'F', 'C', 'G'], 2), ...rep(['Dm', 'Em', 'F', 'G'], 2), ...rep(['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'G'], 1), 'C', 'G', 'Am', 'F', 'C', 'G', 'F', 'C'],
  melody: [...PH.dV, ...PH.dP, ...PH.dC, ...PH.dC1end, ...PH.dC, ...PH.dC2end],
  layers: (b) => ({
    kick: b >= 16 ? 'four' : 'pop', hat: '16', openHat: b >= 16, clap: b >= 8, bass: 1, chop: 1, pad: 1, melody: 1,
    lead: b >= 16, sparkle: b >= 24, riser: b === 15,
  }),
});
// はじめまして（相棒選びとチュートリアル）。116BPM・16小節 = 33.1秒。だんだん楽器が増える
bgm({
  id: 'bgm_welcome', bpm: 116, swing: 0.1,
  prog: ['C', 'G', 'Am', 'F', 'C', 'G', 'Am', 'F', 'F', 'G', 'Em', 'Am', 'F', 'G', 'C', 'C'],
  melody: PH.w,
  layers: (b) => ({
    kick: b >= 4 ? 'pop' : null, hat: b >= 8 ? '16' : '8', clap: b >= 8, bass: b >= 4, chop: 1, pad: 1, melody: 1,
    lead: b >= 12, sparkle: b >= 12, riser: b === 11,
  }),
});

// ---------- 効果音 ----------
function sfx(id, parts, { peak = 0.7, bitrate = '64k' } = {}) {
  const len = Math.max(...parts.map(([t, w]) => t + w.length / SR));
  const out = arr(len + 0.02);
  for (const [t, w] of parts) { const i0 = Math.round(t * SR); for (let k = 0; k < w.length; k++) out[i0 + k] += w[k]; }
  let mx = 0;
  for (const v of out) mx = Math.max(mx, Math.abs(v));
  const g = peak / (mx || 1);
  for (let i = 0; i < out.length; i++) out[i] *= g;
  fadeEdges(out, 1, 12);
  encode('sfx', id, [out], bitrate);
}
const wood = (f, amp = 1) => {
  const a = arr(0.07);
  for (let n = 0; n < a.length; n++) { const t = n / SR; a[n] = amp * (Math.sin(TAU * f * (1 - 0.3 * t * 8) * t) * Math.exp(-t * 55) + 0.2 * rnd() * Math.exp(-t * 300)); }
  return a;
};
const M = (n, d, a) => marimba(hz(n), d, a);
const B = (n, d, a) => bell(hz(n), d, a);

// スライムを引っぱって離したときの「ぷよん」。音の高さがばねのように揺れて落ち着く。
// from: 出だしの高さ（1 より小さいと下から上がる、大きいと上から下がる）、glide: 戻る速さ、
// wob/depth/damp: 揺れの速さ・深さ・おさまる速さ、decay: 音の消える速さ、rise: だんだん大きくなる（引っぱる音）
function slime(f, dur, { from = 0.6, glide = 40, wob = 18, depth = 0.08, damp = 14, decay = 14, rise = false, amp = 1 } = {}) {
  const a = arr(dur);
  let ph = 0;
  for (let n = 0; n < a.length; n++) {
    const t = n / SR, w = Math.exp(-t * damp) * Math.sin(TAU * wob * t);
    ph += (TAU * f * (1 + (from - 1) * Math.exp(-t * glide)) * (1 + depth * w)) / SR;
    const env = Math.min(1, t / 0.003) * Math.exp(-t * decay) * (1 + 0.3 * w) * (rise ? n / a.length : 1);
    a[n] = amp * env * (Math.sin(ph) + 0.22 * Math.sin(2 * ph) + 0.06 * Math.sin(3 * ph));
  }
  return fadeEdges(a, 1, 15);
}
const UP = { from: 0.6, glide: 45, wob: 24, depth: 0.05 };

// 操作音は1つだけ。どのボタンも同じ「ぷよっ」（小さく上がる2音。下がると不正解に聞こえるので上げる）
sfx('sfx_tap', [[0, slime(660, 0.12, { ...UP, decay: 20 })], [0.07, slime(880, 0.16, { ...UP, decay: 18, amp: 0.7 })]], { peak: 0.45 });
sfx('sfx_error', [[0, slime(230, 0.3, { from: 1.35, glide: 20, wob: 9, depth: 0.14, damp: 7, decay: 9 })], [0.14, slime(190, 0.34, { from: 1.35, glide: 20, wob: 9, depth: 0.14, damp: 7, decay: 9 })]], { peak: 0.55 });
sfx('sfx_pet', [[0, nya(620, 0.28, 1)]], { peak: 0.6 });
sfx('sfx_welcome', [[0, M(72, 0.6, 0.9)], [0.14, M(76, 0.6, 0.9)], [0.28, M(79, 0.6, 0.9)], [0.42, M(84, 0.8, 1)], [0.42, B(84, 1.0, 0.4)], [0.56, B(88, 0.9, 0.35)], [0.7, B(91, 0.8, 0.3)]], { peak: 0.6 });
sfx('sfx_bell', [[0, B(79, 1.0, 0.9)], [0.28, B(84, 1.1, 1)]], { peak: 0.55 });
sfx('sfx_matatabi', [[0, noise(0.3, 0.5, 0.15, (x) => Math.sin(Math.PI * Math.pow(x, 0.7)))], [0.12, B(86, 0.5, 0.5)], [0.22, B(91, 0.5, 0.4)]], { peak: 0.55 });
sfx('sfx_pick_free', [[0, M(72, 0.7, 0.9)], [0.1, M(76, 0.7, 0.9)], [0.2, M(79, 0.7, 0.9)], [0.3, M(84, 1.0, 1)], [0.3, B(84, 1.0, 0.45)], [0.3, M(72, 1.0, 0.5)]], { peak: 0.6 });
sfx('sfx_pick_extra', [[0, M(79, 0.5, 0.9)], [0.09, M(84, 0.5, 0.9)], [0.18, M(88, 0.7, 1)], [0.18, B(88, 0.6, 0.35)]], { peak: 0.55 });
sfx('sfx_pick_special', [
  [0, M(72, 0.8, 0.9)], [0.1, M(76, 0.8, 0.9)], [0.2, M(79, 0.8, 0.9)], [0.3, M(84, 0.9, 0.9)], [0.4, M(88, 0.9, 0.9)], [0.5, M(91, 1.2, 1)],
  [0.5, B(91, 1.3, 0.5)], [0.6, B(96, 1.2, 0.3)], [0.72, B(88, 1.1, 0.3)], [0.85, B(93, 1.0, 0.25)], [0.5, pad(hz(60), 1.6, 0.35)], [0.5, pad(hz(67), 1.6, 0.3)],
], { peak: 0.62 });
sfx('sfx_gift', [[0, noise(0.15, 0.5, 0.3, (x) => Math.sin(Math.PI * x))], [0.12, B(84, 0.8, 0.8)], [0.26, B(91, 0.9, 0.9)]], { peak: 0.55 });
sfx('sfx_shutter', [[0, wood(1400, 0.8)], [0.05, wood(900, 0.7)], [0, noise(0.05, 0.4, 0.4, (x) => 1 - x)]], { peak: 0.5 });
sfx('sfx_saved', [[0, B(88, 0.5, 0.9)], [0.1, B(95, 0.5, 0.7)]], { peak: 0.5 });

fs.rmSync(tmp, { recursive: true, force: true });
