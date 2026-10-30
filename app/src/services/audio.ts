// 音（BGM・効果音）の再生と設定。設定は端末に保存する。
// 音源（data/audioAssets.ts）や expo-audio が無くても、何も起きずに動く。
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { AppState, Platform } from 'react-native';
import { AUDIO, BGM_IDS, BgmId, SfxId } from '../data/audioAssets';

export type AudioSettings = {
  bgmEnabled: boolean;
  bgmVolume: number; // 0〜1
  sfxEnabled: boolean;
  sfxVolume: number; // 0〜1
  hapticsEnabled: boolean;
};
export const DEFAULT_AUDIO: AudioSettings = { bgmEnabled: true, bgmVolume: 0.4, sfxEnabled: true, sfxVolume: 0.7, hapticsEnabled: true };

type Player = { play(): void; pause(): void; remove(): void; seekTo(s: number): Promise<void>; volume: number; loop: boolean };
type AudioMod = {
  createAudioPlayer: (src: number) => Player;
  setAudioModeAsync: (m: Record<string, unknown>) => Promise<void>;
};

const KEY = 'mobby-cat/audio/v1';
const FADE_MS = 800;
const SFX_GAP_MS = 80; // 同じ効果音の連打を抑える

let settings = DEFAULT_AUDIO;
let started = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((f) => f());

let mod: AudioMod | null | undefined;
function lib(): AudioMod | null {
  if (mod === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- ネイティブ部分が無い環境では読み込まない
      mod = require('expo-audio') as AudioMod;
    } catch {
      mod = null;
    }
  }
  return mod;
}
const safe = (f: () => void) => {
  try {
    f();
  } catch {}
};

const clamp01 = (v: unknown, d: number) => (typeof v === 'number' && isFinite(v) ? Math.min(1, Math.max(0, v)) : d);
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
function normalize(raw: unknown): AudioSettings {
  const r = (raw ?? {}) as Partial<AudioSettings>;
  return {
    bgmEnabled: bool(r.bgmEnabled, DEFAULT_AUDIO.bgmEnabled),
    bgmVolume: clamp01(r.bgmVolume, DEFAULT_AUDIO.bgmVolume),
    sfxEnabled: bool(r.sfxEnabled, DEFAULT_AUDIO.sfxEnabled),
    sfxVolume: clamp01(r.sfxVolume, DEFAULT_AUDIO.sfxVolume),
    hapticsEnabled: bool(r.hapticsEnabled, DEFAULT_AUDIO.hapticsEnabled),
  };
}

export const getAudioSettings = () => settings;

export function setAudioSettings(patch: Partial<AudioSettings>) {
  settings = normalize({ ...settings, ...patch });
  AsyncStorage.setItem(KEY, JSON.stringify(settings)).catch(() => {});
  applyBgm();
  emit();
}

export function useAudioSettings(): AudioSettings {
  return useSyncExternalStore(
    (f) => {
      listeners.add(f);
      return () => listeners.delete(f);
    },
    () => settings,
  );
}

let foreground = AppState.currentState !== 'background' && AppState.currentState !== 'inactive';

// ---- 効果音 ----
const sfxPlayers = new Map<SfxId, Player>();
const lastPlayed = new Map<SfxId, number>();

export function playSfx(id: SfxId) {
  if (!settings.sfxEnabled || settings.sfxVolume <= 0 || !foreground) return;
  const src = AUDIO[id];
  const m = lib();
  if (src == null || !m) return;
  const now = Date.now();
  if (now - (lastPlayed.get(id) ?? 0) < SFX_GAP_MS) return;
  lastPlayed.set(id, now);
  safe(() => {
    let p = sfxPlayers.get(id);
    if (!p) {
      p = m.createAudioPlayer(src);
      sfxPlayers.set(id, p);
    }
    p.volume = settings.sfxVolume;
    p.seekTo(0).catch(() => {});
    p.play();
  });
}

// ---- BGM ----
type Track = { id: BgmId; p: Player; level: number }; // level: フェードの係数（0〜1）
let scene: BgmId | null = null;
let current: Track | null = null;
const leaving = new Set<Track>();
let fadeTimer: ReturnType<typeof setInterval> | undefined;

function tickFade() {
  const step = 50 / FADE_MS;
  const want = settings.bgmEnabled && foreground && scene !== null;
  let busy = false;
  const cur = current;
  if (cur) {
    const target = want && cur.id === scene ? 1 : 0;
    cur.level = target > cur.level ? Math.min(1, cur.level + step) : Math.max(0, cur.level - step);
    safe(() => (cur.p.volume = cur.level * settings.bgmVolume));
    if (cur.level !== target) busy = true;
    else if (target === 0) safe(() => cur.p.pause());
  }
  for (const o of leaving) {
    o.level = Math.max(0, o.level - step);
    safe(() => (o.p.volume = o.level * settings.bgmVolume));
    if (o.level <= 0) {
      safe(() => o.p.remove());
      leaving.delete(o);
    } else busy = true;
  }
  if (!busy && fadeTimer) {
    clearInterval(fadeTimer);
    fadeTimer = undefined;
  }
}

function applyBgm() {
  const m = lib();
  if (!m) return;
  const src = scene ? AUDIO[scene] : undefined;
  if (current && current.id !== scene) {
    leaving.add(current);
    current = null;
  }
  if (settings.bgmEnabled && foreground) {
    if (!current && scene && src != null) {
      const id = scene;
      safe(() => {
        const p = m.createAudioPlayer(src);
        p.loop = true;
        p.volume = 0;
        p.play();
        current = { id, p, level: 0 };
      });
    } else if (current) {
      const p = current.p;
      safe(() => p.play());
    }
  }
  if (!fadeTimer && (current || leaving.size)) fadeTimer = setInterval(tickFade, 50);
}

// いま流したい BGM を伝える（null で止める）。同じ曲なら何もしない
export function setBgmScene(id: BgmId | null) {
  if (id !== null && !BGM_IDS.includes(id)) return;
  if (scene === id) return;
  scene = id;
  applyBgm();
}

export async function initAudio() {
  if (started) return;
  started = true;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) settings = normalize(JSON.parse(raw));
  } catch {}
  const m = lib();
  if (m) {
    // 他のアプリの音を止めない。マナーモードでは鳴らさない
    m.setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers', shouldPlayInBackground: false }).catch(() => {});
  }
  AppState.addEventListener('change', (st) => {
    foreground = st === 'active';
    applyBgm();
    if (!foreground) for (const p of sfxPlayers.values()) safe(() => p.pause());
  });
  // Web は最初の操作までは音を出せないので、操作されたらもう一度流し直す
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    document.addEventListener('pointerdown', () => applyBgm(), { once: true });
  }
  emit();
  applyBgm();
}
